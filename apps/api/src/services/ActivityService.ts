import type {Prisma} from '@plunk/db';
import type {Activity, ActivityStats, CursorPaginatedResponse} from '@plunk/types';
import {ActivityType} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';

/**
 * Activity Service
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Uses cursor-based pagination for efficient large dataset handling
 * - Limits date range to prevent expensive queries (default 30 days)
 * - Caches statistics in Redis with 5-minute TTL
 * - Uses indexed fields (createdAt) for sorting
 * - Batch processes and merges results from multiple tables
 */
export class ActivityService {
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 100;
  private static readonly DEFAULT_DAYS_BACK = 30;
  private static readonly STATS_CACHE_TTL = 300; // 5 minutes

  /**
   * Get unified activity feed for a project
   *
   * Performance: O(n log n) where n = limit
   * - Fetches up to `limit` items from 3 tables in parallel
   * - Merges and sorts by timestamp
   * - Returns top `limit` items
   *
   * PAGINATION APPROACH:
   * This implementation fetches `limit` items from each source (Events, Emails, Workflows),
   * then merges and returns the top `limit` results by timestamp. This ensures a proper
   * chronological timeline but has tradeoffs:
   *
   * Pros:
   * - Proper time-based ordering across all activity types
   * - Simple cursor-based pagination
   * - Efficient for typical use cases
   *
   * Cons:
   * - May fetch more items from DB than returned to client (up to 3x limit)
   * - Cursor pagination across sources can miss items in rare edge cases
   *
   * For higher scale (10M+ activities), consider:
   * - Materialized view or unified activity table
   * - Event sourcing pattern with proper indexing
   * - Separate pagination per activity type
   */
  public static async getActivities(
    projectId: string,
    limit = this.DEFAULT_LIMIT,
    cursor?: string,
    types?: ActivityType[],
    contactId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CursorPaginatedResponse<Activity>> {
    // Cap limit to prevent abuse
    const effectiveLimit = Math.min(limit, this.MAX_LIMIT);

    // Fetch extra items from each source to ensure we have enough after merging
    // We fetch limit items from each, then take top limit after sorting
    const fetchLimit = effectiveLimit;

    // Default date range to last 30 days if not specified
    // IMPORTANT: When cursor is provided (pagination), we should NOT apply the gte constraint
    // to allow users to paginate back beyond the initial date range
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - this.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000);
    const dateFilter: Prisma.DateTimeFilter = {
      // Only apply start date filter on initial load (no cursor)
      // This allows pagination to go back indefinitely
      ...(cursor ? {} : {gte: startDate || defaultStartDate}),
      ...(endDate ? {lte: endDate} : {}),
    };

    // Parse cursor if provided (format: timestamp_id)
    let cursorTimestamp: Date | undefined;
    let cursorId: string | undefined;
    if (cursor) {
      const [timestamp, id] = cursor.split('_');
      cursorTimestamp = timestamp ? new Date(parseInt(timestamp)) : undefined;
      cursorId = id;
    }

    // Fetch activities from different sources in parallel
    // Each source fetches up to fetchLimit items
    const [events, emails, workflows] = await Promise.all([
      this.fetchEvents(projectId, fetchLimit, dateFilter, cursorTimestamp, cursorId, contactId, types),
      this.fetchEmailActivities(projectId, fetchLimit, dateFilter, cursorTimestamp, cursorId, contactId, types),
      this.fetchWorkflowActivities(projectId, fetchLimit, dateFilter, cursorTimestamp, cursorId, contactId, types),
    ]);

    // Merge all activities
    const allActivities = [...events, ...emails, ...workflows];

    // Sort by timestamp descending (most recent first)
    allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Take only the requested limit + 1 (to check if there are more)
    const paginatedActivities = allActivities.slice(0, effectiveLimit + 1);

    // Check if there are more results
    const hasMore = paginatedActivities.length > effectiveLimit;
    const results = hasMore ? paginatedActivities.slice(0, effectiveLimit) : paginatedActivities;

    // Generate cursor from the last item
    const lastActivity = results[results.length - 1];
    const nextCursor = hasMore && lastActivity ? `${lastActivity.timestamp.getTime()}_${lastActivity.id}` : undefined;

    return {
      data: results,
      cursor: nextCursor,
      hasMore,
    };
  }

  /**
   * Get activity statistics for a project
   *
   * Performance: Uses Redis cache with 5-minute TTL
   * Falls back to database aggregation if cache miss
   */
  public static async getStats(projectId: string, startDate?: Date, endDate?: Date): Promise<ActivityStats> {
    // Try to get from cache
    const cacheKey = Keys.Activity.stats(projectId, startDate?.getTime() || 'all', endDate?.getTime() || 'now');

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      signale.warn('[ACTIVITY] Failed to get stats from cache:', error);
    }

    // Default date range to last 30 days if not specified
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - this.DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000);
    const dateFilter: Prisma.DateTimeFilter = {
      gte: startDate || defaultStartDate,
      ...(endDate ? {lte: endDate} : {}),
    };

    // Compute stats from database (in parallel for performance)
    const [totalEvents, emailStats] = await Promise.all([
      // Count total events
      prisma.event.count({
        where: {
          projectId,
          createdAt: dateFilter,
        },
      }),

      // Aggregate email stats
      prisma.email.aggregate({
        where: {
          projectId,
          createdAt: dateFilter,
        },
        _count: {
          id: true,
          openedAt: true,
          clickedAt: true,
        },
      }),
    ]);

    // Count workflow executions
    const totalWorkflowsStarted = await prisma.workflowExecution.count({
      where: {
        workflow: {
          projectId,
        },
        startedAt: dateFilter,
      },
    });

    const totalEmailsSent = emailStats._count.id;
    const totalEmailsOpened = emailStats._count.openedAt || 0;
    const totalEmailsClicked = emailStats._count.clickedAt || 0;

    const stats: ActivityStats = {
      totalEvents,
      totalEmailsSent,
      totalEmailsOpened,
      totalEmailsClicked,
      totalWorkflowsStarted,
      openRate: totalEmailsSent > 0 ? (totalEmailsOpened / totalEmailsSent) * 100 : 0,
      clickRate: totalEmailsSent > 0 ? (totalEmailsClicked / totalEmailsSent) * 100 : 0,
    };

    // Cache for 5 minutes
    try {
      await redis.setex(cacheKey, this.STATS_CACHE_TTL, JSON.stringify(stats));
    } catch (error) {
      signale.warn('[ACTIVITY] Failed to cache stats:', error);
    }

    return stats;
  }

  /**
   * Invalidate activity stats cache for a project
   * Should be called when new activities are created
   */
  public static async invalidateStatsCache(projectId: string): Promise<void> {
    try {
      // Delete all cache keys for this project
      const pattern = `activity:stats:${projectId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      signale.warn('[ACTIVITY] Failed to invalidate stats cache:', error);
    }
  }

  /**
   * Get recent activity count (for real-time updates)
   * Returns count of activities in the last N minutes
   */
  public static async getRecentActivityCount(projectId: string, minutes = 5): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const dateFilter: Prisma.DateTimeFilter = {gte: since};

    const [eventCount, emailCount, workflowCount] = await Promise.all([
      prisma.event.count({
        where: {projectId, createdAt: dateFilter},
      }),
      prisma.email.count({
        where: {projectId, createdAt: dateFilter},
      }),
      prisma.workflowExecution.count({
        where: {
          workflow: {projectId},
          startedAt: dateFilter,
        },
      }),
    ]);

    return eventCount + emailCount + workflowCount;
  }

  /**
   * Get upcoming scheduled activities for a project
   *
   * Fetches scheduled campaigns and workflow step executions that are
   * scheduled to send emails in the future.
   *
   * @param projectId - Project ID
   * @param limit - Max number of items to return (default 50)
   * @param daysAhead - How many days into the future to look (default 30)
   */
  public static async getUpcomingActivities(
    projectId: string,
    limit = this.DEFAULT_LIMIT,
    daysAhead = this.DEFAULT_DAYS_BACK,
  ): Promise<Activity[]> {
    const effectiveLimit = Math.min(limit, this.MAX_LIMIT);
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const dateFilter: Prisma.DateTimeFilter = {
      gte: now,
      lte: futureDate,
    };

    // Fetch scheduled items in parallel
    const [scheduledCampaigns, scheduledWorkflowSteps] = await Promise.all([
      this.fetchScheduledCampaigns(projectId, effectiveLimit, dateFilter),
      this.fetchScheduledWorkflowSteps(projectId, effectiveLimit, dateFilter),
    ]);

    // Merge all scheduled activities
    const allActivities = [...scheduledCampaigns, ...scheduledWorkflowSteps];

    // Sort by timestamp ascending (earliest first for upcoming items)
    allActivities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Return up to the limit
    return allActivities.slice(0, effectiveLimit);
  }

  /**
   * Fetch event activities
   */
  private static async fetchEvents(
    projectId: string,
    limit: number,
    dateFilter: Prisma.DateTimeFilter,
    cursorTimestamp?: Date,
    cursorId?: string,
    contactId?: string,
    types?: ActivityType[],
  ): Promise<Activity[]> {
    // Skip if filtering by types and event.triggered is not included
    if (types && !types.includes(ActivityType.EVENT_TRIGGERED)) {
      return [];
    }

    const where: Prisma.EventWhereInput = {
      projectId,
      createdAt: cursorTimestamp
        ? {
            ...dateFilter,
            lt: cursorTimestamp,
          }
        : dateFilter,
      ...(contactId ? {contactId} : {}),
    };

    const events = await prisma.event.findMany({
      where,
      orderBy: {createdAt: 'desc'},
      take: limit,
      include: {
        contact: {
          select: {
            email: true,
          },
        },
      },
    });

    return events.map(event => ({
      id: event.id,
      type: ActivityType.EVENT_TRIGGERED,
      timestamp: event.createdAt,
      contactEmail: event.contact?.email,
      contactId: event.contactId || undefined,
      metadata: {
        eventName: event.name,
        eventData: event.data,
      },
    }));
  }

  /**
   * Fetch email activities (sent, delivered, opened, clicked, bounced)
   */
  private static async fetchEmailActivities(
    projectId: string,
    limit: number,
    dateFilter: Prisma.DateTimeFilter,
    cursorTimestamp?: Date,
    cursorId?: string,
    contactId?: string,
    types?: ActivityType[],
  ): Promise<Activity[]> {
    const activities: Activity[] = [];

    // Determine which email statuses to fetch based on types filter
    const emailTypes = types
      ? types.filter(t => t.startsWith('email.'))
      : Object.values(ActivityType).filter(t => t.startsWith('email.'));

    if (emailTypes.length === 0) {
      return [];
    }

    const where: Prisma.EmailWhereInput = {
      projectId,
      ...(contactId ? {contactId} : {}),
      // Apply cursor-based pagination filter on createdAt
      // This is critical for pagination to work correctly
      createdAt: cursorTimestamp
        ? {
            ...dateFilter,
            lt: cursorTimestamp,
          }
        : dateFilter,
    };

    // Build OR conditions to filter by the appropriate timestamp field for each activity type
    // This ensures we fetch emails where the specific activity (bounced, sent, etc.) occurred in the date range
    const orConditions: Prisma.EmailWhereInput[] = [];

    if (!types || types.includes(ActivityType.EMAIL_SENT)) {
      orConditions.push({sentAt: {not: null, ...dateFilter}});
    }
    if (!types || types.includes(ActivityType.EMAIL_DELIVERED)) {
      orConditions.push({deliveredAt: {not: null, ...dateFilter}});
    }
    if (!types || types.includes(ActivityType.EMAIL_RECEIVED)) {
      orConditions.push({deliveredAt: {not: null, ...dateFilter}, sourceType: 'INBOUND'});
    }
    if (!types || types.includes(ActivityType.EMAIL_OPENED)) {
      orConditions.push({openedAt: {not: null, ...dateFilter}});
    }
    if (!types || types.includes(ActivityType.EMAIL_CLICKED)) {
      orConditions.push({clickedAt: {not: null, ...dateFilter}});
    }
    if (!types || types.includes(ActivityType.EMAIL_BOUNCED)) {
      orConditions.push({bouncedAt: {not: null, ...dateFilter}});
    }
    if (!types || types.includes(ActivityType.EMAIL_COMPLAINT)) {
      orConditions.push({complainedAt: {not: null, ...dateFilter}});
    }

    // If no OR conditions, return empty (shouldn't happen but defensive)
    if (orConditions.length === 0) {
      return [];
    }

    const emails = await prisma.email.findMany({
      where: {
        ...where,
        OR: orConditions,
      },
      orderBy: {createdAt: 'desc'},
      take: limit,
      include: {
        contact: {
          select: {
            email: true,
          },
        },
        campaign: {
          select: {
            name: true,
          },
        },
        workflowExecution: {
          select: {
            workflow: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Helper function to check if timestamp is within date range
    const isInDateRange = (timestamp: Date | null) => {
      if (!timestamp) return false;

      // Check against date filter
      const time = timestamp.getTime();
      if (dateFilter.gte) {
        const gteTime = dateFilter.gte instanceof Date ? dateFilter.gte.getTime() : new Date(dateFilter.gte).getTime();
        if (time < gteTime) return false;
      }
      if (dateFilter.lte) {
        const lteTime = dateFilter.lte instanceof Date ? dateFilter.lte.getTime() : new Date(dateFilter.lte).getTime();
        if (time > lteTime) return false;
      }

      // Check against cursor for pagination
      if (cursorTimestamp && time >= cursorTimestamp.getTime()) return false;

      return true;
    };

    // Convert each email into multiple activities based on its state
    for (const email of emails) {
      const baseMetadata = {
        subject: email.subject,
        body: email.body,
        from: email.from,
        fromName: email.fromName,
        replyTo: email.replyTo,
        toName: email.toName,
        sourceType: email.sourceType,
        campaignName: email.campaign?.name,
        workflowName: email.workflowExecution?.workflow?.name,
      };

      if (email.sentAt && (!types || types.includes(ActivityType.EMAIL_SENT)) && isInDateRange(email.sentAt)) {
        activities.push({
          id: `${email.id}_sent`,
          type: ActivityType.EMAIL_SENT,
          timestamp: email.sentAt,
          contactEmail: email.contact.email,
          contactId: email.contactId,
          metadata: baseMetadata,
        });
      }

      if (
        email.deliveredAt &&
        (!types || types.includes(ActivityType.EMAIL_DELIVERED)) &&
        isInDateRange(email.deliveredAt)
      ) {
        activities.push({
          id: `${email.id}_delivered`,
          type: ActivityType.EMAIL_DELIVERED,
          timestamp: email.deliveredAt,
          contactEmail: email.contact.email,
          contactId: email.contactId,
          metadata: baseMetadata,
        });
      }

      if (
        email.deliveredAt &&
        email.sourceType === 'INBOUND' &&
        (!types || types.includes(ActivityType.EMAIL_RECEIVED)) &&
        isInDateRange(email.deliveredAt)
      ) {
        activities.push({
          id: `${email.id}_received`,
          type: ActivityType.EMAIL_RECEIVED,
          timestamp: email.deliveredAt,
          contactEmail: email.contact.email,
          contactId: email.contactId,
          metadata: baseMetadata,
        });
      }

      if (email.openedAt && (!types || types.includes(ActivityType.EMAIL_OPENED)) && isInDateRange(email.openedAt)) {
        activities.push({
          id: `${email.id}_opened`,
          type: ActivityType.EMAIL_OPENED,
          timestamp: email.openedAt,
          contactEmail: email.contact.email,
          contactId: email.contactId,
          metadata: {
            ...baseMetadata,
            totalOpens: email.opens,
          },
        });
      }

      // Email clicked
      if (email.clickedAt && (!types || types.includes(ActivityType.EMAIL_CLICKED)) && isInDateRange(email.clickedAt)) {
        activities.push({
          id: `${email.id}_clicked`,
          type: ActivityType.EMAIL_CLICKED,
          timestamp: email.clickedAt,
          contactEmail: email.contact.email,
          contactId: email.contactId,
          metadata: {
            ...baseMetadata,
            totalClicks: email.clicks,
          },
        });
      }

      // Email bounced
      if (email.bouncedAt && (!types || types.includes(ActivityType.EMAIL_BOUNCED)) && isInDateRange(email.bouncedAt)) {
        activities.push({
          id: `${email.id}_bounced`,
          type: ActivityType.EMAIL_BOUNCED,
          timestamp: email.bouncedAt,
          contactEmail: email.contact.email,
          contactId: email.contactId,
          metadata: {
            ...baseMetadata,
            error: email.error,
          },
        });
      }

      // Email complaint
      if (
        email.complainedAt &&
        (!types || types.includes(ActivityType.EMAIL_COMPLAINT)) &&
        isInDateRange(email.complainedAt)
      ) {
        activities.push({
          id: `${email.id}_complaint`,
          type: ActivityType.EMAIL_COMPLAINT,
          timestamp: email.complainedAt,
          contactEmail: email.contact.email,
          contactId: email.contactId,
          metadata: {
            ...baseMetadata,
            error: email.error,
          },
        });
      }
    }

    return activities;
  }

  /**
   * Fetch workflow activities
   */
  private static async fetchWorkflowActivities(
    projectId: string,
    limit: number,
    dateFilter: Prisma.DateTimeFilter,
    cursorTimestamp?: Date,
    cursorId?: string,
    contactId?: string,
    types?: ActivityType[],
  ): Promise<Activity[]> {
    // Skip if filtering by types and workflow types are not included
    if (types && !types.some(t => t.startsWith('workflow.'))) {
      return [];
    }

    const activities: Activity[] = [];

    const where: Prisma.WorkflowExecutionWhereInput = {
      workflow: {
        projectId,
      },
      ...(contactId ? {contactId} : {}),
    };

    const executions = await prisma.workflowExecution.findMany({
      where: {
        ...where,
        startedAt: cursorTimestamp
          ? {
              ...dateFilter,
              lt: cursorTimestamp,
            }
          : dateFilter,
      },
      orderBy: {startedAt: 'desc'},
      take: limit,
      include: {
        contact: {
          select: {
            email: true,
          },
        },
        workflow: {
          select: {
            name: true,
          },
        },
      },
    });

    for (const execution of executions) {
      // Workflow started
      if (!types || types.includes(ActivityType.WORKFLOW_STARTED)) {
        activities.push({
          id: `${execution.id}_started`,
          type: ActivityType.WORKFLOW_STARTED,
          timestamp: execution.startedAt,
          contactEmail: execution.contact?.email,
          contactId: execution.contactId,
          metadata: {
            workflowName: execution.workflow.name,
            status: execution.status,
          },
        });
      }

      // Workflow completed
      if (execution.completedAt && (!types || types.includes(ActivityType.WORKFLOW_COMPLETED))) {
        activities.push({
          id: `${execution.id}_completed`,
          type: ActivityType.WORKFLOW_COMPLETED,
          timestamp: execution.completedAt,
          contactEmail: execution.contact?.email,
          contactId: execution.contactId,
          metadata: {
            workflowName: execution.workflow.name,
            status: execution.status,
            exitReason: execution.exitReason,
          },
        });
      }
    }

    return activities;
  }

  /**
   * Fetch scheduled campaigns
   */
  private static async fetchScheduledCampaigns(
    projectId: string,
    limit: number,
    dateFilter: Prisma.DateTimeFilter,
  ): Promise<Activity[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        projectId,
        status: 'SCHEDULED',
        scheduledFor: dateFilter,
      },
      orderBy: {scheduledFor: 'asc'},
      take: limit,
      include: {
        segment: {
          select: {
            name: true,
          },
        },
      },
    });

    return campaigns.map(campaign => ({
      id: `campaign_${campaign.id}_scheduled`,
      type: ActivityType.CAMPAIGN_SCHEDULED,
      timestamp: campaign.scheduledFor!,
      metadata: {
        campaignName: campaign.name,
        subject: campaign.subject,
        totalRecipients: campaign.totalRecipients,
        segmentName: campaign.segment?.name,
        audienceType: campaign.audienceType,
      },
    }));
  }

  /**
   * Fetch scheduled workflow step executions (emails with delays)
   */
  private static async fetchScheduledWorkflowSteps(
    projectId: string,
    limit: number,
    dateFilter: Prisma.DateTimeFilter,
  ): Promise<Activity[]> {
    const stepExecutions = await prisma.workflowStepExecution.findMany({
      where: {
        execution: {
          workflow: {
            projectId,
          },
        },
        status: 'PENDING',
        scheduledFor: dateFilter,
      },
      orderBy: {scheduledFor: 'asc'},
      take: limit,
      include: {
        execution: {
          include: {
            contact: {
              select: {
                email: true,
              },
            },
            workflow: {
              select: {
                name: true,
              },
            },
          },
        },
        step: {
          select: {
            name: true,
            type: true,
            config: true,
          },
        },
      },
    });

    return stepExecutions
      .filter(stepExec => stepExec.step?.type === 'SEND_EMAIL' && stepExec.scheduledFor)
      .map(stepExec => ({
        id: `workflow_step_${stepExec.id}_scheduled`,
        type: ActivityType.WORKFLOW_EMAIL_SCHEDULED,
        timestamp: stepExec.scheduledFor!,
        contactEmail: stepExec.execution.contact?.email,
        contactId: stepExec.execution.contactId,
        metadata: {
          workflowName: stepExec.execution.workflow.name,
          stepName: stepExec.step?.name,
          subject:
            stepExec.step?.config &&
            typeof stepExec.step.config === 'object' &&
            stepExec.step.config !== null &&
            'subject' in stepExec.step.config &&
            typeof (stepExec.step.config as Record<string, unknown>).subject === 'string'
              ? (stepExec.step.config as Record<string, unknown>).subject
              : undefined,
        },
      }));
  }
}

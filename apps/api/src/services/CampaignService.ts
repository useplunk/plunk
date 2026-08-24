import type {Campaign, Contact, Prisma} from '@plunk/db';
import {CampaignAudienceType, CampaignStatus, EmailSourceType, EmailStatus, TemplateType} from '@plunk/db';
import {compileTemplate} from '@plunk/shared';
import type {CreateCampaignData, FilterCondition, PaginatedResponse, UpdateCampaignData} from '@plunk/types';
import {fromPrismaJson, toPrismaJson} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {HttpException} from '../exceptions/index.js';
import type {ListSort} from '../utils/listSort.js';
import {buildEmailFieldsUpdate} from '../utils/modelUpdate.js';

import {BillingLimitService} from './BillingLimitService.js';
import {DomainService} from './DomainService.js';
import {buildEmailHeaders, classifyEmail} from './EmailHeaderService.js';
import {EmailService} from './EmailService.js';
import {NtfyService} from './NtfyService.js';
import {QueueService} from './QueueService.js';
import {SegmentService} from './SegmentService.js';
import {Keys} from './keys.js';
import {DASHBOARD_URI, STRIPE_ENABLED} from '../app/constants.js';
import {sendRawEmail} from './SESService.js';

const BATCH_SIZE = 500; // Number of emails to process per batch (increased for better performance)

export class CampaignService {
  /**
   * Create a new campaign
   */
  public static async create(projectId: string, data: CreateCampaignData): Promise<Campaign> {
    // Validate segment if provided
    if (data.audienceType === CampaignAudienceType.SEGMENT) {
      if (!data.segmentId) {
        throw new HttpException(400, 'Segment ID is required for SEGMENT audience type');
      }

      const segment = await prisma.segment.findFirst({
        where: {
          id: data.segmentId,
          projectId,
        },
      });

      if (!segment) {
        throw new HttpException(404, 'Segment not found');
      }
    }

    // Validate condition if provided
    if (data.audienceType === CampaignAudienceType.FILTERED && data.audienceCondition) {
      // This will throw if condition is invalid
      SegmentService.validateCondition(data.audienceCondition);
    }

    // Create campaign with initial recipient count of 0
    const campaign = await prisma.campaign.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        subject: data.subject,
        body: data.body,
        from: data.from,
        fromName: data.fromName,
        replyTo: data.replyTo,
        type: data.type ?? TemplateType.MARKETING,
        audienceType: data.audienceType,
        audienceCondition: toPrismaJson(data.audienceCondition || null),
        segmentId: data.segmentId,
        status: CampaignStatus.DRAFT,
        totalRecipients: 0, // Will be updated below
      },
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    // Calculate and update recipient count for the draft
    const recipientCount = await this.getRecipientCount(projectId, campaign);
    const updatedCampaign = await prisma.campaign.update({
      where: {id: campaign.id},
      data: {totalRecipients: recipientCount},
    });

    // Send notification about campaign creation
    await NtfyService.notifyCampaignCreated(campaign.name, campaign.project.name, projectId);

    return updatedCampaign;
  }

  /**
   * Update a campaign
   */
  public static async update(projectId: string, campaignId: string, data: UpdateCampaignData): Promise<Campaign> {
    const campaign = await this.get(projectId, campaignId);

    // Can only update draft or scheduled campaigns
    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new HttpException(400, 'Cannot update campaign that is sending or has been sent');
    }

    // Build base update data using shared utility
    const updateData: Prisma.CampaignUpdateInput = buildEmailFieldsUpdate(data) as Prisma.CampaignUpdateInput;

    // Handle campaign-specific fields
    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    if (data.audienceType !== undefined) {
      updateData.audienceType = data.audienceType;
    }

    if (data.audienceCondition !== undefined) {
      if (data.audienceCondition) {
        SegmentService.validateCondition(data.audienceCondition);
      }
      updateData.audienceCondition = toPrismaJson(data.audienceCondition || null);
    }

    if (data.segmentId !== undefined) {
      // Prevent changing segment on scheduled campaigns
      if (campaign.status === CampaignStatus.SCHEDULED) {
        throw new HttpException(400, 'Cannot change segment for scheduled campaigns');
      }

      if (data.segmentId) {
        const segment = await prisma.segment.findFirst({
          where: {id: data.segmentId, projectId},
        });
        if (!segment) {
          throw new HttpException(404, 'Segment not found');
        }
        updateData.segment = {connect: {id: data.segmentId}};
      } else {
        updateData.segment = {disconnect: true};
      }
      // Remove segmentId from updateData to avoid conflict with relation field
      delete (updateData as Record<string, unknown>).segmentId;
    }

    // Update the campaign first
    const updatedCampaign = await prisma.campaign.update({
      where: {id: campaignId},
      data: updateData,
    });

    // If audience-related fields changed and campaign is still a draft, recalculate totalRecipients
    const audienceChanged =
      data.audienceType !== undefined || data.segmentId !== undefined || data.audienceCondition !== undefined;

    if (audienceChanged && updatedCampaign.status === CampaignStatus.DRAFT) {
      const recipientCount = await this.getRecipientCount(projectId, updatedCampaign);
      return prisma.campaign.update({
        where: {id: campaignId},
        data: {totalRecipients: recipientCount},
      });
    }

    return updatedCampaign;
  }

  /**
   * Get a campaign
   */
  public static async get(projectId: string, campaignId: string): Promise<Campaign> {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        projectId,
      },
      include: {
        segment: true,
      },
    });

    if (!campaign) {
      throw new HttpException(404, 'Campaign not found');
    }

    return campaign;
  }

  /**
   * List campaigns for a project
   */
  public static async list(
    projectId: string,
    options: {
      status?: CampaignStatus;
      search?: string;
      page?: number;
      pageSize?: number;
      sort?: ListSort;
    } = {},
  ): Promise<PaginatedResponse<Campaign>> {
    const {status, search, page = 1, pageSize = 20, sort = {field: 'createdAt', direction: 'desc'}} = options;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CampaignWhereInput = {
      projectId,
      ...(status ? {status} : {}),
      ...(search
        ? {
            OR: [
              {name: {contains: search, mode: 'insensitive' as const}},
              {subject: {contains: search, mode: 'insensitive' as const}},
              {from: {contains: search, mode: 'insensitive' as const}},
            ],
          }
        : {}),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          segment: true,
        },
        orderBy: {[sort.field]: sort.direction} as Prisma.CampaignOrderByWithRelationInput,
        skip,
        take: pageSize,
      }),
      prisma.campaign.count({where}),
    ]);

    return {
      data: campaigns,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Delete a campaign
   */
  public static async delete(projectId: string, campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: {id: campaignId, projectId},
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    if (!campaign) {
      throw new HttpException(404, 'Campaign not found');
    }

    // Can only delete draft campaigns
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new HttpException(400, 'Can only delete draft campaigns');
    }

    await prisma.campaign.delete({
      where: {id: campaignId},
    });

    // Send notification about campaign deletion
    await NtfyService.notifyCampaignDeleted(campaign.name, campaign.project.name, projectId);
  }

  /**
   * Apply a bulk operation to multiple campaigns at once.
   *
   * The payload is intentionally open-ended (a single endpoint) so future bulk
   * operations can stack on the same operation. For now the only supported mode
   * is `delete: true` (bulk delete).
   *
   * Atomicity: every selected campaign must belong to the requesting project AND
   * every one of them must be a DRAFT. Both checks plus the `deleteMany` are
   * folded into a single Prisma transaction, so a partial bulk delete is
   * impossible — either every selected campaign is removed, or the whole
   * operation rolls back.
   *
   * Guards mirror the single-campaign `delete()` above:
   * - 404 if any id is missing from this project (foreign / cross-project id).
   * - 400 if any selected campaign is not a DRAFT (only drafts are deletable;
   *   SCHEDULED / SENDING / SENT / CANCELLED campaigns are rejected, exactly as
   *   the single delete path does). Non-deletable campaigns are not silently
   *   skipped — the whole operation rolls back.
   */
  public static async bulkUpdate(
    projectId: string,
    options: {ids: string[]; delete?: boolean},
  ): Promise<{deleted?: number; updated?: number}> {
    const {ids, delete: shouldDelete} = options;

    // Dedup defensively — the schema permits the same id twice and we don't
    // want duplicates inflating the ownership / row counts below.
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length === 0) {
      return {updated: 0};
    }

    if (shouldDelete) {
      return prisma.$transaction(async tx => {
        // 1. Ownership / project-scope check. Cross-project leaks are the main
        //    thing this endpoint must defend against.
        const owned = await tx.campaign.findMany({
          where: {id: {in: uniqueIds}, projectId},
          select: {id: true, status: true},
        });

        if (owned.length !== uniqueIds.length) {
          throw new HttpException(404, 'One or more campaigns not found in this project');
        }

        // 2. Reject the whole bulk delete if ANY selected campaign is not a
        //    DRAFT. Mirrors the single delete() guard — no partial wipes.
        const nonDraft = owned.filter(c => c.status !== CampaignStatus.DRAFT);

        if (nonDraft.length > 0) {
          const count = nonDraft.length;
          throw new HttpException(
            400,
            `Can only delete draft campaigns: ${count} of the selected campaign${
              count === 1 ? ' is' : 's are'
            } not a draft.`,
          );
        }

        const result = await tx.campaign.deleteMany({
          where: {id: {in: uniqueIds}, projectId},
        });

        return {deleted: result.count};
      });
    }

    // No-op shape for forward-compat: when other bulk modes ship they'll branch
    // off here. Returning {updated: 0} keeps the response shape stable.
    return {updated: 0};
  }

  /**
   * Duplicate a campaign
   */
  public static async duplicate(projectId: string, campaignId: string): Promise<Campaign> {
    const campaign = await this.get(projectId, campaignId);

    // Create a new campaign with the same data but reset status and stats
    const duplicatedCampaign = await prisma.campaign.create({
      data: {
        projectId,
        name: `${campaign.name} (Copy)`,
        description: campaign.description,
        subject: campaign.subject,
        body: campaign.body,
        from: campaign.from,
        fromName: campaign.fromName,
        replyTo: campaign.replyTo,
        type: campaign.type,
        audienceType: campaign.audienceType,
        audienceCondition: campaign.audienceCondition as Prisma.InputJsonValue,
        segmentId: campaign.segmentId,
        status: CampaignStatus.DRAFT,
        totalRecipients: 0, // Will be updated below
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        complainedCount: 0,
        unsubscribedCount: 0,
      },
    });

    // Calculate and update recipient count
    const recipientCount = await this.getRecipientCount(projectId, duplicatedCampaign);
    return prisma.campaign.update({
      where: {id: duplicatedCampaign.id},
      data: {totalRecipients: recipientCount},
    });
  }

  /**
   * Send campaign immediately or schedule for later
   */
  public static async send(projectId: string, campaignId: string, scheduledFor?: Date): Promise<Campaign> {
    const campaign = await this.get(projectId, campaignId);

    // Validate status
    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new HttpException(400, 'Campaign has already been sent or is currently sending');
    }

    // Get recipient count to validate there are contacts to send to
    const recipientCount = await this.getRecipientCount(projectId, campaign);

    if (recipientCount === 0) {
      throw new HttpException(400, 'Campaign has no recipients');
    }

    // Check billing limits before scheduling/sending the campaign
    // This ensures users cannot schedule campaigns that would exceed their quota
    if (STRIPE_ENABLED) {
      const limitCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);

      // If there's a limit set, verify the campaign won't exceed it
      if (limitCheck.limit !== null) {
        const projectedUsage = limitCheck.usage + recipientCount;

        if (projectedUsage > limitCheck.limit) {
          throw new HttpException(
            403,
            `Cannot ${scheduledFor ? 'schedule' : 'send'} campaign: would exceed billing limit. Current usage: ${limitCheck.usage}/${limitCheck.limit} emails, campaign recipients: ${recipientCount}. Upgrade your plan or reduce campaign recipients.`,
          );
        }
      }
    }

    if (scheduledFor) {
      // Schedule for later
      if (scheduledFor.getTime() <= Date.now()) {
        throw new HttpException(400, 'Scheduled time must be in the future');
      }

      // Update campaign status
      const updatedCampaign = await prisma.campaign.update({
        where: {id: campaignId},
        data: {
          status: CampaignStatus.SCHEDULED,
          scheduledFor,
          totalRecipients: recipientCount,
        },
        include: {
          project: {
            select: {name: true},
          },
        },
      });

      // Queue for scheduled sending
      await QueueService.scheduleCampaign(campaignId, scheduledFor);

      // Send notification about campaign scheduled
      await NtfyService.notifyCampaignScheduled(
        updatedCampaign.name,
        updatedCampaign.project.name,
        projectId,
        scheduledFor,
        recipientCount,
      );

      return updatedCampaign;
    } else {
      // Send immediately - start the batch processing
      await this.startSending(projectId, campaignId, recipientCount);

      return this.get(projectId, campaignId);
    }
  }

  /**
   * Start sending campaign (called immediately or when scheduled time arrives)
   * Now uses cursor-based pagination for better performance with large recipient lists
   */
  public static async startSending(projectId: string, campaignId: string, recipientCount?: number): Promise<void> {
    const campaign = await this.get(projectId, campaignId);

    // Validate status
    if (
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.SCHEDULED &&
      campaign.status !== CampaignStatus.SENDING
    ) {
      throw new HttpException(400, 'Campaign cannot be sent in its current status');
    }

    // Get recipient count if not provided
    if (recipientCount === undefined) {
      recipientCount = await this.getRecipientCount(projectId, campaign);
    }

    // Update campaign to SENDING status
    const updatedCampaign = await prisma.campaign.update({
      where: {id: campaignId},
      data: {
        status: CampaignStatus.SENDING,
        totalRecipients: recipientCount,
        sentAt: new Date(),
      },
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    // Send notification about campaign sending started
    await NtfyService.notifyCampaignSendingStarted(
      updatedCampaign.name,
      updatedCampaign.project.name,
      projectId,
      recipientCount,
    );

    // Queue first batch to start the cursor-based chain
    await QueueService.queueCampaignBatch({
      campaignId,
      batchNumber: 1,
      offset: 0,
      limit: BATCH_SIZE,
    });
  }

  /**
   * Process a single batch of campaign emails
   * Now uses cursor-based pagination for better performance
   */
  public static async processBatch(
    campaignId: string,
    batchNumber: number,
    offset: number,
    limit: number,
    cursor?: string,
  ): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: {id: campaignId},
      include: {
        project: true,
      },
    });

    if (!campaign) {
      throw new HttpException(404, 'Campaign not found');
    }

    if (campaign.status !== CampaignStatus.SENDING) {
      signale.warn(`[CAMPAIGN] Campaign ${campaignId} is not in SENDING status, skipping batch ${batchNumber}`);
      return;
    }

    // Get batch of recipients using cursor-based pagination
    const {contacts, nextCursor, hasMore} = await this.getRecipientsCursor(campaign.projectId, campaign, limit, cursor);

    // Parse the Liquid templates once per batch rather than once per recipient. The
    // subject and body are identical for every contact, only the variables differ.
    const subjectTemplate = compileTemplate(campaign.subject);
    const bodyTemplate = compileTemplate(campaign.body);

    // Queue emails for each contact
    for (const contact of contacts) {
      try {
        // Render template with contact data
        const contactData =
          contact.data && typeof contact.data === 'object' && !Array.isArray(contact.data) ? contact.data : {};
        const variables = {
          id: contact.id,
          email: contact.email,
          ...contactData,
          data: contactData,
          unsubscribeUrl: `${DASHBOARD_URI}/unsubscribe/${contact.id}`,
          subscribeUrl: `${DASHBOARD_URI}/subscribe/${contact.id}`,
          manageUrl: `${DASHBOARD_URI}/manage/${contact.id}`,
        };

        const renderedSubject = subjectTemplate.render(variables);
        const renderedBody = bodyTemplate.render(variables);

        await EmailService.sendCampaignEmail({
          projectId: campaign.projectId,
          contactId: contact.id,
          campaignId: campaign.id,
          templateId: undefined,
          subject: renderedSubject,
          body: renderedBody,
          from: campaign.from,
          fromName: campaign.fromName || undefined,
          replyTo: campaign.replyTo || undefined,
          isTransactional: campaign.type === TemplateType.TRANSACTIONAL,
        });
      } catch (error) {
        signale.error(`[CAMPAIGN] Failed to queue email for contact ${contact.id}:`, error);
        // Continue with other contacts even if one fails
      }
    }

    // Queue next batch if there are more contacts
    if (hasMore && nextCursor) {
      await QueueService.queueCampaignBatch({
        campaignId,
        batchNumber: batchNumber + 1,
        offset: 0, // Not used with cursor pagination
        limit,
        cursor: nextCursor,
      });
    } else {
      // Last batch: reconcile totalRecipients to the actual number of emails created.
      // Dynamic segments re-evaluate on each batch query, so contacts that left the
      // segment after totalRecipients was calculated are silently skipped. Without this
      // reconciliation, sentCount can never reach the original totalRecipients and the
      // campaign remains stuck in SENDING forever.
      const actualEmailCount = await prisma.email.count({where: {campaignId}});

      await prisma.campaign.update({
        where: {id: campaignId},
        data: {totalRecipients: actualEmailCount},
      });

      await this.finalizeIfDone(campaignId);
    }
  }

  /**
   * Emails sent so far in an in-flight campaign, held in Redis.
   *
   * Not a column increment: the send path runs once per recipient at a concurrency
   * derived from the SES quota, and every one of those writes would serialize on
   * the same campaign row. Measured on one row, throughput falls as concurrency
   * rises (~4.8k/s at 10 clients down to ~3.5k/s at 50) while the same load spread
   * over distinct rows scales up, and each write leaves a dead tuple on a table the
   * dashboard reads constantly. Redis INCR has neither problem.
   *
   * `Campaign.sentCount` stays authoritative and is written once, by
   * `reconcileStats` when the send finalizes; this key is only the live delta on
   * top of it and is dropped at that point.
   */
  private static readonly SENT_PROGRESS_TTL_SECONDS = 7 * 24 * 60 * 60;

  /**
   * Add one to a campaign's live sent progress.
   *
   * Callers must only invoke this when they are the ones that stamped
   * `Email.sentAt`, so a retried job that finds the email already sent does not
   * count it twice.
   *
   * Never allowed to fail the send that triggered it: the message is already away
   * by the time this runs, and throwing here would retry the job and send it again.
   * A lost increment is corrected by `reconcileStats` at finalization.
   */
  public static async countCampaignSent(campaignId: string): Promise<void> {
    try {
      const key = Keys.Campaign.sentProgress(campaignId);
      await redis.multi().incr(key).expire(key, this.SENT_PROGRESS_TTL_SECONDS).exec();
    } catch (error) {
      signale.warn(`[CAMPAIGN] Failed to record sent progress for campaign ${campaignId}:`, error);
    }
  }

  /**
   * Read the live sent progress for an in-flight campaign.
   *
   * Returns 0 when Redis is unavailable rather than throwing: a missing progress
   * number should render the campaign as "nothing sent yet", not fail the stats
   * endpoint outright.
   */
  private static async readSentProgress(campaignId: string): Promise<number> {
    try {
      const value = await redis.get(Keys.Campaign.sentProgress(campaignId));
      return value ? Number.parseInt(value, 10) || 0 : 0;
    } catch (error) {
      signale.warn(`[CAMPAIGN] Failed to read sent progress for campaign ${campaignId}:`, error);
      return 0;
    }
  }

  /**
   * Recompute a campaign's counters from the emails that carry them.
   *
   * This is the repair path for counters that are otherwise maintained by
   * increments as webhooks arrive. It runs once per campaign, at finalization --
   * never on read, which is what made the stats endpoint slow enough to notice.
   *
   * One grouped pass over the campaign's emails, so the cost is O(campaign size)
   * and paid once. `unsubscribedCount` is deliberately absent: it is not derivable
   * from the emails table, and the events that do carry it are not reachable by any
   * index that does not scan the whole table. Its increment in
   * ContactService.unsubscribe stands on its own.
   */
  public static async reconcileStats(campaignId: string): Promise<void> {
    const [totals] = await prisma.$queryRaw<
      {
        sent: bigint;
        delivered: bigint;
        opened: bigint;
        clicked: bigint;
        bounced: bigint;
        complained: bigint;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE "sentAt" IS NOT NULL) AS sent,
        COUNT(*) FILTER (WHERE "deliveredAt" IS NOT NULL) AS delivered,
        COUNT(*) FILTER (WHERE "openedAt" IS NOT NULL) AS opened,
        COUNT(*) FILTER (WHERE "clickedAt" IS NOT NULL) AS clicked,
        COUNT(*) FILTER (WHERE "bouncedAt" IS NOT NULL) AS bounced,
        COUNT(*) FILTER (WHERE "complainedAt" IS NOT NULL) AS complained
      FROM "emails"
      WHERE "campaignId" = ${campaignId}::text
    `;

    if (!totals) {
      return;
    }

    await prisma.campaign.update({
      where: {id: campaignId},
      data: {
        sentCount: Number(totals.sent),
        deliveredCount: Number(totals.delivered),
        openedCount: Number(totals.opened),
        clickedCount: Number(totals.clicked),
        bouncedCount: Number(totals.bounced),
        complainedCount: Number(totals.complained),
      },
    });

    // The column now carries the full total, so the live delta must go or it would
    // be counted a second time on top of it.
    try {
      await redis.del(Keys.Campaign.sentProgress(campaignId));
    } catch (error) {
      signale.warn(`[CAMPAIGN] Failed to clear sent progress for campaign ${campaignId}:`, error);
    }
  }

  /**
   * Finalize a SENDING campaign if every email has reached a terminal state.
   * Terminal = sentAt is set OR status is FAILED. Counting FAILED as terminal
   * unsticks campaigns where some emails couldn't be delivered (e.g. the project
   * was disabled mid-send), so the campaign moves to SENT with a partial sentCount.
   */
  public static async finalizeIfDone(campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: {id: campaignId},
      select: {
        id: true,
        name: true,
        status: true,
        totalRecipients: true,
        projectId: true,
        project: {select: {name: true}},
      },
    });

    if (!campaign || campaign.status !== CampaignStatus.SENDING) {
      return;
    }

    // Cheap completion probe: an unprocessed campaign email is always PENDING or
    // SENDING (any other status either has sentAt set or is FAILED, both terminal),
    // so a single index-only LIMIT 1 lookup tells us whether the campaign is done.
    // This runs on every sent email, so it must stay O(log N) — the full counts
    // below only run once the campaign has actually finished. See the (campaignId,
    // status) index on Email.
    const stillPending = await prisma.email.findFirst({
      where: {campaignId, status: {in: [EmailStatus.PENDING, EmailStatus.SENDING]}},
      select: {id: true},
    });

    if (stillPending) {
      return;
    }

    const [processedCount, sentCount] = await Promise.all([
      prisma.email.count({
        where: {
          campaignId,
          OR: [{sentAt: {not: null}}, {status: EmailStatus.FAILED}],
        },
      }),
      prisma.email.count({where: {campaignId, sentAt: {not: null}}}),
    ]);

    if (campaign.totalRecipients > 0 && processedCount < campaign.totalRecipients) {
      return;
    }

    await prisma.campaign.update({
      where: {id: campaignId},
      data: {status: CampaignStatus.SENT, sentCount},
    });

    // Fold every counter back to what the emails actually say, now that the send is
    // over. This is the one place the materialized stats are repaired: the webhook
    // increments that maintain them between sends can be lost or replayed, and
    // nothing else recomputes them.
    await this.reconcileStats(campaignId);

    signale.success(
      `[CAMPAIGN] Campaign ${campaign.name} finalized: ${sentCount}/${campaign.totalRecipients} emails sent`,
    );

    await NtfyService.notifyCampaignSendCompleted(campaign.name, campaign.project.name, campaign.projectId, sentCount);
  }

  /**
   * Cancel a campaign
   */
  public static async cancel(projectId: string, campaignId: string): Promise<Campaign> {
    const campaign = await this.get(projectId, campaignId);

    // Can only cancel scheduled or sending campaigns
    if (campaign.status !== CampaignStatus.SCHEDULED && campaign.status !== CampaignStatus.SENDING) {
      throw new HttpException(400, 'Can only cancel scheduled or sending campaigns');
    }

    // If scheduled, remove from queue
    if (campaign.status === CampaignStatus.SCHEDULED) {
      await QueueService.cancelScheduledCampaign(campaignId);
    }

    // Update status
    const cancelledCampaign = await prisma.campaign.update({
      where: {id: campaignId},
      data: {
        status: CampaignStatus.CANCELLED,
      },
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    // Send notification about campaign cancellation
    await NtfyService.notifyCampaignCancelled(cancelledCampaign.name, cancelledCampaign.project.name, projectId);

    return cancelledCampaign;
  }

  /**
   * Get campaign statistics.
   *
   * Reads the counters off the campaign row rather than recomputing them. Every
   * one of them is maintained as the events that move it arrive: `sentCount` in
   * the send paths, delivered/opened/clicked/bounced/complained in
   * EmailService.handleWebhookEvent, and `unsubscribedCount` in
   * ContactService.unsubscribe. Recomputing here would re-derive numbers that are
   * already correct, at a cost that grows with the campaign -- and, in the case of
   * unsubscribes, with the size of the whole events table, since no index serves a
   * predicate on Event.name alone. This endpoint is polled every 15s while a
   * campaign is sending, so it has to stay a single indexed row lookup.
   *
   * `this.get` has already fetched the row, so the stats cost no further queries.
   */
  public static async getStats(projectId: string, campaignId: string) {
    const campaign = await this.get(projectId, campaignId);

    const {
      totalRecipients,
      deliveredCount,
      openedCount,
      clickedCount,
      bouncedCount,
      complainedCount,
      unsubscribedCount,
    } = campaign;

    // `sentCount` is only written to the row when the send finalizes, so while a
    // campaign is in flight the progress lives in Redis. One GET, and only for a
    // campaign that is actually sending.
    const sentCount =
      campaign.status === CampaignStatus.SENDING
        ? campaign.sentCount + (await this.readSentProgress(campaignId))
        : campaign.sentCount;

    return {
      totalRecipients,
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      bouncedCount,
      complainedCount,
      unsubscribedCount,
      openRate: sentCount > 0 ? (openedCount / sentCount) * 100 : 0,
      clickRate: sentCount > 0 ? (clickedCount / sentCount) * 100 : 0,
      bounceRate: sentCount > 0 ? (bouncedCount / sentCount) * 100 : 0,
      deliveryRate: sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0,
      // Every rate on this object divides by sentCount, which is what the API
      // documents. Complaints in particular must match that convention: the
      // project-level complaint rate SES enforcement watches is also measured
      // against emails sent, and two rates for the same thing that disagree are
      // worse than either.
      complaintRate: sentCount > 0 ? (complainedCount / sentCount) * 100 : 0,
      unsubscribeRate: sentCount > 0 ? (unsubscribedCount / sentCount) * 100 : 0,
    };
  }

  /**
   * Send a test email for a campaign
   */
  public static async sendTest(projectId: string, campaignId: string, testEmail: string): Promise<void> {
    const campaign = await this.get(projectId, campaignId);

    // Validate that the test email belongs to a project member
    const membership = await prisma.membership.findFirst({
      where: {
        projectId,
        user: {
          email: testEmail,
        },
      },
      include: {
        user: true,
      },
    });

    if (!membership) {
      throw new HttpException(403, 'Test emails can only be sent to project members');
    }

    // Verify domain is registered and verified before sending
    await DomainService.verifyEmailDomain(campaign.from, projectId);

    // Get project to validate from address
    const project = await prisma.project.findUnique({
      where: {id: projectId},
    });

    if (!project) {
      throw new HttpException(404, 'Project not found');
    }

    // Mirror the production classification so the test send carries the same
    // headers real recipients would get. Test emails use the raw body without the
    // unsubscribe footer, so there is no unsubscribe URL to advertise. A
    // transactional campaign resolves to a TRANSACTIONAL source upstream, so map it
    // here too.
    const emailClass = classifyEmail({
      sourceType:
        campaign.type === TemplateType.TRANSACTIONAL ? EmailSourceType.TRANSACTIONAL : EmailSourceType.CAMPAIGN,
      campaignType: campaign.type,
    });

    // Prepare the email content (no variable replacement for test emails)
    await sendRawEmail({
      from: {
        name: campaign.fromName || project.name || 'Plunk',
        email: campaign.from,
      },
      to: [testEmail],
      content: {
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.body,
        text: EmailService.htmlToText(campaign.body),
      },
      reply: campaign.replyTo || undefined,
      headers: buildEmailHeaders({
        emailClass,
        isCampaign: true,
        customHeaders: {'X-Plunk-Test': 'true'},
      }),
      tracking: false, // Disable tracking for test emails
    });
  }

  /**
   * Get recipient count for a campaign
   */
  private static async getRecipientCount(projectId: string, campaign: Campaign): Promise<number> {
    const where = await this.buildRecipientWhereAsync(projectId, campaign);
    return prisma.contact.count({where});
  }

  /**
   * Get recipients for a campaign (legacy offset-based, kept for compatibility)
   */
  private static async getRecipients(
    projectId: string,
    campaign: Campaign,
    offset: number,
    limit: number,
  ): Promise<Contact[]> {
    const where = await this.buildRecipientWhereAsync(projectId, campaign);

    return prisma.contact.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {createdAt: 'asc'}, // Consistent ordering for batching
    });
  }

  /**
   * Get recipients for a campaign using cursor-based pagination
   */
  private static async getRecipientsCursor(
    projectId: string,
    campaign: Campaign,
    limit: number,
    cursor?: string,
  ): Promise<{contacts: Contact[]; nextCursor?: string; hasMore: boolean}> {
    const where = await this.buildRecipientWhereAsync(projectId, campaign);

    // Fetch one extra to determine if there are more results
    const contacts = await prisma.contact.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? {id: cursor} : undefined,
      orderBy: {id: 'asc'}, // Use ID for consistent cursor ordering
    });

    const hasMore = contacts.length > limit;
    const results = hasMore ? contacts.slice(0, -1) : contacts;
    const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

    return {
      contacts: results,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Build WHERE clause for campaign recipients (async for segment lookups)
   */
  private static async buildRecipientWhereAsync(
    projectId: string,
    campaign: Campaign,
  ): Promise<Prisma.ContactWhereInput> {
    const baseWhere: Prisma.ContactWhereInput = {
      projectId,
      // Transactional campaigns send to all contacts regardless of subscription status
      ...(campaign.type !== TemplateType.TRANSACTIONAL && {subscribed: true}),
    };

    switch (campaign.audienceType) {
      case CampaignAudienceType.ALL:
        return baseWhere;

      case CampaignAudienceType.SEGMENT:
        if (!campaign.segmentId) {
          throw new HttpException(400, 'Segment ID is required for SEGMENT audience type');
        }

        // Get segment and use its filters
        return this.buildSegmentWhereAsync(projectId, campaign.segmentId, baseWhere);

      case CampaignAudienceType.FILTERED: {
        const condition = fromPrismaJson<FilterCondition>(campaign.audienceCondition);
        if (!condition) {
          throw new HttpException(400, 'Audience condition is required for FILTERED audience type');
        }

        // Use the SegmentService to build the where clause from the condition
        const segmentWhere = await SegmentService.buildConditionClause(condition);

        return {
          ...baseWhere,
          ...segmentWhere,
        };
      }

      default:
        throw new HttpException(400, 'Invalid audience type');
    }
  }

  /**
   * Build WHERE clause for segment-based campaigns
   */
  private static async buildSegmentWhereAsync(
    projectId: string,
    segmentId: string,
    baseWhere: Prisma.ContactWhereInput,
  ): Promise<Prisma.ContactWhereInput> {
    // Fetch the segment to get its condition
    const segment = await prisma.segment.findUnique({
      where: {id: segmentId},
    });

    if (!segment) {
      throw new HttpException(404, 'Segment not found');
    }

    if (segment.type === 'STATIC') {
      return {
        ...baseWhere,
        segmentMemberships: {
          some: {
            segmentId,
            exitedAt: null,
          },
        },
      };
    }

    const condition = fromPrismaJson<FilterCondition>(segment.condition);
    const segmentWhere = await SegmentService.buildConditionClause(condition);

    return {
      ...baseWhere,
      ...segmentWhere,
    };
  }
}

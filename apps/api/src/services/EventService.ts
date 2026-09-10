import type {Event} from '@plunk/db';
import {Prisma} from '@plunk/db';
import type {FilterCondition, FilterGroup} from '@plunk/types';
import {toPrismaJson} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';

import {WorkflowExecutionService} from './WorkflowExecutionService.js';

/**
 * Event Service
 * Handles event tracking and workflow triggering
 */
export class EventService {
  /**
   * Track an event
   * This can trigger workflows that are listening for this event
   */
  public static async trackEvent(
    projectId: string,
    eventName: string,
    contactId?: string,
    emailId?: string,
    data?: Record<string, unknown>,
  ): Promise<Event> {
    // Create event record
    const event = await prisma.event.create({
      data: {
        projectId,
        contactId,
        emailId,
        name: eventName,
        data: data ? toPrismaJson(data) : undefined,
      },
    });

    await this.dispatchStoredEvent(event.id);

    return event;
  }

  /**
   * Dispatch a durably stored event to workflow triggers and waits. A failed
   * dispatch leaves processedAt null so the reconciliation worker can retry it.
   */
  public static async dispatchStoredEvent(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({where: {id: eventId}});
    if (!event || event.processedAt) return;

    const data =
      event.data && typeof event.data === 'object' && !Array.isArray(event.data)
        ? (event.data as Record<string, unknown>)
        : undefined;

    await this.triggerWorkflows(event.projectId, event.name, event.contactId ?? undefined, data);
    await WorkflowExecutionService.handleEvent(event.projectId, event.name, event.contactId ?? undefined, data);

    await prisma.event.updateMany({
      where: {id: event.id, processedAt: null},
      data: {processedAt: new Date()},
    });
  }

  /**
   * Invalidate the workflow cache for a project
   * Should be called when workflows are enabled/disabled or updated
   */
  public static async invalidateWorkflowCache(projectId: string): Promise<void> {
    const cacheKey = Keys.Workflow.enabled(projectId);
    try {
      await redis.del(cacheKey);
    } catch (error) {
      signale.warn('[EVENT] Failed to invalidate workflow cache:', error);
    }
  }

  /**
   * Get events for a contact
   */
  public static async getContactEvents(projectId: string, contactId: string, limit = 50): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        projectId,
        contactId,
      },
      orderBy: {createdAt: 'desc'},
      take: limit,
    });
  }

  /**
   * Get events for a project
   */
  public static async getProjectEvents(projectId: string, eventName?: string, limit = 100): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        projectId,
        ...(eventName ? {name: eventName} : {}),
      },
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
  }

  /**
   * Get event counts by type
   */
  public static async getEventStats(projectId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.EventWhereInput = {
      projectId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? {gte: startDate} : {}),
              ...(endDate ? {lte: endDate} : {}),
            },
          }
        : {}),
    };

    const events = await prisma.event.groupBy({
      by: ['name'],
      where,
      _count: true,
      orderBy: {
        _count: {
          name: 'desc',
        },
      },
    });

    return events.map(e => ({
      name: e.name,
      count: e._count,
    }));
  }

  /**
   * Get unique event names for a project
   */
  public static async getUniqueEventNames(projectId: string): Promise<string[]> {
    const events = await prisma.event.groupBy({
      by: ['name'],
      where: {projectId},
      orderBy: {
        _count: {
          name: 'desc',
        },
      },
    });

    return events.map(e => e.name);
  }

  /**
   * Get available event data fields for a specific event name
   * Analyzes actual event data to discover which fields are present
   * This is optimized for large datasets - only samples recent events
   */
  public static async getAvailableEventFields(projectId: string, eventName?: string): Promise<string[]> {
    // Query recent events to discover data fields (limit to 100 for performance)
    const events = await prisma.event.findMany({
      where: {
        projectId,
        ...(eventName ? {name: eventName} : {}),
        data: {
          not: Prisma.DbNull, // Only events with data (not null)
        },
      },
      select: {
        data: true,
      },
      orderBy: {createdAt: 'desc'},
      take: 100, // Sample recent events for performance
    });

    // Extract all unique keys from event data
    const fieldSet = new Set<string>();

    for (const event of events) {
      if (event.data && typeof event.data === 'object' && !Array.isArray(event.data)) {
        const data = event.data as Record<string, unknown>;
        for (const key of Object.keys(data)) {
          fieldSet.add(`event.${key}`);
        }
      }
    }

    return Array.from(fieldSet).sort();
  }

  /**
   * Check if an event is used in any segments or workflows
   * Returns usage information including which segments/workflows use the event
   *
   * @param projectId - The project ID
   * @param eventName - The event name to check (e.g., "purchase.completed", "user.signup")
   * @returns Usage information
   */
  public static async getEventUsage(
    projectId: string,
    eventName: string,
  ): Promise<{
    usedInSegments: Array<{id: string; name: string}>;
    usedInWorkflows: Array<{id: string; name: string}>;
    totalCount: number;
    uniqueContacts: number;
    canDelete: boolean;
  }> {
    // Get all segments for the project
    const segments = await prisma.segment.findMany({
      where: {projectId},
      select: {id: true, name: true, condition: true},
    });

    // Check which segments use this event
    const usedInSegments = segments.filter(segment => {
      const condition = segment.condition as FilterCondition | null;
      return this.eventUsedInCondition(eventName, condition);
    });

    // Get workflows that use this event as a trigger or wait condition
    const workflows = await prisma.workflow.findMany({
      where: {
        projectId,
        OR: [
          // Event as trigger
          {
            triggerType: 'EVENT',
            triggerConfig: {
              path: ['eventName'],
              equals: eventName,
            },
          },
        ],
      },
      select: {id: true, name: true},
    });

    // Also check workflow steps that wait for events
    const workflowStepsWithEvent = await prisma.workflowStep.findMany({
      where: {
        workflow: {projectId},
        type: 'WAIT_FOR_EVENT',
        config: {
          path: ['eventName'],
          equals: eventName,
        },
      },
      include: {
        workflow: {
          select: {id: true, name: true},
        },
      },
    });

    const usedInWorkflows = [...workflows, ...workflowStepsWithEvent.map(step => step.workflow)].reduce(
      (acc, workflow) => {
        // Deduplicate by id
        if (!acc.find((w: {id: string; name: string}) => w.id === workflow.id)) {
          acc.push(workflow);
        }
        return acc;
      },
      [] as Array<{id: string; name: string}>,
    );

    // Get event statistics
    const [totalCount, uniqueContacts] = await Promise.all([
      prisma.event.count({
        where: {projectId, name: eventName},
      }),
      prisma.event
        .groupBy({
          by: ['contactId'],
          where: {projectId, name: eventName, contactId: {not: null}},
        })
        .then(results => results.length),
    ]);

    const canDelete = usedInSegments.length === 0 && usedInWorkflows.length === 0;

    return {
      usedInSegments,
      usedInWorkflows,
      totalCount,
      uniqueContacts,
      canDelete,
    };
  }

  /**
   * Delete all events with a specific name
   * WARNING: This is destructive and cannot be undone
   * Should only be called after verifying the event is not in use
   *
   * @param projectId - The project ID
   * @param eventName - The event name to delete
   */
  public static async deleteEvent(projectId: string, eventName: string): Promise<{deletedCount: number}> {
    // Prevent deletion of reserved system events
    if (this.isReservedEvent(eventName)) {
      throw new Error(`Cannot delete reserved system event: ${eventName}`);
    }

    // Check if event is in use
    const usage = await this.getEventUsage(projectId, eventName);
    if (!usage.canDelete) {
      throw new Error(
        `Cannot delete event: used in ${usage.usedInSegments.length} segment(s) and ${usage.usedInWorkflows.length} workflow(s)`,
      );
    }

    // Delete all events with this name
    const result = await prisma.event.deleteMany({
      where: {
        projectId,
        name: eventName,
      },
    });

    return {deletedCount: result.count};
  }

  /**
   * Check if an event name is reserved for system use
   * Reserved patterns:
   * - email.* (email.sent, email.delivery, email.open, email.click, email.bounce, email.complaint)
   * - contact.subscribed, contact.unsubscribed
   * - segment.*.entry, segment.*.exit
   *
   * @param eventName - The event name to check
   * @returns true if the event is reserved, false otherwise
   */
  public static isReservedEvent(eventName: string): boolean {
    // Email events: email.*
    if (eventName.startsWith('email.')) {
      return true;
    }

    // Contact events: contact.subscribed, contact.unsubscribed
    if (eventName === 'contact.subscribed' || eventName === 'contact.unsubscribed') {
      return true;
    }

    // Segment events: segment.*.entry, segment.*.exit
    // Pattern: segment.<slug>.entry or segment.<slug>.exit
    if (eventName.startsWith('segment.') && (eventName.endsWith('.entry') || eventName.endsWith('.exit'))) {
      return true;
    }

    return false;
  }

  /**
   * Trigger workflows based on an event
   * Uses Redis caching for enabled workflows to improve performance
   */
  private static async triggerWorkflows(
    projectId: string,
    eventName: string,
    contactId?: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    // Try to get workflows from cache
    const cacheKey = Keys.Workflow.enabled(projectId);
    let workflows;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        workflows = JSON.parse(cached);
      }
    } catch (error) {
      signale.warn('[EVENT] Failed to get workflows from cache:', error);
    }

    // If not in cache, fetch from database
    if (!workflows) {
      workflows = await prisma.workflow.findMany({
        where: {
          projectId,
          enabled: true,
          triggerType: 'EVENT',
        },
        include: {
          steps: {
            where: {type: 'TRIGGER'},
          },
        },
      });

      // Cache for 5 minutes
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(workflows));
      } catch (error) {
        signale.warn('[EVENT] Failed to cache workflows:', error);
      }
    }

    for (const workflow of workflows) {
      const triggerConfig = workflow.triggerConfig;

      // Check if this workflow is triggered by this event
      if (triggerConfig?.eventName === eventName) {
        // If event is for a specific contact, start workflow for that contact
        if (contactId) {
          await this.startWorkflowForContact(workflow.id, contactId, data);
        } else {
          // If event is not contact-specific, you might want different logic
          // For example, trigger for all contacts, or skip
          signale.info(`[EVENT] Event ${eventName} triggered workflow ${workflow.id}, but no contact specified`);
        }
      }
    }
  }

  /**
   * Start a workflow execution for a contact
   */
  private static async startWorkflowForContact(
    workflowId: string,
    contactId: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Get workflow with steps and configuration
      const workflow = await prisma.workflow.findUnique({
        where: {id: workflowId},
        include: {
          steps: {
            where: {type: 'TRIGGER'},
          },
        },
      });

      if (!workflow || workflow.steps.length === 0) {
        signale.error(`[EVENT] Workflow ${workflowId} has no trigger step`);
        return;
      }

      // Never run a workflow against a contact from another project.
      // Queried directly instead of via ContactService, which imports this service.
      const contact = await prisma.contact.findFirst({
        where: {id: contactId, projectId: workflow.projectId},
        select: {id: true},
      });

      if (!contact) {
        signale.warn(
          `[EVENT] Refusing to start workflow ${workflowId} for contact ${contactId}: contact does not belong to project ${workflow.projectId}`,
        );
        return;
      }

      // Check re-entry rules
      if (!workflow.allowReentry) {
        // If re-entry is not allowed, check if contact has ANY execution (regardless of status)
        const existingExecution = await prisma.workflowExecution.findFirst({
          where: {
            workflowId,
            contactId,
          },
        });

        if (existingExecution) {
          return;
        }
      } else {
        // If re-entry is allowed, only check if there's a currently RUNNING execution
        const runningExecution = await prisma.workflowExecution.findFirst({
          where: {
            workflowId,
            contactId,
            status: 'RUNNING',
          },
        });

        if (runningExecution) {
          return;
        }
      }

      const triggerStep = workflow.steps[0];

      if (!triggerStep) {
        signale.error(`[EVENT] Workflow ${workflowId} trigger step not found`);
        return;
      }

      // Create workflow execution
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId,
          contactId,
          status: 'RUNNING',
          currentStepId: triggerStep.id,
          context: context ? toPrismaJson(context) : undefined,
        },
      });

      signale.info(
        `[EVENT] Started workflow ${workflowId} execution ${execution.id} for contact ${contactId}${workflow.allowReentry ? ' (re-entry allowed)' : ''}`,
      );

      // Start executing the workflow
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
    } catch (error) {
      signale.error(`[EVENT] Error starting workflow ${workflowId}:`, error);
    }
  }

  /**
   * Helper: Check if an event is used in a filter condition (recursive)
   */
  private static eventUsedInCondition(eventName: string, condition: FilterCondition | null): boolean {
    if (!condition || typeof condition !== 'object') {
      return false;
    }

    // Check groups in the condition
    if (Array.isArray(condition.groups)) {
      for (const group of condition.groups) {
        if (this.eventUsedInGroup(eventName, group)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper: Check if an event is used in a filter group (recursive)
   */
  private static eventUsedInGroup(eventName: string, group: FilterGroup): boolean {
    if (!group || typeof group !== 'object') {
      return false;
    }

    // Check filters in the group
    if (Array.isArray(group.filters)) {
      for (const filter of group.filters) {
        // Event filters use field name like "event.eventName"
        if (filter.field === `event.${eventName}`) {
          return true;
        }
      }
    }

    // Check nested conditions
    if (group.conditions) {
      return this.eventUsedInCondition(eventName, group.conditions);
    }

    return false;
  }
}

import {randomUUID} from 'node:crypto';

import type {Event} from '@plunk/db';
import {Prisma} from '@plunk/db';
import type {FilterCondition, FilterGroup} from '@plunk/types';
import {toPrismaJson} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';

import {WorkflowExecutionService} from './WorkflowExecutionService.js';

const EVENT_DISPATCH_MAX_ATTEMPTS = 8;
const EVENT_DISPATCH_BASE_DELAY_MS = 60 * 1000;
const EVENT_DISPATCH_MAX_DELAY_MS = 60 * 60 * 1000;
const EVENT_DISPATCH_LEASE_MS = 15 * 60 * 1000;
const EVENT_DISPATCH_HEARTBEAT_MS = EVENT_DISPATCH_LEASE_MS / 3;

type DispatchLeaseGuard = {
  assertOwnership: () => Promise<void>;
  stop: () => void;
};

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

    try {
      await this.dispatchStoredEvent(event.id);
    } catch (error) {
      // The event is already committed. Keep processedAt null and acknowledge
      // ingestion; the bounded reconciliation sweep owns workflow delivery.
      signale.error(`[EVENT-OUTBOX] Event ${event.id} is stored but dispatch failed:`, error);
    }

    return event;
  }

  /**
   * Dispatch a durably stored event to workflow triggers and waits. A failed
   * dispatch leaves processedAt null so the reconciliation worker can retry it.
   * The fenced lease keeps a sweep from overlapping live request dispatch.
   */
  public static async dispatchStoredEvent(eventId: string): Promise<void> {
    const leaseId = randomUUID();
    const now = new Date();
    const claimed = await prisma.event.updateMany({
      where: {
        id: eventId,
        processedAt: null,
        dispatchFailedAt: null,
        OR: [{dispatchLeaseExpiresAt: null}, {dispatchLeaseExpiresAt: {lte: now}}],
      },
      data: {
        dispatchLeaseId: leaseId,
        dispatchLeaseExpiresAt: new Date(now.getTime() + EVENT_DISPATCH_LEASE_MS),
      },
    });
    if (claimed.count === 0) return;

    const lease = this.startDispatchLeaseHeartbeat(eventId, leaseId);
    try {
      const event = await prisma.event.findUnique({where: {id: eventId}});
      if (!event) return;

      const data =
        event.data && typeof event.data === 'object' && !Array.isArray(event.data)
          ? (event.data as Record<string, unknown>)
          : undefined;

      let errors: unknown[] = [];
      try {
        errors = await this.triggerWorkflows(
          event.id,
          event.projectId,
          event.name,
          event.contactId ?? undefined,
          data,
          lease.assertOwnership,
        );
      } catch (error) {
        errors.push(error);
      }

      try {
        await lease.assertOwnership();
        await WorkflowExecutionService.handleEvent(
          event.projectId,
          event.name,
          event.contactId ?? undefined,
          data,
          event.id,
          lease.assertOwnership,
        );
      } catch (error) {
        errors.push(error);
      }

      if (errors.length > 0) {
        throw new AggregateError(errors, `Event ${event.id} failed ${errors.length} dispatch target(s)`);
      }

      await lease.assertOwnership();
      const completed = await prisma.event.updateMany({
        where: {id: event.id, dispatchLeaseId: leaseId, processedAt: null, dispatchFailedAt: null},
        data: {
          processedAt: new Date(),
          nextDispatchAt: null,
          dispatchError: null,
          dispatchLeaseId: null,
          dispatchLeaseExpiresAt: null,
        },
      });

      if (completed.count !== 1) {
        throw new Error(`Event ${event.id} dispatch lease was lost before acknowledgement`);
      }
    } catch (error) {
      await this.recordDispatchFailure(eventId, leaseId, error);
      throw error;
    } finally {
      lease.stop();
    }
  }

  /**
   * Renew a fenced lease while workflow continuations are running. A failed
   * heartbeat permanently invalidates this dispatcher so it cannot keep
   * delivering after another worker may have reclaimed the event.
   */
  private static startDispatchLeaseHeartbeat(
    eventId: string,
    leaseId: string,
    intervalMs = EVENT_DISPATCH_HEARTBEAT_MS,
  ): DispatchLeaseGuard {
    let heartbeatError: unknown;
    let renewal: Promise<void> | undefined;

    const renew = async (): Promise<void> => {
      if (heartbeatError) throw heartbeatError;
      if (renewal) return renewal;

      renewal = (async () => {
        const now = new Date();
        const renewed = await prisma.event.updateMany({
          where: {id: eventId, dispatchLeaseId: leaseId, processedAt: null, dispatchFailedAt: null},
          data: {dispatchLeaseExpiresAt: new Date(now.getTime() + EVENT_DISPATCH_LEASE_MS)},
        });
        if (renewed.count !== 1) {
          throw new Error(`Event ${eventId} dispatch lease is no longer owned by ${leaseId}`);
        }
      })()
        .catch(error => {
          heartbeatError = error;
          throw error;
        })
        .finally(() => {
          renewal = undefined;
        });

      return renewal;
    };

    const timer = setInterval(() => {
      void renew().catch(error => {
        signale.error(`[EVENT-OUTBOX] Event ${eventId} dispatch lease heartbeat failed:`, error);
      });
    }, intervalMs);
    timer.unref();

    return {
      assertOwnership: renew,
      stop: () => clearInterval(timer),
    };
  }

  /**
   * Back off repeated failures and dead-letter a poison event after a bounded
   * number of attempts. Terminal rows remain inspectable but leave the sweep.
   */
  private static async recordDispatchFailure(eventId: string, leaseId: string, error: unknown): Promise<void> {
    const event = await prisma.event.findUnique({
      where: {id: eventId},
      select: {dispatchAttempts: true, dispatchLeaseId: true, processedAt: true, dispatchFailedAt: true},
    });
    if (!event || event.dispatchLeaseId !== leaseId || event.processedAt || event.dispatchFailedAt) return;

    const attempts = event.dispatchAttempts + 1;
    const terminal = attempts >= EVENT_DISPATCH_MAX_ATTEMPTS;
    const delayMs = Math.min(
      EVENT_DISPATCH_BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1),
      EVENT_DISPATCH_MAX_DELAY_MS,
    );
    const message = (
      error instanceof AggregateError
        ? `${error.message}: ${error.errors
            .map(cause => (cause instanceof Error ? cause.message : String(cause)))
            .join('; ')}`
        : error instanceof Error
          ? error.message
          : String(error)
    ).slice(0, 2000);

    const updated = await prisma.event.updateMany({
      where: {id: eventId, dispatchLeaseId: leaseId, processedAt: null, dispatchFailedAt: null},
      data: {
        dispatchAttempts: attempts,
        dispatchError: message,
        nextDispatchAt: terminal ? null : new Date(Date.now() + delayMs),
        dispatchFailedAt: terminal ? new Date() : null,
        dispatchLeaseId: null,
        dispatchLeaseExpiresAt: null,
      },
    });

    if (terminal && updated.count > 0) {
      signale.error(`[EVENT-OUTBOX] Event ${eventId} exhausted ${attempts} dispatch attempts and was dead-lettered`);
    }
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
    eventId: string,
    projectId: string,
    eventName: string,
    contactId?: string,
    data?: Record<string, unknown>,
    assertDispatchOwnership?: () => Promise<void>,
  ): Promise<unknown[]> {
    const errors: unknown[] = [];
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
        await assertDispatchOwnership?.();

        // If event is for a specific contact, start workflow for that contact
        if (contactId) {
          try {
            await this.startWorkflowForContact(workflow.id, contactId, eventId, data);
          } catch (error) {
            signale.error(`[EVENT] Failed to enroll workflow ${workflow.id} from event ${eventId}:`, error);
            errors.push(error);
          }
        } else {
          // If event is not contact-specific, you might want different logic
          // For example, trigger for all contacts, or skip
          signale.info(`[EVENT] Event ${eventName} triggered workflow ${workflow.id}, but no contact specified`);
        }
      }
    }

    return errors;
  }

  /**
   * Start a workflow execution for a contact
   */
  private static async startWorkflowForContact(
    workflowId: string,
    contactId: string,
    sourceEventId: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
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

    const triggerStep = workflow.steps[0];

    if (!triggerStep) {
      signale.error(`[EVENT] Workflow ${workflowId} trigger step not found`);
      return;
    }

    // Once a step has begun, enrollment is durably delivered. Do not replay a
    // failed step: its external effect may have succeeded before the engine
    // recorded the failure. A RUNNING execution with no step row is safe to
    // resume because no workflow step has started yet.
    const eventExecution = await prisma.workflowExecution.findFirst({
      where: {workflowId, sourceEventId},
      select: {
        id: true,
        status: true,
        stepExecutions: {select: {id: true}, take: 1},
      },
    });

    if (eventExecution) {
      if (eventExecution.status === 'RUNNING' && eventExecution.stepExecutions.length === 0) {
        await WorkflowExecutionService.processStepExecution(eventExecution.id, triggerStep.id);
      }
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
      // Re-entry allows a later run, not overlap with a delay or event wait.
      const activeExecution = await prisma.workflowExecution.findFirst({
        where: {
          workflowId,
          contactId,
          status: {in: ['RUNNING', 'WAITING']},
        },
      });

      if (activeExecution) {
        return;
      }
    }

    let execution;
    try {
      execution = await prisma.workflowExecution.create({
        data: {
          workflowId,
          contactId,
          status: 'RUNNING',
          currentStepId: triggerStep.id,
          sourceEventId,
          context: context ? toPrismaJson(context) : undefined,
        },
      });
    } catch (error) {
      // Concurrent dispatchers may both observe no enrollment. The database
      // chooses one winner; the other has nothing left to deliver.
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return;
      }
      throw error;
    }

    signale.info(
      `[EVENT] Started workflow ${workflowId} execution ${execution.id} for contact ${contactId}${workflow.allowReentry ? ' (re-entry allowed)' : ''}`,
    );

    // A dispatch failure must propagate so the event stays unprocessed. The
    // request still acknowledges the committed event; maintenance retries it.
    await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
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

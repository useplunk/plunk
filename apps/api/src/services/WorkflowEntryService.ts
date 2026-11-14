import type {Workflow, WorkflowExecution} from '@plunk/db';
import {Prisma, WorkflowExecutionStatus} from '@plunk/db';
import type {WorkflowEntryRefusal} from '@plunk/types';
import {toPrismaJson} from '@plunk/types';

import {prisma} from '../database/prisma.js';

import {ThrottleService} from './ThrottleService.js';
import {WorkflowExecutionService} from './WorkflowExecutionService.js';

type EntryWorkflow = Pick<
  Workflow,
  'id' | 'projectId' | 'allowReentry' | 'throttleWindowSeconds' | 'throttleKey'
>;

export type EntryResult = {entered: true; execution: WorkflowExecution} | {entered: false; refusal: WorkflowEntryRefusal};

/** Longest key value stored in a claim; longer values are cut so the claim key stays bounded */
const MAX_KEY_VALUE_LENGTH = 200;

/** Executions that still occupy the workflow for a contact */
const ACTIVE_STATUSES = [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING];

/**
 * Workflow Entry Service
 * Decides whether a contact enters a workflow, and creates the execution when they do. Both
 * the event trigger and the manual start come through here, so the entry rules are the same
 * however a run begins:
 *
 * - Once per contact (`allowReentry: false`): never again after any earlier run.
 * - Every time (`allowReentry: true`): again whenever no run is RUNNING.
 * - Throttled (`allowReentry: true` plus a window and/or key): at most once per window, counted
 *   separately per key value, and never while an earlier run is still going. Decided by a
 *   claim in `throttle_claims`, so concurrent events start one run, and a throttled event
 *   writes nothing.
 */
export class WorkflowEntryService {
  public static isThrottled(workflow: Pick<Workflow, 'throttleWindowSeconds' | 'throttleKey'>): boolean {
    return workflow.throttleWindowSeconds !== null || workflow.throttleKey !== null;
  }

  public static async enter(
    workflow: EntryWorkflow,
    contactId: string,
    triggerStepId: string,
    context: Prisma.JsonValue | Record<string, unknown> | undefined,
  ): Promise<EntryResult> {
    let claimId: string | null = null;

    if (!workflow.allowReentry) {
      const existing = await prisma.workflowExecution.findFirst({
        where: {workflowId: workflow.id, contactId},
        select: {id: true},
      });

      if (existing) {
        return {entered: false, refusal: {reason: 'already-entered'}};
      }
    } else if (this.isThrottled(workflow)) {
      const keyValue = await this.resolveKey(workflow.throttleKey, contactId, context);
      const identity = ThrottleService.workflowIdentity(workflow.projectId, workflow.id, keyValue, contactId);

      // Read-only first: a hot event that is held writes nothing
      const held = await ThrottleService.heldUntil(identity);
      if (held.held) {
        return {entered: false, refusal: {reason: 'throttled', nextAllowedAt: held.until}};
      }

      if (await this.hasActiveRun(workflow.id, contactId, ACTIVE_STATUSES)) {
        return {entered: false, refusal: {reason: 'in-progress'}};
      }

      const claim = await ThrottleService.claim(identity, workflow.throttleWindowSeconds, new Date());
      if (!claim.claimed) {
        return {entered: false, refusal: {reason: 'throttled', nextAllowedAt: claim.nextAllowedAt}};
      }

      claimId = claim.claimId;
    } else if (await this.hasActiveRun(workflow.id, contactId, [WorkflowExecutionStatus.RUNNING])) {
      return {entered: false, refusal: {reason: 'in-progress'}};
    }

    try {
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStepId,
          context: context == null ? Prisma.JsonNull : toPrismaJson(context),
        },
      });

      return {entered: true, execution};
    } catch (error) {
      if (claimId) {
        await ThrottleService.release(claimId);
      }
      throw error;
    }
  }

  /** A human-readable reason, for the manual start's 409 */
  public static describe(refusal: WorkflowEntryRefusal): string {
    switch (refusal.reason) {
      case 'already-entered':
        return 'Workflow does not allow re-entry and the contact has already entered it';
      case 'in-progress':
        return 'Workflow is already running for this contact';
      case 'throttled':
        return refusal.nextAllowedAt
          ? `Workflow is throttled for this contact until ${refusal.nextAllowedAt.toISOString()}`
          : 'Workflow is throttled for this contact and will not run again for the same key';
    }
  }

  private static async hasActiveRun(
    workflowId: string,
    contactId: string,
    statuses: WorkflowExecutionStatus[],
  ): Promise<boolean> {
    const run = await prisma.workflowExecution.findFirst({
      where: {workflowId, contactId, status: {in: statuses}},
      select: {id: true},
    });

    return run !== null;
  }

  /**
   * The value the throttle is counted for, read like a condition step's field. Missing or
   * empty counts per contact (an empty key value).
   */
  private static async resolveKey(
    field: string | null,
    contactId: string,
    context: Prisma.JsonValue | Record<string, unknown> | undefined,
  ): Promise<string> {
    if (!field) {
      return '';
    }

    const event = context && typeof context === 'object' && !Array.isArray(context) ? (context as Record<string, unknown>) : {};
    let data: Record<string, unknown> = {};
    let contact: Record<string, unknown> = {};

    // Contact fields cost a read, so only when the key needs one
    if (!field.startsWith('event.')) {
      const row = await prisma.contact.findUnique({
        where: {id: contactId},
        select: {email: true, subscribed: true, data: true},
      });

      if (row) {
        contact = {email: row.email, subscribed: row.subscribed};
        data = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {};
      }
    }

    const resolved = WorkflowExecutionService.resolveField(field, {contact, data, event, workflow: event});
    // A non-persistent /v1/track field arrives as {value, persistent: false}; count by its value
    const value =
      resolved && typeof resolved === 'object' && 'value' in resolved && 'persistent' in resolved
        ? (resolved as {value: unknown}).value
        : resolved;

    if (value === undefined || value === null || value === '') {
      return '';
    }

    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return text.slice(0, MAX_KEY_VALUE_LENGTH);
  }
}

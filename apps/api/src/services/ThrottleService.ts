import type {ThrottleOptions} from '@plunk/types';

import {prisma} from '../database/prisma.js';

/** Which notification is held, and for whom */
export interface ThrottleIdentity {
  projectId: string;
  /** Template id (or "-" for inline sends) plus the caller's key */
  key: string;
  /** Contact id, or "*" when held for the whole project */
  recipientKey: string;
  contactId: string | null;
  /** Set for a workflow's entry throttle; deleting the workflow cascades to its claims */
  workflowId?: string;
}

export type ClaimResult = {claimed: true; claimId: string} | {claimed: false; nextAllowedAt: Date | null};

const PROJECT_WIDE = '*';
const WORKFLOW_PREFIX = 'wf:';

/**
 * Throttle Service
 * `delivery.throttle` on POST /v1/send: send a notification to a recipient at most once per
 * window. Each held notification is a row in `throttle_claims`. A workflow's entry throttle
 * uses the same claims (see WorkflowEntryService).
 *
 * The claim is decided by the database, never by a read followed by a write: a send inserts
 * the row, and when one exists it may only take it over if the window has run out. Postgres
 * re-checks that condition after waiting on the row lock, so two concurrent sends can never
 * both win.
 *
 * A claim is held from the moment the send is accepted (so five scheduled reminders make one
 * email), moved to the real send time once SES has the message (so the window is measured
 * from what the recipient saw), and released when the email never gets there.
 */
export class ThrottleService {
  public static identity(
    projectId: string,
    templateId: string | undefined,
    options: ThrottleOptions,
    contactId: string,
  ): ThrottleIdentity {
    const projectWide = options.scope === 'project';

    return {
      projectId,
      key: `${templateId ?? '-'}:${options.key ?? ''}`,
      recipientKey: projectWide ? PROJECT_WIDE : contactId,
      contactId: projectWide ? null : contactId,
    };
  }

  /**
   * A workflow's entry throttle: held per contact, counted separately for each value of the
   * workflow's key field. The "wf:" prefix keeps these apart from send claims, whose keys
   * start with a template id.
   */
  public static workflowIdentity(
    projectId: string,
    workflowId: string,
    keyValue: string,
    contactId: string,
  ): ThrottleIdentity {
    return {
      projectId,
      key: `${WORKFLOW_PREFIX}${workflowId}:${keyValue}`,
      recipientKey: contactId,
      contactId,
      workflowId,
    };
  }

  /**
   * Read-only check, for the send path to skip a throttled recipient without writing
   * anything. Not a guarantee: `claim` is what decides.
   */
  public static async heldUntil(identity: ThrottleIdentity): Promise<{held: false} | {held: true; until: Date | null}> {
    const claim = await prisma.throttleClaim.findUnique({
      where: {projectId_key_recipientKey: this.uniqueKey(identity)},
      select: {expiresAt: true},
    });

    if (!claim) {
      return {held: false};
    }

    if (claim.expiresAt === null || claim.expiresAt > new Date()) {
      return {held: true, until: claim.expiresAt};
    }

    return {held: false};
  }

  /**
   * Claim the notification for a send starting at `startsAt` (now, or the scheduled time).
   * Returns whether this send may go out.
   */
  public static async claim(
    identity: ThrottleIdentity,
    windowSeconds: number | null,
    startsAt: Date,
  ): Promise<ClaimResult> {
    const expiresAt = this.expiry(startsAt, windowSeconds);

    try {
      const created = await prisma.throttleClaim.create({
        data: {...identity, windowSeconds, expiresAt},
        select: {id: true},
      });

      return {claimed: true, claimId: created.id};
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'P2002')) {
        throw error;
      }
    }

    // Held already. Take it over only if its window has run out; a claim held forever has
    // no expiresAt and never matches.
    const now = new Date();
    const takenOver = await prisma.throttleClaim.updateMany({
      where: {...this.uniqueKey(identity), expiresAt: {lte: now}},
      data: {contactId: identity.contactId, emailId: null, windowSeconds, expiresAt},
    });

    const current = await prisma.throttleClaim.findUnique({
      where: {projectId_key_recipientKey: this.uniqueKey(identity)},
      select: {id: true, expiresAt: true},
    });

    if (takenOver.count === 1 && current) {
      return {claimed: true, claimId: current.id};
    }

    return {claimed: false, nextAllowedAt: current?.expiresAt ?? null};
  }

  /** Record which email holds the claim, so sending, rescheduling and cancelling can find it */
  public static async attachEmail(claimId: string, emailId: string): Promise<void> {
    await prisma.throttleClaim.update({where: {id: claimId}, data: {emailId}});
  }

  /**
   * Measure the window from when the email actually went out. Called on every send, so it
   * is one indexed read for the many emails that hold no claim.
   */
  public static async anchorToSend(emailId: string, sentAt: Date): Promise<void> {
    await this.moveWindowStart(emailId, sentAt);
  }

  /** A scheduled email moved to `scheduledFor`: its claim moves with it */
  public static async shift(emailId: string, scheduledFor: Date): Promise<void> {
    await this.moveWindowStart(emailId, scheduledFor);
  }

  /** Release the claim held by an email that will never be sent */
  public static async releaseForEmail(emailId: string): Promise<void> {
    await prisma.throttleClaim.deleteMany({where: {emailId}});
  }

  /** Release a claim taken for a send that failed before its email existed */
  public static async release(claimId: string): Promise<void> {
    await prisma.throttleClaim.deleteMany({where: {id: claimId}});
  }

  /** Release every claim held by a project's emails in `emailIds` */
  public static async releaseForEmails(emailIds: string[]): Promise<void> {
    if (emailIds.length > 0) {
      await prisma.throttleClaim.deleteMany({where: {emailId: {in: emailIds}}});
    }
  }

  private static async moveWindowStart(emailId: string, start: Date): Promise<void> {
    const claim = await prisma.throttleClaim.findFirst({
      where: {emailId},
      select: {id: true, windowSeconds: true},
    });

    // No claim, or one held forever: nothing to move
    if (!claim || claim.windowSeconds === null) {
      return;
    }

    await prisma.throttleClaim.update({
      where: {id: claim.id},
      data: {expiresAt: this.expiry(start, claim.windowSeconds)},
    });
  }

  private static expiry(start: Date, windowSeconds: number | null): Date | null {
    return windowSeconds === null ? null : new Date(start.getTime() + windowSeconds * 1000);
  }

  private static uniqueKey(identity: ThrottleIdentity) {
    return {projectId: identity.projectId, key: identity.key, recipientKey: identity.recipientKey};
  }
}

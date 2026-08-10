/**
 * Background Job: Card Verification Sweep
 *
 * Card verification is only a control if it always reaches a verdict. Several things can
 * strand a project short of one: the worker being down when the job is enqueued, Redis losing
 * it, the job exhausting its retries during a Stripe outage, or a verdict that needed a human
 * and never got one. In every case the project stays enabled and sending, which is precisely
 * the state the verification exists to prevent — and nothing else in the system notices,
 * because the status column is otherwise only ever written.
 *
 * This sweep is what makes the mechanism fail loudly instead of silently. It retries what can
 * be retried and escalates the rest.
 *
 * It deliberately does NOT disable stale projects on its own. Everything it sees is equally
 * consistent with a Stripe or Redis outage, so auto-disabling would take out paying customers
 * during exactly the incidents that produce the backlog. Recovery is automatic; judgment is
 * escalated.
 */

import type {CardVerificationSweepJobData} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {STRIPE_ENABLED} from '../app/constants.js';
import {stripe} from '../app/stripe.js';
import {prisma} from '../database/prisma.js';
import {NtfyService} from '../services/NtfyService.js';
import {cardVerificationSweepQueue, QueueService} from '../services/QueueService.js';

/**
 * How long a project may sit without a verdict before the sweep intervenes. Comfortably past
 * the verification job's own retry budget (4 attempts over ~70s), so a job still working
 * through its backoff is never double-enqueued.
 */
const STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * Retries spent before a project is escalated instead. Bounded because some causes never
 * resolve on their own — a customer with no default payment method would otherwise be retried
 * forever, and resetting the clock each time means it would never age into escalation either.
 */
const MAX_RETRIES = 5;

/** Bounded so one sweep cannot fan out into hundreds of Stripe calls. */
const BATCH_SIZE = 100;

async function processSweep(_job: Job<CardVerificationSweepJobData>): Promise<{retried: number; escalated: number}> {
  if (!STRIPE_ENABLED || !stripe) {
    return {retried: 0, escalated: 0};
  }

  const now = Date.now();

  const stale = await prisma.project.findMany({
    where: {
      // PENDING covers the stalled and skipped paths; REQUIRES_ACTION covers a verdict that
      // asked for a human and never got one. NULL is excluded on purpose — that is how every
      // project predating this feature looks, and they must not be swept.
      cardVerification: {in: ['PENDING', 'REQUIRES_ACTION']},
      cardVerificationAt: {lt: new Date(now - STALE_AFTER_MS)},
      // Past the retry budget means escalation already fired. The project stays visible in
      // this state for a support query, but must not alert on every sweep forever.
      cardVerificationAttempts: {lte: MAX_RETRIES},
    },
    select: {
      id: true,
      name: true,
      customer: true,
      cardVerification: true,
      cardVerificationAt: true,
      cardVerificationSession: true,
      cardVerificationAttempts: true,
    },
    orderBy: {cardVerificationAt: 'asc'},
    take: BATCH_SIZE,
  });

  if (stale.length === 0) {
    return {retried: 0, escalated: 0};
  }

  signale.warn(`[CARD-VERIFICATION-SWEEP] ${stale.length} project(s) without a verification verdict`);

  let retried = 0;
  let escalated = 0;

  for (const project of stale) {
    const stalledForMs = now - (project.cardVerificationAt?.getTime() ?? now);

    // REQUIRES_ACTION already carries an issuer verdict — an SCA challenge, a soft decline, or
    // a payment method we cannot test. Re-charging resolves none of those, so it only escalates.
    const retryable =
      project.cardVerification === 'PENDING' &&
      project.customer &&
      project.cardVerificationSession &&
      project.cardVerificationAttempts < MAX_RETRIES;

    if (retryable) {
      const requeued = await requeueVerification(
        project.id,
        project.customer as string,
        project.cardVerificationSession as string,
        project.cardVerificationAttempts,
      );

      if (requeued) {
        retried += 1;
        continue;
      }
    }

    await NtfyService.notifyCardVerificationStalled(
      project.name,
      project.id,
      project.cardVerification ?? 'UNKNOWN',
      Math.round(stalledForMs / 60000),
      project.cardVerificationAttempts >= MAX_RETRIES,
    );

    // Park it past the retry budget so this alert fires once rather than every sweep. The row
    // keeps the state, so `cardVerification = 'REQUIRES_ACTION'` remains the support query.
    await prisma.project.update({
      where: {id: project.id},
      data: {
        cardVerification: 'REQUIRES_ACTION',
        cardVerificationAttempts: MAX_RETRIES + 1,
        cardVerificationAt: new Date(),
      },
    });

    escalated += 1;
  }

  signale.info(`[CARD-VERIFICATION-SWEEP] Retried ${retried}, escalated ${escalated}`);

  return {retried, escalated};
}

/**
 * Re-enqueue verification from the original checkout session.
 *
 * The session is re-read rather than reconstructed so the retry carries the same currency and
 * promo code the customer actually saw. Critically, it also reuses the same session id, which
 * is what the Stripe idempotency key is derived from — a retry with a fresh key could charge a
 * second time in the very case this sweep exists for, where the charge succeeded but we failed
 * to record it.
 */
async function requeueVerification(
  projectId: string,
  customerId: string,
  sessionId: string,
  attemptsSoFar: number,
): Promise<boolean> {
  if (!stripe) {
    return false;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const promoField = session.custom_fields?.find(field => field.key === 'promo_code');
    const promoCode = promoField?.text?.value?.trim().toUpperCase();

    await QueueService.queueCardVerification(
      {
        projectId,
        customerId,
        currency: session.currency ?? 'eur',
        sessionId,
        ...(promoCode && {promoCode}),
      },
      // The original job id is still in Redis for completed/failed jobs, which would make a
      // plain re-add a silent no-op. Keyed by attempt rather than by clock time so two sweeps
      // racing cannot enqueue the same retry twice. Stripe-side idempotency remains the
      // guarantee against a double charge.
      `card-verification-sweep-${sessionId}-${attemptsSoFar}`,
    );

    // Spend the attempt and reset the clock, giving this try room to finish before the next
    // sweep considers the project stale again.
    await prisma.project.update({
      where: {id: projectId},
      data: {cardVerificationAttempts: attemptsSoFar + 1, cardVerificationAt: new Date()},
    });

    signale.info(`[CARD-VERIFICATION-SWEEP] Re-queued verification for project ${projectId}`);
    return true;
  } catch (error) {
    signale.error(`[CARD-VERIFICATION-SWEEP] Failed to re-queue verification for project ${projectId}:`, error);
    return false;
  }
}

export function createCardVerificationSweepWorker(): Worker<CardVerificationSweepJobData> {
  const worker = new Worker<CardVerificationSweepJobData>(cardVerificationSweepQueue.name, processSweep, {
    connection: cardVerificationSweepQueue.opts.connection,
    concurrency: 1, // One sweep at a time, so two runs cannot re-queue the same project
  });

  worker.on('completed', job => {
    signale.success(`[CARD-VERIFICATION-SWEEP] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on('failed', (job, error) => {
    signale.error(`[CARD-VERIFICATION-SWEEP] Job ${job?.id} failed:`, error);
  });

  worker.on('error', error => {
    signale.error('[CARD-VERIFICATION-SWEEP] Worker error:', error);
  });

  return worker;
}

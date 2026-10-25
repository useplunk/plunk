/**
 * Background Job: Scheduled Email Sweep
 *
 * A scheduled transactional email (`delivery.at`) is a SCHEDULED row plus a delayed job in
 * the email queue, and the job is only the timer: the row is the truth. If the job is lost --
 * Redis restarted without its data, or the enqueue after the insert failed -- nothing would
 * ever send the email. This sweep finds rows still SCHEDULED past their time and queues them
 * again, so a lost job costs minutes instead of a silently unsent email.
 *
 * Runs every five minutes. A run with nothing overdue is one query on the partial index
 * `emails_scheduledFor_scheduled_idx`, which only ever holds emails still waiting.
 */

import type {ScheduledEmailSweepJobData} from '@plunk/types';
import {EmailStatus} from '@plunk/db';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {QueueService, scheduledEmailSweepQueue} from '../services/QueueService.js';

/** How late a scheduled email must be before the sweep steps in; its own job normally fires on time */
const GRACE_MS = 2 * 60 * 1000;
const BATCH_SIZE = 1000;
/** Bounds one run; anything beyond it is picked up five minutes later */
const MAX_PER_RUN = 20000;

/**
 * Queue every scheduled email that is overdue. Re-queueing is safe even when the original
 * job still exists: the email processor only sends an email that is still scheduled and due,
 * and the first job to promote it wins.
 */
export async function requeueOverdueScheduledEmails({
  graceMs = GRACE_MS,
  batchSize = BATCH_SIZE,
  maxPerRun = MAX_PER_RUN,
}: {graceMs?: number; batchSize?: number; maxPerRun?: number} = {}): Promise<number> {
  const cutoff = new Date(Date.now() - graceMs);
  let requeued = 0;
  let cursor: string | undefined;

  while (requeued < maxPerRun) {
    // Requeued rows stay SCHEDULED until the email worker gets to them, so page with a cursor
    // instead of re-reading the head of the due set
    const due = await prisma.email.findMany({
      where: {status: EmailStatus.SCHEDULED, scheduledFor: {lt: cutoff}},
      orderBy: [{scheduledFor: 'asc'}, {id: 'asc'}],
      take: batchSize,
      ...(cursor ? {cursor: {id: cursor}, skip: 1} : {}),
      select: {id: true},
    });

    for (const email of due) {
      await QueueService.requeueScheduledEmail(email.id);
    }

    requeued += due.length;

    if (due.length < batchSize) {
      break;
    }

    cursor = due[due.length - 1]?.id;
  }

  return requeued;
}

async function processSweep(_job: Job<ScheduledEmailSweepJobData>): Promise<{requeued: number}> {
  const requeued = await requeueOverdueScheduledEmails();

  if (requeued > 0) {
    signale.warn(`[SCHEDULED-EMAIL-SWEEP] Re-queued ${requeued} overdue scheduled email(s) whose job was missing`);
  }

  return {requeued};
}

export function createScheduledEmailSweepWorker(): Worker<ScheduledEmailSweepJobData> {
  const worker = new Worker<ScheduledEmailSweepJobData>(scheduledEmailSweepQueue.name, processSweep, {
    connection: scheduledEmailSweepQueue.opts.connection,
    // One sweep at a time; two would only queue the same emails twice
    concurrency: 1,
  });

  worker.on('failed', (job, error) => {
    signale.error(`[SCHEDULED-EMAIL-SWEEP] Job ${job?.id} failed:`, error);
  });

  worker.on('error', error => {
    signale.error('[SCHEDULED-EMAIL-SWEEP] Worker error:', error);
  });

  return worker;
}

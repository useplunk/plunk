import type {CampaignCancelCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import {Worker} from 'bullmq';
import type {RedisOptions} from 'ioredis';
import signale from 'signale';

import {REDIS_URL} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {CampaignService} from '../services/CampaignService.js';

/**
 * Campaign Cancel Cleanup Worker
 *
 * Discards the emails a cancelled campaign never sent, then returns it to DRAFT.
 *
 * `processBatch` creates an `Email` row per recipient well ahead of the send -- rows
 * are inserted as fast as the database allows while dispatch is throttled to the SES
 * quota -- so a campaign stopped mid-flight can be holding close to a row per
 * recipient, up to a million of them. That is why this is a job and not part of the
 * cancel request: the deletion is unbounded, and the request is not the place for it.
 *
 * The campaign stays CANCELLED for the duration and is promoted only at the end. It
 * is not merely a label: `send` refuses a CANCELLED campaign, which is what stops a
 * user from starting a fresh send whose new rows would be interleaved with the ones
 * still being deleted -- and counted by `processBatch`'s own `totalRecipients`
 * reconciliation, which counts every row the campaign owns.
 */

const BATCH_SIZE = 1000; // Delete in batches to avoid long transactions and lock pileups
const BATCH_PAUSE_MS = 50;

/**
 * Delete a cancelled campaign's unsent emails, a bounded batch at a time.
 *
 * Exported for tests: this is the one piece of raw SQL in the cancel path, and the
 * predicates it encodes -- never a stamped row, never a row from a later send -- are
 * the difference between clearing a queue and destroying delivery history.
 *
 * `onBatch` is called after each full batch so the worker can report progress without
 * this function knowing about jobs.
 */
export async function deleteUnsentCampaignEmails(
  campaignId: string,
  cutoff: Date,
  onBatch?: (deletedSoFar: number) => Promise<void>,
): Promise<number> {
  let totalDeleted = 0;

  for (;;) {
    // deleteMany has no LIMIT, so each statement is bounded by a subselect. Scoped to
    // `sentAt IS NULL` so a row can never be removed once it has been stamped, and to
    // rows that predate the cancellation so a later send's emails are never touched.
    // Served by the campaignId index; deleting cascades each row's events, of which an
    // email that never sent has none.
    const deleted = await prisma.$executeRaw`
      DELETE FROM "emails"
      WHERE "id" IN (
        SELECT "id" FROM "emails"
        WHERE "campaignId" = ${campaignId}
          AND "sentAt" IS NULL
          AND "createdAt" <= ${cutoff}
        LIMIT ${BATCH_SIZE}
      )
    `;

    totalDeleted += deleted;

    if (deleted < BATCH_SIZE) {
      return totalDeleted;
    }

    await onBatch?.(totalDeleted);
    // Breathe between batches so a large cleanup does not crowd out live sending.
    await new Promise(resolve => setTimeout(resolve, BATCH_PAUSE_MS));
  }
}

async function processCleanup(job: Job<CampaignCancelCleanupJobData>): Promise<{deleted: number; status: string}> {
  const {campaignId, projectId, cancelledAt} = job.data;

  signale.info(`[CAMPAIGN-CANCEL-CLEANUP] Clearing unsent emails for campaign ${campaignId}...`);

  const totalDeleted = await deleteUnsentCampaignEmails(campaignId, new Date(cancelledAt), async deletedSoFar => {
    await job.updateProgress(deletedSoFar);
    signale.info(`[CAMPAIGN-CANCEL-CLEANUP] Deleted ${deletedSoFar} unsent emails so far, continuing...`);
  });

  // The decision is re-taken here rather than trusted from the request. A worker that
  // was already inside its SES call when the campaign was cancelled can have stamped
  // an email in the meantime, and that email must keep the campaign terminal.
  const status = await CampaignService.completeCancelRevert(projectId, campaignId);

  signale.success(
    `[CAMPAIGN-CANCEL-CLEANUP] Campaign ${campaignId}: deleted ${totalDeleted} unsent emails, now ${status}`,
  );

  return {deleted: totalDeleted, status};
}

export function createCampaignCancelCleanupWorker(): Worker<CampaignCancelCleanupJobData> {
  const redisConnection: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...parseRedisUrl(REDIS_URL),
  };

  const worker = new Worker<CampaignCancelCleanupJobData>('campaign-cancel-cleanup', processCleanup, {
    connection: redisConnection,
    // One campaign at a time: this competes for the same table as live sending, and
    // the cleanups have no reason to run in parallel.
    concurrency: 1,
  });

  worker.on('completed', job => {
    signale.success(`[CAMPAIGN-CANCEL-CLEANUP] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[CAMPAIGN-CANCEL-CLEANUP] Job ${job?.id} failed:`, err);
  });

  worker.on('error', err => {
    signale.error('[CAMPAIGN-CANCEL-CLEANUP] Worker error:', err);
  });

  return worker;
}

function parseRedisUrl(url: string): {host: string; port: number; password?: string; db?: number} {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port || '6379', 10),
    password: urlObj.password || undefined,
    db: parseInt(urlObj.pathname.slice(1) || '0', 10),
  };
}

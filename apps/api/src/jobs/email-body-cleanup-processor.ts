import type {EmailBodyCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import {Worker} from 'bullmq';
import type {RedisOptions} from 'ioredis';
import signale from 'signale';

import {REDIS_URL} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {parseRedisUrl} from '../utils/redis.js';

/**
 * Email Body Cleanup Worker
 * Blanks the rendered HTML body and drops the attachments (base64 file contents, often
 * megabytes per row) of emails past the retention window. The row is kept so delivery
 * history, event counts and analytics stay intact; only the two largest columns are
 * dropped. Received email also keeps a copy of its body in the data of its
 * `email.received` event, which is cleared on the same schedule. Runs daily.
 *
 * The 90-day window is a published commitment (Data Processing Agreement, Annex I and II).
 */

const RETENTION_DAYS = 90;
const BATCH_SIZE = 1000; // Update in batches to avoid long-held row locks

/** Runs a bounded UPDATE until a batch comes back short, returning the total rows changed. */
async function clearInBatches(label: string, runBatch: () => Promise<number>): Promise<number> {
  let total = 0;
  for (;;) {
    const cleared = await runBatch();
    total += cleared;
    if (cleared < BATCH_SIZE) return total;

    signale.info(`[EMAIL-BODY-CLEANUP] Cleared ${total} ${label} so far, continuing...`);
    // Small delay between batches to reduce database load
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Process email body cleanup job
 */
async function processCleanup(job: Job<EmailBodyCleanupJobData>): Promise<{cleared: number; clearedInbound: number}> {
  signale.info('[EMAIL-BODY-CLEANUP] Starting cleanup of email bodies and attachments past retention...');

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  try {
    // updateMany has no LIMIT, so bound each statement with a subselect. The
    // `body <> '' OR attachments IS NOT NULL` predicate keeps already-cleared rows
    // out of every later batch and is served by the partial index
    // emails_createdAt_purgeable_idx (background-index-builder); keep the two identical
    // or the index goes unused.
    const cleared = await clearInBatches(
      'emails',
      () => prisma.$executeRaw`
        UPDATE "emails"
        SET "body" = '', "attachments" = NULL
        WHERE "id" IN (
          SELECT "id" FROM "emails"
          WHERE "createdAt" < ${cutoffDate}
            AND ("body" <> '' OR "attachments" IS NOT NULL)
            -- A scheduled email still has to be sent with its body. The scheduling horizon is
            -- far shorter than the retention window, so this only guards that invariant.
            AND "status" <> 'SCHEDULED'
          ORDER BY "createdAt"
          LIMIT ${BATCH_SIZE}
        )
      `,
    );

    // Same shape for the body copy in email.received events. The predicate is served by
    // the partial index events_createdAt_inbound_body_idx (background-index-builder);
    // keep the two identical or every run walks all old events.
    const clearedInbound = await clearInBatches(
      'received email events',
      () => prisma.$executeRaw`
        UPDATE "events"
        SET "data" = "data" - 'body'
        WHERE "id" IN (
          SELECT "id" FROM "events"
          WHERE "createdAt" < ${cutoffDate}
            AND "name" = 'email.received' AND ("data" -> 'body') IS NOT NULL
          ORDER BY "createdAt"
          LIMIT ${BATCH_SIZE}
        )
      `,
    );

    signale.success(
      `[EMAIL-BODY-CLEANUP] Cleanup complete. Cleared ${cleared} emails and ${clearedInbound} received email events older than ${RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`,
    );

    await job.updateProgress(100);

    return {cleared, clearedInbound};
  } catch (error) {
    signale.error('[EMAIL-BODY-CLEANUP] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Create the email body cleanup worker
 */
export function createEmailBodyCleanupWorker(): Worker<EmailBodyCleanupJobData> {
  const redisConnection: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...parseRedisUrl(REDIS_URL),
  };

  const worker = new Worker<EmailBodyCleanupJobData>('email-body-cleanup', processCleanup, {
    connection: redisConnection,
    concurrency: 1, // Only run one cleanup job at a time
  });

  worker.on('completed', job => {
    signale.success(`[EMAIL-BODY-CLEANUP] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[EMAIL-BODY-CLEANUP] Job ${job?.id} failed:`, err);
  });

  worker.on('error', err => {
    signale.error('[EMAIL-BODY-CLEANUP] Worker error:', err);
  });

  return worker;
}

import type {IdempotencyKeyCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import {Worker} from 'bullmq';
import type {RedisOptions} from 'ioredis';
import signale from 'signale';

import {REDIS_URL} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {parseRedisUrl} from '../utils/redis.js';

/**
 * Idempotency Key Cleanup Worker
 * Deletes claims past their expiresAt, which both bounds table growth and is what
 * makes an expired key reusable. Runs hourly, since the TTL is measured in hours.
 *
 * Also sweeps expired throttle claims (`delivery.throttle` on /v1/send). Those do not
 * depend on the sweep to become reusable -- a send takes over an expired claim in place --
 * so this only keeps the table from growing with every notification ever throttled.
 */

const BATCH_SIZE = 10000; // Delete in batches to avoid long-held locks

/**
 * Process idempotency key cleanup job
 */
async function processCleanup(
  job: Job<IdempotencyKeyCleanupJobData>,
): Promise<{deleted: number; throttleClaimsDeleted: number}> {
  signale.info('[IDEMPOTENCY-CLEANUP] Starting cleanup of expired idempotency keys...');

  let totalDeleted = 0;

  try {
    for (;;) {
      // deleteMany has no LIMIT, so bound each statement with a subselect
      const deleted = await prisma.$executeRaw`
        DELETE FROM "idempotency_keys"
        WHERE "id" IN (
          SELECT "id" FROM "idempotency_keys"
          WHERE "expiresAt" < NOW()
          LIMIT ${BATCH_SIZE}
        )
      `;

      totalDeleted += deleted;

      if (deleted < BATCH_SIZE) {
        break;
      }

      signale.info(`[IDEMPOTENCY-CLEANUP] Deleted ${totalDeleted} keys so far, continuing...`);
      // Small delay between batches to reduce database load
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    signale.success(`[IDEMPOTENCY-CLEANUP] Cleanup complete. Deleted ${totalDeleted} expired keys`);

    const throttleClaimsDeleted = await deleteExpiredThrottleClaims();

    signale.success(`[IDEMPOTENCY-CLEANUP] Deleted ${throttleClaimsDeleted} expired throttle claims`);

    await job.updateProgress(100);

    return {deleted: totalDeleted, throttleClaimsDeleted};
  } catch (error) {
    signale.error('[IDEMPOTENCY-CLEANUP] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Delete throttle claims whose window has passed. Claims held forever (expiresAt null) and
 * claims of emails still scheduled (expiresAt in the future) are never touched.
 */
export async function deleteExpiredThrottleClaims(): Promise<number> {
  let totalDeleted = 0;

  for (;;) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM "throttle_claims"
      WHERE "id" IN (
        SELECT "id" FROM "throttle_claims"
        WHERE "expiresAt" < NOW()
        LIMIT ${BATCH_SIZE}
      )
    `;

    totalDeleted += deleted;

    if (deleted < BATCH_SIZE) {
      return totalDeleted;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Create the idempotency key cleanup worker
 */
export function createIdempotencyKeyCleanupWorker(): Worker<IdempotencyKeyCleanupJobData> {
  const redisConnection: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...parseRedisUrl(REDIS_URL),
  };

  const worker = new Worker<IdempotencyKeyCleanupJobData>('idempotency-key-cleanup', processCleanup, {
    connection: redisConnection,
    concurrency: 1, // Only run one cleanup job at a time
  });

  worker.on('completed', job => {
    signale.success(`[IDEMPOTENCY-CLEANUP] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[IDEMPOTENCY-CLEANUP] Job ${job?.id} failed:`, err);
  });

  worker.on('error', err => {
    signale.error('[IDEMPOTENCY-CLEANUP] Worker error:', err);
  });

  return worker;
}

import type {IdempotencyKeyCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import {Worker} from 'bullmq';
import type {RedisOptions} from 'ioredis';
import signale from 'signale';

import {REDIS_URL} from '../app/constants.js';
import {prisma} from '../database/prisma.js';

/**
 * Durable-state maintenance worker.
 *
 * Deletes expired API/SNS claims and reconciles aged event-outbox rows. The
 * five-minute grace window keeps the minutely sweep away from normal
 * synchronous dispatch while bounding the usual recovery delay below six
 * minutes.
 */

const BATCH_SIZE = 10000; // Delete in batches to avoid long-held locks

/**
 * Process idempotency key cleanup job
 */
async function processCleanup(job: Job<IdempotencyKeyCleanupJobData>): Promise<{deleted: number}> {
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

    await job.updateProgress(100);

    return {deleted: totalDeleted};
  } catch (error) {
    signale.error('[IDEMPOTENCY-CLEANUP] Error during cleanup:', error);
    throw error;
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

function parseRedisUrl(url: string): {host: string; port: number; password?: string; db?: number} {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port || '6379', 10),
    password: urlObj.password || undefined,
    db: parseInt(urlObj.pathname.slice(1) || '0', 10),
  };
}

import type {IdempotencyKeyCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import {Worker} from 'bullmq';
import type {RedisOptions} from 'ioredis';
import signale from 'signale';

import {REDIS_URL} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {EventService} from '../services/EventService.js';

/**
 * Durable-state maintenance worker.
 *
 * Deletes expired API/SNS claims and reconciles aged event-outbox rows. The
 * grace window keeps the hourly sweep away from normal synchronous dispatch.
 */

const BATCH_SIZE = 10000; // Delete in batches to avoid long-held locks
const EVENT_DISPATCH_BATCH_SIZE = 100;
const EVENT_DISPATCH_GRACE_MS = 5 * 60 * 1000;

/**
 * Process idempotency key cleanup job
 */
export async function processCleanup(job: Job<IdempotencyKeyCleanupJobData>): Promise<{deleted: number}> {
  signale.info('[IDEMPOTENCY-CLEANUP] Starting durable-state maintenance...');

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

    for (;;) {
      const deleted = await prisma.$executeRaw`
        DELETE FROM "sns_webhook_receipts"
        WHERE "id" IN (
          SELECT "id" FROM "sns_webhook_receipts"
          WHERE "expiresAt" < NOW()
          LIMIT ${BATCH_SIZE}
        )
      `;

      totalDeleted += deleted;

      if (deleted < BATCH_SIZE) {
        break;
      }

      signale.info(`[IDEMPOTENCY-CLEANUP] Deleted ${totalDeleted} claims so far, continuing...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const pendingEvents = await prisma.event.findMany({
      where: {
        processedAt: null,
        createdAt: {lt: new Date(Date.now() - EVENT_DISPATCH_GRACE_MS)},
      },
      select: {id: true},
      orderBy: {createdAt: 'asc'},
      take: EVENT_DISPATCH_BATCH_SIZE,
    });
    let dispatchedEvents = 0;

    for (const event of pendingEvents) {
      try {
        await EventService.dispatchStoredEvent(event.id);
        dispatchedEvents += 1;
      } catch (error) {
        // Keep processedAt null. A later sweep can retry without replaying the
        // external request that originally committed this event.
        signale.error(`[EVENT-OUTBOX] Failed to dispatch event ${event.id}:`, error);
      }
    }

    signale.success(`[IDEMPOTENCY-CLEANUP] Cleanup complete. Deleted ${totalDeleted} expired records`);
    if (pendingEvents.length > 0) {
      signale.info(
        `[EVENT-OUTBOX] Dispatched ${dispatchedEvents}/${pendingEvents.length} pending events; failures retry next sweep`,
      );
    }

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

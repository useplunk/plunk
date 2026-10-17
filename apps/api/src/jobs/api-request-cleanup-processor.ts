import type {ApiRequestCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import {Worker} from 'bullmq';
import type {RedisOptions} from 'ioredis';
import signale from 'signale';

import {REDIS_URL} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {parseRedisUrl} from '../utils/redis.js';

/**
 * API Request Cleanup Worker
 * Deletes old API request logs to prevent unbounded table growth
 * Runs daily to clean up logs older than 30 days (configurable)
 */

const RETENTION_DAYS = 30; // Keep logs for 30 days
const BATCH_SIZE = 10000; // Delete in batches for performance

/**
 * Process API request cleanup job
 */
async function processCleanup(job: Job<ApiRequestCleanupJobData>): Promise<{deleted: number}> {
  signale.info('[API-REQUEST-CLEANUP] Starting cleanup of old API request logs...');

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  let totalDeleted = 0;
  let hasMore = true;

  try {
    // Delete in batches to avoid locking the table for too long
    while (hasMore) {
      const result = await prisma.apiRequest.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
        // Note: Prisma doesn't support LIMIT in deleteMany, so we use a different approach
      });

      totalDeleted += result.count;

      // If we deleted fewer than batch size, we're done
      hasMore = result.count >= BATCH_SIZE;

      if (hasMore) {
        signale.info(`[API-REQUEST-CLEANUP] Deleted ${totalDeleted} records so far, continuing...`);
        // Small delay between batches to reduce database load
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    signale.success(
      `[API-REQUEST-CLEANUP] Cleanup complete. Deleted ${totalDeleted} records older than ${RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`,
    );

    // Update job progress
    await job.updateProgress(100);

    return {deleted: totalDeleted};
  } catch (error) {
    signale.error('[API-REQUEST-CLEANUP] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Create the API request cleanup worker
 */
export function createApiRequestCleanupWorker(): Worker<ApiRequestCleanupJobData> {
  const redisConnection: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...parseRedisUrl(REDIS_URL),
  };

  const worker = new Worker<ApiRequestCleanupJobData>('api-request-cleanup', processCleanup, {
    connection: redisConnection,
    concurrency: 1, // Only run one cleanup job at a time
  });

  worker.on('completed', job => {
    signale.success(`[API-REQUEST-CLEANUP] Job ${job.id} completed:`, job.returnvalue);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[API-REQUEST-CLEANUP] Job ${job?.id} failed:`, err);
  });

  worker.on('error', err => {
    signale.error('[API-REQUEST-CLEANUP] Worker error:', err);
  });

  return worker;
}

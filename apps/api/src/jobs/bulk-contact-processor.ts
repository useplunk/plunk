/**
 * Background Job: Bulk Contact Action Processor
 * Processes bulk subscribe, unsubscribe, and delete operations
 */

import {Prisma} from '@plunk/db';
import type {BulkContactActionJobData, BulkContactActionSelector} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {ContactService} from '../services/ContactService.js';
import {bulkContactQueue} from '../services/QueueService.js';

const BATCH_SIZE = 100;

interface BulkActionResult {
  operation: 'subscribe' | 'unsubscribe' | 'delete';
  totalRequested: number;
  /** Contacts whose state was actually changed by this run. */
  successCount: number;
  /** Subscribe/unsubscribe only: contacts already in the target state. */
  unchangedCount: number;
  /** Contacts that errored or weren't found (e.g. wrong project). */
  failureCount: number;
  errors: {contactId: string; email: string; error: string}[];
}

function buildQueryWhere(projectId: string, selector: Extract<BulkContactActionSelector, {mode: 'query'}>): Prisma.ContactWhereInput {
  const search = selector.filter?.search;
  const subscribed = selector.filter?.subscribed;
  const excludeIds = selector.excludeIds ?? [];
  return {
    projectId,
    ...(search ? {email: {contains: search, mode: 'insensitive' as const}} : {}),
    ...(subscribed !== undefined ? {subscribed} : {}),
    ...(excludeIds.length > 0 ? {id: {notIn: excludeIds}} : {}),
  };
}

async function applyBatch(
  projectId: string,
  operation: BulkActionResult['operation'],
  ids: string[],
): Promise<{changed: number; unchanged: number}> {
  switch (operation) {
    case 'subscribe': {
      const r = await ContactService.bulkSubscribe(projectId, ids);
      return {changed: r.updated, unchanged: r.unchanged};
    }
    case 'unsubscribe': {
      const r = await ContactService.bulkUnsubscribe(projectId, ids);
      return {changed: r.updated, unchanged: r.unchanged};
    }
    case 'delete': {
      const r = await ContactService.bulkDelete(projectId, ids);
      return {changed: r.deleted, unchanged: 0};
    }
  }
}

export function createBulkContactWorker() {
  const worker = new Worker<BulkContactActionJobData>(
    bulkContactQueue.name,
    async (job: Job<BulkContactActionJobData>) => {
      const {projectId, operation, selector} = job.data;

      const result: BulkActionResult = {
        operation,
        totalRequested: 0,
        successCount: 0,
        unchangedCount: 0,
        failureCount: 0,
        errors: [],
      };

      if (selector.mode === 'ids') {
        const {contactIds} = selector;
        result.totalRequested = contactIds.length;

        signale.info(
          `[BULK-CONTACT-PROCESSOR] Processing ${operation} for ${contactIds.length} contacts (ids mode) in project ${projectId}`,
        );

        for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
          const batchIds = contactIds.slice(i, i + BATCH_SIZE);
          try {
            const {changed, unchanged} = await applyBatch(projectId, operation, batchIds);
            result.successCount += changed;
            result.unchangedCount += unchanged;
            const failed = batchIds.length - changed - unchanged;
            if (failed > 0) result.failureCount += failed;
          } catch (error) {
            signale.error('[BULK-CONTACT-PROCESSOR] Batch failed:', error);
            result.failureCount += batchIds.length;
            result.errors.push({
              contactId: 'batch',
              email: '',
              error: error instanceof Error ? error.message : 'Batch processing failed',
            });
          }
          await job.updateProgress(Math.round(((i + batchIds.length) / contactIds.length) * 100));
        }
      } else {
        const where = buildQueryWhere(projectId, selector);
        const total = await prisma.contact.count({where});
        result.totalRequested = total;

        signale.info(
          `[BULK-CONTACT-PROCESSOR] Processing ${operation} for ${total} contacts (query mode) in project ${projectId}`,
        );

        if (total === 0) {
          await job.updateProgress(100);
          return result;
        }

        // Cursor-based iteration over matching contacts. We re-evaluate the where clause
        // each batch (with id < cursor) instead of Prisma's `cursor:` because for `delete`
        // the rows we just processed disappear — a stable cursor would either skip survivors
        // or revisit deletions. Sorting by id desc + `id < lastId` is idempotent under either.
        let lastId: string | undefined;
        let processedRows = 0;

        // Cap the loop so a runaway query (e.g. growing table) can't spin forever.
        const maxIterations = Math.ceil(total / BATCH_SIZE) + 50;
        for (let iter = 0; iter < maxIterations; iter += 1) {
          const batch = await prisma.contact.findMany({
            where: {
              ...where,
              ...(lastId ? {id: {...(where.id as object | undefined), lt: lastId}} : {}),
            },
            select: {id: true},
            orderBy: {id: 'desc'},
            take: BATCH_SIZE,
          });

          if (batch.length === 0) break;

          const batchIds = batch.map(c => c.id);
          lastId = batchIds[batchIds.length - 1];

          try {
            const {changed, unchanged} = await applyBatch(projectId, operation, batchIds);
            result.successCount += changed;
            result.unchangedCount += unchanged;
            const failed = batchIds.length - changed - unchanged;
            if (failed > 0) result.failureCount += failed;
          } catch (error) {
            signale.error('[BULK-CONTACT-PROCESSOR] Batch failed:', error);
            result.failureCount += batchIds.length;
            result.errors.push({
              contactId: 'batch',
              email: '',
              error: error instanceof Error ? error.message : 'Batch processing failed',
            });
          }

          processedRows += batchIds.length;
          await job.updateProgress(Math.min(100, Math.round((processedRows / total) * 100)));

          if (batch.length < BATCH_SIZE) break;
        }
      }

      signale.info(
        `[BULK-CONTACT-PROCESSOR] ${operation} completed: ${result.successCount} succeeded, ${result.failureCount} failed`,
      );
      return result;
    },
    {
      connection: bulkContactQueue.opts.connection,
      concurrency: 3,
    },
  );

  worker.on('completed', job => {
    signale.info(`[BULK-CONTACT-PROCESSOR] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[BULK-CONTACT-PROCESSOR] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', err => {
    signale.error('[BULK-CONTACT-PROCESSOR] Worker error:', err);
  });

  return worker;
}

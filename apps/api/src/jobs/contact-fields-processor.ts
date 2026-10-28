/**
 * Contact Fields Worker
 * Measures the coverage and type of a project's custom contact fields. Jobs are queued by
 * ContactFieldService when a read finds the measurements missing or stale, or when a write
 * introduces a new key.
 */

import type {ContactFieldsJobData} from '@plunk/types';
import {DelayedError, type Job, Worker} from 'bullmq';
import signale from 'signale';

import {ContactFieldService, MIN_SCAN_INTERVAL_MS} from '../services/ContactFieldService.js';
import {contactFieldsQueue} from '../services/QueueService.js';

async function processScan(job: Job<ContactFieldsJobData>, token?: string): Promise<void> {
  const {projectId} = job.data;

  // A project that keeps writing new keys would otherwise be rescanned every few seconds.
  // Push the job back instead; it keeps its id, so further requests still collapse onto it.
  const lastScannedAt = await ContactFieldService.lastScannedAt(projectId);
  if (lastScannedAt !== null && Date.now() - lastScannedAt < MIN_SCAN_INTERVAL_MS) {
    await job.moveToDelayed(lastScannedAt + MIN_SCAN_INTERVAL_MS, token);
    throw new DelayedError();
  }

  await ContactFieldService.scan(projectId);
}

export function createContactFieldsWorker(): Worker<ContactFieldsJobData> {
  const worker = new Worker<ContactFieldsJobData>(contactFieldsQueue.name, processScan, {
    connection: contactFieldsQueue.opts.connection,
    // Each job is a full pass over a project's contacts; keep a couple at most in flight.
    concurrency: 2,
  });

  worker.on('failed', (job, error) => {
    signale.error(`[CONTACT-FIELDS] Job ${job?.id} failed:`, error);
  });

  worker.on('error', error => {
    signale.error('[CONTACT-FIELDS] Worker error:', error);
  });

  return worker;
}

import type {ContactExportJobData, ContactExportResult} from '@plunk/types';
import {Worker} from 'bullmq';
import signale from 'signale';

import {ContactExportService} from '../services/ContactExportService.js';
import {contactExportQueue} from '../services/QueueService.js';

export function createContactExportWorker() {
  const worker = new Worker<ContactExportJobData, ContactExportResult>(
    contactExportQueue.name,
    job => ContactExportService.process(job),
    {
      connection: contactExportQueue.opts.connection,
      concurrency: 1,
    },
  );
  worker.on('error', error => signale.error('[CONTACT-EXPORT] Worker error:', error));
  worker.on('failed', (_job, error) => signale.error('[CONTACT-EXPORT] Export failed:', error.message));
  return worker;
}

/**
 * Unified Queue Worker
 * Starts all queue processors (email, campaign, scheduled, workflow, import, segment-count, domain-verification)
 *
 * This should be run as a separate process in production:
 * node dist/jobs/worker.js
 */

import {Worker} from 'bullmq';
import signale from 'signale';

import {createApiRequestCleanupWorker} from './api-request-cleanup-processor.js';
import {createIdempotencyKeyCleanupWorker} from './idempotency-key-cleanup-processor.js';
import {createBulkContactWorker} from './bulk-contact-processor.js';
import {createCampaignWorker} from './campaign-processor.js';
import {createCardVerificationWorker} from './card-verification-processor.js';
import {createCardVerificationSweepWorker} from './card-verification-sweep-processor.js';
import {createDomainVerificationWorker} from './domain-verification-processor.js';
import {createEmailBodyCleanupWorker} from './email-body-cleanup-processor.js';
import {createEmailWorker} from './email-processor.js';
import {createImportWorker} from './import-processor.js';
import {createMeterWorker} from './meter-processor.js';
import {createScheduledCampaignWorker} from './scheduled-processor.js';
import {createSegmentCountWorker} from './segment-count-processor.js';
import {createWorkflowWorker} from './workflow-processor-queue.js';

const workers: {name: string; worker: Worker}[] = [];

async function startWorkers() {
  signale.info('[WORKER] Starting queue workers...');

  try {
    // Start email worker
    const emailWorker = await createEmailWorker();
    workers.push({name: 'email', worker: emailWorker});
    signale.success('[WORKER] Email worker started');

    // Start campaign worker
    const campaignWorker = createCampaignWorker();
    workers.push({name: 'campaign', worker: campaignWorker});
    signale.success('[WORKER] Campaign worker started');

    // Start scheduled campaign worker
    const scheduledWorker = createScheduledCampaignWorker();
    workers.push({name: 'scheduled', worker: scheduledWorker});
    signale.success('[WORKER] Scheduled campaign worker started');

    // Start workflow worker
    const workflowWorker = createWorkflowWorker();
    workers.push({name: 'workflow', worker: workflowWorker});
    signale.success('[WORKER] Workflow worker started');

    // Start import worker
    const importWorker = createImportWorker();
    workers.push({name: 'import', worker: importWorker});
    signale.success('[WORKER] Import worker started');

    // Start bulk contact action worker
    const bulkContactWorker = createBulkContactWorker();
    workers.push({name: 'bulk-contact-actions', worker: bulkContactWorker});
    signale.success('[WORKER] Bulk contact action worker started');

    // Start segment count worker
    const segmentCountWorker = createSegmentCountWorker();
    workers.push({name: 'segment-count', worker: segmentCountWorker});
    signale.success('[WORKER] Segment count worker started');

    // Start domain verification worker
    const domainVerificationWorker = createDomainVerificationWorker();
    workers.push({name: 'domain-verification', worker: domainVerificationWorker});
    signale.success('[WORKER] Domain verification worker started');

    // Start API request cleanup worker
    const apiRequestCleanupWorker = createApiRequestCleanupWorker();
    workers.push({name: 'api-request-cleanup', worker: apiRequestCleanupWorker});
    signale.success('[WORKER] API request cleanup worker started');

    // Start idempotency key cleanup worker
    const idempotencyKeyCleanupWorker = createIdempotencyKeyCleanupWorker();
    workers.push({name: 'idempotency-key-cleanup', worker: idempotencyKeyCleanupWorker});
    signale.success('[WORKER] Idempotency key cleanup worker started');

    // Start email body cleanup worker
    const emailBodyCleanupWorker = createEmailBodyCleanupWorker();
    workers.push({name: 'email-body-cleanup', worker: emailBodyCleanupWorker});
    signale.success('[WORKER] Email body cleanup worker started');

    // Start meter worker
    const meterWorker = createMeterWorker();
    workers.push({name: 'meter', worker: meterWorker});
    signale.success('[WORKER] Meter worker started');

    // Start card verification worker
    const cardVerificationWorker = createCardVerificationWorker();
    workers.push({name: 'card-verification', worker: cardVerificationWorker});
    signale.success('[WORKER] Card verification worker started');

    // Start card verification sweep worker
    const cardVerificationSweepWorker = createCardVerificationSweepWorker();
    workers.push({name: 'card-verification-sweep', worker: cardVerificationSweepWorker});
    signale.success('[WORKER] Card verification sweep worker started');

    signale.success('[WORKER] All workers started successfully');
  } catch (error) {
    signale.error('[WORKER] Failed to start workers:', error);
    process.exit(1);
  }
}

async function stopWorkers() {
  signale.info('[WORKER] Stopping workers...');

  for (const {name, worker} of workers) {
    try {
      await worker.close();
      signale.info(`[WORKER] ${name} worker stopped`);
    } catch (error) {
      signale.error(`[WORKER] Error stopping ${name} worker:`, error);
    }
  }

  signale.success('[WORKER] All workers stopped');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  signale.info('[WORKER] Received SIGINT, shutting down gracefully...');
  void stopWorkers();
});

process.on('SIGTERM', () => {
  signale.info('[WORKER] Received SIGTERM, shutting down gracefully...');
  void stopWorkers();
});

process.on('uncaughtException', error => {
  signale.error('[WORKER] Uncaught exception:', error);
  void stopWorkers();
});

process.on('unhandledRejection', (reason, promise) => {
  signale.error('[WORKER] Unhandled rejection at:', promise, 'reason:', reason);
  void stopWorkers();
});

// Start workers
void startWorkers();

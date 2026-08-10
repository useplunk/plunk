/**
 * Background Job: Card Verification Processor
 *
 * Runs the off-session onboarding charge that proves a card will accept the merchant-initiated
 * renewal a month later. Off the webhook thread because confirming a PaymentIntent can outlast
 * Stripe's webhook timeout, and a timeout would mean a redelivery — and a second charge.
 */

import type {CardVerificationJobData} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {CardVerificationService} from '../services/CardVerificationService.js';
import {cardVerificationQueue} from '../services/QueueService.js';

export function createCardVerificationWorker(): Worker {
  const worker = new Worker<CardVerificationJobData>(
    cardVerificationQueue.name,
    async (job: Job<CardVerificationJobData>) => {
      const outcome = await CardVerificationService.verify(job.data);
      return outcome;
    },
    {
      connection: cardVerificationQueue.opts.connection,
      concurrency: 5,
      limiter: {
        max: 20,
        duration: 1000, // Stay well within Stripe's rate limits
      },
    },
  );

  worker.on('failed', (job, error) => {
    signale.error(`[CARD-VERIFICATION-WORKER] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, error);
  });

  worker.on('error', error => {
    signale.error('[CARD-VERIFICATION-WORKER] Worker error:', error);
  });

  return worker;
}

/**
 * Background Job: Campaign Stats Reconcile Sweep
 *
 * A campaign's engagement counters are materialized on the campaign row, and the stats endpoint
 * reads them without recomputing. They are written at finalization -- but most of the events they
 * count arrive after that: deliveries trail the last recipient by seconds, opens and clicks by
 * hours or days. Nothing was picking those up, so every campaign under-reported engagement, and a
 * campaign that finalized before the counters started being written at all reported zeros over
 * thousands of recipients whose email rows held every event.
 *
 * The webhook adds the campaign to a Redis set as each event lands (see
 * `CampaignService.markStatsDirty`) and this sweep drains it, recounting each campaign once per
 * run. Recounting rather than incrementing is the point: SES delivers notifications at least
 * once, so an increment has to be guarded against replays and still loses anything dropped, while
 * a count of the email rows is correct however many times the event arrived.
 */

import type {CampaignStatsSweepJobData} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {CampaignService} from '../services/CampaignService.js';
import {campaignStatsSweepQueue} from '../services/QueueService.js';

/**
 * Campaigns reconciled per run. Each one is a grouped index scan over its emails, so the bound is
 * what keeps a backlog -- several large sends finishing at once -- from turning one run into an
 * unbounded pass over the table. Anything left in the set is picked up by the next run two
 * minutes later, and the set is a set: a campaign that keeps drawing events is still one entry.
 */
const BATCH_SIZE = 200;

async function processSweep(job: Job<CampaignStatsSweepJobData>): Promise<{reconciled: number}> {
  const reconciled = await CampaignService.sweepDirtyStats(job.data?.batchSize ?? BATCH_SIZE);

  if (reconciled > 0) {
    signale.info(`[CAMPAIGN-STATS-SWEEP] Reconciled counters for ${reconciled} campaign(s)`);
  }

  return {reconciled};
}

export function createCampaignStatsSweepWorker(): Worker<CampaignStatsSweepJobData> {
  const worker = new Worker<CampaignStatsSweepJobData>(campaignStatsSweepQueue.name, processSweep, {
    connection: campaignStatsSweepQueue.opts.connection,
    // One sweep at a time. Two concurrent runs would each pop a slice of the same set and
    // recount campaigns in parallel, which is harmless but pure duplicated scanning.
    concurrency: 1,
  });

  worker.on('failed', (job, error) => {
    signale.error(`[CAMPAIGN-STATS-SWEEP] Job ${job?.id} failed:`, error);
  });

  worker.on('error', error => {
    signale.error('[CAMPAIGN-STATS-SWEEP] Worker error:', error);
  });

  return worker;
}

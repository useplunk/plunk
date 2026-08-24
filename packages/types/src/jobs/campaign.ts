/**
 * Campaign queue job data types
 */

/**
 * Job data for processing a batch of campaign recipients
 * Used by: campaignQueue worker
 */
export interface CampaignBatchJobData {
  campaignId: string;
  batchNumber: number;
  offset: number;
  limit: number;
  cursor?: string; // For cursor-based pagination
}

/**
 * Job data for sending a scheduled campaign
 * Used by: scheduledQueue worker
 */
export interface ScheduledCampaignJobData {
  campaignId: string;
}

/**
 * Job data for the campaign stats reconcile sweep
 * Used by: campaignStatsSweepQueue worker
 *
 * Empty: the work to do is whatever is in the dirty set when the sweep runs.
 */
export interface CampaignStatsSweepJobData {
  /** Optional override for how many campaigns one run may reconcile. */
  batchSize?: number;
}

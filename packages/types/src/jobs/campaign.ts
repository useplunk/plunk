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

/**
 * Job data for clearing the unsent emails of a cancelled campaign
 * Used by: campaignCancelCleanupQueue worker
 *
 * A campaign cancelled before anything reached a recipient returns to DRAFT, which
 * means discarding the `Email` rows `processBatch` had already created -- up to one
 * per recipient. At campaign scale that is far too much to delete in the request, so
 * the campaign is held at CANCELLED and the worker flips it to DRAFT once the rows
 * are gone. Holding it there is deliberate: `send` rejects a CANCELLED campaign, so
 * the user cannot start a second send whose fresh rows would be mixed in with the
 * ones still being deleted.
 */
export interface CampaignCancelCleanupJobData {
  campaignId: string;
  projectId: string;
  /**
   * Only rows created at or before this instant are removed, so a send started after
   * the campaign is back in DRAFT can never have its own emails deleted by a cleanup
   * that is still draining.
   */
  cancelledAt: string;
}

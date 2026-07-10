/**
 * Maintenance and background task queue job data types
 */

/**
 * Job data for updating segment membership counts
 * Used by: segmentCountQueue worker
 */
export interface SegmentCountJobData {
  projectId?: string; // Optional: if provided, only update this project's segments
}

/**
 * Job data for domain verification checks
 * Used by: domainVerificationQueue worker
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DomainVerificationJobData {
  // Empty for now - processes all domains
}

/**
 * Job data for cleaning up old API request logs
 * Used by: apiRequestCleanupQueue worker
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ApiRequestCleanupJobData {
  // Empty - cleans up old API request logs
}

/**
 * Job data for cleaning up expired idempotency keys
 * Used by: idempotencyKeyCleanupQueue worker
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IdempotencyKeyCleanupJobData {
  // Empty - cleans up all keys past their expiresAt
}

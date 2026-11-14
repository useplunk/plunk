/**
 * Import and bulk operation queue job data types
 */

import type {ContactSubscriptionStatus} from '../api/contact.js';

/**
 * Job data for importing contacts from CSV
 * Used by: importQueue worker
 */
export interface ContactImportJobData {
  projectId: string;
  csvData: string; // Base64 encoded CSV content
  filename: string;
}

/**
 * Selector describing which contacts a bulk action should target.
 * - `ids`: explicit list, hard-capped at 1000.
 * - `query`: every contact matching the filter, optionally excluding specific ids.
 *   Snapshot semantics: the worker iterates current matches at execution time, so
 *   contacts created after the job is queued may or may not be included.
 */
export type BulkContactActionSelector =
  | {mode: 'ids'; contactIds: string[]}
  | {
      mode: 'query';
      /**
       * Mirrors the contacts list filters. `status` is the current facet; `subscribed` is the
       * legacy boolean, kept for API callers that predate snoozing and ignored when `status` is set.
       */
      filter: {search?: string; status?: ContactSubscriptionStatus; subscribed?: boolean};
      excludeIds?: string[];
    };

/**
 * Job data for bulk contact actions (subscribe, unsubscribe, delete)
 * Used by: bulkContactQueue worker
 */
export interface BulkContactActionJobData {
  projectId: string;
  operation: 'subscribe' | 'unsubscribe' | 'delete';
  selector: BulkContactActionSelector;
}

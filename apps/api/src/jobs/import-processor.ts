/**
 * Background Job: Contact Import Processor
 * Processes CSV contact imports with validation and batch processing
 */

import type {ContactImportJobData} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import {parse} from 'csv-parse/sync';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {ContactService} from '../services/ContactService.js';
import {NtfyService} from '../services/NtfyService.js';
import {importQueue} from '../services/QueueService.js';

const BATCH_SIZE = 100; // Process contacts in batches of 100

interface ImportResult {
  totalRows: number;
  successCount: number;
  createdCount: number;
  updatedCount: number;
  failureCount: number;
  errors: {row: number; email: string; error: string}[];
}

export function createImportWorker() {
  const worker = new Worker<ContactImportJobData>(
    importQueue.name,
    async (job: Job<ContactImportJobData>) => {
      const {projectId, csvData, filename} = job.data;

      signale.info(`[IMPORT-PROCESSOR] Processing import for project ${projectId} (${filename})`);

      // Fetch project information for notifications
      const project = await prisma.project.findUnique({
        where: {id: projectId},
        select: {name: true},
      });

      const projectName = project?.name || projectId;

      const result: ImportResult = {
        totalRows: 0,
        successCount: 0,
        createdCount: 0,
        updatedCount: 0,
        failureCount: 0,
        errors: [],
      };

      try {
        // Decode base64 CSV data
        const csvContent = Buffer.from(csvData, 'base64').toString('utf-8');

        // Parse CSV with column header normalization
        const records = parse(csvContent, {
          columns: (header: string[]) => header.map(h => h.toLowerCase()), // Normalize headers to lowercase
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true, // Allow rows with different column counts
        }) as Record<string, string>[];

        result.totalRows = records.length;

        // Validate row count
        if (records.length === 0) {
          throw new Error('CSV file is empty');
        }

        signale.info(`[IMPORT-PROCESSOR] Parsed ${records.length} rows from CSV`);

        // Notify that import has started
        await NtfyService.notifyContactImportStarted(projectName, projectId, filename, result.totalRows);

        // Validate that 'email' column exists (case-insensitive)
        const firstRecord = records[0];
        if (firstRecord && typeof firstRecord === 'object' && !('email' in firstRecord)) {
          throw new Error('CSV must have an "email" column (case-insensitive)');
        }

        // Process contacts in batches
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
          const batch = records.slice(i, Math.min(i + BATCH_SIZE, records.length));

          // Process batch sequentially (to avoid overwhelming the database)
          for (const [batchIndex, record] of batch.entries()) {
            const rowNumber = i + batchIndex + 2; // +2 for header row and 1-based index

            try {
              // Validate email
              const email = record.email?.trim();
              if (!email) {
                result.failureCount++;
                result.errors.push({
                  row: rowNumber,
                  email: '',
                  error: 'Email is required',
                });
                continue;
              }

              // Basic email validation
              if (!isValidEmail(email)) {
                result.failureCount++;
                result.errors.push({
                  row: rowNumber,
                  email,
                  error: 'Invalid email format',
                });
                continue;
              }

              // Extract subscribed field if present (case-insensitive)
              const subscribedValue = record.subscribed;
              let subscribed: boolean | undefined;

              if (subscribedValue !== undefined && subscribedValue !== '') {
                // Handle various truthy/falsy values
                const lowerValue = subscribedValue.toLowerCase().trim();
                subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
              }

              // Extract custom data (all fields except email and subscribed)
              const {email: _, subscribed: __, ...customData} = record;
              const data = importCustomData(customData);

              // Check if contact exists before upserting
              const existingContact = await ContactService.findByEmail(projectId, email);
              const isUpdate = !!existingContact;

              // Upsert contact with subscribed value from CSV if provided
              // For new contacts, ContactService.upsert defaults to true
              // For existing contacts, only update if explicitly provided in CSV
              await ContactService.upsert(projectId, email, data, subscribed);

              result.successCount++;
              if (isUpdate) {
                result.updatedCount++;
              } else {
                result.createdCount++;
              }
            } catch (error) {
              result.failureCount++;
              result.errors.push({
                row: rowNumber,
                email: record.email || '',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          // Update progress
          const progress = Math.round(((i + batch.length) / records.length) * 100);
          await job.updateProgress(progress);
        }

        signale.info(
          `[IMPORT-PROCESSOR] Import completed: ${result.createdCount} created, ${result.updatedCount} updated, ${result.failureCount} failed`,
        );

        // Notify that import has completed
        await NtfyService.notifyContactImportCompleted(
          projectName,
          projectId,
          filename,
          result.successCount,
          result.createdCount,
          result.updatedCount,
          result.failureCount,
        );

        return result;
      } catch (error) {
        signale.error(`[IMPORT-PROCESSOR] Failed to process import:`, error);

        // Notify that import has failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await NtfyService.notifyContactImportFailed(projectName, projectId, filename, errorMessage);

        // Return partial results with error
        result.errors.push({
          row: 0,
          email: '',
          error: errorMessage,
        });

        throw error; // Re-throw to mark job as failed
      }
    },
    {
      connection: importQueue.opts.connection,
      concurrency: 2, // Process max 2 imports concurrently
    },
  );

  worker.on('completed', job => {
    signale.info(`[IMPORT-PROCESSOR] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[IMPORT-PROCESSOR] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', err => {
    signale.error('[IMPORT-PROCESSOR] Worker error:', err);
  });

  return worker;
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * The custom field a CSV column fills. Segment filters, workflow conditions and templates read a
 * dot in a field name as nesting, so `metafields.lastOpen` is stored as `metafields_lastopen`
 * rather than as a key none of them can reach. A leading `data.` names the field itself:
 * `data.plan` fills `plan`.
 *
 * @param column The column name, already lowercased.
 * @returns The field name to store the value under.
 */
export function importFieldKey(column: string): string {
  return column.replace(/^data\.(?=.)/, '').replace(/\./g, '_');
}

/**
 * The custom data a row's other columns fill, or `undefined` when there are none. Two columns can
 * fill one field (`plan` and `data.plan`): an empty cell never erases the other's value.
 *
 * @param columns The row's cells by lowercased column name, without `email` and `subscribed`.
 * @returns The fields to merge into the contact's data.
 */
export function importCustomData(
  columns: Record<string, string>,
): Record<string, string | boolean | number> | undefined {
  const fields = new Map<string, string | boolean | number>();
  for (const [column, value] of Object.entries(columns)) {
    const field = importFieldKey(column);
    if (value.trim() === '' && fields.has(field)) continue;
    fields.set(field, coerceCustomValue(value));
  }
  return fields.size > 0 ? Object.fromEntries(fields) : undefined;
}

// Values considered as boolean during import.
// Numbers (0, 1) are intentionally absent.
const BOOLEAN_TRUE = new Set(['true', 'yes']);
const BOOLEAN_FALSE = new Set(['false', 'no']);

// Strict integer-or-decimal number detection pattern.
// Valid: 0, 42, -42, 3.14
// Rejected: 007, +42, 1.2.3, 1e5
const NUMERIC_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

/**
 * Coerces a raw string into its most natural primitive type: `boolean`,
 * `number`, or `string`. Values that match neither are
 * returned unchanged.
 *
 * @param value The raw string to coerce.
 * @returns The coerced value as `boolean`, `number`, or `string`.
 */
export function coerceCustomValue(value: string): string | boolean | number {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (BOOLEAN_TRUE.has(lower)) return true;
  if (BOOLEAN_FALSE.has(lower)) return false;
  if (NUMERIC_RE.test(trimmed)) return Number(trimmed);
  return value;
}

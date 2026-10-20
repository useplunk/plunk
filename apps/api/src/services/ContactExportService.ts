import {createReadStream} from 'node:fs';
import {mkdtemp, open, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';

import type {Contact, Prisma} from '@plunk/db';
import type {ContactExportJobData, ContactExportResult, ContactExportStatus} from '@plunk/types';
import type {Job} from 'bullmq';

import {S3_ENABLED} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import {ContactExportStorage} from './ContactExportStorage.js';
import {contactExportQueue} from './QueueService.js';

const BATCH_SIZE = 100;
const MAX_CUSTOM_FIELDS = 1000;
const LIFETIME = 24 * 60 * 60 * 1000;
const COLUMNS = ['id', 'email', 'subscribed', 'snoozedUntil', 'createdAt', 'updatedAt'] as const;

function customData(data: Prisma.JsonValue | null): Prisma.JsonObject {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

/** RFC 4180 quoting alone does not prevent spreadsheet formula execution. */
export function csvCell(value: unknown): string {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (typeof value === 'string' && (/^[\t\r\n]/.test(text) || /^\s*[=+\-@]/u.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export class ContactExportService {
  static async start(projectId: string) {
    if (!S3_ENABLED) throw new HttpException(503, 'Contact exports require S3-compatible storage to be configured.');
    for (let attempt = 0; attempt < 3; attempt++) {
      const added = await contactExportQueue.add('export', {projectId}, {deduplication: {id: projectId}});
      // add() can return a deduplicated id with the NEW request's data/timestamp.
      // Read the stored job to check the lifecycle of the actual queued work.
      const job = await contactExportQueue.getJob(added.id!);
      if (!job) continue; // Another requester just removed the same obsolete job.
      if (job.data.projectId !== projectId) throw new HttpException(404, 'Contact export not found');
      if (!job.data.cancelled && Date.now() - job.timestamp < LIFETIME) return {jobId: job.id!};

      // Keep the deduplication boundary until an active worker has finished cleanup.
      // If a waiting job becomes active after this check, BullMQ's atomic remove
      // refuses its lock. Never delete a deduplication key separately from its job:
      // concurrent retries must not release a newer job's boundary.
      if ((await job.getState()) === 'active' || (await contactExportQueue.remove(job.id!)) === 0) {
        throw new HttpException(409, 'The previous contact export is still stopping. Please try again shortly.');
      }
    }
    throw new HttpException(409, 'Contact export changed while starting. Please try again.');
  }

  static async getJob(jobId: string, projectId?: string) {
    const job = await contactExportQueue.getJob(jobId);
    if (!job || (projectId && job.data.projectId !== projectId) || Date.now() - job.timestamp >= LIFETIME) {
      throw new HttpException(404, 'Contact export not found or expired');
    }
    return job;
  }

  static async status(jobId: string, projectId: string): Promise<ContactExportStatus> {
    const job = await this.getJob(jobId, projectId);
    const state = await job.getState();
    if (job.data.cancelled) return {status: 'cancelled', rows: 0};
    if (state === 'completed') {
      const result = job.returnvalue as ContactExportResult;
      return {status: 'completed', rows: result.rows, filename: result.filename};
    }
    if (state === 'failed') {
      const error =
        job.failedReason === 'Contact export exceeds 1000 custom fields'
          ? 'This project exceeds the export limit of 1000 custom fields.'
          : 'Could not export contacts. Please try again.';
      return {status: 'failed', rows: 0, error};
    }
    return {status: state === 'active' ? 'active' : 'waiting', rows: Number(job.progress) || 0};
  }

  static async cancel(jobId: string, projectId: string) {
    const job = await this.getJob(jobId, projectId);
    await job.updateData({...job.data, cancelled: true});
    if (job.returnvalue?.key) await ContactExportStorage.remove(job.returnvalue.key);
  }

  /** Snapshot to disk once, then derive the header from every row before streaming CSV.
   * Memory is limited to one page, one row and at most 1000 custom keys. Contacts
   * are evaluated as the worker reads them; this is not a database point-in-time backup.
   */
  static async process(job: Job<ContactExportJobData, ContactExportResult>): Promise<ContactExportResult> {
    const checkCancelled = async () => {
      const current = await this.getJob(job.id!, job.data.projectId);
      if (current.data.cancelled) throw new Error('Contact export cancelled');
    };
    const directory = await mkdtemp(join(tmpdir(), 'plunk-contact-export-'));
    const path = join(directory, 'contacts.ndjson');
    let key: string | undefined;
    try {
      const fields = new Set<string>();
      const snapshot = await open(path, 'wx', 0o600);
      let cursor: string | undefined;
      let rows = 0;
      try {
        while (true) {
          await checkCancelled();
          // The existing unique (projectId, email) index serves this ordered walk.
          const contacts: Contact[] = await prisma.contact.findMany({
            where: {projectId: job.data.projectId, ...(cursor !== undefined ? {email: {gt: cursor}} : {})},
            orderBy: {email: 'asc'},
            take: BATCH_SIZE,
          });
          if (contacts.length === 0) break;
          for (const contact of contacts) {
            for (const field of Object.keys(customData(contact.data))) {
              fields.add(field);
              if (fields.size > MAX_CUSTOM_FIELDS) throw new Error('Contact export exceeds 1000 custom fields');
            }
            await snapshot.writeFile(`${JSON.stringify(contact)}\n`);
          }
          rows += contacts.length;
          cursor = contacts[contacts.length - 1]!.email;
          await job.updateProgress(rows);
        }
      } finally {
        await snapshot.close();
      }
      const customFields = [...fields].sort();
      async function* csv() {
        // UTF-8 BOM makes Unicode contacts open correctly in spreadsheet applications.
        yield '\uFEFF' + [...COLUMNS, ...customFields.map(field => `data.${field}`)].map(csvCell).join(',') + '\r\n';
        const stream = createReadStream(path);
        const lines = createInterface({input: stream, crlfDelay: Infinity});
        try {
          let read = 0;
          for await (const line of lines) {
            if (read++ % BATCH_SIZE === 0) await checkCancelled();
            const contact = JSON.parse(line) as Contact;
            const data = customData(contact.data);
            yield [
              ...COLUMNS.map(column => contact[column]),
              ...customFields.map(field => (Object.hasOwn(data, field) ? data[field] : null)),
            ]
              .map(csvCell)
              .join(',') + '\r\n';
          }
        } finally {
          lines.close();
          stream.destroy();
        }
      }
      key = await ContactExportStorage.upload(csv(), checkCancelled);
      // Cancellation may have arrived while the final upload request was in flight.
      await checkCancelled();
      return {key, rows, filename: `contacts-${new Date(job.timestamp).toISOString().slice(0, 10)}.csv`};
    } catch (error) {
      if (key) await ContactExportStorage.remove(key);
      throw error;
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  }
}

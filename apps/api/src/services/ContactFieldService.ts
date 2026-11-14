import type {ContactField, ContactFieldType, ContactFieldsResponse} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';
import {contactFieldsQueue} from './QueueService.js';

/**
 * Add keys to a project's field registry, scored by when Redis first saw them.
 * Returns how many were new. Redis' clock rather than the caller's, so the scan's prune
 * below compares timestamps from a single source.
 */
const RECORD_KEYS_SCRIPT = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local added = 0
for i = 1, #ARGV do
  added = added + redis.call('ZADD', KEYS[1], 'NX', now, ARGV[i])
end
return added
`;

/**
 * Store a scan's result. Keys found by the scan are added; keys first seen before the scan
 * started that it did not find are gone from every contact and are pruned. Keys first seen
 * during the scan are kept, since the scan may have missed the write that introduced them.
 *
 *   KEYS[1] = field keys, KEYS[2] = field stats
 *   ARGV[1] = scan start (ms), ARGV[2] = stats JSON, ARGV[3] = TTL (s), ARGV[4..] = found keys
 */
const STORE_SCAN_SCRIPT = `
local found = {}
for i = 4, #ARGV do
  found[ARGV[i]] = true
  redis.call('ZADD', KEYS[1], 'NX', ARGV[1], ARGV[i])
end
for _, key in ipairs(redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', '(' .. ARGV[1])) do
  if not found[key] then
    redis.call('ZREM', KEYS[1], key)
  end
end
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 0
`;

interface ContactFieldCommands {
  contactFieldsRecord(keysKey: string, ...dataKeys: string[]): Promise<number>;
  contactFieldsStoreScan(
    keysKey: string,
    statsKey: string,
    scanStart: number,
    stats: string,
    ttl: number,
    ...dataKeys: string[]
  ): Promise<number>;
}

redis.defineCommand('contactFieldsRecord', {numberOfKeys: 1, lua: RECORD_KEYS_SCRIPT});
redis.defineCommand('contactFieldsStoreScan', {numberOfKeys: 2, lua: STORE_SCAN_SCRIPT});

const client = redis as unknown as ContactFieldCommands;

interface FieldStats {
  scannedAt: number;
  fields: Record<string, {type: ContactFieldType; coverage: number}>;
}

const STANDARD_FIELDS: ContactField[] = [
  {field: 'email', type: 'string', coverage: 100},
  {field: 'subscribed', type: 'boolean', coverage: 100},
  {field: 'createdAt', type: 'date', coverage: 100},
  {field: 'updatedAt', type: 'date', coverage: 100},
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

/** Coverage drifts slowly, so a read re-measures it at most this often. */
const STALE_AFTER_MS = 60 * 60 * 1000;

/** Minimum gap between two scans of one project, however many new keys arrive. */
export const MIN_SCAN_INTERVAL_MS = 5 * 60 * 1000;

/** Lets a burst of writes that introduce keys (an import) collapse onto one scan. */
const WRITE_DEBOUNCE_MS = 10 * 1000;

/** Projects nobody looks at drop out of Redis; the next read rescans. */
const TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * The fields a project's contacts can be filtered and personalised on.
 *
 * Discovering the keys inside `Contact.data` needs a full scan of the project's contacts,
 * which takes seconds at millions of rows. So the key list is kept up to date on write, and
 * coverage and type are measured by a background job and read from Redis. The endpoint never
 * touches the contacts table.
 */
export class ContactFieldService {
  public static async list(projectId: string): Promise<ContactFieldsResponse> {
    const [keys, rawStats] = await Promise.all([
      redis.zrange(Keys.Contact.fieldKeys(projectId), 0, -1),
      redis.get(Keys.Contact.fieldStats(projectId)),
    ]);
    const stats = this.parseStats(rawStats);

    if (!stats || Date.now() - stats.scannedAt > STALE_AFTER_MS || keys.some(key => !stats.fields[key])) {
      await this.scheduleScan(projectId, 0);
    }

    const customFields: ContactField[] = keys.map(key => ({
      field: `data.${key}`,
      type: stats?.fields[key]?.type ?? 'string',
      coverage: stats?.fields[key]?.coverage ?? null,
    }));
    const fields = [...STANDARD_FIELDS, ...customFields].sort((a, b) => a.field.localeCompare(b.field));

    return {fields, count: fields.length, pending: !stats};
  }

  /**
   * Register the `Contact.data` keys a write stored. A no-op for known keys; a new one is
   * offered from the next read and gets its coverage measured shortly after.
   *
   * Never throws: a Redis blip must not fail a contact write, and the next scan picks up
   * whatever was missed.
   */
  public static async recordKeys(projectId: string, dataKeys: string[]): Promise<void> {
    if (dataKeys.length === 0) {
      return;
    }

    try {
      const added = await client.contactFieldsRecord(Keys.Contact.fieldKeys(projectId), ...dataKeys);

      if (added > 0) {
        await this.scheduleScan(projectId, WRITE_DEBOUNCE_MS);
      }
    } catch (error) {
      signale.warn(`[CONTACT-FIELDS] Could not record fields for project ${projectId}:`, error);
    }
  }

  /** The keys of a `Contact.data` value, if it is an object. */
  public static keysOf(data: unknown): string[] {
    return data !== null && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [];
  }

  /** Stop offering a key that was removed from every contact. */
  public static async forget(projectId: string, key: string): Promise<void> {
    await redis.zrem(Keys.Contact.fieldKeys(projectId), key);
  }

  /** When the project was last scanned, or null if never. */
  public static async lastScannedAt(projectId: string): Promise<number | null> {
    return this.parseStats(await redis.get(Keys.Contact.fieldStats(projectId)))?.scannedAt ?? null;
  }

  /**
   * Measure every `Contact.data` key of the project in one pass over its contacts, and store
   * the result. Run by the contact-fields worker only.
   */
  public static async scan(projectId: string): Promise<void> {
    const [seconds, micros] = await redis.time();
    const scanStart = Number(seconds) * 1000 + Math.floor(Number(micros) / 1000);

    const [total, rows] = await Promise.all([
      prisma.contact.count({where: {projectId}}),
      prisma.$queryRaw<
        Array<{
          key: string;
          contacts: bigint;
          type_min: string | null;
          type_max: string | null;
          sample_min: string | null;
          sample_max: string | null;
        }>
      >`
        SELECT
          kv.key,
          count(*) FILTER (WHERE jsonb_typeof(kv.value) <> 'null') AS contacts,
          min(jsonb_typeof(kv.value)) FILTER (WHERE jsonb_typeof(kv.value) <> 'null') AS type_min,
          max(jsonb_typeof(kv.value)) FILTER (WHERE jsonb_typeof(kv.value) <> 'null') AS type_max,
          min(kv.value #>> '{}') FILTER (WHERE jsonb_typeof(kv.value) = 'string') AS sample_min,
          max(kv.value #>> '{}') FILTER (WHERE jsonb_typeof(kv.value) = 'string') AS sample_max
        FROM contacts c
        CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(c.data) = 'object' THEN c.data ELSE '{}'::jsonb END) kv
        WHERE c."projectId" = ${projectId}
        GROUP BY kv.key
      `,
    ]);

    const stats: FieldStats = {scannedAt: scanStart, fields: {}};

    for (const row of rows) {
      stats.fields[row.key] = {
        type: this.inferType(row.type_min, row.type_max, row.sample_min, row.sample_max),
        coverage: total > 0 ? Math.round((Number(row.contacts) / total) * 100) : 0,
      };
    }

    await client.contactFieldsStoreScan(
      Keys.Contact.fieldKeys(projectId),
      Keys.Contact.fieldStats(projectId),
      scanStart,
      JSON.stringify(stats),
      TTL_SECONDS,
      ...rows.map(row => row.key),
    );
  }

  /**
   * A field whose non-null values all share one JSON type gets that type; a mix falls back
   * to string, the only operator set that works across all of it.
   */
  private static inferType(
    typeMin: string | null,
    typeMax: string | null,
    sampleMin: string | null,
    sampleMax: string | null,
  ): ContactFieldType {
    if (typeMin === null || typeMin !== typeMax) {
      return 'string';
    }

    if (typeMin === 'boolean' || typeMin === 'number') {
      return typeMin;
    }

    if (typeMin === 'string' && sampleMin && sampleMax && ISO_DATE.test(sampleMin) && ISO_DATE.test(sampleMax)) {
      return 'date';
    }

    return 'string';
  }

  /** Queue a scan, collapsing onto one already queued for the project. Never throws. */
  private static async scheduleScan(projectId: string, delay: number): Promise<void> {
    try {
      await contactFieldsQueue.add('scan', {projectId}, {jobId: `contact-fields-${projectId}`, delay});
    } catch (error) {
      signale.warn(`[CONTACT-FIELDS] Could not queue a field scan for project ${projectId}:`, error);
    }
  }

  private static parseStats(raw: string | null): FieldStats | null {
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as FieldStats;
    } catch {
      return null;
    }
  }
}

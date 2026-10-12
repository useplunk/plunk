import {PrismaClient} from '@prisma/client';
import signale from 'signale';

import {DIRECT_DATABASE_URL} from '../app/constants.js';

/**
 * Background Index Builder
 * Builds indexes on the largest tables after the worker has booted, instead of in a
 * Prisma migration. Migrations run in the container entrypoint before anything starts,
 * and building an index over "emails", "events" or "contacts" on a large install takes
 * minutes to tens of minutes even with CONCURRENTLY -- the whole application would stay
 * down for that long. A plain CREATE INDEX would additionally block every write to the
 * table until it finished.
 *
 * These indexes are therefore not in schema.prisma or the migrations folder. Do not add
 * them there: a Prisma migration would bring the boot-time build back.
 *
 * Safe to run on every boot and from several workers at once:
 *   - A session advisory lock lets one process build; the others skip.
 *   - Existing valid indexes are skipped, so after the first build this is a cheap no-op.
 *   - A build interrupted by a deploy or crash leaves an INVALID index behind, which
 *     Postgres ignores for queries. It is dropped and rebuilt on the next boot.
 *   - Every step fails on its own: a failure is logged and the next step still runs.
 *
 * Only runs in production, so development databases do not drift from the migration
 * history (prisma migrate dev would flag the extra indexes and offer a reset).
 */

interface BackgroundIndex {
  name: string;
  sql: string;
  /** Extension the index depends on, created first if missing */
  extension?: string;
  /** An older index this one supersedes, dropped once this one is valid */
  replaces?: string;
}

interface StatisticsTarget {
  table: string;
  column: string;
  target: number;
}

// Ordered cheapest first, so the quick wins land before the long emails build
const INDEXES: BackgroundIndex[] = [
  {
    // Contact list: ORDER BY createdAt DESC, id DESC LIMIT n as an ordered walk instead of
    // sorting every contact in the project. Only the default descending sort is covered,
    // since the id tiebreaker is always descending.
    name: 'contacts_projectId_createdAt_id_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "contacts_projectId_createdAt_id_idx" ON "contacts"("projectId", "createdAt" DESC, "id" DESC)`,
  },
  {
    // Contact search: email ILIKE '%term%', which no btree can serve. Needed alongside the
    // index above: with only the ordered walk, a term with few or no matches walks the
    // whole project looking for rows that do not exist. Trigram indexes serve ILIKE as
    // well as LIKE, so search stays case-insensitive.
    name: 'contacts_email_trgm_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "contacts_email_trgm_idx" ON "contacts" USING GIN ("email" gin_trgm_ops)`,
    extension: 'pg_trgm',
  },
  {
    // Dashboard and analytics event counts per project over a createdAt range.
    name: 'events_projectId_createdAt_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "events_projectId_createdAt_idx" ON "events"("projectId", "createdAt")`,
  },
  {
    // Dashboard and analytics stats: per-project counts over a createdAt range. INCLUDE
    // lets those counts be answered from the index alone, without fetching email rows,
    // which are wide because of the stored body. Covers every column the analytics
    // overview and timeseries read: each lifecycle timestamp, the stream, and the
    // simulator flag they filter on.
    name: 'emails_projectId_createdAt_stats_idx',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "emails_projectId_createdAt_stats_idx" ON "emails"("projectId", "createdAt") INCLUDE ("sourceType", "simulated", "sentAt", "deliveredAt", "openedAt", "clickedAt", "bouncedAt", "complainedAt")`,
    replaces: 'emails_projectId_createdAt_idx',
  },
];

const STATISTICS_TARGETS: StatisticsTarget[] = [
  {
    // With the default target, ILIKE selectivity estimates swing so far that the planner
    // uses the trigram index for some search terms and skips it for others that match
    // just as many rows. More samples make that choice consistent.
    table: 'contacts',
    column: 'email',
    target: 1000,
  },
];

// Arbitrary constant identifying this job's advisory lock
const ADVISORY_LOCK_KEY = 7_391_004_221;

/**
 * Advisory locks and session settings belong to one connection, so this job uses its own
 * single-connection client instead of the shared pool. The direct URL bypasses any pooler,
 * which would break both session locks and CONCURRENTLY.
 */
function createSingleConnectionClient(): PrismaClient {
  const url = new URL(DIRECT_DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  return new PrismaClient({datasourceUrl: url.toString()});
}

function secondsSince(startedAt: number): number {
  return Math.round((Date.now() - startedAt) / 1000);
}

async function ensureIndex(client: PrismaClient, index: BackgroundIndex): Promise<void> {
  const [existing] = await client.$queryRaw<{valid: boolean}[]>`
    SELECT indisvalid AS valid FROM pg_index WHERE indexrelid = to_regclass(${`"${index.name}"`})
  `;

  if (existing?.valid) {
    return;
  }

  if (index.extension) {
    await client.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS ${index.extension}`);
  }

  if (existing) {
    // We hold the lock, so no other process is building it: this is a leftover
    signale.warn(`[INDEX-BUILDER] Dropping invalid index ${index.name} from an interrupted build`);
    await client.$executeRawUnsafe(`DROP INDEX CONCURRENTLY IF EXISTS "${index.name}"`);
  }

  signale.info(`[INDEX-BUILDER] Building ${index.name}...`);
  const startedAt = Date.now();
  await client.$executeRawUnsafe(index.sql);
  signale.success(`[INDEX-BUILDER] Built ${index.name} in ${secondsSince(startedAt)}s`);
}

/**
 * Drops the index a valid replacement supersedes. Only ever runs after the replacement is
 * valid, so queries are never left without either one.
 */
async function dropReplacedIndex(client: PrismaClient, index: BackgroundIndex): Promise<void> {
  if (!index.replaces) {
    return;
  }

  const [replacement] = await client.$queryRaw<{valid: boolean}[]>`
    SELECT indisvalid AS valid FROM pg_index WHERE indexrelid = to_regclass(${`"${index.name}"`})
  `;
  const [old] = await client.$queryRaw<{exists: boolean}[]>`
    SELECT to_regclass(${`"${index.replaces}"`}) IS NOT NULL AS exists
  `;

  if (!replacement?.valid || !old?.exists) {
    return;
  }

  signale.info(`[INDEX-BUILDER] Dropping ${index.replaces}, superseded by ${index.name}...`);
  await client.$executeRawUnsafe(`DROP INDEX CONCURRENTLY IF EXISTS "${index.replaces}"`);
  signale.success(`[INDEX-BUILDER] Dropped ${index.replaces}`);
}

async function ensureStatisticsTarget(client: PrismaClient, stats: StatisticsTarget): Promise<void> {
  const [current] = await client.$queryRaw<{target: number}[]>`
    SELECT COALESCE(attstattarget, -1)::int AS target
    FROM pg_attribute
    WHERE attrelid = to_regclass(${`"${stats.table}"`}) AND attname = ${stats.column}
  `;

  if (!current || current.target === stats.target) {
    return;
  }

  // SET STATISTICS takes a lock that does not block reads or writes. The new target only
  // applies from the next ANALYZE, so run one for this column rather than waiting for
  // autovacuum to get to it.
  signale.info(`[INDEX-BUILDER] Raising statistics target of ${stats.table}.${stats.column} to ${stats.target}...`);
  const startedAt = Date.now();
  await client.$executeRawUnsafe(
    `ALTER TABLE "${stats.table}" ALTER COLUMN "${stats.column}" SET STATISTICS ${stats.target}`,
  );
  await client.$executeRawUnsafe(`ANALYZE "${stats.table}" ("${stats.column}")`);
  signale.success(`[INDEX-BUILDER] Analyzed ${stats.table}.${stats.column} in ${secondsSince(startedAt)}s`);
}

export async function buildBackgroundIndexes(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const client = createSingleConnectionClient();

  try {
    const [lock] = await client.$queryRaw<{locked: boolean}[]>`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}::bigint) AS locked
    `;
    if (!lock?.locked) {
      signale.info('[INDEX-BUILDER] Another process is building indexes, skipping');
      return;
    }

    // A legitimate build can take far longer than any timeout set for app queries
    await client.$executeRawUnsafe('SET statement_timeout = 0');

    // Missing indexes only cost performance, so failures are logged, never thrown: the
    // worker must not go down over them, and one failure must not hold up the rest
    for (const index of INDEXES) {
      try {
        await ensureIndex(client, index);
        await dropReplacedIndex(client, index);
      } catch (error) {
        signale.error(`[INDEX-BUILDER] Failed to build ${index.name}, will retry on next boot:`, error);
      }
    }

    for (const stats of STATISTICS_TARGETS) {
      try {
        await ensureStatisticsTarget(client, stats);
      } catch (error) {
        signale.error(`[INDEX-BUILDER] Failed to set statistics on ${stats.table}.${stats.column}:`, error);
      }
    }
  } catch (error) {
    signale.error('[INDEX-BUILDER] Failed to run, will retry on next boot:', error);
  } finally {
    // Closing the connection also releases the advisory lock
    await client.$disconnect();
  }
}

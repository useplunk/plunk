import {createHash, randomUUID} from 'node:crypto';

import {Prisma} from '@plunk/db';
import type {
  AnalyticsGranularity,
  AnalyticsStream,
  AnalyticsTimeseriesPoint,
  EmailMetricCounts,
  GlobalAnalyticsAlert,
  GlobalAnalyticsAlertSeverity,
  GlobalAnalyticsOverview,
  GlobalAnalyticsProjectRow,
  GlobalAnalyticsTimeseries,
  GlobalDeliveryCounts,
  GlobalMetrics,
} from '@plunk/types';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {RateLimitError} from '../exceptions/index.js';
import {
  AnalyticsService,
  type CountRow,
  COUNT_COLUMNS,
  addCounts,
  bucketSeries,
  emptyCounts,
  localBucket,
  toCounts,
  utc,
} from './AnalyticsService.js';
import {Keys} from './keys.js';

/**
 * The filter for the cross-project dashboard: the per-project filter, with the project
 * replaced by the user whose memberships define the scope. `projectIds` narrows that scope
 * further; ids the user is not a member of are ignored, never trusted.
 */
export interface GlobalAnalyticsQuery {
  userId: string;
  projectIds?: string[];
  from: Date;
  to: Date;
  tz: string;
  stream: AnalyticsStream;
}

interface ScopedProject {
  id: string;
  name: string;
  disabled: boolean;
}

/** A query bound to the projects it may read */
interface Scope {
  projectIds: string[];
  from: Date;
  to: Date;
  tz: string;
  stream: AnalyticsStream;
}

type ProjectCounts = EmailMetricCounts & GlobalDeliveryCounts;

/**
 * Alert thresholds. The rate levels are the ones the dashboard already colours rates with
 * (Plunk's own 7-day enforcement levels), so every screen agrees on what "too high" means,
 * and are only judged once a project sent enough mail for a rate to mean something.
 */
export const GLOBAL_ALERT_THRESHOLDS = {
  MIN_SENT_FOR_RATES: 100,
  BOUNCE_RATE_WARNING: 5,
  BOUNCE_RATE_CRITICAL: 10,
  COMPLAINT_RATE_WARNING: 0.075,
  COMPLAINT_RATE_CRITICAL: 0.15,
  /** Both the rate and the count must be reached, as in the enforcement, so one complaint is not an alert */
  MIN_BOUNCES_WARNING: 5,
  MIN_BOUNCES_CRITICAL: 10,
  MIN_COMPLAINTS_WARNING: 3,
  MIN_COMPLAINTS_CRITICAL: 5,
  /** A spike is this many times the previous period's volume... */
  VOLUME_SPIKE_RATIO: 3,
  /** ...from a previous period that had at least this many emails */
  VOLUME_SPIKE_MIN_PREVIOUS: 20,
} as const;

const RELEASE_LOCK = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

const SEVERITY_ORDER: Record<GlobalAnalyticsAlertSeverity, number> = {critical: 0, warning: 1, info: 2};

/**
 * Global Analytics Service
 *
 * The analytics overview and timeseries across every project the user is a member of. It
 * reads the same columns as AnalyticsService through the same ("projectId", "createdAt")
 * covering index, with one index range per project: cost scales with the period's volume
 * and the number of projects.
 *
 * Every project the user is a member of is included, however many. Projects are queried in
 * batches, one batch at a time, so a large account never sends one huge id array or holds
 * more than a handful of pooled connections, and the batches are merged in memory.
 */
export class GlobalAnalyticsService {
  /** Most project ids the `projects` filter accepts: they travel in the URL */
  public static readonly MAX_REQUESTED_PROJECTS = 200;
  /** Projects per query. Small enough for a short id array, large enough to keep round trips few. */
  public static readonly PROJECT_BATCH_SIZE = 100;

  private static readonly CACHE_TTL = 300;
  private static readonly CACHE_TTL_HOURLY = 60;
  private static readonly MIN_COMPARABLE_MS = 12 * 60 * 60 * 1000;
  /** How long one computation may hold a user's lock before it is considered abandoned */
  private static readonly LOCK_TTL_MS = 60_000;
  /** How long a request waits for another computation of the same user before giving up */
  private static readonly LOCK_WAIT_MS = 20_000;
  private static readonly LOCK_POLL_MS = 150;

  // ===========================================================================
  // OVERVIEW
  // ===========================================================================

  public static async getOverview(query: GlobalAnalyticsQuery): Promise<GlobalAnalyticsOverview> {
    const projects = await this.projectsFor(query);
    const empty = {current: toGlobalMetrics(emptyProjectCounts()), previous: toGlobalMetrics(emptyProjectCounts())};
    if (projects.length === 0) {
      return {...empty, projects: [], alerts: []};
    }

    const scope = this.scopeOf(query, projects);
    // Only the counts are cached. Names and the disabled flag come from the membership read
    // above, so a project disabled a minute ago is flagged now, not when the cache expires.
    const counts = await this.cached('overview', query.userId, scope, async () => {
      // One period after the other: each batch already runs four queries side by side
      const current = await this.countsByProject(scope);
      const previous = await this.countsByProject(AnalyticsService.previousPeriod(scope));
      return {current: Object.fromEntries(current), previous: Object.fromEntries(previous)};
    });

    const rows: GlobalAnalyticsProjectRow[] = projects.map(project => ({
      id: project.id,
      name: project.name,
      disabled: project.disabled,
      current: toGlobalMetrics(counts.current[project.id] ?? emptyProjectCounts()),
      previous: toGlobalMetrics(counts.previous[project.id] ?? emptyProjectCounts()),
    }));

    const sum = (byProject: Record<string, ProjectCounts>) =>
      toGlobalMetrics(Object.values(byProject).reduce(addProjectCounts, emptyProjectCounts()));

    return {
      current: sum(counts.current),
      previous: sum(counts.previous),
      projects: rows,
      alerts: buildAlerts(rows, {compareVolume: this.isComparable(scope)}),
    };
  }

  /**
   * Whether enough of the period has passed for its volume to be compared with the previous
   * one. Shortly after midnight "today" holds a few minutes of mail, too little to call a
   * project silent or spiking.
   */
  private static isComparable(scope: Scope, now = Date.now()): boolean {
    return Math.min(scope.to.getTime(), now) - scope.from.getTime() >= this.MIN_COMPARABLE_MS;
  }

  private static async countsByProject(scope: Scope): Promise<Map<string, ProjectCounts>> {
    const byProject = new Map<string, ProjectCounts>();
    for (const batch of batches(scope, this.PROJECT_BATCH_SIZE)) {
      for (const [projectId, counts] of await this.countsForBatch(batch)) {
        byProject.set(projectId, counts);
      }
    }
    return byProject;
  }

  private static async countsForBatch(scope: Scope): Promise<Map<string, ProjectCounts>> {
    const [counts, failed, softBounces, unsubscribes] = await Promise.all([
      prisma.$queryRaw<(CountRow & {projectId: string})[]>`
        SELECT e."projectId" AS "projectId", ${COUNT_COLUMNS}
        FROM "emails" e
        WHERE ${emailScope(scope)}
        GROUP BY 1
      `,
      // status is not in the covering index, so failures are counted on their own rather than
      // making the main count fetch every row of the period from the heap
      prisma.$queryRaw<{projectId: string; count: bigint}[]>`
        SELECT e."projectId" AS "projectId", COUNT(*) AS count
        FROM "emails" e
        WHERE ${emailScope(scope)} AND e."status" = 'FAILED'
        GROUP BY 1
      `,
      // Transient bounces never touch the email row, so they only exist as events. Joined to
      // their email so they belong to the same cohort as every other count. A bounce always
      // follows its email, so the event's lower bound narrows the events index first.
      prisma.$queryRaw<{projectId: string; count: bigint}[]>`
        SELECT ev."projectId" AS "projectId", COUNT(DISTINCT ev."emailId") AS count
        FROM "events" ev
        JOIN "emails" e ON e."id" = ev."emailId"
        WHERE ev."projectId" = ANY(${scope.projectIds}::text[])
          AND ev."name" = 'email.bounce'
          AND ev."createdAt" >= ${utc(scope.from)}
          AND ev."data"->>'transientBounce' = 'true'
          AND ${emailScope(scope)}
        GROUP BY 1
      `,
      prisma.$queryRaw<{projectId: string; count: bigint}[]>`
        SELECT ev."projectId" AS "projectId", COUNT(DISTINCT ev."contactId") AS count
        FROM "events" ev
        JOIN "emails" e ON e."id" = ev."emailId"
        WHERE ev."projectId" = ANY(${scope.projectIds}::text[])
          AND ev."name" = 'contact.unsubscribed'
          AND ev."createdAt" >= ${utc(scope.from)}
          AND ${emailScope(scope)}
        GROUP BY 1
      `,
    ]);

    const byProject = new Map<string, ProjectCounts>();
    const merge = (projectId: string, patch: Partial<ProjectCounts>) =>
      byProject.set(projectId, {...(byProject.get(projectId) ?? emptyProjectCounts()), ...patch});

    for (const row of counts) merge(row.projectId, toCounts(row));
    for (const row of failed) merge(row.projectId, {failed: Number(row.count)});
    for (const row of softBounces) merge(row.projectId, {softBounces: Number(row.count)});
    for (const row of unsubscribes) merge(row.projectId, {unsubscribed: Number(row.count)});
    return byProject;
  }

  // ===========================================================================
  // TIMESERIES
  // ===========================================================================

  public static async getTimeseries(query: GlobalAnalyticsQuery): Promise<GlobalAnalyticsTimeseries> {
    const granularity = AnalyticsService.granularityFor(query.from, query.to);
    const projects = await this.projectsFor(query);
    const scope = this.scopeOf(query, projects);

    return this.cached('timeseries', query.userId, scope, async () => {
      const [current, previous] = await Promise.all([
        this.emailSeries(scope, granularity),
        this.emailSeries(AnalyticsService.previousPeriod(scope), granularity),
      ]);
      return {granularity, current, previous};
    });
  }

  /** The series of each batch, summed bucket by bucket; every batch draws the same buckets */
  private static async emailSeries(
    scope: Scope,
    granularity: AnalyticsGranularity,
  ): Promise<AnalyticsTimeseriesPoint[]> {
    let total: AnalyticsTimeseriesPoint[] | undefined;
    for (const batch of batches(scope, this.PROJECT_BATCH_SIZE)) {
      const series = await this.seriesForBatch(batch, granularity);
      total = total ? total.map((point, i) => ({...point, ...addCounts(point, series[i] ?? point)})) : series;
    }
    return total ?? [];
  }

  private static async seriesForBatch(
    scope: Scope,
    granularity: AnalyticsGranularity,
  ): Promise<AnalyticsTimeseriesPoint[]> {
    const bucket = localBucket(Prisma.sql`e."createdAt"`, scope.tz, granularity);
    const rows = await prisma.$queryRaw<(CountRow & {bucket: string})[]>`
      WITH buckets AS (${bucketSeries(scope, granularity)}),
      counts AS (
        SELECT ${bucket} AS bucket, ${COUNT_COLUMNS}
        FROM "emails" e
        WHERE ${emailScope(scope)}
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI') AS bucket,
        COALESCE(c.sent, 0) AS sent, COALESCE(c.delivered, 0) AS delivered,
        COALESCE(c.opened, 0) AS opened, COALESCE(c.clicked, 0) AS clicked,
        COALESCE(c.bounced, 0) AS bounced, COALESCE(c.complained, 0) AS complained
      FROM buckets b
      LEFT JOIN counts c ON c.bucket = b.bucket
      ORDER BY b.bucket
    `;

    // Unsubscribes are left out of the global series: the volume chart does not draw them,
    // and counting them per bucket would add a join across every project's events
    return rows.map(row => ({bucket: row.bucket, ...toCounts(row), unsubscribed: 0}));
  }

  // ===========================================================================
  // SCOPE & CACHE
  // ===========================================================================

  /**
   * The projects the user is a member of, narrowed to the requested ids when there are any.
   * Membership is read on every request, outside the cache, so a removed member loses
   * access immediately.
   */
  private static async projectsFor(query: GlobalAnalyticsQuery): Promise<ScopedProject[]> {
    const requested = query.projectIds?.length ? query.projectIds : undefined;
    const memberships = await prisma.membership.findMany({
      where: {userId: query.userId, ...(requested ? {projectId: {in: requested}} : {})},
      select: {project: {select: {id: true, name: true, disabled: true}}},
      orderBy: {createdAt: 'asc'},
    });
    return memberships.map(m => m.project);
  }

  private static scopeOf(query: GlobalAnalyticsQuery, projects: ScopedProject[]): Scope {
    return {
      projectIds: projects.map(p => p.id).sort(),
      from: query.from,
      to: query.to,
      tz: query.tz,
      stream: query.stream,
    };
  }

  private static async cached<T>(kind: string, userId: string, scope: Scope, compute: () => Promise<T>): Promise<T> {
    // The project set is hashed so the key stays short however many projects are in scope
    const projects = createHash('sha256').update(scope.projectIds.join(',')).digest('hex').slice(0, 16);
    const key = Keys.Analytics.global(
      userId,
      kind,
      `${scope.from.toISOString()}:${scope.to.toISOString()}:${scope.tz}:${scope.stream}:${projects}`,
    );

    const hit = await redis.get(key);
    if (hit) {
      return JSON.parse(hit) as T;
    }

    // One uncached computation per user and kind at a time. Every distinct filter is its own
    // cache key, so without this a client cycling through periods could run the heaviest
    // queries in parallel without bound. Waiting also lets a duplicate request reuse the
    // result the first one is about to cache.
    const lock = Keys.Analytics.global(userId, kind, 'lock');
    const token = randomUUID();
    const deadline = Date.now() + this.LOCK_WAIT_MS;
    while ((await redis.set(lock, token, 'PX', this.LOCK_TTL_MS, 'NX')) !== 'OK') {
      if (Date.now() >= deadline) {
        throw new RateLimitError('Analytics for your projects are still being computed. Please try again shortly.', 5);
      }
      await new Promise(resolve => setTimeout(resolve, this.LOCK_POLL_MS));
      const computed = await redis.get(key);
      if (computed) {
        return JSON.parse(computed) as T;
      }
    }

    try {
      const value = await compute();
      const ttl =
        AnalyticsService.granularityFor(scope.from, scope.to) === 'hour' ? this.CACHE_TTL_HOURLY : this.CACHE_TTL;
      await redis.setex(key, ttl, JSON.stringify(value));
      return value;
    } finally {
      // Released only if still ours: a computation that outlived the lock TTL must not free
      // a lock another request has taken since
      await redis.eval(RELEASE_LOCK, 1, lock, token);
    }
  }
}

// =============================================================================
// ALERTS
// =============================================================================

/**
 * Problems worth a look, most severe first. Derived from the per-project rows alone, so it
 * costs no extra query and always agrees with the table.
 */
export function buildAlerts(
  rows: GlobalAnalyticsProjectRow[],
  {compareVolume = true}: {compareVolume?: boolean} = {},
): GlobalAnalyticsAlert[] {
  const t = GLOBAL_ALERT_THRESHOLDS;
  const alerts: GlobalAnalyticsAlert[] = [];

  for (const row of rows) {
    const {current, previous} = row;
    const add = (kind: GlobalAnalyticsAlert['kind'], severity: GlobalAnalyticsAlertSeverity, value: number) =>
      alerts.push({kind, severity, projectId: row.id, projectName: row.name, value});

    if (row.disabled) {
      add('project_disabled', 'critical', 0);
    }

    if (current.sent >= t.MIN_SENT_FOR_RATES) {
      if (current.bounceRate >= t.BOUNCE_RATE_CRITICAL && current.bounced >= t.MIN_BOUNCES_CRITICAL) {
        add('high_bounce_rate', 'critical', current.bounceRate);
      } else if (current.bounceRate >= t.BOUNCE_RATE_WARNING && current.bounced >= t.MIN_BOUNCES_WARNING) {
        add('high_bounce_rate', 'warning', current.bounceRate);
      }

      if (current.complaintRate >= t.COMPLAINT_RATE_CRITICAL && current.complained >= t.MIN_COMPLAINTS_CRITICAL) {
        add('high_complaint_rate', 'critical', current.complaintRate);
      } else if (current.complaintRate >= t.COMPLAINT_RATE_WARNING && current.complained >= t.MIN_COMPLAINTS_WARNING) {
        add('high_complaint_rate', 'warning', current.complaintRate);
      }
    }

    if (current.failed > 0) {
      add('failed_emails', 'warning', current.failed);
    }

    if (!compareVolume) continue;

    if (previous.sent >= t.VOLUME_SPIKE_MIN_PREVIOUS && current.sent >= previous.sent * t.VOLUME_SPIKE_RATIO) {
      add('volume_spike', 'warning', Math.round((current.sent / previous.sent) * 10) / 10);
    }

    // A disabled project is already flagged, and its silence is expected
    if (!row.disabled && previous.sent > 0 && current.sent === 0 && current.failed === 0) {
      add('no_activity', 'info', previous.sent);
    }
  }

  return alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.projectName.localeCompare(b.projectName),
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/** Outbound, non-simulated emails of the projects in scope created in the period */
function emailScope(scope: Scope): Prisma.Sql {
  const streamFilter =
    scope.stream === 'ALL'
      ? Prisma.sql`e."sourceType" <> 'INBOUND'`
      : Prisma.sql`e."sourceType" = CAST(${scope.stream} AS "EmailSourceType")`;

  return Prisma.sql`
    e."projectId" = ANY(${scope.projectIds}::text[])
    AND e."createdAt" >= ${utc(scope.from)} AND e."createdAt" < ${utc(scope.to)}
    AND ${streamFilter}
    AND e."simulated" = false
  `;
}

const QUARTER_HOUR_MS = 15 * 60 * 1000;

/**
 * Bounds rounded to the quarter hour. Every timezone offset is a whole number of quarter
 * hours, so the local day boundaries the dashboard sends are unchanged, while a client
 * sending arbitrary timestamps can no longer mint a fresh cache key with every request.
 */
export function snapToQuarterHour(date: Date, direction: 'up' | 'down'): Date {
  const rounded = direction === 'down' ? Math.floor : Math.ceil;
  return new Date(rounded(date.getTime() / QUARTER_HOUR_MS) * QUARTER_HOUR_MS);
}

/**
 * The scope split into consecutive slices of its projects. A scope with no project still
 * yields one empty slice, so a timeseries keeps its buckets and draws zeros.
 */
function batches(scope: Scope, size: number): Scope[] {
  if (scope.projectIds.length === 0) return [scope];
  const slices: Scope[] = [];
  for (let i = 0; i < scope.projectIds.length; i += size) {
    slices.push({...scope, projectIds: scope.projectIds.slice(i, i + size)});
  }
  return slices;
}

function emptyProjectCounts(): ProjectCounts {
  return {...emptyCounts(), failed: 0, softBounces: 0};
}

function addProjectCounts(a: ProjectCounts, b: ProjectCounts): ProjectCounts {
  return {...addCounts(a, b), failed: a.failed + b.failed, softBounces: a.softBounces + b.softBounces};
}

export function toGlobalMetrics(counts: ProjectCounts): GlobalMetrics {
  return {...AnalyticsService.toMetrics(counts), failed: counts.failed, softBounces: counts.softBounces};
}

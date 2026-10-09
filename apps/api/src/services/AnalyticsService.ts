import {Prisma} from '@plunk/db';
import type {
  AnalyticsAudience,
  AnalyticsAudiencePoint,
  AnalyticsDeliverability,
  AnalyticsGranularity,
  AnalyticsHeatmap,
  AnalyticsLeaderboard,
  AnalyticsLeaderboardKind,
  AnalyticsLeaderboardRow,
  AnalyticsLinks,
  AnalyticsOverview,
  AnalyticsStream,
  AnalyticsStreamRow,
  AnalyticsTimeseries,
  AnalyticsTimeseriesPoint,
  AnalyticsTopEvents,
  EmailMetricCounts,
  EmailMetrics,
} from '@plunk/types';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';

/**
 * The filter every analytics query shares. `from` is inclusive and `to` exclusive; the
 * controller has already validated the timezone and clamped the range.
 */
export interface AnalyticsQuery {
  projectId: string;
  from: Date;
  to: Date;
  /** IANA timezone used to bucket by local hour and day */
  tz: string;
  stream: AnalyticsStream;
}

type CountRow = Record<keyof Omit<EmailMetricCounts, 'unsubscribed'>, bigint>;

const STREAMS: Exclude<AnalyticsStream, 'ALL'>[] = ['TRANSACTIONAL', 'CAMPAIGN', 'WORKFLOW'];

/**
 * Analytics Service
 *
 * Everything is computed live from the emails and events tables and cached in Redis.
 * The queries lean on the indexes built by jobs/background-index-builder.ts:
 *   - emails ("projectId", "createdAt") INCLUDE (...every timestamp, sourceType, simulated)
 *     answers the overview and timeseries counts from the index alone
 *   - events ("projectId", "name", "createdAt") serves links, heatmap, bounces and unsubscribes
 *   - contacts ("projectId", "createdAt", "id") serves audience growth
 *
 * Every query is bounded by project and a createdAt range of at most MAX_RANGE_DAYS, and
 * every list is capped, so cost scales with the period's volume, never the project's size.
 *
 * Emails sent to the SES mailbox simulator are excluded throughout, as they are from the
 * security rates: they are integration tests, not mail anyone received.
 */
export class AnalyticsService {
  public static readonly MAX_RANGE_DAYS = 92; // 90 days plus slack for DST and partial days
  public static readonly DEFAULT_RANGE_DAYS = 30;

  private static readonly CACHE_TTL = 300;
  /** Hourly views are mostly "today", which people watch move */
  private static readonly CACHE_TTL_HOURLY = 60;
  private static readonly LEADERBOARD_LIMIT = 50;
  private static readonly LINKS_LIMIT = 20;
  private static readonly PROVIDERS_LIMIT = 10;
  private static readonly EVENTS_LIMIT = 10;

  /** Hourly buckets up to two days, daily beyond that */
  public static granularityFor(from: Date, to: Date): AnalyticsGranularity {
    return to.getTime() - from.getTime() <= 49 * 60 * 60 * 1000 ? 'hour' : 'day';
  }

  /**
   * The period of equal length directly before the query's period. When the period has not
   * finished yet (it ends at midnight tonight), the previous one is cut at the same point in
   * time: "today so far" compares with "yesterday up to this hour", not with all of yesterday.
   */
  public static previousPeriod(query: AnalyticsQuery, now = Date.now()): AnalyticsQuery {
    const length = query.to.getTime() - query.from.getTime();
    const elapsed = Math.min(query.to.getTime(), now) - query.from.getTime();
    const from = query.from.getTime() - length;
    return {...query, from: new Date(from), to: new Date(from + Math.max(elapsed, 0))};
  }

  /**
   * Rates are measured against emails sent, matching the campaign stats endpoint, so the
   * same campaign shows the same open rate here and on its own page. Click-to-open is the
   * one exception: it answers "of the people who opened, how many clicked".
   */
  public static toMetrics(counts: EmailMetricCounts): EmailMetrics {
    const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0);

    return {
      ...counts,
      deliveryRate: pct(counts.delivered, counts.sent),
      openRate: pct(counts.opened, counts.sent),
      clickRate: pct(counts.clicked, counts.sent),
      clickToOpenRate: pct(counts.clicked, counts.opened),
      bounceRate: pct(counts.bounced, counts.sent),
      complaintRate: pct(counts.complained, counts.sent),
      unsubscribeRate: pct(counts.unsubscribed, counts.sent),
    };
  }

  // ===========================================================================
  // OVERVIEW
  // ===========================================================================

  public static async getOverview(query: AnalyticsQuery): Promise<AnalyticsOverview> {
    return this.cached('overview', query, async () => {
      const previous = this.previousPeriod(query);

      // Grouped by stream so one pass serves both the stream table and the totals
      const [currentByStream, previousByStream] = await Promise.all([
        this.countsByStream(query),
        this.countsByStream(previous),
      ]);

      const included = (stream: Exclude<AnalyticsStream, 'ALL'>) => query.stream === 'ALL' || query.stream === stream;
      const sum = (byStream: Map<string, EmailMetricCounts>) =>
        STREAMS.filter(included).reduce(
          (acc, stream) => addCounts(acc, byStream.get(stream) ?? emptyCounts()),
          emptyCounts(),
        );

      const streams: AnalyticsStreamRow[] = STREAMS.map(stream => ({
        stream,
        ...this.toMetrics(currentByStream.get(stream) ?? emptyCounts()),
      }));

      return {
        current: this.toMetrics(sum(currentByStream)),
        previous: this.toMetrics(sum(previousByStream)),
        streams,
      };
    });
  }

  private static async countsByStream(query: AnalyticsQuery): Promise<Map<string, EmailMetricCounts>> {
    const [counts, unsubscribes] = await Promise.all([
      prisma.$queryRaw<(CountRow & {stream: string})[]>`
        SELECT e."sourceType"::text AS stream, ${COUNT_COLUMNS}
        FROM "emails" e
        WHERE ${emailScope(query, 'ALL')}
        GROUP BY e."sourceType"
      `,
      prisma.$queryRaw<{stream: string; unsubscribed: bigint}[]>`
        SELECT e."sourceType"::text AS stream, COUNT(DISTINCT ev."contactId") AS unsubscribed
        FROM "events" ev
        JOIN "emails" e ON e."id" = ev."emailId"
        WHERE ${unsubscribeScope(query)} AND ${emailScope(query, 'ALL')}
        GROUP BY e."sourceType"
      `,
    ]);

    const byStream = new Map<string, EmailMetricCounts>();
    for (const row of counts) {
      byStream.set(row.stream, {...toCounts(row), unsubscribed: 0});
    }
    for (const row of unsubscribes) {
      const existing = byStream.get(row.stream) ?? emptyCounts();
      byStream.set(row.stream, {...existing, unsubscribed: Number(row.unsubscribed)});
    }
    return byStream;
  }

  // ===========================================================================
  // TIMESERIES
  // ===========================================================================

  public static async getTimeseries(query: AnalyticsQuery): Promise<AnalyticsTimeseries> {
    return this.cached('timeseries', query, async () => {
      const granularity = this.granularityFor(query.from, query.to);
      const [current, previous] = await Promise.all([
        this.emailSeries(query, granularity),
        this.emailSeries(this.previousPeriod(query), granularity),
      ]);
      return {granularity, current, previous};
    });
  }

  private static async emailSeries(
    query: AnalyticsQuery,
    granularity: AnalyticsGranularity,
  ): Promise<AnalyticsTimeseriesPoint[]> {
    const bucket = localBucket(Prisma.sql`e."createdAt"`, query.tz, granularity);
    const rows = await prisma.$queryRaw<(CountRow & {bucket: string; unsubscribed: bigint})[]>`
      WITH buckets AS (${bucketSeries(query, granularity)}),
      counts AS (
        SELECT ${bucket} AS bucket, ${COUNT_COLUMNS}
        FROM "emails" e
        WHERE ${emailScope(query)}
        GROUP BY 1
      ),
      unsubscribes AS (
        SELECT ${bucket} AS bucket, COUNT(DISTINCT ev."contactId") AS unsubscribed
        FROM "events" ev
        JOIN "emails" e ON e."id" = ev."emailId"
        WHERE ${unsubscribeScope(query)} AND ${emailScope(query)}
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI') AS bucket,
        COALESCE(c.sent, 0) AS sent, COALESCE(c.delivered, 0) AS delivered,
        COALESCE(c.opened, 0) AS opened, COALESCE(c.clicked, 0) AS clicked,
        COALESCE(c.bounced, 0) AS bounced, COALESCE(c.complained, 0) AS complained,
        COALESCE(u.unsubscribed, 0) AS unsubscribed
      FROM buckets b
      LEFT JOIN counts c ON c.bucket = b.bucket
      LEFT JOIN unsubscribes u ON u.bucket = b.bucket
      ORDER BY b.bucket
    `;

    return rows.map(row => ({bucket: row.bucket, ...toCounts(row), unsubscribed: Number(row.unsubscribed)}));
  }

  // ===========================================================================
  // DELIVERABILITY
  // ===========================================================================

  public static async getDeliverability(query: AnalyticsQuery): Promise<AnalyticsDeliverability> {
    return this.cached('deliverability', query, async () => {
      const [[totals], [soft], providers] = await Promise.all([
        prisma.$queryRaw<{bounced: bigint; complained: bigint}[]>`
          SELECT COUNT(e."bouncedAt") AS bounced, COUNT(e."complainedAt") AS complained
          FROM "emails" e
          WHERE ${emailScope(query)}
        `,
        // Transient bounces never touch the email row, so they only exist as events.
        // Counted per email, since SES retries and reports each attempt.
        prisma.$queryRaw<{count: bigint}[]>`
          SELECT COUNT(DISTINCT ev."emailId") AS count
          FROM "events" ev
          WHERE ev."projectId" = ${query.projectId}
            AND ev."name" = 'email.bounce'
            AND ev."createdAt" >= ${utc(query.from)} AND ev."createdAt" < ${utc(query.to)}
            AND ev."data"->>'transientBounce' = 'true'
            ${eventStreamFilter(query.stream)}
        `,
        prisma.$queryRaw<(CountRow & {domain: string})[]>`
          SELECT lower(split_part(c."email", '@', 2)) AS domain, ${COUNT_COLUMNS}
          FROM "emails" e
          JOIN "contacts" c ON c."id" = e."contactId"
          WHERE ${emailScope(query)}
          GROUP BY 1
          ORDER BY sent DESC
          LIMIT ${this.PROVIDERS_LIMIT}
        `,
      ]);

      return {
        hardBounces: Number(totals?.bounced ?? 0),
        softBounces: Number(soft?.count ?? 0),
        complaints: Number(totals?.complained ?? 0),
        providers: providers.map(row => {
          const metrics = this.toMetrics({...toCounts(row), unsubscribed: 0});
          return {
            domain: row.domain,
            sent: metrics.sent,
            deliveryRate: metrics.deliveryRate,
            openRate: metrics.openRate,
            bounceRate: metrics.bounceRate,
            complaintRate: metrics.complaintRate,
          };
        }),
      };
    });
  }

  // ===========================================================================
  // LEADERBOARDS
  // ===========================================================================

  public static async getLeaderboard(
    query: AnalyticsQuery,
    kind: AnalyticsLeaderboardKind,
  ): Promise<AnalyticsLeaderboard> {
    return this.cached(`leaderboard:${kind}`, query, async () => {
      const rows =
        kind === 'campaigns'
          ? await this.campaignLeaderboard(query)
          : kind === 'templates'
            ? await this.templateLeaderboard(query)
            : await this.workflowLeaderboard(query);
      return {kind, rows};
    });
  }

  /**
   * Campaigns keep reconciled counters on their own row, so this reads those instead of
   * recounting their emails, and the numbers match the campaign page exactly. A campaign
   * belongs to the period it started sending in.
   */
  private static async campaignLeaderboard(query: AnalyticsQuery): Promise<AnalyticsLeaderboardRow[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        projectId: query.projectId,
        status: {in: ['SENDING', 'SENT']},
        sentAt: {gte: query.from, lt: query.to},
      },
      select: {
        id: true,
        name: true,
        sentAt: true,
        sentCount: true,
        deliveredCount: true,
        openedCount: true,
        clickedCount: true,
        bouncedCount: true,
        complainedCount: true,
        unsubscribedCount: true,
      },
      orderBy: {sentAt: 'desc'},
      take: this.LEADERBOARD_LIMIT,
    });

    return campaigns.map(c => ({
      id: c.id,
      name: c.name,
      sentAt: c.sentAt?.toISOString() ?? null,
      ...this.toMetrics({
        sent: c.sentCount,
        delivered: c.deliveredCount,
        opened: c.openedCount,
        clicked: c.clickedCount,
        bounced: c.bouncedCount,
        complained: c.complainedCount,
        unsubscribed: c.unsubscribedCount,
      }),
    }));
  }

  private static async templateLeaderboard(query: AnalyticsQuery): Promise<AnalyticsLeaderboardRow[]> {
    const scoped = {...query, stream: 'TRANSACTIONAL' as const};
    const [counts, unsubscribes] = await Promise.all([
      prisma.$queryRaw<(CountRow & {id: string | null})[]>`
        SELECT e."templateId" AS id, ${COUNT_COLUMNS}
        FROM "emails" e
        WHERE ${emailScope(scoped)}
        GROUP BY 1
        ORDER BY sent DESC
        LIMIT ${this.LEADERBOARD_LIMIT}
      `,
      prisma.$queryRaw<{id: string | null; unsubscribed: bigint}[]>`
        SELECT e."templateId" AS id, COUNT(DISTINCT ev."contactId") AS unsubscribed
        FROM "events" ev
        JOIN "emails" e ON e."id" = ev."emailId"
        WHERE ${unsubscribeScope(scoped)} AND ${emailScope(scoped)}
        GROUP BY 1
      `,
    ]);

    const ids = counts.map(row => row.id).filter((id): id is string => id !== null);
    const templates = await prisma.template.findMany({where: {id: {in: ids}}, select: {id: true, name: true}});
    const names = new Map(templates.map(t => [t.id, t.name]));

    return mergeLeaderboard(counts, unsubscribes, id =>
      id === null ? 'Sent without a template' : (names.get(id) ?? 'Deleted template'),
    );
  }

  private static async workflowLeaderboard(query: AnalyticsQuery): Promise<AnalyticsLeaderboardRow[]> {
    const scoped = {...query, stream: 'WORKFLOW' as const};
    const [counts, unsubscribes] = await Promise.all([
      prisma.$queryRaw<(CountRow & {id: string})[]>`
        SELECT we."workflowId" AS id, ${COUNT_COLUMNS}
        FROM "emails" e
        JOIN "workflow_executions" we ON we."id" = e."workflowExecutionId"
        WHERE ${emailScope(scoped)}
        GROUP BY 1
        ORDER BY sent DESC
        LIMIT ${this.LEADERBOARD_LIMIT}
      `,
      prisma.$queryRaw<{id: string; unsubscribed: bigint}[]>`
        SELECT we."workflowId" AS id, COUNT(DISTINCT ev."contactId") AS unsubscribed
        FROM "events" ev
        JOIN "emails" e ON e."id" = ev."emailId"
        JOIN "workflow_executions" we ON we."id" = e."workflowExecutionId"
        WHERE ${unsubscribeScope(scoped)} AND ${emailScope(scoped)}
        GROUP BY 1
      `,
    ]);

    const workflows = await prisma.workflow.findMany({
      where: {id: {in: counts.map(row => row.id)}},
      select: {id: true, name: true},
    });
    const names = new Map(workflows.map(w => [w.id, w.name]));

    return mergeLeaderboard(counts, unsubscribes, id => (id && names.get(id)) ?? 'Deleted workflow');
  }

  // ===========================================================================
  // LINKS & HEATMAP
  // ===========================================================================

  public static async getLinks(query: AnalyticsQuery): Promise<AnalyticsLinks> {
    return this.cached('links', query, async () => {
      const [links, [total]] = await Promise.all([
        prisma.$queryRaw<{url: string; clicks: bigint; unique_clickers: bigint}[]>`
          SELECT ev."data"->>'link' AS url, COUNT(*) AS clicks, COUNT(DISTINCT ev."contactId") AS unique_clickers
          FROM "events" ev
          WHERE ${clickScope(query)} AND ev."data"->>'link' IS NOT NULL
          GROUP BY 1
          ORDER BY clicks DESC
          LIMIT ${this.LINKS_LIMIT}
        `,
        prisma.$queryRaw<{count: bigint}[]>`
          SELECT COUNT(*) AS count FROM "events" ev WHERE ${clickScope(query)}
        `,
      ]);

      return {
        totalClicks: Number(total?.count ?? 0),
        links: links.map(row => ({
          url: row.url,
          clicks: Number(row.clicks),
          uniqueClickers: Number(row.unique_clickers),
        })),
      };
    });
  }

  /**
   * When recipients first open and first click, by local weekday and hour. Repeat opens
   * are left out so one person rereading a receipt does not paint a hotspot.
   */
  public static async getHeatmap(query: AnalyticsQuery): Promise<AnalyticsHeatmap> {
    return this.cached('heatmap', query, async () => {
      const rows = await prisma.$queryRaw<{day: number; hour: number; opens: bigint; clicks: bigint}[]>`
        SELECT
          (EXTRACT(ISODOW FROM s.local)::int - 1) AS day,
          EXTRACT(HOUR FROM s.local)::int AS hour,
          COUNT(*) FILTER (WHERE s.name = 'email.open') AS opens,
          COUNT(*) FILTER (WHERE s.name = 'email.click') AS clicks
        FROM (
          SELECT ev."name", (ev."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${query.tz} AS local
          FROM "events" ev
          WHERE ev."projectId" = ${query.projectId}
            AND ev."name" IN ('email.open', 'email.click')
            AND ev."createdAt" >= ${utc(query.from)} AND ev."createdAt" < ${utc(query.to)}
            AND (ev."data"->>'isFirstOpen' = 'true' OR ev."data"->>'isFirstClick' = 'true')
            ${eventStreamFilter(query.stream)}
        ) s
        GROUP BY 1, 2
      `;

      return {
        cells: rows.map(row => ({
          day: row.day,
          hour: row.hour,
          opens: Number(row.opens),
          clicks: Number(row.clicks),
        })),
      };
    });
  }

  // ===========================================================================
  // AUDIENCE
  // ===========================================================================

  /** Contacts are not tied to a stream, so the stream filter does not apply here */
  public static async getAudience(query: AnalyticsQuery): Promise<AnalyticsAudience> {
    const scoped = {...query, stream: 'ALL' as const};
    return this.cached('audience', scoped, async () => {
      const granularity = this.granularityFor(scoped.from, scoped.to);
      const [[contacts], current, previous] = await Promise.all([
        prisma.$queryRaw<{total: bigint; subscribed: bigint}[]>`
          SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE "subscribed") AS subscribed
          FROM "contacts"
          WHERE "projectId" = ${scoped.projectId}
        `,
        this.audienceSeries(scoped, granularity),
        this.audienceSeries(this.previousPeriod(scoped), granularity),
      ]);

      return {
        totalContacts: Number(contacts?.total ?? 0),
        subscribedContacts: Number(contacts?.subscribed ?? 0),
        granularity,
        current,
        totals: sumAudience(current),
        previousTotals: sumAudience(previous),
      };
    });
  }

  private static async audienceSeries(
    query: AnalyticsQuery,
    granularity: AnalyticsGranularity,
  ): Promise<AnalyticsAudiencePoint[]> {
    const rows = await prisma.$queryRaw<
      {bucket: string; new_contacts: bigint; unsubscribed: bigint; suppressed: bigint}[]
    >`
      WITH buckets AS (${bucketSeries(query, granularity)}),
      created AS (
        SELECT ${localBucket(Prisma.sql`c."createdAt"`, query.tz, granularity)} AS bucket, COUNT(*) AS n
        FROM "contacts" c
        WHERE c."projectId" = ${query.projectId}
          AND c."createdAt" >= ${utc(query.from)} AND c."createdAt" < ${utc(query.to)}
        GROUP BY 1
      ),
      lost AS (
        SELECT ${localBucket(Prisma.sql`ev."createdAt"`, query.tz, granularity)} AS bucket,
          COUNT(DISTINCT ev."contactId") FILTER (WHERE ev."name" = 'contact.unsubscribed') AS unsubscribed,
          COUNT(DISTINCT ev."contactId") FILTER (
            WHERE ev."name" = 'email.complaint'
              OR (ev."name" = 'email.bounce' AND ev."data"->>'transientBounce' IS NULL)
          ) AS suppressed
        FROM "events" ev
        WHERE ev."projectId" = ${query.projectId}
          AND ev."name" IN ('contact.unsubscribed', 'email.bounce', 'email.complaint')
          AND ev."createdAt" >= ${utc(query.from)} AND ev."createdAt" < ${utc(query.to)}
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI') AS bucket,
        COALESCE(cr.n, 0) AS new_contacts,
        COALESCE(l.unsubscribed, 0) AS unsubscribed,
        COALESCE(l.suppressed, 0) AS suppressed
      FROM buckets b
      LEFT JOIN created cr ON cr.bucket = b.bucket
      LEFT JOIN lost l ON l.bucket = b.bucket
      ORDER BY b.bucket
    `;

    return rows.map(row => ({
      bucket: row.bucket,
      newContacts: Number(row.new_contacts),
      unsubscribed: Number(row.unsubscribed),
      suppressed: Number(row.suppressed),
    }));
  }

  // ===========================================================================
  // CUSTOM EVENTS
  // ===========================================================================

  public static async getTopEvents(query: AnalyticsQuery): Promise<AnalyticsTopEvents> {
    const scoped = {...query, stream: 'ALL' as const};
    return this.cached('events', scoped, async () => {
      const previous = this.previousPeriod(scoped);
      // Plunk's own email.* and contact.* events are covered by the rest of the page
      const custom: Prisma.EventWhereInput = {
        projectId: scoped.projectId,
        NOT: [{name: {startsWith: 'email.'}}, {name: {startsWith: 'contact.'}}],
      };

      const current = await prisma.event.groupBy({
        by: ['name'],
        where: {...custom, createdAt: {gte: scoped.from, lt: scoped.to}},
        _count: {_all: true},
        orderBy: {_count: {name: 'desc'}},
        take: this.EVENTS_LIMIT,
      });

      const before = await prisma.event.groupBy({
        by: ['name'],
        where: {
          projectId: scoped.projectId,
          name: {in: current.map(e => e.name)},
          createdAt: {gte: previous.from, lt: previous.to},
        },
        _count: {_all: true},
      });
      const previousCounts = new Map(before.map(e => [e.name, e._count._all]));

      return {
        events: current.map(e => ({
          name: e.name,
          count: e._count._all,
          previousCount: previousCounts.get(e.name) ?? 0,
        })),
      };
    });
  }

  // ===========================================================================
  // CACHE
  // ===========================================================================

  private static async cached<T>(kind: string, query: AnalyticsQuery, compute: () => Promise<T>): Promise<T> {
    const key = Keys.Analytics.query(
      query.projectId,
      kind,
      `${query.from.toISOString()}:${query.to.toISOString()}:${query.tz}:${query.stream}`,
    );

    const hit = await redis.get(key);
    if (hit) {
      return JSON.parse(hit) as T;
    }

    const value = await compute();
    const ttl = this.granularityFor(query.from, query.to) === 'hour' ? this.CACHE_TTL_HOURLY : this.CACHE_TTL;
    await redis.setex(key, ttl, JSON.stringify(value));
    return value;
  }
}

// =============================================================================
// SQL BUILDING BLOCKS
// =============================================================================

/**
 * createdAt columns are `timestamp` holding UTC. Bounds are passed as UTC timestamps of
 * the same type so the comparison is a plain index range, independent of session timezone.
 */
function utc(date: Date): Prisma.Sql {
  return Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

/** A UTC timestamp column truncated to the local hour or day in `tz` */
function localBucket(column: Prisma.Sql, tz: string, granularity: AnalyticsGranularity): Prisma.Sql {
  return Prisma.sql`date_trunc(${granularity}, (${column} AT TIME ZONE 'UTC') AT TIME ZONE ${tz})`;
}

/**
 * Every local bucket in the range, so quiet hours and days come back as zeros instead of
 * gaps. Stops at the current bucket: a range that ends tomorrow does not draw a cliff
 * through hours that have not happened yet.
 */
function bucketSeries(query: AnalyticsQuery, granularity: AnalyticsGranularity): Prisma.Sql {
  const end = new Date(Math.min(query.to.getTime(), Date.now() + 1000) - 1);
  const start = new Date(Math.min(query.from.getTime(), end.getTime()));
  return Prisma.sql`
    SELECT generate_series(
      date_trunc(${granularity}, ${start.toISOString()}::timestamptz AT TIME ZONE ${query.tz}),
      date_trunc(${granularity}, ${end.toISOString()}::timestamptz AT TIME ZONE ${query.tz}),
      CAST(${`1 ${granularity}`} AS interval)
    ) AS bucket
  `;
}

/** Outbound, non-simulated emails of the project created in the period, optionally one stream */
function emailScope(query: AnalyticsQuery, stream: AnalyticsStream = query.stream): Prisma.Sql {
  const streamFilter =
    stream === 'ALL'
      ? Prisma.sql`e."sourceType" <> 'INBOUND'`
      : Prisma.sql`e."sourceType" = CAST(${stream} AS "EmailSourceType")`;

  return Prisma.sql`
    e."projectId" = ${query.projectId}
    AND e."createdAt" >= ${utc(query.from)} AND e."createdAt" < ${utc(query.to)}
    AND ${streamFilter}
    AND e."simulated" = false
  `;
}

/**
 * Unsubscribe events that came from an email. An unsubscribe always follows the email, so
 * the event's own lower bound lets the events index narrow the scan before the join.
 */
function unsubscribeScope(query: AnalyticsQuery): Prisma.Sql {
  return Prisma.sql`
    ev."projectId" = ${query.projectId}
    AND ev."name" = 'contact.unsubscribed'
    AND ev."createdAt" >= ${utc(query.from)}
  `;
}

function clickScope(query: AnalyticsQuery): Prisma.Sql {
  return Prisma.sql`
    ev."projectId" = ${query.projectId}
    AND ev."name" = 'email.click'
    AND ev."createdAt" >= ${utc(query.from)} AND ev."createdAt" < ${utc(query.to)}
    ${eventStreamFilter(query.stream)}
  `;
}

/** Email events carry the email's sourceType in their data, so no join is needed */
function eventStreamFilter(stream: AnalyticsStream): Prisma.Sql {
  return stream === 'ALL' ? Prisma.empty : Prisma.sql`AND ev."data"->>'sourceType' = ${stream}`;
}

const COUNT_COLUMNS = Prisma.sql`
  COUNT(e."sentAt") AS sent,
  COUNT(e."deliveredAt") AS delivered,
  COUNT(e."openedAt") AS opened,
  COUNT(e."clickedAt") AS clicked,
  COUNT(e."bouncedAt") AS bounced,
  COUNT(e."complainedAt") AS complained
`;

// =============================================================================
// HELPERS
// =============================================================================

function emptyCounts(): EmailMetricCounts {
  return {sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, unsubscribed: 0};
}

function addCounts(a: EmailMetricCounts, b: EmailMetricCounts): EmailMetricCounts {
  return {
    sent: a.sent + b.sent,
    delivered: a.delivered + b.delivered,
    opened: a.opened + b.opened,
    clicked: a.clicked + b.clicked,
    bounced: a.bounced + b.bounced,
    complained: a.complained + b.complained,
    unsubscribed: a.unsubscribed + b.unsubscribed,
  };
}

function toCounts(row: CountRow): Omit<EmailMetricCounts, 'unsubscribed'> {
  return {
    sent: Number(row.sent),
    delivered: Number(row.delivered),
    opened: Number(row.opened),
    clicked: Number(row.clicked),
    bounced: Number(row.bounced),
    complained: Number(row.complained),
  };
}

function mergeLeaderboard<Id extends string | null>(
  counts: (CountRow & {id: Id})[],
  unsubscribes: {id: Id; unsubscribed: bigint}[],
  nameFor: (id: Id) => string,
): AnalyticsLeaderboardRow[] {
  const unsubscribed = new Map(unsubscribes.map(row => [row.id, Number(row.unsubscribed)]));
  return counts.map(row => ({
    id: row.id,
    name: nameFor(row.id),
    ...AnalyticsService.toMetrics({...toCounts(row), unsubscribed: unsubscribed.get(row.id) ?? 0}),
  }));
}

function sumAudience(points: AnalyticsAudiencePoint[]): AnalyticsAudience['totals'] {
  return points.reduce(
    (acc, p) => ({
      newContacts: acc.newContacts + p.newContacts,
      unsubscribed: acc.unsubscribed + p.unsubscribed,
      suppressed: acc.suppressed + p.suppressed,
    }),
    {newContacts: 0, unsubscribed: 0, suppressed: 0},
  );
}

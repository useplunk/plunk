/**
 * Analytics API types
 *
 * Every rate is a percentage (0-100) measured against emails sent in the period, except
 * click-to-open, which is measured against emails opened. Periods are cohorts: an email
 * belongs to the period it was created in, and its opens, clicks, bounces and complaints
 * count toward that period whenever they arrive.
 */

/** Which emails a query covers. ALL is every outbound stream; inbound mail is never counted. */
export type AnalyticsStream = 'ALL' | 'TRANSACTIONAL' | 'CAMPAIGN' | 'WORKFLOW';

export type AnalyticsGranularity = 'hour' | 'day';

export interface EmailMetricCounts {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
}

export interface EmailMetricRates {
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
}

export type EmailMetrics = EmailMetricCounts & EmailMetricRates;

export interface AnalyticsStreamRow extends EmailMetrics {
  stream: Exclude<AnalyticsStream, 'ALL'>;
}

/** GET /analytics/overview */
export interface AnalyticsOverview {
  current: EmailMetrics;
  previous: EmailMetrics;
  /** Per-stream breakdown of the current period, regardless of the stream filter */
  streams: AnalyticsStreamRow[];
}

export interface AnalyticsTimeseriesPoint {
  /** Bucket start in the requested timezone, as a local time without offset: 2026-10-09T14:00 */
  bucket: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
}

/** GET /analytics/timeseries */
export interface AnalyticsTimeseries {
  granularity: AnalyticsGranularity;
  current: AnalyticsTimeseriesPoint[];
  /** The preceding period of equal length, bucket for bucket, so index i lines up with current[i] */
  previous: AnalyticsTimeseriesPoint[];
}

export interface AnalyticsMailboxProviderRow {
  /** Recipient domain, e.g. gmail.com */
  domain: string;
  sent: number;
  deliveryRate: number;
  openRate: number;
  bounceRate: number;
  complaintRate: number;
}

/** GET /analytics/deliverability */
export interface AnalyticsDeliverability {
  /** Permanent bounces; these suppress the contact and count toward the bounce rate */
  hardBounces: number;
  /** Transient bounces (mailbox full, out of office); delivery may still succeed on retry */
  softBounces: number;
  complaints: number;
  providers: AnalyticsMailboxProviderRow[];
}

export type AnalyticsLeaderboardKind = 'campaigns' | 'templates' | 'workflows';

export interface AnalyticsLeaderboardRow extends EmailMetrics {
  /** Null for the transactional row that groups emails sent without a template */
  id: string | null;
  name: string;
  /** Campaigns only: when the send started */
  sentAt?: string | null;
}

/** GET /analytics/leaderboard */
export interface AnalyticsLeaderboard {
  kind: AnalyticsLeaderboardKind;
  rows: AnalyticsLeaderboardRow[];
}

export interface AnalyticsLinkRow {
  url: string;
  clicks: number;
  uniqueClickers: number;
}

/** GET /analytics/links */
export interface AnalyticsLinks {
  totalClicks: number;
  links: AnalyticsLinkRow[];
}

export interface AnalyticsHeatmapCell {
  /** 0 = Monday ... 6 = Sunday */
  day: number;
  hour: number;
  opens: number;
  clicks: number;
}

/** GET /analytics/heatmap: first opens and first clicks by local weekday and hour */
export interface AnalyticsHeatmap {
  cells: AnalyticsHeatmapCell[];
}

export interface AnalyticsAudiencePoint {
  bucket: string;
  newContacts: number;
  unsubscribed: number;
  /** Contacts suppressed by a hard bounce or a spam complaint */
  suppressed: number;
}

/** GET /analytics/audience */
export interface AnalyticsAudience {
  totalContacts: number;
  subscribedContacts: number;
  granularity: AnalyticsGranularity;
  current: AnalyticsAudiencePoint[];
  totals: {newContacts: number; unsubscribed: number; suppressed: number};
  previousTotals: {newContacts: number; unsubscribed: number; suppressed: number};
}

export interface AnalyticsTopEvent {
  name: string;
  count: number;
  previousCount: number;
}

/** GET /analytics/events: custom events only, Plunk's own email.* and contact.* events are left out */
export interface AnalyticsTopEvents {
  events: AnalyticsTopEvent[];
}

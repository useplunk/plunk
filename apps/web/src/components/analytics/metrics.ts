import type {AnalyticsGranularity, AnalyticsTimeseriesPoint} from '@plunk/types';
import dayjs from 'dayjs';

export type MetricKey =
  | 'sent'
  | 'deliveryRate'
  | 'openRate'
  | 'clickRate'
  | 'clickToOpenRate'
  | 'bounceRate'
  | 'complaintRate'
  | 'unsubscribeRate';

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  kind: 'count' | 'rate';
  /** Which direction is an improvement */
  better: 'up' | 'down';
  /** Plunk's own 7-day enforcement levels (SecurityService), so every screen agrees on "too high" */
  thresholds?: {warning: number; critical: number};
  /** Per-bucket value, null when there is nothing to measure against */
  fromPoint: (p: AnalyticsTimeseriesPoint) => number | null;
}

const ratio = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);

export const METRICS: MetricDefinition[] = [
  {key: 'sent', label: 'Sent', kind: 'count', better: 'up', fromPoint: p => p.sent},
  {key: 'deliveryRate', label: 'Delivery rate', kind: 'rate', better: 'up', fromPoint: p => ratio(p.delivered, p.sent)},
  {key: 'openRate', label: 'Open rate', kind: 'rate', better: 'up', fromPoint: p => ratio(p.opened, p.sent)},
  {key: 'clickRate', label: 'Click rate', kind: 'rate', better: 'up', fromPoint: p => ratio(p.clicked, p.sent)},
  {
    key: 'clickToOpenRate',
    label: 'Click-to-open',
    kind: 'rate',
    better: 'up',
    fromPoint: p => ratio(p.clicked, p.opened),
  },
  {
    key: 'bounceRate',
    label: 'Bounce rate',
    kind: 'rate',
    better: 'down',
    thresholds: {warning: 5, critical: 10},
    fromPoint: p => ratio(p.bounced, p.sent),
  },
  {
    key: 'complaintRate',
    label: 'Complaint rate',
    kind: 'rate',
    better: 'down',
    thresholds: {warning: 0.075, critical: 0.15},
    fromPoint: p => ratio(p.complained, p.sent),
  },
  {
    key: 'unsubscribeRate',
    label: 'Unsubscribe rate',
    kind: 'rate',
    better: 'down',
    fromPoint: p => ratio(p.unsubscribed, p.sent),
  },
];

export const metric = (key: MetricKey) => METRICS.find(m => m.key === key)!;

// =============================================================================
// FORMATTING
// =============================================================================

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/** Compact for axes: 12.4k */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 1}).format(n);
}

/**
 * Percentages keep enough precision to be told apart: complaint rates live in the
 * hundredths of a percent, open rates do not need them.
 */
export function formatRate(n: number): string {
  const abs = Math.abs(n);
  const digits = abs === 0 ? 0 : abs < 0.1 ? 3 : abs < 1 ? 2 : 1;
  return `${n.toFixed(digits)}%`;
}

export function formatValue(def: Pick<MetricDefinition, 'kind'>, n: number): string {
  return def.kind === 'count' ? formatCount(n) : formatRate(n);
}

export function thresholdTone(def: MetricDefinition, value: number, volume: number): string {
  // A handful of sends cannot make a rate meaningful, mirroring the minimum counts the
  // enforcement itself requires
  if (!def.thresholds || volume < 100) return 'text-neutral-900';
  if (value >= def.thresholds.critical) return 'text-red-600';
  if (value >= def.thresholds.warning) return 'text-amber-600';
  return 'text-neutral-900';
}

export interface Delta {
  label: string;
  tone: 'better' | 'worse' | 'flat';
  /** Screen-reader sentence */
  description: string;
}

/**
 * Change against the previous period. Counts compare as a percentage, rates as a
 * difference in percentage points, which is what people mean by "open rate went up 2".
 */
export function computeDelta(
  def: Pick<MetricDefinition, 'kind' | 'better'>,
  current: number,
  previous: number,
  previousVolume: number,
): Delta | null {
  if (previousVolume === 0) return null;

  let change: number;
  let label: string;
  let flat: boolean;

  if (def.kind === 'count') {
    if (previous === 0) return null;
    change = ((current - previous) / previous) * 100;
    flat = Math.abs(change) < 0.5;
    const abs = Math.abs(change);
    label = `${change > 0 ? '+' : change < 0 ? '−' : ''}${abs >= 100 ? abs.toFixed(0) : abs.toFixed(1)}%`;
  } else {
    change = current - previous;
    const abs = Math.abs(change);
    flat = abs < 0.005;
    label = `${change > 0 ? '+' : change < 0 ? '−' : ''}${abs < 0.1 ? abs.toFixed(3) : abs < 1 ? abs.toFixed(2) : abs.toFixed(1)} pts`;
  }

  const improved = def.better === 'up' ? change > 0 : change < 0;
  const tone = flat ? 'flat' : improved ? 'better' : 'worse';
  return {
    label: flat ? 'No change' : label,
    tone,
    description: flat ? 'unchanged from the previous period' : `${label} compared with the previous period`,
  };
}

export const DELTA_TONE: Record<Delta['tone'], string> = {
  better: 'text-emerald-700',
  worse: 'text-red-600',
  flat: 'text-neutral-400',
};

/** Axis label for a bucket */
export function formatBucket(bucket: string, granularity: AnalyticsGranularity): string {
  const d = dayjs(bucket);
  return granularity === 'hour' ? d.format('HH:mm') : d.format('MMM D');
}

/** Tooltip label for a bucket */
export function formatBucketLong(bucket: string, granularity: AnalyticsGranularity): string {
  const d = dayjs(bucket);
  return granularity === 'hour' ? d.format('ddd, MMM D · HH:mm') : d.format('ddd, MMM D, YYYY');
}


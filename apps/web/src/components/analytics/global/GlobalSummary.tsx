import type {GlobalAnalyticsOverview, GlobalAnalyticsTimeseries, GlobalMetrics} from '@plunk/types';

import {type GlobalAnalyticsFilters, useGlobalAnalyticsData} from '../../../lib/hooks/useGlobalAnalytics';
import {MetricChart} from '../MetricChart';
import {type MetricKey, computeDelta, formatCount, formatValue, metric, thresholdTone} from '../metrics';
import {
  ChartSkeleton,
  DeltaLabel,
  type Figure,
  FigureBand,
  Panel,
  PanelEmpty,
  PanelError,
  PeriodLegend,
} from '../primitives';

const HEADLINE_RATES: MetricKey[] = ['deliveryRate', 'openRate', 'clickRate'];

/**
 * The instance at a glance: headline figures with their change against the previous period,
 * delivery problems counted outright, and the volume over time.
 */
export function GlobalSummary({filters}: {filters: GlobalAnalyticsFilters}) {
  const overview = useGlobalAnalyticsData<GlobalAnalyticsOverview>('overview', filters);
  const series = useGlobalAnalyticsData<GlobalAnalyticsTimeseries>('timeseries', filters);

  const current = overview.data?.current;
  const previous = overview.data?.previous;
  const empty = current?.sent === 0;
  const failed = !!overview.error && !overview.data;

  /** A headline figure with its change; `count` puts the absolute number next to a rate */
  const figure = (key: MetricKey, label?: string, count?: (m: GlobalMetrics) => number): Figure => {
    const def = metric(key);
    if (!current || !previous) return {label: label ?? def.label};
    const value = current[key];
    const delta = <DeltaLabel delta={empty ? null : computeDelta(def, value, previous[key], previous.sent)} />;
    return {
      label: label ?? def.label,
      value: empty && def.kind === 'rate' ? '—' : formatValue(def, value),
      tone: thresholdTone(def, value, current.sent),
      detail:
        count && !empty ? (
          <>
            {formatCount(count(current))} · {delta}
          </>
        ) : (
          delta
        ),
    };
  };

  return (
    <div className="space-y-4">
      <FigureBand figures={[figure('sent'), ...HEADLINE_RATES.map(key => figure(key))]} failed={failed} />
      <FigureBand
        figures={[
          figure('bounceRate', 'Hard bounce rate', m => m.bounced),
          figure('complaintRate', 'Complaint rate', m => m.complained),
          countFigure('Soft bounces', current, m => m.softBounces, 'Emails with a temporary bounce'),
          countFigure('Failed', current, m => m.failed, 'Rejected before reaching the provider'),
        ]}
        failed={failed}
      />

      <Panel
        title={`Emails sent ${series.data?.granularity === 'hour' ? 'by hour' : 'by day'}`}
        description="All selected projects together, against the previous period."
        actions={<PeriodLegend />}
      >
        {series.error && !series.data ? (
          <PanelError onRetry={() => void series.mutate()} />
        ) : !series.data ? (
          <ChartSkeleton />
        ) : series.data.current.every(p => p.sent === 0) ? (
          <PanelEmpty height={260}>No emails were sent in this period.</PanelEmpty>
        ) : (
          <div className="px-2 pb-3 sm:px-3">
            <MetricChart
              def={metric('sent')}
              current={series.data.current}
              previous={series.data.previous}
              granularity={series.data.granularity}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

function countFigure(
  label: string,
  current: GlobalMetrics | undefined,
  pick: (m: GlobalMetrics) => number,
  detail?: string,
): Figure {
  if (!current) return {label};
  const value = pick(current);
  return {label, value: formatCount(value), tone: value > 0 ? 'text-neutral-900' : 'text-neutral-400', detail};
}

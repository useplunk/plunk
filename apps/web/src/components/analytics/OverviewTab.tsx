import type {AnalyticsOverview, AnalyticsStreamRow, AnalyticsTimeseries} from '@plunk/types';
import {Skeleton, cn} from '@plunk/ui';
import {useState} from 'react';

import {type AnalyticsFilters, STREAM_OPTIONS, useAnalyticsData} from '../../lib/hooks/useAnalytics';
import {MetricChart} from './MetricChart';
import {
  computeDelta,
  formatCount,
  formatRate,
  formatValue,
  METRICS,
  metric,
  type MetricKey,
  thresholdTone,
} from './metrics';
import {ChartSkeleton, DeltaLabel, Panel, PanelEmpty, PanelError, RowsSkeleton} from './primitives';
import {type Column, RateTable} from './RateTable';

const STREAM_LABEL: Record<AnalyticsStreamRow['stream'], string> = {
  TRANSACTIONAL: 'Transactional',
  CAMPAIGN: 'Campaigns',
  WORKFLOW: 'Workflows',
};

export function OverviewTab({filters}: {filters: AnalyticsFilters}) {
  const [selected, setSelected] = useState<MetricKey>('sent');
  const overview = useAnalyticsData<AnalyticsOverview>('overview', filters);
  const series = useAnalyticsData<AnalyticsTimeseries>('timeseries', filters);

  const def = metric(selected);
  const current = overview.data?.current;
  const previous = overview.data?.previous;
  const empty = current?.sent === 0;

  // Context that changes how the numbers should be read, shown only when it applies
  const notes: string[] = [];
  if (filters.range === 'today') {
    notes.push('Emails sent today are still being opened and clicked, so the rates above rise through the day.');
  }
  if (selected === 'openRate' || selected === 'clickToOpenRate') {
    notes.push(
      'Apple Mail and some corporate filters open every message on delivery, so open rates read high. Clicks are the more dependable signal of attention.',
    );
  }

  return (
    <div className="space-y-6">
      <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {/* Every figure is also the switch for the chart below it */}
        <div
          role="radiogroup"
          aria-label="Metric shown in the chart"
          className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-200 sm:grid-cols-4 xl:grid-cols-8"
        >
          {METRICS.map(m => {
            const active = m.key === selected;
            const value = current?.[m.key];
            const delta =
              current && previous && value !== undefined
                ? computeDelta(m, value, previous[m.key], previous.sent)
                : null;
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(m.key)}
                className={cn(
                  'group relative bg-white px-4 py-3.5 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900',
                  active ? 'bg-neutral-50' : 'hover:bg-neutral-50/60',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-0 top-0 h-0.5 transition-colors',
                    active ? 'bg-neutral-900' : 'bg-transparent',
                  )}
                />
                <span
                  className={cn(
                    'block text-xs font-medium',
                    active ? 'text-neutral-900' : 'text-neutral-500 group-hover:text-neutral-700',
                  )}
                >
                  {m.label}
                </span>
                {current && value !== undefined ? (
                  <>
                    <span
                      className={cn(
                        'mt-1 block text-xl font-semibold tracking-tight tabular-nums',
                        thresholdTone(m, value, current.sent),
                      )}
                    >
                      {empty && m.kind === 'rate' ? '—' : formatValue(m, value)}
                    </span>
                    <DeltaLabel delta={empty ? null : delta} className="mt-0.5 block" />
                  </>
                ) : overview.error ? (
                  <span className="mt-1 block text-xl font-semibold text-neutral-300">—</span>
                ) : (
                  <>
                    <Skeleton className="mt-1.5 h-6 w-16" />
                    <Skeleton className="mt-1.5 h-3 w-12" />
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-4 pb-2">
          <h2 className="text-sm font-medium text-neutral-900">
            {def.label} {series.data?.granularity === 'hour' ? 'by hour' : 'by day'}
          </h2>
          <Legend />
        </div>

        {series.error && !series.data ? (
          <PanelError onRetry={() => void series.mutate()} />
        ) : !series.data ? (
          <ChartSkeleton />
        ) : empty ? (
          <PanelEmpty height={260}>No emails were sent in this period.</PanelEmpty>
        ) : (
          <div className="px-2 pb-3 sm:px-3">
            <MetricChart
              def={def}
              current={series.data.current}
              previous={series.data.previous}
              granularity={series.data.granularity}
            />
          </div>
        )}

        {!empty && notes.length > 0 && (
          <div className="space-y-1 border-t border-neutral-100 px-5 py-3 text-xs leading-5 text-neutral-500">
            {notes.map(note => (
              <p key={note}>{note}</p>
            ))}
          </div>
        )}
      </section>

      <StreamTable filters={filters} overview={overview.data} error={!!overview.error} retry={() => void overview.mutate()} />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-neutral-500" aria-hidden>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-3.5 rounded-full bg-neutral-900" />
        This period
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3.5 border-t border-dashed border-neutral-400" />
        Previous period
      </span>
    </div>
  );
}

function StreamTable({
  filters,
  overview,
  error,
  retry,
}: {
  filters: AnalyticsFilters;
  overview?: AnalyticsOverview;
  error: boolean;
  retry: () => void;
}) {
  const rate = (key: MetricKey, header: string): Column<AnalyticsStreamRow> => ({
    key,
    label: header,
    render: row => (row.sent > 0 ? formatRate(row[key]) : '—'),
    tone: row => thresholdTone(metric(key), row[key], row.sent),
  });

  const columns: Column<AnalyticsStreamRow>[] = [
    {
      key: 'stream',
      label: 'Stream',
      align: 'left',
      render: row => <span className="font-medium text-neutral-900">{STREAM_LABEL[row.stream]}</span>,
    },
    {key: 'sent', label: 'Sent', render: row => formatCount(row.sent)},
    rate('deliveryRate', 'Delivered'),
    rate('openRate', 'Opened'),
    rate('clickRate', 'Clicked'),
    rate('bounceRate', 'Bounced'),
    rate('complaintRate', 'Complaints'),
    rate('unsubscribeRate', 'Unsubscribed'),
  ];

  const activeApi = filters.stream.api;

  return (
    <Panel
      title="By stream"
      description="Transactional mail should sit well above marketing on every line. Select a stream to filter the page to it."
    >
      {error && !overview ? (
        <PanelError onRetry={retry} />
      ) : !overview ? (
        <RowsSkeleton rows={3} />
      ) : (
        <div className="border-t border-neutral-100">
          <RateTable
            columns={columns}
            rows={overview.streams}
            rowKey={row => row.stream}
            isActive={row => activeApi === row.stream}
            onRowClick={row => {
              const option = STREAM_OPTIONS.find(s => s.api === row.stream)!;
              filters.setState({stream: activeApi === row.stream ? 'all' : option.value});
            }}
          />
        </div>
      )}
    </Panel>
  );
}

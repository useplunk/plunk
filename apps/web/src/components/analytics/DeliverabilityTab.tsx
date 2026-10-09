import type {
  AnalyticsDeliverability,
  AnalyticsMailboxProviderRow,
  AnalyticsOverview,
  AnalyticsTimeseries,
} from '@plunk/types';

import {type AnalyticsFilters, useAnalyticsData} from '../../lib/hooks/useAnalytics';
import {MetricChart} from './MetricChart';
import {computeDelta, formatCount, formatRate, metric, thresholdTone} from './metrics';
import {ChartSkeleton, DeltaLabel, FigureBand, Panel, PanelEmpty, PanelError, RowsSkeleton} from './primitives';
import {type Column, RateTable} from './RateTable';

const bounce = metric('bounceRate');
const complaint = metric('complaintRate');

export function DeliverabilityTab({filters}: {filters: AnalyticsFilters}) {
  const overview = useAnalyticsData<AnalyticsOverview>('overview', filters);
  const series = useAnalyticsData<AnalyticsTimeseries>('timeseries', filters);
  const deliverability = useAnalyticsData<AnalyticsDeliverability>('deliverability', filters);

  const current = overview.data?.current;
  const previous = overview.data?.previous;
  const d = deliverability.data;
  const empty = current?.sent === 0;

  return (
    <div className="space-y-6">
      <FigureBand
        failed={(!!overview.error && !overview.data) || (!!deliverability.error && !d)}
        figures={[
          {
            label: 'Bounce rate',
            value: current && (empty ? '—' : formatRate(current.bounceRate)),
            tone: current && thresholdTone(bounce, current.bounceRate, current.sent),
            detail: current && previous && (
              <DeltaLabel delta={empty ? null : computeDelta(bounce, current.bounceRate, previous.bounceRate, previous.sent)} />
            ),
          },
          {
            label: 'Complaint rate',
            value: current && (empty ? '—' : formatRate(current.complaintRate)),
            tone: current && thresholdTone(complaint, current.complaintRate, current.sent),
            detail: current && previous && (
              <DeltaLabel
                delta={empty ? null : computeDelta(complaint, current.complaintRate, previous.complaintRate, previous.sent)}
              />
            ),
          },
          {
            label: 'Hard bounces',
            value: d && formatCount(d.hardBounces),
            detail: 'Contact suppressed',
          },
          {
            label: 'Soft bounces',
            value: d && formatCount(d.softBounces),
            detail: 'Mailbox full; not suppressed',
          },
          {
            label: 'Spam reports',
            value: d && formatCount(d.complaints),
            detail: 'Contact suppressed',
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {[bounce, complaint].map(def => (
          <Panel
            key={def.key}
            title={`${def.label} ${series.data?.granularity === 'hour' ? 'by hour' : 'by day'}`}
            description={`Plunk warns at ${formatRate(def.thresholds!.warning)} and can disable the project at ${formatRate(
              def.thresholds!.critical,
            )}, measured over 7 days.`}
          >
            {series.error && !series.data ? (
              <PanelError onRetry={() => void series.mutate()} />
            ) : !series.data ? (
              <ChartSkeleton height={200} />
            ) : empty ? (
              <PanelEmpty height={200}>No emails were sent in this period.</PanelEmpty>
            ) : (
              <div className="px-2 pb-3 sm:px-3">
                <MetricChart
                  def={def}
                  current={series.data.current}
                  previous={series.data.previous}
                  granularity={series.data.granularity}
                  height={200}
                />
              </div>
            )}
          </Panel>
        ))}
      </div>

      <Providers data={d} error={!!deliverability.error} retry={() => void deliverability.mutate()} />
    </div>
  );
}

function Providers({data, error, retry}: {data?: AnalyticsDeliverability; error: boolean; retry: () => void}) {
  const columns: Column<AnalyticsMailboxProviderRow>[] = [
    {
      key: 'domain',
      label: 'Recipient domain',
      align: 'left',
      render: row => <span className="font-medium text-neutral-900">{row.domain}</span>,
    },
    {key: 'sent', label: 'Sent', render: row => formatCount(row.sent), sortValue: row => row.sent},
    {key: 'deliveryRate', label: 'Delivered', render: row => formatRate(row.deliveryRate), sortValue: row => row.deliveryRate},
    {key: 'openRate', label: 'Opened', render: row => formatRate(row.openRate), sortValue: row => row.openRate},
    {
      key: 'bounceRate',
      label: 'Bounced',
      render: row => formatRate(row.bounceRate),
      sortValue: row => row.bounceRate,
      tone: row => thresholdTone(bounce, row.bounceRate, row.sent),
    },
    {
      key: 'complaintRate',
      label: 'Complaints',
      render: row => formatRate(row.complaintRate),
      sortValue: row => row.complaintRate,
      tone: row => thresholdTone(complaint, row.complaintRate, row.sent),
    },
  ];

  return (
    <Panel
      title="Recipient domains"
      description="Your ten largest recipient domains. A problem with one mailbox provider shows up here before it moves the totals."
    >
      {error && !data ? (
        <PanelError onRetry={retry} />
      ) : !data ? (
        <RowsSkeleton />
      ) : data.providers.length === 0 ? (
        <PanelEmpty>No emails were sent in this period.</PanelEmpty>
      ) : (
        <div className="border-t border-neutral-100">
          <RateTable
            columns={columns}
            rows={data.providers}
            rowKey={row => row.domain}
            volume={row => row.sent}
            minVolume={100}
            defaultSort={{key: 'sent', direction: 'desc'}}
          />
        </div>
      )}
    </Panel>
  );
}

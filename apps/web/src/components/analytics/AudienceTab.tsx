import type {AnalyticsAudience, AnalyticsTopEvents} from '@plunk/types';
import {type ChartConfig, ChartContainer, ChartTooltip} from '@plunk/ui';
import {Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis} from 'recharts';

import {type AnalyticsFilters, useAnalyticsData} from '../../lib/hooks/useAnalytics';
import {computeDelta, formatBucket, formatBucketLong, formatCompact, formatCount} from './metrics';
import {ChartSkeleton, DeltaLabel, FigureBand, Panel, PanelEmpty, PanelError, RowsSkeleton} from './primitives';

const config = {
  newContacts: {label: 'New contacts', color: '#171717'},
  unsubscribed: {label: 'Unsubscribed', color: '#a3a3a3'},
  suppressed: {label: 'Bounced or reported spam', color: '#f87171'},
} satisfies ChartConfig;

const grows = {kind: 'count', better: 'up'} as const;
const shrinks = {kind: 'count', better: 'down'} as const;

export function AudienceTab({filters}: {filters: AnalyticsFilters}) {
  const {data, error, mutate} = useAnalyticsData<AnalyticsAudience>('audience', filters);

  const totals = data?.totals;
  const before = data?.previousTotals;
  const net = totals ? totals.newContacts - totals.unsubscribed - totals.suppressed : 0;
  const previousNet = before ? before.newContacts - before.unsubscribed - before.suppressed : 0;
  const hadBefore = before ? before.newContacts + before.unsubscribed + before.suppressed : 0;

  return (
    <div className="space-y-6">
      <FigureBand
        failed={!!error && !data}
        figures={[
          {
            label: 'Subscribed contacts',
            value: data && formatCount(data.subscribedContacts),
            detail: data && `of ${formatCount(data.totalContacts)} contacts`,
          },
          {
            label: 'New contacts',
            value: totals && formatCount(totals.newContacts),
            detail: totals && before && <DeltaLabel delta={computeDelta(grows, totals.newContacts, before.newContacts, hadBefore)} />,
          },
          {
            label: 'Unsubscribed',
            value: totals && formatCount(totals.unsubscribed),
            detail: totals && before && (
              <DeltaLabel delta={computeDelta(shrinks, totals.unsubscribed, before.unsubscribed, hadBefore)} />
            ),
          },
          {
            label: 'Bounced or reported spam',
            value: totals && formatCount(totals.suppressed),
            detail: totals && before && (
              <DeltaLabel delta={computeDelta(shrinks, totals.suppressed, before.suppressed, hadBefore)} />
            ),
          },
          {
            label: 'Net growth',
            value: totals && `${net > 0 ? '+' : net < 0 ? '−' : ''}${formatCount(Math.abs(net))}`,
            tone: totals && net < 0 ? 'text-red-600' : undefined,
            detail: totals && before && (hadBefore > 0 ? `${previousNet >= 0 ? '+' : '−'}${formatCount(Math.abs(previousNet))} the period before` : 'No earlier data'),
          },
        ]}
      />

      <Panel
        title={`List growth ${data?.granularity === 'hour' ? 'by hour' : 'by day'}`}
        description="New contacts above the line; contacts who unsubscribed, bounced or reported spam below it."
        actions={<GrowthLegend />}
      >
        {error && !data ? (
          <PanelError onRetry={() => void mutate()} />
        ) : !data ? (
          <ChartSkeleton />
        ) : (
          <GrowthChart data={data} />
        )}
      </Panel>

      <TopEvents filters={filters} />
    </div>
  );
}

function GrowthLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500" aria-hidden>
      {Object.entries(config).map(([key, item]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px]" style={{backgroundColor: item.color}} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function GrowthChart({data}: {data: AnalyticsAudience}) {
  const rows = data.current.map(p => ({
    label: formatBucket(p.bucket, data.granularity),
    longLabel: formatBucketLong(p.bucket, data.granularity),
    newContacts: p.newContacts,
    unsubscribed: -p.unsubscribed,
    suppressed: -p.suppressed,
  }));

  if (rows.every(r => r.newContacts === 0 && r.unsubscribed === 0 && r.suppressed === 0)) {
    return <PanelEmpty height={260}>No contacts joined or left in this period.</PanelEmpty>;
  }

  return (
    <div className="px-2 pb-3 sm:px-3">
      <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
        <BarChart data={rows} stackOffset="sign" margin={{top: 8, right: 8, left: 0, bottom: 0}} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="#f5f5f5" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tick={{fill: '#a3a3a3', fontSize: 11}} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => formatCompact(Math.abs(v))}
            tick={{fill: '#a3a3a3', fontSize: 11}}
            allowDecimals={false}
          />
          <ReferenceLine y={0} stroke="#d4d4d4" />
          <ChartTooltip
            cursor={{fill: '#fafafa'}}
            content={({active, payload}) => {
              const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
              if (!active || !row) return null;
              const net = row.newContacts + row.unsubscribed + row.suppressed;
              return (
                <div className="min-w-48 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm">
                  <div className="text-neutral-500">{row.longLabel}</div>
                  <dl className="mt-1.5 space-y-1">
                    {(['newContacts', 'unsubscribed', 'suppressed'] as const).map(key => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <dt className="inline-flex items-center gap-1.5 text-neutral-600">
                          <span className="h-2 w-2 rounded-[2px]" style={{backgroundColor: config[key].color}} />
                          {config[key].label}
                        </dt>
                        <dd className="tabular-nums text-neutral-900">{formatCount(Math.abs(row[key]))}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-1">
                      <dt className="font-medium text-neutral-900">Net</dt>
                      <dd className="font-medium tabular-nums text-neutral-900">
                        {net > 0 ? '+' : net < 0 ? '−' : ''}
                        {formatCount(Math.abs(net))}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Bar dataKey="newContacts" stackId="a" fill="var(--color-newContacts)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="unsubscribed" stackId="a" fill="var(--color-unsubscribed)" isAnimationActive={false} />
          <Bar dataKey="suppressed" stackId="a" fill="var(--color-suppressed)" radius={[0, 0, 2, 2]} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function TopEvents({filters}: {filters: AnalyticsFilters}) {
  const {data, error, mutate} = useAnalyticsData<AnalyticsTopEvents>('events', filters);

  return (
    <Panel title="Events" description="The events your app tracked most often, against the period before.">
      {error && !data ? (
        <PanelError onRetry={() => void mutate()} />
      ) : !data ? (
        <RowsSkeleton />
      ) : data.events.length === 0 ? (
        <PanelEmpty>No events were tracked in this period. Events you send with the API show up here.</PanelEmpty>
      ) : (
        <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
          {data.events.map(event => (
            <li key={event.name} className="flex items-center gap-4 px-5 py-2.5 text-[13px]">
              <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-neutral-900">{event.name}</code>
              <span className="w-20 text-right tabular-nums text-neutral-900">{formatCount(event.count)}</span>
              <DeltaLabel
                className="w-20 text-right"
                neutral
                fallback="New"
                delta={computeDelta({kind: 'count', better: 'up'}, event.count, event.previousCount, event.previousCount)}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

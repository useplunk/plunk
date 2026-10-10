import type {
  AnalyticsHeatmap,
  AnalyticsLeaderboard,
  AnalyticsLeaderboardKind,
  AnalyticsLeaderboardRow,
  AnalyticsLinks,
} from '@plunk/types';
import dayjs from 'dayjs';
import Link from 'next/link';
import {useMemo, useState} from 'react';

import {type AnalyticsFilters, useAnalyticsData} from '../../lib/hooks/useAnalytics';
import {formatCount, formatRate, metric, type MetricKey, thresholdTone} from './metrics';
import {Segmented} from '../Segmented';
import {Panel, PanelEmpty, PanelError, RowsSkeleton} from './primitives';
import {type Column, RateTable} from './RateTable';

const KINDS = [
  {value: 'campaigns', label: 'Campaigns'},
  {value: 'templates', label: 'Templates'},
  {value: 'workflows', label: 'Workflows'},
] as const satisfies readonly {value: AnalyticsLeaderboardKind; label: string}[];

/** Below this many sends a rate says more about chance than about the email */
const MIN_VOLUME = 50;

export function EngagementTab({filters}: {filters: AnalyticsFilters}) {
  return (
    <div className="space-y-6">
      <Leaderboard filters={filters} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Links filters={filters} />
        <Heatmap filters={filters} />
      </div>
    </div>
  );
}

// =============================================================================
// LEADERBOARD
// =============================================================================

function Leaderboard({filters}: {filters: AnalyticsFilters}) {
  const defaultKind: AnalyticsLeaderboardKind =
    filters.stream.api === 'TRANSACTIONAL' ? 'templates' : filters.stream.api === 'WORKFLOW' ? 'workflows' : 'campaigns';
  const [kind, setKind] = useState<AnalyticsLeaderboardKind>(defaultKind);
  const {data, error, mutate} = useAnalyticsData<AnalyticsLeaderboard>('leaderboard', filters, `&kind=${kind}`);
  // keepPreviousData would show last kind's rows under the new heading
  const rows = data?.kind === kind ? data.rows : undefined;

  const href = (row: AnalyticsLeaderboardRow) =>
    row.id === null ? null : `/${kind === 'campaigns' ? 'campaigns' : kind === 'templates' ? 'templates' : 'workflows'}/${row.id}`;

  const rate = (key: MetricKey, label: string): Column<AnalyticsLeaderboardRow> => ({
    key,
    label,
    render: row => (row.sent > 0 ? formatRate(row[key]) : '—'),
    sortValue: row => row[key],
    tone: row => thresholdTone(metric(key), row[key], row.sent),
  });

  const columns: Column<AnalyticsLeaderboardRow>[] = [
    {
      key: 'name',
      label: KINDS.find(k => k.value === kind)!.label.replace(/s$/, ''),
      align: 'left',
      className: 'max-w-[18rem]',
      render: row => {
        const link = href(row);
        return (
          <span className="flex min-w-0 items-baseline gap-2">
            {link ? (
              <Link
                href={link}
                onClick={e => e.stopPropagation()}
                className="truncate font-medium text-neutral-900 underline-offset-4 hover:underline"
              >
                {row.name}
              </Link>
            ) : (
              <span className="truncate font-medium text-neutral-500">{row.name}</span>
            )}
            {row.sentAt && <span className="shrink-0 text-xs text-neutral-400">{dayjs(row.sentAt).format('MMM D')}</span>}
          </span>
        );
      },
    },
    {key: 'sent', label: 'Sent', render: row => formatCount(row.sent), sortValue: row => row.sent},
    rate('openRate', 'Opened'),
    rate('clickRate', 'Clicked'),
    rate('clickToOpenRate', 'Click-to-open'),
    rate('bounceRate', 'Bounced'),
    rate('unsubscribeRate', 'Unsubscribed'),
  ];

  const description =
    kind === 'campaigns'
      ? 'Campaigns that started sending in this period. Sort by any column; sends under 50 recipients sort last.'
      : kind === 'templates'
        ? 'Transactional emails by template. Sort by any column; templates with under 50 sends sort last.'
        : 'Emails sent by each workflow. Sort by any column; workflows with under 50 sends sort last.';

  return (
    <Panel
      title="Performance"
      description={description}
      actions={<Segmented label="Group by" value={kind} options={KINDS} onChange={setKind} />}
    >
      {error && !rows ? (
        <PanelError onRetry={() => void mutate()} />
      ) : !rows ? (
        <RowsSkeleton />
      ) : rows.length === 0 ? (
        <PanelEmpty>
          {kind === 'campaigns'
            ? 'No campaigns were sent in this period.'
            : kind === 'templates'
              ? 'No transactional emails were sent in this period.'
              : 'No workflow emails were sent in this period.'}
        </PanelEmpty>
      ) : (
        <div className="border-t border-neutral-100">
          <RateTable
            key={kind}
            columns={columns}
            rows={rows}
            rowKey={row => row.id ?? 'none'}
            volume={row => row.sent}
            minVolume={MIN_VOLUME}
          />
        </div>
      )}
    </Panel>
  );
}

// =============================================================================
// LINKS
// =============================================================================

function Links({filters}: {filters: AnalyticsFilters}) {
  const {data, error, mutate} = useAnalyticsData<AnalyticsLinks>('links', filters);
  const max = data?.links[0]?.clicks ?? 0;

  return (
    <Panel
      title="Most clicked links"
      description={data ? `${formatCount(data.totalClicks)} clicks in this period` : 'Clicks in this period'}
    >
      {error && !data ? (
        <PanelError onRetry={() => void mutate()} />
      ) : !data ? (
        <RowsSkeleton rows={8} />
      ) : data.links.length === 0 ? (
        <PanelEmpty height={240}>No links were clicked in this period.</PanelEmpty>
      ) : (
        <ol className="divide-y divide-neutral-100 border-t border-neutral-100">
          <li className="flex items-center gap-4 px-5 py-2 text-xs font-medium text-neutral-500" aria-hidden>
            <span className="flex-1">Link</span>
            <span className="w-14 text-right">Clicks</span>
            <span className="w-14 text-right">People</span>
          </li>
          {data.links.slice(0, 10).map(link => {
            const {head, tail} = splitUrl(link.url);
            return (
              <li key={link.url} className="flex items-center gap-4 px-5 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={link.url}
                    className="block truncate text-neutral-900 underline-offset-4 hover:underline"
                  >
                    {head}
                    {tail && <span className="text-neutral-400">{tail}</span>}
                  </a>
                  <span aria-hidden className="mt-1.5 block h-0.5 rounded-full bg-neutral-100">
                    <span
                      className="block h-full rounded-full bg-neutral-400"
                      style={{width: `${Math.max(1, (link.clicks / max) * 100)}%`}}
                    />
                  </span>
                </span>
                <span className="w-14 text-right tabular-nums text-neutral-900">{formatCount(link.clicks)}</span>
                <span className="w-14 text-right tabular-nums text-neutral-500">
                  {formatCount(link.uniqueClickers)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/** Host and path read first; the query string (usually UTM tags) is kept but quieted */
function splitUrl(url: string): {head: string; tail: string} {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    return {head: `${u.host}${path}`, tail: u.search};
  } catch {
    return {head: url, tail: ''};
  }
}

// =============================================================================
// HEATMAP
// =============================================================================

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hour = (h: number) => `${String(h).padStart(2, '0')}:00`;

function Heatmap({filters}: {filters: AnalyticsFilters}) {
  const [measure, setMeasure] = useState<'opens' | 'clicks'>('opens');
  const {data, error, mutate} = useAnalyticsData<AnalyticsHeatmap>('heatmap', filters);

  const {grid, max, peak, total} = useMemo(() => {
    const grid = Array.from({length: 7}, () => Array<number>(24).fill(0));
    let max = 0;
    let total = 0;
    let peak: {day: number; hour: number} | null = null;
    for (const cell of data?.cells ?? []) {
      const value = cell[measure];
      grid[cell.day]![cell.hour] = value;
      total += value;
      if (value > max) {
        max = value;
        peak = {day: cell.day, hour: cell.hour};
      }
    }
    return {grid, max, peak, total};
  }, [data, measure]);

  return (
    <Panel
      title="When people engage"
      description={
        peak
          ? `Busiest: ${DAY_NAMES[peak.day]} ${hour(peak.hour)} to ${hour((peak.hour + 1) % 24)}, ${filters.bounds.tz.replace(/_/g, ' ')} time.`
          : 'First opens and clicks by weekday and hour'
      }
      actions={
        <Segmented
          label="Measure"
          value={measure}
          options={[
            {value: 'opens', label: 'Opens'},
            {value: 'clicks', label: 'Clicks'},
          ]}
          onChange={setMeasure}
        />
      }
    >
      {error && !data ? (
        <PanelError onRetry={() => void mutate()} />
      ) : !data ? (
        <RowsSkeleton rows={7} />
      ) : total === 0 ? (
        <PanelEmpty height={240}>Nobody has {measure === 'opens' ? 'opened' : 'clicked'} an email in this period.</PanelEmpty>
      ) : (
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[420px] table-fixed border-separate border-spacing-[2px]">
            <caption className="sr-only">
              First {measure} per weekday and hour. Busiest hour has {formatCount(max)}.
            </caption>
            <thead>
              <tr>
                <th className="w-9" aria-hidden />
                {Array.from({length: 24}, (_, h) => (
                  <th key={h} scope="col" className="overflow-visible whitespace-nowrap p-0 text-left text-[10px] font-normal text-neutral-400">
                    <span className={h % 6 === 0 ? '' : 'sr-only'}>{String(h).padStart(2, '0')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, d) => (
                <tr key={d}>
                  <th scope="row" className="pr-2 text-left text-[11px] font-normal text-neutral-500">
                    {DAYS[d]}
                  </th>
                  {row.map((value, h) => {
                    // Square root keeps quiet hours visible next to one dominant slot
                    const intensity = max > 0 ? Math.sqrt(value / max) : 0;
                    return (
                      <td
                        key={h}
                        title={`${DAY_NAMES[d]} ${hour(h)}: ${formatCount(value)} ${measure}`}
                        className="h-5 rounded-[3px] p-0"
                        style={{
                          backgroundColor: value === 0 ? '#fafafa' : `rgba(23, 23, 23, ${0.06 + intensity * 0.86})`,
                        }}
                      >
                        <span className="sr-only">{`${DAY_NAMES[d]} ${hour(h)}: ${value}`}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            Engagement follows when you send, so read this as a hint for scheduling rather than a rule.
          </p>
        </div>
      )}
    </Panel>
  );
}

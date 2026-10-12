import type {AnalyticsGranularity, AnalyticsTimeseriesPoint} from '@plunk/types';
import {type ChartConfig, ChartContainer, ChartTooltip} from '@plunk/ui';
import {useId, useMemo} from 'react';
import {Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis} from 'recharts';

import {
  formatBucket,
  formatBucketLong,
  formatCompact,
  formatValue,
  type MetricDefinition,
} from './metrics';

const config = {
  current: {label: 'This period', color: '#171717'},
  previous: {label: 'Previous period', color: '#a3a3a3'},
} satisfies ChartConfig;

interface Row {
  label: string;
  longLabel: string;
  previousLabel: string | null;
  current: number | null;
  previous: number | null;
}

/**
 * One metric over time against the period before it. The previous period is drawn as a
 * dashed grey line under the current one, bucket for bucket, so "is this normal" is
 * answered without reading a single number.
 */
export function MetricChart({
  def,
  current,
  previous,
  granularity,
  height = 260,
}: {
  def: MetricDefinition;
  current: AnalyticsTimeseriesPoint[];
  previous: AnalyticsTimeseriesPoint[];
  granularity: AnalyticsGranularity;
  height?: number;
}) {
  const rows = useMemo<Row[]>(
    () =>
      current.map((point, i) => {
        const before = previous[i];
        return {
          label: formatBucket(point.bucket, granularity),
          longLabel: formatBucketLong(point.bucket, granularity),
          previousLabel: before ? formatBucketLong(before.bucket, granularity) : null,
          current: def.fromPoint(point),
          previous: before ? def.fromPoint(before) : null,
        };
      }),
    [current, previous, def, granularity],
  );

  // Several charts share the page, so each needs its own gradient id
  const fillId = `metric-fill-${useId().replace(/:/g, '')}`;

  const tickFormatter = (v: number) => (def.kind === 'count' ? formatCompact(v) : `${+v.toFixed(3)}%`);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{height}}>
      <ComposedChart data={rows} margin={{top: 8, right: 8, left: 0, bottom: 0}}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-current)" stopOpacity={0.08} />
            <stop offset="100%" stopColor="var(--color-current)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f5f5f5" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tick={{fill: '#a3a3a3', fontSize: 11}}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={def.kind === 'count' ? 44 : 56}
          tickMargin={4}
          tickFormatter={tickFormatter}
          tick={{fill: '#a3a3a3', fontSize: 11}}
          allowDecimals={def.kind === 'rate'}
        />
        {def.thresholds && (
          <ReferenceLine
            y={def.thresholds.warning}
            stroke="#d97706"
            strokeDasharray="2 3"
            ifOverflow="hidden"
          />
        )}
        <ChartTooltip
          cursor={{stroke: '#e5e5e5'}}
          content={({active, payload}) => {
            const row = payload?.[0]?.payload as Row | undefined;
            if (!active || !row) return null;
            return (
              <div className="min-w-44 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-neutral-500">{row.longLabel}</span>
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-neutral-900">
                  {row.current === null ? '—' : formatValue(def, row.current)}
                </div>
                {row.previousLabel && (
                  <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-neutral-100 pt-1.5 text-neutral-500">
                    <span>{row.previousLabel}</span>
                    <span className="tabular-nums">{row.previous === null ? '—' : formatValue(def, row.previous)}</span>
                  </div>
                )}
              </div>
            );
          }}
        />
        <Line
          dataKey="previous"
          type="monotone"
          stroke="var(--color-previous)"
          strokeWidth={1.25}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Area
          dataKey="current"
          type="monotone"
          stroke="var(--color-current)"
          strokeWidth={1.75}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{r: 3, strokeWidth: 0, fill: 'var(--color-current)'}}
          isAnimationActive={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

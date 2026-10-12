import type {AnalyticsStream} from '@plunk/types';
import dayjs from 'dayjs';
import {parseAsString, parseAsStringLiteral, useQueryStates} from 'nuqs';
import {useMemo} from 'react';
import useSWR from 'swr';

import {useActiveProject} from '../contexts/ActiveProjectProvider';
import {network} from '../network';

export const ANALYTICS_TABS = ['overview', 'deliverability', 'engagement', 'audience'] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export const RANGE_PRESETS = [
  {value: 'today', label: 'Today', days: 1},
  {value: '7d', label: '7 days', days: 7},
  {value: '30d', label: '30 days', days: 30},
  {value: '90d', label: '90 days', days: 90},
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number]['value'];
const RANGES = [...RANGE_PRESETS.map(p => p.value), 'custom'] as const;

/** The longest custom range the API accepts, in days, both ends included */
export const MAX_CUSTOM_DAYS = 90;

export const STREAM_OPTIONS = [
  {value: 'all', label: 'All emails', api: 'ALL'},
  {value: 'transactional', label: 'Transactional', api: 'TRANSACTIONAL'},
  {value: 'campaigns', label: 'Campaigns', api: 'CAMPAIGN'},
  {value: 'workflows', label: 'Workflows', api: 'WORKFLOW'},
] as const satisfies readonly {value: string; label: string; api: AnalyticsStream}[];
export type StreamOption = (typeof STREAM_OPTIONS)[number]['value'];

const DATE = 'YYYY-MM-DD';

/**
 * Filter state for the analytics page, kept in the URL so a view can be shared or
 * bookmarked. `from` and `to` are calendar days in the viewer's timezone, both included,
 * and only apply to the custom range.
 */
export function useAnalyticsFilters() {
  const [state, setState] = useQueryStates(
    {
      tab: parseAsStringLiteral(ANALYTICS_TABS).withDefault('overview'),
      range: parseAsStringLiteral(RANGES).withDefault('30d'),
      from: parseAsString,
      to: parseAsString,
      stream: parseAsStringLiteral(STREAM_OPTIONS.map(s => s.value)).withDefault('all'),
    },
    {history: 'replace'},
  );

  const today = dayjs().format(DATE);

  const bounds = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const startOfToday = dayjs(today);
    const preset = RANGE_PRESETS.find(p => p.value === state.range);

    let first = startOfToday.subtract((preset?.days ?? 30) - 1, 'day');
    let last = startOfToday;

    if (state.range === 'custom' && state.from && state.to) {
      const from = dayjs(state.from);
      const to = dayjs(state.to);
      if (from.isValid() && to.isValid() && !to.isBefore(from)) {
        first = from;
        last = to.diff(from, 'day') >= MAX_CUSTOM_DAYS ? from.add(MAX_CUSTOM_DAYS - 1, 'day') : to;
      }
    }

    // Day boundaries rather than "now", so the same view maps to the same cache entry
    return {
      first,
      last,
      from: first.startOf('day').toISOString(),
      to: last.add(1, 'day').startOf('day').toISOString(),
      days: last.diff(first, 'day') + 1,
      tz,
    };
  }, [state.range, state.from, state.to, today]);

  const stream = STREAM_OPTIONS.find(s => s.value === state.stream) ?? STREAM_OPTIONS[0];
  const query = `from=${encodeURIComponent(bounds.from)}&to=${encodeURIComponent(bounds.to)}&tz=${encodeURIComponent(
    bounds.tz,
  )}&stream=${stream.api}`;

  return {...state, setState, bounds, stream, query};
}

export type AnalyticsFilters = ReturnType<typeof useAnalyticsFilters>;

/**
 * One analytics dataset. Each tab asks only for what it draws; the overview and timeseries
 * keys are shared between tabs, so switching tabs reuses what is already loaded.
 *
 * Waits for the active project: on a first visit it is not chosen yet, and a request
 * without it fails. The project id is part of the key so each project caches separately.
 */
export function useAnalyticsData<T>(path: string, filters: AnalyticsFilters, params = '') {
  const {activeProject} = useActiveProject();
  const key = activeProject ? [`/analytics/${path}?${filters.query}${params}`, activeProject.id] : null;

  return useSWR<T>(key, ([url]: [string, string]) => network.fetch<T>('GET', url), {
    keepPreviousData: true,
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000,
  });
}

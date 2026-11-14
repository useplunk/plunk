import {parseAsArrayOf, parseAsString, useQueryStates} from 'nuqs';
import useSWR from 'swr';

import {network} from '../network';
import {useAnalyticsFilters} from './useAnalytics';

/**
 * Filter state for the cross-project analytics page: the per-project filters (period and
 * stream), plus the projects to include and a search over their names, all kept in the URL.
 * An empty project list means every project the user is a member of.
 */
export function useGlobalAnalyticsFilters() {
  const filters = useAnalyticsFilters();
  const [scope, setScope] = useQueryStates(
    {
      projects: parseAsArrayOf(parseAsString).withDefault([]),
      q: parseAsString.withDefault(''),
    },
    {history: 'replace'},
  );

  const projects = scope.projects.length > 0 ? `&projects=${scope.projects.map(encodeURIComponent).join(',')}` : '';
  return {...filters, projects: scope.projects, search: scope.q, setScope, globalQuery: `${filters.query}${projects}`};
}

export type GlobalAnalyticsFilters = ReturnType<typeof useGlobalAnalyticsFilters>;

/**
 * One global analytics dataset. Unlike the per-project data this does not wait for an
 * active project: the API scopes it to the signed-in user's memberships.
 */
export function useGlobalAnalyticsData<T>(path: string, filters: Pick<GlobalAnalyticsFilters, 'globalQuery'>) {
  return useSWR<T>(`/analytics/global/${path}?${filters.globalQuery}`, (url: string) => network.fetch<T>('GET', url), {
    keepPreviousData: true,
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000,
  });
}

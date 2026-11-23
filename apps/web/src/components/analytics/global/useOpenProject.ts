import {useRouter} from 'next/router';
import {useCallback} from 'react';

import {useActiveProject} from '../../../lib/contexts/ActiveProjectProvider';
import {useProjects} from '../../../lib/hooks/useProject';
import type {GlobalAnalyticsFilters} from '../../../lib/hooks/useGlobalAnalytics';

/**
 * Switches to a project and opens its own analytics on the same period and stream, so
 * drilling down from the global view keeps the context it was looking at.
 */
export function useOpenProject(filters: Pick<GlobalAnalyticsFilters, 'range' | 'from' | 'to' | 'stream'>) {
  const router = useRouter();
  const {data: projects} = useProjects();
  const {setActiveProject} = useActiveProject();

  return useCallback(
    (projectId: string) => {
      const project = projects?.find(p => p.id === projectId);
      if (!project) return;

      // Project analytics are scoped to the active project, so opening one switches to it,
      // exactly as picking it in the sidebar would
      setActiveProject(project);
      const query: Record<string, string> = {range: filters.range, stream: filters.stream.value};
      if (filters.range === 'custom' && filters.from && filters.to) {
        query.from = filters.from;
        query.to = filters.to;
      }
      void router.push({pathname: '/analytics', query});
    },
    [projects, setActiveProject, router, filters.range, filters.from, filters.to, filters.stream.value],
  );
}

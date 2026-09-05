import type {ProjectWithRole} from '@plunk/types';
import useSWR from 'swr';

/**
 * Fetch all projects for the current user
 */
export function useProjects() {
  return useSWR<ProjectWithRole[]>('/users/@me/projects', {shouldRetryOnError: false});
}

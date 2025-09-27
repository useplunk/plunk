import useSWR from 'swr';
import {Campaign} from '@prisma/client';
import {useActiveProject} from './projects';

/**
 *
 * @param id
 */
export function useCampaign(id: string) {
  return useSWR(`/v1/campaigns/${id}`);
}

/**
 *
 */
export function useCampaigns() {
  const activeProject = useActiveProject();

  return useSWR<
    (Campaign & {
      emails_count: number,
      opened_emails_count: number,
      tasks_count: number
    })[]
  >(activeProject ? `/projects/id/${activeProject.id}/campaigns` : null);
}

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
      emails: {
        id: string;
        status: string;
      }[];
      tasks: {
        id: string;
      }[];
      recipients: {
        id: string;
      }[];
    })[]
  >(activeProject ? `/projects/id/${activeProject.id}/campaigns` : null);
}

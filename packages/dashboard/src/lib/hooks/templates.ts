import useSWR from 'swr';
import {Action, Template} from '@prisma/client';
import {useActiveProject} from './projects';

/**
 *
 * @param id
 */
export function useTemplate(id: string) {
  return useSWR(`/v1/templates/${id}`);
}

/**
 *
 */
export function useTemplates() {
  const activeProject = useActiveProject();

  return useSWR<
    (Template & {
      actions: Action[];
    })[]
  >(activeProject ? `/projects/id/${activeProject.id}/templates` : null);
}

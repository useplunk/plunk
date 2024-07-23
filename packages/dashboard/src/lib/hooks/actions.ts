import useSWR from 'swr';
import {Action, Email, Event, Task, Template, Trigger} from '@prisma/client';
import {useActiveProject} from './projects';

/**
 *
 * @param id
 */
export function useAction(id: string) {
  return useSWR(`/v1/actions/${id}`);
}

/**
 *
 * @param id
 */
export function useRelatedActions(id: string) {
  return useSWR<
    (Action & {
      events: Event[];
      notevents: Event[];
      triggers: Trigger[];
      emails: Email[];
      template: Template;
    })[]
  >(`/v1/actions/${id}/related`);
}

/**
 *
 */
export function useActions() {
  const activeProject = useActiveProject();

  return useSWR<
    (Action & {
      triggers: Trigger[];
      template: Template;
      emails: Email[];
      tasks: Task[];
    })[]
  >(activeProject ? `/projects/id/${activeProject.id}/actions` : null);
}

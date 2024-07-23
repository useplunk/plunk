import useSWR from 'swr';
import {Event} from '@prisma/client';
import {useActiveProject} from './projects';

/**
 *
 */
export function useEvents() {
  const activeProject = useActiveProject();

  return useSWR<
    (Event & {
      triggers: {
        id: string;
        createdAt: Date;
        contactId: string;
      }[];
    })[]
  >(activeProject ? `/projects/id/${activeProject.id}/events` : null);
}

/**
 *
 */
export function useEventsWithoutTriggers() {
  const activeProject = useActiveProject();

  return useSWR<Event[]>(activeProject ? `/projects/id/${activeProject.id}/events?triggers=false` : null);
}

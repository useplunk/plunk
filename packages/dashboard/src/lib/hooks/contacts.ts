import useSWR from 'swr';
import {Action, Contact, Email, Event, Project, Trigger} from '@prisma/client';
import {useActiveProject} from './projects';

export interface WithProject {
  id: string;
  withProject: true;
}

export interface WithoutProject {
  id: string;
  withProject?: false;
}

export type WithOrWithoutProject<T extends WithProject | WithoutProject> = T extends WithProject
  ?
      | (Contact & {
          emails: Email[];
          triggers: (Trigger & {
            event: Event | null;
            action: Action | null;
          })[];
          project: Project;
        })
      | null
  :
      | (Contact & {
          emails: Email[];
          triggers: (Trigger & {
            event: Event | null;
            action: Action | null;
          })[];
        })
      | null;

/**
 *
 * @param id.id
 * @param id
 * @param id.withProject
 */
export function useContact<T extends WithProject | WithoutProject>({id, withProject = false}: T) {
  return useSWR<WithOrWithoutProject<T>>(withProject ? `/v1/contacts/${id}?withProject=true` : `/v1/contacts/${id}`);
}

/**
 *
 * @param page
 */
export function useContacts(page: number) {
  const activeProject = useActiveProject();

  return useSWR<{
    contacts: (Contact & {
      triggers: Trigger[];
    })[];
    count: number;
  }>(activeProject ? `/projects/id/${activeProject.id}/contacts?page=${page}` : null);
}

/**
 * Hook for paginated contacts with search functionality
 * @param page
 * @param limit
 * @param search
 * @param subscribed
 */
export function usePaginatedContacts(
  page: number = 1,
  limit: number = 50,
  search?: string,
  subscribed?: boolean
) {
  const activeProject = useActiveProject();

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(subscribed !== undefined && { subscribed: subscribed.toString() }),
  });

  return useSWR<{
    contacts: (Contact & {
      triggers: Pick<Trigger, 'createdAt' | 'eventId'>[];
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(
    activeProject ? `/projects/id/${activeProject.id}/contacts/paginated?${queryParams}` : null,
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    }
  );
}

/**
 *
 */
export function useContactsCount() {
  const activeProject = useActiveProject();

  return useSWR<number>(activeProject ? `/projects/id/${activeProject.id}/contacts/count` : null);
}

/**
 *
 */
export function useContactMetadata() {
  const activeProject = useActiveProject();

  return useSWR<string[]>(activeProject ? `/projects/id/${activeProject.id}/contacts/metadata` : null);
}

/**
 *
 * @param query
 */
export function searchContacts(query: string | undefined) {
  const activeProject = useActiveProject();

  if (!query) {
    return useSWR<{
      contacts: (Contact & {
        triggers: Trigger[];
        emails: Email[];
      })[];
      count: number;
    }>(activeProject ? `/projects/id/${activeProject.id}/contacts` : null);
  }

  return useSWR<{
    contacts: (Contact & {
      triggers: Trigger[];
      emails: Email[];
    })[];
    count: number;
  }>(activeProject ? `/projects/id/${activeProject.id}/contacts/search?query=${query}` : null, {
    revalidateOnFocus: false,
    refreshInterval: 0,
  });
}

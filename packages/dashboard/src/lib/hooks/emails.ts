import {useActiveProject} from './projects';
import useSWR from 'swr';
import {Email} from '@prisma/client';

/**
 *
 */
export function useEmails() {
  const activeProject = useActiveProject();

  return useSWR<Email[]>(activeProject ? `/projects/id/${activeProject.id}/emails` : null);
}

/**
 *
 */
export function useEmailsCount() {
  const activeProject = useActiveProject();

  return useSWR<number>(activeProject ? `/projects/id/${activeProject.id}/emails/count` : null);
}

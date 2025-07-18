import {Action, Contact, Email, Event, Project, Role} from '@prisma/client';
import {useAtom} from 'jotai';
import useSWR from 'swr';
import {atomActiveProject} from '../atoms/project';

/**
 *
 */
export function useProjects() {
  return useSWR<Project[]>('/users/@me/projects');
}

/**
 *
 */
export function useActiveProject(): Project | null {
  const [activeProject, setActiveProject] = useAtom(atomActiveProject);
  const {data: projects} = useProjects();

  if (!projects) {
    return null;
  }

  if (activeProject && !projects.find(project => project.id === activeProject)) {
    setActiveProject(null);
    window.localStorage.removeItem('project');
  }

  if (!activeProject && projects.length > 0) {
    setActiveProject(projects[0].id);
    window.localStorage.setItem('project', projects[0].id);
  }

  return projects.find(project => project.id === activeProject) ?? null;
}

/**
 *
 */
export function useActiveProjectMemberships() {
  const activeProject = useActiveProject();

  return useSWR<
    {
      userId: string;
      email: string;
      role: Role;
    }[]
  >(activeProject ? `/projects/id/${activeProject.id}/memberships` : null);
}

/**
 *
 */
export function useActiveProjectFeed(page: number) {
  const activeProject = useActiveProject();

  return useSWR<
    (
      | {
          createdAt: Date;
          contact: Contact;
          event: Event | null;
          action: Action | null;
        }
      | ({
          contact: Contact;
        } & Email)
    )[]
  >(activeProject ? `/projects/id/${activeProject.id}/feed?page=${page}` : null);
}

/**
 *
 */
export function useActiveProjectVerifiedIdentity() {
  const activeProject = useActiveProject();

  return useSWR<{
    tokens: string[];
  }>(activeProject ? `/identities/id/${activeProject.id}` : null);
}

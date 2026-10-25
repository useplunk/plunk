import type {Project} from '@plunk/db';
import {createContext, type ReactNode, use, useEffect, useState} from 'react';
import {useSWRConfig} from 'swr';

import {pickActiveProject} from '../activeProject';
import {useProjects} from '../hooks/useProject';

interface ActiveProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  updateActiveProject: (project: Project) => void;
  availableProjects: Project[];
  isLoading: boolean;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | undefined>(undefined);

export function ActiveProjectProvider({children}: {children: ReactNode}) {
  const {data: projects, isLoading} = useProjects();
  const {mutate} = useSWRConfig();

  // State is null until projects load. network.ts reads the id from localStorage on every request,
  // so requests made before the effect below stores one go out without X-Project-Id, or with a stale one
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);

  // Initialize active project from localStorage or use first project
  useEffect(() => {
    if (!projects) return;

    const choice = pickActiveProject(projects, localStorage.getItem('activeProjectId'));
    if (!choice) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveProjectState(choice.project);

    if (choice.persist) {
      localStorage.setItem('activeProjectId', choice.project.id);

      // Pages mount and fetch before this effect runs, so on a fresh session (e.g. after signing
      // out and back in) their requests went out without X-Project-Id, or with a stale one, and failed.
      // SWR does not retry errors here, so fetch everything again now that the id is stored.
      void mutate(() => true);
    }
  }, [projects, mutate]);

  const setActiveProject = (project: Project) => {
    setActiveProjectState(project);
    localStorage.setItem('activeProjectId', project.id);

    // Invalidate all SWR cache to refetch data for new project
    void mutate(() => true, undefined, {revalidate: true});
  };

  // Updates the active project's data in-place without invalidating the SWR cache.
  // Use this when saving settings for the current project, not when switching projects.
  const updateActiveProject = (project: Project) => {
    setActiveProjectState(project);
  };

  const value: ActiveProjectContextValue = {
    activeProject,
    setActiveProject,
    updateActiveProject,
    availableProjects: projects ?? [],
    isLoading,
  };

  return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>;
}

export function useActiveProject() {
  const context = use(ActiveProjectContext);
  if (context === undefined) {
    throw new Error('useActiveProject must be used within an ActiveProjectProvider');
  }
  return context;
}

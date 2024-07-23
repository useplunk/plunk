import React, {MutableRefObject, useEffect} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {useActiveProject, useProjects} from '../../../lib/hooks/projects';
import {useRouter} from 'next/router';
import {useAtom} from 'jotai';
import {atomActiveProject} from '../../../lib/atoms/project';

export interface ProjectSelectorProps {
  open: boolean;
  onToggle: () => void;
}

const ProjectSelector = React.forwardRef<HTMLDivElement, ProjectSelectorProps>(
  ({open, onToggle}: ProjectSelectorProps, ref) => {
    const router = useRouter();
    const {data: projects} = useProjects();
    const activeProject = useActiveProject();
    const [, setActiveProjectId] = useAtom(atomActiveProject);

    useEffect(() => {
      const mutableRef = ref as MutableRefObject<HTMLDivElement | null>;

      const handleClickOutside = (event: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (mutableRef.current && !mutableRef.current.contains(event.target) && open) {
          onToggle();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);

    const onChange = (project: string) => {
      localStorage.setItem('project', project);
      setActiveProjectId(project);
      window.location.href = '/';
    };

    return (
      <>
        <label htmlFor={'projects'} className="block select-none text-sm font-semibold text-neutral-600">
          Projects
        </label>
        <div ref={ref}>
          <div className="relative mt-1">
            <button
              type="button"
              className={
                'relative w-full cursor-pointer rounded border border-neutral-300 bg-white py-2 pl-3 pr-10 text-left focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm'
              }
              aria-haspopup="listbox"
              aria-expanded="true"
              aria-labelledby="listbox-label"
              onClick={onToggle}
            >
              <span className="block flex items-center gap-x-1.5 truncate font-medium">
                {activeProject?.name ?? 'No active project'}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <motion.svg
                  initial={{rotate: '90deg'}}
                  animate={open ? {rotate: '0deg'} : {rotate: '90deg'}}
                  className="h-5 w-5 text-neutral-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </motion.svg>
              </span>
            </button>

            <AnimatePresence>
              {open && (
                <motion.ul
                  initial={{opacity: 0, scale: 0.6}}
                  animate={{opacity: 1, scale: 1}}
                  exit={{opacity: 0, scale: 0.6}}
                  transition={{duration: 0.1}}
                  className={`absolute z-50 mt-1 w-full rounded bg-white text-base shadow-md ring-1 ring-neutral-800 ring-opacity-5 focus:outline-none sm:text-sm`}
                  tabIndex={-1}
                  role="listbox"
                  aria-labelledby="listbox-label"
                  aria-activedescendant="listbox-option-3"
                >
                  <div
                    className={
                      'scrollbar-w-2 scrollbar scrollbar-thumb-rounded-full scrollbar-thumb-neutral-400 scrollbar-track-neutral-100 max-h-72 overflow-y-scroll p-1'
                    }
                  >
                    {projects?.map((project, index) => {
                      return (
                        <li
                          key={`projects-${index}`}
                          className="relative flex cursor-default select-none items-center rounded-md py-2.5 pl-2.5 text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                          role="option"
                          onClick={() => {
                            onChange(project.id);
                            onToggle();
                          }}
                        >
                          <span
                            className={`${
                              project.id === activeProject?.id ? 'font-medium' : 'font-normal'
                            } flex items-center truncate`}
                          >
                            {project.name}
                          </span>
                          {project.id === activeProject?.id ? (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-800">
                              <svg
                                className="h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          ) : null}
                        </li>
                      );
                    })}

                    <hr className={'my-0.5'} />
                    <li
                      className="relative flex cursor-default select-none items-center rounded-md py-2.5 pl-2.5 text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                      role="option"
                      onClick={async () => {
                        await router.push('/new');
                      }}
                    >
                      <span className="flex items-center truncate font-normal">Create new project</span>
                    </li>
                  </div>
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>
      </>
    );
  },
);

export default ProjectSelector;

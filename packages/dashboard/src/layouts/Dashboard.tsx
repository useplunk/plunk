import React, {useState} from 'react';
import {FullscreenLoader, Redirect, Sidebar} from '../components';
import {useActiveProject, useProjects} from '../lib/hooks/projects';
import {useUser} from '../lib/hooks/users';
import {AnimatePresence, motion} from 'framer-motion';
import {useRouter} from 'next/router';

export const Dashboard = (props: {children: React.ReactNode}) => {
  const router = useRouter();
  const activeProject = useActiveProject();
  const {data: projects} = useProjects();
  const {data: user} = useUser();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!projects || !user || !activeProject) {
    return <FullscreenLoader />;
  }

  if (projects.length === 0) {
    return <Redirect to={'/new'} />;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onSidebarVisibilityChange={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <div className="flex w-0 flex-1 flex-col overflow-hidden">
          <div className="pl-1 pt-1 sm:pl-3 sm:pt-3 md:hidden">
            <button
              className="focus:ring-azure-500 -ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded text-neutral-500 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-inset"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <main className="relative z-0 flex-1 overflow-y-scroll focus:outline-none">
            <div className="min-h-screen">
              <div className="relative mx-auto min-h-screen">
                <AnimatePresence>
                  <motion.div
                    key={router.pathname}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.2, ease: 'easeInOut'}}
                    className="mx-auto h-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 md:px-8"
                  >
                    {props.children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

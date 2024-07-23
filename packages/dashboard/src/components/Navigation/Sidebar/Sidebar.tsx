import React, {ReactElement, useState} from 'react';
import {useRouter} from 'next/router';
import {AnimatePresence, motion} from 'framer-motion';
import Link from 'next/link';
import {ProjectSelector} from '../../index';
import Image from 'next/image';
import logo from '../../../../public/assets/logo.png';
import {Home, LayoutTemplate, LineChart, LogOut, Send, Settings, TerminalSquare, Users2, Workflow} from 'lucide-react';

interface SidebarLinkType {
  to: string;
  text: string;
  disabled: boolean;
  highlight?: boolean;
  position: 'top' | 'bottom';
  icon: ReactElement;
}

interface SidebarLinkProps {
  active?: boolean;
  to: string;
  text: string;
  disabled?: boolean;
  highlight?: boolean;
  svgPath: React.ReactElement;
}

export interface SidebarProps {
  mobileOpen: boolean;
  onSidebarVisibilityChange: () => void;
}

const links: SidebarLinkType[] = [
  {
    to: '/',
    text: 'Dashboard',
    disabled: false,
    position: 'top',
    icon: <Home />,
  },
  {
    to: '/contacts',
    text: 'Contacts',
    disabled: false,
    position: 'top',
    icon: <Users2 />,
  },
  {
    to: '/analytics',
    text: 'Analytics',
    disabled: false,
    position: 'top',
    icon: <LineChart />,
  },
  // {
  //   to: '/developers',
  //   text: 'Developers',
  //   disabled: false,
  //   position: 'top',
  //   icon: <TerminalSquare />,
  // },
  {
    to: '/settings/project',
    text: 'Project Settings',
    disabled: false,
    position: 'top',
    icon: <Settings />,
  },
  {
    to: '/events',
    text: 'Events',
    disabled: false,
    position: 'top',
    icon: <TerminalSquare />,
  },
  {
    to: '/templates',
    text: 'Templates',
    disabled: false,
    position: 'top',
    icon: <LayoutTemplate />,
  },
  {
    to: '/actions',
    text: 'Actions',
    disabled: false,
    position: 'top',
    icon: <Workflow />,
  },
  {
    to: '/campaigns',
    text: 'Campaigns',
    disabled: false,
    position: 'top',
    icon: <Send />,
  },

  // {
  //   to: '/settings/account',
  //   text: 'Account Settings',
  //   disabled: false,
  //   position: 'bottom',
  //   icon: (
  //     <>
  //       <Settings />
  //     </>
  //   ),
  // },
];

/**
 * @param root0
 * @param root0.active
 * @param root0.to
 * @param root0.text
 * @param root0.disabled
 * @param root0.svgPath
 * @param root0.highlight
 */
function SidebarLink({active, to, text, disabled, highlight, svgPath}: SidebarLinkProps) {
  if (to.startsWith('http')) {
    return (
      <a
        onClick={() => window.open(to, '_blank')?.focus()}
        className={`${
          active
            ? 'cursor-default bg-neutral-100 text-neutral-700'
            : disabled
              ? 'text-neutral-200'
              : 'cursor-pointer text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700'
        } flex items-center gap-x-3 rounded p-2 text-sm font-medium transition ease-in-out`}
      >
        <div className="flex h-5 w-5 items-center justify-center">{svgPath}</div>
        {text}
        {highlight && <div className="ml-auto rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">New</div>}
      </a>
    );
  }

  return (
    <Link
      href={to}
      className={`${
        active
          ? 'cursor-default bg-neutral-100 text-neutral-700'
          : disabled
            ? 'text-neutral-200'
            : 'cursor-pointer text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700'
      } flex items-center gap-x-3 rounded p-2 text-sm font-medium transition ease-in-out`}
    >
      <div className="flex h-5 w-5 items-center justify-center">{svgPath}</div>
      {text}
      {highlight && <div className="ml-auto rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">New</div>}
    </Link>
  );
}

/**
 * @param root0
 * @param root0.mobileOpen
 * @param root0.onSidebarVisibilityChange
 */
export default function Sidebar({mobileOpen, onSidebarVisibilityChange}: SidebarProps) {
  const router = useRouter();

  const projectSelectorRef = React.createRef<HTMLDivElement>();

  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{opacity: 0, x: -100}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -100}}
            transition={{ease: 'easeOut', duration: 0.15}}
            className="fixed inset-0 z-40 flex w-full md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              animate={{opacity: [0, 1]}}
              transition={{ease: 'easeOut', duration: 0.15}}
              className="fixed inset-0 bg-neutral-600 bg-opacity-75"
              aria-hidden={!mobileOpen}
            />

            <div className="relative flex h-full w-full max-w-xs flex-1 flex-col bg-white">
              <div className="absolute right-0 top-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => onSidebarVisibilityChange()}
                >
                  <span className="sr-only">Close sidebar</span>
                  <svg
                    className="h-6 w-6 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="h-0 flex-1 overflow-y-auto pb-4 pt-5">
                <div className="flex flex-shrink-0 items-center px-4">
                  <Link href={'/'} passHref>
                    <Image className={'cursor-pointer'} width={40} height={40} quality={40} src={logo} alt="Logo" />
                  </Link>
                </div>

                <div className={'mt-5 px-2'}>
                  <ProjectSelector
                    open={projectSelectorOpen}
                    onToggle={() => setProjectSelectorOpen(!projectSelectorOpen)}
                    ref={projectSelectorRef}
                  />
                </div>

                <nav className="mt-5 space-y-1 px-2">
                  {links
                    .filter(l => l.position === 'top')
                    .map((link, index) => {
                      return (
                        <SidebarLink
                          key={`mobile-top-${index}`}
                          active={
                            link.to === '/'
                              ? router.pathname === link.to
                              : router.pathname.split('/')[1].includes(link.to.split('/')[1])
                          }
                          to={link.to}
                          text={link.text}
                          disabled={link.disabled}
                          svgPath={link.icon}
                        />
                      );
                    })}
                </nav>
              </div>

              <div className="flex-0 mb-4 space-y-1 bg-white px-2">
                <nav>
                  {links
                    .filter(l => l.position === 'bottom')
                    .map((link, index) => {
                      return (
                        <SidebarLink
                          key={`mobile-bottom-${index}`}
                          active={router.pathname === link.to}
                          to={link.to}
                          text={link.text}
                          disabled={link.disabled}
                          svgPath={link.icon}
                        />
                      );
                    })}
                </nav>
              </div>
            </div>

            <div className="w-14 flex-shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex w-72 flex-col">
          <div className="flex h-0 flex-1 flex-col border-r border-neutral-100 bg-white px-6">
            <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
              <div className="flex flex-shrink-0 items-center justify-center px-4">
                <Link href={'/'} passHref>
                  <Image className={'cursor-pointer'} width={35} height={35} quality={80} src={logo} alt="Logo" />
                </Link>
              </div>

              <div className={'px-2'}>
                <ProjectSelector
                  open={projectSelectorOpen}
                  onToggle={() => setProjectSelectorOpen(!projectSelectorOpen)}
                  ref={projectSelectorRef}
                />
              </div>

              <nav className="mt-5 flex-1 space-y-1 px-2">
                {links
                  .filter(l => l.position === 'top')
                  .map((link, index) => {
                    if (link.to === '/events') {
                      return (
                        <div className={'pt-3'}>
                          <p className={'pb-1 text-sm font-semibold text-neutral-500'}>Automations</p>
                          <SidebarLink
                            key={`desktop-top-${index}`}
                            active={router.pathname.split('/')[1].includes(link.to.split('/')[1])}
                            to={link.to}
                            text={link.text}
                            disabled={link.disabled}
                            svgPath={link.icon}
                            highlight={link.highlight}
                          />
                        </div>
                      );
                    }

                    if (link.to === '/campaigns') {
                      return (
                        <div className={'py-3'}>
                          <p className={'pb-1 text-sm font-semibold text-neutral-500'}>Campaigns</p>
                          <SidebarLink
                            key={`desktop-top-${index}`}
                            active={router.pathname.split('/')[1].includes(link.to.split('/')[1])}
                            to={link.to}
                            text={link.text}
                            disabled={link.disabled}
                            svgPath={link.icon}
                            highlight={link.highlight}
                          />
                        </div>
                      );
                    }

                    return (
                      <SidebarLink
                        key={`desktop-top-${index}`}
                        active={
                          link.to === '/'
                            ? router.pathname === link.to
                            : router.pathname.split('/')[1].includes(link.to.split('/')[1])
                        }
                        to={link.to}
                        text={link.text}
                        disabled={link.disabled}
                        svgPath={link.icon}
                        highlight={link.highlight}
                      />
                    );
                  })}
              </nav>
            </div>

            <div className="flex-0 mb-4 w-full space-y-1 bg-white px-2">
              <Link
                href={'/auth/logout'}
                className={
                  'flex cursor-pointer items-center gap-x-3 rounded p-2 text-sm font-medium text-neutral-400 transition ease-in-out hover:bg-neutral-50 hover:text-neutral-700'
                }
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  <LogOut />
                </div>
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

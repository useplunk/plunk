import Link from 'next/link';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import Image from 'next/image';
import logo from '../../../public/assets/logo.svg';
import {Bot, ChevronDown, GitBranch, Inbox, Mail, Server, Users} from 'lucide-react';

import {Label} from '../Mono';

interface FeatureLink {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

interface FeatureGroup {
  name: string;
  items: FeatureLink[];
}

/**
 * The features menu, grouped.
 *
 * Six flat rows in a 320px column left every description wrapping to two or
 * three lines, which is what made the panel feel cramped: the height came from
 * wrapping, not from the number of items. Grouping gives the reader a level to
 * scan before they read any names, and the wider panel lets each description
 * sit on one line.
 *
 * Inbound Email sits under Audience rather than with the sending plumbing
 * because its first job is capturing contacts, which is how its own feature
 * page opens.
 *
 * Order matters: the grid is row-major over two columns, so this list fills
 * column one with Sending + Automation and column two with Audience +
 * Developers, which keeps three items under each.
 */
const featureGroups: FeatureGroup[] = [
  {
    name: 'Sending',
    items: [
      {
        title: 'Email Editor',
        description: 'Visual and code editing',
        href: '/features/email-editor',
        icon: <Mail className="h-4 w-4" strokeWidth={1.75} />,
      },
      {
        title: 'SMTP',
        description: 'Send from any client',
        href: '/features/smtp',
        icon: <Server className="h-4 w-4" strokeWidth={1.75} />,
      },
    ],
  },
  {
    name: 'Audience',
    items: [
      {
        title: 'Segments',
        description: 'Filter contacts by behaviour',
        href: '/features/segments',
        icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
      },
      {
        title: 'Inbound Email',
        description: 'Receive at your domain',
        href: '/features/inbound-email',
        icon: <Inbox className="h-4 w-4" strokeWidth={1.75} />,
      },
    ],
  },
  {
    name: 'Automation',
    items: [
      {
        title: 'Workflows',
        description: 'Triggers, delays, conditions',
        href: '/features/workflows',
        icon: <GitBranch className="h-4 w-4" strokeWidth={1.75} />,
      },
    ],
  },
  {
    name: 'Developers',
    items: [
      {
        title: 'MCP Server',
        description: 'Claude, Cursor and agents',
        href: '/features/mcp',
        icon: <Bot className="h-4 w-4" strokeWidth={1.75} />,
      },
    ],
  },
];

const groupId = (name: string) => `features-group-${name.toLowerCase()}`;

/**
 * One row in the features menu. The icon tile inverts on hover and on
 * keyboard focus, so pointer and keyboard users get the same feedback —
 * hover-only affordances leave keyboard users with nothing.
 */
function FeatureRow({item, onNavigate}: {item: FeatureLink; onNavigate: () => void}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={
        'group/row flex items-start gap-3 rounded-[10px] p-2.5 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
      }
    >
      <span
        aria-hidden
        className={
          'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors group-hover/row:bg-neutral-900 group-hover/row:text-white group-focus-visible/row:bg-neutral-900 group-focus-visible/row:text-white'
        }
      >
        {item.icon}
      </span>
      <span className={'min-w-0'}>
        <span className={'block font-semibold text-neutral-900'}>{item.title}</span>
        <span className={'mt-0.5 block text-ui text-neutral-600'}>{item.description}</span>
      </span>
    </Link>
  );
}


/**
 *
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Whether the panel is open because the pointer is over the trigger.
   *
   * Without this, hover and click fight each other: a mouse necessarily hovers
   * before it clicks, so the click arrives with the panel already open and a
   * naive toggle closes it again. The trigger looks broken to every mouse user
   * and works only for keyboards. Tracking why it opened lets the click pin a
   * hover-opened panel instead of closing it.
   */
  const openedByHover = useRef(false);

  const closeFeatures = useCallback(() => {
    openedByHover.current = false;
    setFeaturesOpen(false);
  }, []);

  const toggleFeatures = useCallback(() => {
    if (openedByHover.current) {
      // Hover got there first; this click pins it rather than undoing it.
      openedByHover.current = false;
      setFeaturesOpen(true);
      return;
    }
    setFeaturesOpen(open => !open);
  }, []);

  /**
   * Escape closes and returns focus to the trigger, and a click anywhere
   * outside dismisses. Previously the panel opened on mouseenter alone: it had
   * no click handler, no aria-expanded and no key handling, so a keyboard user
   * could not open it at all.
   */
  useEffect(() => {
    if (!featuresOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setFeaturesOpen(false);
      featuresButtonRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (featuresRef.current?.contains(event.target as Node)) return;
      setFeaturesOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [featuresOpen]);

  return (
    <header className={'sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm'}>
      <div className={'relative mx-auto max-w-[88rem] px-6 sm:px-10'}>
        <div className={'py-5'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex flex-shrink-0 items-center">
                <Link href={'/'} className={'flex items-center gap-x-3'}>
                  <div className={'relative h-8 w-8'}>
                    <Image src={logo} alt={'Plunk logo'} fill className={'object-contain'} />
                  </div>
                  <span className={'sr-only'}>Plunk</span>
                </Link>
              </div>
              <div className="hidden items-center gap-8 md:flex">
                <div
                  ref={featuresRef}
                  className={'relative'}
                  onMouseEnter={() => {
                    openedByHover.current = true;
                    setFeaturesOpen(true);
                  }}
                  onMouseLeave={closeFeatures}
                  onBlur={event => {
                    // Tabbing out of the panel closes it, the keyboard
                    // equivalent of the pointer leaving.
                    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                    closeFeatures();
                  }}
                >
                  <button
                    ref={featuresButtonRef}
                    type={'button'}
                    aria-expanded={featuresOpen}
                    aria-haspopup={'true'}
                    aria-controls={'features-menu'}
                    onClick={toggleFeatures}
                    className={
                      'flex items-center gap-1.5 rounded-md text-ui font-medium text-neutral-600 transition hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900'
                    }
                  >
                    Features
                    <ChevronDown
                      aria-hidden
                      className={`h-4 w-4 transition-transform ${featuresOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {featuresOpen && (
                      <motion.div
                        // AnimatePresence tracks children by key; without one it
                        // cannot run the exit, and the panel stays mounted and
                        // visible after closing with its links still tabbable.
                        key={'features-menu'}
                        id={'features-menu'}
                        initial={{opacity: 0, y: -6}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -6}}
                        transition={{duration: 0.18, ease: [0.22, 1, 0.36, 1]}}
                        // The 12px gap below the trigger is padding on this
                        // wrapper rather than a margin on the card, so the
                        // pointer stays inside the hover region while it travels
                        // from the button to the panel. As a margin it was a dead
                        // zone: crossing it fired mouseleave and shut the menu
                        // before you could reach an item.
                        className={'absolute left-0 top-full z-50 pt-3'}
                      >
                        <div
                          className={
                            'w-[36rem] max-w-[calc(100vw-3rem)] rounded-card border border-neutral-200 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(23,23,23,0.18)]'
                          }
                        >
                        {/* Two columns, row-major: Sending + Automation on the
                            left, Audience + Developers on the right. Tight
                            inside a group, generous between them — the gap is
                            what does the grouping work, not a border. */}
                        <div className={'grid grid-cols-2 gap-x-8 gap-y-7'}>
                          {featureGroups.map(group => (
                            <div key={group.name}>
                              <div
                                id={groupId(group.name)}
                                className={'mb-2 border-b border-neutral-200 px-2.5 pb-2'}
                              >
                                <Label>{group.name}</Label>
                              </div>
                              <ul aria-labelledby={groupId(group.name)}>
                                {group.items.map(item => (
                                  <li key={item.href}>
                                    <FeatureRow item={item} onNavigate={closeFeatures} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  href={'/made-by-humans'}
                  className={'text-ui font-medium text-neutral-600 transition hover:text-neutral-900'}
                >
                  By humans
                </Link>

                <Link
                  href={'/pricing'}
                  className={'text-ui font-medium text-neutral-600 transition hover:text-neutral-900'}
                >
                  Pricing
                </Link>

                <Link
                  href={'/guides'}
                  className={'text-ui font-medium text-neutral-600 transition hover:text-neutral-900'}
                >
                  Guides
                </Link>

                <Link
                  href={WIKI_URI}
                  target={'_blank'}
                  rel={'noreferrer'}
                  className={
                    'flex items-center gap-x-1.5 text-ui font-medium text-neutral-600 transition hover:text-neutral-900'
                  }
                >
                  Docs
                  <svg className={'h-3.5 w-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.25 4.75H6.75C5.64543 4.75 4.75 5.64543 4.75 6.75V17.25C4.75 18.3546 5.64543 19.25 6.75 19.25H17.25C18.3546 19.25 19.25 18.3546 19.25 17.25V14.75"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.25 9.25V4.75H14.75" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 5L11.75 12.25" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="hidden items-center gap-6 md:flex">
              <a
                href={`${DASHBOARD_URI}/auth/login`}
                className={'text-ui font-medium text-neutral-600 transition hover:text-neutral-900'}
              >
                Sign in
              </a>
              <motion.a
                whileHover={{scale: 1.02}}
                whileTap={{scale: 0.98}}
                href={`${DASHBOARD_URI}/auth/signup`}
                className={
                  'rounded-full bg-neutral-900 px-6 py-2.5 text-ui font-semibold text-white transition hover:bg-neutral-800'
                }
              >
                Get started
              </motion.a>
            </div>

            <div className="-mr-2 flex items-center md:hidden">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                type="button"
                className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral-900"
                aria-controls="mobile-menu"
                aria-expanded={mobileOpen}
              >
                <span className="sr-only">Open main menu</span>

                <svg
                  className={`${mobileOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>

                <svg
                  className={`${!mobileOpen ? 'hidden' : 'block'} h-6 w-6`}
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
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              // aria-controls on the trigger already pointed at "mobile-menu",
              // but nothing carried that id, so the reference dangled. The key
              // is what lets AnimatePresence run the exit and unmount it.
              key={'mobile-menu'}
              id={'mobile-menu'}
              initial={{height: 0, opacity: 0}}
              animate={{height: 'auto', opacity: 1}}
              exit={{height: 0, opacity: 0}}
              transition={{duration: 0.2}}
              className="absolute left-0 top-full z-50 w-full overflow-hidden border-t border-neutral-100 bg-white shadow-lg md:hidden"
            >
              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.2}}
                className="space-y-1 p-4"
              >
                {/* One column on a phone, so the groups stack rather than sit
                    side by side, but the same headings keep the two menus
                    telling the same story. */}
                <div className="mb-2 space-y-5">
                  {featureGroups.map(group => (
                    <div key={group.name}>
                      <div
                        id={`mobile-${groupId(group.name)}`}
                        className={'mb-1 border-b border-neutral-200 px-2.5 pb-2'}
                      >
                        <Label>{group.name}</Label>
                      </div>
                      <ul aria-labelledby={`mobile-${groupId(group.name)}`}>
                        {group.items.map(item => (
                          <li key={item.href}>
                            <FeatureRow item={item} onNavigate={() => setMobileOpen(false)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <Link
                  href={'/made-by-humans'}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-ui font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  By humans
                </Link>

                <Link
                  href={'/pricing'}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-ui font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  Pricing
                </Link>

                <Link
                  href={'/guides'}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-3 text-ui font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  Guides
                </Link>

                <a
                  href={WIKI_URI}
                  target={'_blank'}
                  rel={'noreferrer'}
                  className="block rounded-lg px-4 py-3 text-ui font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  Docs
                </a>

                <div className="border-t border-neutral-200 pt-4">
                  <a
                    href={`${DASHBOARD_URI}/auth/login`}
                    className="block rounded-lg px-4 py-3 text-ui font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    Sign in
                  </a>
                  <a
                    href={`${DASHBOARD_URI}/auth/signup`}
                    className="mt-2 block rounded-full bg-neutral-900 px-4 py-3 text-center text-ui font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Get started
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

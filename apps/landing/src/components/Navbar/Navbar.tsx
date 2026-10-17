import Link from 'next/link';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import Image from 'next/image';
import logo from '../../../public/assets/logo.svg';
import {ArrowRight, Bot, ChevronDown, GitBranch, Inbox, Mail, Megaphone, Send, Server, Users} from 'lucide-react';

interface FeatureLink {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

/**
 * The features menu, flat.
 *
 * It used to group six items under four mono headings with rules under each,
 * two of which held a single item, so the panel was mostly scaffolding. Six
 * links read fine on their own in two columns; order is row-major, so the
 * automation and audience features lead.
 */
const features: FeatureLink[] = [
  {
    title: 'Transactional email',
    description: 'Send from your app with one API call',
    href: '/features/transactional-email',
    icon: <Send className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Campaigns',
    description: 'Newsletters and product updates',
    href: '/features/campaigns',
    icon: <Megaphone className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Workflows',
    description: 'Automate email from product events',
    href: '/features/workflows',
    icon: <GitBranch className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Segments',
    description: 'Audiences that stay up to date',
    href: '/features/segments',
    icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Email editor',
    description: 'Visual and HTML in one editor',
    href: '/features/email-editor',
    icon: <Mail className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'Inbound email',
    description: 'Receive email at your domain',
    href: '/features/inbound-email',
    icon: <Inbox className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'SMTP',
    description: 'Send from any existing client',
    href: '/features/smtp',
    icon: <Server className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    title: 'MCP server',
    description: 'Let your agent run your email',
    href: '/features/mcp',
    icon: <Bot className="h-4 w-4" strokeWidth={1.75} />,
  },
];

/**
 * One row in the features menu. Hover and keyboard focus get the same quiet
 * feedback: a pale row and an icon tile that turns white against it.
 */
function FeatureRow({item, onNavigate}: {item: FeatureLink; onNavigate: () => void}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={
        'group/row flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-tile focus-visible:bg-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
      }
    >
      <span
        aria-hidden
        className={
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition-colors group-hover/row:bg-white group-hover/row:shadow-fragment group-focus-visible/row:bg-white'
        }
      >
        {item.icon}
      </span>
      <span className={'min-w-0'}>
        <span className={'block text-ui font-semibold text-neutral-900'}>{item.title}</span>
        <span className={'block text-label text-neutral-500'}>{item.description}</span>
      </span>
    </Link>
  );
}

/** GitHub's mark; lucide no longer ships brand icons. */
function GitHubMark({className}: {className?: string}) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const REPO_URL = 'https://github.com/useplunk/plunk';

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
                            'w-[38rem] max-w-[calc(100vw-3rem)] rounded-card border border-neutral-200 bg-white p-2 shadow-[0_12px_32px_-16px_rgba(23,23,23,0.22)]'
                          }
                        >
                          <ul className={'grid grid-cols-2 gap-1'}>
                            {features.map(item => (
                              <li key={item.href}>
                                <FeatureRow item={item} onNavigate={closeFeatures} />
                              </li>
                            ))}
                          </ul>
                          <Link
                            href={'/changelog'}
                            onClick={closeFeatures}
                            className={
                              'group/foot mt-1 flex items-center justify-between gap-4 rounded-xl bg-tile px-4 py-3 text-ui transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
                            }
                          >
                            <span className={'text-neutral-600'}>See what shipped recently</span>
                            <span className={'inline-flex items-center gap-1.5 font-semibold text-neutral-900'}>
                              Changelog
                              <ArrowRight
                                aria-hidden
                                className={'h-3.5 w-3.5 transition-transform group-hover/foot:translate-x-0.5'}
                              />
                            </span>
                          </Link>
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
              {/* The star count is the one stat from the old hero strip worth
                  keeping, and it belongs next to the repository it counts. */}
              <a
                href={REPO_URL}
                target={'_blank'}
                rel={'noopener noreferrer'}
                aria-label={'Plunk on GitHub, 5,000+ stars'}
                className={
                  'inline-flex items-center gap-2 text-ui font-medium text-neutral-600 transition hover:text-neutral-900'
                }
              >
                <GitHubMark className={'h-4 w-4'} />
                <span className={'tabular-nums'}>5k</span>
              </a>
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
                Start for free
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
                <p className={'px-3 pb-1 pt-1 text-label font-semibold text-neutral-500'}>Features</p>
                <ul className={'mb-3'}>
                  {features.map(item => (
                    <li key={item.href}>
                      <FeatureRow item={item} onNavigate={() => setMobileOpen(false)} />
                    </li>
                  ))}
                </ul>

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

                <a
                  href={WIKI_URI}
                  target={'_blank'}
                  rel={'noreferrer'}
                  className="block rounded-lg px-4 py-3 text-ui font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  Docs
                </a>

                <a
                  href={REPO_URL}
                  target={'_blank'}
                  rel={'noopener noreferrer'}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-ui font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <GitHubMark className={'h-4 w-4'} />
                  GitHub
                  <span className={'text-neutral-500 tabular-nums'}>5,000+ stars</span>
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
                    Start for free
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

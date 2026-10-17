import {NextSeo} from 'next-seo';
import React from 'react';
import {FeatureCTA, Footer, Navbar, SectionHeader} from '../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../lib/constants';
import {PackageOpen, X, Check} from 'lucide-react';
import {GithubIcon} from 'lucide-react';

/**
 * Everything on every plan, grouped the way people shop for it, as short tick
 * lists. This was eleven full-width rows of title plus sentence, which took
 * a screen and a half to read and still left out half of what you get.
 */
const includedGroups: {title: string; items: string[]}[] = [
  {
    title: 'Sending',
    items: [
      'Transactional email',
      'Campaigns and newsletters',
      'SMTP relay',
      'Custom domains with DKIM',
      'Open and click tracking',
    ],
  },
  {
    title: 'Audience',
    items: ['Unlimited contacts', 'Dynamic segments', 'Email validation', 'Unsubscribe handling', 'Inbound email'],
  },
  {
    title: 'Automation',
    items: ['Event-triggered workflows', 'Delays and conditions', 'Webhook steps', 'Segment entry triggers'],
  },
  {
    title: 'Building',
    items: ['Visual and HTML editor', 'REST API', 'MCP server for agents', 'Open source, self-hostable'],
  },
];

export default function Pricing() {
  return (
    <>
      <NextSeo
        canonical="https://www.useplunk.com/pricing"
        title={'Plunk Pricing | The Open-Source Email Platform'}
        description={
          'Email pricing at $0.001 per email with unlimited contacts. The free plan includes 1,000 emails a month across transactional, workflow, and campaign email.'
        }
        openGraph={{
          url: 'https://www.useplunk.com/pricing',
          title: 'Plunk Pricing | The Open-Source Email Platform',
          description:
            'Transparent email pricing at $0.001 per email with no contact limits. Free plan includes 1,000 emails/month. No hidden fees.',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Simple%2C+Honest+Pricing&description=%240.001+per+email.+No+contact+limits.+Free+to+start.',
              width: 1200,
              height: 630,
              alt: 'Plunk Pricing',
            },
          ],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        {/* Hero */}
        <section className={'relative overflow-hidden'}>
          <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pt-28 sm:pb-28'}>
            <div className={'hero-enter mx-auto max-w-4xl text-center'}>
              <h1
                className={
                  'font-display text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'
                }
              >
                Simple, transparent pricing
              </h1>
              <p className={'mx-auto mt-6 max-w-2xl text-lead text-neutral-600'}>
                Free plan: 1,000 emails per month. Paid plan: $0.001 per email. Unlimited contacts, no hidden fees.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing tiers */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10'}>
            <div className={'mx-auto grid max-w-4xl gap-px bg-neutral-200 sm:grid-cols-2'}>
              {/* Free */}
              <div className={'hero-enter flex flex-col bg-white p-10'} style={{animationDelay: '0.1s'}}>
                <p className={'text-label font-semibold text-neutral-500'}>Free forever</p>
                <div className={'mt-4 flex items-baseline gap-2'}>
                  <span className={'font-display text-6xl font-extrabold tracking-[-0.03em] text-neutral-900'}>
                    1,000
                  </span>
                  <span className={'text-lg text-neutral-500'}>emails / mo</span>
                </div>
                <p className={'mt-2 text-ui text-neutral-500'}>No credit card required</p>

                <ul className={'mt-8 flex-1 space-y-3'}>
                  {[
                    'Transactional emails',
                    'Workflow automation',
                    'Campaign broadcasts',
                    'Inbound email',
                    'Email validation',
                    'Custom domains',
                    'Click & open tracking',
                    'Unlimited contacts',
                  ].map(item => (
                    <li key={item} className={'flex items-center gap-3 text-ui text-neutral-600'}>
                      <Check className={'h-4 w-4 flex-shrink-0 text-neutral-900'} />
                      {item}
                    </li>
                  ))}
                  <li className={'flex items-center gap-3 text-ui text-neutral-500'}>
                    <X className={'h-4 w-4 flex-shrink-0'} />
                    Plunk branding on emails
                  </li>
                </ul>

                <motion.a
                  href={`${DASHBOARD_URI}/auth/signup`}
                  whileHover={{scale: 1.02}}
                  whileTap={{scale: 0.98}}
                  className={
                    'mt-10 block w-full rounded-full border border-neutral-300 px-6 py-3 text-center text-ui font-semibold text-neutral-900 transition hover:border-neutral-900'
                  }
                >
                  Start for free
                </motion.a>
              </div>

              {/* Pay as you grow */}
              <div className={'hero-enter flex flex-col bg-neutral-900 p-10 text-white'} style={{animationDelay: '0.2s'}}>
                <p className={'text-label font-semibold text-neutral-400'}>Pay as you grow</p>
                <div className={'mt-4 flex items-baseline gap-2'}>
                  <span className={'font-display text-6xl font-extrabold tracking-[-0.03em] text-white'}>$0.001</span>
                  <span className={'text-lg text-neutral-400'}>/ email</span>
                </div>
                <p className={'mt-2 text-ui'}>&nbsp;</p>

                <ul className={'mt-8 flex-1 space-y-3'}>
                  {['Everything in Free', 'No Plunk branding', 'Monthly spend cap', 'Unlimited emails'].map(item => (
                    <li key={item} className={'flex items-center gap-3 text-ui text-neutral-300'}>
                      <Check className={'h-4 w-4 flex-shrink-0 text-white'} />
                      {item}
                    </li>
                  ))}
                </ul>

                <motion.a
                  href={`${DASHBOARD_URI}/auth/signup`}
                  whileHover={{scale: 1.02}}
                  whileTap={{scale: 0.98}}
                  className={
                    'mt-10 block w-full rounded-full bg-white px-6 py-3 text-center text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'
                  }
                >
                  Get started
                </motion.a>
              </div>
            </div>
          </div>
        </section>

        {/* Every feature included */}
        <section>
          <div className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10'}>
            <SectionHeader
              title={'Every feature, every plan.'}
              subtitle={'No feature tiers, no add-ons, no surprises.'}
            />

            <div className={'mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
              {includedGroups.map((group, i) => (
                <motion.div
                  key={group.title}
                  initial={{opacity: 0, y: 12}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-10%'}}
                  transition={{duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1]}}
                  className={'rounded-card bg-tile p-6 sm:p-7'}
                >
                  <h3 className={'font-display text-lg font-semibold text-neutral-900'}>{group.title}</h3>
                  <ul className={'mt-5 flex flex-col gap-3'}>
                    {group.items.map(item => (
                      <li key={item} className={'flex items-start gap-2.5 text-ui text-neutral-700'}>
                        <Check
                          aria-hidden
                          strokeWidth={2.25}
                          className={'mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-900'}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Self-host */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'overflow-hidden rounded-card border border-neutral-200 bg-white'}
            >
              <div className={'flex flex-col items-center gap-6 p-10 sm:flex-row sm:gap-0'}>
                <div className={'flex-1 text-center sm:text-left'}>
                  <div className={'mb-3 inline-flex items-center gap-2 text-label text-neutral-500'}>
                    <PackageOpen className={'h-3.5 w-3.5'} />
                    Self-hostable
                  </div>
                  <h2 className={'font-display text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>
                    Run it on your own infrastructure
                  </h2>
                  <p className={'mt-2 text-neutral-600'}>
                    Full data ownership, no per-email costs, and GDPR compliance by default. Deploy with Docker Compose
                    in minutes.
                  </p>
                </div>
                <div className={'sm:ml-auto sm:pl-8'}>
                  <motion.button
                    onClick={() => window.open('https://github.com/useplunk/plunk', '_blank')}
                    whileHover={{scale: 1.02}}
                    whileTap={{scale: 0.98}}
                    className={
                      'flex w-full items-center justify-center gap-x-3 rounded-full bg-neutral-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-neutral-800 sm:w-auto'
                    }
                  >
                    <GithubIcon size={18} />
                    View on GitHub
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <FeatureCTA
          title={'Start sending in 5 minutes.'}
          body={'Start free. No credit card required.'}
          secondary={{href: 'https://github.com/useplunk/plunk', label: 'Self-host for free', external: true}}
        />
      </main>

      <Footer />
    </>
  );
}

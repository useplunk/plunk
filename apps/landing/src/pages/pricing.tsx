import {NextSeo} from 'next-seo';
import React from 'react';
import {Footer, Navbar, SectionHeader} from '../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../lib/constants';
import {
  ArrowRight,
  BarChart3,
  Code2,
  Globe,
  Mail,
  PackageOpen,
  Shield,
  Users,
  Zap,
  X,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import {GithubIcon} from 'lucide-react';

const includedFeatures = [
  {
    icon: <Mail className="h-5 w-5" />,
    title: 'Transactional emails',
    description: 'API and SMTP delivery for receipts, password resets, and any event-driven email.',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Workflow automation',
    description: 'Build event-triggered sequences with delays, conditions, and branching logic.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Campaign broadcasts',
    description: 'Send newsletters and announcements to your full list or a targeted segment.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Unlimited contacts',
    description: 'Store as many contacts as you need. Growing your list never costs more.',
  },
  {
    icon: <Code2 className="h-5 w-5" />,
    title: 'Full API access',
    description: 'REST API with SDKs for Node.js, Python, and more. Comprehensive documentation.',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Custom domains',
    description: 'Send from your own domain with DKIM, SPF, and DMARC set up automatically.',
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: 'Audience segmentation',
    description: 'Dynamic segments built on behavior, attributes, and engagement data.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Analytics & tracking',
    description: 'Opens, clicks, bounces, and unsubscribes. Real data, no guessing.',
  },
  {
    icon: <PackageOpen className="h-5 w-5" />,
    title: 'Open source',
    description: 'AGPL-3.0 licensed. Inspect the code, self-host it, or contribute to it.',
  },
];

export default function Pricing() {
  return (
    <>
      <NextSeo
        title={'Plunk Pricing | The Open-Source Email Platform'}
        description={
          'Transparent email pricing at $0.001 per email with no contact limits. Free plan includes 1,000 emails/month across transactional, workflow, and campaign emails. No hidden fees, pay only for what you use.'
        }
        openGraph={{
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
        additionalMetaTags={[{property: 'title', content: 'Plunk Pricing | The Open-Source Email Platform'}]}
      />

      <Navbar />

      <main className={'text-neutral-800'}>

        {/* Hero */}
        <section className={'relative overflow-hidden'}>
          <div
            aria-hidden
            className={
              'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
            }
          />
          <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pt-28 sm:pb-28'}>
            <motion.div
              initial={{opacity: 0, y: 16}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mx-auto max-w-4xl text-center'}
            >
              <h1
                style={{fontFamily: 'var(--font-display)'}}
                className={
                  'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'
                }
              >
                Simple, transparent pricing
              </h1>
              <p className={'mx-auto mt-6 max-w-2xl text-lead text-neutral-600'}>
                Free plan: 1,000 emails per month. Paid plan: $0.001 per email. Unlimited contacts, no hidden fees.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing tiers */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10'}>
            <div className={'mx-auto grid max-w-4xl gap-px bg-neutral-200 sm:grid-cols-2'}>
              {/* Free */}
              <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
                className={'flex flex-col bg-white p-10'}
              >
                <p
                  style={{fontFamily: 'var(--font-mono)'}}
                  className={'text-label font-semibold text-neutral-500'}
                >
                  Free forever
                </p>
                <div className={'mt-4 flex items-baseline gap-2'}>
                  <span
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'text-6xl font-extrabold tracking-[-0.03em] text-neutral-900'}
                  >
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
              </motion.div>

              {/* Pay as you grow */}
              <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
                className={'flex flex-col bg-neutral-900 p-10 text-white'}
              >
                <p
                  style={{fontFamily: 'var(--font-mono)'}}
                  className={'text-label font-semibold text-neutral-400'}
                >
                  Pay as you grow
                </p>
                <div className={'mt-4 flex items-baseline gap-2'}>
                  <span
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'text-6xl font-extrabold tracking-[-0.03em] text-white'}
                  >
                    $0.001
                  </span>
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
              </motion.div>
            </div>
          </div>
        </section>

        {/* Every feature included */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10'}>
            <SectionHeader
              title={'Every feature, every plan.'}
              subtitle={'No feature tiers, no add-ons, no surprises.'}
            />

            <ul className={'mt-16 divide-y divide-neutral-200 border-y border-neutral-200'}>
              {includedFeatures.map((feature, index) => (
                <motion.li
                  key={feature.title}
                  initial={{opacity: 0, y: 12}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: index * 0.04, ease: [0.22, 1, 0.36, 1]}}
                  className={'grid gap-3 py-7 sm:grid-cols-[1fr_2fr] sm:items-baseline sm:gap-12 sm:py-8'}
                >
                  <h3
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'text-base font-semibold text-neutral-900'}
                  >
                    {feature.title}
                  </h3>
                  <p className={'text-ui leading-relaxed text-neutral-600'}>{feature.description}</p>
                </motion.li>
              ))}
            </ul>
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
                  <div
                    style={{fontFamily: 'var(--font-mono)'}}
                    className={'mb-3 inline-flex items-center gap-2 text-label text-neutral-500'}
                  >
                    <PackageOpen className={'h-3.5 w-3.5'} />
                    Self-hostable
                  </div>
                  <h2
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'text-2xl font-bold tracking-[-0.025em] text-neutral-900'}
                  >
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
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-32 sm:px-10 sm:py-40'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}
              >
                Start sending in 5 minutes.
              </motion.h2>

              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                className={'flex max-w-md flex-col gap-6'}
              >
                <p className={'text-lead text-neutral-300'}>
                  Start free. No credit card required.
                </p>
                <div className={'flex flex-wrap gap-3'}>
                  <motion.a
                    whileHover={{scale: 1.015}}
                    whileTap={{scale: 0.985}}
                    href={`${DASHBOARD_URI}/auth/signup`}
                    className={
                      'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'
                    }
                  >
                    Create free account
                    <ArrowRight className="h-4 w-4" />
                  </motion.a>
                  <Link
                    href={'https://github.com/useplunk/plunk'}
                    target={'_blank'}
                    className={
                      'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'
                    }
                  >
                    Self-host for free
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

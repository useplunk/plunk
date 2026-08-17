import {Footer, Navbar} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, Book, Code, Mail, Shield, TrendingUp, Users} from 'lucide-react';

interface Guide {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{className?: string; strokeWidth?: number}>;
  badge?: string;
}

const guides: Guide[] = [
  {
    title: 'What is DKIM?',
    description: 'Learn how DKIM email authentication works and why it matters for deliverability.',
    href: '/guides/what-is-dkim',
    icon: Shield,
    badge: 'Authentication',
  },
  {
    title: 'What is SPF?',
    description: 'Understand SPF records and how they protect your emails from spoofing.',
    href: '/guides/what-is-spf',
    icon: Shield,
    badge: 'Authentication',
  },
  {
    title: 'What is DMARC?',
    description: 'Complete guide to DMARC policies and email security best practices.',
    href: '/guides/what-is-dmarc',
    icon: Shield,
    badge: 'Authentication',
  },
  {
    title: 'Email Deliverability Guide',
    description: 'Improve your email deliverability with best practices and proven strategies.',
    href: '/guides/email-deliverability',
    icon: TrendingUp,
    badge: 'Deliverability',
  },
  {
    title: 'Email Open Rates',
    description: 'Industry benchmarks and strategies to improve your email open rates.',
    href: '/guides/email-open-rate',
    icon: Mail,
    badge: 'Analytics',
  },
  {
    title: 'Email Marketing Best Practices',
    description: 'Comprehensive guide to email marketing: timing, content, design, and more.',
    href: '/guides/email-marketing-best-practices',
    icon: Book,
    badge: 'Best Practices',
  },
  {
    title: 'Email Bounce Rate',
    description: 'Understand hard vs soft bounces and how to reduce your bounce rate.',
    href: '/guides/email-bounce-rate',
    icon: TrendingUp,
    badge: 'Deliverability',
  },
  {
    title: 'Email Click-Through Rate',
    description: 'Optimize your CTAs and improve email click-through rates.',
    href: '/guides/email-click-through-rate',
    icon: Mail,
    badge: 'Analytics',
  },
  {
    title: 'Transactional vs Marketing Email',
    description: 'Understand the legal and technical differences between email types.',
    href: '/guides/transactional-vs-marketing-email',
    icon: Book,
    badge: 'Fundamentals',
  },
  {
    title: 'Email API Guide',
    description: 'Everything you need to know about email APIs with code examples.',
    href: '/guides/email-api-guide',
    icon: Code,
    badge: 'Technical',
  },
  {
    title: 'Email Sender Reputation',
    description: 'Build and maintain a positive sender reputation for better deliverability.',
    href: '/guides/email-sender-reputation',
    icon: Users,
    badge: 'Deliverability',
  },
];

const badgeOrder = ['Authentication', 'Deliverability', 'Analytics', 'Technical', 'Best Practices', 'Fundamentals'];

export default function GuidesIndex() {
  const categories = badgeOrder
    .map(name => ({name, guides: guides.filter(g => g.badge === name)}))
    .filter(c => c.guides.length > 0);

  return (
    <>
      <NextSeo
        title="Email Marketing & Deliverability Guides | Plunk"
        description="Learn email best practices, authentication (DKIM, SPF, DMARC), deliverability optimization, and more. Free guides from Plunk."
        canonical="https://www.useplunk.com/guides"
        openGraph={{
          title: 'Email Marketing & Deliverability Guides | Plunk',
          description:
            'Learn email best practices, authentication (DKIM, SPF, DMARC), deliverability optimization, and more.',
          url: 'https://www.useplunk.com/guides',
          images: [{url: 'https://www.useplunk.com/api/og?title=Email+Guides+for+Developers&tag=Guide', alt: 'Plunk Guides', width: 1200, height: 630}],
        }}
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
            >
              <h1
                style={{fontFamily: 'var(--font-display)'}}
                className={
                  'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'
                }
              >
                Master email,
                <br />
                start to finish.
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>
                Free guides on email authentication, deliverability, best practices, and technical implementation.
              </p>

              <div className={'mt-10 flex flex-wrap gap-3'}>
                <motion.a
                  whileHover={{scale: 1.015}}
                  whileTap={{scale: 0.985}}
                  href={`${DASHBOARD_URI}/auth/signup`}
                  className={
                    'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(23,23,23,0.35)] transition hover:bg-neutral-800'
                  }
                >
                  Try Plunk free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Guides - Categorized */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10'}>
            <div className={'space-y-16'}>
              {categories.map((category, catIndex) => (
                <motion.div
                  key={category.name}
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.6, delay: catIndex * 0.06, ease: [0.22, 1, 0.36, 1]}}
                >
                  <div className={'mb-6 flex items-center gap-4'}>
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'shrink-0 text-label text-neutral-500'}
                    >
                      {category.name}
                    </span>
                    <div className={'h-px flex-1 bg-neutral-200'} />
                  </div>

                  <div className={'divide-y divide-neutral-100'}>
                    {category.guides.map(guide => {
                      const Icon = guide.icon;
                      return (
                        <Link
                          key={guide.href}
                          href={guide.href}
                          className={
                            'group -mx-4 flex items-center gap-5 rounded-lg px-4 py-5 transition hover:bg-neutral-50 sm:gap-6'
                          }
                        >
                          <Icon
                            className={'h-5 w-5 shrink-0 text-neutral-500 transition group-hover:text-neutral-600'}
                            strokeWidth={1.5}
                          />
                          <div className={'min-w-0 flex-1'}>
                            <h3
                              style={{fontFamily: 'var(--font-display)'}}
                              className={'font-bold tracking-[-0.01em] text-neutral-900'}
                            >
                              {guide.title}
                            </h3>
                            <p className={'mt-0.5 truncate text-ui text-neutral-500'}>{guide.description}</p>
                          </div>
                          <ArrowRight
                            className={
                              'h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-600'
                            }
                          />
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
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
                Put it into practice.
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
                    className={'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'}
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </motion.a>
                  <Link
                    href={'/pricing'}
                    className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}
                  >
                    View pricing
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

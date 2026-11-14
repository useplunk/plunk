import {motion, useReducedMotion} from 'framer-motion';
import {ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {FeatureCTA, Footer, Navbar, SectionHeader} from '../../components';
import {GUIDE_CATEGORIES, GUIDES} from '../../components/guides';
import type {GuideInfo} from '../../components/guides';

/**
 * The guides, grouped the way a reader arrives: setting up a domain, fixing
 * where mail lands, improving the numbers, or learning the basics. Same tile
 * grid as the tools index, so the two reference sections of the site read as
 * one family.
 */
function GuideTile({guide}: {guide: GuideInfo}) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className={
        'group flex h-full flex-col justify-between gap-10 rounded-card bg-tile p-6 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:p-7'
      }
    >
      <ArrowUpRight
        aria-hidden
        className={
          'h-5 w-5 self-end text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
        }
      />
      <span>
        <span className={'block font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'}>
          {guide.name}
        </span>
        <span className={'mt-1.5 block text-neutral-600'}>{guide.description}</span>
      </span>
    </Link>
  );
}

export default function GuidesIndex() {
  const still = useReducedMotion();

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
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Email+Guides+for+Developers&tag=Guide',
              alt: 'Plunk Guides',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <section className={'mx-auto max-w-[88rem] px-6 pb-8 pt-14 sm:px-10 sm:pt-20'}>
          <motion.div
            initial={still ? undefined : {opacity: 0, y: 12}}
            animate={still ? undefined : {opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
            className={'mx-auto max-w-3xl text-center'}
          >
            <h1
              className={
                'font-display text-h2 font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[clamp(2.5rem,5vw,4rem)] sm:leading-[1.02]'
              }
            >
              Email guides
            </h1>
            <p className={'mx-auto mt-5 max-w-[52ch] text-lead text-neutral-600'}>
              How email authentication, deliverability and engagement work, and what to change when the numbers are off.
            </p>
          </motion.div>
        </section>

        {GUIDE_CATEGORIES.map(category => (
          <section key={category.name} className={'mx-auto max-w-[88rem] px-6 py-12 sm:px-10 sm:py-16'}>
            <SectionHeader title={category.name} subtitle={category.description} />
            <ul className={'mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
              {GUIDES.filter(g => g.category === category.name).map((guide, i) => (
                <motion.li
                  key={guide.slug}
                  initial={still ? undefined : {opacity: 0, y: 10}}
                  whileInView={still ? undefined : {opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-10%'}}
                  transition={{duration: 0.45, delay: still ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1]}}
                >
                  <GuideTile guide={guide} />
                </motion.li>
              ))}
            </ul>
          </section>
        ))}

        <FeatureCTA title={'Put it into practice.'} />
      </main>

      <Footer />
    </>
  );
}

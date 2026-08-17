import {Artifact, FilterBuilder, Footer, Navbar, SpecList} from '../../components';
import type {Condition, Spec} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React, {useState} from 'react';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import Head from 'next/head';

interface Example {
  id: string;
  name: string;
  summary: string;
  total: number;
  conditions: Condition[];
}

/** Three segments, expressed the way the builder composes them. */
const examples: Example[] = [
  {
    id: 'active',
    name: 'Active users',
    summary: 'Recent signups who are still opening what you send.',
    total: 12480,
    conditions: [
      {label: 'signed up < 30 days', remaining: 4902},
      {label: 'opened < 7 days', remaining: 2870},
      {label: 'plan = pro', remaining: 1146},
    ],
  },
  {
    id: 'dormant',
    name: 'Gone quiet',
    summary: 'Contacts who received the last campaign and never opened it.',
    total: 12480,
    conditions: [
      {label: 'no activity > 60 days', remaining: 5311},
      {label: 'delivered, not opened', remaining: 2984},
      {label: 'still subscribed', remaining: 2431},
    ],
  },
  {
    id: 'high-value',
    name: 'High value',
    summary: 'Customers worth treating differently from the rest of the list.',
    total: 12480,
    conditions: [
      {label: 'spent > 1000', remaining: 906},
      {label: 'purchased before', remaining: 742},
    ],
  },
];


const capabilities: Spec[] = [
  {
    title: 'Filters on anything you store',
    description:
      'Build conditions from the standard contact fields, from custom data you have attached, and from email activity, combined with AND or OR.',
  },
  {
    title: 'Membership that keeps itself current',
    description:
      'A dynamic segment is a query, not a copy. When a contact stops matching they leave, and when someone starts matching they join, with no rebuild step.',
  },
  {
    title: 'Entry and exit as triggers',
    description:
      'Joining or leaving a segment can start a workflow, so a change in what someone does can begin a sequence on its own.',
  },
  {
    title: 'Campaigns aimed at a subset',
    description:
      'Send to a segment instead of the whole list, so the people who would not care never receive it and your sending reputation stays intact.',
  },
  {
    title: 'Static lists when you want control',
    description:
      'Some groups are a judgement call rather than a query. Beta testers and VIPs can be picked by hand, and membership stays put until you change it.',
  },
];

export default function SegmentsFeature() {
  const [active, setActive] = useState<Example>(examples[0]!);

  return (
    <>
      <Head>
        <title>Audience Segmentation - Target the Right Contacts | Plunk</title>
        <meta
          name="description"
          content="Build segments from contact data, custom fields and email activity. Membership updates itself, and entering or leaving a segment can trigger a workflow."
        />
        <meta property="og:title" content="Audience Segmentation - Smart Contact Organization | Plunk" />
        <meta
          property="og:description"
          content="Build segments from contact data, custom fields and email activity. Membership updates itself as contacts change."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=Audience+Segmentation&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.useplunk.com/api/og?title=Audience+Segmentation&tag=Feature" />
      </Head>

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
          <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pb-28 sm:pt-28'}>
            <motion.div
              initial={{opacity: 0, y: 16}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'max-w-[60ch]'}
            >
              <h1
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-display font-extrabold tracking-[-0.035em] text-neutral-900'}
              >
                Not everyone needs this email.
              </h1>
              <p className={'mt-6 text-lead text-neutral-600'}>
                A segment is a question about your contacts that keeps answering itself. Ask it once, and the answer
                stays current as people sign up, change plan and go quiet.
              </p>

              <div className={'mt-10 flex flex-wrap gap-3'}>
                <motion.a
                  whileHover={{scale: 1.015}}
                  whileTap={{scale: 0.985}}
                  href={`${DASHBOARD_URI}/auth/signup`}
                  className={
                    'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 font-semibold text-white transition hover:bg-neutral-800'
                  }
                >
                  Build a segment
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link
                  href={`${WIKI_URI}/docs/guides/segments`}
                  target={'_blank'}
                  className={
                    'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 font-semibold text-neutral-900 transition hover:border-neutral-900'
                  }
                >
                  Segment docs
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The builder itself. The old page described AND/OR logic in prose and
            printed the conditions as tracked capitals, which left the reader to
            picture a query builder from a description of one. Showing the query
            answers the question that description kept dodging: is this a UI I
            click, or an API I have to write against? */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-12 max-w-[55ch]'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold tracking-[-0.03em] text-neutral-900'}
              >
                Three you could build today
              </h2>
            </motion.div>

            <div className={'grid gap-10 lg:grid-cols-12'}>
              <div className={'lg:col-span-4'}>
                <ul className={'flex flex-col gap-2'}>
                  {examples.map(example => {
                    const on = example.id === active.id;
                    return (
                      <li key={example.id}>
                        <button
                          onClick={() => setActive(example)}
                          aria-pressed={on}
                          className={
                            on
                              ? 'w-full rounded-card border border-neutral-900 bg-neutral-900 p-5 text-left text-white transition'
                              : 'w-full rounded-card border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-900'
                          }
                        >
                          <div
                            style={{fontFamily: 'var(--font-display)'}}
                            className={`font-bold tracking-[-0.01em] ${on ? 'text-white' : 'text-neutral-900'}`}
                          >
                            {example.name}
                          </div>
                          <p className={`mt-1 ${on ? 'text-neutral-300' : 'text-neutral-600'}`}>{example.summary}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className={'min-w-0 lg:col-span-8'}>
                <Artifact label={active.name}>
                  <FilterBuilder total={active.total} conditions={active.conditions} />
                </Artifact>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-16 max-w-[55ch]'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold tracking-[-0.03em] text-neutral-900'}
              >
                How they behave
              </h2>
            </motion.div>

            <SpecList specs={capabilities} />
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
                className={'text-display font-extrabold tracking-[-0.035em]'}
              >
                Send it to the right people.
              </motion.h2>
              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                className={'flex max-w-md flex-col gap-6'}
              >
                <p className={'text-lead text-neutral-300'}>
                  Free plan available. $0.001 per email on paid. No credit card required.
                </p>
                <div className={'flex flex-wrap gap-3'}>
                  <motion.a
                    whileHover={{scale: 1.015}}
                    whileTap={{scale: 0.985}}
                    href={`${DASHBOARD_URI}/auth/signup`}
                    className={
                      'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-neutral-900 transition hover:bg-neutral-100'
                    }
                  >
                    Get started for free
                    <ArrowRight className="h-4 w-4" />
                  </motion.a>
                  <Link
                    href={'/pricing'}
                    className={
                      'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 font-semibold text-white transition hover:border-white'
                    }
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

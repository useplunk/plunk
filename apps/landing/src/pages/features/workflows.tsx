import {Artifact, Footer, Navbar, SpecList, StepSequence, WorkflowChain} from '../../components';
import type {Flow, Spec, Step} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import Head from 'next/head';

/** The onboarding flow, as the builder would compose it. */
const onboarding: Flow = {
  steps: [
    {kind: 'trigger', label: 'Signs up', value: 'user.signed-up'},
    {kind: 'action', label: 'Welcome email'},
    {kind: 'wait', label: 'Wait', value: '2 days'},
    {kind: 'branch', label: 'Opened it?'},
  ],
  branches: [
    {answer: 'yes', label: 'Getting started'},
    {answer: 'no', label: 'Nudge'},
  ],
};

const steps: Step[] = [
  {
    title: 'Pick the trigger',
    body: 'Any event you already track starts a workflow: a signup, a purchase, a plan change. Contacts enter the moment the event fires.',
  },
  {
    title: 'Compose the flow',
    body: 'Drag in emails, delays, conditions and webhooks. Branches split on contact data or on how someone responded to an earlier step.',
  },
  {
    title: 'Turn it on',
    body: 'Every run is visible while it happens, so you can see where a contact is in the flow and what the next step will be.',
  },
];

const useCases: Spec[] = [
  {
    title: 'Onboarding',
    description:
      'Walk a new signup through the product over their first week, and stop sending the rest of the sequence once they have done the thing it was nudging them toward.',
    machine: 'user.signed-up → Welcome → Wait 2 days → Getting started',
  },
  {
    title: 'Cart recovery',
    description:
      'Follow up on an abandoned checkout while it is still live, then follow up again with an incentive if the first message goes unanswered.',
    machine: 'cart.abandoned → Wait 1 hour → Reminder → Wait 1 day → Discount',
  },
  {
    title: 'Re-engagement',
    description:
      'Catch contacts as they go quiet and branch on whether they opened the last thing you sent, so the dormant and the merely busy get different messages.',
    machine: 'contact.inactive → If opened last email → Update / Offer',
  },
]

const capabilities: Spec[] = [
  {
    title: 'Events, not schedules',
    description:
      'Workflows start from something a contact did. Send the event from your app with one API call and the flow takes over from there.',
  },
  {
    title: 'Delays that respect the clock',
    description:
      'Wait an hour, a day, or until a specific point in the future. Contacts sit in the delay without holding a connection open.',
  },
  {
    title: 'Branching on real data',
    description:
      'Split a flow on contact fields, on custom data you have attached, or on whether an earlier email in the same flow was opened.',
  },
  {
    title: 'Webhooks out',
    description:
      'A workflow step can call your own systems, so an email sequence can also update a CRM or kick off work elsewhere.',
  },
  {
    title: 'Re-entry, decided by you',
    description:
      'Choose whether a contact who triggers the same event twice runs the flow twice or is ignored the second time.',
  },
];

export default function WorkflowsFeature() {
  return (
    <>
      <Head>
        <title>Email Workflow Automation | Plunk</title>
        <meta
          name="description"
          content="Build email automation from the events you already track. Triggers, delays, branching conditions and webhooks in a visual builder."
        />
        <meta property="og:title" content="Email Workflow Automation - Automate Your Email Marketing | Plunk" />
        <meta
          property="og:description"
          content="Build email automation from the events you already track. Triggers, delays, branching conditions and webhooks in a visual builder."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=Email+Workflow+Automation&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.useplunk.com/api/og?title=Email+Workflow+Automation&tag=Feature" />
      </Head>

      <Navbar />

      <main className={'text-neutral-800'}>
        {/* Hero — the flow itself sits beside the headline, so the page shows
            what it is describing before it starts describing it. */}
        <section className={'relative overflow-hidden'}>
          <div
            aria-hidden
            className={
              'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
            }
          />
          <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pb-28 sm:pt-28'}>
            <div className={'grid items-center gap-16 lg:grid-cols-12'}>
              <motion.div
                initial={{opacity: 0, y: 16}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
                className={'lg:col-span-7'}
              >
                <h1
                  style={{fontFamily: 'var(--font-display)'}}
                  className={'text-display font-extrabold tracking-[-0.035em] text-neutral-900'}
                >
                  One event in.
                  <br />A sequence out.
                </h1>
                <p className={'mt-6 max-w-[55ch] text-lead text-neutral-600'}>
                  Send Plunk an event when something happens in your product. Everything after that, the emails, the
                  waiting and the branching, happens here.
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
                    Build a workflow
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </motion.a>
                  <Link
                    href={`${WIKI_URI}/docs/guides/workflows`}
                    target={'_blank'}
                    className={
                      'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 font-semibold text-neutral-900 transition hover:border-neutral-900'
                    }
                  >
                    Workflow docs
                  </Link>
                </div>
              </motion.div>

              <div className={'lg:col-span-5'}>
                <Artifact label={'Onboarding'}>
                  <WorkflowChain flow={onboarding} />
                </Artifact>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities — a divided list rather than a card grid. Six bordered
            boxes made six items look equally important and equally skippable. */}
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
                What a step can do
              </h2>
            </motion.div>

            <SpecList specs={capabilities} />
          </div>
        </section>

        {/* Build sequence — the one place on this page where numbers mean
            something, because the order is the instruction. */}
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
                Building one
              </h2>
            </motion.div>

            <StepSequence steps={steps} />
          </div>
        </section>

        {/* Use cases — the flow strings are machine text, so they are set as
            Code: still monospace, no longer shouted in tracked capitals. */}
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
                Three that people build first
              </h2>
            </motion.div>

            <SpecList specs={useCases} />
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
                Send the first event.
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

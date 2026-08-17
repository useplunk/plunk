import {Footer, Navbar, StepSequence} from '../../components';
import type {Step} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {ArrowRight, Bell, Database, Inbox, Mail, Shield, Zap} from 'lucide-react';
import Head from 'next/head';

const features = [
  {
    icon: <Database className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Automatic Contact Capture',
    description: 'Every sender is automatically added to your contact database with no manual data entry required.',
    featured: true,
  },
  {
    icon: <Zap className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Workflow Automation',
    description: 'Trigger automated workflows when emails are received to create two-way conversations.',
  },
  {
    icon: <Shield className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Built-in Security',
    description: 'Spam, virus, SPF, DKIM and DMARC filtering runs on every message before it reaches you.',
  },
  {
    icon: <Bell className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Webhook Notifications',
    description: 'Get instant notifications with rich metadata whenever an email arrives at your domain.',
  },
  {
    icon: <Mail className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Simple DNS Setup',
    description: 'Add one MX record to your domain and start receiving email immediately.',
  },
  {
    icon: <Inbox className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Real-Time Processing',
    description: 'Emails are processed instantly and can trigger workflows or webhooks in real-time.',
  },
];

const useCases = [
  {
    icon: <Mail className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Support Ticket Creation',
    description:
      'Automatically create support tickets when customers email support@yourdomain.com. Send auto-replies and route to your help desk system via webhooks. Your support team will thank you.',
    benefits: ['Instant acknowledgment', 'Automatic ticket creation', 'No emails missed'],
  },
  {
    icon: <Database className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Lead Capture from Email',
    description:
      'Receive emails at info@yourdomain.com and automatically add senders to your CRM. Trigger nurture workflows based on when they reached out.',
    benefits: ['Zero-friction lead capture', 'Auto-segmentation', 'Instant follow-up'],
  },
  {
    icon: <Zap className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Two-Way Conversations',
    description:
      'Let customers reply to your campaign emails and automatically trigger engagement workflows. Tag contacts as "engaged" when they respond.',
    benefits: ['Build conversation history', 'Track engagement', 'Personalized responses'],
  },
];

const steps: Step[] = [
  {
    title: 'Verify your domain',
    body: 'Add and verify your custom domain in Plunk by configuring DKIM and SPF records in your DNS settings.',
  },
  {
    title: 'Add MX record',
    body: 'Add one MX record to your DNS to route incoming emails to Plunk. Copy the record directly from your dashboard.',
  },
  {
    title: 'Start receiving',
    body: 'Emails sent to any address at your domain are automatically received and can trigger workflows or webhooks.',
  },
];

export default function InboundEmailFeature() {
  return (
    <>
      <Head>
        <title>Inbound Email - Receive & Process Incoming Emails | Plunk</title>
        <meta
          name="description"
          content="Receive emails at your custom domain and automatically process them. Capture leads, create support tickets, and trigger workflows from incoming emails."
        />
        <meta property="og:title" content="Inbound Email - Turn Incoming Emails into Automated Actions | Plunk" />
        <meta
          property="og:description"
          content="Receive emails at your custom domain and automatically process them. Capture leads, create support tickets, and trigger workflows from incoming emails."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=Inbound+Email+Processing&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.useplunk.com/api/og?title=Inbound+Email+Processing&tag=Feature" />
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
                Emails in,
                <br />
                actions out.
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>
                Receive emails at your custom domain and automatically trigger workflows, capture leads, or create support
                tickets. Two-way email communication made simple.
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
                  Start receiving emails
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link
                  href={`${WIKI_URI}/docs/guides/inbound-email`}
                  target={'_blank'}
                  className={
                    'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'
                  }
                >
                  View documentation
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features grid */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-16'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}
              >
                What arrives, and what happens next
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}></p>
            </motion.div>

            <div className={'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
              {features.map((feature, index) => {
                const highlighted = feature.featured;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1]}}
                    className={
                      highlighted
                        ? 'flex min-h-[16rem] flex-col justify-between rounded-card border border-neutral-900 bg-neutral-900 p-8 text-white'
                        : 'flex min-h-[16rem] flex-col justify-between rounded-card border border-neutral-200 bg-white p-8 transition hover:border-neutral-900'
                    }
                  >
                      <div className={highlighted ? 'text-white' : 'text-neutral-900'}>{feature.icon}</div>
                    <div>
                      <h3
                        style={{fontFamily: 'var(--font-display)'}}
                        className={`mt-8 text-h3 font-bold tracking-[-0.02em] ${highlighted ? 'text-white' : 'text-neutral-900'}`}
                      >
                        {feature.title}
                      </h3>
                      <p className={`mt-2 leading-relaxed ${highlighted ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-16'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}
              >
                Set up in minutes
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>One MX record is all it takes</p>
            </motion.div>

            <div className={'mx-auto max-w-4xl'}>
              <StepSequence steps={steps} />
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-16'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}
              >
                What people use it for
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>From support to sales, inbound email unlocks new automation possibilities</p>
            </motion.div>

            <ul className={'divide-y divide-neutral-200 border-y border-neutral-200'}>
              {useCases.map((useCase, index) => (
                <motion.li
                  key={useCase.title}
                  initial={{opacity: 0, y: 12}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1]}}
                  className={'grid grid-cols-12 gap-6 py-10 sm:py-12'}
                >
                  <h3
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'col-span-12 text-h3 font-bold tracking-[-0.02em] text-neutral-900 sm:col-span-4'}
                  >
                    {useCase.title}
                  </h3>
                  <div className={'col-span-12 sm:col-span-8'}>
                    <p className={'leading-relaxed text-neutral-600'}>{useCase.description}</p>
                    <div className={'mt-5 flex flex-wrap gap-x-6 gap-y-1'}>
                      {useCase.benefits.map(b => (
                        <span
                          key={b}
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'text-label text-neutral-500'}
                        >
                          → {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
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
                Your domain can receive emails too.
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
                    className={'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'}
                  >
                    Get started for free
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

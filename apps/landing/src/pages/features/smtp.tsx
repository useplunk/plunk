import {Footer, Navbar} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {ArrowRight, Code2, Lock, Mail, Server, Settings, Shield} from 'lucide-react';
import Head from 'next/head';

const features = [
  {
    icon: <Settings className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Simple Configuration',
    description: 'Quick setup with your project credentials. Works with any email client or application.',
    featured: true,
  },
  {
    icon: <Lock className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Secure Connections',
    description: 'TLS/SSL encryption on ports 465 and 587. Your emails are always transmitted securely.',
  },
  {
    icon: <Mail className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Universal Compatibility',
    description: 'Works with Outlook, Thunderbird, Apple Mail, or any SMTP-compatible application.',
  },
  {
    icon: <Server className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Domain Validation',
    description: 'Automatic verification that your sender domain is verified before accepting emails.',
  },
  {
    icon: <Shield className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Full Feature Support',
    description: 'Attachments, custom headers, HTML emails, and multiple recipients.',
  },
  {
    icon: <Code2 className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Same Infrastructure',
    description: 'SMTP emails use the same reliable delivery infrastructure as API emails with full tracking.',
  },
];

const comparisonData = [
  {feature: 'Protocol', traditional: 'SMTP', plunkSMTP: 'SMTP', plunkAPI: 'HTTP/REST'},
  {feature: 'Setup Complexity', traditional: 'Medium', plunkSMTP: 'Easy', plunkAPI: 'Easy'},
  {feature: 'Tracking & Analytics', traditional: '✗', plunkSMTP: '✓', plunkAPI: '✓'},
  {feature: 'Works with Email Clients', traditional: '✓', plunkSMTP: '✓', plunkAPI: '✗'},
  {feature: 'Domain Verification', traditional: 'Manual', plunkSMTP: 'Automatic', plunkAPI: 'Automatic'},
  {feature: 'Attachments', traditional: '✓', plunkSMTP: '✓', plunkAPI: '✓'},
  {feature: 'Template Support', traditional: '✗', plunkSMTP: '✗', plunkAPI: '✓'},
  {feature: 'Workflow Automation', traditional: '✗', plunkSMTP: '✗', plunkAPI: '✓'},
];

const useCases = [
  {
    icon: <Settings className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Legacy System Integration',
    description:
      'Already have applications using SMTP? No need to rewrite code. Just swap your SMTP credentials and keep everything else the same.',
    benefit: 'Zero code changes required',
  },
  {
    icon: <Mail className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Email Client Sending',
    description:
      'Marketing teams can send emails directly from Outlook, Thunderbird, or Apple Mail using familiar tools without learning new APIs.',
    benefit: 'No technical knowledge needed',
  },
  {
    icon: <Code2 className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Framework Compatibility',
    description:
      'Works with any framework or language that supports SMTP. Perfect for older systems or platforms without HTTP API support.',
    benefit: 'Universal protocol support',
  },
];

export default function SMTPFeature() {
  return (
    <>
      <Head>
        <title>SMTP Email Sending - Send via SMTP or API | Plunk</title>
        <meta
          name="description"
          content="Send emails via SMTP or API. Works with any email client or application. Secure TLS/SSL connections with automatic domain validation and full tracking."
        />
        <meta property="og:title" content="SMTP Email Sending - Flexible Sending Options | Plunk" />
        <meta
          property="og:description"
          content="Send emails via SMTP or API. Works with any email client or application. Secure TLS/SSL connections with automatic domain validation and full tracking."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=SMTP+Email+Sending&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.useplunk.com/api/og?title=SMTP+Email+Sending&tag=Feature" />
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
                Send via SMTP
                <br />
                or API. Your call.
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>
                Use our HTTP API for modern apps or drop in SMTP credentials for any legacy system. Same deliverability,
                same pricing, zero lock-in.
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
                  Get SMTP credentials
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link
                  href={`${WIKI_URI}/docs/guides/smtp`}
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
                SMTP that works with everything
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>
                Full authentication, tracking, and deliverability out of the box
              </p>
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

        {/* Comparison table */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-12'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}
              >
                SMTP vs API
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Choose the right option for your use case</p>
            </motion.div>

            <div className={'overflow-hidden rounded-card border border-neutral-200 bg-white'}>
              <table className={'w-full'}>
                <thead className={'border-b border-neutral-200 bg-neutral-50'}>
                  <tr>
                    <th className={'px-6 py-4 text-left font-semibold text-neutral-900'}>Feature</th>
                    <th className={'px-6 py-4 text-center font-semibold text-neutral-500'}>Traditional SMTP</th>
                    <th className={'bg-neutral-900 px-6 py-4 text-center font-semibold text-white'}>Plunk SMTP</th>
                    <th className={'px-6 py-4 text-center font-semibold text-neutral-500'}>Plunk API</th>
                  </tr>
                </thead>
                <tbody className={'divide-y divide-neutral-100'}>
                  {comparisonData.map((row, index) => (
                    <tr key={index} className={'transition hover:bg-neutral-50'}>
                      <td className={'px-6 py-4 font-medium text-neutral-900'}>{row.feature}</td>
                      <td className={'px-6 py-4 text-center text-neutral-500'}>{row.traditional}</td>
                      <td className={'bg-neutral-50 px-6 py-4 text-center font-semibold text-neutral-900'}>{row.plunkSMTP}</td>
                      <td className={'px-6 py-4 text-center text-neutral-500'}>{row.plunkAPI}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={'mt-4 text-neutral-500'}>
              Recommendation: Use the API for modern applications with workflow automation. Use SMTP for email clients
              and legacy systems.
            </p>
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
                When to use SMTP
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Perfect for these scenarios</p>
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
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'mt-5 inline-block text-label text-neutral-500'}
                    >
                      → {useCase.benefit}
                    </span>
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
                Start sending via SMTP today.
              </motion.h2>
              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                className={'flex max-w-md flex-col gap-6'}
              >
                <p className={'text-lead text-neutral-300'}>
                  Get your SMTP credentials and start sending from any client or application. No credit card required.
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

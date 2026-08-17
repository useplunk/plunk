import {Footer, Navbar, StepSequence} from '../../components';
import type {Step} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {ArrowRight, Code2, Eye, Mail, Palette, Sparkles, Type, Zap} from 'lucide-react';
import Head from 'next/head';

const features = [
  {
    icon: <Type className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Visual WYSIWYG Editor',
    description:
      'Rich text editing with formatting toolbar. Bold, italic, headings, lists, links, images, and tables. No code required.',
    featured: true,
  },
  {
    icon: <Code2 className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Full HTML Editor',
    description: 'Syntax highlighting, auto-completion, and bracket matching. Write custom HTML when you need complete control.',
  },
  {
    icon: <Zap className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Smart Mode Switching',
    description: 'Automatically detects complex HTML and switches to code mode. Warns you before changes that would lose custom formatting.',
  },
  {
    icon: <Sparkles className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Variables with autocomplete',
    description: 'Autocomplete with {{variable}} syntax. Supports fallbacks, nested properties, and custom contact fields.',
  },
  {
    icon: <Eye className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Live Preview',
    description: 'Preview with real contact data. Test on desktop, tablet, and mobile views before sending.',
  },
  {
    icon: <Palette className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Email-Safe HTML',
    description: 'Automatic CSS inlining and email-client-friendly output, including for Outlook.',
  },
];

const useCases = [
  {
    icon: <Code2 className="h-6 w-6" strokeWidth={1.5} />,
    title: 'For Developers',
    description:
      'Full HTML control when you need it, and a variable system with autocomplete and fallbacks. Use templates in API calls, workflows, and campaigns.',
    example: 'Password resets → API-triggered alerts → Webhook notifications',
  },
  {
    icon: <Palette className="h-6 w-6" strokeWidth={1.5} />,
    title: 'For Marketers',
    description:
      'Visual editor for quick changes. Live preview with real customer data. Create professional emails without waiting for developers.',
    example: 'Product announcements → Newsletter campaigns → Promotional emails → Customer onboarding',
  },
  {
    icon: <Zap className="h-6 w-6" strokeWidth={1.5} />,
    title: 'For Teams',
    description:
      'One tool for everyone. Developers can code, marketers can design, everyone can preview. Reusable templates across campaigns and workflows.',
    example: 'Launch announcements → Feature updates → User engagement → Lifecycle emails',
  },
];

const steps: Step[] = [
  {
    title: 'Create your template',
    body: 'Use the visual editor for quick formatting or write custom HTML. Add variables with autocomplete.',
  },
  {
    title: 'Preview with real data',
    body: 'Select any contact and see exactly what they\'ll receive. Test on desktop, tablet, and mobile.',
  },
  {
    title: 'Use everywhere',
    body: 'Use your template in campaigns, workflows, and API calls. One template, unlimited uses.',
  },
];

export default function EmailEditorFeature() {
  return (
    <>
      <Head>
        <title>Email Editor - Create Beautiful Emails Without Fighting Your Tools | Plunk</title>
        <meta
          name="description"
          content="The email editor that speaks both languages. Switch between visual and code editing, preview with real data, and create templates that work everywhere."
        />
        <meta property="og:title" content="Email Editor - Create Beautiful Emails Without Fighting Your Tools | Plunk" />
        <meta
          property="og:description"
          content="The email editor that speaks both languages. Switch between visual and code editing, preview with real data, and create templates that work everywhere."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=Email+Editor&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.useplunk.com/api/og?title=Email+Editor&tag=Feature" />
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
                The editor that
                <br />
                speaks both languages.
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>
                Switch between visual and code editing. Preview with real customer data. Create templates that
                work everywhere.
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
                  Try the editor free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link
                  href={`${WIKI_URI}/docs/guides/templates`}
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
                Two editors, one experience
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Visual editing for speed, code editing for control</p>
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
                From first draft to send
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Create, preview, and deploy templates in minutes</p>
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
                Built for every team
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Whether you&apos;re a developer, marketer, or founder</p>
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
                    <p
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'mt-5 text-label text-neutral-500'}
                    >
                      {useCase.example}
                    </p>
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
                Build your first template today.
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

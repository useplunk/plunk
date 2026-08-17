import {Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, ArrowUpRight, Code2, FileText, Key, Mail, Search, Shield, ShieldAlert, ShieldCheck} from 'lucide-react';
import {Funnel_Display, Funnel_Sans, JetBrains_Mono} from 'next/font/google';

const display = Funnel_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const body = Funnel_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

const tools = [
  {
    name: 'Markdown to Email',
    slug: 'markdown-to-email',
    description: 'Convert rich text to email-safe HTML with a visual editor and instant preview.',
    icon: Code2,
    number: '01',
  },
  {
    name: 'Email Verification',
    slug: 'verify-email',
    description: 'Verify email addresses instantly. Check DNS, MX records, typos, and disposable domains.',
    icon: Search,
    number: '02',
  },
  {
    name: 'Spam Checker',
    slug: 'spam-checker',
    description: 'Test your email subject line and content for spam trigger words and deliverability issues.',
    icon: ShieldAlert,
    number: '03',
  },
  {
    name: 'SPF Checker',
    slug: 'spf-checker',
    description: 'Look up and validate your domain\'s SPF record. Catch misconfigurations before they hurt deliverability.',
    icon: Shield,
    number: '04',
  },
  {
    name: 'DMARC Checker',
    slug: 'dmarc-checker',
    description: 'Check your DMARC policy, reporting configuration, and get step-by-step advice toward full enforcement.',
    icon: ShieldCheck,
    number: '05',
  },
  {
    name: 'DKIM Checker',
    slug: 'dkim-checker',
    description: 'Look up your DKIM public key by selector. Verify it\'s active and correctly configured.',
    icon: Key,
    number: '06',
  },
  {
    name: 'MX Record Checker',
    slug: 'mx-checker',
    description: 'Look up mail exchange records for any domain. Check server priority and diagnose delivery problems.',
    icon: Mail,
    number: '07',
  },
  {
    name: 'Email Headers Analyzer',
    slug: 'email-headers',
    description: 'Paste raw email headers and get SPF/DKIM/DMARC results, routing hops, and the full authentication chain.',
    icon: FileText,
    number: '08',
  },
];

export default function ToolsIndex() {
  return (
    <>
      <NextSeo
        title="Free Email Tools | SPF, DMARC, DKIM, MX Checker & More | Plunk"
        description="Free email developer tools: MX record checker, email headers analyzer, SPF checker, DMARC checker, DKIM checker, spam checker, and email validator. No sign-up required."
        canonical="https://www.useplunk.com/tools"
        openGraph={{
          title: 'Free Email Tools | SPF, DMARC, DKIM, MX Checker & More | Plunk',
          description:
            'Free email developer tools: MX record checker, email headers analyzer, SPF checker, DMARC checker, DKIM checker, spam checker, and email validator. No sign-up required.',
          url: 'https://www.useplunk.com/tools',
          images: [{url: 'https://www.useplunk.com/api/og?title=Free+Email+Developer+Tools&tag=Tool', alt: 'Plunk Email Tools', width: 1200, height: 630}],
        }}
      />

      <Navbar />

      <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <main className={'text-neutral-800'}>
          {/* ========== HERO ========== */}
          <section className={'relative overflow-hidden'}>
            <div
              aria-hidden
              className={
                'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
              }
            />

            <div className={'mx-auto max-w-[88rem] px-6 pb-24 pt-20 sm:px-10 sm:pt-28 lg:pb-36'}>

              <motion.div
                initial={{opacity: 0, y: 16}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                className={'mx-auto max-w-5xl text-center'}
              >
                <h1
                  style={{fontFamily: 'var(--font-display)'}}
                  className={
                    'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'
                  }
                >
                  Free email
                  <br />
                  developer tools
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Check MX records, email headers, SPF, DMARC, and DKIM. Verify addresses, convert markdown to email-safe HTML, test for spam, and more. No sign-up required.
                </p>

                <div className={'mt-10 flex flex-wrap justify-center gap-3'}>
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
                  <Link
                    href="/guides"
                    className={
                      'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'
                    }
                  >
                    Browse guides
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ========== TOOLS LIST ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
            <SectionHeader
              title={'Available tools.'}
              subtitle={'Everything you need to work with email. No sign-up, no limits.'}
            />

            <ul className={'mt-20 divide-y divide-neutral-200 border-y border-neutral-200'}>
              {tools.map((tool, i) => (
                <motion.li
                  key={tool.slug}
                  initial={{opacity: 0, y: 12}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1]}}
                >
                  <Link
                    href={`/tools/${tool.slug}`}
                    className={
                      'group flex items-center justify-between gap-6 py-6 transition-colors hover:bg-neutral-50 sm:py-8'
                    }
                  >
                    <div className={'flex items-center gap-6 sm:gap-10'}>
                      <span
                        style={{fontFamily: 'var(--font-mono)'}}
                        className={'w-12 text-xs tabular-nums tracking-[0.18em] text-neutral-500 sm:w-16'}
                      >
                        {tool.number}
                      </span>
                      <div>
                        <span
                          style={{fontFamily: 'var(--font-display)'}}
                          className={
                            'block text-4xl font-bold tracking-[-0.03em] text-neutral-900 transition-transform duration-300 group-hover:-translate-x-1 sm:text-5xl lg:text-6xl'
                          }
                        >
                          {tool.name}
                        </span>
                        <p className={'mt-2 text-ui text-neutral-500'}>{tool.description}</p>
                      </div>
                    </div>
                    <div className={'flex items-center gap-4'}>
                      <span
                        style={{fontFamily: 'var(--font-mono)'}}
                        className={
                          'hidden text-xs text-neutral-500 transition group-hover:text-neutral-900 sm:inline'
                        }
                      >
                        Open tool
                      </span>
                      <span
                        className={
                          'flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-900 transition group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white sm:h-14 sm:w-14'
                        }
                      >
                        <ArrowUpRight className={'h-5 w-5'} strokeWidth={2} />
                      </span>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>

          {/* ========== WHY ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'Built for developers,'}
                titleAccent={'free forever.'}
                subtitle={'No sign-up, no paywalls. Tools built by email experts for real-world workflows.'}
              />

              <div className={'mt-20 grid gap-10 sm:grid-cols-3 sm:gap-16'}>
                {[
                  {
                    tag: 'Access',
                    big: '$0',
                    title: 'Free forever',
                    body: 'No sign-up, no paywalls, no limits. Use these tools as much as you need, completely free.',
                  },
                  {
                    tag: 'Focus',
                    big: 'Dev-first',
                    title: 'Developer-focused',
                    body: 'Built by developers who work with email every day. Clean outputs, instant results, real-world workflows.',
                  },
                  {
                    tag: 'Output',
                    big: '100%',
                    title: 'Production ready',
                    body: 'Email-safe HTML that works across all email clients. Industry-standard validation. Battle-tested by thousands.',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.tag}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1]}}
                    className={'flex flex-col gap-6'}
                  >
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      / {item.tag}
                    </span>
                    <div
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-5xl font-extrabold tracking-[-0.035em] text-neutral-900 sm:text-6xl'}
                    >
                      {item.big}
                    </div>
                    <div className={'h-px w-full bg-neutral-300'} />
                    <h3
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-xl font-semibold text-neutral-900'}
                    >
                      {item.title}
                    </h3>
                    <p className={'text-base leading-relaxed text-neutral-600'}>{item.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ========== CTA ========== */}
          <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-32 sm:px-10 sm:py-40'}>
              <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
                <motion.h2
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                  style={{fontFamily: 'var(--font-display)'}}
                  className={
                    'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'
                  }
                >
                  Need production-grade email?
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Templates, scheduling, automation, analytics, and deliverability. Start free, scale as you grow.
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
                      Start with Plunk
                      <ArrowRight className="h-4 w-4" />
                    </motion.a>
                    <Link
                      href="/pricing"
                      className={
                        'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'
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
      </div>

      <Footer />
    </>
  );
}

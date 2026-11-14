import {motion, useReducedMotion} from 'framer-motion';
import {ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {FeatureCTA, Footer, Navbar, SectionHeader, TOOLS} from '../../components';
import type {ToolInfo} from '../../components';

/**
 * Two groups a visitor actually thinks in: is my domain set up, and is this
 * message going to arrive. The old list numbered the tools 01 to 08 in mono
 * and set every name at 60px, so the page read as a table of contents.
 */
const groups: {title: string; subtitle: string; slugs: string[]}[] = [
  {
    title: 'Check your domain',
    subtitle: 'The DNS records that decide whether your email is trusted.',
    slugs: ['spf-checker', 'dkim-checker', 'dmarc-checker', 'mx-checker'],
  },
  {
    title: 'Check a message',
    subtitle: 'Before you send it, or after it went somewhere it should not have.',
    slugs: ['email-headers', 'spam-checker', 'verify-email', 'markdown-to-email'],
  },
];

function ToolTile({tool}: {tool: ToolInfo}) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={
        'group flex h-full flex-col justify-between gap-10 rounded-card bg-tile p-6 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:p-7'
      }
    >
      <span className={'flex items-center justify-between'}>
        <span
          className={'flex h-10 w-10 items-center justify-center rounded-lg bg-white text-neutral-700 shadow-fragment'}
        >
          <tool.icon aria-hidden className={'h-5 w-5'} strokeWidth={1.75} />
        </span>
        <ArrowUpRight
          aria-hidden
          className={
            'h-5 w-5 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
          }
        />
      </span>
      <span>
        <span className={'block font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'}>
          {tool.name}
        </span>
        <span className={'mt-1.5 block text-neutral-600'}>{tool.description}</span>
      </span>
    </Link>
  );
}

export default function ToolsIndex() {
  const still = useReducedMotion();

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
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Free+Email+Developer+Tools&tag=Tool',
              alt: 'Plunk Email Tools',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

      <Navbar />

      <div>
        <main className={'text-neutral-800'}>
          <section className={'mx-auto max-w-[88rem] px-6 pb-8 pt-14 sm:px-10 sm:pt-20'}>
            <motion.div
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
              className={'mx-auto max-w-3xl text-center'}
            >
              <h1
                className={
                  'font-display text-h2 font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[clamp(2.5rem,5vw,4rem)] sm:leading-[1.02]'
                }
              >
                Free email tools
              </h1>
              <p className={'mx-auto mt-5 max-w-[52ch] text-lead text-neutral-600'}>
                Check SPF, DKIM, DMARC and MX records, read email headers, test for spam and verify addresses. No
                sign-up, no limits.
              </p>
            </motion.div>
          </section>

          {groups.map(group => (
            <section key={group.title} className={'mx-auto max-w-[88rem] px-6 py-12 sm:px-10 sm:py-16'}>
              <SectionHeader title={group.title} subtitle={group.subtitle} />
              <ul className={'mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
                {group.slugs.map((slug, i) => {
                  const tool = TOOLS.find(t => t.slug === slug);
                  if (!tool) return null;
                  return (
                    <motion.li
                      key={slug}
                      initial={still ? undefined : {opacity: 0, y: 10}}
                      whileInView={still ? undefined : {opacity: 1, y: 0}}
                      viewport={{once: true, margin: '-10%'}}
                      transition={{duration: 0.45, delay: still ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1]}}
                    >
                      <ToolTile tool={tool} />
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          ))}

          <FeatureCTA
            title={'When the records check out, send with Plunk.'}
            body={'Plunk sets up SPF and DKIM with you and tracks your sending reputation from the first email.'}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}

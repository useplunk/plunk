import {motion} from 'framer-motion';
import {ArrowRight} from 'lucide-react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {ChangelogTimeline, FeatureCTA, Footer, Navbar} from '../components';
import {CHANGELOG} from '../content/changelog';
import {DASHBOARD_URI} from '../lib/constants';

const title = 'Changelog | Plunk';
const description =
  'New features and improvements in Plunk, newest first, including the MCP server, inbound email, Liquid templating, multi-branch conditions, and snoozing.';

export default function Changelog() {
  return (
    <>
      <NextSeo
        title={title}
        description={description}
        canonical={'https://www.useplunk.com/changelog'}
        openGraph={{
          title,
          description,
          url: 'https://www.useplunk.com/changelog',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Changelog&tag=Product',
              alt: 'Plunk changelog',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        {/* Same grid background as the feature pages, without an artifact:
            the timeline directly below is the picture. */}
        <section className={'relative overflow-hidden'}>
          <div className={'mx-auto max-w-[88rem] px-6 pb-16 pt-20 sm:px-10 sm:pb-24 sm:pt-24'}>
            <div className={'hero-enter max-w-4xl'}>
              <h1 className={'font-display text-display font-extrabold tracking-[-0.035em] text-neutral-900'}>
                What&apos;s new
                <br />
                in Plunk.
              </h1>
              <p className={'mt-6 max-w-[55ch] text-lead text-neutral-600'}>
                Features and improvements we have shipped, newest first. Plunk is open source, so the full commit history is on GitHub.
              </p>

              <div className={'mt-10 flex flex-wrap gap-3'}>
                <motion.a
                  whileHover={{scale: 1.015}}
                  whileTap={{scale: 0.985}}
                  href={`${DASHBOARD_URI}/auth/signup`}
                  className={
                    'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-neutral-800'
                  }
                >
                  Start for free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link
                  href={'https://github.com/useplunk/plunk/commits/next'}
                  target={'_blank'}
                  rel={'noopener noreferrer'}
                  className={
                    'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'
                  }
                >
                  View commits on GitHub
                </Link>
              </div>
            </div>
          </div>
        </section>

        <ChangelogTimeline entries={CHANGELOG} />

        <FeatureCTA title={'Start sending with Plunk.'} />
      </main>

      <Footer />
    </>
  );
}

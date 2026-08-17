import {motion} from 'framer-motion';
import Link from 'next/link';
import React from 'react';
import {ArrowRight} from 'lucide-react';

import {DASHBOARD_URI} from '../../lib/constants';

/**
 * The top of every feature page.
 *
 * All six pages hand-rolled this: the same dot-grid background string, the same
 * two-column grid, the same primary/secondary button pair. Copy-paste kept them
 * looking alike but not identical, and the differences were all accidents —
 * `text-base` on the buttons of four pages and missing on two, hero subtitles
 * clamped to `max-w-2xl` on four, `max-w-[55ch]` on one and `max-w-[60ch]` on
 * another. None of that was a decision anybody made.
 *
 * `artifact` is optional but strongly encouraged: the pages that show something
 * beside the headline (workflows, segments) read as products, and the ones that
 * do not read as documentation. When it is omitted the headline column runs
 * full width rather than leaving half the fold empty.
 */
export function FeatureHero({
  title,
  subtitle,
  docsHref,
  docsLabel = 'Read the docs',
  artifact,
}: {
  /** Two short lines. Pass a fragment with a <br /> if it should break. */
  title: React.ReactNode;
  subtitle: string;
  docsHref: string;
  docsLabel?: string;
  artifact?: React.ReactNode;
}) {
  return (
    <section className={'relative overflow-hidden'}>
      <div
        aria-hidden
        className={
          'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
        }
      />

      <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pb-28 sm:pt-28'}>
        <div className={`grid items-center gap-16 ${artifact ? 'lg:grid-cols-12' : ''}`}>
          <motion.div
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.7, ease: [0.23, 1, 0.32, 1]}}
            className={artifact ? 'lg:col-span-6' : 'max-w-4xl'}
          >
            <h1 className={'font-display text-display font-extrabold tracking-[-0.035em] text-neutral-900'}>{title}</h1>
            <p className={'mt-6 max-w-[55ch] text-lead text-neutral-600'}>{subtitle}</p>

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
                href={docsHref}
                target={'_blank'}
                rel={'noopener noreferrer'}
                className={
                  'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'
                }
              >
                {docsLabel}
              </Link>
            </div>
          </motion.div>

          {artifact && (
            <motion.div
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.8, delay: 0.15, ease: [0.23, 1, 0.32, 1]}}
              className={'min-w-0 lg:col-span-6'}
            >
              {artifact}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

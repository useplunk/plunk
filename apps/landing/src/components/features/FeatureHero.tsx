import {motion} from 'framer-motion';
import Link from 'next/link';
import React from 'react';
import {ArrowRight} from 'lucide-react';

import {DASHBOARD_URI} from '../../lib/constants';

/**
 * The top of every feature page.
 *
 * All six pages hand-rolled this: the same background, the same two-column
 * grid, the same primary/secondary button pair. Copy-paste kept them looking
 * alike but not identical, and the differences were all accidents —
 * `text-base` on the buttons of four pages and missing on two, hero subtitles
 * clamped to `max-w-2xl` on four, `max-w-[55ch]` on one and `max-w-[60ch]` on
 * another. None of that was a decision anybody made.
 *
 * `artifact` is optional but strongly encouraged: the pages that show something
 * beside the headline (workflows, segments) read as products, and the ones that
 * do not read as documentation. When it is omitted the headline column runs
 * full width rather than leaving half the fold empty.
 *
 * The title uses --text-hero, not --text-display: beside a graphic the column
 * is about 600px wide, and display size broke two-line titles into one word
 * per line. The graphic only sits beside the title from xl up; below that the
 * column is too narrow for both and they stack.
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
      <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pb-28 sm:pt-28'}>
        <div className={`grid items-center gap-16 ${artifact ? 'xl:grid-cols-12' : ''}`}>
          <div className={`hero-enter max-w-4xl ${artifact ? 'xl:col-span-7 xl:max-w-none' : ''}`}>
            <h1 className={'font-display text-hero font-extrabold tracking-[-0.035em] text-neutral-900'}>{title}</h1>
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
          </div>

          {artifact && (
            <div className={'hero-enter min-w-0 xl:col-span-5'} style={{animationDelay: '0.15s'}}>
              {artifact}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

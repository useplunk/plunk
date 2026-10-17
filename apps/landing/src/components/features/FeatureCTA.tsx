import {motion, useReducedMotion} from 'framer-motion';
import Link from 'next/link';
import React from 'react';
import {ArrowRight} from 'lucide-react';

import {DASHBOARD_URI} from '../../lib/constants';

/**
 * The closing call to action on every page.
 *
 * This was a full-bleed black band, copied inline into some thirty pages. On a
 * site that is otherwise white with pale tiles it was the heaviest thing on
 * every page, and it sat directly on the footer, so pages ended on a slab. It
 * is now one large tile in the same material as the snippet graphics, inset in
 * the page, with the black button as the only dark element.
 *
 * Centred and stacked rather than heading-left, copy-right. Titles here run
 * from three words to twelve and bodies from one line to three, and the
 * split layout aligned their bottom edges, so every page got a different
 * gap under the heading. Stacked, any length lands on the same axis.
 *
 * The primary label is fixed at "Start for free" rather than exposed as a prop,
 * so the main door has one name across the site.
 */
export function FeatureCTA({
  title,
  body = 'Start on the free plan with 1,000 emails a month, no credit card needed. When you need more, every email is $0.001, with unlimited contacts and every feature included.',
  secondary,
}: {
  title: React.ReactNode;
  /** Defaults to a short pricing pitch. Tool pages say what Plunk does for that check. */
  body?: React.ReactNode;
  /** Defaults to pricing. Pages whose natural next step is docs override it. */
  secondary?: {href: string; label: string; external?: boolean};
}) {
  const still = useReducedMotion();
  const second = secondary ?? {href: '/pricing', label: 'View pricing'};

  return (
    <section className={'mx-auto max-w-[88rem] px-6 pb-16 pt-8 sm:px-10 sm:pb-24'}>
      <motion.div
        initial={still ? undefined : {opacity: 0, y: 16}}
        whileInView={still ? undefined : {opacity: 1, y: 0}}
        viewport={{once: true, margin: '-10%'}}
        transition={{duration: 0.6, ease: [0.23, 1, 0.32, 1]}}
        className={'flex flex-col items-center rounded-card bg-tile px-6 py-16 text-center sm:px-14 sm:py-24'}
      >
        <h2
          className={
            'max-w-[22ch] font-display text-h2 font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-neutral-900'
          }
        >
          {title}
        </h2>

        <p className={'mt-5 max-w-[48ch] text-lead text-pretty text-neutral-600'}>{body}</p>

        <div className={'mt-10 flex flex-wrap justify-center gap-3'}>
          <motion.a
            whileHover={{scale: 1.015}}
            whileTap={{scale: 0.985}}
            href={`${DASHBOARD_URI}/auth/signup`}
            className={
              'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-ui font-semibold text-white transition hover:bg-neutral-800'
            }
          >
            Start for free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </motion.a>
          <Link
            href={second.href}
            {...(second.external ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
            className={
              'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:border-neutral-900'
            }
          >
            {second.label}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

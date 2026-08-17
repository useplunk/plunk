import {motion} from 'framer-motion';
import Link from 'next/link';
import React from 'react';
import {ArrowRight} from 'lucide-react';

import {DASHBOARD_URI} from '../../lib/constants';

/**
 * The closing band on every feature page.
 *
 * Six near-identical copies of this existed, and the pricing line inside four
 * of them was pasted verbatim. Worth centralising for that reason alone: a
 * pricing claim repeated in six files is a pricing claim that will be corrected
 * in five of them.
 *
 * The primary label is fixed at "Start for free" rather than exposed as a prop.
 * These pages said "Get started for free" while the homepage and nav said
 * "Start for free", which made seven names for one door across the site.
 */
export function FeatureCTA({
  title,
  secondary,
}: {
  title: React.ReactNode;
  /** Defaults to pricing. Pages whose natural next step is docs override it. */
  secondary?: {href: string; label: string; external?: boolean};
}) {
  const second = secondary ?? {href: '/pricing', label: 'View pricing'};

  return (
    <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
      <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
        <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
          <motion.h2
            initial={{opacity: 0, y: 16}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.8, ease: [0.23, 1, 0.32, 1]}}
            className={'max-w-[16ch] font-display text-h2 font-extrabold leading-[1.05] tracking-[-0.035em]'}
          >
            {title}
          </motion.h2>

          <motion.div
            initial={{opacity: 0, y: 16}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.8, delay: 0.12, ease: [0.23, 1, 0.32, 1]}}
            className={'flex max-w-md flex-col gap-6'}
          >
            {/* Matches the homepage exactly. The old line, "Free plan
                available. $0.001 per email on paid. No credit card required.",
                framed the two plans correctly but sat in four separate files. */}
            <p className={'text-lead text-neutral-300'}>Free plan: 1,000 emails a month. Paid: $0.001 an email.</p>

            <div className={'flex flex-wrap gap-3'}>
              <motion.a
                whileHover={{scale: 1.015}}
                whileTap={{scale: 0.985}}
                href={`${DASHBOARD_URI}/auth/signup`}
                className={
                  'group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'
                }
              >
                Start for free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </motion.a>
              <Link
                href={second.href}
                {...(second.external ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
                className={
                  'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'
                }
              >
                {second.label}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

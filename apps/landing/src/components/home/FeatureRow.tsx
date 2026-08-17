import {motion, useReducedMotion} from 'framer-motion';
import Link from 'next/link';
import React from 'react';
import {ArrowRight} from 'lucide-react';

/**
 * One capability, shown and then described.
 *
 * This replaces the six-card bento. That grid had three problems a card grid
 * cannot solve: a card sized to hold an icon and two lines has nowhere to put
 * a picture of the thing it names, so five of the six held an icon and ~120px
 * of nothing; the cards looked interactive and were not, so the feature pages
 * they describe were reachable only through the nav dropdown; and the same
 * shape appeared again in the testimonials section, which made a twelve-section
 * page read as two sections repeated.
 *
 * A row gives the artifact half the width and the prose the other half, and it
 * alternates sides so three of them do not read as a list. `reversed` swaps the
 * order on desktop only. On mobile the artifact always leads, because the
 * picture is the part that earns the scroll.
 */
export function FeatureRow({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
  artifact,
  reversed = false,
}: {
  /** The product noun. Sits with the heading, not above it as a tracked kicker. */
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  artifact: React.ReactNode;
  reversed?: boolean;
}) {
  const still = useReducedMotion();

  return (
    <motion.section
      initial={still ? undefined : {opacity: 0, y: 20}}
      whileInView={still ? undefined : {opacity: 1, y: 0}}
      viewport={{once: true, margin: '-12%'}}
      transition={{duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
      className={'grid items-center gap-10 lg:grid-cols-12 lg:gap-16'}
    >
      {/* The artifact is rendered bare. Every artifact now carries its own
          `Surface` — header strip, border, background — so wrapping it here in
          a second bordered card produced a card inside a card: two borders, two
          radii and two lots of padding around one drawing. */}
      <div className={`min-w-0 lg:col-span-7 ${reversed ? 'lg:order-2 lg:col-start-6' : ''}`}>{artifact}</div>

      <div className={`lg:col-span-5 ${reversed ? 'lg:order-1 lg:col-start-1 lg:row-start-1' : ''}`}>
        <p className={'font-code text-label text-neutral-500'}>{eyebrow}</p>
        <h3 className={'mt-3 font-display text-h3 font-bold tracking-[-0.025em] text-neutral-900'}>{title}</h3>
        <p className={'mt-4 max-w-[46ch] text-neutral-600'}>{body}</p>
        <Link
          href={href}
          className={
            'group mt-6 inline-flex items-center gap-2 text-ui font-semibold text-neutral-900 underline-offset-4 hover:underline'
          }
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
        </Link>
      </div>
    </motion.section>
  );
}

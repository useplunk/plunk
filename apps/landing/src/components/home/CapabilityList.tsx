import {motion, useReducedMotion} from 'framer-motion';
import Link from 'next/link';
import React from 'react';
import {ArrowUpRight} from 'lucide-react';

/**
 * The rest of the platform, as a compact linked index.
 *
 * The first attempt at this borrowed the competitor list's shape: full-width
 * divided rows, name on the left, arrow pinned to the right edge. That works
 * for the competitor list because the names are set at 36px and fill the line.
 * Here the name is 20px and the description is one short sentence, so the row's
 * content ran out around x=845 in a 1408px container and the arrow sat alone at
 * the far right with a 340px hole in the middle of every row. Four of those
 * stacked read as broken layout, not as an index.
 *
 * Two columns of four fixes it: each cell is about 690px, which the name plus
 * description actually fills, and the arrow sits a normal distance from the text
 * it belongs to. The cells are bordered rather than divided because at two
 * columns a horizontal rule would imply a relationship across the gutter that
 * does not exist.
 */

export interface Capability {
  name: string;
  description: string;
  href: string;
}

export function CapabilityList({items}: {items: Capability[]}) {
  const still = useReducedMotion();

  return (
    <ul className={'grid gap-4 sm:grid-cols-2'}>
      {items.map((item, i) => (
        <motion.li
          key={item.href}
          initial={still ? undefined : {opacity: 0, y: 8}}
          whileInView={still ? undefined : {opacity: 1, y: 0}}
          viewport={{once: true, margin: '-10%'}}
          transition={{duration: 0.4, delay: still ? 0 : i * 0.05, ease: [0.22, 1, 0.36, 1]}}
        >
          <Link
            href={item.href}
            className={
              'group flex h-full items-start justify-between gap-6 rounded-card border border-neutral-200 bg-white px-6 py-5 transition-colors hover:border-neutral-900 focus-visible:border-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
            }
          >
            <span className={'min-w-0'}>
              <span
                className={
                  'block font-display text-lead font-semibold tracking-[-0.02em] text-neutral-900'
                }
              >
                {item.name}
              </span>
              <span className={'mt-1.5 block text-neutral-600'}>{item.description}</span>
            </span>
            <ArrowUpRight
              className={
                'mt-1 h-5 w-5 flex-shrink-0 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
              }
              strokeWidth={1.75}
            />
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

import {Label} from '../Mono';

/**
 * What everyone charges per email, drawn to scale.
 *
 * The previous version of this listed four prices as four equal-weight lines of
 * text: $0.001, $0.004, $0.002, $0.003. Every one of those is "nought point
 * nought nought something", so the reader has to count decimal places to learn
 * the only thing the section is arguing — that the others cost two to four
 * times as much. A bar makes the multiple the first thing you see instead of
 * the last thing you work out.
 *
 * Plunk's bar is solid and the rest are outlined, so the comparison has a
 * subject. The multiples are stated as well as drawn, because "4x" is the
 * sentence a reader repeats to someone else and a bar length is not.
 */

export interface PriceRow {
  name: string;
  /** USD per email on the plan that matches Plunk's. */
  price: number;
  logo?: React.ReactNode;
}

export function PriceComparison({rows, note}: {rows: PriceRow[]; note: string}) {
  const still = useReducedMotion();
  const max = Math.max(...rows.map(r => r.price));
  const base = Math.min(...rows.map(r => r.price));

  return (
    <figure className={'flex flex-col gap-3'}>
      {rows.map((row, i) => {
        const us = row.price === base;
        const multiple = row.price / base;
        return (
          <motion.div
            key={row.name}
            initial={still ? undefined : {opacity: 0, y: 8}}
            whileInView={still ? undefined : {opacity: 1, y: 0}}
            viewport={{once: true, margin: '-15%'}}
            transition={{duration: 0.4, delay: still ? 0 : i * 0.09, ease: [0.22, 1, 0.36, 1]}}
            className={'grid grid-cols-[7.5rem_1fr] items-center gap-4 sm:grid-cols-[9rem_1fr] sm:gap-5'}
          >
            <div className={`flex items-center gap-2.5 ${us ? 'text-neutral-900' : 'text-neutral-400'}`}>
              {row.logo}
              <span
                className={`truncate font-display font-semibold tracking-[-0.01em] ${
                  us ? 'text-neutral-900' : 'text-neutral-600'
                }`}
              >
                {row.name}
              </span>
            </div>

            {/* The bar and its readout share one track, with the price sitting
                just past the end of the bar rather than pinned to the far right
                of the container. Right-aligned figures put the numbers a few
                hundred pixels from the bars they label, which left a hole down
                the middle of the chart and made the comparison harder, not
                easier. Every bar is still measured from the same zero, which is
                what makes the lengths comparable.

                The bar's width is a fraction of the track *minus* the space the
                readout needs. Scaling against the full track meant the longest
                bar claimed 100% of it and pushed its own price label past the
                right edge of the section — visible at every viewport, not just
                narrow ones. */}
            <div className={'flex items-center gap-3'}>
              <motion.div
                initial={still ? undefined : {scaleX: 0}}
                whileInView={still ? undefined : {scaleX: 1}}
                viewport={{once: true, margin: '-15%'}}
                transition={{duration: 0.75, delay: still ? 0 : 0.1 + i * 0.09, ease: [0.22, 1, 0.36, 1]}}
                style={{width: `calc((100% - 7.5rem) * ${row.price / max})`}}
                className={`h-8 flex-shrink-0 origin-left rounded-md ${
                  us ? 'bg-neutral-900' : 'border border-neutral-300 bg-neutral-100'
                }`}
              />
              <div className={'flex min-w-0 items-baseline gap-2 tabular-nums'}>
                <span
                  className={`font-code text-ui ${us ? 'font-medium text-neutral-900' : 'text-neutral-600'}`}
                >
                  ${row.price.toFixed(3)}
                </span>
                <Label>{us ? 'base' : `${Math.round(multiple)}x`}</Label>
              </div>
            </div>
          </motion.div>
        );
      })}

      <figcaption className={'mt-3'}>
        <Label>{note}</Label>
      </figcaption>
    </figure>
  );
}

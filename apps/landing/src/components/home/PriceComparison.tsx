import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

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
 * Plunk's bar is solid black and the rest are pale grey, so the comparison has a
 * subject. The multiples are stated as well as drawn, because "4x" is the
 * sentence a reader repeats to someone else and a bar length is not.
 */

export interface PriceRow {
  name: string;
  /** Price per email on the plan that matches Plunk's, in `currency`. */
  price: number;
  /** Plunk bills in EUR; competitors publish USD prices, shown as published. */
  currency: 'EUR' | 'USD';
  logo?: React.ReactNode;
}

/**
 * Bars and multiples compare in USD, so EUR rows are converted first. Deliberately above the
 * market rate: it makes Plunk look a little more expensive, never cheaper than it is, so the
 * stated multiples hold while the rate moves. Raise it if the euro ever trades above it.
 */
const USD_PER_EUR = 1.2;

const SYMBOL = {EUR: '€', USD: '$'} as const;

function inUsd(row: PriceRow): number {
  return row.currency === 'EUR' ? row.price * USD_PER_EUR : row.price;
}

/** "2.5x", but "3x" rather than "3.0x". */
function formatMultiple(multiple: number): string {
  const rounded = Math.round(multiple * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}x`;
}

export function PriceComparison({rows, note}: {rows: PriceRow[]; note: string}) {
  const still = useReducedMotion();
  const max = Math.max(...rows.map(inUsd));
  const base = Math.min(...rows.map(inUsd));

  return (
    <figure className={'flex flex-col gap-3'}>
      {rows.map((row, i) => {
        const usd = inUsd(row);
        const us = usd === base;
        const multiple = usd / base;
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
                style={{width: `calc((100% - 7.5rem) * ${usd / max})`}}
                className={`h-8 flex-shrink-0 origin-left rounded-md ${
                  us ? 'bg-neutral-900' : 'bg-neutral-200'
                }`}
              />
              <div className={'flex min-w-0 items-baseline gap-2 tabular-nums'}>
                <span className={`text-ui ${us ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>
                  {SYMBOL[row.currency]}
                  {row.price.toFixed(3)}
                </span>
                <span className={'text-label text-neutral-500'}>{us ? 'base' : formatMultiple(multiple)}</span>
              </div>
            </div>
          </motion.div>
        );
      })}

      <figcaption className={'mt-3'}>
        <span className={'text-label text-neutral-500'}>{note}</span>
      </figcaption>
    </figure>
  );
}

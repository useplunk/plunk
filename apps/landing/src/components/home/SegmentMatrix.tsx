import {motion, useInView, useReducedMotion} from 'framer-motion';
import React from 'react';

import {Surface} from './Surface';

/**
 * A segment, drawn as the builder plus the population it resolves to — and then
 * re-resolving.
 *
 * The static version of this illustrated the wrong claim. The heading argues
 * that a segment *stays current* ("contacts enter and leave as their data and
 * behaviour change"), which is a statement about time, and the artifact showed
 * a filter narrowing a list, which is a statement about set membership at one
 * instant. Every tool can filter. The differentiator was left to the words
 * `updates live` in the footer — text doing the job the picture should do.
 *
 * So the matrix now changes. A few seconds after it resolves, two contacts
 * cross `last_seen > 30d`, their cells flip, and the count ticks up. It is the
 * only repeating motion on the page, which is justified here because the thing
 * being sold is precisely that this does not hold still. Watching a cell light
 * up on its own makes the footer true instead of merely stated.
 */

const COLS = 24;
const ROWS = 9;
const CELLS = COLS * ROWS;
const EASE = [0.23, 1, 0.32, 1] as const;

export interface SegmentSpec {
  total: number;
  conditions: string[];
  matched: number;
}

/**
 * Which cells are lit at rest. Deterministic rather than random: a random pick
 * re-rolls on every render and on rehydration, so server and client markup
 * would disagree. The stride also spreads survivors evenly, which reads better
 * than a clump — a segment is a filter across the list, not a slice off one end.
 */
function litCells(count: number) {
  const lit = new Set<number>();
  if (count <= 0) return lit;
  const stride = CELLS / count;
  for (let i = 0; i < count; i++) lit.add(Math.floor(i * stride));
  return lit;
}

/** `plan = pro` → the three parts a builder row shows in separate columns. */
function parseCondition(condition: string) {
  const match = condition.match(/^(\S+)\s*(=|>|<|!=)\s*(.+)$/);
  if (!match) return {field: condition, operator: '', value: ''};
  return {field: match[1]!, operator: match[2]!, value: match[3]!};
}

/**
 * Cells that join the segment while you are looking at it. Picked from the dark
 * gaps between lit cells so the change is visible wherever the reader's eye
 * happens to be, and hard-coded so it is identical on every render.
 */
const ARRIVALS = [64, 137];

/** How many contacts each arriving cell stands for, so the count moves honestly. */
const PER_CELL = 12;

export function SegmentMatrix({spec}: {spec: SegmentSpec}) {
  const still = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {once: true, margin: '-15%'});

  const baseLit = React.useMemo(
    () => litCells(Math.max(1, Math.round(CELLS * (spec.matched / spec.total)))),
    [spec.matched, spec.total],
  );

  /** How many of `ARRIVALS` have joined so far. */
  const [arrived, setArrived] = React.useState(0);

  React.useEffect(() => {
    if (!inView || still) return;

    // Starts after the initial sweep has finished, so the reader sees the
    // segment settle first and only then sees it move.
    const timers = ARRIVALS.map((_, i) => window.setTimeout(() => setArrived(i + 1), 2000 + i * 2600));
    return () => timers.forEach(window.clearTimeout);
  }, [inView, still]);

  const matched = spec.matched + arrived * PER_CELL;

  return (
    <Surface label={'segment'} meta={<span>Pro, inactive</span>}>
      {/* The query */}
      <ul className={'divide-y divide-neutral-100'}>
        {spec.conditions.map((condition, i) => {
          const {field, operator, value} = parseCondition(condition);
          return (
            <motion.li
              key={condition}
              initial={still ? {opacity: 0} : {opacity: 0, y: 4}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true, margin: '-15%'}}
              transition={{duration: 0.3, delay: still ? 0 : 0.1 + i * 0.07, ease: EASE}}
              className={'flex items-baseline gap-3 px-5 py-3'}
            >
              <span className={'w-8 flex-shrink-0 font-code text-[0.6875rem] text-neutral-400'}>
                {i === 0 ? 'where' : 'and'}
              </span>
              <span className={'font-code text-ui text-neutral-900'}>{field}</span>
              <span className={'font-code text-ui text-neutral-400'}>{operator}</span>
              <span className={'min-w-0 flex-1 truncate font-code text-ui text-neutral-700'}>{value}</span>
            </motion.li>
          );
        })}
      </ul>

      {/* The population it resolves to */}
      <div ref={ref} className={'border-t border-neutral-200 px-5 py-5'}>
        <div
          aria-hidden
          className={'grid gap-[3px]'}
          style={{gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`}}
        >
          {Array.from({length: CELLS}, (_, i) => {
            const arrival = ARRIVALS.indexOf(i);
            const isArrival = arrival !== -1;
            const on = baseLit.has(i) || (isArrival && arrival < arrived);

            return (
              <motion.span
                key={i}
                initial={still ? {opacity: 0} : {opacity: 0}}
                whileInView={{opacity: 1}}
                viewport={{once: true, margin: '-15%'}}
                transition={{
                  duration: 0.3,
                  // Sweeps left to right rather than firing 216 cells at once,
                  // which would just read as the block appearing.
                  delay: still ? 0 : 0.3 + (i % COLS) * 0.012,
                  ease: EASE,
                }}
                className={'aspect-square'}
              >
                <motion.span
                  animate={{
                    backgroundColor: on ? '#171717' : '#e5e5e5',
                    // A joining cell overshoots very slightly, so the change
                    // catches the eye in peripheral vision without becoming a
                    // bouncing dot.
                    scale: isArrival && on ? [1, 1.35, 1] : 1,
                  }}
                  transition={{duration: 0.45, ease: EASE}}
                  className={'block h-full w-full rounded-[2px]'}
                />
              </motion.span>
            );
          })}
        </div>
      </div>

      <motion.div
        initial={still ? {opacity: 0} : {opacity: 0}}
        whileInView={{opacity: 1}}
        viewport={{once: true, margin: '-15%'}}
        transition={{duration: 0.35, delay: still ? 0 : 0.7, ease: EASE}}
        className={'flex items-baseline justify-between gap-4 border-t border-neutral-200 bg-neutral-50 px-5 py-3'}
      >
        <span className={'font-code text-label text-neutral-600'}>
          <motion.span
            key={matched}
            initial={still || matched === spec.matched ? false : {opacity: 0, y: -3}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3, ease: EASE}}
            className={'inline-block tabular-nums text-neutral-900'}
          >
            {matched.toLocaleString('en-US')}
          </motion.span>{' '}
          of {spec.total.toLocaleString('en-US')} match
        </span>

        {/* Reads as a status light once the count starts moving, which is the
            moment the phrase stops being a promise. */}
        <span className={'flex items-center gap-2 font-code text-label text-neutral-500'}>
          <motion.span
            aria-hidden
            animate={still ? {opacity: 1} : {opacity: [1, 0.35, 1]}}
            transition={{duration: 2, repeat: Infinity, ease: 'easeInOut'}}
            className={'h-1.5 w-1.5 rounded-full bg-neutral-900'}
          />
          updates live
        </span>
      </motion.div>
    </Surface>
  );
}

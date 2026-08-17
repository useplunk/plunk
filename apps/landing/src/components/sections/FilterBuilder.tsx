import {motion} from 'framer-motion';
import React from 'react';

export interface Condition {
  /** The condition, in as few words as possible. */
  label: string;
  /** How many contacts remain once it is applied. */
  remaining: number;
}

/**
 * A segment, drawn as the narrowing it actually is.
 *
 * The first version listed field / operator / value rows, which was really a
 * screenshot of a query builder rendered in text: accurate, and three lines of
 * reading before you learned anything. What a segment *does* is take a list and
 * make it smaller, so that is what this shows — bars shortening, a count coming
 * down, and the answer at the bottom. The conditions are still there, but as
 * captions on a picture rather than as the picture itself.
 */
export function FilterBuilder({total, conditions}: {total: number; conditions: Condition[]}) {
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className={'flex flex-col gap-3'}>
      {/* Starting population */}
      <motion.div
        initial={{opacity: 0}}
        whileInView={{opacity: 1}}
        viewport={{once: true}}
        transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
        className={'flex items-baseline justify-between gap-4'}
      >
        <span className={'text-neutral-500'}>All contacts</span>
        <span
          style={{fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums'}}
          className={'text-h3 font-bold tracking-[-0.02em] text-neutral-400'}
        >
          {fmt(total)}
        </span>
      </motion.div>

      <div className={'h-2 w-full overflow-hidden rounded-full bg-neutral-100'}>
        <motion.div
          initial={{scaleX: 0}}
          whileInView={{scaleX: 1}}
          viewport={{once: true}}
          transition={{duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
          className={'h-full w-full origin-left rounded-full bg-neutral-200'}
        />
      </div>

      {conditions.map((condition, i) => {
        const last = i === conditions.length - 1;
        const width = Math.max(condition.remaining / total, 0.06);
        return (
          <motion.div
            key={condition.label}
            initial={{opacity: 0, y: 6}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.4, delay: 0.25 + i * 0.18, ease: [0.22, 1, 0.36, 1]}}
            className={'mt-4'}
          >
            <div className={'flex items-baseline justify-between gap-4'}>
              <span
                className={'font-code text-label text-neutral-700'}
              >
                {condition.label}
              </span>
              <span
                style={{fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums'}}
                className={`text-h3 font-bold tracking-[-0.02em] ${last ? 'text-neutral-900' : 'text-neutral-400'}`}
              >
                {fmt(condition.remaining)}
              </span>
            </div>
            <div className={'mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100'}>
              <motion.div
                initial={{scaleX: 0}}
                whileInView={{scaleX: width}}
                viewport={{once: true}}
                transition={{duration: 0.7, delay: 0.35 + i * 0.18, ease: [0.22, 1, 0.36, 1]}}
                className={`h-full w-full origin-left rounded-full ${last ? 'bg-neutral-900' : 'bg-neutral-300'}`}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

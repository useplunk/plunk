import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

export interface Step {
  title: string;
  body: string;
}

/**
 * The number on a step: a small white card with a hairline, the same piece as
 * a step in the snippet graphics, not a solid black dot. The black dots were
 * the only filled circles on the site and read as a template's "1 2 3"; this
 * belongs to the same family as FlowFragment, whose steps are joined by the
 * same 1px line the sequences below use.
 */
export function StepMarker({n}: {n: number}) {
  return (
    <span
      aria-hidden
      className={
        'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200/80 bg-white font-display text-ui font-bold text-neutral-900 shadow-fragment tabular-nums'
      }
    >
      {n}
    </span>
  );
}

/**
 * An ordered sequence: setup steps, a flow, a lifecycle. Numbers are allowed
 * here because the order is the content.
 *
 * Three columns joined by a line from each marker to the next, so the steps
 * read as one sequence rather than three separate facts that happen to be
 * numbered. The line draws in after its step appears. Below `sm` the columns
 * stack and the line runs down the left instead.
 */
export function StepSequence({steps}: {steps: Step[]}) {
  const still = useReducedMotion();

  return (
    <ol className={'grid gap-10 sm:grid-cols-3 sm:gap-8'}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const delay = still ? 0 : i * 0.12;

        return (
          <motion.li
            key={step.title}
            initial={still ? undefined : {opacity: 0, y: 12}}
            whileInView={still ? undefined : {opacity: 1, y: 0}}
            viewport={{once: true, margin: '-10%'}}
            transition={{duration: 0.5, delay, ease: [0.22, 1, 0.36, 1]}}
            className={'relative flex gap-5 sm:block'}
          >
            {!last && (
              <>
                {/* Across, to the next column's marker. */}
                <motion.span
                  aria-hidden
                  initial={still ? undefined : {scaleX: 0}}
                  whileInView={still ? undefined : {scaleX: 1}}
                  viewport={{once: true, margin: '-10%'}}
                  transition={{duration: 0.6, delay: delay + 0.25, ease: [0.22, 1, 0.36, 1]}}
                  className={
                    'absolute left-[2.75rem] right-[-1.25rem] top-4 hidden h-px origin-left bg-neutral-300 sm:block'
                  }
                />
                {/* Down, to the next stacked marker. */}
                <span
                  aria-hidden
                  className={'absolute bottom-[-2rem] left-4 top-[2.5rem] w-px bg-neutral-300 sm:hidden'}
                />
              </>
            )}
            <StepMarker n={i + 1} />
            <div className={'min-w-0 sm:mt-6'}>
              <h3 className={'font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'}>{step.title}</h3>
              <p className={'mt-2 max-w-[38ch] text-neutral-600'}>{step.body}</p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

import {motion} from 'framer-motion';
import React from 'react';

import {Label} from '../Mono';

export interface Step {
  title: string;
  body: string;
}

/**
 * An ordered sequence: setup steps, a flow, a lifecycle.
 *
 * This is the one place on the site where numerals are allowed as section
 * furniture, because here the order *is* the content — step two genuinely
 * follows step one. Everywhere else the numbers were decoration and have been
 * removed.
 *
 * Rendered as a hairline grid (`gap-px` over a neutral background) rather than
 * as three separate cards, so the steps read as one continuous run instead of
 * three unrelated things that happen to sit in a row.
 */
export function StepSequence({steps}: {steps: Step[]}) {
  return (
    <ol
      className={'grid gap-px overflow-hidden rounded-card border border-neutral-200 bg-neutral-200 sm:grid-cols-3'}
    >
      {steps.map((step, i) => (
        <motion.li
          key={step.title}
          initial={{opacity: 0, y: 16}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1]}}
          className={'bg-white p-8 sm:p-10'}
        >
          <Label>Step {String(i + 1).padStart(2, '0')}</Label>
          <h3
            style={{fontFamily: 'var(--font-display)'}}
            className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}
          >
            {step.title}
          </h3>
          <p className={'mt-3 text-neutral-600'}>{step.body}</p>
        </motion.li>
      ))}
    </ol>
  );
}

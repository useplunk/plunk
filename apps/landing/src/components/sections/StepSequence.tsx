import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

export interface Step {
  title: string;
  body: string;
}

/**
 * An ordered sequence: setup steps, a flow, a lifecycle. Numbers are allowed
 * here because the order is the content.
 *
 * Three open columns with a numbered dot, not three bordered boxes with a mono
 * "Step 01" label: the boxes made three short sentences look like a form.
 */
export function StepSequence({steps}: {steps: Step[]}) {
  const still = useReducedMotion();

  return (
    <ol className={'grid gap-10 sm:grid-cols-3 sm:gap-8'}>
      {steps.map((step, i) => (
        <motion.li
          key={step.title}
          initial={still ? undefined : {opacity: 0, y: 12}}
          whileInView={still ? undefined : {opacity: 1, y: 0}}
          viewport={{once: true, margin: '-10%'}}
          transition={{duration: 0.5, delay: still ? 0 : i * 0.08, ease: [0.22, 1, 0.36, 1]}}
        >
          <span
            aria-hidden
            className={
              'flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-ui font-semibold text-white'
            }
          >
            {i + 1}
          </span>
          <h3 className={'mt-5 font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'}>
            {step.title}
          </h3>
          <p className={'mt-2 max-w-[38ch] text-neutral-600'}>{step.body}</p>
        </motion.li>
      ))}
    </ol>
  );
}

import {motion} from 'framer-motion';
import React from 'react';

import {Code} from '../Mono';

export interface Spec {
  title: string;
  description: string;
  /**
   * Literal machine text belonging to this entry: an event flow, a DNS record,
   * a filter condition. Rendered through `Code`, so it stays monospace but in
   * sentence case at a readable size.
   *
   * This used to be set as an 11px all-caps tracked label, which turned whole
   * sentences ("TRIGGER ON CART ABANDONED -> WAIT 1 HOUR -> SEND REMINDER")
   * into shouted micro-text at 2.5:1 contrast.
   */
  machine?: string;
}

/**
 * A divided list of things that are alike: use cases, capabilities, scenarios.
 *
 * Rules over cards. Six identical bordered boxes make six items look equally
 * important and equally forgettable; hairline rules let the eye run down the
 * column and give the titles somewhere to sit. The unnumbered variant is the
 * default — use `StepSequence` when order actually matters.
 */
export function SpecList({specs}: {specs: Spec[]}) {
  return (
    <ul className={'divide-y divide-neutral-200 border-y border-neutral-200'}>
      {specs.map((spec, index) => (
        <motion.li
          key={spec.title}
          initial={{opacity: 0, y: 12}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1]}}
          className={'grid grid-cols-12 gap-x-8 gap-y-3 py-10 sm:py-12'}
        >
          <h3
            className={'font-display col-span-12 text-h3 font-bold tracking-[-0.02em] text-neutral-900 sm:col-span-4'}
          >
            {spec.title}
          </h3>
          <div className={'col-span-12 sm:col-span-8'}>
            <p className={'max-w-[65ch] text-neutral-600'}>{spec.description}</p>
            {spec.machine && (
              <div className={'mt-4'}>
                <Code tone={'muted'}>{spec.machine}</Code>
              </div>
            )}
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

import {motion} from 'framer-motion';
import React from 'react';

import {Label} from '../Mono';

export interface Stat {
  figure: string;
  caption: string;
}

/**
 * A row of headline figures.
 *
 * The figures are set in the display face rather than mono: at this size the
 * display face has the weight the numbers deserve, and mono's uniform widths
 * flatten the contrast between "5,000+" and "$0.001". Mono stays on the
 * caption, where it is doing its actual job — naming the thing.
 */
export function StatBand({stats}: {stats: Stat[]}) {
  return (
    <dl className={'grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4'}>
      {stats.map((stat, i) => (
        <motion.div
          key={stat.caption}
          initial={{opacity: 0, y: 16}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1]}}
        >
          <dt className={'sr-only'}>{stat.caption}</dt>
          <dd>
            <div
              style={{fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums'}}
              className={'text-h2 font-extrabold tracking-[-0.035em] text-neutral-900'}
            >
              {stat.figure}
            </div>
            <div className={'mt-3 border-t border-neutral-200 pt-3'}>
              <Label>{stat.caption}</Label>
            </div>
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}

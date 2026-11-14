import {motion} from 'framer-motion';
import React from 'react';

/**
 * A body section on a feature page: heading, optional intro, content.
 *
 * Sections no longer alternate grey bands or draw a rule between them. The
 * bands chopped each page into slabs; the tiles inside the sections already
 * give the page its rhythm, so whitespace alone separates them, as on the
 * homepage.
 */
export function FeatureSection({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20'}>
        <motion.div
          initial={{opacity: 0, y: 16}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-10%'}}
          transition={{duration: 0.6, ease: [0.23, 1, 0.32, 1]}}
          className={'mb-12 max-w-[55ch]'}
        >
          <h2 className={'font-display text-h2 font-extrabold tracking-[-0.03em] text-neutral-900'}>{title}</h2>
          {intro && <p className={'mt-5 text-lead text-neutral-600'}>{intro}</p>}
        </motion.div>

        {children}
      </div>
    </section>
  );
}

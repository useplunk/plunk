import {motion} from 'framer-motion';
import React from 'react';

/**
 * A body section on a feature page: heading, optional intro, content.
 *
 * The six pages carried roughly fourteen hand-inlined copies of this heading
 * block. The copies drifted in the way copies do: the four older pages put no
 * measure limit on the heading column at all, so intro copy ran the full 88rem
 * container at a 900px measure, while the two newer ones clamped to 55ch. The
 * clamp is not a nicety, it is the difference between a readable line and one
 * the eye loses its place in.
 *
 * `tone="muted"` gives the section the neutral-50 background the site uses to
 * separate adjacent sections, so pages can alternate without hand-writing the
 * class each time.
 */
export function FeatureSection({
  title,
  intro,
  tone = 'plain',
  children,
}: {
  title: string;
  intro?: string;
  tone?: 'plain' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <section
      /* The rule is unconditional. When it was drawn only for muted sections,
         two plain sections in a row had nothing between them but 192px of
         padding, so they read as one very long section with a hole in it. */
      className={`border-t border-neutral-200 ${tone === 'muted' ? 'bg-neutral-50/60' : ''}`}
    >
      <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
        <motion.div
          initial={{opacity: 0, y: 16}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-10%'}}
          transition={{duration: 0.6, ease: [0.23, 1, 0.32, 1]}}
          className={'mb-14 max-w-[55ch]'}
        >
          <h2 className={'font-display text-h2 font-extrabold tracking-[-0.03em] text-neutral-900'}>{title}</h2>
          {intro && <p className={'mt-5 text-lead text-neutral-600'}>{intro}</p>}
        </motion.div>

        {children}
      </div>
    </section>
  );
}

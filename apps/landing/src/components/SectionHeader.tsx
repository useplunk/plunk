import {motion} from 'framer-motion';
import React from 'react';

/**
 * Section opener: a display heading and an optional lead paragraph.
 *
 * This used to print a tracked-caps eyebrow (`§ 04  CAPABILITIES`) in a column
 * of its own beside every heading. Both parts are gone. The number was
 * scaffolding — nobody needs to know a section's index — and the eyebrow was
 * restating the heading in smaller, harder-to-read type while consuming a
 * quarter of the row's width. A heading that needs a label above it explaining
 * what it is isn't finished.
 *
 * The heading now starts at the left edge and gets the full measure.
 */
export function SectionHeader({
  title,
  titleAccent,
  subtitle,
}: {
  title: string;
  titleAccent?: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{opacity: 0, y: 16}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, margin: '-10%'}}
      transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
    >
      <h2
        style={{fontFamily: 'var(--font-display)'}}
        className={'max-w-[20ch] text-h2 font-extrabold tracking-[-0.03em] text-neutral-900'}
      >
        {title}
        {titleAccent && <> {titleAccent}</>}
      </h2>
      {subtitle && <p className={'mt-6 max-w-[65ch] text-lead text-neutral-600'}>{subtitle}</p>}
    </motion.div>
  );
}

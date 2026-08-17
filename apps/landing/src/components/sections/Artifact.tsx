import {motion} from 'framer-motion';
import React from 'react';

import {Label} from '../Mono';

/**
 * A framed device holding a code-drawn representation of the product.
 *
 * The landing site ships no raster imagery, which left prose carrying all the
 * visual weight — a "Visual workflow builder" section whose entire content was
 * three boxes of text. The fix is to draw the product in CSS and SVG instead:
 * no asset pipeline, no image weight, responsive by construction, and it stays
 * on-palette automatically.
 *
 * The pattern is not new here. The homepage's contact card (`hello@useplunk.com`
 * with its event counts) is exactly this, and it is one of the strongest things
 * on the site. `Artifact` is that idea extracted so other pages can use it.
 */
export function Artifact({
  label,
  children,
  className = '',
}: {
  /** Short mono caption naming what is being shown. */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.figure
      initial={{opacity: 0, y: 20}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true}}
      transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
      className={`overflow-hidden rounded-card border border-neutral-200 bg-white ${className}`}
    >
      <figcaption className={'flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-3'}>
        <span aria-hidden className={'h-1.5 w-1.5 rounded-full bg-neutral-900'} />
        <Label>{label}</Label>
      </figcaption>
      <div className={'p-6 sm:p-8'}>{children}</div>
    </motion.figure>
  );
}

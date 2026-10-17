import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

/**
 * The flat panel a product fragment sits on.
 *
 * Replaces `Surface` for marketing graphics. Surface framed every drawing as a
 * window, with a mono header strip, meta text and often a footer, and that
 * chrome is most of why the old graphics read as dense and technical. A tile
 * has no border and no header: the pale panel does the framing, and the white
 * fragment on it is the only thing that looks like interface.
 *
 * `align` picks how the fragment meets the tile:
 * - `center` sets one small fragment in a lot of empty space.
 * - `bleed-right` and `bleed-bottom` offset it from one corner and let it run
 *   off the opposite edge, which suggests the rest of the product without
 *   drawing it.
 */
export function SnippetTile({
  align = 'center',
  className = '',
  children,
}: {
  align?: 'center' | 'bleed-right' | 'bleed-bottom';
  className?: string;
  children: React.ReactNode;
}) {
  const layout = {
    'center': 'flex items-center justify-center p-8',
    'bleed-right': 'flex items-center pl-8 sm:pl-10',
    'bleed-bottom': 'flex items-end justify-center px-8 pt-10',
  }[align];

  const bleed = {
    'center': '',
    'bleed-right': 'w-[calc(100%+2.5rem)] flex-shrink-0',
    'bleed-bottom': '-mb-6 w-full',
  }[align];

  return (
    // Fragments are mock UI with made-up data; keep that text out of search snippets
    <div className={`relative overflow-hidden rounded-card bg-tile ${layout} ${className}`} data-nosnippet>
      <div className={`min-w-0 ${bleed}`}>{children}</div>
    </div>
  );
}

/**
 * Tiles in a 2×2 grid, one column below `sm`. Each tile fades up in turn, once;
 * nothing moves after that.
 */
export function SnippetMosaic({children}: {children: React.ReactNode}) {
  const still = useReducedMotion();

  return (
    <div className={'grid gap-4 sm:grid-cols-2'}>
      {React.Children.map(children, (child, i) => (
        <motion.div
          initial={still ? undefined : {opacity: 0, y: 10}}
          whileInView={still ? undefined : {opacity: 1, y: 0}}
          viewport={{once: true, margin: '-10%'}}
          transition={{duration: 0.5, delay: still ? 0 : i * 0.08, ease: [0.23, 1, 0.32, 1]}}
          className={'grid'}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

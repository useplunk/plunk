import {motion, useReducedMotion} from 'framer-motion';
import Image, {type StaticImageData} from 'next/image';
import React from 'react';

/**
 * The testimonials, as pale tiles in the same material as the snippet
 * graphics: no borders, no black card, the quote at the top and the person at
 * the bottom. Every quote gets the same tile; the quotes are all short, so
 * none of them earns a bigger one.
 */

export interface Quote {
  testimonial: string;
  author: string;
  role: string;
  image: StaticImageData;
}

export function QuoteWall({quotes}: {quotes: Quote[]}) {
  const still = useReducedMotion();

  return (
    <div className={'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
      {quotes.map((quote, i) => (
        <motion.figure
          key={quote.author}
          initial={still ? undefined : {opacity: 0, y: 12}}
          whileInView={still ? undefined : {opacity: 1, y: 0}}
          viewport={{once: true, margin: '-8%'}}
          transition={{duration: 0.5, delay: still ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1]}}
          className={'flex flex-col justify-between gap-10 rounded-card bg-tile p-7 sm:p-8'}
        >
          <blockquote className={'text-lead text-pretty text-neutral-900'}>&ldquo;{quote.testimonial}&rdquo;</blockquote>
          <figcaption className={'flex items-center gap-3'}>
            <span className={'relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full'}>
              <Image src={quote.image} alt="" placeholder="blur" className={'object-cover'} />
            </span>
            <span className={'min-w-0'}>
              <span className={'block text-ui font-semibold text-neutral-900'}>{quote.author}</span>
              <span className={'block text-label text-neutral-500'}>{quote.role}</span>
            </span>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
}

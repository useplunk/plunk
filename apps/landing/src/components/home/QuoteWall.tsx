import {motion, useReducedMotion} from 'framer-motion';
import Image, {type StaticImageData} from 'next/image';
import React from 'react';

import {Label} from '../Mono';

/**
 * The testimonials, as a wall rather than a second bento.
 *
 * The old version reused the feature grid exactly: black card spanning two
 * columns and two rows in the top-left, white bordered cards filling in around
 * it, `auto-rows-[17rem]`. Two identical grids is what made a long page feel
 * repetitive, and the fixed row height meant a four-word quote sat at the top
 * of a 272px card with everything below it empty.
 *
 * A masonry column layout fixes both: each quote takes exactly the height of
 * its own text, so "Lots of care put into Plunk" is a small card and there is
 * no void under it, and the resulting ragged column is a different silhouette
 * from anything else on the page.
 *
 * The lead quote sits outside the columns at display size. It is the one with
 * the most to say, and giving it its own register means the wall underneath can
 * stay uniformly quiet instead of needing a highlighted member.
 *
 * It takes eight of twelve columns rather than the full width. At full width a
 * quote set to a readable 24ch measure filled the left third of a 1408px black
 * card and left the remaining 900px empty and black, which is a lot of ink to
 * spend on nothing. Two of the shorter quotes stack in the remaining four
 * columns, so the row is full and the wall starts immediately.
 */

export interface Quote {
  testimonial: string;
  author: string;
  role: string;
  image: StaticImageData;
}

function Attribution({quote, inverted = false}: {quote: Quote; inverted?: boolean}) {
  return (
    <figcaption className={'mt-6 flex items-center gap-3'}>
      <span className={'relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full'}>
        <Image src={quote.image} alt="" placeholder="blur" className={'object-cover'} />
      </span>
      <span className={'min-w-0'}>
        <span
          className={`block text-ui font-semibold ${inverted ? 'text-white' : 'text-neutral-900'}`}
        >
          {quote.author}
        </span>
        {/* 12px, the floor of the type scale. This was 10px, which made the
            smallest text on the page the text whose entire job is credibility. */}
        <Label tone={inverted ? 'inverted' : 'default'} className={'block'}>
          {quote.role}
        </Label>
      </span>
    </figcaption>
  );
}

/**
 * `justify-between` with a full-height card, so the attribution sits on the
 * card's bottom edge whatever the quote above it does.
 *
 * The quotes run from four words to twenty, and letting each card take its own
 * height left the row visibly ragged — one card noticeably taller than the two
 * beside it, with the names landing at three different heights. Equal heights
 * with the names on a shared baseline reads as a set. The cost is a little air
 * above the shortest attribution, which is the right trade at this size
 * difference.
 */
function SmallQuote({quote, index, still}: {quote: Quote; index: number; still: boolean | null}) {
  return (
    <motion.figure
      initial={still ? undefined : {opacity: 0, y: 12}}
      whileInView={still ? undefined : {opacity: 1, y: 0}}
      viewport={{once: true, margin: '-8%'}}
      transition={{duration: 0.45, delay: still ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1]}}
      className={'flex h-full flex-col justify-between rounded-card border border-neutral-200 bg-white p-6'}
    >
      <blockquote className={'text-neutral-700'}>&ldquo;{quote.testimonial}&rdquo;</blockquote>
      <Attribution quote={quote} />
    </motion.figure>
  );
}

export function QuoteWall({lead, quotes}: {lead: Quote; quotes: Quote[]}) {
  const still = useReducedMotion();
  const [first, second, ...rest] = quotes;

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'grid gap-4 lg:grid-cols-12'}>
        <motion.figure
          initial={still ? undefined : {opacity: 0, y: 16}}
          whileInView={still ? undefined : {opacity: 1, y: 0}}
          viewport={{once: true, margin: '-12%'}}
          transition={{duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
          className={'flex flex-col justify-between rounded-card bg-neutral-900 p-8 text-white sm:p-12 lg:col-span-8'}
        >
          <blockquote
            className={'max-w-[26ch] font-display text-h2 font-extrabold leading-[1.05] tracking-[-0.03em]'}
          >
            &ldquo;{lead.testimonial}&rdquo;
          </blockquote>
          <Attribution quote={lead} inverted />
        </motion.figure>

        {/* The two cards split the lead quote's height between them rather than
            sizing to their own text, so the column's bottom edge lines up with
            the black card's instead of stopping short of it. */}
        <div className={'grid gap-4 lg:col-span-4 lg:grid-rows-2'}>
          {first && <SmallQuote quote={first} index={0} still={still} />}
          {second && <SmallQuote quote={second} index={1} still={still} />}
        </div>
      </div>

      {/* A grid, not CSS columns. Columns let every card take its own height,
          which is what left one quote in the row taller than its neighbours. */}
      <div className={'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
        {rest.map((quote, i) => (
          <SmallQuote key={quote.author} quote={quote} index={i} still={still} />
        ))}
      </div>
    </div>
  );
}

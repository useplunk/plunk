import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

import {Chip, Surface} from './Surface';

/**
 * One contact, drawn as the record itself.
 *
 * Two things had to be true here and only one of them was. The form was right —
 * a real activity feed rather than the four-boxes-and-converging-lines diagram
 * this replaced — but the *claim* went un-dramatised. The headline rests on the
 * word "one", and the merge was left implicit: you had to notice for yourself
 * that the tag column varied, which made the quietest element on the surface
 * carry the entire argument. The four source names also sat outside the artifact
 * as a glossary in the left column, so the idea lived in the least designed part
 * of the layout and then repeated itself in the feed.
 *
 * The filter row fixes both. It is a genuinely real pattern in any contact view,
 * it pulls the four sources inside the product UI where they belong, and a tab
 * bar naming four sources above a feed that visibly mixes all four *is* the
 * merge, stated in the product's own language rather than drawn as arrows.
 *
 * The feed then runs long enough for the tag column to read as a stripe rather
 * than a detail, and the footer says how far back the record goes, because
 * "complete history" is a claim about span and five rows ending at twelve days
 * does not make it.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

type Source = 'Transactional' | 'Campaign' | 'Workflow' | 'Inbound';

/** `All` first, because that is the selected tab and the point of the artifact. */
const filters = ['All', 'Transactional', 'Campaigns', 'Workflows', 'Inbound'] as const;

interface Event {
  source: Source;
  title: string;
  at: string;
}

/**
 * Deliberately interleaved. If the sources arrived in runs the column would
 * read as four grouped lists that happen to share a page; shuffled, it reads as
 * one record that everything writes to.
 */
const events: Event[] = [
  {source: 'Inbound', title: 'Replied to “Win-back, August”', at: '2m'},
  {source: 'Campaign', title: 'Opened “Win-back, August”', at: '3h'},
  {source: 'Workflow', title: 'Entered “Re-engagement”', at: '1d'},
  {source: 'Transactional', title: 'Invoice #4021 delivered', at: '6d'},
  {source: 'Campaign', title: 'Sent “August product update”', at: '9d'},
  {source: 'Transactional', title: 'Password reset delivered', at: '12d'},
  {source: 'Inbound', title: 'Replied to “Welcome to Plunk”', at: '20d'},
  {source: 'Workflow', title: 'Completed “Onboarding”', at: '26d'},
  {source: 'Transactional', title: 'Receipt #3980 delivered', at: '1mo'},
];

export function ContactRecord() {
  const still = useReducedMotion();

  return (
    <Surface
      label={'contact'}
      meta={
        <>
          <span>hello@useplunk.com</span>
          <Chip>active</Chip>
        </>
      }
    >
      {/* The four sources, as the filter they actually are. `All` is selected,
          so the feed below is every source at once — which is the claim. */}
      <div className={'flex flex-wrap items-center gap-1.5 border-b border-neutral-200 px-4 py-3'}>
        {filters.map((filter, i) => {
          const active = i === 0;
          return (
            <motion.span
              key={filter}
              initial={still ? {opacity: 0} : {opacity: 0, y: 4}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true, margin: '-15%'}}
              transition={{duration: 0.3, delay: still ? 0 : i * 0.05, ease: EASE}}
              className={`rounded-full px-2.5 py-1 font-code text-[0.6875rem] ${
                active ? 'bg-neutral-900 text-white' : 'text-neutral-500'
              }`}
            >
              {filter}
            </motion.span>
          );
        })}
      </div>

      <ol className={'divide-y divide-neutral-100'}>
        {events.map((event, i) => (
          <motion.li
            key={`${event.source}-${event.title}`}
            initial={still ? {opacity: 0} : {opacity: 0, y: 6}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true, margin: '-15%'}}
            transition={{duration: 0.35, delay: still ? 0 : 0.25 + i * 0.05, ease: EASE}}
            className={'flex items-baseline gap-3 px-5 py-2.5'}
          >
            {/* Fixed width so the tags form a stripe down the left edge. Four
                different words repeating in one column, in no order, is the
                argument — so it is set solid rather than as a soft chip. */}
            <span
              className={
                'w-[6.75rem] flex-shrink-0 truncate font-code text-[0.6875rem] font-medium text-neutral-900'
              }
            >
              {event.source}
            </span>
            <span className={'min-w-0 flex-1 truncate text-ui text-neutral-600'}>{event.title}</span>
            <span className={'flex-shrink-0 font-code text-[0.6875rem] text-neutral-400'}>{event.at}</span>
          </motion.li>
        ))}
      </ol>

      {/* `1,247 events` and `38 emails` were here. Only one of those supported
          the claim, and a row of big numbers with small captions is the stat
          block this page bans elsewhere. The span is what makes "complete
          history" true. */}
      <motion.div
        initial={still ? {opacity: 0} : {opacity: 0}}
        whileInView={{opacity: 1}}
        viewport={{once: true, margin: '-15%'}}
        transition={{duration: 0.35, delay: still ? 0 : 0.75, ease: EASE}}
        className={'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-neutral-200 bg-neutral-50 px-5 py-3'}
      >
        <span className={'font-code text-label text-neutral-600'}>4 sources · one record</span>
        <span className={'font-code text-label text-neutral-500'}>since March 2024</span>
      </motion.div>
    </Surface>
  );
}

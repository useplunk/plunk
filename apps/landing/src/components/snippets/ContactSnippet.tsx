import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

import {Avatar, SnippetRow, StatusPill, TimeAgo, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * One contact with a receipt, a newsletter and a reply in the same feed: the
 * three things the copy beside it says live in three products elsewhere. Four
 * rows, not nine, and the record runs off the bottom of the tile so it reads
 * as a longer history without drawing one.
 */
const history = [
  {source: 'Transactional', event: 'Receipt #3980 delivered', when: '2d'},
  {source: 'Campaign', event: 'Opened “August update”', when: '5d'},
  {source: 'Inbound', event: 'Replied “Thanks, all sorted”', when: '1w'},
  {source: 'Workflow', event: 'Finished “Onboarding”', when: '3w'},
];

export function ContactSnippet() {
  const still = useReducedMotion();

  return (
    <SnippetTile align={'bleed-bottom'} className={'min-h-96 sm:px-12 sm:pt-14'}>
      <UICard className={'mx-auto max-w-xl'}>
        <div className={'p-5'}>
          <SnippetRow
            leading={<Avatar name={'Ana Ruiz'} />}
            title={'Ana Ruiz'}
            label={'ana@acme.com'}
            labelPosition={'below'}
            trailing={<StatusPill tone={'ok'}>Subscribed</StatusPill>}
          />
        </div>

        <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
          {history.map((item, i) => (
            <motion.li
              key={item.event}
              initial={still ? undefined : {opacity: 0}}
              whileInView={still ? undefined : {opacity: 1}}
              viewport={{once: true, margin: '-10%'}}
              transition={{duration: 0.4, delay: still ? 0 : 0.15 + i * 0.08, ease: [0.23, 1, 0.32, 1]}}
              className={'flex items-center gap-3 px-5 py-3.5'}
            >
              <span className={'w-28 flex-shrink-0'}>
                <StatusPill>{item.source}</StatusPill>
              </span>
              <span className={'min-w-0 flex-1 truncate text-ui text-neutral-800'}>{item.event}</span>
              <TimeAgo>{item.when}</TimeAgo>
            </motion.li>
          ))}
        </ul>
      </UICard>
    </SnippetTile>
  );
}

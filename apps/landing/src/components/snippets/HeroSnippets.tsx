import {motion, useReducedMotion} from 'framer-motion';
import {Mail, Megaphone, Users, Workflow} from 'lucide-react';
import React from 'react';

import {Avatar, SnippetRow, StatusPill, UICard} from './fragments';

/**
 * The hero line, drawn: transactional email, a campaign and a workflow, with
 * the one contact they all share in the middle. A reader who skips the
 * subtitle gets the same sentence from the row.
 *
 * The fragments sit on one wide tile at slightly different heights, so the row
 * reads as a loose arrangement rather than a table. Below about 1,300px the
 * row is wider than the tile; it stays centred and the outer fragments run off
 * both edges, with a fade so the crop looks deliberate.
 */
export function HeroSnippets() {
  const still = useReducedMotion();

  const fragments = [
    {
      offset: 'mt-10',
      node: (
        <SnippetRow
          icon={Mail}
          label={'Transactional'}
          title={'Password reset'}
          trailing={<StatusPill tone={'ok'}>Delivered</StatusPill>}
        />
      ),
    },
    {
      offset: 'mt-0',
      node: <SnippetRow icon={Megaphone} label={'Campaign'} title={'Sent to 12,480 contacts'} />,
    },
    {
      offset: 'mt-6',
      node: (
        <SnippetRow
          leading={<Avatar name={'Ana Ruiz'} />}
          label={'ana@acme.com'}
          labelPosition={'below'}
          title={'Ana Ruiz'}
          trailing={<StatusPill tone={'ok'}>Subscribed</StatusPill>}
        />
      ),
    },
    {
      offset: 'mt-0',
      node: <SnippetRow icon={Workflow} label={'Workflow'} title={'Onboarding, step 2 of 4'} />,
    },
    {
      offset: 'mt-12',
      node: <SnippetRow icon={Users} label={'Segment'} title={'Pro customers'} />,
    },
  ];

  return (
    <div
      className={
        'relative overflow-hidden rounded-card bg-tile py-12 [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] sm:py-16'
      }
    >
      <div className={'flex items-start justify-center gap-4'}>
        {fragments.map((fragment, i) => (
          <motion.div
            key={i}
            initial={still ? undefined : {opacity: 0, y: 10}}
            animate={still ? undefined : {opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: still ? 0 : 0.35 + i * 0.08, ease: [0.23, 1, 0.32, 1]}}
            className={`w-72 flex-shrink-0 ${fragment.offset}`}
          >
            <UICard className={'p-4'}>{fragment.node}</UICard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

import {Filter} from 'lucide-react';
import React from 'react';

import {Avatar, SnippetRow, TimeAgo, UICard} from './fragments';
import {SnippetMosaic, SnippetTile} from './SnippetTile';

/**
 * "Audiences that stay current", in four tiles: the rule, the live count, and
 * two contacts moving in and out of it on their own. The movement is the
 * claim; the old graphic made the same point with a 216-cell grid and query
 * syntax that a reader had to decode.
 */
export function SegmentSnippets() {
  return (
    <SnippetMosaic>
      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow icon={Filter} label={'Segment'} title={'Pro, gone quiet'} />
          <ul className={'mt-3 flex flex-col gap-1.5 border-t border-neutral-100 pt-3 text-ui text-neutral-700'}>
            <li>Plan is Pro</li>
            <li>Last seen over 30 days ago</li>
          </ul>
        </UICard>
      </SnippetTile>

      <SnippetTile className={'min-h-56'}>
        <UICard className={'px-6 py-5 text-center'}>
          <p className={'font-display text-h3 font-bold tracking-[-0.02em] text-neutral-900 tabular-nums'}>2,455</p>
          <p className={'text-ui text-neutral-500'}>contacts</p>
          <p className={'mt-3 inline-flex items-center gap-1.5 text-label font-medium text-ok'}>
            <span aria-hidden className={'h-1.5 w-1.5 rounded-full bg-current'} />
            Updated just now
          </p>
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow
            leading={<Avatar name={'Tom Bakker'} />}
            title={'Tom Bakker'}
            label={'Joined the segment'}
            labelPosition={'below'}
            trailing={<TimeAgo>2m ago</TimeAgo>}
          />
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow
            leading={<Avatar name={'Priya Nair'} />}
            title={'Priya Nair'}
            label={'Left after upgrading'}
            labelPosition={'below'}
            trailing={<TimeAgo>1h ago</TimeAgo>}
          />
        </UICard>
      </SnippetTile>
    </SnippetMosaic>
  );
}

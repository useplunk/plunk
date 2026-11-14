import {Inbox, UserPlus, Zap} from 'lucide-react';
import React from 'react';

import {Avatar, SnippetRow, TimeAgo, UICard} from './fragments';
import {SnippetMosaic, SnippetTile} from './SnippetTile';

/**
 * The inbound sentence, one clause per tile, in reading order: every address
 * at your domain receives, a reply comes in, it becomes a contact, and it
 * starts a workflow. The old graphic carried contact IDs, mono chips and a
 * webhook path in its footer.
 */
export function InboundSnippets() {
  return (
    <SnippetMosaic>
      <SnippetTile className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow icon={Inbox} label={'Receiving at'} title={'yourdomain.com'} />
          <ul className={'mt-3 flex flex-col gap-1.5 border-t border-neutral-100 pt-3 text-ui text-neutral-700'}>
            <li>support@</li>
            <li>billing@</li>
            <li>hello@</li>
          </ul>
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow
            leading={<Avatar name={'Ana Ruiz'} />}
            title={'Ana Ruiz'}
            label={'To support@'}
            labelPosition={'below'}
            trailing={<TimeAgo>now</TimeAgo>}
          />
          <p className={'mt-3 border-t border-neutral-100 pt-3 text-ui text-neutral-700'}>
            Can you resend my invoice?
          </p>
        </UICard>
      </SnippetTile>

      <SnippetTile className={'min-h-56'}>
        <UICard className={'py-3 pl-3 pr-5'}>
          <SnippetRow icon={UserPlus} label={'New contact'} title={'Ana Ruiz'} />
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <SnippetRow icon={Zap} label={'Workflow started'} title={'Support reply'} />
        </UICard>
      </SnippetTile>
    </SnippetMosaic>
  );
}

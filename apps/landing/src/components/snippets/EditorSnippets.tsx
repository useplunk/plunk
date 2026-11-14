import {Eye} from 'lucide-react';
import React from 'react';

import {Avatar, UICard} from './fragments';
import {SnippetMosaic, SnippetTile} from './SnippetTile';

/**
 * "The editor that speaks both languages": the switch between them, the same
 * button in each, and the preview against a real contact the subtitle
 * promises. The code tile is the one place on a general page where code
 * appears, because here code is literally half the claim; it is one line.
 */
export function EditorSnippets() {
  return (
    <SnippetMosaic>
      <SnippetTile className={'min-h-56'}>
        <UICard className={'inline-flex gap-1 rounded-full p-1'}>
          <span className={'rounded-full bg-neutral-900 px-4 py-1.5 text-ui font-semibold text-white'}>Visual</span>
          <span className={'rounded-full px-4 py-1.5 text-ui font-semibold text-neutral-500'}>Code</span>
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'p-5'}>
          <p className={'font-display text-lead font-bold tracking-[-0.01em] text-neutral-900'}>Your order has shipped</p>
          <span
            className={
              'mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-ui font-semibold text-white ring-2 ring-neutral-900/15 ring-offset-2'
            }
          >
            Track package
          </span>
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-right'} className={'min-h-56'}>
        <UICard className={'px-5 py-4'}>
          <code className={'block whitespace-nowrap font-code text-ui text-neutral-700'}>
            <span className={'text-neutral-400'}>&lt;a class=&quot;button&quot;&gt;</span>
            Track package
            <span className={'text-neutral-400'}>&lt;/a&gt;</span>
          </code>
        </UICard>
      </SnippetTile>

      <SnippetTile align={'bleed-bottom'} className={'min-h-56'}>
        <UICard className={'p-4'}>
          <div className={'flex items-center gap-2 text-label text-neutral-500'}>
            <Eye className={'h-3.5 w-3.5'} strokeWidth={1.75} aria-hidden />
            Previewing as
          </div>
          <div className={'mt-2 flex items-center gap-2.5'}>
            <Avatar name={'Ana Ruiz'} />
            <span className={'text-ui font-semibold text-neutral-900'}>Ana Ruiz</span>
          </div>
          <p className={'mt-4 border-t border-neutral-100 pt-4 text-ui text-neutral-700'}>
            Hi Ana, your order has shipped.
          </p>
        </UICard>
      </SnippetTile>
    </SnippetMosaic>
  );
}

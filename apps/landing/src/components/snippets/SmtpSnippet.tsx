import {Server} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * The four settings an existing client needs, and nothing else: the page's
 * claim is that switching is a credentials change, not a rewrite. SMTP is a
 * developer page, so the values stay in mono; the labels do not.
 */
const settings = [
  {label: 'Host', value: 'smtp.useplunk.com'},
  {label: 'Port', value: '587'},
  {label: 'Username', value: 'plunk'},
  {label: 'Password', value: 'Your secret key'},
];

export function SmtpSnippet() {
  return (
    <SnippetTile className={'min-h-[26rem] sm:px-12'}>
      <UICard className={'w-full max-w-sm'}>
        <div className={'p-4'}>
          <SnippetRow
            icon={Server}
            label={'SMTP'}
            title={'Plunk'}
            trailing={<StatusPill tone={'ok'}>Connected</StatusPill>}
          />
        </div>
        <dl className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
          {settings.map(setting => (
            <div key={setting.label} className={'flex items-baseline justify-between gap-4 px-4 py-3'}>
              <dt className={'text-ui text-neutral-500'}>{setting.label}</dt>
              <dd
                className={
                  setting.label === 'Password'
                    ? 'text-ui text-neutral-500'
                    : 'truncate font-code text-ui text-neutral-900'
                }
              >
                {setting.value}
              </dd>
            </div>
          ))}
        </dl>
      </UICard>
    </SnippetTile>
  );
}

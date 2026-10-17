import {Cloud, Globe, MailX} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, TimeAgo, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * Amazon SES as Plunk shows it: the account connected, the events SES sends
 * back turned into contact state, and the domains SES verified. The page
 * sells a dashboard for SES, so every fragment is a screen SES itself lacks.
 */

/** The SES page's hero: the connected account, and the sends it delivered. */
export function SesSnippet() {
  const sends = [
    {title: 'Reset your password', to: 'ana@acme.com', state: 'Delivered', tone: 'ok' as const, when: 'now'},
    {title: 'Your receipt', to: 'tom@northwind.io', state: 'Opened', tone: 'neutral' as const, when: '2m'},
    {title: 'September product update', to: 'old@contoso.com', state: 'Bounced', tone: 'err' as const, when: '5m'},
  ];

  return (
    <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
      <div className={'flex flex-col gap-3'}>
        <UICard className={'w-full max-w-md p-4'}>
          <SnippetRow
            icon={Cloud}
            label={'Amazon SES'}
            title={'eu-west-1'}
            trailing={<StatusPill tone={'ok'}>Connected</StatusPill>}
          />
        </UICard>
        <UICard className={'ml-10 w-full max-w-md divide-y divide-neutral-100'}>
          {sends.map(send => (
            <div key={send.title} className={'flex items-center gap-3 px-4 py-3'}>
              <div className={'min-w-0 flex-1'}>
                <p className={'truncate text-ui font-semibold text-neutral-900'}>{send.title}</p>
                <p className={'truncate text-label text-neutral-500'}>To {send.to}</p>
              </div>
              <StatusPill tone={send.tone}>{send.state}</StatusPill>
              <TimeAgo>{send.when}</TimeAgo>
            </div>
          ))}
        </UICard>
      </div>
    </SnippetTile>
  );
}

/** A bounce notification from SES, already acted on. */
export function SesBounceFragment() {
  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow
          icon={MailX}
          label={'Hard bounce from SES'}
          title={'old@contoso.com'}
          trailing={<TimeAgo>now</TimeAgo>}
        />
      </div>
      <div className={'flex items-center justify-between gap-4 border-t border-neutral-100 px-4 py-3'}>
        <span className={'text-ui text-neutral-700'}>Contact</span>
        <StatusPill>Unsubscribed</StatusPill>
      </div>
    </UICard>
  );
}

/** A domain SES verified, with the records Plunk set up for it. */
export function SesDomainFragment() {
  const records = ['DKIM', 'Custom MAIL FROM'];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={Globe} label={'Domain'} title={'acme.com'} />
      </div>
      <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {records.map(record => (
          <li key={record} className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
            <span className={'text-ui text-neutral-700'}>{record}</span>
            <StatusPill tone={'ok'}>Verified</StatusPill>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

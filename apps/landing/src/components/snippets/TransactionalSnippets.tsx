import {Code2, FileText} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, TimeAgo, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * Transactional email as the dashboard and request log show it: the request
 * that went in, what happened to the message, and the events that came back.
 * Shared by the transactional feature page and the email API guide.
 */

/** The send request as a request log shows it. */
export function RequestCard({className = ''}: {className?: string}) {
  const fields = [
    {label: 'To', value: 'ana@acme.com'},
    {label: 'From', value: 'Acme <hello@acme.com>'},
    {label: 'Subject', value: 'Reset your password'},
  ];

  return (
    <UICard className={`p-4 ${className}`}>
      <div className={'flex items-center justify-between gap-3'}>
        <div className={'flex min-w-0 items-center gap-2'}>
          <span className={'rounded-md bg-neutral-100 px-1.5 py-0.5 text-label font-semibold text-neutral-700'}>POST</span>
          <span className={'truncate font-code text-ui text-neutral-900'}>/v1/send</span>
        </div>
        <StatusPill tone={'ok'}>200 OK</StatusPill>
      </div>
      <dl className={'mt-4 flex flex-col gap-2.5 border-t border-neutral-100 pt-4'}>
        {fields.map(f => (
          <div key={f.label} className={'flex items-center justify-between gap-4'}>
            <dt className={'text-ui text-neutral-500'}>{f.label}</dt>
            <dd className={'truncate text-ui font-medium text-neutral-900'}>{f.value}</dd>
          </div>
        ))}
      </dl>
    </UICard>
  );
}

/** What happened to that message, newest at the bottom. */
export function DeliveryTimeline({className = ''}: {className?: string}) {
  const steps: {label: string; tone: 'neutral' | 'ok'; time: string}[] = [
    {label: 'Sent', tone: 'neutral', time: '09:41:02'},
    {label: 'Delivered', tone: 'ok', time: '09:41:03'},
    {label: 'Opened', tone: 'neutral', time: '09:42:18'},
  ];

  return (
    <UICard className={`p-4 ${className}`}>
      <p className={'text-ui font-semibold text-neutral-900'}>Reset your password</p>
      <p className={'mt-0.5 text-label text-neutral-500'}>To ana@acme.com</p>
      <ol className={'mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4'}>
        {steps.map(s => (
          <li key={s.label} className={'flex items-center justify-between gap-3'}>
            <StatusPill tone={s.tone}>{s.label}</StatusPill>
            <TimeAgo>{s.time}</TimeAgo>
          </li>
        ))}
      </ol>
    </UICard>
  );
}

/** Events as they arrive on a webhook endpoint. */
export function EventList({className = 'w-full max-w-md', limit}: {className?: string; limit?: number}) {
  const events: {event: string; tone: 'neutral' | 'ok' | 'warn' | 'err'; recipient: string; time: string}[] = [
    {event: 'Delivered', tone: 'ok', recipient: 'ana@acme.com', time: 'now'},
    {event: 'Clicked', tone: 'neutral', recipient: 'tom@northwind.io', time: '1m'},
    {event: 'Opened', tone: 'neutral', recipient: 'tom@northwind.io', time: '2m'},
    {event: 'Bounced', tone: 'err', recipient: 'old@contoso.com', time: '4m'},
    {event: 'Complained', tone: 'warn', recipient: 'mia@fabrikam.com', time: '9m'},
  ];

  return (
    <UICard className={`divide-y divide-neutral-100 ${className}`}>
      {events.slice(0, limit).map(e => (
        <div key={`${e.event}-${e.recipient}`} className={'flex items-center gap-3 px-4 py-3'}>
          <div className={'min-w-0 flex-1'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{e.recipient}</p>
            <p className={'truncate text-label text-neutral-500'}>Welcome to Acme</p>
          </div>
          <StatusPill tone={e.tone}>{e.event}</StatusPill>
          <TimeAgo>{e.time}</TimeAgo>
        </div>
      ))}
    </UICard>
  );
}

/** The transactional page's hero: a send, and that message's delivery. */
export function TransactionalSnippet() {
  return (
    <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
      <div className={'flex flex-col gap-3'}>
        <RequestCard className={'w-full max-w-md'} />
        <DeliveryTimeline className={'ml-10 w-full max-w-xs'} />
      </div>
    </SnippetTile>
  );
}

/** A dashboard template sent from code by its ID, with the data that fills it. */
export function TemplateSendFragment() {
  const data = [
    {label: 'Name', value: 'Ana'},
    {label: 'Order', value: '#3980'},
    {label: 'Total', value: '€48.00'},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={FileText} label={'Template'} title={'Order confirmation'} />
      </div>
      <dl className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {data.map(d => (
          <div key={d.label} className={'flex items-baseline justify-between gap-4 px-4 py-2.5'}>
            <dt className={'text-ui text-neutral-500'}>{d.label}</dt>
            <dd className={'text-ui font-medium text-neutral-900'}>{d.value}</dd>
          </div>
        ))}
      </dl>
    </UICard>
  );
}

/** A retried request answered from the first one instead of sending twice. */
export function IdempotencyFragment() {
  const attempts = [
    {label: 'First attempt', result: 'Sent', tone: 'ok' as const},
    {label: 'Retry after timeout', result: 'Not sent again', tone: 'neutral' as const},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={Code2} label={'Idempotency key'} title={'receipt-order-3980'} />
      </div>
      <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {attempts.map(a => (
          <li key={a.label} className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
            <span className={'text-ui text-neutral-700'}>{a.label}</span>
            <StatusPill tone={a.tone}>{a.result}</StatusPill>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

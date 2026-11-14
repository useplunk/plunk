import {CalendarClock, CalendarX, Timer} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, TimeAgo, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * Throttled and scheduled transactional email (`delivery` on POST /v1/send), as the
 * request log, the API response and the dashboard's Activity feed show it. Shared by the
 * scheduling and throttling page, the transactional email page and the changelog.
 */

/** One recipient's sends of one throttled notification, as the request log lists them. */
export function ThrottleFragment({className = 'w-full max-w-xs'}: {className?: string}) {
  const attempts: {time: string; result: string; tone: 'ok' | 'neutral'}[] = [
    {time: 'Mon 09:12', result: 'Sent', tone: 'ok'},
    {time: 'Mon 09:40', result: 'Throttled', tone: 'neutral'},
    {time: 'Mon 16:05', result: 'Throttled', tone: 'neutral'},
    {time: 'Tue 09:15', result: 'Sent', tone: 'ok'},
  ];

  return (
    <UICard className={className}>
      <div className={'p-4'}>
        <SnippetRow icon={Timer} label={'Throttle, 24h'} title={'Usage warning to ana@acme.com'} />
      </div>
      <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {attempts.map(a => (
          <li key={a.time} className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
            <span className={'text-ui text-neutral-700'}>{a.time}</span>
            <StatusPill tone={a.tone}>{a.result}</StatusPill>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

/** A scheduled email as the Activity feed's Scheduled section shows it, cancel included. */
export function ScheduleFragment({className = 'w-full max-w-sm'}: {className?: string}) {
  return (
    <UICard className={className}>
      <div className={'p-4'}>
        <SnippetRow
          icon={CalendarClock}
          label={'Sends Mon 1 Nov at 09:00'}
          title={'Your trial ends in 3 days'}
          trailing={<StatusPill>Scheduled</StatusPill>}
        />
      </div>
      <div className={'flex items-center justify-between gap-4 border-t border-neutral-100 px-4 py-3'}>
        <span className={'truncate text-ui text-neutral-600'}>ana@acme.com</span>
        <span
          className={
            'inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-label font-medium text-neutral-800'
          }
        >
          <CalendarX aria-hidden className={'h-3 w-3'} />
          Cancel send
        </span>
      </div>
    </UICard>
  );
}

/** What the send call returns for a throttled recipient: a normal 200 that says so. */
export function ThrottledResponseFragment({className = 'w-full max-w-xs'}: {className?: string}) {
  const lines: {key: string; value: string; muted?: boolean}[] = [
    {key: 'status', value: '"throttled"'},
    {key: 'email', value: 'null', muted: true},
    {key: 'nextAllowedAt', value: '"Tue 09:12"'},
  ];

  return (
    <UICard className={`p-4 ${className}`}>
      <div className={'flex items-center justify-between gap-3'}>
        <span className={'truncate font-code text-ui text-neutral-900'}>/v1/send</span>
        <StatusPill tone={'ok'}>200 OK</StatusPill>
      </div>
      <dl className={'mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-4 font-code text-ui'}>
        {lines.map(l => (
          <div key={l.key} className={'flex items-baseline justify-between gap-4'}>
            <dt className={'text-neutral-500'}>{l.key}</dt>
            <dd className={l.muted ? 'text-neutral-400' : 'text-neutral-900'}>{l.value}</dd>
          </div>
        ))}
      </dl>
    </UICard>
  );
}

/** A scheduled email moved to another time before it went out. */
export function RescheduleFragment({className = 'w-full max-w-xs'}: {className?: string}) {
  return (
    <UICard className={className}>
      <div className={'p-4'}>
        <SnippetRow icon={CalendarClock} label={'Scheduled email'} title={'Your order ships tomorrow'} />
      </div>
      <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        <li className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
          <span className={'text-ui text-neutral-400 line-through'}>Mon 09:00</span>
          <TimeAgo>Moved</TimeAgo>
        </li>
        <li className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
          <span className={'text-ui font-medium text-neutral-900'}>Tue 09:00</span>
          <StatusPill>Scheduled</StatusPill>
        </li>
      </ul>
    </UICard>
  );
}

/** The send request with its `delivery` options, as a request log shows it. */
function DeliveryRequestCard({className = ''}: {className?: string}) {
  const fields = [
    {label: 'To', value: 'ana@acme.com'},
    {label: 'Template', value: 'Usage warning'},
    {label: 'Throttle', value: '24h, per organisation'},
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

/** A day of calls for one notification, and the single email they produced. */
function DayOfCalls({className = ''}: {className?: string}) {
  return (
    <UICard className={className}>
      <div className={'flex items-baseline justify-between gap-4 p-4'}>
        <p className={'text-ui font-semibold text-neutral-900'}>Today</p>
        <p className={'text-label text-neutral-500'}>148 calls, 1 email</p>
      </div>
      <ol className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        <li className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
          <span className={'text-ui text-neutral-700'}>09:12</span>
          <StatusPill tone={'ok'}>Sent</StatusPill>
        </li>
        <li className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
          <span className={'text-ui text-neutral-700'}>09:13 to 23:58</span>
          <StatusPill>147 throttled</StatusPill>
        </li>
        <li className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
          <span className={'text-ui text-neutral-500'}>Tomorrow 09:12</span>
          <TimeAgo>Next allowed</TimeAgo>
        </li>
      </ol>
    </UICard>
  );
}

/** The scheduling and throttling page's hero: the same call all day, one email. */
export function DeliverySnippet() {
  return (
    <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
      <div className={'flex flex-col gap-3'}>
        <DeliveryRequestCard className={'w-full max-w-md'} />
        <DayOfCalls className={'ml-10 w-full max-w-xs'} />
      </div>
    </SnippetTile>
  );
}

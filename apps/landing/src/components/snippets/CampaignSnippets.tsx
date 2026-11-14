import {CalendarClock, Megaphone, Send, Users} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * Campaigns as the campaign page in the dashboard draws them: who it goes
 * to, when, and how it did. Real states, made-up but plausible numbers.
 */

/** The campaigns page's hero: a scheduled campaign, and last month's results below it. */
export function CampaignSnippet() {
  const stats = [
    {label: 'Delivered', value: '12,402'},
    {label: 'Opened', value: '46%'},
    {label: 'Clicked', value: '8.1%'},
  ];

  return (
    <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
      <div className={'flex flex-col gap-3'}>
        <UICard className={'w-full max-w-md p-4'}>
          <SnippetRow
            icon={Megaphone}
            label={'Campaign'}
            title={'September product update'}
            trailing={<StatusPill>Scheduled</StatusPill>}
          />
          <dl className={'mt-4 flex flex-col gap-2.5 border-t border-neutral-100 pt-4'}>
            <div className={'flex items-center justify-between gap-4'}>
              <dt className={'text-ui text-neutral-500'}>Audience</dt>
              <dd className={'truncate text-ui font-medium text-neutral-900'}>Active customers</dd>
            </div>
            <div className={'flex items-center justify-between gap-4'}>
              <dt className={'text-ui text-neutral-500'}>Recipients</dt>
              <dd className={'text-ui font-medium text-neutral-900 tabular-nums'}>8,214</dd>
            </div>
            <div className={'flex items-center justify-between gap-4'}>
              <dt className={'text-ui text-neutral-500'}>Sends</dt>
              <dd className={'text-ui font-medium text-neutral-900'}>Tue 1 Oct, 09:00</dd>
            </div>
          </dl>
        </UICard>
        <UICard className={'ml-10 w-full max-w-xs p-4'}>
          <SnippetRow
            icon={Megaphone}
            label={'Campaign'}
            title={'August product update'}
            trailing={<StatusPill tone={'ok'}>Sent</StatusPill>}
          />
          <dl className={'mt-4 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4'}>
            {stats.map(stat => (
              <div key={stat.label}>
                <dt className={'text-label text-neutral-500'}>{stat.label}</dt>
                <dd className={'mt-0.5 text-ui font-semibold text-neutral-900 tabular-nums'}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </UICard>
      </div>
    </SnippetTile>
  );
}

/** The three ways to pick who a campaign goes to, with a segment chosen. */
export function CampaignAudienceFragment() {
  const options = [
    {name: 'All subscribed contacts', detail: '48,210', selected: false},
    {name: 'Segment: Trial ending', detail: '1,306', selected: true},
    {name: 'Custom filter', detail: 'For this send only', selected: false},
  ];

  return (
    <UICard className={'w-full max-w-xs p-2'}>
      {options.map(option => (
        <div
          key={option.name}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${option.selected ? 'bg-neutral-100' : ''}`}
        >
          <span
            aria-hidden
            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
              option.selected ? 'border-neutral-900' : 'border-neutral-300'
            }`}
          >
            {option.selected && <span className={'h-2 w-2 rounded-full bg-neutral-900'} />}
          </span>
          <div className={'min-w-0 flex-1'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{option.name}</p>
            <p className={'truncate text-label text-neutral-500'}>{option.detail}</p>
          </div>
        </div>
      ))}
    </UICard>
  );
}

/** Before it goes out: a test in your own inbox, then a time. */
export function CampaignScheduleFragment() {
  const steps = [
    {icon: Send, label: 'Test sent', title: 'you@acme.com', state: <StatusPill tone={'ok'}>Delivered</StatusPill>},
    {icon: CalendarClock, label: 'Scheduled', title: 'Tue 1 Oct, 09:00', state: <StatusPill>Can cancel</StatusPill>},
  ];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {steps.map(step => (
        <div key={step.label} className={'p-4'}>
          <SnippetRow icon={step.icon} label={step.label} title={step.title} trailing={step.state} />
        </div>
      ))}
    </UICard>
  );
}

/** The recipients a campaign cost you, each counted once. */
export function CampaignLossFragment() {
  const rows: {label: string; value: string; tone: 'neutral' | 'warn' | 'err'}[] = [
    {label: 'Unsubscribed', value: '21', tone: 'neutral'},
    {label: 'Bounced', value: '9', tone: 'err'},
    {label: 'Complained', value: '2', tone: 'warn'},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={Users} label={'August product update'} title={'Recipients lost'} />
      </div>
      <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {rows.map(row => (
          <li key={row.label} className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
            <StatusPill tone={row.tone}>{row.label}</StatusPill>
            <span className={'text-ui font-semibold text-neutral-900 tabular-nums'}>{row.value}</span>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

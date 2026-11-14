import {Megaphone} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, UICard} from '../snippets';

/**
 * Snippet fragments more than one guide needs. Page-specific fragments live in
 * the guide's own file.
 *
 * Guides are about DNS records and headers, so unlike the rest of the site a
 * record value may be set in mono here: it is the literal thing the reader
 * will copy. Labels, states and everything around the value stay in the UI
 * sans.
 */

type Tone = 'neutral' | 'ok' | 'warn' | 'err';

/** One DNS record, the way the dashboard lists a domain's records. */
export function DnsRecordFragment({
  type,
  name,
  value,
  status,
  className = 'w-full max-w-md',
}: {
  type: string;
  name: string;
  value: string;
  status?: {tone: Tone; label: string};
  className?: string;
}) {
  return (
    <UICard className={`p-4 ${className}`}>
      <div className={'flex items-center justify-between gap-3'}>
        <div className={'flex min-w-0 items-center gap-2'}>
          <span className={'rounded-md bg-neutral-100 px-1.5 py-0.5 text-label font-semibold text-neutral-700'}>
            {type}
          </span>
          <span className={'truncate text-ui font-semibold text-neutral-900'}>{name}</span>
        </div>
        {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
      </div>
      <p className={'mt-3 break-all rounded-lg bg-neutral-50 px-3 py-2.5 font-code text-label leading-relaxed text-neutral-800'}>
        {value}
      </p>
    </UICard>
  );
}

/**
 * The authentication summary a mail client shows under "Show details": who it
 * is from, and a pass or fail per check.
 */
export function AuthResultsFragment({
  from,
  subject,
  results,
  className = 'w-full max-w-sm',
}: {
  from: string;
  subject: string;
  results: {label: string; value: string; tone: Tone}[];
  className?: string;
}) {
  return (
    <UICard className={`p-4 ${className}`}>
      <p className={'truncate text-ui font-semibold text-neutral-900'}>{subject}</p>
      <p className={'mt-0.5 truncate text-label text-neutral-500'}>From {from}</p>
      <dl className={'mt-4 flex flex-col gap-2.5 border-t border-neutral-100 pt-4'}>
        {results.map(r => (
          <div key={r.label} className={'flex items-center justify-between gap-3'}>
            <dt className={'text-ui text-neutral-600'}>{r.label}</dt>
            <dd>
              <StatusPill tone={r.tone}>{r.value}</StatusPill>
            </dd>
          </div>
        ))}
      </dl>
    </UICard>
  );
}

/**
 * A rate and where it sits: the number, a bar, and a marker for the line that
 * matters (a benchmark, a limit). `fill` and `marker` are percentages of the
 * bar's width.
 */
export function RateFragment({
  label,
  value,
  fill,
  marker,
  note,
  tone = 'neutral',
  className = 'w-full max-w-xs',
}: {
  label: string;
  value: string;
  fill: number;
  marker?: {at: number; label: string};
  note?: string;
  tone?: Tone;
  className?: string;
}) {
  const bar = {neutral: 'bg-neutral-900', ok: 'bg-ok', warn: 'bg-warn', err: 'bg-err'}[tone];

  return (
    <UICard className={`p-4 ${className}`}>
      <p className={'text-ui text-neutral-600'}>{label}</p>
      <p className={'mt-1 font-display text-[2rem] font-bold leading-none tracking-[-0.02em] text-neutral-900 tabular-nums'}>
        {value}
      </p>
      <div className={'relative mt-4 h-1.5 rounded-full bg-neutral-100'}>
        <div className={`h-full rounded-full ${bar}`} style={{width: `${fill}%`}} />
        {marker && (
          <span aria-hidden className={'absolute -top-1 h-3.5 w-px bg-neutral-500'} style={{left: `${marker.at}%`}} />
        )}
      </div>
      {(marker || note) && (
        <p className={'mt-2.5 text-label text-neutral-500'}>
          {marker?.label}
          {marker && note && ' · '}
          {note}
        </p>
      )}
    </UICard>
  );
}

/** A few rows of an inbox: sender, subject, time. Bold rows are unread. */
export function InboxFragment({
  rows,
  className = 'w-full max-w-md',
}: {
  rows: {sender: string; subject: string; time: string; unread?: boolean; tag?: {tone: Tone; label: string}}[];
  className?: string;
}) {
  return (
    <UICard className={`divide-y divide-neutral-100 ${className}`}>
      {rows.map(row => (
        <div key={`${row.sender}-${row.subject}`} className={'flex items-center gap-3 px-4 py-3'}>
          <span
            aria-hidden
            className={`h-2 w-2 flex-shrink-0 rounded-full ${row.unread ? 'bg-neutral-900' : 'bg-transparent'}`}
          />
          <div className={'min-w-0 flex-1'}>
            <p className={`truncate text-ui ${row.unread ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>
              {row.sender}
            </p>
            <p className={`truncate text-label ${row.unread ? 'text-neutral-700' : 'text-neutral-500'}`}>{row.subject}</p>
          </div>
          {row.tag ? <StatusPill tone={row.tag.tone}>{row.tag.label}</StatusPill> : null}
          <span className={'flex-shrink-0 text-label text-neutral-500'}>{row.time}</span>
        </div>
      ))}
    </UICard>
  );
}

/** A sent campaign's summary, the way the campaign list shows one. */
export function CampaignStatsFragment({highlight, className}: {highlight: 'Opened' | 'Clicked'; className?: string}) {
  const stats = [
    {label: 'Delivered', value: '12,480'},
    {label: 'Opened', value: '5,741'},
    {label: 'Clicked', value: '524'},
  ];

  return (
    <UICard className={`p-4 ${className}`}>
      <SnippetRow
        icon={Megaphone}
        label={'Campaign · sent Tuesday 10:00'}
        title={'October product update'}
        trailing={<StatusPill tone={'ok'}>Sent</StatusPill>}
      />
      <dl className={'mt-4 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4'}>
        {stats.map(stat => (
          <div key={stat.label}>
            <dt className={'text-label text-neutral-500'}>{stat.label}</dt>
            <dd
              className={`mt-0.5 text-ui font-semibold tabular-nums ${
                stat.label === highlight ? 'text-neutral-900' : 'text-neutral-500'
              }`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </UICard>
  );
}

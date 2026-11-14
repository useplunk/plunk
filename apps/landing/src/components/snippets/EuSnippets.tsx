import {Database, Eye} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * Where data lives and what is kept, drawn as settings rather than as a map
 * with pins: the claims on the EU page are about what the project stores and
 * how you control it. Every value here matches the DPA and privacy policy.
 */

/** The EU page's hero: what is stored where, the way a data-residency panel lists it. */
export function EuDataSnippet() {
  const stored = ['Contacts and custom fields', 'Templates and campaigns', 'Email history and events'];

  return (
    <SnippetTile className={'min-h-[26rem] sm:px-12'}>
      <UICard className={'w-full max-w-sm'}>
        <div className={'p-4'}>
          <SnippetRow
            icon={Database}
            label={'Data location'}
            title={'Germany, EU'}
            trailing={<StatusPill tone={'ok'}>EU only</StatusPill>}
          />
        </div>
        <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
          {stored.map(item => (
            <li key={item} className={'flex items-center justify-between gap-4 px-4 py-3'}>
              <span className={'text-ui text-neutral-700'}>{item}</span>
              <span className={'text-label text-neutral-500'}>Stored in EU</span>
            </li>
          ))}
        </ul>
      </UICard>
    </SnippetTile>
  );
}

/** The project's tracking setting, with transactional mail left untracked. */
export function TrackingModeFragment() {
  const options = [
    {name: 'Track all email', selected: false},
    {name: 'Marketing only', selected: true},
    {name: 'No tracking', selected: false},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={Eye} label={'Project setting'} title={'Open and click tracking'} />
      </div>
      <div className={'border-t border-neutral-100 p-2'}>
        {options.map(option => (
          <div
            key={option.name}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${option.selected ? 'bg-neutral-100' : ''}`}
          >
            <span
              aria-hidden
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                option.selected ? 'border-neutral-900' : 'border-neutral-300'
              }`}
            >
              {option.selected && <span className={'h-2 w-2 rounded-full bg-neutral-900'} />}
            </span>
            <span className={`text-ui ${option.selected ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>
              {option.name}
            </span>
          </div>
        ))}
      </div>
    </UICard>
  );
}

/** What is cleared on a schedule, so less personal data sits around. */
export function RetentionFragment() {
  const rows = [
    {label: 'Rendered email content', value: '90 days'},
    {label: 'API request logs', value: '30 days'},
    {label: 'Deleted data in backups', value: '30 days'},
  ];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {rows.map(row => (
        <div key={row.label} className={'flex items-center justify-between gap-4 px-4 py-3'}>
          <span className={'text-ui text-neutral-700'}>{row.label}</span>
          <StatusPill>{row.value}</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

/** The whole sub-processor list, short enough to show in full. */
export function SubprocessorFragment() {
  const processors = [
    {name: 'Hetzner', role: 'Hosting and storage', region: 'Germany'},
    {name: 'Amazon SES', role: 'Delivery, in transit', region: 'Global'},
    {name: 'Stripe', role: 'Payments', region: 'United States'},
  ];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {processors.map(p => (
        <div key={p.name} className={'flex items-center gap-3 px-4 py-3'}>
          <div className={'min-w-0 flex-1'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{p.name}</p>
            <p className={'truncate text-label text-neutral-500'}>{p.role}</p>
          </div>
          <span className={'flex-shrink-0 text-label text-neutral-500'}>{p.region}</span>
        </div>
      ))}
    </UICard>
  );
}

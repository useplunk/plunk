import {Cloud, GitBranch, Server} from 'lucide-react';
import React from 'react';

import {SnippetRow, StatusPill, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * The open-source page's graphics. They show the two places the same code
 * runs and what a self-hosted install is made of, taken from the Docker
 * docs (apps/wiki/content/docs/self-hosting/docker.mdx).
 */

/** The hero: one codebase, run by us in Germany or by you on your own server. */
export function OpenSourceSnippet() {
  return (
    <SnippetTile className={'min-h-[26rem] sm:px-12'}>
      <UICard className={'w-full max-w-sm'}>
        <div className={'p-4'}>
          <SnippetRow
            icon={GitBranch}
            label={'useplunk/plunk'}
            title={'One codebase'}
            trailing={<StatusPill>AGPL-3.0</StatusPill>}
          />
        </div>
        <div className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
          <div className={'p-4'}>
            <SnippetRow
              icon={Cloud}
              label={'Plunk Cloud'}
              title={'Managed, hosted in Germany'}
              trailing={<StatusPill tone={'ok'}>Live</StatusPill>}
            />
          </div>
          <div className={'p-4'}>
            <SnippetRow icon={Server} label={'Self-hosted'} title={'Your server, your SES account'} />
            <code className={'mt-3 block rounded-lg bg-neutral-900 px-3 py-2 font-mono text-label text-neutral-100'}>
              $ docker compose up -d
            </code>
          </div>
        </div>
      </UICard>
    </SnippetTile>
  );
}

/** The three products a list of open-source tools usually splits across separate projects. */
export function OneProductFragment() {
  const parts = ['Transactional email API', 'Campaigns and newsletters', 'Event-triggered workflows'];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {parts.map(part => (
        <div key={part} className={'flex items-center justify-between gap-4 px-4 py-3'}>
          <span className={'text-ui text-neutral-700'}>{part}</span>
          <StatusPill tone={'ok'}>Included</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

/** The repository, described by facts that do not drift. */
export function RepositoryFragment() {
  const rows = [
    {label: 'License', value: 'AGPL-3.0'},
    {label: 'Language', value: 'TypeScript'},
    {label: 'License fee', value: 'None'},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={GitBranch} label={'GitHub'} title={'useplunk/plunk'} />
      </div>
      <div className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {rows.map(row => (
          <div key={row.label} className={'flex items-center justify-between gap-4 px-4 py-3'}>
            <span className={'text-ui text-neutral-700'}>{row.label}</span>
            <span className={'text-label text-neutral-500'}>{row.value}</span>
          </div>
        ))}
      </div>
    </UICard>
  );
}

/** What docker compose starts, as listed in the self-hosting docs. */
export function ComposeStackFragment() {
  const services = [
    {name: 'plunk', role: 'API, dashboard, SMTP'},
    {name: 'postgres', role: 'PostgreSQL 16'},
    {name: 'redis', role: 'Redis 7 queue'},
    {name: 'minio', role: 'S3-compatible storage'},
  ];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {services.map(service => (
        <div key={service.name} className={'flex items-center justify-between gap-4 px-4 py-3'}>
          <span className={'font-mono text-ui text-neutral-900'}>{service.name}</span>
          <span className={'text-label text-neutral-500'}>{service.role}</span>
        </div>
      ))}
    </UICard>
  );
}

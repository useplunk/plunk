import {motion, useReducedMotion} from 'framer-motion';
import {ArrowUpRight, Check, Clock, Globe, Mail, Megaphone, Users, Zap} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {Avatar, SnippetRow, StatusPill, TimeAgo, UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

/**
 * Domain checks passing: the setup claim is "minutes, not days", and the
 * thing that takes days elsewhere is getting a domain to send.
 */
function SetupFragment() {
  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={Globe} label={'Domain'} title={'acme.com'} />
      </div>
      <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {['SPF', 'DKIM'].map(record => (
          <li key={record} className={'flex items-center justify-between gap-4 px-4 py-2.5'}>
            <span className={'text-ui text-neutral-700'}>{record}</span>
            <StatusPill tone={'ok'}>Verified</StatusPill>
          </li>
        ))}
      </ul>
      <p
        className={
          'flex items-center gap-2 border-t border-neutral-100 px-4 py-3 text-ui font-semibold text-neutral-900'
        }
      >
        <Check className={'h-4 w-4 text-ok'} strokeWidth={2.25} aria-hidden />
        Ready to send
      </p>
    </UICard>
  );
}

/**
 * A month's bill, where the contact line costs nothing. Other tools price on
 * list size, so this is the line a reader compares against what they pay now.
 */
function PricingFragment() {
  return (
    <UICard className={'w-full max-w-xs'}>
      <p className={'px-4 pt-4 text-label text-neutral-500'}>October usage</p>
      <dl className={'mt-2 divide-y divide-neutral-100'}>
        <div className={'flex items-baseline justify-between gap-4 px-4 py-2.5'}>
          <dt className={'text-ui text-neutral-700'}>48,210 contacts</dt>
          <dd className={'text-ui font-semibold text-ok'}>Free</dd>
        </div>
        <div className={'flex items-baseline justify-between gap-4 px-4 py-2.5'}>
          <dt className={'text-ui text-neutral-700'}>10,000 emails sent</dt>
          <dd className={'text-ui font-semibold text-neutral-900 tabular-nums'}>$10.00</dd>
        </div>
      </dl>
      <div className={'flex items-baseline justify-between gap-4 border-t border-neutral-100 px-4 py-3'}>
        <span className={'text-ui font-semibold text-neutral-900'}>Total</span>
        <span className={'font-display text-lead font-bold text-neutral-900 tabular-nums'}>$10.00</span>
      </div>
    </UICard>
  );
}

/**
 * Where it runs, as a choice you keep: the hosted cloud selected, with your
 * own servers one option below it. The cloud stays the default on purpose;
 * self-hosting is the exit, not the pitch.
 */
function OwnershipFragment() {
  const options = [
    {name: 'Plunk Cloud', detail: 'Hosted in the EU', selected: true},
    {name: 'Your own servers', detail: 'Same open-source code', selected: false},
  ];

  return (
    <UICard className={'w-full max-w-xs p-2'}>
      {options.map(option => (
        <div
          key={option.name}
          className={`flex items-center gap-3 rounded-lg px-3 py-3 ${option.selected ? 'bg-neutral-100' : ''}`}
        >
          <span
            aria-hidden
            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${option.selected ? 'border-neutral-900' : 'border-neutral-300'}`}
          >
            {option.selected && <span className={'h-2 w-2 rounded-full bg-neutral-900'} />}
          </span>
          <span className={'min-w-0'}>
            <span className={'block text-ui font-semibold text-neutral-900'}>{option.name}</span>
            <span className={'block text-label text-neutral-500'}>{option.detail}</span>
          </span>
        </div>
      ))}
    </UICard>
  );
}

/** A broadcast that went out, with how it did: marketing lives here too. */
export function CampaignsFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow
        icon={Megaphone}
        label={'Campaign'}
        title={'August product update'}
        trailing={<StatusPill tone={'ok'}>Sent</StatusPill>}
      />
      <dl className={'mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4'}>
        <div>
          <dt className={'text-label text-neutral-500'}>Recipients</dt>
          <dd className={'mt-0.5 text-ui font-semibold text-neutral-900 tabular-nums'}>12,480</dd>
        </div>
        <div>
          <dt className={'text-label text-neutral-500'}>Opened</dt>
          <dd className={'mt-0.5 text-ui font-semibold text-neutral-900 tabular-nums'}>46%</dd>
        </div>
      </dl>
    </UICard>
  );
}

/** Three steps of a sequence, top to bottom, as the builder lays them out. */
function WorkflowsFragment() {
  const steps = [
    {icon: Zap, label: 'Trigger', title: 'Contact signs up'},
    {icon: Mail, label: 'Send email', title: 'Welcome to Acme'},
    {icon: Clock, label: 'Delay', title: 'Wait 3 days'},
  ];

  return (
    <div className={'flex w-full max-w-xs flex-col items-center'}>
      {steps.map((step, i) => (
        <React.Fragment key={step.title}>
          {i > 0 && <span aria-hidden className={'h-5 w-px bg-neutral-300'} />}
          <UICard className={'w-full p-3'}>
            <SnippetRow icon={step.icon} label={step.label} title={step.title} />
          </UICard>
        </React.Fragment>
      ))}
    </div>
  );
}

/** A segment and its live count: an audience that keeps itself current. */
function SegmentsFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow icon={Users} label={'Segment'} title={'Pro customers'} />
      <p className={'mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-ui text-neutral-700'}>Plan is Pro</p>
      <div className={'mt-4 flex items-baseline justify-between gap-4 border-t border-neutral-100 pt-4'}>
        <span className={'font-display text-lead font-bold text-neutral-900 tabular-nums'}>2,455 contacts</span>
        <span className={'text-label text-neutral-500'}>Updated just now</span>
      </div>
    </UICard>
  );
}

/** One-off emails landing, the way the activity feed shows them. */
function TransactionalFragment() {
  const sends = [
    {title: 'Password reset', to: 'ana@acme.com', when: '2m'},
    {title: 'Receipt #3980', to: 'tom@acme.com', when: '9m'},
  ];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {sends.map(send => (
        <div key={send.title} className={'flex items-center gap-3 p-4'}>
          <div className={'min-w-0 flex-1'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{send.title}</p>
            <p className={'truncate text-label text-neutral-500'}>
              To {send.to} · {send.when} ago
            </p>
          </div>
          <StatusPill tone={'ok'}>Delivered</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

/** A reply arriving at your own domain and becoming a contact. */
export function InboundFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow
        leading={<Avatar name={'Ana Ruiz'} />}
        label={'To support@acme.com'}
        title={'Ana Ruiz'}
        trailing={<TimeAgo>now</TimeAgo>}
      />
      <p className={'mt-3 text-ui text-neutral-700'}>Thanks, that fixed it. One more question about invoices…</p>
    </UICard>
  );
}

/** Where the data lives, as the project's data-residency row shows it. */
function EuFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow
        icon={Globe}
        label={'Data location'}
        title={'Germany, EU'}
        trailing={<StatusPill tone={'ok'}>EU only</StatusPill>}
      />
      <p className={'mt-4 border-t border-neutral-100 pt-4 text-ui text-neutral-700'}>DPA included</p>
    </UICard>
  );
}

export type DifferenceKind =
  | 'eu'
  | 'setup'
  | 'pricing'
  | 'ownership'
  | 'campaigns'
  | 'workflows'
  | 'segments'
  | 'transactional'
  | 'inbound';

const fragments: Record<DifferenceKind, () => React.JSX.Element> = {
  eu: EuFragment,
  setup: SetupFragment,
  pricing: PricingFragment,
  ownership: OwnershipFragment,
  campaigns: CampaignsFragment,
  workflows: WorkflowsFragment,
  segments: SegmentsFragment,
  transactional: TransactionalFragment,
  inbound: InboundFragment,
};

export interface Difference {
  /** Which fragment shows the claim. */
  kind: DifferenceKind;
  title: string;
  copy: string;
}

const homepageDifferences: Difference[] = [
  {
    kind: 'setup',
    title: 'Sending in five minutes',
    copy: 'Add your domain, add three DNS records, send. No onboarding call, no warm-up project.',
  },
  {
    kind: 'pricing',
    title: 'Pay per email, never per contact',
    copy: 'Store as many contacts as you like for free. Your bill follows what you send, not how big your list is.',
  },
  {
    kind: 'ownership',
    title: 'No lock-in',
    copy: 'Plunk is open source under AGPL-3.0. Use our EU cloud, or run the same code on your own servers.',
  },
];

export interface Claim {
  title: string;
  copy: string;
  /** The fragment that shows the claim. */
  fragment: React.ReactNode;
  /** Makes the whole tile a link, for claims that have a page of their own. */
  href?: string;
}

/**
 * Claims as tiles: one fragment per claim, with the claim written under it.
 * A scanner gets the point from the picture and the title; the line under it
 * is for the people who stop.
 */
export function ClaimTiles({items, tileClassName = 'min-h-80'}: {items: Claim[]; tileClassName?: string}) {
  const still = useReducedMotion();

  return (
    <div className={'grid gap-10 md:grid-cols-3 md:gap-6'}>
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={still ? undefined : {opacity: 0, y: 10}}
          whileInView={still ? undefined : {opacity: 1, y: 0}}
          viewport={{once: true, margin: '-10%'}}
          transition={{duration: 0.5, delay: still ? 0 : i * 0.08, ease: [0.23, 1, 0.32, 1]}}
        >
          {item.href ? (
            <Link
              href={item.href}
              className={
                'group block rounded-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900'
              }
            >
              <SnippetTile className={`${tileClassName} transition-colors group-hover:bg-neutral-200/60`}>
                {item.fragment}
              </SnippetTile>
              <h3
                className={
                  'mt-6 flex items-center gap-1.5 font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'
                }
              >
                {item.title}
                <ArrowUpRight
                  aria-hidden
                  className={
                    'h-4 w-4 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
                  }
                />
              </h3>
              <p className={'mt-2 max-w-[42ch] leading-relaxed text-neutral-600'}>{item.copy}</p>
            </Link>
          ) : (
            <>
              <SnippetTile className={tileClassName}>{item.fragment}</SnippetTile>
              <h3 className={'mt-6 font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'}>
                {item.title}
              </h3>
              <p className={'mt-2 max-w-[42ch] leading-relaxed text-neutral-600'}>{item.copy}</p>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * The homepage and the comparison pages pick from a fixed set of fragments by
 * name, so a comparison page is plain data.
 */
export function DifferenceTiles({items}: {items: Difference[]}) {
  return (
    <ClaimTiles
      items={items.map(item => {
        const Fragment = fragments[item.kind];
        return {title: item.title, copy: item.copy, fragment: <Fragment />};
      })}
    />
  );
}

/** The homepage's three: how Plunk differs from email tools in general. */
export function DifferenceSnippets() {
  return <DifferenceTiles items={homepageDifferences} />;
}

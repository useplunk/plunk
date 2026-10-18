import {ArrowRight, Check, CornerDownLeft, Inbox, Search, Split, UserPlus} from 'lucide-react';
import React from 'react';

import type {ChangelogArtifact} from '../../content/changelog';
import {Avatar, SnippetRow, StatusPill, TimeAgo, UICard} from '../snippets/fragments';
import {SnippetTile} from '../snippets/SnippetTile';

/**
 * Pictures for the changelog's major entries.
 *
 * Each one is a single fragment of the feature on a tile, showing the claim
 * its entry makes: the snooze options, the approval an agent stops for, the
 * error the editor flags. They used to be miniature windows with mono header
 * strips and a reveal choreographed line by line; next to a paragraph in a
 * long list, one calm fragment reads faster. The timeline already fades each
 * entry in, so the pictures themselves do not move.
 */

function Tile({align = 'center', children}: {align?: 'center' | 'bleed-right' | 'bleed-bottom'; children: React.ReactNode}) {
  return (
    <SnippetTile align={align} className={'min-h-72'}>
      {children}
    </SnippetTile>
  );
}

/** A pill-shaped option, filled when chosen. */
function Option({on, children}: {on?: boolean; children: React.ReactNode}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-ui font-semibold ${
        on ? 'bg-neutral-900 text-white' : 'border border-neutral-200 text-neutral-700'
      }`}
    >
      {children}
    </span>
  );
}

function Checkbox({on}: {on: boolean}) {
  return (
    <span
      aria-hidden
      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border ${
        on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white'
      }`}
    >
      {on && <Check className={'h-3 w-3'} strokeWidth={3} />}
    </span>
  );
}

/* ------------------------------------------------------------------------- */

/** Pause for a set time, resubscribed automatically. */
function Snooze() {
  return (
    <Tile>
      <UICard className={'w-full max-w-sm p-5'}>
        <p className={'text-ui font-semibold text-neutral-900'}>Pause emails for</p>
        <div className={'mt-3 flex flex-wrap gap-2'}>
          <Option>2 weeks</Option>
          <Option on>1 month</Option>
          <Option>6 months</Option>
          <Option>1 year</Option>
        </div>
        <p className={'mt-4 border-t border-neutral-100 pt-4 text-ui text-neutral-500'}>
          Emails resume on October 11, 2026
        </p>
      </UICard>
    </Tile>
  );
}

/** One command to connect; sends still wait for you. */
function Mcp() {
  return (
    <Tile>
      <div className={'flex w-full max-w-sm flex-col gap-3'}>
        <UICard className={'px-4 py-3'}>
          <code className={'block truncate font-code text-[0.8125rem] text-neutral-700'}>
            claude mcp add plunk -- npx -y @plunk/mcp
          </code>
        </UICard>
        <UICard className={'p-5'}>
          <p className={'text-ui font-semibold text-neutral-900'}>Send this campaign to 2,431 people?</p>
          <div className={'mt-4 flex flex-wrap gap-2'}>
            <Option on>Send</Option>
            <Option>Keep as draft</Option>
          </div>
        </UICard>
      </div>
    </Tile>
  );
}

/** The editor catches a mistake as you type. */
function LiquidEditor() {
  return (
    <Tile>
      <UICard className={'w-full max-w-sm p-5'}>
        <code className={'block whitespace-nowrap font-code text-[0.8125rem] text-neutral-700'}>
          Hi {'{{ contact.firstName | '}
          <span className={'text-err underline decoration-wavy underline-offset-4'}>upcse</span>
          {' }}'}
        </code>
        <div className={'mt-4'}>
          <StatusPill tone={'err'}>Unknown filter “upcse”</StatusPill>
        </div>
      </UICard>
    </Tile>
  );
}

/** What a template turns into: the loop and the fallback, rendered. */
function Liquid() {
  const items = [
    {name: 'Linen shirt', qty: 2},
    {name: 'Canvas tote', qty: 1},
  ];

  return (
    <Tile align={'bleed-bottom'}>
      <UICard className={'mx-auto w-full max-w-sm p-5'}>
        <StatusPill>Rendered for Ana</StatusPill>
        <p className={'mt-4 font-display text-lead font-bold tracking-[-0.01em] text-neutral-900'}>
          Hi Ana, your order is on its way
        </p>
        <ul className={'mt-3 divide-y divide-neutral-100 pb-4'}>
          {items.map(item => (
            <li key={item.name} className={'flex justify-between py-2 text-ui text-neutral-700'}>
              {item.name}
              <span className={'text-neutral-500'}>× {item.qty}</span>
            </li>
          ))}
        </ul>
      </UICard>
    </Tile>
  );
}

/** Filter a table, select rows, act on them at once. */
function TableFilter() {
  const rows = [
    {name: 'August newsletter', on: true},
    {name: 'Win-back, Pro users', on: true},
    {name: 'Spring launch', on: false},
  ];

  return (
    <Tile align={'bleed-right'}>
      <UICard>
        <div className={'flex items-center gap-2 px-4 py-3'}>
          <Search className={'h-4 w-4 text-neutral-400'} strokeWidth={1.75} aria-hidden />
          <span className={'flex-1 text-ui text-neutral-400'}>Search campaigns</span>
          <StatusPill>Status: Sent</StatusPill>
        </div>
        <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
          {rows.map(row => (
            <li key={row.name} className={'flex items-center gap-3 px-4 py-2.5'}>
              <Checkbox on={row.on} />
              <span className={'text-ui text-neutral-800'}>{row.name}</span>
            </li>
          ))}
        </ul>
        <div className={'flex items-center gap-3 border-t border-neutral-100 px-4 py-2.5'}>
          <span className={'text-ui text-neutral-500'}>2 selected</span>
          <Option>Delete</Option>
        </div>
      </UICard>
    </Tile>
  );
}

/** A win-back audience in two rules. */
function SegmentFilter() {
  return (
    <Tile>
      <UICard className={'w-full max-w-sm'}>
        <ul className={'flex flex-col gap-2 p-4'}>
          {['In the segment Pro customers', 'No session in the last 30 days'].map(rule => (
            <li key={rule} className={'rounded-lg bg-neutral-50 px-3 py-2.5 text-ui text-neutral-800'}>
              {rule}
            </li>
          ))}
        </ul>
        <div className={'flex items-baseline justify-between border-t border-neutral-100 px-4 py-3'}>
          <span className={'text-ui text-neutral-500'}>Matching contacts</span>
          <span className={'text-ui font-semibold text-neutral-900 tabular-nums'}>1,284</span>
        </div>
      </UICard>
    </Tile>
  );
}

/** Jump anywhere from the keyboard. */
function CommandPalette() {
  const results = ['Switch to Loop Studio', 'Loop Studio (staging)', 'Campaign: Loop weekly'];

  return (
    <Tile>
      <UICard className={'w-full max-w-sm'}>
        <div className={'flex items-center gap-2.5 px-4 py-3'}>
          <Search className={'h-4 w-4 text-neutral-400'} strokeWidth={1.75} aria-hidden />
          <span className={'flex-1 text-ui text-neutral-900'}>loop</span>
          <kbd className={'rounded border border-neutral-200 px-1.5 text-label text-neutral-500'}>⌘K</kbd>
        </div>
        <ul className={'border-t border-neutral-100 p-2'}>
          {results.map((result, i) => (
            <li
              key={result}
              className={`flex items-center justify-between rounded-md px-2.5 py-2 text-ui ${
                i === 0 ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700'
              }`}
            >
              {result}
              {i === 0 && <CornerDownLeft className={'h-3.5 w-3.5 text-neutral-500'} strokeWidth={1.75} aria-hidden />}
            </li>
          ))}
        </ul>
      </UICard>
    </Tile>
  );
}

/** A short checklist, partly done. */
function Onboarding() {
  const steps = [
    {title: 'Verify your domain', done: true},
    {title: 'Send your first event', done: true},
    {title: 'Create a template', done: false},
    {title: 'Build a workflow', done: false},
  ];

  return (
    <Tile>
      <UICard className={'w-full max-w-sm p-4'}>
        <div className={'flex items-baseline justify-between px-1'}>
          <p className={'text-ui font-semibold text-neutral-900'}>Get started</p>
          <span className={'text-label text-neutral-500'}>2 of 4</span>
        </div>
        <ul className={'mt-3 flex flex-col gap-1'}>
          {steps.map(step => (
            <li key={step.title} className={'flex items-center gap-3 rounded-lg px-1 py-1.5'}>
              <span
                aria-hidden
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                  step.done ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'
                }`}
              >
                {step.done && <Check className={'h-3 w-3'} strokeWidth={3} />}
              </span>
              <span className={`text-ui ${step.done ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                {step.title}
              </span>
            </li>
          ))}
        </ul>
      </UICard>
    </Tile>
  );
}

/** One condition, as many paths as you need, and a default. */
function Branches() {
  const paths = [
    {answer: 'Pro', next: 'Send Pro tips'},
    {answer: 'Team', next: 'Invite your team'},
    {answer: 'Everyone else', next: 'Send welcome'},
  ];

  return (
    <Tile>
      <UICard className={'w-full max-w-sm p-4'}>
        <SnippetRow icon={Split} label={'Condition'} title={'Which plan are they on?'} />
        <div className={'mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-4'}>
          {paths.map(path => (
            <div key={path.answer} className={'flex items-center gap-2 text-ui text-neutral-700'}>
              <StatusPill>{path.answer}</StatusPill>
              <ArrowRight className={'h-3.5 w-3.5 text-neutral-400'} strokeWidth={1.75} aria-hidden />
              {path.next}
            </div>
          ))}
        </div>
      </UICard>
    </Tile>
  );
}

/** A message arrives, and its sender becomes a contact. */
function InboundEmail() {
  return (
    <Tile>
      <div className={'flex w-full max-w-sm flex-col gap-3'}>
        <UICard className={'p-4'}>
          <SnippetRow
            leading={<Avatar name={'Ana Ruiz'} />}
            title={'Ana Ruiz'}
            label={'To support@'}
            labelPosition={'below'}
            trailing={<TimeAgo>now</TimeAgo>}
          />
          <p className={'mt-3 border-t border-neutral-100 pt-3 text-ui text-neutral-700'}>Can you resend my invoice?</p>
        </UICard>
        <UICard className={'self-start py-3 pl-3 pr-5'}>
          <SnippetRow icon={UserPlus} label={'New contact'} title={'Ana Ruiz'} />
        </UICard>
      </div>
    </Tile>
  );
}

/** The logo sits in the email body, not in the attachments. */
function InlineImage() {
  return (
    <Tile align={'bleed-bottom'}>
      <UICard className={'mx-auto flex w-full max-w-xs flex-col items-center px-6 pb-10 pt-8 text-center'}>
        <span
          aria-hidden
          className={
            'flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 font-display text-lg font-extrabold text-white'
          }
        >
          L
        </span>
        <p className={'mt-4 font-display font-semibold tracking-[-0.01em] text-neutral-900'}>Thanks for your order</p>
        <p className={'mt-1 text-ui text-neutral-500'}>Receipt #4021 from Loop Studio</p>
      </UICard>
    </Tile>
  );
}

/** From an activity row to exactly what the contact received. */
function Preview() {
  return (
    <Tile align={'bleed-bottom'}>
      <div className={'mx-auto flex w-full max-w-sm flex-col gap-3'}>
        <UICard className={'flex items-center gap-3 px-4 py-3'}>
          <Inbox className={'h-4 w-4 text-neutral-500'} strokeWidth={1.75} aria-hidden />
          <span className={'min-w-0 flex-1 truncate text-ui font-semibold text-neutral-900'}>Welcome to Loop</span>
          <StatusPill tone={'ok'}>Delivered</StatusPill>
        </UICard>
        <UICard className={'ml-6 pb-6'}>
          <div className={'border-b border-neutral-100 px-4 py-3'}>
            <p className={'text-ui font-semibold text-neutral-900'}>Welcome to Loop</p>
            <p className={'text-label text-neutral-500'}>From hello@loopstudio.io</p>
          </div>
          <p className={'px-4 pt-3 text-ui text-neutral-600'}>
            Hi Ana, your workspace is ready. Here are three things to try first.
          </p>
        </UICard>
      </div>
    </Tile>
  );
}

/** The unsubscribe page, in the contact's language. */
function Locales() {
  return (
    <Tile>
      <UICard className={'w-full max-w-sm p-5'}>
        <StatusPill>Français</StatusPill>
        <p className={'mt-4 font-display text-lead font-bold tracking-[-0.01em] text-neutral-900'}>Se désabonner</p>
        <p className={'mt-1 text-ui text-neutral-600'}>Ne plus recevoir les e-mails de Loop Studio ?</p>
        <span className={'mt-4 inline-block'}>
          <Option on>Se désabonner</Option>
        </span>
      </UICard>
    </Tile>
  );
}

/** Your rates next to the thresholds, well within them. */
function Security() {
  const metrics = [
    {label: 'Bounce rate', value: '1.2%', limit: 'Warning at 5%', fill: 0.24},
    {label: 'Complaint rate', value: '0.02%', limit: 'Warning at 0.075%', fill: 0.27},
  ];

  return (
    <Tile>
      <UICard className={'w-full max-w-sm'}>
        <div className={'flex items-center justify-between px-4 py-3'}>
          <p className={'text-ui font-semibold text-neutral-900'}>Last 7 days</p>
          <StatusPill tone={'ok'}>Healthy</StatusPill>
        </div>
        <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
          {metrics.map(metric => (
            <li key={metric.label} className={'px-4 py-3'}>
              <div className={'flex items-baseline justify-between'}>
                <span className={'text-ui text-neutral-700'}>{metric.label}</span>
                <span className={'text-ui font-semibold text-neutral-900 tabular-nums'}>{metric.value}</span>
              </div>
              <div className={'mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100'}>
                <div className={'h-full rounded-full bg-ok'} style={{width: `${metric.fill * 100}%`}} />
              </div>
              <p className={'mt-1.5 text-label text-neutral-500'}>{metric.limit}</p>
            </li>
          ))}
        </ul>
      </UICard>
    </Tile>
  );
}

/** Rates for one stream, each against the period before. */
function Analytics() {
  const tabs = ['Overview', 'Deliverability', 'Engagement', 'Audience'];
  const metrics = [
    {label: 'Delivery rate', value: '99.1%', change: '+0.4 pts'},
    {label: 'Open rate', value: '42.8%', change: '+3.2 pts'},
    // Lower is better, so a fall is still good news.
    {label: 'Bounce rate', value: '0.6%', change: '−0.2 pts'},
  ];

  return (
    <Tile>
      <UICard className={'w-full max-w-sm'}>
        <div className={'flex gap-1 overflow-hidden px-3 pt-3'}>
          {tabs.map((tab, i) => (
            <span
              key={tab}
              className={`whitespace-nowrap rounded-md px-2 py-1 text-label font-medium ${
                i === 0 ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className={'flex items-center justify-between px-4 pb-3 pt-3'}>
          <p className={'text-ui font-semibold text-neutral-900'}>Last 30 days</p>
          <StatusPill>Campaigns</StatusPill>
        </div>
        <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
          {metrics.map(metric => (
            <li key={metric.label} className={'flex items-baseline justify-between gap-3 px-4 py-3'}>
              <span className={'flex-1 text-ui text-neutral-700'}>{metric.label}</span>
              <span className={'text-ui font-semibold text-neutral-900 tabular-nums'}>{metric.value}</span>
              <span className={'w-16 text-right text-label font-medium text-ok tabular-nums'}>{metric.change}</span>
            </li>
          ))}
        </ul>
      </UICard>
    </Tile>
  );
}

/* ------------------------------------------------------------------------- */

const ARTIFACTS: Record<ChangelogArtifact, React.ComponentType> = {
  snooze: Snooze,
  mcp: Mcp,
  liquidEditor: LiquidEditor,
  liquid: Liquid,
  tableFilter: TableFilter,
  segmentFilter: SegmentFilter,
  commandPalette: CommandPalette,
  onboarding: Onboarding,
  branches: Branches,
  inbound: InboundEmail,
  inlineImage: InlineImage,
  preview: Preview,
  locales: Locales,
  security: Security,
  analytics: Analytics,
};

export function ChangelogArtifactView({artifact}: {artifact: ChangelogArtifact}) {
  const Artifact = ARTIFACTS[artifact];
  return <Artifact />;
}

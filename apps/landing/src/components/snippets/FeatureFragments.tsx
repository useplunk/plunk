import {
  AlertCircle,
  Ban,
  Check,
  FileText,
  Lock,
  Mail,
  Megaphone,
  Paperclip,
  Play,
  Reply,
  ShieldCheck,
  Users,
  Webhook,
  Zap,
} from 'lucide-react';
import React from 'react';

import {Avatar, SnippetRow, StatusPill, TimeAgo, UICard} from './fragments';

/**
 * The claim fragments for the feature pages, one small piece of product per
 * claim. Each page's hero already shows the feature's main moments, so these
 * show what happens around them rather than repeating them.
 */

/* ---------- Email editor ---------- */

/** A field token mid-sentence, with the field picker open under it. */
export function EditorVariablesFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <p className={'text-ui text-neutral-900'}>
        Hi{' '}
        <span className={'rounded-md bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-900'}>First name</span>,
      </p>
      <ul className={'mt-3 rounded-lg border border-neutral-200 p-1 text-ui'}>
        {['First name', 'Company', 'Plan'].map((field, i) => (
          <li
            key={field}
            className={`rounded-md px-2.5 py-1.5 ${i === 0 ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-600'}`}
          >
            {field}
          </li>
        ))}
      </ul>
      <p className={'mt-3 text-label text-neutral-500'}>Falls back to “there” when it is empty</p>
    </UICard>
  );
}

/** The same email checked in the clients that usually break it. */
export function EditorClientsFragment() {
  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {['Gmail', 'Outlook', 'Apple Mail'].map(client => (
        <div key={client} className={'flex items-center justify-between gap-4 px-4 py-3'}>
          <span className={'text-ui font-semibold text-neutral-900'}>{client}</span>
          <StatusPill tone={'ok'}>Looks right</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

/** One template, and the three places it is in use. */
export function EditorReuseFragment() {
  const uses = [
    {icon: Zap, label: 'API', title: 'Order confirmation'},
    {icon: Play, label: 'Workflow', title: 'Onboarding, step 2'},
    {icon: Megaphone, label: 'Campaign', title: 'Black Friday'},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={FileText} label={'Template'} title={'Order shipped'} />
      </div>
      <div className={'border-t border-neutral-100 px-4 pb-4 pt-3'}>
        <p className={'text-label text-neutral-500'}>Used in</p>
        <ul className={'mt-2 flex flex-col gap-2'}>
          {uses.map(use => (
            <li key={use.label} className={'flex items-center gap-2 text-ui text-neutral-700'}>
              <use.icon aria-hidden strokeWidth={1.75} className={'h-3.5 w-3.5 text-neutral-500'} />
              <span className={'text-neutral-500'}>{use.label}</span>
              <span className={'truncate font-medium text-neutral-900'}>{use.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </UICard>
  );
}

/* ---------- Segments ---------- */

/** Joining a segment starting a workflow. */
export function SegmentTriggerFragment() {
  return (
    <div className={'flex w-full max-w-xs flex-col items-center'}>
      <UICard className={'w-full p-3'}>
        <SnippetRow
          leading={<Avatar name={'Tom Bakker'} />}
          label={'Joined “Pro, gone quiet”'}
          title={'Tom Bakker'}
          trailing={<TimeAgo>now</TimeAgo>}
        />
      </UICard>
      <span aria-hidden className={'h-5 w-px bg-neutral-300'} />
      <UICard className={'w-full p-3'}>
        <SnippetRow
          icon={Play}
          label={'Workflow started'}
          title={'Win-back'}
          trailing={<StatusPill tone={'ok'}>Running</StatusPill>}
        />
      </UICard>
    </div>
  );
}

/** The audience picker on a campaign, with a segment chosen. */
export function SegmentCampaignFragment() {
  const options = [
    {name: 'Pro customers', count: '2,455 contacts', selected: true},
    {name: 'Everyone', count: '12,480 contacts', selected: false},
  ];

  return (
    <UICard className={'w-full max-w-xs p-2'}>
      <p className={'px-3 pb-1 pt-2 text-label text-neutral-500'}>Send “August update” to</p>
      {options.map(option => (
        <div
          key={option.name}
          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${option.selected ? 'bg-neutral-100' : ''}`}
        >
          <span className={'min-w-0'}>
            <span className={'block text-ui font-semibold text-neutral-900'}>{option.name}</span>
            <span className={'block text-label text-neutral-500'}>{option.count}</span>
          </span>
          {option.selected && <Check aria-hidden strokeWidth={2.25} className={'h-4 w-4 text-neutral-900'} />}
        </div>
      ))}
    </UICard>
  );
}

/** A hand-picked list: people, not a rule. */
export function SegmentStaticFragment() {
  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow icon={Users} label={'Static list'} title={'Beta testers'} />
      </div>
      <ul className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {['Ana Ruiz', 'Priya Nair'].map(name => (
          <li key={name} className={'flex items-center gap-3 px-4 py-2.5'}>
            <Avatar name={name} />
            <span className={'text-ui font-semibold text-neutral-900'}>{name}</span>
          </li>
        ))}
      </ul>
      <p className={'border-t border-neutral-100 px-4 py-3 text-ui font-semibold text-neutral-900'}>+ Add contact</p>
    </UICard>
  );
}

/* ---------- Inbound email ---------- */

/** What lands on your endpoint, as fields rather than as JSON. */
export function InboundWebhookFragment() {
  const fields = [
    {label: 'From', value: 'Ana Ruiz'},
    {label: 'To', value: 'support@acme.com'},
    {label: 'Subject', value: 'Invoice question'},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <div className={'p-4'}>
        <SnippetRow
          icon={Webhook}
          label={'Webhook'}
          title={'Message forwarded'}
          trailing={<StatusPill tone={'ok'}>Delivered</StatusPill>}
        />
      </div>
      <dl className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {fields.map(field => (
          <div key={field.label} className={'flex items-baseline justify-between gap-4 px-4 py-2.5'}>
            <dt className={'text-ui text-neutral-500'}>{field.label}</dt>
            <dd className={'truncate text-ui font-medium text-neutral-900'}>{field.value}</dd>
          </div>
        ))}
      </dl>
      <p className={'flex items-center gap-2 border-t border-neutral-100 px-4 py-3 text-ui text-neutral-700'}>
        <Paperclip aria-hidden strokeWidth={1.75} className={'h-3.5 w-3.5 text-neutral-500'} />
        invoice-3980.pdf
      </p>
    </UICard>
  );
}

/** The checks every message passes before you see it. */
export function InboundChecksFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow icon={ShieldCheck} label={'Checks'} title={'Invoice question'} />
      <ul className={'mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4'}>
        {['Spam', 'Virus', 'SPF', 'DKIM', 'DMARC'].map(check => (
          <li key={check}>
            <StatusPill tone={'ok'}>{check}</StatusPill>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

/** The acknowledgement that goes back before anyone has read the message. */
export function InboundAutoReplyFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow
        icon={Reply}
        label={'Auto-reply to Ana Ruiz'}
        title={'We got your message'}
        trailing={<StatusPill tone={'ok'}>Sent</StatusPill>}
      />
      <p className={'mt-3 border-t border-neutral-100 pt-3 text-ui text-neutral-500'}>
        Thanks for writing in. We usually reply within a few hours.
      </p>
    </UICard>
  );
}

/* ---------- SMTP ---------- */

/** Things that already speak SMTP, all sending through Plunk. */
export function SmtpClientsFragment() {
  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {['Outlook', 'Apple Mail', 'Your app'].map(client => (
        <div key={client} className={'flex items-center justify-between gap-4 px-4 py-3'}>
          <span className={'text-ui font-semibold text-neutral-900'}>{client}</span>
          <StatusPill tone={'ok'}>Connected</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

/** An SMTP send in the activity feed, tracked like any other. */
export function SmtpTrackingFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow icon={Mail} label={'Sent over SMTP'} title={'Your October invoice'} />
      <div className={'mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4'}>
        <StatusPill tone={'ok'}>Delivered</StatusPill>
        <StatusPill tone={'ok'}>Opened</StatusPill>
        <StatusPill tone={'ok'}>Clicked</StatusPill>
      </div>
    </UICard>
  );
}

/** Both ports, both encrypted. A developer page, so the values stay in mono. */
export function SmtpEncryptionFragment() {
  const ports = [
    {port: '587', mode: 'STARTTLS'},
    {port: '465', mode: 'Implicit TLS'},
  ];

  return (
    <UICard className={'w-full max-w-xs divide-y divide-neutral-100'}>
      {ports.map(p => (
        <div key={p.port} className={'flex items-center gap-3 px-4 py-3'}>
          <Lock aria-hidden strokeWidth={1.75} className={'h-4 w-4 text-neutral-500'} />
          <span className={'min-w-0 flex-1'}>
            <span className={'block font-code text-ui text-neutral-900'}>Port {p.port}</span>
            <span className={'block text-label text-neutral-500'}>{p.mode}</span>
          </span>
          <StatusPill tone={'ok'}>Encrypted</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

/* ---------- MCP ---------- */

/** The confirmation your MCP client shows; only you can answer it. */
export function McpConfirmFragment() {
  return (
    <UICard className={'w-full max-w-xs p-5'}>
      <p className={'text-ui font-semibold text-neutral-900'}>Send “August update” to 2,431 contacts?</p>
      <p className={'mt-1 text-label text-neutral-500'}>Asked by your MCP client, not the model</p>
      <div className={'mt-4 flex gap-2'}>
        <span className={'rounded-full bg-neutral-900 px-4 py-1.5 text-ui font-semibold text-white'}>Send</span>
        <span className={'rounded-full border border-neutral-300 px-4 py-1.5 text-ui font-semibold text-neutral-900'}>
          Cancel
        </span>
      </div>
    </UICard>
  );
}

/** A workflow check that found a problem, and the switch it keeps off. */
export function McpCheckFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <SnippetRow
        icon={Play}
        label={'Workflow'}
        title={'Onboarding'}
        trailing={<StatusPill tone={'err'}>1 problem</StatusPill>}
      />
      <p className={'mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3 text-ui text-neutral-700'}>
        <AlertCircle aria-hidden strokeWidth={1.75} className={'h-4 w-4 flex-shrink-0 text-err'} />
        Step 3 has no template
      </p>
      <div className={'mt-3 flex items-center justify-between border-t border-neutral-100 pt-3'}>
        <span className={'text-ui text-neutral-400'}>Enable</span>
        <span aria-hidden className={'flex h-5 w-9 items-center rounded-full bg-neutral-200 p-0.5'}>
          <span className={'h-4 w-4 rounded-full bg-white shadow-fragment'} />
        </span>
      </div>
    </UICard>
  );
}

/** Test sends: your team gets through, anyone else is refused. */
export function McpTestFragment() {
  const recipients = [
    {email: 'you@acme.com', ok: true, note: 'On your team'},
    {email: 'someone@gmail.com', ok: false, note: 'Not on your team'},
  ];

  return (
    <UICard className={'w-full max-w-xs'}>
      <p className={'px-4 pt-4 text-label text-neutral-500'}>Send a test copy to</p>
      <ul className={'mt-2 divide-y divide-neutral-100'}>
        {recipients.map(r => (
          <li key={r.email} className={'flex items-center gap-3 px-4 py-3'}>
            {r.ok ? (
              <Check aria-hidden strokeWidth={2.25} className={'h-4 w-4 flex-shrink-0 text-ok'} />
            ) : (
              <Ban aria-hidden strokeWidth={1.75} className={'h-4 w-4 flex-shrink-0 text-err'} />
            )}
            <span className={'min-w-0'}>
              <span className={'block truncate text-ui font-semibold text-neutral-900'}>{r.email}</span>
              <span className={'block text-label text-neutral-500'}>{r.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

/* ---------- Homepage: also in every plan ---------- */

/** An address with a typo caught, and the fix offered. */
export function ValidationFragment() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <div className={'flex items-center justify-between gap-3'}>
        <span className={'truncate font-code text-ui text-neutral-900'}>ana@gmial.com</span>
        <StatusPill tone={'warn'}>Likely typo</StatusPill>
      </div>
      <p className={'mt-3 border-t border-neutral-100 pt-3 text-ui text-neutral-600'}>
        Did you mean <span className={'font-semibold text-neutral-900'}>ana@gmail.com</span>?
      </p>
    </UICard>
  );
}

/** Bounce and complaint rates against their limits, as the dashboard shows them. */
export function ReputationFragment() {
  const rates = [
    {label: 'Bounce rate', value: '0.4%', fill: '8%'},
    {label: 'Complaint rate', value: '0.01%', fill: '3%'},
  ];

  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <div className={'flex items-center justify-between gap-3'}>
        <span className={'text-ui font-semibold text-neutral-900'}>Sending reputation</span>
        <StatusPill tone={'ok'}>Healthy</StatusPill>
      </div>
      <dl className={'mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4'}>
        {rates.map(rate => (
          <div key={rate.label}>
            <div className={'flex items-baseline justify-between text-ui'}>
              <dt className={'text-neutral-600'}>{rate.label}</dt>
              <dd className={'font-semibold text-neutral-900 tabular-nums'}>{rate.value}</dd>
            </div>
            <div className={'mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100'}>
              <div className={'h-full rounded-full bg-ok'} style={{width: rate.fill}} />
            </div>
          </div>
        ))}
      </dl>
    </UICard>
  );
}

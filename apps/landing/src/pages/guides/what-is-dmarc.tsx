import Link from 'next/link';
import React from 'react';

import type {FAQ} from '../../components/FAQSection';
import {
  AuthResultsFragment,
  DnsRecordFragment,
  GuideCode,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideSteps,
  GuideTable,
  InfoBox,
} from '../../components/guides';
import {SnippetTile, StatusPill, UICard} from '../../components/snippets';

const faqs: FAQ[] = [
  {
    question: 'What is DMARC?',
    answer:
      'DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol that builds on SPF and DKIM to protect your domain from spoofing and phishing. It tells receiving servers what to do when a message fails those checks (none to monitor, quarantine to send to spam, reject to block) and sends you reports on who is sending email as your domain.',
  },
  {
    question: 'What is a DMARC policy?',
    answer:
      'The DMARC policy (the p= tag) sets how receiving servers handle email that fails authentication. p=none monitors and takes no action, p=quarantine sends failing email to spam, and p=reject blocks it. Start with p=none to gather data, then tighten to quarantine and reject once every legitimate sender is authenticated.',
  },
  {
    question: 'What does p=reject mean in DMARC?',
    answer:
      'p=reject is the strictest policy: email that fails DMARC is refused and never delivered. It gives the most protection against phishing and spoofing, but every legitimate source (newsletters, CRMs, transactional tools) must pass SPF or DKIM with alignment before you turn it on.',
  },
  {
    question: 'How do I add a DMARC record?',
    answer:
      'Add a TXT record named _dmarc.yourdomain.com. Start with a monitoring value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com. This records activity without affecting delivery. After 2 to 4 weeks of reports, and once SPF and DKIM pass for every sender, move to p=quarantine and then p=reject.',
  },
  {
    question: 'Is DMARC required for email deliverability?',
    answer:
      'Since February 2024, Google and Yahoo require a DMARC record (at least p=none) for bulk senders sending more than 5,000 emails a day to Gmail or Yahoo addresses. Smaller senders are not strictly required to have one, but it is strongly recommended for every domain: it improves deliverability and blocks phishing in your name.',
  },
];

export default function WhatIsDMARC() {
  return (
    <GuideLayout
      slug={'what-is-dmarc'}
      title="What is DMARC? Policy, Setup & Reporting Explained"
      heading={'What is DMARC?'}
      description="Learn how DMARC works with SPF and DKIM to protect your domain. Understand DMARC policies (none, quarantine, reject), how to set up a DMARC record, and read reports."
      lead={
        'DMARC is a DNS record that tells inboxes what to do with mail that fails SPF and DKIM: deliver it, send it to spam, or reject it. It also sends you reports on everyone sending email as your domain.'
      }
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/what-is-dmarc"
      faqs={faqs}
      cta={'Send email that passes DMARC.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <DnsRecordFragment
              type={'TXT'}
              name={'_dmarc.acme.com'}
              value={'v=DMARC1; p=reject; rua=mailto:dmarc@acme.com'}
              status={{tone: 'ok', label: 'Verified'}}
              className={'w-full max-w-lg'}
            />
            <PolicyFragment className={'ml-10 w-full max-w-xs'} />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'how-dmarc-works'} title={'How DMARC works'}>
        <p>
          SPF and DKIM say whether a message passed a check. DMARC adds two things: it requires the domain that passed to
          match the one in the From address, and it tells the receiver what to do when nothing does.
        </p>
        <GuideSteps
          steps={[
            {
              title: 'SPF and DKIM run',
              body: 'The receiving server checks both. At least one has to pass for DMARC to pass.',
            },
            {
              title: 'Alignment is checked',
              body: 'The domain that passed SPF or DKIM must match the domain in the From header. This is called identifier alignment.',
            },
            {
              title: 'Your policy is applied',
              body: 'If a check passes and aligns, the message is delivered. If not, the receiver follows your policy: none, quarantine or reject.',
            },
            {
              title: 'You get a report',
              body: 'Receivers send daily reports to the address in your record, covering every message that claimed to be from your domain.',
            },
          ]}
        />
        <GuideFigure caption={'Both messages pass a check. Only the one signed by acme.com aligns with the From address.'}>
          <div className={'grid w-full max-w-xl gap-3 sm:grid-cols-2'}>
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'DKIM, acme.com', value: 'Pass', tone: 'ok'},
                {label: 'Aligned', value: 'Yes', tone: 'neutral'},
                {label: 'DMARC', value: 'Pass', tone: 'ok'},
              ]}
              className={'w-full'}
            />
            <AuthResultsFragment
              subject={'Your account is on hold'}
              from={'billing@acme.com'}
              results={[
                {label: 'SPF, mailer.net', value: 'Pass', tone: 'ok'},
                {label: 'Aligned', value: 'No', tone: 'neutral'},
                {label: 'DMARC', value: 'Fail', tone: 'err'},
              ]}
              className={'w-full'}
            />
          </div>
        </GuideFigure>
        <p>
          DMARC does not work on its own. Set up <Link href={'/guides/what-is-spf'}>SPF</Link> and{' '}
          <Link href={'/guides/what-is-dkim'}>DKIM</Link> first.
        </p>
      </GuideSection>

      <GuideSection id={'dmarc-record-syntax'} title={'Reading a DMARC record'}>
        <p>
          A DMARC record is a TXT record at <code>_dmarc.yourdomain.com</code>. Only the version and the policy are
          required.
        </p>
        <GuideCode
          title={'TXT record on _dmarc.acme.com'}
          code={
            'v=DMARC1; p=quarantine; rua=mailto:dmarc@acme.com; ruf=mailto:forensic@acme.com; pct=100; adkim=r; aspf=r'
          }
        />
        <GuideTable
          mono
          head={['Tag', 'What it means', 'Required']}
          rows={[
            ['v', 'The version. Always DMARC1.', 'Yes'],
            ['p', 'The policy: none, quarantine or reject.', 'Yes'],
            ['rua', 'Where to send aggregate reports.', 'Recommended'],
            ['ruf', 'Where to send forensic reports on single failures.', 'Optional'],
            ['pct', 'The percentage of failing mail the policy applies to (0 to 100).', 'Optional'],
            ['sp', 'The policy for subdomains.', 'Optional'],
            ['adkim', 'DKIM alignment: r (relaxed) or s (strict).', 'Optional'],
            ['aspf', 'SPF alignment: r (relaxed) or s (strict).', 'Optional'],
          ]}
        />
        <p>
          Relaxed alignment accepts a subdomain (mail.acme.com aligns with acme.com). Strict needs an exact match. Relaxed
          is the default and right for most domains.
        </p>
      </GuideSection>

      <GuideSection id={'dmarc-policies'} title={'The three policies'}>
        <p>
          The policy only affects mail that fails DMARC. Move through the three in order, one step at a time, as reports
          confirm your own mail passes.
        </p>
        <GuideFigure caption={'The same failing message under each policy. Only none lets it through.'}>
          <PolicyRowsFragment />
        </GuideFigure>
        <InfoBox type={'warning'} title={'Start with p=none'}>
          <p>
            Monitor for at least 2 to 4 weeks before you enforce. Jumping straight to <code>p=reject</code> can block
            your own newsletters, invoices or help desk replies if one of them is not authenticated yet.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'dmarc-reports'} title={'Reading DMARC reports'}>
        <p>
          Aggregate reports (<code>rua</code>) arrive daily from each large mailbox provider as XML files. They list
          every server that sent mail as your domain, how many messages it sent, and whether they passed SPF, DKIM and
          alignment. Forensic reports (<code>ruf</code>) describe single failed messages, but few providers send them.
        </p>
        <GuideFigure caption={'Each row is a source sending as your domain. Fix the ones you recognise before you enforce.'}>
          <ReportFragment />
        </GuideFigure>
        <p>
          Reports can be large and frequent, so send them to a dedicated mailbox. Sources you recognise that fail need
          SPF or DKIM set up; sources you do not recognise are what your policy will block.
        </p>
      </GuideSection>

      <GuideSection id={'why-dmarc-matters'} title={'Why DMARC matters'}>
        <GuidePoints
          columns={2}
          items={[
            {title: 'Blocks spoofing', body: 'At p=reject, forged mail in your name is refused outright.'},
            {title: 'Required by Google and Yahoo', body: 'Bulk senders (5,000+ a day) need at least p=none since 2024.'},
            {title: 'Shows who sends as you', body: 'Reports surface tools and servers you did not know about.'},
            {title: 'Improves deliverability', body: 'An enforced policy is a strong trust signal for inboxes.'},
          ]}
        />
      </GuideSection>

      <GuideSection id={'setting-up-dmarc'} title={'How to set up DMARC'}>
        <GuideSteps
          steps={[
            {
              title: 'Make sure SPF and DKIM pass',
              body: 'DMARC needs at least one of them working for every service that sends as you.',
            },
            {
              title: 'Create a mailbox for reports',
              body: 'For example dmarc@yourdomain.com. Keep it separate from your inbox.',
            },
            {
              title: 'Publish a monitoring record',
              body: (
                <>
                  Add a TXT record at <code>_dmarc.yourdomain.com</code>:
                </>
              ),
              children: <GuideCode code={'v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; pct=100'} />,
            },
            {
              title: 'Watch reports for 2 to 4 weeks',
              body: 'Find legitimate sources that fail and fix their SPF or DKIM.',
            },
            {
              title: 'Tighten the policy',
              body: (
                <>
                  Move to <code>p=quarantine</code>, monitor again, then to <code>p=reject</code>. Check each change with
                  the <Link href={'/tools/dmarc-checker'}>DMARC checker</Link>.
                </>
              ),
              children: <GuideCode code={'v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; pct=100'} />,
            },
          ]}
        />
      </GuideSection>
    </GuideLayout>
  );
}

/** The policy setting on a domain, set to reject. */
function PolicyFragment({className = ''}: {className?: string}) {
  const options = ['None', 'Quarantine', 'Reject'];

  return (
    <UICard className={`p-4 ${className}`}>
      <div className={'flex items-center justify-between gap-3'}>
        <p className={'text-ui font-semibold text-neutral-900'}>DMARC policy</p>
        <StatusPill tone={'ok'}>Enforced</StatusPill>
      </div>
      <div className={'mt-3 grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1'}>
        {options.map(option => (
          <span
            key={option}
            className={`rounded-md py-1.5 text-center text-label font-medium ${
              option === 'Reject' ? 'bg-white text-neutral-900 shadow-fragment' : 'text-neutral-500'
            }`}
          >
            {option}
          </span>
        ))}
      </div>
      <p className={'mt-3 text-label text-neutral-500'}>Mail that fails DMARC is refused</p>
    </UICard>
  );
}

/** One failing message, and what each policy does with it. */
function PolicyRowsFragment() {
  const rows = [
    {name: 'None', value: 'p=none', use: 'Monitor while you collect reports', outcome: {tone: 'neutral' as const, label: 'Delivered'}},
    {name: 'Quarantine', value: 'p=quarantine', use: 'Once your own mail passes', outcome: {tone: 'warn' as const, label: 'Spam folder'}},
    {name: 'Reject', value: 'p=reject', use: 'Full protection', outcome: {tone: 'err' as const, label: 'Blocked'}},
  ];

  return (
    <UICard className={'w-full max-w-md divide-y divide-neutral-100'}>
      {rows.map(r => (
        <div key={r.name} className={'flex items-center gap-3 px-4 py-3.5'}>
          <div className={'min-w-0 flex-1'}>
            <p className={'flex items-baseline gap-2 text-ui font-semibold text-neutral-900'}>
              {r.name}
              <span className={'font-code text-label font-normal text-neutral-500'}>{r.value}</span>
            </p>
            <p className={'truncate text-label text-neutral-500'}>{r.use}</p>
          </div>
          <StatusPill tone={r.outcome.tone}>{r.outcome.label}</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

/** A day's aggregate report from one provider, grouped by sending source. */
function ReportFragment() {
  const sources = [
    {name: 'Plunk', count: '12,480', result: {tone: 'ok' as const, label: 'Pass'}},
    {name: 'Google Workspace', count: '1,204', result: {tone: 'ok' as const, label: 'Pass'}},
    {name: 'Help desk', count: '310', result: {tone: 'warn' as const, label: 'Not aligned'}},
    {name: '192.0.2.44', count: '58', result: {tone: 'err' as const, label: 'Fail'}},
  ];

  return (
    <UICard className={'w-full max-w-md'}>
      <div className={'flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3'}>
        <p className={'text-ui font-semibold text-neutral-900'}>Report from google.com</p>
        <p className={'text-label text-neutral-500'}>Oct 16</p>
      </div>
      <div className={'divide-y divide-neutral-100'}>
        {sources.map(s => (
          <div key={s.name} className={'flex items-center gap-3 px-4 py-3'}>
            <div className={'min-w-0 flex-1'}>
              <p className={'truncate text-ui font-semibold text-neutral-900'}>{s.name}</p>
              <p className={'text-label text-neutral-500 tabular-nums'}>{s.count} messages</p>
            </div>
            <StatusPill tone={s.result.tone}>{s.result.label}</StatusPill>
          </div>
        ))}
      </div>
    </UICard>
  );
}

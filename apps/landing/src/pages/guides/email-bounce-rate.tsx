import Link from 'next/link';
import React from 'react';

import type {FAQ} from '../../components/FAQSection';
import {
  GuideCode,
  GuideCompare,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideTable,
  InfoBox,
  RateFragment,
} from '../../components/guides';
import {Avatar, SnippetRow, SnippetTile, StatusPill, TimeAgo, UICard} from '../../components/snippets';

const faqs: FAQ[] = [
  {
    question: 'What is a good email bounce rate?',
    answer:
      'Below 2% is good. Between 2% and 5% points to list quality problems that need attention. Above 5% is critical and will damage your sender reputation and deliverability. Keep hard bounces below 0.5% per campaign. Most email platforms pause sending or suspend accounts when hard bounces pass 5 to 10%.',
  },
  {
    question: 'What is the difference between a hard bounce and a soft bounce?',
    answer:
      'A hard bounce is a permanent failure: the address does not exist, the domain is invalid, or the receiving server has permanently blocked delivery. Remove those addresses right away and never send to them again. A soft bounce is temporary: the mailbox is full, the server is down, or the message is too large. Email platforms usually retry soft bounces for 24 to 72 hours.',
  },
  {
    question: 'How do I reduce email bounce rates?',
    answer:
      'Use double opt-in to confirm addresses at signup, validate addresses on your forms to catch typos and invalid formats, remove hard bounces automatically, clean your list every 6 to 12 months (15 to 20% of addresses go invalid each year), never buy lists (they carry 20 to 40% invalid addresses), and send regularly so addresses do not go stale.',
  },
  {
    question: 'Do bounces affect my email deliverability?',
    answer:
      'Yes. Gmail, Outlook and other providers track bounce rates as a signal of list quality. A high rate sends more of your mail to spam, including mail to valid addresses. If it stays high, your sending IP or domain can end up on a blocklist, which makes almost any email hard to deliver.',
  },
  {
    question: 'Why are my emails bouncing suddenly?',
    answer:
      'Common causes: sending to an old list that has gone stale, sending to a purchased list, a domain or server configuration change, your IP or domain being blocklisted, or hitting a provider’s sending limits. Check whether the bounces cluster on specific domains or hit all recipients, then work back to the cause.',
  },
];

export default function EmailBounceRate() {
  return (
    <GuideLayout
      slug={'email-bounce-rate'}
      title="Email Bounce Rate: Hard vs Soft Bounces Explained"
      heading={'Email bounce rate'}
      description="Understand email bounce rates, the difference between hard and soft bounces, and proven strategies to reduce bounces and protect your sender reputation."
      lead={
        'Bounce rate is the share of your emails that receiving servers rejected. Keep it under 2%: above that, inboxes start treating the rest of your mail as suspect.'
      }
      lastUpdated="2025-12-20"
      readTime="6 min"
      canonical="https://www.useplunk.com/guides/email-bounce-rate"
      faqs={faqs}
      cta={'Keep bounces off your sender record.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <BouncedMessage
              name={'Ana Ruiz'}
              address={'ana.ruiz@acme-old.com'}
              subject={'Your receipt from Acme'}
              pill={{tone: 'err', label: 'Hard bounce'}}
              reason={'Mailbox does not exist'}
              code={'550 5.1.1'}
              className={'w-full max-w-lg'}
            />
            <RateFragment
              label={'Bounce rate, last 30 days'}
              value={'1.4%'}
              fill={28}
              tone={'ok'}
              marker={{at: 40, label: '2% limit'}}
              note={'Healthy'}
              className={'ml-10 w-full max-w-xs'}
            />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'what-is-bounce-rate'} title={'What bounce rate measures'}>
        <p>
          A bounce is an email the receiving server refused to deliver. Bounce rate is the number of bounces divided by
          the number of emails you sent.
        </p>
        <GuideCode
          title={'Bounce rate formula'}
          copy={false}
          code={`Bounce rate = (bounced emails ÷ sent emails) × 100

Sent: 10,000   Bounced: 150
Bounce rate = (150 ÷ 10,000) × 100 = 1.5%`}
        />
        <GuideTable
          head={['Bounce rate', 'Status', 'What it means']}
          rows={[
            ['Below 2%', <StatusPill key={'s'} tone={'ok'}>Good</StatusPill>, 'A healthy list with good hygiene.'],
            ['2% to 5%', <StatusPill key={'s'} tone={'warn'}>Concerning</StatusPill>, 'List quality problems that need attention.'],
            ['Above 5%', <StatusPill key={'s'} tone={'err'}>Critical</StatusPill>, 'Actively damaging your sender reputation.'],
          ]}
        />
      </GuideSection>

      <GuideSection id={'hard-vs-soft-bounces'} title={'Hard and soft bounces'}>
        <p>Bounces come in two kinds, and each needs a different response.</p>
        <GuideCompare
          items={[
            {
              title: 'Hard bounce',
              badge: <StatusPill tone={'err'}>Permanent</StatusPill>,
              body: 'The address will never accept your mail. Remove it immediately; sending again hurts your reputation.',
              points: [
                'The address does not exist',
                'The domain does not exist',
                'The server has blocked delivery for good',
                'The address format is invalid',
              ],
            },
            {
              title: 'Soft bounce',
              badge: <StatusPill tone={'warn'}>Temporary</StatusPill>,
              body: 'The address is valid but delivery failed this time. Most platforms retry for 24 to 72 hours.',
              points: [
                'The mailbox is full',
                'The server is down or busy',
                'The message is too large',
                'The receiving server has a temporary problem',
              ],
            },
          ]}
        />
        <p>
          After 3 to 5 consecutive soft bounces across several campaigns, treat the address as a hard bounce and remove
          it.
        </p>
        <GuideFigure caption={'A hard bounce is final and the address is suppressed. A soft bounce is retried.'}>
          <div className={'grid w-full max-w-2xl gap-3 sm:grid-cols-2'}>
            <BouncedMessage
              name={'Ana Ruiz'}
              address={'ana.ruiz@acme-old.com'}
              subject={'Your receipt from Acme'}
              pill={{tone: 'err', label: 'Suppressed'}}
              reason={'Mailbox does not exist'}
              code={'550 5.1.1'}
            />
            <BouncedMessage
              name={'Tom Becker'}
              address={'tom@northwind.io'}
              subject={'Your receipt from Acme'}
              pill={{tone: 'warn', label: 'Retry 2 of 5'}}
              reason={'Mailbox full'}
              code={'452 4.2.2'}
            />
          </div>
        </GuideFigure>
        <InfoBox title={'Bounces and blocks are different problems'}>
          <p>
            A block is when the receiving server rejects your email because of your reputation or content, not the
            address. Bounces point to bad addresses; blocks point to a{' '}
            <Link href={'/guides/email-deliverability'}>deliverability</Link> problem that affects every email you send
            to that domain.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'bounce-error-codes'} title={'Bounce error codes'}>
        <p>
          Every bounce comes with an SMTP code. Codes starting with 5 are permanent, codes starting with 4 are temporary.
        </p>
        <GuideTable
          mono
          head={['Code', 'Reason', 'Type', 'Action']}
          rows={[
            ['550', 'Mailbox unavailable', 'Hard', 'Remove'],
            ['551', 'User not local or invalid address', 'Hard', 'Remove'],
            ['552', 'Mailbox full', 'Soft', 'Retry'],
            ['553', 'Mailbox name invalid', 'Hard', 'Remove'],
            ['554', 'Transaction failed', 'Varies', 'Investigate'],
            ['421', 'Service not available', 'Soft', 'Retry'],
            ['450', 'Mailbox busy', 'Soft', 'Retry'],
          ]}
        />
      </GuideSection>

      <GuideSection id={'reduce-bounces'} title={'How to reduce bounce rate'}>
        <p>Most bounces trace back to how addresses got on the list. Fix that and the rate follows.</p>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Use double opt-in',
              body: 'A confirmation link proves the address is real, active and belongs to whoever signed up. It cuts bounces by 50 to 70%.',
            },
            {
              title: 'Validate addresses on signup',
              body: (
                <>
                  Check the format, confirm the domain has MX records, catch typos like gmial.com and block disposable
                  addresses if you need to. Try it with the <Link href={'/tools/verify-email'}>email verifier</Link>.
                </>
              ),
            },
            {
              title: 'Remove hard bounces immediately',
              body: 'Automate it. Sending to dead addresses again tells providers your list is not maintained.',
            },
            {
              title: 'Clean your list regularly',
              body: '15 to 20% of addresses go invalid every year. Remove or re-engage inactive subscribers every 6 to 12 months.',
            },
            {
              title: 'Never buy lists',
              body: 'Purchased lists carry 20 to 40% invalid addresses and no engagement. Build your list yourself.',
            },
            {
              title: 'Watch repeat soft bounces',
              body: 'Remove addresses after 3 to 5 consecutive soft bounces over multiple campaigns.',
            },
            {
              title: 'Keep emails under 100KB',
              body: 'Compress images, trim the code and link to large files instead of attaching them.',
            },
            {
              title: 'Send consistently',
              body: 'Gaps of 3 months or more let addresses go stale and subscribers forget you.',
            },
          ]}
        />
        <GuideFigure caption={'A typo caught on the form never becomes a bounce.'}>
          <SignupTypoCatch />
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'impact-on-deliverability'} title={'How bounces hurt deliverability'}>
        <GuidePoints
          columns={2}
          items={[
            {
              title: 'Lower sender reputation',
              body: (
                <>
                  Providers read a high bounce rate as careless sending, so more of your mail goes to spam. See{' '}
                  <Link href={'/guides/email-sender-reputation'}>sender reputation</Link>.
                </>
              ),
            },
            {
              title: 'Spam trap hits',
              body: 'Abandoned addresses can be recycled as spam traps, and hitting them can get you blocklisted.',
            },
            {
              title: 'IP and domain blocklisting',
              body: 'A rate that stays high can put your IP or domain on blocklists, which blocks delivery almost everywhere.',
            },
            {
              title: 'Less trust in the rest',
              body: 'When much of a list is invalid, providers trust your mail to the valid addresses less too.',
            },
          ]}
        />
        <InfoBox type={'warning'} title={'Recovery takes weeks'}>
          <p>
            Once bounces have damaged your reputation, it can take weeks or months of clean sending to recover.
            Preventing bounces is far easier.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'monitoring-bounces'} title={'Monitoring bounces'}>
        <h3>What to track</h3>
        <ul>
          <li>Overall bounce rate, with a target below 2%</li>
          <li>Hard and soft bounce rates separately, and how many soft bounces succeed on retry</li>
          <li>Bounce rate per campaign and over time</li>
          <li>Bounce reasons and error codes</li>
        </ul>
        <h3>What to automate</h3>
        <ul>
          <li>Remove hard bounces immediately</li>
          <li>Retry soft bounces 3 to 5 times over 72 hours, then remove persistent ones</li>
          <li>Alert when the bounce rate passes your threshold, and send a weekly report</li>
          <li>Validate addresses at signup</li>
        </ul>
        <GuideFigure caption={'When bounces cluster on one domain, look for a block rather than bad addresses.'}>
          <BounceLog />
        </GuideFigure>
      </GuideSection>
    </GuideLayout>
  );
}

type Tone = 'neutral' | 'ok' | 'warn' | 'err';

/** One bounced message as the activity log shows it: who, what, the state, and the server's reply. */
function BouncedMessage({
  name,
  address,
  subject,
  pill,
  reason,
  code,
  className = 'w-full',
}: {
  name: string;
  address: string;
  subject: string;
  pill: {tone: Tone; label: string};
  reason: string;
  code: string;
  className?: string;
}) {
  return (
    <UICard className={`p-4 ${className}`}>
      <SnippetRow
        leading={<Avatar name={name} />}
        label={address}
        title={subject}
        labelPosition={'below'}
        trailing={<StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
      />
      <div className={'mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3'}>
        <span className={'truncate text-ui text-neutral-700'}>{reason}</span>
        <span className={'flex-shrink-0 rounded-md bg-neutral-50 px-1.5 py-0.5 font-code text-label text-neutral-700'}>
          {code}
        </span>
      </div>
    </UICard>
  );
}

/** A signup field with a typo and the suggestion that fixes it. */
function SignupTypoCatch() {
  return (
    <UICard className={'w-full max-w-xs p-4'}>
      <p className={'text-ui font-semibold text-neutral-900'}>Join the Acme newsletter</p>
      <p className={'mt-3 text-label text-neutral-500'}>Email</p>
      <div className={'mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-ui text-neutral-900'}>ana@gmial.com</div>
      <p className={'mt-2 text-label text-neutral-600'}>
        Did you mean <span className={'font-semibold text-neutral-900'}>ana@gmail.com</span>?
      </p>
      <div className={'mt-4 rounded-lg bg-neutral-900 px-3 py-2 text-center text-ui font-medium text-white'}>Subscribe</div>
    </UICard>
  );
}

/** Recent bounces, where one domain stands out. */
function BounceLog() {
  const rows: {address: string; reason: string; pill: {tone: Tone; label: string}; time: string}[] = [
    {address: 'j.lee@contoso.com', reason: 'Blocked by recipient server', pill: {tone: 'err', label: 'Blocked'}, time: '2m'},
    {address: 'mia@contoso.com', reason: 'Blocked by recipient server', pill: {tone: 'err', label: 'Blocked'}, time: '2m'},
    {address: 'sam.ortiz@contoso.com', reason: 'Blocked by recipient server', pill: {tone: 'err', label: 'Blocked'}, time: '3m'},
    {address: 'tom@northwind.io', reason: 'Mailbox full', pill: {tone: 'warn', label: 'Soft bounce'}, time: '1h'},
  ];

  return (
    <UICard className={'w-full max-w-md divide-y divide-neutral-100'}>
      {rows.map(row => (
        <div key={row.address} className={'flex items-center gap-3 px-4 py-3'}>
          <div className={'min-w-0 flex-1'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{row.address}</p>
            <p className={'truncate text-label text-neutral-500'}>{row.reason}</p>
          </div>
          <StatusPill tone={row.pill.tone}>{row.pill.label}</StatusPill>
          <TimeAgo>{row.time}</TimeAgo>
        </div>
      ))}
    </UICard>
  );
}

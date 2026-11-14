import Link from 'next/link';
import React from 'react';

import {
  AuthResultsFragment,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideTable,
  InboxFragment,
  InfoBox,
  RateFragment,
} from '../../components/guides';
import {SnippetTile, StatusPill, UICard} from '../../components/snippets';

/** One mailbox folder with a few messages in it: where a message ended up, not just that it arrived. */
function FolderFragment({
  folder,
  tone,
  rows,
}: {
  folder: string;
  tone: 'ok' | 'err';
  rows: {sender: string; subject: string}[];
}) {
  return (
    <UICard className={'w-full'}>
      <div className={'flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3'}>
        <span className={'text-ui font-semibold text-neutral-900'}>{folder}</span>
        <StatusPill tone={tone}>{tone === 'ok' ? 'Inbox' : 'Filtered'}</StatusPill>
      </div>
      <ul className={'divide-y divide-neutral-100'}>
        {rows.map(row => (
          <li key={row.subject} className={'px-4 py-3'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{row.sender}</p>
            <p className={'truncate text-label text-neutral-500'}>{row.subject}</p>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

export default function EmailDeliverability() {
  return (
    <GuideLayout
      slug={'email-deliverability'}
      title="Email Deliverability Guide: Reach the Inbox Every Time"
      heading={'Email deliverability'}
      description="Learn proven strategies to improve email deliverability, avoid spam filters, and maximize inbox placement rates. Complete guide with best practices."
      lead={
        'Deliverability is the share of your email that reaches the inbox instead of spam or a block. It comes down to four things: authentication, sender reputation, list quality and content.'
      }
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/email-deliverability"
      cta={'Land in the inbox, not in spam.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <InboxFragment
              rows={[
                {
                  sender: 'Acme',
                  subject: 'Your receipt from Acme',
                  time: '9:41',
                  unread: true,
                  tag: {tone: 'ok', label: 'Primary'},
                },
                {sender: 'Ana Ruiz', subject: 'Notes from Thursday', time: '8:12'},
                {sender: 'Tom Bakker', subject: 'Re: Q3 planning', time: 'Mon'},
              ]}
              className={'w-full max-w-lg'}
            />
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'SPF', value: 'Pass', tone: 'ok'},
                {label: 'DKIM', value: 'Pass', tone: 'ok'},
                {label: 'DMARC', value: 'Pass', tone: 'ok'},
              ]}
              className={'ml-10 w-full max-w-xs'}
            />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'what-is-deliverability'} title={'What deliverability means'}>
        <p>
          Deliverability is measured as the percentage of sent emails that land in the inbox. Even a perfectly written
          email is worthless if it never gets there.
        </p>
        <GuideTable
          head={['Inbox placement', 'Rating', 'What it usually means']}
          rows={[
            ['95% or more', 'Excellent', 'Strong sender reputation, proper authentication, engaged audience.'],
            ['85 to 94%', 'Good', 'Room to improve authentication or engagement.'],
            ['Below 85%', 'Poor', 'Serious issues that need attention now.'],
          ]}
        />
        <p>
          Deliverability is not the same as delivery rate. Delivery rate counts the emails that did not bounce, meaning
          the receiving server accepted them. Deliverability counts the ones that then reached the inbox and not the
          spam folder. You want both to be high.
        </p>
        <GuideFigure caption={'Both messages were delivered. Only one was seen.'}>
          <div className={'grid w-full max-w-xl gap-3 sm:grid-cols-2'}>
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'Server', value: 'Accepted', tone: 'ok'},
                {label: 'Folder', value: 'Primary', tone: 'ok'},
              ]}
              className={'w-full'}
            />
            <AuthResultsFragment
              subject={'Spring sale: 50% off'}
              from={'news@acme.com'}
              results={[
                {label: 'Server', value: 'Accepted', tone: 'ok'},
                {label: 'Folder', value: 'Spam', tone: 'err'},
              ]}
              className={'w-full'}
            />
          </div>
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'what-affects-deliverability'} title={'What affects deliverability'}>
        <GuidePoints
          items={[
            {
              title: 'Sender reputation',
              body: (
                <>
                  Mailbox providers track how you send over time. High engagement, few complaints and few bounces build
                  a good <Link href={'/guides/email-sender-reputation'}>sender reputation</Link>; poor practices damage
                  it.
                </>
              ),
            },
            {
              title: 'Authentication',
              body: (
                <>
                  <Link href={'/guides/what-is-spf'}>SPF</Link>, <Link href={'/guides/what-is-dkim'}>DKIM</Link> and{' '}
                  <Link href={'/guides/what-is-dmarc'}>DMARC</Link> prove your email is legitimate. Without them, mail
                  is more likely to be flagged as spam.
                </>
              ),
            },
            {
              title: 'Content',
              body: 'Spam filters read your subject line, body, links and images. Spammy language, too many links or misleading content trigger them.',
            },
            {
              title: 'List quality and engagement',
              body: 'Opens and clicks from people who want your email signal quality. Low engagement and spam complaints hurt.',
            },
            {
              title: 'Infrastructure',
              body: 'Your sending IP, domain reputation and setup affect how providers see you. At scale, dedicated IPs and a proper warm-up matter.',
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'best-practices'} title={'How to improve deliverability'}>
        <h3>Authentication and setup</h3>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Configure SPF, DKIM and DMARC',
              body: 'Set up all three. They prove your mail is legitimate and protect your domain from spoofing.',
            },
            {
              title: 'Send from a dedicated subdomain',
              body: 'Send marketing from a subdomain such as mail.yourdomain.com, so problems there do not touch your main domain’s reputation.',
            },
            {
              title: 'Warm up new IPs and domains',
              body: 'Raise volume gradually over 2 to 4 weeks. Sudden high volume from a new source looks suspicious.',
            },
          ]}
        />
        <h3>List management</h3>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Use double opt-in',
              body: 'Ask new subscribers to confirm their address. It keeps the list clean and keeps spam trap addresses out.',
            },
            {
              title: 'Clean your list regularly',
              body: (
                <>
                  Remove hard bounces immediately and consider removing anyone who has not engaged in 6 to 12 months.
                  Inactive subscribers hurt your reputation. See <Link href={'/guides/email-bounce-rate'}>bounce rate</Link>{' '}
                  for more.
                </>
              ),
            },
            {
              title: 'Make unsubscribing easy',
              body: 'Put a clear unsubscribe link in every email. People who cannot find it mark you as spam, which does far more damage.',
            },
          ]}
        />
        <h3>Content</h3>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Skip spam trigger words',
              body: 'Words like “FREE”, “ACT NOW” and “LIMITED TIME”, strings of exclamation marks and all caps trigger filters. Write the way you would to a customer.',
            },
            {
              title: 'Balance text and images',
              body: 'Never send image-only emails. Keep at least 60% text and add alt text to every image.',
            },
            {
              title: 'Write honest subject lines',
              body: 'The subject should match the email. Misleading subjects drive complaints and erode trust.',
            },
          ]}
        />
        <GuideFigure caption={'Filters read the subject before anyone else does. Shouting gets you sorted into spam.'}>
          <div className={'grid w-full max-w-xl gap-3 sm:grid-cols-2'}>
            <FolderFragment
              folder={'Primary'}
              tone={'ok'}
              rows={[
                {sender: 'Acme', subject: 'Your March invoice is ready'},
                {sender: 'Acme', subject: 'Ana invited you to Acme'},
              ]}
            />
            <FolderFragment
              folder={'Spam'}
              tone={'err'}
              rows={[
                {sender: 'Deals Hub', subject: 'FREE!!! ACT NOW, LIMITED TIME'},
                {sender: 'Deals Hub', subject: 'YOU HAVE BEEN SELECTED'},
              ]}
            />
          </div>
        </GuideFigure>
        <p>
          Run a draft through the <Link href={'/tools/spam-checker'}>spam checker</Link> before you send to catch trigger
          words and formatting problems.
        </p>
      </GuideSection>

      <GuideSection id={'common-issues'} title={'Common problems and fixes'}>
        <GuideTable
          head={['Problem', 'Usual causes', 'Fix']}
          rows={[
            [
              'Emails go to spam',
              'Poor sender reputation, missing authentication, spammy content, low engagement.',
              'Verify SPF, DKIM and DMARC, improve content, send to engaged segments, warm up your reputation.',
            ],
            [
              'High bounce rate',
              'Invalid addresses, purchased lists, poor list hygiene.',
              <>
                Use double opt-in, <Link href={'/tools/verify-email'}>validate addresses</Link>, remove hard bounces
                immediately, clean your list regularly.
              </>,
            ],
            [
              'Low engagement',
              'Irrelevant content, wrong send frequency, stale list.',
              'Segment your audience, personalize content, test send times, run re-engagement campaigns.',
            ],
            [
              'Blacklisted IP or domain',
              'Spam complaints, spam trap hits, a compromised account.',
              'Check blacklists (MXToolbox, Spamhaus), fix the cause, request delisting. If the damage is severe, consider a new sending domain.',
            ],
          ]}
        />
      </GuideSection>

      <GuideSection id={'monitoring'} title={'What to monitor'}>
        <GuideTable
          head={['Metric', 'What it measures', 'Target']}
          rows={[
            ['Delivery rate', 'Emails that did not bounce. Track hard and soft bounces separately.', '98% or more'],
            ['Inbox placement rate', 'Delivered emails that reached the inbox, not spam. Measure with seed list tests.', '95% or more'],
            ['Spam complaint rate', 'Recipients who mark your email as spam. Even 0.3% is concerning.', 'Below 0.1%'],
            ['Engagement', 'Opens, clicks and unsubscribes. Sustained low engagement signals poor deliverability.', 'Trending steady or up'],
          ]}
        />
        <GuideFigure caption={'A healthy sender: every rate on the right side of its line.'}>
          <div className={'grid w-full max-w-2xl gap-3 sm:grid-cols-3'}>
            <RateFragment
              label={'Delivery rate'}
              value={'98.7%'}
              fill={98.7}
              marker={{at: 98, label: 'Target 98%'}}
              tone={'ok'}
              className={'w-full'}
            />
            <RateFragment
              label={'Inbox placement'}
              value={'96.2%'}
              fill={96.2}
              marker={{at: 95, label: 'Target 95%'}}
              tone={'ok'}
              className={'w-full'}
            />
            <RateFragment
              label={'Complaint rate'}
              value={'0.04%'}
              fill={13}
              marker={{at: 33, label: 'Limit 0.1%'}}
              tone={'ok'}
              className={'w-full'}
            />
          </div>
        </GuideFigure>
        <InfoBox type={'tip'} title={'Read your DMARC reports'}>
          <p>
            DMARC aggregate reports show how often your mail passes authentication and who is trying to spoof your
            domain. Review them weekly to catch problems early. Start with the{' '}
            <Link href={'/tools/dmarc-checker'}>DMARC checker</Link> if you are not sure your policy is set up.
          </p>
        </InfoBox>
      </GuideSection>
    </GuideLayout>
  );
}

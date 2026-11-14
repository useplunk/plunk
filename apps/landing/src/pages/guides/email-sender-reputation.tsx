import {Megaphone, Receipt, ShieldCheck} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  GuideCompare,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideSteps,
  GuideTable,
  InfoBox,
} from '../../components/guides';
import {SnippetRow, SnippetTile, StatusPill, UICard} from '../../components/snippets';

/**
 * Bounce and complaint rates against their limits, for one domain. Each bar is
 * scaled so the limit sits at 80% of its width, which puts both rates on the
 * same footing however different the numbers are.
 */
function ReputationCardFragment() {
  const rates = [
    {label: 'Bounce rate', value: '0.4%', limit: 'Limit 2%', fill: 16},
    {label: 'Complaint rate', value: '0.03%', limit: 'Limit 0.1%', fill: 24},
  ];

  return (
    <UICard className={'w-full max-w-sm p-5'}>
      <div className={'flex items-center justify-between gap-3'}>
        <div className={'min-w-0'}>
          <p className={'truncate text-ui font-semibold text-neutral-900'}>Sending reputation</p>
          <p className={'truncate text-label text-neutral-500'}>acme.com · last 30 days</p>
        </div>
        <StatusPill tone={'ok'}>Healthy</StatusPill>
      </div>
      <dl className={'mt-5 flex flex-col gap-4 border-t border-neutral-100 pt-5'}>
        {rates.map(rate => (
          <div key={rate.label}>
            <div className={'flex items-baseline justify-between text-ui'}>
              <dt className={'text-neutral-600'}>{rate.label}</dt>
              <dd className={'font-semibold text-neutral-900 tabular-nums'}>{rate.value}</dd>
            </div>
            <div className={'relative mt-2 h-1.5 rounded-full bg-neutral-100'}>
              <div className={'h-full rounded-full bg-ok'} style={{width: `${rate.fill}%`}} />
              <span aria-hidden className={'absolute -top-1 left-[80%] h-3.5 w-px bg-neutral-500'} />
            </div>
            <p className={'mt-1.5 text-right text-label text-neutral-500'}>{rate.limit}</p>
          </div>
        ))}
        <div className={'flex items-baseline justify-between border-t border-neutral-100 pt-4 text-ui'}>
          <dt className={'text-neutral-600'}>Delivered</dt>
          <dd className={'font-semibold text-neutral-900 tabular-nums'}>99.1%</dd>
        </div>
      </dl>
    </UICard>
  );
}

/** A warm-up plan in progress: the weeks done, this week, and the ramp still to come. */
function WarmupFragment() {
  const weeks = [
    {week: 'Week 1', volume: '200 to 500', fill: 8},
    {week: 'Week 2', volume: '500 to 1,000', fill: 15},
    {week: 'Week 3', volume: '1,000 to 5,000', fill: 28},
    {week: 'Week 4', volume: '5,000 to 10,000', fill: 40},
    {week: 'Week 5', volume: '10,000 to 20,000', fill: 52},
    {week: 'Week 6', volume: '20,000 to 50,000', fill: 66},
    {week: 'Week 7', volume: '50,000 to 100,000', fill: 82},
    {week: 'Week 8+', volume: 'Full volume', fill: 100},
  ];
  const current = 2;

  return (
    <UICard className={'w-full max-w-lg p-5'}>
      <div className={'flex items-center justify-between gap-3'}>
        <div className={'min-w-0'}>
          <p className={'truncate text-ui font-semibold text-neutral-900'}>Warm-up plan</p>
          <p className={'truncate text-label text-neutral-500'}>news.acme.com · emails per day</p>
        </div>
        <StatusPill tone={'ok'}>On track</StatusPill>
      </div>
      <ul className={'mt-5 flex flex-col gap-2.5 border-t border-neutral-100 pt-5'}>
        {weeks.map((w, i) => (
          <li key={w.week} className={'grid grid-cols-[4rem_1fr_7.5rem] items-center gap-3'}>
            <span className={`text-label ${i === current ? 'font-semibold text-neutral-900' : 'text-neutral-500'}`}>
              {w.week}
            </span>
            <span className={'h-2 rounded-full bg-neutral-100'}>
              <span
                className={`block h-full rounded-full ${
                  i < current ? 'bg-neutral-900' : i === current ? 'bg-ok' : 'bg-neutral-300'
                }`}
                style={{width: `${w.fill}%`}}
              />
            </span>
            <span
              className={`text-right text-label tabular-nums ${
                i === current ? 'font-semibold text-neutral-900' : 'text-neutral-500'
              }`}
            >
              {w.volume}
            </span>
          </li>
        ))}
      </ul>
    </UICard>
  );
}

/** Two sending subdomains, each with its own reputation. */
function DomainSplitFragment() {
  return (
    <UICard className={'w-full max-w-sm divide-y divide-neutral-100'}>
      <div className={'p-4'}>
        <SnippetRow
          icon={Receipt}
          label={'Transactional'}
          title={'transact.acme.com'}
          trailing={<StatusPill tone={'ok'}>Healthy</StatusPill>}
        />
      </div>
      <div className={'p-4'}>
        <SnippetRow
          icon={Megaphone}
          label={'Marketing'}
          title={'news.acme.com'}
          trailing={<StatusPill tone={'warn'}>At risk</StatusPill>}
        />
      </div>
    </UICard>
  );
}

export default function EmailSenderReputation() {
  return (
    <GuideLayout
      slug={'email-sender-reputation'}
      title="Email Sender Reputation: How to Build and Protect It"
      heading={'Email sender reputation'}
      description="Learn how sender reputation works, what affects it, and proven strategies to build and maintain a positive reputation for maximum deliverability."
      lead={
        'Sender reputation is how far mailbox providers trust your domain and IP address. It is the biggest single factor in whether your email reaches the inbox, and it is built from complaints, bounces, engagement and authentication.'
      }
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/email-sender-reputation"
      cta={'Protect the reputation you build.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <ReputationCardFragment />
            <UICard className={'ml-10 w-full max-w-xs p-3'}>
              <SnippetRow
                icon={ShieldCheck}
                label={'Authentication'}
                title={'SPF, DKIM and DMARC'}
                trailing={<StatusPill tone={'ok'}>Pass</StatusPill>}
              />
            </UICard>
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'what-is-sender-reputation'} title={'What sender reputation is'}>
        <p>
          Gmail, Outlook and Yahoo each score your sending domain and IP address, typically on a scale of 0 to 100. The
          score comes from your sending history, engagement, spam complaints, authentication and list quality. Think of
          it as a credit score for email: a good one gets you into the inbox, a bad one gets you filtered or blocked.
        </p>
        <GuideTable
          head={['Score', 'Rating', 'What happens']}
          rows={[
            ['80 to 100', 'Excellent', 'Strong inbox placement. A trusted sender with high engagement and proper authentication.'],
            ['50 to 79', 'Moderate', 'Mixed signals. Some email reaches spam.'],
            ['Below 50', 'Poor', 'Most email goes to spam or is blocked.'],
          ]}
        />
        <p>Providers track two reputations, and both matter:</p>
        <GuideCompare
          items={[
            {
              title: 'Domain reputation',
              body: 'Tied to yourdomain.com and follows you wherever you send from.',
              points: ['More permanent', 'Cannot be escaped by changing provider'],
            },
            {
              title: 'IP reputation',
              body: 'Tied to the server address your mail leaves from.',
              points: ['Changes if you switch IPs', 'A new IP has to be rebuilt from zero'],
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'what-affects-reputation'} title={'What affects it'}>
        <GuideTable
          head={['Factor', 'Impact', 'What to aim for']}
          rows={[
            [
              'Spam complaints',
              'Critical',
              'Below 0.1%, or 1 complaint per 1,000 emails. Even 0.3% is concerning. Send only to opted-in people and make unsubscribing easy.',
            ],
            [
              'Spam trap hits',
              'Critical',
              'Zero. Traps exist to catch poor practices and can get you blacklisted at once. Never buy lists.',
            ],
            [
              'Blacklist status',
              'Critical',
              'Not listed. A listing on Spamhaus, Barracuda or SURBL can block delivery to whole domains.',
            ],
            [
              'Engagement',
              'Very high',
              'Opens, clicks, replies and forwards show people want your email. Deletes without reading count against you.',
            ],
            [
              'Bounce rate',
              'High',
              <>
                Below 2% overall. Hard bounces point to bad lists or spam traps. See{' '}
                <Link href={'/guides/email-bounce-rate'}>email bounce rate</Link>.
              </>,
            ],
            [
              'Authentication',
              'High',
              <>
                <Link href={'/guides/what-is-spf'}>SPF</Link>, <Link href={'/guides/what-is-dkim'}>DKIM</Link> and{' '}
                <Link href={'/guides/what-is-dmarc'}>DMARC</Link> all in place. Missing records raise red flags.
              </>,
            ],
            ['Volume and consistency', 'Moderate', 'Steady sending. Sudden spikes, or long gaps followed by huge blasts, look suspicious.'],
            ['Content', 'Moderate', 'Subject lines that match the email. No piles of links or all caps.'],
            ['Sending history', 'Cumulative', 'New domains and IPs have no history and need a warm-up of 4 to 8 weeks.'],
          ]}
        />
      </GuideSection>

      <GuideSection id={'building-reputation'} title={'How to build a reputation'}>
        <p>A new domain or IP starts with no reputation at all. Building one takes patience:</p>
        <GuideSteps
          steps={[
            {
              title: 'Set up authentication first',
              body: 'Publish SPF, DKIM and DMARC before you send anything. It is the minimum providers expect.',
            },
            {
              title: 'Warm up gradually',
              body: 'Increase volume over 4 to 8 weeks, starting small. Adjust the pace to your engagement and bounce rates.',
            },
            {
              title: 'Start with your most engaged subscribers',
              body: 'Send early mail only to people who recently opened or clicked. Strong engagement at the start builds trust fastest.',
            },
            {
              title: 'Use double opt-in',
              body: 'Confirm every new address before it joins your list. It keeps spam traps out from day one.',
            },
            {
              title: 'Send on a regular schedule',
              body: 'Daily or weekly, not sporadic blasts. Consistency is what providers learn to trust.',
            },
            {
              title: 'Deliver what you promised',
              body: 'Your first emails set the tone. Good engagement on them speeds everything up.',
            },
            {
              title: 'Watch your metrics',
              body: 'Track bounces, complaints and engagement during warm-up. If they slip, slow down and clean your list.',
            },
          ]}
        />
        <GuideFigure caption={'An example warm-up: volume roughly doubles each week until you reach your normal volume.'}>
          <WarmupFragment />
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'maintaining-reputation'} title={'Keeping it healthy'}>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Clean your list every 6 to 12 months',
              body: 'Run a re-engagement campaign for inactive subscribers and remove those who do not respond. Remove hard bounces immediately and soft bounces after 3 to 5 attempts.',
            },
            {
              title: 'Make unsubscribing easy',
              body: 'Add a clear one-click unsubscribe to every email, process it immediately without a confirmation step and honour it permanently. People who cannot unsubscribe mark you as spam instead.',
            },
            {
              title: 'Segment and personalize',
              body: 'Targeted email to the right group gets far more engagement, and engagement protects reputation.',
            },
            {
              title: 'Separate transactional and marketing mail',
              body: 'Send receipts from transact.yourdomain.com and newsletters from news.yourdomain.com, so a marketing problem never blocks a password reset.',
            },
          ]}
        />
        <GuideFigure caption={'A campaign that drew complaints hurts news.acme.com. Receipts on transact.acme.com keep arriving.'}>
          <DomainSplitFragment />
        </GuideFigure>
        <h3>What to check, and how often</h3>
        <GuideTable
          head={['Metric', 'Target', 'Check']}
          rows={[
            ['Delivery rate', '98% or more', 'Weekly'],
            ['Spam complaint rate', 'Below 0.1%', 'Weekly'],
            ['Bounce rate', 'Below 2%', 'Weekly'],
            ['Opens and clicks', 'Steady or rising', 'Weekly'],
            ['Blacklist status', 'Not listed', 'Monthly'],
            ['Sender Score', '80 or higher', 'Quarterly'],
          ]}
        />
        <InfoBox type={'success'} title={'Plunk watches your rates for you'}>
          <p>
            Plunk tracks bounce and complaint rates for every project, shows their health on your dashboard and warns you
            as either one approaches a threshold, before it starts costing you inbox placement.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'recovering-reputation'} title={'Recovering a damaged reputation'}>
        <p>Recovery is possible, but it takes time and discipline.</p>
        <GuideSteps
          steps={[
            {
              title: 'Find the cause',
              body: 'Look at recent campaigns for complaints, bounces and weak engagement, and check whether you are blacklisted. Fix the underlying problem first.',
            },
            {
              title: 'Clean your list hard',
              body: 'Remove bounced addresses, unengaged subscribers and anyone who has not opened in 6 months or more. The list shrinks; quality matters more than size.',
            },
            {
              title: 'Cut volume',
              body: 'Reduce sending by 50 to 70% and send only to your most engaged subscribers until trust returns.',
            },
            {
              title: 'Request delisting',
              body: 'Find out which blacklists you are on, fix what got you there, then use each list’s removal process. Be honest about what you changed.',
            },
            {
              title: 'Send email people want',
              body: 'Lead with useful content, not promotions. Engagement is what shows providers you have changed.',
            },
            {
              title: 'Be patient',
              body: 'Recovery typically takes 4 to 12 weeks of consistent good behaviour. Do not return to full volume before your metrics do.',
            },
          ]}
        />
        <InfoBox type={'warning'} title={'Severe damage may mean starting over'}>
          <p>
            With a Sender Score below 30, several blacklistings or blocks from major providers, recovery may not be
            practical. As a last resort, move to a new subdomain or IP and build its reputation from scratch.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'monitoring-tools'} title={'Tools to monitor reputation'}>
        <GuideTable
          head={['Tool', 'What it shows']}
          rows={[
            [
              <a key={'gpt'} href={'https://postmaster.google.com'} target={'_blank'} rel={'noopener noreferrer'}>
                Google Postmaster Tools
              </a>,
              'Free. Domain reputation, spam rate, authentication and encryption for mail sent to Gmail.',
            ],
            [
              <a
                key={'snds'}
                href={'https://sendersupport.olc.protection.outlook.com/snds/'}
                target={'_blank'}
                rel={'noopener noreferrer'}
              >
                Microsoft SNDS
              </a>,
              'Smart Network Data Services: how Microsoft sees your IPs, including spam complaints.',
            ],
            [
              <a
                key={'ss'}
                href={'https://www.validity.com/everest/senderscore/'}
                target={'_blank'}
                rel={'noopener noreferrer'}
              >
                Sender Score (Validity)
              </a>,
              'Free 0 to 100 score from industry data. The common benchmark for IP reputation.',
            ],
            [
              <a key={'mxt'} href={'https://mxtoolbox.com/blacklists.aspx'} target={'_blank'} rel={'noopener noreferrer'}>
                MXToolbox Blacklist Check
              </a>,
              'Whether your domain or IP is on a major blacklist. Check regularly to catch listings early.',
            ],
            [
              <a key={'talos'} href={'https://talosintelligence.com'} target={'_blank'} rel={'noopener noreferrer'}>
                Talos Intelligence
              </a>,
              'Cisco’s sender reputation data for your IP, with a delisting request process.',
            ],
            [
              <a
                key={'barracuda'}
                href={'https://www.barracudacentral.org/lookups'}
                target={'_blank'}
                rel={'noopener noreferrer'}
              >
                BarracudaCentral
              </a>,
              'Reputation and blacklist status on Barracuda’s network. Important for enterprise delivery.',
            ],
          ]}
        />
        <p>
          Reputation starts with authentication. Use the <Link href={'/tools/dmarc-checker'}>DMARC checker</Link> to
          confirm your domain has a valid policy, and read the{' '}
          <Link href={'/guides/email-deliverability'}>email deliverability guide</Link> for the rest of the picture.
        </p>
      </GuideSection>
    </GuideLayout>
  );
}

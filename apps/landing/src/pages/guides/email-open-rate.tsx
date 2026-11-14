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
  InboxFragment,
  InfoBox,
  RateFragment,
  CampaignStatsFragment,
} from '../../components/guides';
import {SnippetTile, StatusPill, UICard} from '../../components/snippets';

const faqs: FAQ[] = [
  {
    question: 'What is a good email open rate?',
    answer:
      'It depends on your industry and the type of email. For B2B email, 25-35% is excellent; for B2C marketing email, 20-30% is strong. Industry averages sit between 20% and 30%, although Apple Mail Privacy Protection has inflated reported rates by 5-15 percentage points since 2021. Compare against your own history rather than industry averages alone.',
  },
  {
    question: 'What are average B2B email open rates?',
    answer:
      'B2B open rates typically range from 20-30%, and top campaigns reach 35-45%. B2B tends to beat B2C because recipients signed up for professional reasons and have higher intent. By industry: SaaS averages 22-28%, financial services 20-25% and professional services 25-30%. Transactional B2B email such as invoices and notifications often goes over 50%.',
  },
  {
    question: 'How do I improve my email open rate?',
    answer:
      'Write specific subject lines under 50 characters. Personalize beyond first names using behavior and purchase history. Send at the right time (Tuesday to Thursday, 10am to 2pm for B2B). Segment your list so each group gets relevant content. Remove inactive subscribers. Use a sender name people recognize, and write preview text that complements the subject line.',
  },
  {
    question: 'Why are my email open rates low?',
    answer:
      'The usual causes are weak subject lines, too many inactive subscribers dragging down the average, emails landing in spam because of deliverability or authentication problems, bad send timing, sending so often that people tune out, and poor segmentation. Work through each one and A/B test one change at a time.',
  },
  {
    question: 'Does Apple Mail Privacy Protection affect open rates?',
    answer:
      'Yes. Apple Mail Privacy Protection (MPP), launched with iOS 15 in 2021, preloads images and tracking pixels, so an open is recorded even if nobody read the email. This inflates open rates by 5-15 percentage points across the industry. Rely more on click-through rate and conversions, and segment by email client to see real engagement.',
  },
];

export default function EmailOpenRate() {
  return (
    <GuideLayout
      slug={'email-open-rate'}
      title="Email Open Rate: Benchmarks & How to Improve It"
      heading={'Email open rate'}
      description="Learn what affects email open rates, industry benchmarks by sector, B2B vs B2C averages, and proven tactics to improve your open rates. Complete guide with actionable tips."
      lead={
        'Open rate is the share of delivered emails that get opened. Most industries average 20-30%, and it mostly tells you how well your subject line, sender name and timing work.'
      }
      lastUpdated="2025-12-20"
      readTime="8 min"
      canonical="https://www.useplunk.com/guides/email-open-rate"
      faqs={faqs}
      cta={'Send email people open.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <CampaignStatsFragment highlight={'Opened'} className={'w-full max-w-lg'} />
            <RateFragment
              label={'Open rate'}
              value={'46%'}
              fill={46}
              marker={{at: 25, label: 'Industry average 20-30%'}}
              className={'ml-10 w-full max-w-xs'}
            />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'what-is-open-rate'} title={'How open rate is calculated'}>
        <p>
          Divide unique opens by the number of emails delivered (sent minus bounces), then multiply by 100. It is one of
          the main email marketing metrics, and still a useful one despite the privacy changes covered below.
        </p>
        <GuideCode
          title={'Open rate'}
          copy={false}
          code={`Open rate = (Unique opens ÷ Emails delivered) × 100

Sent: 1,000   Bounced: 50   Delivered: 950   Unique opens: 285
Open rate = (285 ÷ 950) × 100 = 30%`}
        />
        <p>
          Use unique opens, which count each recipient once however many times they open. Total opens count every open
          and inflate the number.
        </p>
      </GuideSection>

      <GuideSection id={'benchmarks'} title={'Open rate benchmarks by industry'}>
        <p>Open rates vary a lot by industry, audience and type of email.</p>
        <GuideTable
          head={['Industry', 'Average open rate', 'Good open rate']}
          rows={[
            ['SaaS / Technology', '20-25%', '30%+'],
            ['E-commerce / Retail', '15-20%', '25%+'],
            ['Financial services', '18-23%', '28%+'],
            ['Healthcare', '20-25%', '30%+'],
            ['Education', '22-28%', '33%+'],
            ['Media / Publishing', '18-23%', '28%+'],
            ['Non-profit', '24-30%', '35%+'],
          ]}
        />
        <InfoBox type={'warning'} title={'Benchmarks shifted in 2021'}>
          <p>
            Since Apple Mail Privacy Protection launched, open rates across the industry have risen by 5-15 percentage
            points without anyone reading more. Compare against your own history, not only these numbers.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'b2b-email-open-rates'} title={'B2B email open rates'}>
        <p>
          B2B email consistently beats B2C benchmarks. Recipients signed up because of a real professional need, so they
          are a more engaged audience.
        </p>
        <GuideTable
          head={['B2B industry', 'Average open rate', 'Top performers']}
          rows={[
            ['SaaS / Technology', '22-28%', '35%+'],
            ['Professional services', '25-32%', '40%+'],
            ['Financial services', '20-26%', '33%+'],
            ['Agency / Marketing', '18-24%', '30%+'],
            ['Transactional / Receipts', '45-65%', '70%+'],
          ]}
        />
        <h3>What works for B2B</h3>
        <GuidePoints
          tone={'do'}
          columns={2}
          items={[
            {title: 'Send midweek', body: 'Tuesday to Thursday, 10am to 2pm in the recipient’s timezone.'},
            {title: 'Name the company or product', body: 'A familiar name in the subject line gets recognized.'},
            {title: 'Personalize by role', body: 'Use job title, industry or company size.'},
            {title: 'Speak to their problem', body: 'Reference pain points specific to their role.'},
            {title: 'Send less to cold lists', body: 'One or two emails a month.'},
          ]}
        />
        <h3>How B2B differs from B2C</h3>
        <ul>
          <li>Decisions are more considered, so longer subject lines are acceptable.</li>
          <li>B2B audiences check email less on weekends.</li>
          <li>Recipients share inboxes with colleagues, which affects metrics.</li>
          <li>Unsubscribe rates are lower: 0.1-0.3% against 0.3-0.5%.</li>
          <li>Transactional email such as invoices and updates gets far more opens.</li>
        </ul>
        <InfoBox type={'tip'} title={'Report transactional and marketing email separately'}>
          <p>
            Invoices, notifications and password resets reach 40-60% open rates. Mixed in with campaigns, they make your
            marketing numbers look better than they are.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'factors'} title={'What affects open rate'}>
        <p>
          The subject line matters most. It should be specific and relevant, and create curiosity without being
          clickbait. Before that, people check who the email is from.
        </p>
        <GuideFigure
          caption={'A recognizable sender and a specific subject get opened. Generic and clickbait stay unread.'}
        >
          <InboxFragment
            rows={[
              {
                sender: 'Acme Billing',
                subject: 'John, your invoice is ready',
                time: '9:41',
                tag: {tone: 'ok', label: 'Opened'},
              },
              {
                sender: 'Ana from Acme',
                subject: '3 proven ways to increase conversion rates',
                time: '9:12',
                tag: {tone: 'ok', label: 'Opened'},
              },
              {sender: 'noreply@acme.com', subject: 'Newsletter #47', time: '8:30', unread: true},
              {sender: 'Acme', subject: 'You won’t believe this!', time: 'Mon', unread: true},
            ]}
          />
        </GuideFigure>
        <GuidePoints
          items={[
            {title: 'Subject line', body: 'Personal and specific beats vague. “John, your invoice is ready” is clear.'},
            {
              title: 'Sender name',
              body: '“Acme” or “Ana from Acme” works better than noreply@acme.com.',
            },
            {
              title: 'Send time and day',
              body: 'B2B does best Tuesday to Thursday, 10am to 2pm. B2C varies, so test evenings and weekends. Avoid Monday mornings and Friday afternoons.',
            },
            {
              title: 'List quality and segmentation',
              body: 'Engaged subscribers open more. Inactive ones drag the rate down: re-engage or remove them.',
            },
            {
              title: 'Deliverability and reputation',
              body: (
                <>
                  Email in spam does not get opened. Authenticate with <Link href={'/guides/what-is-spf'}>SPF</Link>,{' '}
                  <Link href={'/guides/what-is-dkim'}>DKIM</Link> and <Link href={'/guides/what-is-dmarc'}>DMARC</Link>,
                  and keep complaints low.
                </>
              ),
            },
            {
              title: 'Frequency',
              body: 'Too often causes fatigue and unsubscribes; too rarely and people forget you. One to four marketing emails a week is typical.',
            },
            {
              title: 'Mobile',
              body: 'Over 60% of email is opened on mobile. Keep subject lines to 40-50 characters and write clear preview text.',
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'improve-open-rates'} title={'How to improve your open rate'}>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Write better subject lines',
              body: 'Try questions, personalization, numbers and honest urgency. Keep them under 50 characters and A/B test.',
            },
            {
              title: 'Personalize beyond first names',
              body: 'Use behavior, past purchases, browsing history or location. “Products you recently viewed” beats a generic blast.',
            },
            {
              title: 'Segment your audience',
              body: 'Group by engagement, purchase history, demographics or interests. Segmented campaigns see 14-100% higher open rates.',
            },
            {
              title: 'Write the preview text',
              body: 'It sits next to the subject line. Use it to add context, not “View this email in your browser”.',
            },
            {
              title: 'Clean your list',
              body: (
                <>
                  Remove subscribers who have not engaged in 6-12 months. The list gets smaller, but open rate and
                  sender reputation improve. <Link href={'/tools/verify-email'}>Verify addresses</Link> before they get
                  in.
                </>
              ),
            },
            {
              title: 'Test send times',
              body: 'Send the same email at different times and see when your audience responds. Send time optimization can lift opens by 20-50%.',
            },
            {
              title: 'Re-engage before removing',
              body: 'Send a “Still interested?” email, perhaps with an offer. Remove those who still do not engage.',
            },
            {
              title: 'Keep your sender name consistent',
              body: 'People open names they recognize. Avoid changing it.',
            },
          ]}
        />
        <GuideFigure caption={'Same email, two subject lines. The specific one won by seven points.'}>
          <SubjectTestFragment />
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'apple-mpp'} title={'Apple Mail Privacy Protection'}>
        <p>
          Since iOS 15, Apple Mail preloads every image and tracking pixel when a message arrives. An open is recorded
          whether or not the person ever sees the email, so open tracking is unreliable for Apple Mail users.
        </p>
        <GuideFigure
          caption={'Over half the opens came from Apple Mail, which loads images for every message it receives.'}
        >
          <OpensByClientFragment />
        </GuideFigure>
        <GuideCompare
          items={[
            {
              title: 'What changed',
              points: [
                'Apple Mail preloads all images',
                'Opens are recorded even if the email is never seen',
                '30-50% of lists use Apple Mail',
                'Open rates look 5-15% higher than reality',
                'Open-based automation is less accurate',
              ],
            },
            {
              title: 'How to adapt',
              points: [
                'Make click rate the main engagement metric',
                'Track conversions and replies, not only opens',
                'Use multi-touch attribution',
                'Compare against your own history',
                'Segment by email client',
              ],
            },
          ]}
        />
        <p>
          With opens less reliable, put more weight on{' '}
          <Link href={'/guides/email-click-through-rate'}>click-through rate</Link>, conversion rate, reply rate and
          revenue per email. They show real engagement and return.
        </p>
      </GuideSection>
    </GuideLayout>
  );
}

/** An A/B test on the subject line, finished, with the winner marked. */
function SubjectTestFragment() {
  const variants = [
    {name: 'A', subject: 'Acme newsletter #47', rate: 31.2, winner: false},
    {name: 'B', subject: '3 ways to cut churn this quarter', rate: 38.6, winner: true},
  ];

  return (
    <UICard className={'w-full max-w-md divide-y divide-neutral-100'}>
      <div className={'flex items-center justify-between gap-3 px-4 py-3'}>
        <p className={'text-ui font-semibold text-neutral-900'}>Subject line test</p>
        <span className={'text-label text-neutral-500'}>2,000 contacts each</span>
      </div>
      {variants.map(v => (
        <div key={v.name} className={'px-4 py-3.5'}>
          <div className={'flex items-center gap-3'}>
            <span
              className={
                'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100 text-label font-semibold text-neutral-700'
              }
            >
              {v.name}
            </span>
            <p
              className={`min-w-0 flex-1 truncate text-ui ${v.winner ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}
            >
              {v.subject}
            </p>
            {v.winner && <StatusPill tone={'ok'}>Winner</StatusPill>}
            <span className={'flex-shrink-0 text-ui font-semibold tabular-nums text-neutral-900'}>{v.rate}%</span>
          </div>
          <div className={'ml-9 mt-2.5 h-1.5 rounded-full bg-neutral-100'}>
            <div
              className={`h-full rounded-full ${v.winner ? 'bg-neutral-900' : 'bg-neutral-300'}`}
              style={{width: `${v.rate * 2}%`}}
            />
          </div>
        </div>
      ))}
    </UICard>
  );
}

/** Where a campaign's opens came from, by mail client. */
function OpensByClientFragment() {
  const clients = [
    {name: 'Apple Mail', opens: 3020, share: 53, auto: true},
    {name: 'Gmail', opens: 1890, share: 33, auto: false},
    {name: 'Outlook', opens: 640, share: 11, auto: false},
    {name: 'Other', opens: 191, share: 3, auto: false},
  ];

  return (
    <UICard className={'w-full max-w-md divide-y divide-neutral-100'}>
      <div className={'flex items-center justify-between gap-3 px-4 py-3'}>
        <p className={'text-ui font-semibold text-neutral-900'}>Opens by client</p>
        <span className={'text-label tabular-nums text-neutral-500'}>5,741 opens</span>
      </div>
      {clients.map(c => (
        <div key={c.name} className={'flex items-center gap-3 px-4 py-3'}>
          <span className={'w-24 flex-shrink-0 text-ui font-medium text-neutral-900'}>{c.name}</span>
          <div className={'h-1.5 min-w-0 flex-1 rounded-full bg-neutral-100'}>
            <div
              className={`h-full rounded-full ${c.auto ? 'bg-warn' : 'bg-neutral-900'}`}
              style={{width: `${c.share}%`}}
            />
          </div>
          {c.auto && <StatusPill tone={'warn'}>Preloaded</StatusPill>}
          <span className={'w-12 flex-shrink-0 text-right text-ui tabular-nums text-neutral-600'}>
            {c.opens.toLocaleString('en-US')}
          </span>
        </div>
      ))}
    </UICard>
  );
}

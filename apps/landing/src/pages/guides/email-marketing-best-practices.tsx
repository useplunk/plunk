import {Filter, MailCheck} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  GuideCompare,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideTable,
  InboxFragment,
  InfoBox,
} from '../../components/guides';
import {
  Avatar,
  SegmentCampaignFragment,
  SnippetRow,
  SnippetTile,
  StatusPill,
  TimeAgo,
  UICard,
} from '../../components/snippets';

export default function EmailMarketingBestPractices() {
  return (
    <GuideLayout
      slug={'email-marketing-best-practices'}
      title="Email Marketing Best Practices: The Complete Guide"
      heading={'Email marketing best practices'}
      description="Master email marketing with proven best practices for content, design, timing, deliverability, and compliance."
      lead={
        'Mail people who asked for it, send each segment something worth opening, test one change at a time and follow the law. Done well, email returns an average of $36 to $42 for every $1 spent.'
      }
      lastUpdated="2025-12-20"
      readTime="10 min"
      canonical="https://www.useplunk.com/guides/email-marketing-best-practices"
      cta={'Campaigns your subscribers asked for.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <ConfirmationEmail className={'w-full max-w-sm'} />
            <UICard className={'ml-10 w-full max-w-xs p-4'}>
              <SnippetRow
                leading={<Avatar name={'Ana Ruiz'} />}
                title={'Ana Ruiz'}
                label={'Confirmed her email'}
                labelPosition={'below'}
                trailing={<StatusPill tone={'ok'}>Subscribed</StatusPill>}
              />
            </UICard>
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'list-building'} title={'Build your list with consent'}>
        <p>
          A small list of people who want your email beats a large one that does not. Every address you add without
          consent costs you opens, complaints and{' '}
          <Link href={'/guides/email-sender-reputation'}>sender reputation</Link>.
        </p>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Use double opt-in',
              body: 'Ask new subscribers to confirm their address. It keeps typos and fake signups off your list and cuts spam complaints.',
            },
            {
              title: 'Say what they will get',
              body: '“Get weekly tips on onboarding” beats “Subscribe to our newsletter”. State the topic and how often.',
            },
            {
              title: 'Put forms where people are',
              body: 'Your website, blog, checkout page, social profiles and in-person events.',
            },
            {
              title: 'Offer an incentive',
              body: 'An ebook, discount, template or exclusive content gives people a reason to sign up.',
            },
            {title: 'Keep forms short', body: 'Ask for an email address, and a name only if you will use it.'},
          ]}
        />
        <GuidePoints
          tone={'dont'}
          items={[
            {
              title: 'Buy lists',
              body: 'Purchased addresses never opted in. Expect spam complaints, bounces and a damaged reputation.',
            },
            {title: 'Pre-check the box', body: 'Subscribers must opt in themselves. Pre-checked boxes break GDPR.'},
            {title: 'Hide the terms', body: 'Be clear about what you send and how often before someone signs up.'},
          ]}
        />
        <InfoBox type={'success'} title={'Double opt-in in Plunk'}>
          <p>
            Create the contact as unsubscribed and send a confirmation email with the <code>{'{{subscribeUrl}}'}</code>{' '}
            link. One click subscribes them and fires an event you can start a welcome workflow from.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'content'} title={'Write emails people open'}>
        <p>
          The subject line decides whether an email gets opened. Keep it under 50 characters and say what is inside.
          More in the <Link href={'/guides/email-open-rate'}>open rate guide</Link>.
        </p>
        <GuideFigure caption={'Specific subjects tell the reader what they get. Vague ones get skipped.'}>
          <InboxFragment
            className={'w-full max-w-md'}
            rows={[
              {
                sender: 'Acme',
                subject: '5 proven strategies to reduce churn by 30%',
                time: '9:41',
                unread: true,
                tag: {tone: 'ok', label: 'Specific'},
              },
              {
                sender: 'Acme',
                subject: 'Last chance: sale ends tonight at midnight',
                time: '9:12',
                unread: true,
                tag: {tone: 'ok', label: 'Specific'},
              },
              {sender: 'Acme', subject: 'Newsletter #47', time: 'Tue', tag: {tone: 'warn', label: 'Vague'}},
              {sender: 'Acme', subject: 'Check this out!!!', time: 'Mon', tag: {tone: 'warn', label: 'Vague'}},
            ]}
          />
        </GuideFigure>
        <GuidePoints
          items={[
            {
              title: 'Personalize beyond the first name',
              body: 'Use purchase history, browsing activity and stated preferences. Personalized emails deliver 6x higher transaction rates than generic blasts.',
            },
            {
              title: 'One email, one goal',
              body: 'Give each email a single call to action. Several compete with each other and lower conversions.',
            },
            {
              title: 'Write for skimmers',
              body: 'Paragraphs of two or three sentences, bullet points, clear subheadings, white space, and bold for the key point.',
            },
            {
              title: 'Make the CTA specific',
              body: (
                <>
                  “Start your 14-day free trial”, not “Get started”. “Download the guide”, not “Click here”. Use a
                  button in a contrasting color, and add urgency only when it is real. See the{' '}
                  <Link href={'/guides/email-click-through-rate'}>click-through rate guide</Link>.
                </>
              ),
            },
            {
              title: 'Give something every time',
              body: 'An insight, a fix, exclusive content. Emails that only promote get unsubscribed.',
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'design'} title={'Design for mobile and every client'}>
        <GuidePoints
          columns={2}
          items={[
            {
              title: 'Mobile first',
              body: 'Over 60% of emails are opened on a phone. Use responsive templates and tap targets of at least 44×44px.',
            },
            {
              title: 'Light images with alt text',
              body: 'Compress images and write alt text, since many clients block them. Aim for 60/40 text to image, and never send image-only emails.',
            },
            {
              title: 'Consistent branding',
              body: 'Same colors, fonts, logo and voice every time, so readers recognize you. Build from templates.',
            },
            {
              title: 'Accessible',
              body: 'Contrast of 4.5:1 or more, body text of 14px or larger, descriptive link text and semantic HTML.',
            },
            {
              title: 'Tested across clients',
              body: 'Gmail, Outlook and Apple Mail render the same email differently. Check them all before the full send.',
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'timing'} title={'When and how often to send'}>
        <p>
          These are starting points. Your audience may behave differently, so A/B test send times and keep what the data
          supports.
        </p>
        <GuideTable
          head={['Audience', 'Try sending']}
          rows={[
            ['B2B', 'Tuesday to Thursday, 10 to 11am or 2 to 3pm'],
            ['B2C', 'Varies widely. Test evenings and weekends.'],
            ['Avoid', 'Monday mornings (inbox overload) and Friday afternoons'],
          ]}
        />
        <GuideTable
          head={['Frequency', 'Works for']}
          rows={[
            ['Daily', 'News, deals, or highly engaged communities only'],
            ['2 to 3 times a week', 'Engaged audiences, when you have fresh content'],
            ['Weekly', 'Most newsletters and content. The most common choice.'],
            ['Monthly', 'Curated content, with a risk of being forgotten'],
          ]}
        />
        <p>Watch unsubscribes when you send more often. If they spike, you have gone past what your list wants.</p>
      </GuideSection>

      <GuideSection id={'segmentation'} title={'Segment your list'}>
        <p>
          Segmented campaigns get 30% more opens and 50% more clicks than sending the same email to everyone. Group
          contacts by what you know about them, then write for each group.
        </p>
        <GuideFigure
          caption={'A segment is a rule, and the campaign goes to the people who match it, not the whole list.'}
        >
          <div className={'flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:items-start'}>
            <UICard className={'w-full max-w-xs p-4'}>
              <SnippetRow icon={Filter} label={'Segment'} title={'Pro customers'} />
              <ul className={'mt-3 flex flex-col gap-1.5 border-t border-neutral-100 pt-3 text-ui text-neutral-700'}>
                <li>Plan is Pro</li>
                <li>Opened an email in the last 90 days</li>
              </ul>
            </UICard>
            <SegmentCampaignFragment />
          </div>
        </GuideFigure>
        <GuidePoints
          columns={2}
          items={[
            {title: 'Demographics', body: 'Age, location, job title, company size.'},
            {title: 'Behavior', body: 'Purchases, browsing activity, email engagement.'},
            {title: 'Lifecycle stage', body: 'New subscriber, active customer, churned user.'},
            {title: 'Engagement', body: 'Highly engaged against inactive subscribers.'},
            {title: 'Preferences', body: 'Product interests, topics, preferred frequency.'},
            {title: 'Purchase recency', body: 'Recent buyers against lapsed customers.'},
          ]}
        />
        <p>Campaigns that only work with segments:</p>
        <ul>
          <li>A welcome series for new subscribers</li>
          <li>Re-engagement for inactive users, and win-back for churned customers</li>
          <li>Product recommendations based on past purchases</li>
          <li>Location-specific offers and events</li>
          <li>VIP campaigns for high-value customers</li>
        </ul>
      </GuideSection>

      <GuideSection id={'testing'} title={'Test one thing at a time'}>
        <GuideTable
          head={['Test', 'Variations to try']}
          rows={[
            ['Subject line', 'Length, personalization, question or statement, emoji'],
            ['Send time', 'Day of week, time of day, time zone'],
            ['Content', 'Long or short, text or image-heavy, tone'],
            ['CTA', 'Button text, color, placement, how many'],
            ['Sender name', 'Company name or a person’s name'],
            ['Personalization', 'Generic or personalized content'],
          ]}
        />
        <GuidePoints
          tone={'do'}
          columns={2}
          items={[
            {title: 'Change one variable', body: 'Otherwise you cannot tell what made the difference.'},
            {title: 'Use enough recipients', body: 'At least 1,000 per variant for a significant result.'},
            {title: 'Run it long enough', body: 'Let the test cover timing differences across the day.'},
            {title: 'Split at random', body: 'Not by hand-picked segments.'},
            {title: 'Ship the winner', body: 'Then test the next variable.'},
          ]}
        />
      </GuideSection>

      <GuideSection id={'compliance'} title={'Stay compliant'}>
        <p>
          Marketing email is regulated, and breaking the rules means fines and lost trust. The two laws most senders
          deal with:
        </p>
        <GuideCompare
          items={[
            {
              title: 'CAN-SPAM',
              badge: <StatusPill>United States</StatusPill>,
              points: [
                'No misleading subject lines or headers',
                'Include your physical mailing address',
                'Offer a clear, easy unsubscribe',
                'Honor unsubscribes within 10 business days',
                'Identify the email as an ad, where it is one',
              ],
            },
            {
              title: 'GDPR',
              badge: <StatusPill>European Union</StatusPill>,
              points: [
                'Get explicit consent before marketing email',
                'Explain how you use their data',
                'Let people access, change or delete their data',
                'Keep records of consent',
                'Secure the data you hold',
              ],
            },
          ]}
        />
        <GuideFigure
          caption={'The footer every marketing email needs: who you are, where you are, and a one-click way out.'}
        >
          <UnsubscribeFooter />
        </GuideFigure>
        <InfoBox type={'warning'} title={'When in doubt, get consent'}>
          <p>
            Laws vary by country. The safe approach is explicit, recorded consent before anyone joins your list, an easy
            unsubscribe, and acting on it right away. Not sure if an email counts as marketing? Read{' '}
            <Link href={'/guides/transactional-vs-marketing-email'}>transactional vs marketing email</Link>.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'metrics'} title={'Metrics to track'}>
        <p>Watch engagement to judge content, and health metrics to catch problems before inboxes do.</p>
        <GuideTable
          head={['Metric', 'Benchmark']}
          rows={[
            ['Open rate', '15 to 25% (industry average)'],
            ['Click-through rate', '2 to 5% (industry average)'],
            [
              <Link key={'bounce'} href={'/guides/email-bounce-rate'}>
                Bounce rate
              </Link>,
              'Under 2%',
            ],
            ['Unsubscribe rate', 'Under 0.5%'],
            ['Spam complaint rate', 'Under 0.1%'],
            ['Delivery rate', '98% or more'],
            ['Inbox placement rate', '95% or more'],
            [
              'Authentication',
              <React.Fragment key={'auth'}>
                <Link href={'/guides/what-is-spf'}>SPF</Link>, <Link href={'/guides/what-is-dkim'}>DKIM</Link> and{' '}
                <Link href={'/guides/what-is-dmarc'}>DMARC</Link> all passing
              </React.Fragment>,
            ],
            [
              <Link key={'reputation'} href={'/guides/email-sender-reputation'}>
                Sender reputation
              </Link>,
              'No fixed number. Monitor it regularly.',
            ],
          ]}
        />
        <p>And the ones you calculate yourself:</p>
        <GuidePoints
          columns={2}
          items={[
            {title: 'Click-to-open rate', body: 'Clicks divided by opens.'},
            {title: 'Conversion rate', body: 'Goal completions divided by delivered.'},
            {title: 'List growth rate', body: 'New subscribers against unsubscribes.'},
            {title: 'ROI', body: 'Revenue generated divided by cost.'},
            {title: 'Revenue per email', body: 'Total revenue divided by emails sent.'},
            {title: 'Customer lifetime value', body: 'The long-term value of a subscriber.'},
            {title: 'Cost per acquisition', body: 'What it costs to win a customer.'},
          ]}
        />
        <p>
          If delivery or inbox placement slips, start with the{' '}
          <Link href={'/guides/email-deliverability'}>deliverability guide</Link>, and run new campaigns through the{' '}
          <Link href={'/tools/spam-checker'}>spam checker</Link> before you send.
        </p>
      </GuideSection>
    </GuideLayout>
  );
}

/** The confirmation email a double opt-in sends: one line and one button. */
function ConfirmationEmail({className = ''}: {className?: string}) {
  return (
    <UICard className={`p-4 ${className}`}>
      <SnippetRow
        icon={MailCheck}
        label={'From Acme'}
        title={'Confirm your subscription'}
        trailing={<TimeAgo>now</TimeAgo>}
      />
      <div className={'mt-4 border-t border-neutral-100 pt-4'}>
        <p className={'text-ui text-neutral-700'}>Hi Ana, confirm your email to get our weekly onboarding tips.</p>
        <span className={'mt-4 inline-flex rounded-lg bg-neutral-900 px-3.5 py-2 text-ui font-semibold text-white'}>
          Confirm my email
        </span>
      </div>
    </UICard>
  );
}

/** The bottom of a marketing email. */
function UnsubscribeFooter() {
  return (
    <UICard className={'w-full max-w-sm overflow-hidden'}>
      <div className={'p-4'}>
        <p className={'text-ui font-semibold text-neutral-900'}>Acme Weekly</p>
        <p className={'mt-1 text-ui text-neutral-600'}>Three ways teams cut onboarding time this month.</p>
        <span className={'mt-3 inline-flex rounded-lg bg-neutral-900 px-3.5 py-2 text-ui font-semibold text-white'}>
          Read the issue
        </span>
      </div>
      <div className={'border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-center text-label text-neutral-500'}>
        <p>Acme Inc., 548 Market St, San Francisco, CA 94104</p>
        <p className={'mt-1'}>
          You signed up at acme.com. <span className={'font-medium text-neutral-900 underline'}>Unsubscribe</span>
        </p>
      </div>
    </UICard>
  );
}

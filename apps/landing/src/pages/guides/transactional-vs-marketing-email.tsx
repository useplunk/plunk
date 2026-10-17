import {KeyRound, Megaphone, Package, ShoppingCart} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  GuideCompare,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideTable,
  InfoBox,
} from '../../components/guides';
import {SnippetRow, SnippetTile, StatusPill, TimeAgo, UICard} from '../../components/snippets';

export default function TransactionalVsMarketingEmail() {
  return (
    <GuideLayout
      slug={'transactional-vs-marketing-email'}
      title="Transactional vs Marketing Email: Key Differences"
      heading={'Transactional vs marketing email'}
      description="Understand the critical differences between transactional and marketing emails, including legal requirements, deliverability, and best practices."
      lead={
        'Transactional email is triggered by something a user did and carries information they need, like a password reset or a receipt. Marketing email promotes something, needs consent and must include an unsubscribe link.'
      }
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/transactional-vs-marketing-email"
      cta={'Send both from one place.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <EmailCard
              icon={KeyRound}
              from={'Acme'}
              subject={'Reset your password'}
              type={{tone: 'neutral', label: 'Transactional'}}
              body={'Someone asked to reset the password for ana@ruiz.com. The link expires in 30 minutes.'}
              footer={'No unsubscribe link needed'}
              className={'w-full max-w-sm'}
            />
            <EmailCard
              icon={Megaphone}
              from={'Acme'}
              subject={'What’s new in October'}
              type={{tone: 'neutral', label: 'Marketing'}}
              body={'Three features we shipped this month, and how teams are using them.'}
              footer={<span className={'font-medium text-neutral-900 underline'}>Unsubscribe</span>}
              className={'ml-10 w-full max-w-sm'}
            />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'comparison'} title={'The quick comparison'}>
        <GuideCompare
          items={[
            {
              title: 'Transactional',
              body: 'Sent because the user did something. They expect it and need it.',
              points: [
                'Password resets, receipts, shipping updates',
                'No consent or unsubscribe link needed',
                'Sent within seconds',
              ],
            },
            {
              title: 'Marketing',
              body: 'Sent because you want to promote something. They chose to receive it.',
              points: [
                'Newsletters, announcements, offers',
                'Needs opt-in and an unsubscribe link',
                'Sent on a schedule',
              ],
            },
          ]}
        />
        <GuideTable
          head={['', 'Transactional', 'Marketing']}
          rows={[
            [
              'Purpose',
              'Complete a transaction or deliver service information',
              'Promote products, services or content',
            ],
            ['Trigger', 'A user action or system event', 'A schedule or campaign'],
            ['Consent', 'Not required, it is part of the service', 'Explicit opt-in required'],
            ['Unsubscribe link', 'Not required', 'Required by law'],
            ['Open rate', '60 to 80%', '15 to 25% on average'],
            ['Volume', 'Lower, event-based', 'Higher, scheduled campaigns'],
          ]}
        />
      </GuideSection>

      <GuideSection id={'transactional'} title={'What is transactional email?'}>
        <p>
          Automated messages sent in response to a user action or system event, carrying information the user needs to
          complete a transaction or use a service. Most are sent through an{' '}
          <Link href={'/guides/email-api-guide'}>email API</Link>.
        </p>
        <GuideTable
          head={['Category', 'Examples']}
          rows={[
            [
              'Account and authentication',
              'Welcome after signup, email verification, password resets, login notifications, two-factor codes, account deletion',
            ],
            ['Commerce', 'Order confirmations, shipping and delivery updates, payment receipts, refunds, invoices'],
            [
              'Notifications and alerts',
              'Activity and mention alerts, security alerts, system status, subscription renewals, trial expiry notices',
            ],
            [
              'Account management',
              'Billing statements, usage reports, account updates, plan changes, deactivation notices',
            ],
          ]}
        />
        <GuideFigure
          caption={'A good transactional email: a subject that says what happened, and every detail the user needs.'}
        >
          <OrderShippedEmail />
        </GuideFigure>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Send immediately',
              body: 'Within seconds or minutes of the action. Delays cause anxiety and support tickets.',
            },
            {
              title: 'Be complete and accurate',
              body: 'Order numbers, amounts, dates, tracking links. Errors here cost more trust than anywhere else.',
            },
            {
              title: 'Use descriptive subjects',
              body: '“Your order #12345 has shipped”, not “Update from Acme”.',
            },
            {
              title: 'Keep promotion minimal',
              body: 'A small cross-sell at the bottom is fine. Turning a receipt into a sales email is not.',
            },
            {
              title: 'Protect deliverability',
              body: 'Users depend on these. Keep marketing problems from affecting them by sending on separate infrastructure.',
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'marketing'} title={'What is marketing email?'}>
        <p>
          Promotional messages sent to build relationships, drive engagement and win conversions. Recipients must opt in
          first.
        </p>
        <GuideTable
          head={['Category', 'Examples']}
          rows={[
            [
              'Promotions',
              'Product announcements, sales and discounts, feature launches, seasonal campaigns, flash sales',
            ],
            [
              'Content',
              'Newsletters, blog roundups, educational content, industry news, case studies, webinar invites',
            ],
            [
              'Nurture',
              'Welcome series (after the first email), onboarding sequences, re-engagement, win-back, surveys, loyalty updates',
            ],
            [
              'Lifecycle',
              'Abandoned cart reminders, product recommendations, upsells, birthday emails, promotional renewal reminders, review requests',
            ],
          ]}
        />
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Get explicit consent',
              body: 'Clear opt-in forms, ideally double opt-in. Never add people without permission or use purchased lists.',
            },
            {
              title: 'Give value, not only offers',
              body: 'Mix promotion with useful content. Subscribers who only get sales pitches leave.',
            },
            {
              title: 'Segment your audience',
              body: 'Target by behavior, preferences, demographics or engagement. Segmented campaigns see 3x the engagement of mass blasts.',
            },
            {
              title: 'Make unsubscribing easy',
              body: 'A clear one-click link in every email. Hard-to-find links turn into spam complaints, which hurt far more.',
            },
            {
              title: 'Test and optimize',
              body: 'A/B test subject lines, send times, content and CTAs.',
            },
          ]}
        />
        <p>
          The full list is in{' '}
          <Link href={'/guides/email-marketing-best-practices'}>email marketing best practices</Link>.
        </p>
      </GuideSection>

      <GuideSection id={'legal'} title={'Legal requirements'}>
        <p>
          Transactional email is exempt from most of the rules marketing email has to follow. That is exactly why the
          line matters.
        </p>
        <GuideTable
          head={['Rule', 'Transactional', 'Marketing']}
          rows={[
            ['Consent (GDPR)', 'Allowed as legitimate interest for providing the service', 'Explicit opt-in required'],
            ['Unsubscribe link (CAN-SPAM)', 'Not required', 'Required, honored within 10 business days'],
            ['Physical mailing address (CAN-SPAM)', 'Not required', 'Required'],
            ['Identify as advertisement (CAN-SPAM)', 'Not required', 'Required'],
            ['Truthful headers and subject', 'Required', 'Required'],
            ['Records of consent (GDPR)', 'Not required', 'Required'],
            [
              'Data rights (GDPR)',
              'Protect user data; allow opting out of optional notifications',
              'Clear data use, easy opt-out, right to access and deletion',
            ],
          ]}
        />
        <InfoBox type={'warning'} title={'Don’t disguise marketing as transactional'}>
          <p>
            Dressing a promotion up as a transactional email to skip consent is illegal, and regulators and inbox
            providers look for it. Keep transactional emails functional.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'infrastructure'} title={'Send them separately'}>
        <p>
          A campaign that draws complaints should never delay a password reset. Keep the two apart so each has its own{' '}
          <Link href={'/guides/email-sender-reputation'}>reputation</Link>.
        </p>
        <GuideFigure caption={'Two subdomains, two reputations, tracked on different numbers.'}>
          <SendingDomains />
        </GuideFigure>
        <GuidePoints
          items={[
            {
              title: 'Separate subdomains',
              body: 'For example mail.acme.com or transact.acme.com for transactional, news.acme.com or marketing.acme.com for marketing.',
            },
            {
              title: 'Dedicated IPs at high volume',
              body: 'Above 100,000 emails a month, use separate dedicated IPs for each type, warm new IPs up properly and monitor each one.',
            },
            {
              title: 'Separate metrics',
              body: (
                <>
                  Transactional: delivery rate (target 99% or more), delivery speed and{' '}
                  <Link href={'/guides/email-bounce-rate'}>bounce rate</Link>. Marketing: opens, clicks, conversions and
                  unsubscribes.
                </>
              ),
            },
          ]}
        />
        <InfoBox type={'success'} title={'Plunk keeps the types apart'}>
          <p>
            Every Plunk template has a type. Marketing templates get an unsubscribe footer and skip unsubscribed
            contacts; transactional templates reach everyone they are sent to.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'gray-area'} title={'The gray area'}>
        <p>
          Some emails can be either, depending on what is in them. If you are unsure, treat it as marketing: get
          consent, include an unsubscribe link and follow the marketing rules.
        </p>
        <GuideTable
          head={['Email', 'Counts as', 'Why']}
          rows={[
            ['Order confirmation, shipping update', 'Transactional', 'Completes a purchase'],
            ['Password reset, account verification', 'Transactional', 'Needed to use the service'],
            ['Receipt, invoice', 'Transactional', 'Records a payment'],
            ['Security alert, system notification', 'Transactional', 'Information the user must have'],
            ['Cart abandonment', 'Depends', 'A plain reminder is transactional. Add an offer and it is marketing.'],
            ['Review request', 'Depends', 'Tied to a recent purchase, transactional. A general ask, marketing.'],
            [
              'Welcome email',
              'Depends',
              'The first verification email is transactional. The follow-up series is marketing.',
            ],
            ['Renewal reminder', 'Depends', 'Informational is transactional. Promotional is marketing.'],
            ['Newsletter, content roundup', 'Marketing', 'Not tied to any action'],
            ['Product announcement, sale, discount', 'Marketing', 'Promotes something'],
            ['Educational content, webinar invite', 'Marketing', 'Promotes content'],
            ['Re-engagement campaign', 'Marketing', 'Sent to win attention back'],
          ]}
        />
        <GuideFigure caption={'The same cart reminder. The discount code is what makes it marketing.'}>
          <div className={'grid w-full max-w-xl gap-3 sm:grid-cols-2'}>
            <EmailCard
              icon={ShoppingCart}
              from={'Acme'}
              subject={'You left something in your cart'}
              type={{tone: 'neutral', label: 'Transactional'}}
              body={'Your Trail Runner 2 is still in your cart.'}
              className={'w-full'}
            />
            <EmailCard
              icon={ShoppingCart}
              from={'Acme'}
              subject={'Still thinking? Take 10% off'}
              type={{tone: 'neutral', label: 'Marketing'}}
              body={'Use code COMEBACK10 on your Trail Runner 2.'}
              footer={<span className={'font-medium text-neutral-900 underline'}>Unsubscribe</span>}
              className={'w-full'}
            />
          </div>
        </GuideFigure>
      </GuideSection>
    </GuideLayout>
  );
}

/** One opened email: sender, subject, its type, a line of body and the footer. */
function EmailCard({
  icon,
  from,
  subject,
  type,
  body,
  footer,
  className = '',
}: {
  icon: React.ElementType;
  from: string;
  subject: string;
  type: {tone: 'neutral' | 'ok' | 'warn' | 'err'; label: string};
  body: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <UICard className={`overflow-hidden ${className}`}>
      <div className={'p-4'}>
        <SnippetRow
          icon={icon}
          label={`From ${from}`}
          title={subject}
          trailing={<StatusPill tone={type.tone}>{type.label}</StatusPill>}
        />
        <p className={'mt-3 border-t border-neutral-100 pt-3 text-ui text-neutral-700'}>{body}</p>
      </div>
      {footer && (
        <p className={'border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 text-center text-label text-neutral-500'}>
          {footer}
        </p>
      )}
    </UICard>
  );
}

/** An order shipped email, reduced to the facts it has to carry. */
function OrderShippedEmail() {
  const details = [
    {label: 'Order', value: '#12345'},
    {label: 'Carrier', value: 'DHL Express'},
    {label: 'Arrives', value: 'Thursday, Oct 23'},
  ];

  return (
    <UICard className={'w-full max-w-sm'}>
      <div className={'p-4'}>
        <SnippetRow
          icon={Package}
          label={'From Acme'}
          title={'Your order #12345 has shipped'}
          trailing={<TimeAgo>now</TimeAgo>}
        />
      </div>
      <dl className={'divide-y divide-neutral-100 border-t border-neutral-100'}>
        {details.map(d => (
          <div key={d.label} className={'flex items-baseline justify-between gap-4 px-4 py-2.5'}>
            <dt className={'text-ui text-neutral-500'}>{d.label}</dt>
            <dd className={'text-ui font-medium text-neutral-900'}>{d.value}</dd>
          </div>
        ))}
      </dl>
      <div className={'border-t border-neutral-100 p-4'}>
        <span className={'inline-flex rounded-lg bg-neutral-900 px-3.5 py-2 text-ui font-semibold text-white'}>
          Track package
        </span>
      </div>
    </UICard>
  );
}

/** Two sending subdomains and the number each one is judged on. */
function SendingDomains() {
  const domains = [
    {domain: 'mail.acme.com', type: 'Transactional', metric: 'Delivered 99.6%'},
    {domain: 'news.acme.com', type: 'Marketing', metric: 'Opened 24%'},
  ];

  return (
    <UICard className={'w-full max-w-md divide-y divide-neutral-100'}>
      {domains.map(d => (
        <div key={d.domain} className={'flex items-center justify-between gap-4 px-4 py-3'}>
          <div className={'min-w-0'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{d.domain}</p>
            <p className={'text-label text-neutral-500'}>
              {d.type} · {d.metric}
            </p>
          </div>
          <StatusPill tone={'ok'}>Verified</StatusPill>
        </div>
      ))}
    </UICard>
  );
}

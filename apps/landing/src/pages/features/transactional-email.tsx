import {
  CodeBlock,
  ComparisonTable,
  EventList,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  Footer,
  IdempotencyFragment,
  MoreFeatures,
  Navbar,
  TemplateSendFragment,
  TransactionalSnippet,
} from '../../components';
import type {ChecklistItem, Claim, ComparisonRow, FAQ} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

const ENDPOINT = 'https://next-api.useplunk.com/v1/send';

/**
 * The hero shows a send and its delivery. These are what developers check
 * next: can the email live outside the code, is a retry safe, and how do
 * I find out what happened.
 */
const claims: Claim[] = [
  {
    title: 'Templates outside your code',
    copy: 'Design the email in the dashboard, send it by ID, and pass the data that fills it. Copy changes ship without a deploy.',
    fragment: <TemplateSendFragment />,
  },
  {
    title: 'Safe to retry',
    copy: 'Send an idempotency key and a retried request returns the first result instead of emailing your customer twice.',
    fragment: <IdempotencyFragment />,
  },
  {
    title: 'Every event, as it happens',
    copy: 'Deliveries, opens, clicks, bounces and complaints show up in the dashboard and on your webhooks.',
    fragment: <EventList className={'w-full max-w-xs'} limit={3} />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Attachments', description: 'Up to 10 files and 10 MB per email, inline images included.'},
  {title: 'Multiple recipients', description: 'One address, a name and address, or a list.'},
  {title: 'Custom headers', description: 'Your own headers pass straight through.'},
  {title: 'Reply-to and sender name', description: 'Set per email, from any verified domain.'},
  {title: 'SMTP as well', description: 'Frameworks that already speak SMTP work unchanged.'},
  {title: 'Contacts on send', description: 'Every recipient becomes a contact with a full history.'},
];

/** The developer's real alternative is running SES directly; these are the differences. */
const comparison: ComparisonRow[] = [
  {feature: 'Price', plunk: '$0.001 per email', competitor: '$0.10 per 1,000 emails'},
  {feature: 'Templates with variables', plunk: true, competitor: 'Via API only'},
  {feature: 'Per-email delivery log', plunk: true, competitor: false},
  {feature: 'Bounce and complaint handling', plunk: 'Automatic', competitor: 'Build it yourself'},
  {feature: 'Contacts and history', plunk: true, competitor: 'Basic contact lists'},
  {feature: 'Campaigns and workflows', plunk: true, competitor: false},
];

const faqs: FAQ[] = [
  {
    question: 'What is a transactional email API?',
    answer:
      'An HTTP endpoint your application calls to send one email to one person when something happens: a password reset, a receipt, a login code. The provider handles delivery and tells you what happened to each message.',
  },
  {
    question: 'How much does transactional email cost on Plunk?',
    answer:
      'The free plan covers 1,000 emails a month. On the paid plan every email is $0.001, with no monthly fee and unlimited contacts. Transactional, campaign and workflow emails all count the same way.',
  },
  {
    question: 'Do transactional emails respect unsubscribes?',
    answer:
      'Emails sent with a subject and body through the send endpoint are treated as transactional and always delivered, because a password reset should not depend on a newsletter preference. Templates can be marked as marketing when they should respect it.',
  },
  {
    question: 'Which languages and frameworks can I use?',
    answer:
      'Anything that can make an HTTP request, from Node.js and Python to PHP, Ruby and Go. If your framework already sends over SMTP, point it at Plunk’s SMTP server instead and change nothing else.',
  },
  {
    question: 'Where is my data stored?',
    answer:
      'Plunk Cloud stores contacts, templates and email history in the EU, in Germany. Plunk is also open source, so you can run the same platform on your own servers.',
  },
];

const example = `const response = await fetch('${ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.PLUNK_API_KEY}\`,
  },
  body: JSON.stringify({
    to: 'ana@acme.com',
    template: 'ORDER_CONFIRMATION_TEMPLATE_ID',
    data: {name: 'Ana', order: '#3980', total: '€48.00'},
  }),
});`;

export default function TransactionalEmailFeature() {
  return (
    <>
      <NextSeo
        title="Transactional Email API for Developers | Plunk"
        description="Send password resets, receipts and notifications with one API call. Templates, webhooks, idempotent retries and SMTP, at $0.001 per email."
        canonical="https://www.useplunk.com/features/transactional-email"
        openGraph={{
          title: 'Transactional Email API for Developers | Plunk',
          description:
            'Send password resets, receipts and notifications with one API call. Templates, webhooks, idempotent retries and SMTP, at $0.001 per email.',
          url: 'https://www.useplunk.com/features/transactional-email',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Transactional+Email+API&tag=Feature',
              alt: 'Plunk Transactional Email API',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={
            <>
              One request in.
              <br />
              One email delivered.
            </>
          }
          subtitle={
            'A transactional email API for password resets, receipts and notifications. Send with one call, see what happened to every message, pay $0.001 per email.'
          }
          docsHref={`${WIKI_URI}/concepts/transactional-emails`}
          docsLabel={'API docs'}
          artifact={<TransactionalSnippet />}
        />

        <FeatureHighlights title={'What you get'} claims={claims} extras={extras} />

        <FeatureSection
          title={'Send your first email'}
          intro={'Pass a template ID and the data that fills it, or a subject and HTML body. That is the whole request.'}
        >
          <div className={'max-w-3xl'}>
            <CodeBlock code={example} title={'Node.js'} />
          </div>
        </FeatureSection>

        <FeatureSection
          title={'Plunk or Amazon SES directly'}
          intro={'Plunk sends through SES. These are the parts you would otherwise build yourself.'}
        >
          <ComparisonTable competitorName={'Amazon SES'} rows={comparison} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-transactional'} />

        <FeatureCTA title={'Send your first transactional email.'} />

        <MoreFeatures current={'/features/transactional-email'} />
      </main>

      <Footer />
    </>
  );
}

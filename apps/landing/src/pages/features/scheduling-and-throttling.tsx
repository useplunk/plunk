import {
  CodeBlock,
  ComparisonTable,
  DeliverySnippet,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  Footer,
  MoreFeatures,
  Navbar,
  ScheduleFragment,
  ThrottledResponseFragment,
  ThrottleFragment,
} from '../../components';
import type {ChecklistItem, Claim, ComparisonRow, FAQ} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

const ENDPOINT = 'https://next-api.useplunk.com/v1/send';

const TITLE = 'Schedule and Throttle Transactional Email with One API Call | Plunk';
const DESCRIPTION =
  'Send a notification at most once a day, or schedule it for later, with one field on the send call. No cache of who got what, no cron job. Throttled sends are never billed.';

/**
 * The page sells one thing: the rule lives in the send call. The hero shows a
 * day of calls producing one email; the tiles show the three things a
 * developer checks next: what the recipient sees, what scheduling looks like,
 * and what their code gets back.
 */
const claims: Claim[] = [
  {
    title: 'At most once per window',
    copy: 'Send from every request that hits the limit. The recipient gets the warning once a day, and the window runs from the email they actually received.',
    fragment: <ThrottleFragment />,
  },
  {
    title: 'Later, in the same call',
    copy: 'Add a time and the email waits, up to 30 days ahead. Move it or cancel it until it goes out, from the API or the dashboard.',
    fragment: <ScheduleFragment />,
  },
  {
    title: 'Nothing to store on your side',
    copy: 'A throttled send is a normal response that says so. No email is created, the contact is left alone, nothing is billed, and you keep no table of who was told what.',
    fragment: <ThrottledResponseFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Per organisation', description: 'Add a key so each organisation gets its own warning.'},
  {title: 'Once per billing period', description: 'Put the period in the key and drop the window.'},
  {title: 'Team-wide alerts', description: 'Hold an alert once for the whole project.'},
  {title: 'Safe under load', description: 'Concurrent sends of one notification send it once.'},
  {title: 'In workflows too', description: 'Let a workflow start at most once a day per contact.'},
  {title: 'From your agent', description: 'The MCP server can schedule, move and cancel too.'},
];

const comparison: ComparisonRow[] = [
  {feature: 'Schedule an email for later', plunk: 'Up to 30 days', competitor: true},
  {feature: 'Move or cancel a scheduled email', plunk: true, competitor: true},
  {feature: 'Send a notification at most once per period', plunk: true, competitor: 'Build it yourself'},
  {feature: 'Limit per organisation or billing period', plunk: true, competitor: 'Build it yourself'},
  {feature: 'Throttled attempts billed', plunk: 'Never', competitor: 'Not applicable'},
];

const faqs: FAQ[] = [
  {
    question: 'How do I stop sending the same notification email over and over?',
    answer:
      'Add delivery.throttle to the send call, for example "24h". Plunk sends the email when the recipient has not had it within the window and skips it when they have, so you can call the API from every request without keeping track yourself.',
  },
  {
    question: 'Can I schedule a transactional email through the API?',
    answer:
      'Yes. Add delivery.at with an ISO 8601 time up to 30 days ahead. The response returns the email ID, which you use to move or cancel it until it goes out. Scheduled emails also show up in the dashboard, where you can cancel them.',
  },
  {
    question: 'Do throttled emails count towards my bill?',
    answer:
      'No. A throttled send creates no email and is never billed. A scheduled email is billed when it is sent, and a cancelled one never is.',
  },
  {
    question: 'How is this different from an idempotency key?',
    answer:
      'An idempotency key stops a retry of the same request from sending twice. A throttle stops new requests for the same notification from emailing someone again within a period. You can use both on one request.',
  },
  {
    question: 'Can I throttle without code?',
    answer:
      'Yes. Workflows take the same throttle on entry. Track an event from every request, set the workflow to start at most once per period, optionally per organisation, and the extra events start nothing.',
  },
  {
    question: 'What if I want a different limit per customer?',
    answer:
      'Add a key, such as the organisation ID. Each key is limited on its own, so a person in two organisations gets a warning for each. Put the billing period in the key to send once per period.',
  },
];

const example = `// Called on every request that counts towards the plan
await fetch('${ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.PLUNK_API_KEY}\`,
  },
  body: JSON.stringify({
    to: user.email,
    template: 'USAGE_WARNING_TEMPLATE_ID',
    data: {used, limit},
    delivery: {
      throttle: {window: '24h', key: org.id}, // at most once a day per organisation
    },
  }),
});

// Or send it later instead of now
delivery: {at: '2026-11-01T09:00:00Z'}`;

/** The shapes developers reach for, so the page answers "can it do mine?" at a glance. */
const recipes: {need: string; value: string}[] = [
  {need: 'A usage warning at most once a day', value: `throttle: '24h'`},
  {need: 'Once a day, per organisation', value: `throttle: {window: '24h', key: org.id}`},
  {need: 'Once per billing period', value: `throttle: {key: \`\${org.id}:\${period}\`}`},
  {need: 'A one-time email', value: 'throttle: {}'},
  {need: 'A team alert, at most hourly', value: `throttle: {window: '1h', scope: 'project'}`},
  {need: 'A reminder in three days', value: `at: '2026-11-01T09:00:00Z'`},
];

export default function SchedulingAndThrottlingFeature() {
  return (
    <>
      <NextSeo
        title={TITLE}
        description={DESCRIPTION}
        canonical="https://www.useplunk.com/features/scheduling-and-throttling"
        openGraph={{
          title: TITLE,
          description: DESCRIPTION,
          url: 'https://www.useplunk.com/features/scheduling-and-throttling',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Scheduling+and+Throttling&tag=Feature',
              alt: 'Plunk scheduling and throttling',
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
              Call it every time.
              <br />
              Email them once.
            </>
          }
          subtitle={
            'Throttle and schedule transactional email with one field on the send you already make. No cache of who was told what, and no cron job to send it later.'
          }
          docsHref={`${WIKI_URI}/guides/throttling`}
          docsLabel={'Read the guide'}
          artifact={<DeliverySnippet />}
        />

        <FeatureHighlights title={'What you get'} claims={claims} extras={extras} />

        <FeatureSection
          title={'One field on the send'}
          intro={'Add delivery to the request you already make. Everything else about sending stays the same.'}
        >
          <div className={'max-w-3xl'}>
            <CodeBlock code={example} title={'Node.js'} />
          </div>
        </FeatureSection>

        <FeatureSection title={'Whatever your rule is'} intro={'Most limits fit on one line. A few common ones:'}>
          <dl className={'max-w-3xl divide-y divide-neutral-200 border-y border-neutral-200'}>
            {recipes.map(r => (
              <div key={r.need} className={'grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-6'}>
                <dt className={'text-ui font-medium text-neutral-900'}>{r.need}</dt>
                <dd className={'font-code text-ui text-neutral-600'}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </FeatureSection>

        <FeatureSection
          title={'Plunk or a typical email API'}
          intro={'Most email APIs can schedule. Limiting how often someone gets a notification is left to you.'}
        >
          <ComparisonTable competitorName={'Typical email API'} rows={comparison} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-scheduling-throttling'} />

        <FeatureCTA title={'Stop building notification throttles.'} />

        <MoreFeatures current={'/features/scheduling-and-throttling'} />
      </main>

      <Footer />
    </>
  );
}

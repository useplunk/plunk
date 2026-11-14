import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {
  ComparisonTable,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  Footer,
  MoreFeatures,
  Navbar,
  ReputationFragment,
  SesBounceFragment,
  SesDomainFragment,
  SesSnippet,
  StepSequence,
} from '../components';
import type {ChecklistItem, Claim, ComparisonRow, FAQ, Step} from '../components';
import {WIKI_URI} from '../lib/constants';

/**
 * For people searching for a dashboard or UI on top of Amazon SES. The
 * comparison page (/vs/amazon-ses) argues "platform vs raw delivery"; this one
 * answers "what do I put in front of SES", with two answers: Plunk Cloud runs
 * SES for you, or self-hosted Plunk runs on your own SES account.
 */
const claims: Claim[] = [
  {
    title: 'Bounces handled, not just logged',
    copy: 'Plunk listens to the bounce and complaint notifications SES sends and unsubscribes the contact, so you never mail a dead address twice.',
    fragment: <SesBounceFragment />,
  },
  {
    title: 'Domains verified for you',
    copy: 'Add a domain and Plunk sets up DKIM and a custom MAIL FROM in SES, then shows you the DNS records to add.',
    fragment: <SesDomainFragment />,
  },
  {
    title: 'Reputation you can see',
    copy: 'Bounce and complaint rates per project, with a warning before they reach the levels SES reviews accounts for.',
    fragment: <ReputationFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Every email, searchable', description: 'Delivery, opens and clicks per message.'},
  {title: 'Contacts and segments', description: 'Not just addresses, a full history per person.'},
  {title: 'Templates with an editor', description: 'Visual and HTML, no JSON template uploads.'},
  {title: 'Unsubscribe pages', description: 'Hosted, with one-click unsubscribe headers.'},
  {title: 'Campaigns and workflows', description: 'Broadcasts and automation on the same account.'},
  {title: 'Inbound email', description: 'Receive at your domain through SES.'},
];

/** What the SES console gives you, against what Plunk adds on top. */
const comparison: ComparisonRow[] = [
  {feature: 'Log of every email sent', plunk: true, competitor: false},
  {feature: 'Bounce and complaint handling', plunk: 'Automatic', competitor: 'Via SNS, you build it'},
  {feature: 'Open and click tracking', plunk: 'Per email', competitor: 'Aggregate metrics'},
  {feature: 'Contacts and unsubscribes', plunk: 'Full history', competitor: 'Basic contact lists'},
  {feature: 'Template editor', plunk: true, competitor: 'API only'},
  {feature: 'Campaigns and workflows', plunk: true, competitor: false},
];

const steps: Step[] = [
  {
    title: 'Create an IAM user',
    body: 'Give Plunk a user with permission to send and verify domains in SES, and nothing else.',
  },
  {
    title: 'Connect SES events',
    body: 'Point SES at Plunk through an SNS topic and two configuration sets, so deliveries, bounces and complaints flow back.',
  },
  {
    title: 'Add your domain',
    body: 'Plunk verifies it in SES and gives you the DNS records. From then on everything happens in the dashboard.',
  },
];

const faqs: FAQ[] = [
  {
    question: 'Does Amazon SES have a dashboard?',
    answer:
      'The SES console shows sending statistics, deliverability metrics, verified identities and settings, but no log of individual emails, no campaigns and no template editor. Bounces and complaints arrive as SNS notifications for you to process. Plunk is the dashboard and platform on top.',
  },
  {
    question: 'Can I use Plunk with my own SES account?',
    answer:
      'Yes, by self-hosting Plunk. You give it IAM credentials and an SNS topic, and it sends through your SES account at your SES rates. Plunk Cloud uses Plunk’s own SES setup, so you do not need an AWS account at all.',
  },
  {
    question: 'Do I need to get out of the SES sandbox?',
    answer:
      'On Plunk Cloud, no: Plunk’s SES account already has production access. When self-hosting on your own AWS account, you request production access from AWS once, the same as for any SES setup.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Plunk Cloud is $0.001 per email, or free for up to 1,000 emails a month, and covers SES itself. Self-hosted Plunk is free software; you pay AWS for SES and your own server.',
  },
  {
    question: 'Is this the same deliverability as SES?',
    answer:
      'Yes. Every email goes out through Amazon SES. Plunk adds the parts that protect deliverability over time: suppressing bounced addresses, unsubscribing complainers and warning you when rates climb.',
  },
];

export default function AwsSes() {
  return (
    <>
      <NextSeo
        title="Amazon SES Dashboard: Contacts, Templates & Tracking | Plunk"
        description="A dashboard and email platform for Amazon SES. Email logs, bounce handling, templates, campaigns and workflows, hosted for you or on your own SES account."
        canonical="https://www.useplunk.com/aws-ses"
        openGraph={{
          title: 'Amazon SES Dashboard: Contacts, Templates & Tracking | Plunk',
          description:
            'A dashboard and email platform for Amazon SES. Email logs, bounce handling, templates, campaigns and workflows, hosted or on your own SES account.',
          url: 'https://www.useplunk.com/aws-ses',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=The+Dashboard+for+Amazon+SES&tag=Feature',
              alt: 'Plunk, the dashboard for Amazon SES',
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
              The dashboard
              <br />
              Amazon SES is missing.
            </>
          }
          subtitle={
            'SES delivers email. Plunk adds the rest: a log of every message, bounce handling, contacts, templates, campaigns and workflows. Use it hosted, or on your own SES account.'
          }
          docsHref={`${WIKI_URI}/self-hosting/email-setup`}
          docsLabel={'SES setup guide'}
          artifact={<SesSnippet />}
        />

        <FeatureHighlights title={'What Plunk adds to SES'} claims={claims} extras={extras} />

        <FeatureSection
          title={'The SES console or Plunk'}
          intro={'The console is built to configure SES, not to run email on it. These are the gaps.'}
        >
          <ComparisonTable competitorName={'SES console'} rows={comparison} />
        </FeatureSection>

        <FeatureSection
          title={'On your own SES account'}
          intro={'Self-hosted Plunk sends through your AWS account. Setup takes three steps.'}
        >
          <StepSequence steps={steps} />
          <p className={'mt-12 max-w-[65ch] text-ui text-neutral-600'}>
            Rather not run it? Plunk Cloud uses Plunk’s own SES account, so there is nothing to set up in AWS. See{' '}
            <Link href={'/pricing'} className={'text-neutral-900 underline underline-offset-4'}>
              pricing
            </Link>{' '}
            or how Plunk compares to{' '}
            <Link href={'/vs/amazon-ses'} className={'text-neutral-900 underline underline-offset-4'}>
              using SES directly
            </Link>
            .
          </p>
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-aws-ses'} />

        <FeatureCTA title={'Put a dashboard on SES today.'} />

        <MoreFeatures current={'/aws-ses'} />
      </main>

      <Footer />
    </>
  );
}

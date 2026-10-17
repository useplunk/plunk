import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {
  ComparisonTable,
  EuDataSnippet,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  Footer,
  Navbar,
  RetentionFragment,
  SubprocessorFragment,
  TrackingModeFragment,
} from '../components';
import type {ChecklistItem, Claim, ComparisonRow, FAQ} from '../components';

/**
 * The EU page answers one search: an email platform a European team can use
 * without a data-transfer argument. Every claim is taken from the DPA and the
 * privacy policy, which is also where the page sends anyone who needs more.
 */
const claims: Claim[] = [
  {
    title: 'Three sub-processors, listed',
    copy: 'Hosting in Germany, delivery through Amazon SES, payments through Stripe. Transfers outside the EU are covered by Standard Contractual Clauses.',
    fragment: <SubprocessorFragment />,
  },
  {
    title: 'Tracking is your choice',
    copy: 'Track every email, only marketing email, or nothing. Password resets and receipts can go out with no tracking pixel at all.',
    fragment: <TrackingModeFragment />,
  },
  {
    title: 'Less kept, for less long',
    copy: 'Rendered email content is cleared after 90 days and API logs after 30, so personal data does not pile up.',
    fragment: <RetentionFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Data Processing Agreement', description: 'Part of the terms, nothing to sign or request.'},
  {title: '72-hour breach notice', description: 'As GDPR requires of processors.'},
  {title: 'Unsubscribes handled', description: 'Links, preference pages and suppression built in.'},
  {title: 'No ad trackers', description: 'No Google Analytics or Facebook Pixel in the app.'},
  {title: 'Notice of changes', description: '30 days before a new sub-processor is added.'},
  {title: 'Open source', description: 'Read the code that handles your data.'},
];

/** Fair to the field: many US providers sell EU residency, usually as an add-on. */
const comparison: ComparisonRow[] = [
  {feature: 'Contact and email data stored in the EU', plunk: 'Always', competitor: 'Add-on or higher plan'},
  {feature: 'DPA included', plunk: true, competitor: true},
  {feature: 'Sub-processor list', plunk: '3 companies', competitor: 'Often dozens'},
  {feature: 'Tracking can be switched off', plunk: true, competitor: 'Varies'},
  {feature: 'Open source', plunk: true, competitor: false},
  {feature: 'Run it on your own servers', plunk: true, competitor: false},
];

const faqs: FAQ[] = [
  {
    question: 'Is Plunk GDPR compliant?',
    answer:
      'Plunk acts as a processor for the contacts you send to, with a Data Processing Agreement covering processing, security, sub-processors, data subject requests and breach notification within 72 hours. You remain the controller, so you still need a lawful basis, such as consent, for the email you send.',
  },
  {
    question: 'Where is my data stored?',
    answer:
      'Contacts, templates, campaigns, workflows, email history and account data are stored in Germany, on Hetzner infrastructure. Stored personal data is not routinely transferred outside the EU.',
  },
  {
    question: 'Does email leave the EU when it is sent?',
    answer:
      'Delivery runs through Amazon SES, and a message reaching a recipient’s mail server can pass through non-EU regions in transit. It is not stored there. AWS is covered by its own DPA and Standard Contractual Clauses.',
  },
  {
    question: 'Can I keep everything on my own infrastructure?',
    answer:
      'Yes. Plunk is open source under AGPL-3.0 and runs with Docker, so you can host it yourself, in any region you choose. Most teams use Plunk Cloud so they do not have to operate it.',
  },
  {
    question: 'Where can I find the DPA and the sub-processor list?',
    answer: 'Both are on the Data Processing Agreement page, which also lists exactly what each sub-processor does.',
  },
];

export default function EuHosting() {
  return (
    <>
      <NextSeo
        title="GDPR-Compliant Email Platform, Hosted in the EU | Plunk"
        description="An email platform with your contacts and email data stored in Germany. Transactional email, campaigns and workflows with a DPA and three sub-processors."
        canonical="https://www.useplunk.com/eu"
        openGraph={{
          title: 'GDPR-Compliant Email Platform, Hosted in the EU | Plunk',
          description:
            'An email platform with your contacts and email data stored in Germany. Transactional email, campaigns and workflows with a DPA and three sub-processors.',
          url: 'https://www.useplunk.com/eu',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Hosted+in+the+EU&tag=Privacy',
              alt: 'Plunk, hosted in the EU',
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
              Email infrastructure
              <br />
              that stays in Europe.
            </>
          }
          subtitle={
            'Transactional email, campaigns and workflows, with your contacts and email history stored in Germany. A DPA is included, and the sub-processor list fits on one line.'
          }
          docsHref={'/dpa'}
          docsLabel={'Read the DPA'}
          artifact={<EuDataSnippet />}
        />

        <FeatureHighlights title={'Built for GDPR'} claims={claims} extras={extras} />

        <FeatureSection
          title={'Plunk or a US email provider'}
          intro={'Many US providers can keep data in the EU. It is usually an add-on, and their sub-processor lists run long.'}
        >
          <ComparisonTable competitorName={'Typical US provider'} rows={comparison} />
          <p className={'mt-6 max-w-[65ch] text-ui text-neutral-600'}>
            Comparing a specific provider? See how Plunk compares to{' '}
            <Link href={'/vs/resend'} className={'text-neutral-900 underline underline-offset-4'}>
              Resend
            </Link>
            ,{' '}
            <Link href={'/vs/sendgrid'} className={'text-neutral-900 underline underline-offset-4'}>
              SendGrid
            </Link>{' '}
            and{' '}
            <Link href={'/vs/mailchimp'} className={'text-neutral-900 underline underline-offset-4'}>
              Mailchimp
            </Link>
            .
          </p>
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-eu'} />

        <FeatureCTA title={'Keep your email data in the EU.'} />
      </main>

      <Footer />
    </>
  );
}

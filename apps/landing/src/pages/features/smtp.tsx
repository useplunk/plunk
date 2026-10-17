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
  SmtpClientsFragment,
  SmtpEncryptionFragment,
  SmtpSnippet,
  SmtpTrackingFragment,
} from '../../components';
import type {ChecklistItem, Claim, ComparisonRow, FAQ} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

/**
 * The hero shows the four settings. These show what you get once they are in:
 * it works with what you have, it is tracked, and it is encrypted.
 */
const claims: Claim[] = [
  {
    title: 'Works with what you have',
    copy: 'Mail clients, frameworks and older systems keep working. Change the settings, not the code.',
    fragment: <SmtpClientsFragment />,
  },
  {
    title: 'Tracked like the API',
    copy: 'SMTP mail goes out through the same pipeline, so opens, clicks and bounces are recorded.',
    fragment: <SmtpTrackingFragment />,
  },
  {
    title: 'Encrypted in transit',
    copy: 'STARTTLS on port 587 and implicit TLS on port 465.',
    fragment: <SmtpEncryptionFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Attachments', description: 'Full MIME support, files included.'},
  {title: 'Custom headers', description: 'Your own headers pass straight through.'},
  {title: 'Multiple recipients', description: 'Send to several people in one message.'},
  {title: 'Same verified domains', description: 'Send from the domains you already verified.'},
  {title: 'Same price', description: '$0.001 per email, like the API.'},
  {title: 'No SDK to adopt', description: 'Any language with an SMTP transport works.'},
];

/** Both send through the same pipeline; these are the differences. */
const comparison: ComparisonRow[] = [
  {feature: 'Setup', plunk: 'Credentials', competitor: 'API key'},
  {feature: 'Works with mail clients', plunk: true, competitor: false},
  {feature: 'Open and click tracking', plunk: true, competitor: true},
  {feature: 'Attachments', plunk: true, competitor: true},
  {feature: 'Plunk templates', plunk: false, competitor: true},
  {feature: 'Triggers workflows', plunk: false, competitor: true},
];

const faqs: FAQ[] = [
  {
    question: 'Should I use SMTP or the API?',
    answer:
      'Use SMTP when something already sends mail and you do not want to change it, or when a person is sending from a mail client. Use the API when you want Plunk templates or want the send to trigger a workflow.',
  },
  {
    question: 'Do SMTP sends get tracked?',
    answer:
      'Yes. SMTP mail goes out over the same infrastructure as API mail, so opens, clicks and bounces are recorded the same way.',
  },
  {
    question: 'Which ports and encryption are supported?',
    answer: 'Port 587 with STARTTLS and port 465 with implicit TLS. Both are encrypted in transit.',
  },
  {
    question: 'Can I send from any address?',
    answer:
      'Only from domains you have verified on your project. Plunk checks the sending domain before accepting the message.',
  },
];

export default function SMTPFeature() {
  return (
    <>
      <NextSeo
        title="SMTP Server - Send Emails via SMTP or API | Plunk"
        description="Use Plunk's SMTP server with any email client or application. TLS encryption, the same delivery infrastructure as the API, and full tracking."
        canonical="https://www.useplunk.com/features/smtp"
        openGraph={{
          title: 'SMTP Server - Send Emails via SMTP or API | Plunk',
          description:
            "Use Plunk's SMTP server with any email client or application. TLS encryption, the same delivery infrastructure as the API, and full tracking.",
          url: 'https://www.useplunk.com/features/smtp',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=SMTP+Server&tag=Feature',
              alt: 'Plunk SMTP Server',
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
              Send via SMTP
              <br />
              or API. Your call.
            </>
          }
          subtitle={'Point any existing client or framework at Plunk. Same domains, same tracking, same price.'}
          docsHref={`${WIKI_URI}/guides/verifying-domains`}
          docsLabel={'SMTP docs'}
          artifact={<SmtpSnippet />}
        />

        <FeatureHighlights title={'What you get'} claims={claims} extras={extras} />

        <FeatureSection title={'SMTP or API'} intro={'Both send through the same pipeline. These are the differences.'}>
          <ComparisonTable plunkLabel={'SMTP'} competitorName={'API'} rows={comparison} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-smtp'} />

        <FeatureCTA title={'Point your app at Plunk.'} />

        <MoreFeatures current={'/features/smtp'} />
      </main>

      <Footer />
    </>
  );
}

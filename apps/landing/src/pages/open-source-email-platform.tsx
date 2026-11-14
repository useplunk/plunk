import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {
  ComposeStackFragment,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  Footer,
  Navbar,
  OneProductFragment,
  OpenSourceSnippet,
  RepositoryFragment,
} from '../components';
import type {ChecklistItem, Claim, FAQ} from '../components';
import {GuideTable} from '../components/guides';
import {WIKI_URI} from '../lib/constants';

/**
 * For "open source email marketing" and "self-hosted transactional email"
 * searches. The reader is comparing open-source projects, so the page says
 * plainly how Plunk differs from the others, then offers the managed cloud as
 * the easier way to run the same code.
 *
 * Facts about the other projects are kept to language, license, focus and
 * whether an official hosted service exists, checked October 2026.
 */
const claims: Claim[] = [
  {
    title: 'One platform, not three projects',
    copy: 'Transactional email, campaigns and workflows share one contact list. Most open-source email tools cover only one of these.',
    fragment: <OneProductFragment />,
  },
  {
    title: 'AGPL-3.0, on GitHub',
    copy: 'The full platform is in one public repository: API, dashboard, SMTP server and this website. No license fee to run it.',
    fragment: <RepositoryFragment />,
  },
  {
    title: 'One Docker Compose file',
    copy: 'Self-hosting starts Plunk, PostgreSQL, Redis and MinIO, and sends through your own Amazon SES account.',
    fragment: <ComposeStackFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'REST API and SMTP', description: 'Send from any language, or point an existing app at the SMTP server.'},
  {title: 'Visual editor', description: 'Build templates and campaigns without writing HTML.'},
  {title: 'Segments', description: 'Dynamic audiences from contact fields and events.'},
  {title: 'Inbound email', description: 'Receive email and start workflows from it.'},
  {title: 'Unlimited contacts', description: 'Billing, when there is any, is per email sent.'},
  {title: 'MCP server', description: 'Let AI agents send email and manage contacts.'},
];

const projects: React.ReactNode[][] = [
  ['Plunk', 'Transactional email, campaigns and workflows', 'TypeScript', 'AGPL-3.0', 'Yes, in the EU'],
  ['listmonk', 'Newsletters and mailing lists', 'Go', 'AGPL-3.0', 'No'],
  ['Mautic', 'Marketing automation suite', 'PHP', 'GPL-3.0', 'Through third parties'],
  ['phpList', 'Newsletter management', 'PHP', 'AGPL-3.0', 'Yes'],
  ['useSend', 'Email API on Amazon SES', 'TypeScript', 'AGPL-3.0', 'Yes'],
];

const faqs: FAQ[] = [
  {
    question: 'Is Plunk really open source?',
    answer:
      'Yes. The whole platform is published on GitHub under the GNU AGPL-3.0: the API, the dashboard, the SMTP server, the workers and the documentation. You can read it, run it and change it.',
  },
  {
    question: 'What do I need to self-host Plunk?',
    answer:
      'A server with Docker and Docker Compose, an Amazon SES account for sending, and a domain with subdomains for the API, dashboard and docs. The Compose file starts PostgreSQL, Redis and MinIO alongside Plunk.',
  },
  {
    question: 'Is self-hosting free?',
    answer:
      'The software has no license fee. You pay for your server and for Amazon SES, which charges from $0.10 per 1,000 emails. You also take on updates, backups and deliverability monitoring.',
  },
  {
    question: 'Should I self-host or use Plunk Cloud?',
    answer:
      'Self-host if you must keep all data on your own infrastructure. Otherwise Plunk Cloud runs the same platform for you, hosted in Germany, at $0.001 per email with unlimited contacts, or on a free plan with 1,000 emails a month.',
  },
  {
    question: 'How is Plunk different from listmonk or Mautic?',
    answer:
      'listmonk is a fast, focused newsletter and mailing-list manager. Mautic is a broad PHP marketing automation suite. Plunk is built for product teams: a transactional email API, campaigns and event-triggered workflows on the same contacts.',
  },
];

export default function OpenSourceEmailPlatform() {
  return (
    <>
      <NextSeo
        title="Open-Source Email Marketing & Transactional Platform | Plunk"
        description="Open-source email software for transactional email, campaigns and workflows. Self-host it with Docker, or use the managed EU cloud at $0.001 per email."
        canonical="https://www.useplunk.com/open-source-email-platform"
        openGraph={{
          title: 'Open-Source Email Marketing & Transactional Platform | Plunk',
          description:
            'Open-source email software for transactional email, campaigns and workflows. Self-host it with Docker, or use the managed EU cloud at $0.001 per email.',
          url: 'https://www.useplunk.com/open-source-email-platform',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Open-Source+Email+Platform&tag=Open+source',
              alt: 'Plunk, the open-source email platform',
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
              The open{'\u2011'}source
              <br />
              email platform.
            </>
          }
          subtitle={
            'Transactional email, marketing campaigns and workflows in one AGPL-3.0 codebase. Run it on your own servers, or let us run it for you in the EU.'
          }
          docsHref={`${WIKI_URI}/self-hosting/introduction`}
          docsLabel={'Self-hosting guide'}
          artifact={<OpenSourceSnippet />}
        />

        <FeatureHighlights title={'What is in the repository'} claims={claims} extras={extras} />

        <FeatureSection
          title={'Open-source email tools, compared'}
          intro={'Each project is good at something different. This is what each one is built for.'}
        >
          <GuideTable head={['Project', 'Built for', 'Language', 'License', 'Official hosting']} rows={projects} />
          <p className={'max-w-[65ch] text-ui text-neutral-600'}>
            Looking at a hosted tool instead? See how Plunk compares to{' '}
            <Link href={'/vs/usesend'} className={'text-neutral-900 underline underline-offset-4'}>
              useSend
            </Link>
            ,{' '}
            <Link href={'/alternatives/resend'} className={'text-neutral-900 underline underline-offset-4'}>
              Resend alternatives
            </Link>{' '}
            and{' '}
            <Link href={'/alternatives/mailchimp'} className={'text-neutral-900 underline underline-offset-4'}>
              Mailchimp alternatives
            </Link>
            .
          </p>
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-open-source'} />

        <FeatureCTA title={'Run the same code, without running servers.'} />
      </main>

      <Footer />
    </>
  );
}

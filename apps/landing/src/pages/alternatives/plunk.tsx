import {ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import {BreadcrumbJsonLd, NextSeo} from 'next-seo';
import React from 'react';

import {DifferenceSnippets, FAQSection, FeatureCTA, FeatureHero, FeatureSection, Footer, Navbar} from '../../components';
import type {FAQ} from '../../components';

/**
 * People search "Plunk alternatives" while deciding, and until this page the
 * answers came from other vendors' listicles. This is the honest version:
 * when each alternative is the better pick, linking to the full comparison.
 */
const alternatives: {name: string; slug: string; pickIf: string}[] = [
  {name: 'Resend', slug: 'resend', pickIf: 'You only send transactional email and want a larger free tier.'},
  {name: 'useSend', slug: 'usesend', pickIf: 'You mostly send transactional email at volume and want the lowest price per email.'},
  {name: 'Loops', slug: 'loops', pickIf: 'You want a fixed monthly plan and a tool built only for SaaS marketing.'},
  {name: 'Postmark', slug: 'postmark', pickIf: 'You send only transactional email and want message streams kept strictly separate.'},
  {name: 'Customer.io', slug: 'customerio', pickIf: 'You need SMS, push and in-app messages alongside email.'},
  {name: 'Mailchimp', slug: 'mailchimp', pickIf: 'Your marketing team wants a drag-and-drop tool with a large template library.'},
  {name: 'Amazon SES', slug: 'amazon-ses', pickIf: 'You want the lowest raw price and will build contacts, templates and tracking yourself.'},
  {name: 'Brevo', slug: 'brevo', pickIf: 'You want email, SMS, chat and a CRM in one suite.'},
];

const faqs: FAQ[] = [
  {
    question: 'What is the best alternative to Plunk?',
    answer:
      'It depends on what you need Plunk to stop doing. For transactional email only, Resend and Postmark are strong picks. For another open-source option, useSend. For multi-channel messaging, Customer.io. If you need transactional, campaigns and workflows on one contact list, those tools each cover part of it.',
  },
  {
    question: 'Is there a free alternative to Plunk?',
    answer:
      'Most alternatives have a free tier, and Plunk’s own free plan includes 1,000 emails a month. Plunk is also open source, so self-hosting it costs only your server and Amazon SES.',
  },
  {
    question: 'Is there an open-source alternative to Plunk?',
    answer:
      'useSend is the closest: open source, AGPL-licensed and built on Amazon SES. Listmonk and Mautic are open-source newsletter and marketing tools, without a transactional email API like Plunk’s.',
  },
];

export default function PlunkAlternatives() {
  const url = 'https://www.useplunk.com/alternatives/plunk';

  return (
    <>
      <NextSeo
        title="Plunk Alternatives: When Another Tool Fits Better | Plunk"
        description="An honest list of Plunk alternatives, including Resend, useSend, Loops and Postmark, with when each is the better choice and how they compare."
        canonical={url}
        openGraph={{
          title: 'Plunk Alternatives: When Another Tool Fits Better',
          description:
            'An honest list of Plunk alternatives, including Resend, useSend, Loops and Postmark, with when each is the better choice.',
          url,
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Plunk+Alternatives&tag=Comparison',
              alt: 'Plunk alternatives',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />
      <BreadcrumbJsonLd
        itemListElements={[
          {position: 1, name: 'Home', item: 'https://www.useplunk.com'},
          {position: 2, name: 'Comparisons', item: 'https://www.useplunk.com/vs'},
          {position: 3, name: 'Plunk alternatives', item: url},
        ]}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={
            <>
              Plunk alternatives,
              <br />
              honestly compared
            </>
          }
          subtitle={
            'Plunk is not the right tool for everyone. These are the alternatives we would point you to, and when each one is the better choice.'
          }
          docsHref={'/vs'}
          docsLabel={'All comparisons'}
        />

        <FeatureSection title={'When to pick something else'}>
          <ul className={'divide-y divide-neutral-200 border-y border-neutral-200'}>
            {alternatives.map(alt => (
              <li key={alt.slug}>
                <Link
                  href={`/vs/${alt.slug}`}
                  className={'group grid gap-2 py-6 transition-colors hover:bg-neutral-50 sm:grid-cols-12 sm:items-baseline sm:gap-6 sm:px-2'}
                >
                  <span className={'font-display text-xl font-semibold text-neutral-900 sm:col-span-3'}>{alt.name}</span>
                  <span className={'text-neutral-600 sm:col-span-8'}>{alt.pickIf}</span>
                  <span className={'hidden justify-end sm:col-span-1 sm:flex'}>
                    <ArrowUpRight
                      aria-hidden
                      className={
                        'h-4 w-4 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
                      }
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </FeatureSection>

        <FeatureSection
          title={'When Plunk is the better fit'}
          intro={'Transactional email, campaigns and workflows on one contact list, at $0.001 per email, open source and hosted in the EU.'}
        >
          <DifferenceSnippets />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-plunk-alternatives'} />

        <FeatureCTA title={'Try Plunk alongside what you use now.'} />
      </main>

      <Footer />
    </>
  );
}

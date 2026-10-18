import {
  CampaignAudienceFragment,
  CampaignLossFragment,
  CampaignScheduleFragment,
  CampaignSnippet,
  ComparisonTable,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  Footer,
  MoreFeatures,
  Navbar,
} from '../../components';
import type {ChecklistItem, Claim, ComparisonRow, FAQ} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

/**
 * The hero shows a scheduled campaign and a sent one. These cover the three
 * questions before and after a send: who gets it, is it right, what did it cost.
 */
const claims: Claim[] = [
  {
    title: 'Everyone, a segment, or a filter',
    copy: 'Send to your whole list, to a segment that keeps itself current, or to a filter you write for this send only.',
    fragment: <CampaignAudienceFragment />,
  },
  {
    title: 'Test it, then schedule it',
    copy: 'Send a test to your own inbox with real contact data filled in, then send now or pick a time. Cancel any time before it finishes.',
    fragment: <CampaignScheduleFragment />,
  },
  {
    title: 'See who you lost',
    copy: 'Unsubscribes, bounces and complaints per campaign, each counted once, with the contacts behind every number.',
    fragment: <CampaignLossFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Visual and HTML editor', description: 'The same editor as your templates.'},
  {title: 'Personalisation', description: 'Any contact field, with fallbacks.'},
  {title: 'Unsubscribes handled', description: 'Footer added, opted-out contacts skipped.'},
  {title: 'Duplicate to resend', description: 'Copy a campaign for a variant or a repeat.'},
  {title: 'Campaigns API', description: 'Create, test, send and read stats from code.'},
  {title: 'Unlimited contacts', description: 'Pay per email sent, never per contact stored.'},
];

/** The usual alternative is a second, newsletter-only tool. */
const comparison: ComparisonRow[] = [
  {feature: 'Pricing', plunk: 'Per email sent', competitor: 'Usually per contact'},
  {feature: 'Same contacts as your product email', plunk: true, competitor: false},
  {feature: 'Audiences from product data', plunk: true, competitor: 'Synced or imported'},
  {feature: 'Transactional email', plunk: true, competitor: false},
  {feature: 'Event-triggered workflows', plunk: true, competitor: 'Sometimes'},
  {feature: 'Open source', plunk: true, competitor: false},
];

const faqs: FAQ[] = [
  {
    question: 'What is the difference between a campaign and a workflow?',
    answer:
      'A campaign is one email sent once to an audience, now or at a scheduled time: a newsletter, a launch, an announcement. A workflow runs for each contact when something happens, like a signup, and can send several emails over time.',
  },
  {
    question: 'How much do campaigns cost?',
    answer:
      'Every email is $0.001, the same as transactional and workflow email, and the free plan covers 1,000 a month. Contacts are unlimited and free to store, so a large list with a small send costs little.',
  },
  {
    question: 'Are unsubscribed contacts skipped?',
    answer:
      'Yes. Marketing campaigns skip contacts who have unsubscribed and include an unsubscribe link. Bounces and complaints unsubscribe the contact automatically.',
  },
  {
    question: 'Can I send campaigns from code?',
    answer:
      'Yes. The API can create a campaign, send a test, send or schedule it, cancel it and read its stats, so product updates can be sent from your own tooling or an AI agent through the MCP server.',
  },
  {
    question: 'Can I use Plunk as a newsletter tool?',
    answer:
      'Yes. Plunk handles newsletters, product updates and announcements to your list, with the same contacts you send receipts and onboarding emails to.',
  },
];

export default function CampaignsFeature() {
  return (
    <>
      <NextSeo
        title="Email Campaigns & Newsletters for SaaS | Plunk"
        description="Send newsletters and product updates to your list, a segment or a filter. Test, schedule and track every campaign at $0.001 per email, unlimited contacts."
        canonical="https://www.useplunk.com/features/campaigns"
        openGraph={{
          title: 'Email Campaigns & Newsletters for SaaS | Plunk',
          description:
            'Send newsletters and product updates to your list, a segment or a filter. Test, schedule and track every campaign at $0.001 per email.',
          url: 'https://www.useplunk.com/features/campaigns',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Email+Campaigns&tag=Feature',
              alt: 'Plunk Email Campaigns',
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
              One email.
              <br />
              Everyone it’s for.
            </>
          }
          subtitle={
            'Newsletters, launches and product updates, sent to the same contacts as your product email. Pick an audience, test it, schedule it.'
          }
          docsHref={`${WIKI_URI}/concepts/campaigns`}
          docsLabel={'Campaign docs'}
          artifact={<CampaignSnippet />}
        />

        <FeatureHighlights title={'What you get'} claims={claims} extras={extras} />

        <FeatureSection
          title={'Plunk or a separate newsletter tool'}
          intro={'Most teams run marketing email in a second tool. This is what changes when it shares a list with your product email.'}
        >
          <ComparisonTable competitorName={'Newsletter tool'} rows={comparison} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-campaigns'} />

        <FeatureCTA title={'Send your first campaign.'} />

        <MoreFeatures current={'/features/campaigns'} />
      </main>

      <Footer />
    </>
  );
}

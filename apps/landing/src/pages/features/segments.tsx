import {
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  FilterBuilder,
  Footer,
  MoreFeatures,
  Navbar,
  SegmentCampaignFragment,
  SegmentSnippets,
  SegmentStaticFragment,
  SegmentTriggerFragment,
  SnippetTile,
  UICard,
} from '../../components';
import type {FAQ} from '../../components';
import type {ChecklistItem, Claim, Condition} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';

interface Example {
  id: string;
  name: string;
  summary: string;
  total: number;
  conditions: Condition[];
}

/** Three segments, expressed the way the builder composes them. */
const examples: Example[] = [
  {
    id: 'active',
    name: 'Active users',
    summary: 'Recent signups who are still opening what you send.',
    total: 12480,
    conditions: [
      {label: 'Signed up in the last 30 days', remaining: 4902},
      {label: 'Opened an email this week', remaining: 2870},
      {label: 'Plan is Pro', remaining: 1146},
    ],
  },
  {
    id: 'dormant',
    name: 'Gone quiet',
    summary: 'Contacts who received the last campaign and never opened it.',
    total: 12480,
    conditions: [
      {label: 'No activity for 60 days', remaining: 5311},
      {label: 'Delivered, not opened', remaining: 2984},
      {label: 'Still subscribed', remaining: 2431},
    ],
  },
  {
    id: 'high-value',
    name: 'High value',
    summary: 'Customers worth treating differently from the rest of the list.',
    total: 12480,
    conditions: [
      {label: 'Spent over $1,000', remaining: 906},
      {label: 'Purchased before', remaining: 742},
    ],
  },
];

/**
 * The examples above show what a segment matches. These show what you can do
 * with one once it exists.
 */
const claims: Claim[] = [
  {
    title: 'Joining can start a workflow',
    copy: 'When someone enters or leaves a segment, a sequence can start on its own.',
    fragment: <SegmentTriggerFragment />,
  },
  {
    title: 'Send to just the people it fits',
    copy: 'Aim a campaign at a segment instead of the whole list. Fewer unsubscribes, a better sending reputation.',
    fragment: <SegmentCampaignFragment />,
  },
  {
    title: 'Hand-picked when you want',
    copy: 'Some groups are a judgement call. Beta testers and VIPs can be a static list you manage yourself.',
    fragment: <SegmentStaticFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Any field you store', description: 'Standard fields and your own custom data.'},
  {title: 'Email activity', description: 'Filter on opens, clicks and tracked events.'},
  {title: 'AND and OR together', description: 'Group conditions to say exactly who you mean.'},
  {title: 'Always current', description: 'A query, not a copy. Nothing to refresh.'},
  {title: 'Workflow branches', description: 'The same segment can split a workflow.'},
  {title: 'Subscription aware', description: 'Unsubscribed contacts are never mailed.'},
];

const faqs: FAQ[] = [
  {
    question: 'Do segments update on their own?',
    answer:
      'Yes. A segment is a query rather than a saved list, so it is evaluated whenever you use it. Contacts join and leave as their data and behaviour change, with nothing to refresh.',
  },
  {
    question: 'What can I filter on?',
    answer:
      'Any contact field, including custom data you set yourself, plus behaviour such as events tracked, emails opened and links clicked, and subscription status.',
  },
  {
    question: 'Can I combine conditions?',
    answer:
      'Yes. Conditions stack, and you can group them to express AND and OR together, so "pro plan and either inactive or never onboarded" is one segment.',
  },
  {
    question: 'Can a workflow use a segment?',
    answer:
      'Yes. Segments can gate a workflow branch as well as target a campaign, so the same audience definition works in both places.',
  },
];

export default function SegmentsFeature() {
  const [active, setActive] = useState<Example>(examples[0]!);

  return (
    <>
      <NextSeo
        title="Audience Segmentation - Target the Right Contacts | Plunk"
        description="Build segments from contact data, custom fields and email activity. Membership updates itself, and entering or leaving a segment can trigger a workflow."
        canonical="https://www.useplunk.com/features/segments"
        openGraph={{
          title: 'Audience Segmentation - Smart Contact Organization | Plunk',
          description:
            'Build segments from contact data, custom fields and email activity. Membership updates itself as contacts change.',
          url: 'https://www.useplunk.com/features/segments',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Audience+Segmentation&tag=Feature',
              alt: 'Plunk Audience Segmentation',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={'Not everyone needs this email.'}
          subtitle={
            'A segment is a query, re-run every time you use it. Ask once and the answer stays current as people sign up, change plan and go quiet.'
          }
          docsHref={`${WIKI_URI}/guides/segment-filters`}
          docsLabel={'Segment docs'}
          artifact={<SegmentSnippets />}
        />

        {/* The builder itself. The old page described AND/OR logic in prose and
            printed the conditions as tracked capitals, which left the reader to
            picture a query builder from a description of one. Showing the query
            answers the question that description kept dodging: is this a UI I
            click, or an API I have to write against? */}
        <FeatureSection title={'Three you could build today'}>
          <div className={'grid gap-10 lg:grid-cols-12'}>
            <div className={'lg:col-span-4'}>
              <ul className={'flex flex-col gap-2'}>
                {examples.map(example => {
                  const on = example.id === active.id;
                  return (
                    <li key={example.id}>
                      <button
                        onClick={() => setActive(example)}
                        aria-pressed={on}
                        className={
                          on
                            ? 'w-full rounded-card bg-tile p-5 text-left transition'
                            : 'w-full rounded-card p-5 text-left transition hover:bg-neutral-50'
                        }
                      >
                        <div
                          className={'font-display font-bold tracking-[-0.01em] text-neutral-900'}
                        >
                          {example.name}
                        </div>
                        <p className={'mt-1 text-neutral-600'}>{example.summary}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={'min-w-0 lg:col-span-8'}>
              <SnippetTile className={'h-full p-6 sm:p-10'}>
                <UICard className={'w-full p-6 sm:p-8'}>
                  <FilterBuilder total={active.total} conditions={active.conditions} />
                </UICard>
              </SnippetTile>
            </div>
          </div>
        </FeatureSection>

        <FeatureHighlights title={'What you can do with one'} claims={claims} extras={extras} />

        <FAQSection faqs={faqs} schemaId={'faq-segments'} />

        <FeatureCTA title={'Build your first segment.'} />

        <MoreFeatures current={'/features/segments'} />
      </main>

      <Footer />
    </>
  );
}

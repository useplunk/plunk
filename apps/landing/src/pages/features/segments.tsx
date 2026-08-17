import {
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureSection,
  FilterBuilder,
  Footer,
  Navbar,
  SpecList,
  Surface,
} from '../../components';
import type {FAQ} from '../../components';
import type {Condition, Spec} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React, {useState} from 'react';
import Head from 'next/head';

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
      {label: 'signed up < 30 days', remaining: 4902},
      {label: 'opened < 7 days', remaining: 2870},
      {label: 'plan = pro', remaining: 1146},
    ],
  },
  {
    id: 'dormant',
    name: 'Gone quiet',
    summary: 'Contacts who received the last campaign and never opened it.',
    total: 12480,
    conditions: [
      {label: 'no activity > 60 days', remaining: 5311},
      {label: 'delivered, not opened', remaining: 2984},
      {label: 'still subscribed', remaining: 2431},
    ],
  },
  {
    id: 'high-value',
    name: 'High value',
    summary: 'Customers worth treating differently from the rest of the list.',
    total: 12480,
    conditions: [
      {label: 'spent > 1000', remaining: 906},
      {label: 'purchased before', remaining: 742},
    ],
  },
];

const capabilities: Spec[] = [
  {
    title: 'Filters on anything you store',
    description:
      'Build conditions from the standard contact fields, from custom data you have attached, and from email activity, combined with AND or OR.',
  },
  {
    title: 'Membership that keeps itself current',
    description:
      'A dynamic segment is a query, not a copy. When a contact stops matching they leave, and when someone starts matching they join, with no rebuild step.',
  },
  {
    title: 'Entry and exit as triggers',
    description:
      'Joining or leaving a segment can start a workflow, so a change in what someone does can begin a sequence on its own.',
  },
  {
    title: 'Campaigns aimed at a subset',
    description:
      'Send to a segment instead of the whole list, so the people who would not care never receive it and your sending reputation stays intact.',
  },
  {
    title: 'Static lists when you want control',
    description:
      'Some groups are a judgement call rather than a query. Beta testers and VIPs can be picked by hand, and membership stays put until you change it.',
  },
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
      <Head>
        <title>Audience Segmentation - Target the Right Contacts | Plunk</title>
        <meta
          name="description"
          content="Build segments from contact data, custom fields and email activity. Membership updates itself, and entering or leaving a segment can trigger a workflow."
        />
        <meta property="og:title" content="Audience Segmentation - Smart Contact Organization | Plunk" />
        <meta
          property="og:description"
          content="Build segments from contact data, custom fields and email activity. Membership updates itself as contacts change."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=Audience+Segmentation&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta
          property="twitter:image"
          content="https://www.useplunk.com/api/og?title=Audience+Segmentation&tag=Feature"
        />
      </Head>

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={'Not everyone needs this email.'}
          subtitle={
            'A segment is a query, re-run every time you use it. Ask once and the answer stays current as people sign up, change plan and go quiet.'
          }
          docsHref={`${WIKI_URI}/docs/guides/segment-filters`}
          docsLabel={'Segment docs'}
        />

        {/* The builder itself. The old page described AND/OR logic in prose and
            printed the conditions as tracked capitals, which left the reader to
            picture a query builder from a description of one. Showing the query
            answers the question that description kept dodging: is this a UI I
            click, or an API I have to write against? */}
        <FeatureSection tone={'muted'} title={'Three you could build today'}>
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
                            ? 'w-full rounded-card border border-neutral-900 bg-neutral-900 p-5 text-left text-white transition'
                            : 'w-full rounded-card border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-900'
                        }
                      >
                        <div
                          className={`font-display font-bold tracking-[-0.01em] ${on ? 'text-white' : 'text-neutral-900'}`}
                        >
                          {example.name}
                        </div>
                        <p className={`mt-1 ${on ? 'text-neutral-300' : 'text-neutral-600'}`}>{example.summary}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={'min-w-0 lg:col-span-8'}>
              <Surface label={'segment'} meta={<span>{active.name}</span>} bodyClassName={'p-6 sm:p-8'}>
                <FilterBuilder total={active.total} conditions={active.conditions} />
              </Surface>
            </div>
          </div>
        </FeatureSection>

        {/* Capabilities */}
        <FeatureSection title={'How they behave'}>
          <SpecList specs={capabilities} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-segments'} />

        <FeatureCTA title={'Build your first segment.'} />
      </main>

      <Footer />
    </>
  );
}

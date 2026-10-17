import {Clock, Mail, Split, Zap} from 'lucide-react';

import {
  ClaimTiles,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  FlowFragment,
  Footer,
  MoreFeatures,
  Navbar,
  WorkflowEventFragment,
  WorkflowRunsFragment,
  WorkflowSnippets,
  WorkflowWebhookFragment,
} from '../../components';
import type {ChecklistItem, Claim, FAQ} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

/**
 * The three things a workflow does that a single email cannot, each shown.
 * The hero already shows the steps themselves (trigger, send, wait, branch),
 * so these show what happens around them.
 */
const claims: Claim[] = [
  {
    title: 'Starts from what people do',
    copy: 'Send one event from your app when something happens. The workflow starts for that contact on its own.',
    fragment: <WorkflowEventFragment />,
  },
  {
    title: 'See where everyone is',
    copy: 'Every run is visible while it happens: which step each contact is on and what comes next.',
    fragment: <WorkflowRunsFragment />,
  },
  {
    title: 'Talks to your other tools',
    copy: 'A step can call a webhook, so a sequence can update your CRM or start work elsewhere.',
    fragment: <WorkflowWebhookFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Delays on the clock', description: 'Wait an hour, a day or until a set date.'},
  {title: 'Branches on real data', description: 'Split on contact fields, custom data or an earlier open.'},
  {title: 'Exit when it worked', description: 'Stop the sequence once the contact does the thing.'},
  {title: 'Re-entry, your call', description: 'Run once per contact, or every time the event fires.'},
  {title: 'Visual builder', description: 'Drag in emails, delays, conditions and webhooks.'},
  {title: 'Same templates', description: 'Use the templates you already send from campaigns.'},
];

/** The flows people build first, drawn as the builder stacks them. */
const recipes: Claim[] = [
  {
    title: 'Onboarding',
    copy: 'Walk new signups through their first week.',
    fragment: (
      <FlowFragment
        steps={[
          {icon: Zap, label: 'Trigger', title: 'Contact signs up'},
          {icon: Mail, label: 'Send email', title: 'Welcome'},
          {icon: Clock, label: 'Delay', title: 'Wait 2 days'},
          {icon: Mail, label: 'Send email', title: 'Getting started'},
        ]}
      />
    ),
  },
  {
    title: 'Cart recovery',
    copy: 'Follow up while the checkout is still fresh.',
    fragment: (
      <FlowFragment
        steps={[
          {icon: Zap, label: 'Trigger', title: 'Checkout abandoned'},
          {icon: Clock, label: 'Delay', title: 'Wait 1 hour'},
          {icon: Mail, label: 'Send email', title: 'Still thinking it over?'},
          {icon: Mail, label: 'Send email', title: '10% off, today only'},
        ]}
      />
    ),
  },
  {
    title: 'Win-back',
    copy: 'Treat the quiet and the merely busy differently.',
    fragment: (
      <FlowFragment
        steps={[
          {icon: Zap, label: 'Trigger', title: 'Inactive for 30 days'},
          {icon: Split, label: 'Condition', title: 'Opened the last email?'},
          {icon: Mail, label: 'If no', title: 'We miss you'},
        ]}
      />
    ),
  },
];

const faqs: FAQ[] = [
  {
    question: 'What can trigger a workflow?',
    answer:
      'Any event you send Plunk from your own code, plus inbound email and contact changes. If your product can make an HTTP request when something happens, it can start a workflow.',
  },
  {
    question: 'Can a workflow branch on what someone did?',
    answer:
      'Yes. A branch checks a condition, such as whether an email was opened or a contact has a given field, and sends each answer down its own path.',
  },
  {
    question: 'What happens if someone enters a workflow twice?',
    answer:
      'You choose. A workflow can allow re-entry for things like abandoned carts, or run once per contact for things like onboarding.',
  },
  {
    question: 'Can I stop a sequence part way through?',
    answer:
      'Yes. A workflow can exit early when the contact does the thing it was nudging them toward, so nobody gets chased for something they already did.',
  },
];

export default function WorkflowsFeature() {
  return (
    <>
      <NextSeo
        title="Email Workflow Automation | Plunk"
        description="Build email automation from the events you already track. Triggers, delays, branching conditions and webhooks in a visual builder."
        canonical="https://www.useplunk.com/features/workflows"
        openGraph={{
          title: 'Email Workflow Automation - Automate Your Email Marketing | Plunk',
          description:
            'Build email automation from the events you already track. Triggers, delays, branching conditions and webhooks in a visual builder.',
          url: 'https://www.useplunk.com/features/workflows',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Email+Workflow+Automation&tag=Feature',
              alt: 'Plunk Email Workflow Automation',
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
              One event in.
              <br />A sequence out.
            </>
          }
          subtitle={
            'Send Plunk an event when something happens in your product. The emails, the waiting and the branching happen here.'
          }
          docsHref={`${WIKI_URI}/concepts/workflows`}
          docsLabel={'Workflow docs'}
          artifact={<WorkflowSnippets />}
        />

        <FeatureHighlights title={'What a workflow can do'} claims={claims} extras={extras} />

        <FeatureSection title={'Three that people build first'}>
          <ClaimTiles items={recipes} tileClassName={'min-h-96'} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-workflows'} />

        <FeatureCTA title={'Build your first workflow.'} />

        <MoreFeatures current={'/features/workflows'} />
      </main>

      <Footer />
    </>
  );
}

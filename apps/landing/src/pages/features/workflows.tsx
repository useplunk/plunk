import {
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureSection,
  Footer,
  Navbar,
  SpecList,
  StepSequence,
  WorkflowCanvas,
} from '../../components';
import type {FAQ} from '../../components';
import type {CanvasFlow, Spec, Step} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

/** The onboarding flow, as the builder would compose it. */
const onboarding: CanvasFlow = {
  steps: [
    {kind: 'trigger', label: 'Signs up', value: 'user.signed-up'},
    {kind: 'action', label: 'Welcome email'},
    {kind: 'wait', label: 'Wait', value: '2 days'},
    {kind: 'branch', label: 'Opened it?'},
  ],
  branches: [
    {answer: 'yes', label: 'Getting started'},
    {answer: 'no', label: 'Nudge'},
  ],
};

const steps: Step[] = [
  {
    title: 'Pick the trigger',
    body: 'Any event you already track starts a workflow: a signup, a purchase, a plan change. Contacts enter the moment the event fires.',
  },
  {
    title: 'Compose the flow',
    body: 'Drag in emails, delays, conditions and webhooks. Branches split on contact data or on how someone responded to an earlier step.',
  },
  {
    title: 'Turn it on',
    body: 'Every run is visible while it happens, so you can see where a contact is in the flow and what the next step will be.',
  },
];

const useCases: Spec[] = [
  {
    title: 'Onboarding',
    description:
      'Walk a new signup through the product over their first week, and stop sending the rest of the sequence once they have done the thing it was nudging them toward.',
    machine: 'user.signed-up → Welcome → Wait 2 days → Getting started',
  },
  {
    title: 'Cart recovery',
    description:
      'Follow up on an abandoned checkout while it is still live, then follow up again with an incentive if the first message goes unanswered.',
    machine: 'cart.abandoned → Wait 1 hour → Reminder → Wait 1 day → Discount',
  },
  {
    title: 'Re-engagement',
    description:
      'Catch contacts as they go quiet and branch on whether they opened the last thing you sent, so the dormant and the merely busy get different messages.',
    machine: 'contact.inactive → If opened last email → Update / Offer',
  },
];

const capabilities: Spec[] = [
  {
    title: 'Events, not schedules',
    description:
      'Workflows start from something a contact did. Send the event from your app with one API call and the flow takes over from there.',
  },
  {
    title: 'Delays that respect the clock',
    description:
      'Wait an hour, a day, or until a specific point in the future. Contacts sit in the delay without holding a connection open.',
  },
  {
    title: 'Branching on real data',
    description:
      'Split a flow on contact fields, on custom data you have attached, or on whether an earlier email in the same flow was opened.',
  },
  {
    title: 'Webhooks out',
    description:
      'A workflow step can call your own systems, so an email sequence can also update a CRM or kick off work elsewhere.',
  },
  {
    title: 'Re-entry, decided by you',
    description:
      'Choose whether a contact who triggers the same event twice runs the flow twice or is ignored the second time.',
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
          artifact={<WorkflowCanvas flow={onboarding} meta={'Onboarding'} />}
        />

        {/* Capabilities — a divided list rather than a card grid. Six bordered
            boxes made six items look equally important and equally skippable. */}
        <FeatureSection tone={'muted'} title={'What a step can do'}>
          <SpecList specs={capabilities} />
        </FeatureSection>

        {/* Build sequence — the one place on this page where numbers mean
            something, because the order is the instruction. */}
        <FeatureSection title={'Building one'}>
          <StepSequence steps={steps} />
        </FeatureSection>

        {/* Use cases — the flow strings are machine text, so they are set as
            Code: still monospace, no longer shouted in tracked capitals. */}
        <FeatureSection tone={'muted'} title={'Three that people build first'}>
          <SpecList specs={useCases} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-workflows'} />

        <FeatureCTA title={'Build your first workflow.'} />
      </main>

      <Footer />
    </>
  );
}

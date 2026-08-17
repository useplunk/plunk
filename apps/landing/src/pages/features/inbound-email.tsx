import {
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureSection,
  Footer,
  InboundMessage,
  Navbar,
  SpecList,
  StepSequence,
} from '../../components';
import type {FAQ, Spec, Step} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

const capabilities: Spec[] = [
  {
    title: 'Every address, one MX record',
    description:
      'Point your domain at Plunk once and every address on it starts receiving. You do not create mailboxes one at a time.',
    machine: 'support@, billing@, hello@',
  },
  {
    title: 'Senders become contacts',
    description:
      'Anyone who writes in is created as a contact if they do not already exist, so a reply is the start of a record rather than a dead end in someone inbox.',
  },
  {
    title: 'Parsed onto your webhook',
    description:
      'Headers, body, and attachments arrive as JSON on your endpoint, in real time, ready to route into a help desk or a CRM.',
    machine: 'POST /hooks/plunk',
  },
  {
    title: 'Filtered before it reaches you',
    description: 'Spam, virus, SPF, DKIM and DMARC checks run on every message first.',
  },
  {
    title: 'Triggers workflows',
    description:
      'An inbound message is an event like any other, so it can start a sequence, tag a contact, or send an auto-reply.',
  },
];

const useCases: Spec[] = [
  {
    title: 'Support inbox',
    description:
      'Mail to support@ creates a ticket in your help desk over a webhook and sends an acknowledgement back automatically, so nothing sits unanswered.',
    machine: 'Instant acknowledgement, automatic ticket, nothing missed',
  },
  {
    title: 'Lead capture',
    description:
      'Mail to info@ or sales@ adds the sender to your contacts and starts a nurture sequence timed from when they actually reached out.',
    machine: 'Zero-friction capture, auto-segmentation, instant follow-up',
  },
  {
    title: 'Two-way campaigns',
    description:
      'Let people reply to your campaigns. The reply lands on the same contact record and can tag them as engaged.',
    machine: 'Conversation history, engagement tracking',
  },
];

const steps: Step[] = [
  {
    title: 'Verify your domain',
    body: 'Add your domain in Plunk and configure the DKIM and SPF records in your DNS settings.',
  },
  {
    title: 'Add one MX record',
    body: 'Copy the MX record from your dashboard into your DNS. That routes incoming mail to Plunk.',
  },
  {
    title: 'Start receiving',
    body: 'Mail to any address at your domain now arrives, saves the sender, and can trigger workflows or webhooks.',
  },
];

const faqs: FAQ[] = [
  {
    question: 'Do I have to create each address I want to receive on?',
    answer:
      'No. One MX record covers the whole domain, so support@, billing@ and anything else all start working at once. You route them however you like on your own side.',
  },
  {
    question: 'What does Plunk send to my webhook?',
    answer:
      'A JSON payload with the sender, the recipient address, the subject, the parsed body and any attachments, plus the contact record the sender was matched to or created as.',
  },
  {
    question: 'Is inbound mail filtered for spam?',
    answer: 'Yes. Spam, virus, SPF, DKIM and DMARC checks run on every message before it reaches your webhook.',
  },
  {
    question: 'Can a reply trigger an automation?',
    answer:
      'Yes. An inbound message is an event like any other, so it can start a workflow, tag the contact, or fire an auto-reply.',
  },
];

export default function InboundEmailFeature() {
  return (
    <>
      <NextSeo
        title="Inbound Email - Receive and Process Emails at Your Domain | Plunk"
        description="Receive emails at your custom domain and automatically trigger workflows, capture contacts, or create support tickets. One MX record and every address starts receiving."
        canonical="https://www.useplunk.com/features/inbound-email"
        openGraph={{
          title: 'Inbound Email - Two-Way Email for Your Product | Plunk',
          description:
            'Receive emails at your custom domain and automatically trigger workflows, capture contacts, or create support tickets.',
          url: 'https://www.useplunk.com/features/inbound-email',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Inbound+Email&tag=Feature',
              alt: 'Plunk Inbound Email',
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
              Emails in,
              <br />
              actions out.
            </>
          }
          subtitle={'Receive at your own domain, save the sender as a contact, and trigger a workflow from the reply.'}
          docsHref={`${WIKI_URI}/guides/receiving-emails`}
          docsLabel={'Inbound docs'}
          artifact={<InboundMessage />}
        />

        <FeatureSection
          tone={'muted'}
          title={'What arrives, and what happens next'}
          intro={'Receiving is the easy half. What Plunk does with the message afterwards is the point.'}
        >
          <SpecList specs={capabilities} />
        </FeatureSection>

        <FeatureSection title={'Setting it up'}>
          <StepSequence steps={steps} />
        </FeatureSection>

        <FeatureSection tone={'muted'} title={'What teams use it for'}>
          <SpecList specs={useCases} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-inbound-email'} />

        <FeatureCTA title={'Start receiving at your domain.'} />
      </main>

      <Footer />
    </>
  );
}

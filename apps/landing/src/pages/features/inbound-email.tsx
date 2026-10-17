import {Inbox, Megaphone, Reply, UserPlus, Webhook, Zap} from 'lucide-react';

import {
  ClaimTiles,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  FlowFragment,
  Footer,
  InboundAutoReplyFragment,
  InboundChecksFragment,
  InboundSnippets,
  InboundWebhookFragment,
  MoreFeatures,
  Navbar,
  StepSequence,
} from '../../components';
import type {ChecklistItem, Claim, FAQ, Step} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

/**
 * The hero shows a message arriving and becoming a contact. These show what
 * else happens to it.
 */
const claims: Claim[] = [
  {
    title: 'Forwarded to your systems',
    copy: 'Sender, subject, body and attachments arrive on your webhook in real time, ready for a help desk or CRM.',
    fragment: <InboundWebhookFragment />,
  },
  {
    title: 'Checked before it reaches you',
    copy: 'Spam, virus, SPF, DKIM and DMARC checks run on every message first.',
    fragment: <InboundChecksFragment />,
  },
  {
    title: 'Answered straight away',
    copy: 'A message is an event like any other, so it can send an auto-reply or start a workflow.',
    fragment: <InboundAutoReplyFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Every address at once', description: 'One MX record covers the whole domain.'},
  {title: 'Senders become contacts', description: 'New senders are added to your contacts.'},
  {title: 'Starts workflows', description: 'Any inbound message can trigger a sequence.'},
  {title: 'Attachments included', description: 'Files arrive with the message on your webhook.'},
  {title: 'Replies on the record', description: 'Answers to campaigns land on the same contact.'},
  {title: 'Your own routing', description: 'Route each address however you like.'},
];

/** What teams build with it, drawn as the flows they are. */
const recipes: Claim[] = [
  {
    title: 'Support inbox',
    copy: 'Every message becomes a ticket and gets an instant reply.',
    fragment: (
      <FlowFragment
        steps={[
          {icon: Inbox, label: 'Email to', title: 'support@acme.com'},
          {icon: Webhook, label: 'Webhook', title: 'Create a help desk ticket'},
          {icon: Reply, label: 'Auto-reply', title: 'We got your message'},
        ]}
      />
    ),
  },
  {
    title: 'Lead capture',
    copy: 'People who write in start a nurture sequence on their own.',
    fragment: (
      <FlowFragment
        steps={[
          {icon: Inbox, label: 'Email to', title: 'sales@acme.com'},
          {icon: UserPlus, label: 'New contact', title: 'Ana Ruiz'},
          {icon: Zap, label: 'Workflow started', title: 'Nurture'},
        ]}
      />
    ),
  },
  {
    title: 'Two-way campaigns',
    copy: 'Let people reply to campaigns and see who is engaged.',
    fragment: (
      <FlowFragment
        steps={[
          {icon: Megaphone, label: 'Campaign', title: 'August update'},
          {icon: Reply, label: 'Reply from', title: 'Ana Ruiz'},
          {icon: UserPlus, label: 'Contact updated', title: 'Tagged as engaged'},
        ]}
      />
    ),
  },
];

const steps: Step[] = [
  {title: 'Verify your domain', body: 'Add it in Plunk and set the DKIM and SPF records.'},
  {title: 'Add one MX record', body: 'Copy it from your dashboard into your DNS.'},
  {title: 'Start receiving', body: 'Mail to any address at your domain now arrives.'},
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
        title="Inbound Email - Receive Emails at Your Domain | Plunk"
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
          artifact={<InboundSnippets />}
        />

        <FeatureHighlights title={'What happens to a message'} claims={claims} extras={extras} />

        <FeatureSection title={'What teams use it for'}>
          <ClaimTiles items={recipes} tileClassName={'min-h-96'} />
        </FeatureSection>

        <FeatureSection title={'Setting it up'}>
          <StepSequence steps={steps} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-inbound-email'} />

        <FeatureCTA title={'Start receiving at your domain.'} />

        <MoreFeatures current={'/features/inbound-email'} />
      </main>

      <Footer />
    </>
  );
}

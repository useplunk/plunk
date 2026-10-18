import React from 'react';

import type {FAQ} from '../../components/FAQSection';
import {
  CutoverSection,
  DomainSection,
  GuideCode,
  GuideLayout,
  GuideSection,
  GuideTable,
  ImportRules,
  InfoBox,
  WebhooksSection,
  plunkSend,
} from '../../components/guides';

/**
 * Loops facts below are from loops.so/docs, checked October 2026: the
 * contact CSV download (one column per property, subscribed included), the
 * per-address suppression endpoint, POST /api/v1/transactional and
 * /api/v1/events/send, template tag syntax and the LMX-only email export,
 * workflows (renamed from loops in May 2026), webhook event names, and the
 * envelope. subdomain records.
 */

const faqs: FAQ[] = [
  {
    question: 'How do Loops mailing lists map to Plunk?',
    answer:
      'Plunk has no mailing lists. Export each list from Loops with a filter, add a column such as list to the CSV, and build a segment on that field. The segment can be a campaign audience or a workflow trigger.',
  },
  {
    question: 'Can I export my Loops email designs as HTML?',
    answer:
      'Not directly. Loops’ API returns an email’s content as LMX, its own markup, not HTML. The practical route is to send yourself each email from Loops, copy the design into Plunk’s editor, and swap the tags for Liquid variables.',
  },
  {
    question: 'What happens to contacts Loops suppressed after bounces or complaints?',
    answer:
      'Loops has no bulk export of its suppression list; its API checks one address at a time. Contacts who unsubscribed are in the CSV with subscribed false, but for bounced addresses you need to check the ones that matter or ask Loops support.',
  },
  {
    question: 'Is pricing different after the move?',
    answer:
      'Yes. Loops plans are sized by contacts. Plunk stores contacts for free and charges $0.001 per email sent, with a free plan for up to 1,000 emails a month.',
  },
];

export default function MigrateFromLoops() {
  return (
    <GuideLayout
      slug={'migrate-from-loops'}
      title="How to Migrate from Loops to Plunk"
      heading={'Migrate from Loops'}
      description="A step-by-step guide to moving from Loops to Plunk: domain, contacts and properties, transactional emails, events and workflows, and webhooks."
      lead={
        'Loops and Plunk work the same way: contacts with properties, events that start workflows, and transactional emails sent from templates. Moving means importing the contact CSV, recreating emails, and pointing your event and send calls at Plunk.'
      }
      lastUpdated="2026-10-17"
      readTime="8 min"
      canonical="https://www.useplunk.com/guides/migrate-from-loops"
      faqs={faqs}
      cta={'Move from Loops at your own pace.'}
    >
      <GuideSection id={'overview'} title={'What moves, and what you rebuild'}>
        <GuideTable
          head={['From Loops', 'In Plunk', 'How']}
          rows={[
            ['Sending domain', 'Domain', 'New DNS records, alongside Loops’'],
            ['Contacts and properties', 'Contacts and custom fields', 'CSV import, subscription status included'],
            ['Mailing lists', 'Segments', 'A column per list, then a segment'],
            ['Transactional emails', 'Templates', 'Recreate the design, swap tags for Liquid'],
            ['Events', 'Tracked events', 'Change the endpoint'],
            ['Workflows (formerly loops)', 'Workflows', 'Rebuild by hand'],
            ['Webhooks', 'Workflows with a webhook step', 'Rebuild by hand'],
          ]}
        />
      </GuideSection>

      <DomainSection
        provider={'Loops'}
        theirRecords={'Loops puts its SPF and MX records on an envelope. subdomain of your sending domain.'}
      />

      <GuideSection id={'contacts'} title={'2. Move contacts'}>
        <p>
          In Loops, open your audience, use the <strong>•••</strong> menu next to the filter box and choose{' '}
          <strong>Download</strong>. The CSV has one column per contact property, including <code>email</code> and{' '}
          <code>subscribed</code>, which Plunk reads as they are. No renaming is needed for those two.
        </p>
        <p>
          Custom properties come along as custom fields, lowercased: <code>firstName</code> becomes{' '}
          <code>firstname</code> and <code>userId</code> becomes <code>userid</code>. Templates and segments then refer
          to the lowercase names.
        </p>
        <ImportRules />
        <InfoBox title={'Suppressed addresses are not in the CSV'}>
          Loops keeps bounced and complained addresses on a suppression list it does not export in bulk. Its API only
          checks one address at a time (<code>GET /api/v1/contacts/suppression?email=</code>). Unsubscribes, on the
          other hand, are in the CSV.
        </InfoBox>
      </GuideSection>

      <GuideSection id={'templates'} title={'3. Recreate your emails'}>
        <p>
          Loops can export an email’s content only as LMX, its own markup, through{' '}
          <code>GET /api/v1/email-messages/{'{id}'}</code>. There is no HTML export, so recreate each design in Plunk’s
          editor and change the tags:
        </p>
        <GuideTable
          mono
          head={['Loops', 'Plunk']}
          rows={[
            ['{firstName} or {contact.firstName}', '{{firstname}}'],
            ['{DATA_VARIABLE:orderId} or {data.orderId}', '{{orderId}}'],
            ['{EVENT_PROPERTY:plan} or {event.plan}', '{{plan}}, once the event saves it on the contact'],
          ]}
        />
        <p>
          In Loops, a transactional email’s subject, sender and reply-to live in the email itself. Plunk templates hold
          them too, as defaults the send request can override.
        </p>
      </GuideSection>

      <GuideSection id={'sending'} title={'4. Change your API calls'}>
        <p>Transactional sends map almost field for field:</p>
        <GuideTable
          mono
          head={['Loops /api/v1/transactional', 'Plunk /v1/send', 'Notes']}
          rows={[
            ['transactionalId', 'template', 'The Plunk template’s ID'],
            ['email', 'to', 'A string, {name, email} or an array'],
            ['dataVariables', 'data', ''],
            ['addToAudience', 'subscribed', 'Every recipient becomes a Plunk contact; subscribed: true also opts them in'],
            ['attachments[] {filename, contentType, data}', 'attachments[] {filename, contentType, content}', 'Enabled for everyone, no support request'],
            ['Idempotency-Key header', 'Idempotency-Key header', 'Kept for 24 hours'],
          ]}
        />
        <GuideCode
          title={'Before: Loops'}
          code={`await fetch('https://app.loops.so/api/v1/transactional', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.LOOPS_API_KEY}\`,
  },
  body: JSON.stringify({
    transactionalId: 'clfq6dinn000yl70fgwwyp82l',
    email: 'ana@acme.com',
    dataVariables: {orderId: '3980'},
  }),
});`}
        />
        <GuideCode
          title={'After: Plunk'}
          code={plunkSend(`{
    template: 'YOUR_PLUNK_TEMPLATE_ID',
    to: 'ana@acme.com',
    data: {orderId: '3980'},
  }`)}
        />
        <p>Events move the same way:</p>
        <GuideTable
          mono
          head={['Loops /api/v1/events/send', 'Plunk /v1/track']}
          rows={[
            ['email', 'email'],
            ['eventName', 'event'],
            ['eventProperties and root-level contact properties', 'data'],
            ['mailingLists', 'A field in data, plus a segment on it'],
          ]}
        />
        <p>
          Simple values in <code>data</code> are saved on the contact. Wrap a value as{' '}
          <code>{'{value: …, persistent: false}'}</code> to make it available to the workflow without storing it. The
          track endpoint accepts your public key, so it can run in the browser.
        </p>
        <p>
          If you used Loops’ SMTP server, note that it expects a JSON body naming a transactional email. Plunk’s SMTP
          server takes ordinary email instead: host <code>smtp.useplunk.com</code>, port 587, username{' '}
          <code>plunk</code> and your secret key as the password.
        </p>
      </GuideSection>

      <GuideSection id={'workflows'} title={'5. Rebuild workflows'}>
        <p>
          Loops returns a workflow’s structure from <code>GET /api/v1/workflows/{'{id}'}</code>, one node at a time, so
          it can serve as a checklist, but there is no import. Rebuild each one in Plunk: the trigger becomes an event,
          segment entry or schedule trigger, and the emails, delays and branches become steps.
        </p>
      </GuideSection>

      <WebhooksSection
        id={'webhooks'}
        title={'6. Rebuild webhooks'}
        provider={'Loops'}
        mapping={[
          ['transactional.email.sent, campaign.email.sent, loop.email.sent', 'email.sent'],
          ['email.delivered', 'email.delivery'],
          ['email.opened', 'email.open'],
          ['email.clicked', 'email.click'],
          ['email.hardBounced, email.softBounced', 'email.bounce'],
          ['email.spamReported', 'email.complaint'],
          ['contact.unsubscribed, email.unsubscribed', 'contact.unsubscribed'],
          ['email.resubscribed', 'contact.subscribed'],
        ]}
      />

      <CutoverSection provider={'Loops'} title={'7. Switch over'} />
    </GuideLayout>
  );
}

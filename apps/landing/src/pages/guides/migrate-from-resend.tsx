import React from 'react';

import type {FAQ} from '../../components/FAQSection';
import {
  CutoverSection,
  DomainSection,
  GuideCode,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideTable,
  ImportRules,
  InfoBox,
  SmtpSwap,
  WebhooksSection,
  plunkSend,
} from '../../components/guides';

/**
 * Resend facts below are from resend.com/docs, checked October 2026: contact
 * export and the list-contacts API (`unsubscribed` boolean), the suppression
 * list CSV, POST /emails fields, template variables, automations, webhook
 * event names, and the resend._domainkey / send. DNS records.
 */

const faqs: FAQ[] = [
  {
    question: 'Can I keep using React Email?',
    answer:
      'Yes, but render it yourself. Resend’s react field is a feature of its Node SDK. With Plunk, call render() from @react-email/render and pass the HTML string as body, or paste the rendered HTML into a Plunk template.',
  },
  {
    question: 'Does Plunk support cc, bcc and scheduled sends?',
    answer:
      'Not on the send endpoint. Plunk sends each address in to as its own email, and has no cc, bcc or scheduled_at. Schedule on your side with a job queue, or use a campaign, which can be scheduled.',
  },
  {
    question: 'Will my unsubscribed contacts stay unsubscribed?',
    answer:
      'Only if you bring that status with you. Resend’s API returns unsubscribed: true for them; write subscribed: false in your import CSV. Do the same for every address on Resend’s suppression list.',
  },
  {
    question: 'How long does the move take?',
    answer:
      'Domain verification depends on how fast your DNS updates. The rest depends on how many templates and automations you have: sending code is usually a small change, while each automation has to be rebuilt by hand.',
  },
];

export default function MigrateFromResend() {
  return (
    <GuideLayout
      slug={'migrate-from-resend'}
      title="How to Migrate from Resend to Plunk"
      heading={'Migrate from Resend'}
      description="A step-by-step guide to moving from Resend to Plunk: domains, contacts and suppressions, templates, sending code, automations and webhooks."
      lead={
        'Moving from Resend means verifying your domain in Plunk, importing contacts with their subscription status, porting templates, and changing your send calls. Resend can keep sending the whole time.'
      }
      lastUpdated="2026-10-17"
      readTime="8 min"
      canonical="https://www.useplunk.com/guides/migrate-from-resend"
      faqs={faqs}
      cta={'Move from Resend at your own pace.'}
    >
      <GuideSection id={'overview'} title={'What moves, and what you rebuild'}>
        <GuideTable
          head={['From Resend', 'In Plunk', 'How']}
          rows={[
            ['Domain', 'Domain', 'New DNS records, alongside Resend’s'],
            ['Contacts', 'Contacts', 'CSV import'],
            ['Unsubscribes and suppressions', 'Unsubscribed contacts', 'CSV import with subscribed set to false'],
            ['Templates', 'Templates', 'Copy the HTML, rewrite the variables'],
            ['emails.send calls', 'POST /v1/send', 'Rename a few fields'],
            ['Automations and events', 'Workflows and tracked events', 'Rebuild by hand'],
            ['Webhooks', 'Workflows with a webhook step', 'Rebuild by hand'],
          ]}
        />
      </GuideSection>

      <DomainSection
        provider={'Resend'}
        theirRecords={
          'Resend signs with a TXT record at resend._domainkey and puts its SPF and MX records on the send. subdomain.'
        }
      />

      <GuideSection id={'contacts'} title={'2. Move contacts and suppressions'}>
        <p>
          Export contacts from the Contacts page in Resend with <strong>Export</strong>. Exports over 1,000 contacts
          arrive by email. Resend does not document the export’s columns, so open the file and check that every contact
          you have unsubscribed is marked as such.
        </p>
        <p>
          If it is not, use the API instead: <code>GET /contacts</code> returns each contact’s <code>email</code>,{' '}
          <code>first_name</code>, <code>last_name</code> and <code>unsubscribed</code>. Note the flag is inverted: write{' '}
          <code>subscribed</code> as the opposite of <code>unsubscribed</code>.
        </p>
        <p>
          Then download Resend’s suppression list (Suppressions → Download CSV). It holds addresses that bounced or
          complained. Add each one to your import with <code>subscribed</code> set to <code>false</code>.
        </p>
        <ImportRules />
        <GuideCode
          title={'contacts.csv'}
          code={`email,firstname,lastname,subscribed
ana@acme.com,Ana,Ruiz,true
tom@northwind.io,Tom,Berg,false
old@contoso.com,,,false`}
        />
        <InfoBox title={'Unsubscribed is not the same as blocked'}>
          In Plunk, an unsubscribed contact stops receiving marketing email, but the send endpoint still delivers
          transactional email to them. If you relied on Resend refusing to send to suppressed addresses, check bounced
          addresses in your own code before sending.
        </InfoBox>
      </GuideSection>

      <GuideSection id={'templates'} title={'3. Move templates'}>
        <p>
          Resend has no template export in the dashboard, but <code>GET /templates/{'{id}'}</code> returns each
          template’s <code>html</code>, <code>subject</code> and variables. Create a template in Plunk, switch the editor
          to HTML and paste it in.
        </p>
        <p>
          Plunk renders variables with Liquid. Resend’s <code>{'{{{PRODUCT}}}'}</code> becomes{' '}
          <code>{'{{PRODUCT}}'}</code>. Its reserved keys map to contact fields: <code>{'{{{FIRST_NAME}}}'}</code> to whatever you named that CSV column, lowercased, such as{' '}
          <code>{'{{firstname}}'}</code>, <code>{'{{{EMAIL}}}'}</code> to <code>{'{{email}}'}</code>{' '}
          and <code>{'{{{UNSUBSCRIBE_URL}}}'}</code> to <code>{'{{unsubscribeUrl}}'}</code>.
        </p>
      </GuideSection>

      <GuideSection id={'sending'} title={'4. Change your sending code'}>
        <GuideTable
          mono
          head={['Resend field', 'Plunk field', 'Notes']}
          rows={[
            ['from', 'from', 'A string, or {name, email}'],
            ['to', 'to', 'A string, {name, email} or an array; each address gets its own email'],
            ['subject', 'subject', ''],
            ['html', 'body', ''],
            ['text', '(none)', 'Plunk builds the plain-text part from the HTML'],
            ['reply_to', 'reply', 'A single address'],
            ['headers', 'headers', ''],
            ['attachments', 'attachments', 'filename, base64 content, contentType; 10 files and 10 MB by default'],
            ['template {id, variables}', 'template, data', 'data also fills contact fields used in the template'],
            ['Idempotency-Key header', 'Idempotency-Key header', 'Same idea, kept for 24 hours'],
            ['cc, bcc, scheduled_at, tags, topic_id', '(none)', 'Not supported on the send endpoint'],
          ]}
        />
        <GuideCode
          title={'Before: Resend'}
          code={`await resend.emails.send({
  from: 'Acme <hello@acme.com>',
  to: 'ana@acme.com',
  subject: 'Welcome to Acme',
  html: '<p>Thanks for signing up.</p>',
  replyTo: 'support@acme.com',
});`}
        />
        <GuideCode
          title={'After: Plunk'}
          code={plunkSend(`{
    from: {name: 'Acme', email: 'hello@acme.com'},
    to: 'ana@acme.com',
    subject: 'Welcome to Acme',
    body: '<p>Thanks for signing up.</p>',
    reply: 'support@acme.com',
  }`)}
        />
        <SmtpSwap
          provider={'Resend'}
          theirs={`host:     smtp.resend.com
username: resend
password: your Resend API key`}
        />
      </GuideSection>

      <GuideSection id={'automations'} title={'5. Rebuild automations'}>
        <p>
          Resend’s API returns each automation as JSON (<code>GET /automations/{'{id}'}</code>), which is a useful
          checklist, but there is no import: you rebuild each one as a Plunk workflow. Most steps have a direct
          counterpart:
        </p>
        <GuidePoints
          columns={2}
          items={[
            {title: 'Send Email', body: 'Send email step, using a Plunk template.'},
            {title: 'Delay', body: 'Delay step, in minutes, hours or days.'},
            {title: 'Wait for Event', body: 'Wait for event step.'},
            {title: 'Condition', body: 'Condition step, with as many branches as you need.'},
            {title: 'Contact Update', body: 'Update contact step.'},
            {
              title: 'Add to Segment',
              body: 'Set a contact field with an Update contact step, and build a dynamic segment on that field.',
            },
          ]}
        />
        <p>
          Events you send to Resend with <code>POST /events/send</code> go to Plunk’s <code>POST /v1/track</code>{' '}
          instead, with <code>email</code>, <code>event</code> and an optional <code>data</code> object. The track
          endpoint accepts your public key, so it can be called from the browser.
        </p>
      </GuideSection>

      <WebhooksSection
        id={'webhooks'}
        title={'6. Rebuild webhooks'}
        provider={'Resend'}
        mapping={[
          ['email.sent', 'email.sent'],
          ['email.delivered', 'email.delivery'],
          ['email.opened', 'email.open'],
          ['email.clicked', 'email.click'],
          ['email.bounced', 'email.bounce'],
          ['email.complained', 'email.complaint'],
          ['email.received', 'email.received'],
          ['contact.updated (unsubscribes)', 'contact.unsubscribed'],
        ]}
      />

      <CutoverSection provider={'Resend'} id={'switch'} title={'7. Switch over'} />
    </GuideLayout>
  );
}

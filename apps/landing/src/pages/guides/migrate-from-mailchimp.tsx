import React from 'react';

import type {FAQ} from '../../components/FAQSection';
import {
  CutoverSection,
  DomainSection,
  GuideCode,
  GuideLayout,
  GuideSection,
  GuideSteps,
  GuideTable,
  ImportRules,
  InfoBox,
  SmtpSwap,
  WebhooksSection,
  plunkSend,
} from '../../components/guides';

/**
 * Mailchimp facts below are from mailchimp.com/help and mailchimp.com/developer,
 * checked October 2026: the audience export ZIP (one CSV per status), template
 * export for custom-coded templates only, merge tags, no export for automation
 * flows, audience and Transactional webhooks, the Transactional messages/send
 * fields and SMTP, and the authentication records.
 */

const faqs: FAQ[] = [
  {
    question: 'I have several Mailchimp audiences. How does that work in Plunk?',
    answer:
      'A Plunk project has one contact list. Import each audience with an extra column naming it, such as audience, and build a segment per audience on that field. A contact in two audiences becomes one contact, since the second import updates the first.',
  },
  {
    question: 'Can I move drag-and-drop templates?',
    answer:
      'Not as files. Mailchimp only exports custom-coded templates. Rebuild drag-and-drop designs in Plunk’s editor; most newsletters are a handful of blocks, so this is usually quicker than it sounds.',
  },
  {
    question: 'Do I need to add an unsubscribe link?',
    answer:
      'Not for marketing templates: Plunk adds a hosted unsubscribe footer to them automatically. Remove Mailchimp’s *|UNSUB|* link, or use {{unsubscribeUrl}} in a headless template if you want to place the link yourself.',
  },
  {
    question: 'What about my campaign reports?',
    answer:
      'They stay in Mailchimp. Its account export includes campaigns and reports, so download it before you close the account; Plunk starts its own history from your first send.',
  },
];

export default function MigrateFromMailchimp() {
  return (
    <GuideLayout
      slug={'migrate-from-mailchimp'}
      title="How to Migrate from Mailchimp to Plunk"
      heading={'Migrate from Mailchimp'}
      description="A step-by-step guide to moving from Mailchimp to Plunk: domain, audiences and unsubscribes, templates and merge tags, automation flows, and Mailchimp Transactional."
      lead={
        'Moving from Mailchimp means exporting your audience with every status, importing it with the right subscription flags, rebuilding templates, and recreating automation flows. Mailchimp can keep sending until you are ready.'
      }
      lastUpdated="2026-10-17"
      readTime="8 min"
      canonical="https://www.useplunk.com/guides/migrate-from-mailchimp"
      faqs={faqs}
      cta={'Move from Mailchimp at your own pace.'}
    >
      <GuideSection id={'overview'} title={'What moves, and what you rebuild'}>
        <GuideTable
          head={['From Mailchimp', 'In Plunk', 'How']}
          rows={[
            ['Domain authentication', 'Domain', 'New DNS records, alongside Mailchimp’s'],
            ['Audience (subscribed)', 'Contacts', 'CSV import'],
            ['Unsubscribed, cleaned and non-subscribed', 'Unsubscribed contacts', 'CSV import with subscribed set to false'],
            ['Tags and audience fields', 'Custom fields', 'Come along in the CSV'],
            ['Custom-coded templates', 'Templates', 'Export the HTML, rewrite merge tags'],
            ['Drag-and-drop templates', 'Templates', 'Rebuild in Plunk’s editor'],
            ['Automation flows', 'Workflows', 'Rebuild by hand; Mailchimp has no export'],
            ['Mailchimp Transactional', 'POST /v1/send or SMTP', 'Change the request or the SMTP settings'],
          ]}
        />
      </GuideSection>

      <DomainSection
        provider={'Mailchimp'}
        theirRecords={
          'Mailchimp authenticates with its own two CNAME records, and Mailchimp Transactional with mte1._domainkey and mte2._domainkey.'
        }
      />

      <GuideSection id={'contacts'} title={'2. Move your audience'}>
        <p>
          In Mailchimp, open <strong>Audience</strong>, pick the audience and choose <strong>Export audience</strong>. You
          get a ZIP with a separate CSV for each status. That split is the useful part, because each file maps to one
          subscription state in Plunk:
        </p>
        <GuideTable
          head={['File in the export', 'subscribed in Plunk']}
          rows={[
            ['Subscribed', 'true'],
            ['Unsubscribed', 'false'],
            ['Cleaned (addresses that bounced)', 'false'],
            ['Non-subscribed (never opted in)', 'false'],
          ]}
        />
        <GuideSteps
          steps={[
            {
              title: 'Rename the address column',
              body: 'Mailchimp calls it Email Address. Plunk needs a column named email, and skips rows without one.',
            },
            {
              title: 'Add a subscribed column',
              body: 'Set it per file as in the table above. Combining the four files into one CSV is fine.',
            },
            {
              title: 'Tidy the field names you will use',
              body: 'Headers are lowercased on import, so First Name becomes first name. Renaming it to firstname gives you {{firstname}} in templates.',
            },
            {
              title: 'Import',
              body: 'Contacts → Import in Plunk. Files are limited to 5 MB, so split a large audience into several.',
            },
          ]}
        />
        <ImportRules />
        <p>
          Tags arrive as a text field. A segment with the <code>contains</code> operator on it rebuilds each tag as an
          audience you can send campaigns to.
        </p>
        <InfoBox title={'Exports are for owners and admins'}>
          Only Owner and Admin users can export an audience in Mailchimp, and finished exports are kept for 30 days.
        </InfoBox>
      </GuideSection>

      <GuideSection id={'templates'} title={'3. Move templates'}>
        <p>
          For custom-coded templates, choose <strong>Export as template</strong> in Mailchimp to download the HTML, then
          paste it into a Plunk template in HTML mode. Mailchimp cannot export drag-and-drop templates, so rebuild those
          in Plunk’s visual editor.
        </p>
        <p>Merge tags become Liquid variables named after your imported columns:</p>
        <GuideTable
          mono
          head={['Mailchimp', 'Plunk']}
          rows={[
            ['*|FNAME|*', '{{firstname}} (or {{first name}} if you kept the header)'],
            ['*|EMAIL|*', '{{email}}'],
            ['*|UNSUB|*', 'Remove it: marketing templates get Plunk’s footer'],
            ['*|IF:FNAME|* … *|END:IF|*', '{% if firstname %} … {% endif %}'],
          ]}
        />
      </GuideSection>

      <GuideSection id={'automations'} title={'4. Rebuild automation flows'}>
        <p>
          Mailchimp cannot export automation flows; it can only copy them to another audience in the same account. Write
          down each flow’s trigger, emails and delays, then rebuild it as a Plunk workflow.
        </p>
        <p>
          Flows that start when someone joins your audience map to a workflow on the{' '}
          <code>contact.subscribed</code> event or on entering a segment. Flows that start from something in your product
          become a workflow on a custom event you send to <code>POST /v1/track</code>.
        </p>
      </GuideSection>

      <GuideSection id={'transactional'} title={'5. Move Mailchimp Transactional'}>
        <p>If you send receipts or password resets through Mailchimp Transactional (formerly Mandrill):</p>
        <GuideTable
          mono
          head={['messages/send', 'Plunk /v1/send', 'Notes']}
          rows={[
            ['message.html', 'body', 'Plunk builds the plain-text part itself'],
            ['message.subject', 'subject', ''],
            ['message.from_email, from_name', 'from {email, name}', ''],
            ['message.to[] (type "to")', 'to', 'cc and bcc types are not supported'],
            ['global_merge_vars', 'data', ''],
            ['merge_vars (per recipient)', 'data', 'Send one request per recipient'],
            ['message.headers', 'headers', ''],
            ['message.attachments[] {type, name, content}', 'attachments[] {contentType, filename, content}', ''],
          ]}
        />
        <GuideCode
          title={'After: Plunk'}
          code={plunkSend(`{
    to: 'ana@acme.com',
    from: {email: 'hello@acme.com', name: 'Acme'},
    subject: 'Your receipt',
    body: '<p>Thanks, {{firstname}}. Your order is on its way.</p>',
    data: {firstname: 'Ana'},
  }`)}
        />
        <SmtpSwap
          provider={'Mailchimp Transactional'}
          theirs={`host:     smtp.mandrillapp.com
username: any string
password: your Transactional API key`}
        />
      </GuideSection>

      <WebhooksSection
        id={'webhooks'}
        title={'6. Rebuild webhooks'}
        provider={'Mailchimp'}
        mapping={[
          ['subscribe (audience)', 'contact.subscribed'],
          ['unsubscribe (audience), unsub', 'contact.unsubscribed'],
          ['send', 'email.sent'],
          ['delivered', 'email.delivery'],
          ['open', 'email.open'],
          ['click', 'email.click'],
          ['hard_bounce, soft_bounce, cleaned', 'email.bounce'],
          ['spam', 'email.complaint'],
        ]}
      />

      <CutoverSection provider={'Mailchimp'} title={'7. Switch over'} />
    </GuideLayout>
  );
}

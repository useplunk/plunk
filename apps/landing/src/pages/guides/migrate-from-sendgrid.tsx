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
  SmtpSwap,
  WebhooksSection,
  plunkSend,
} from '../../components/guides';

/**
 * SendGrid facts below are from twilio.com/docs/sendgrid, checked October
 * 2026: contact export (UI and /v3/marketing/contacts/exports), the six
 * suppression types and their exports, /v3/mail/send fields, Handlebars in
 * dynamic templates, the lack of an automation export, Event Webhook event
 * names, and the em####, s1/s2._domainkey records.
 */

const faqs: FAQ[] = [
  {
    question: 'What happens to SendGrid unsubscribe groups?',
    answer:
      'Plunk has one subscription status per contact, not groups. Decide per group: contacts who left a newsletter group might still want product updates. If in doubt, import them as unsubscribed; it is the safe choice under GDPR and CAN-SPAM.',
  },
  {
    question: 'Do I need to change my templates?',
    answer:
      'Mostly the logic. Plain variables like {{first_name}} work as they are. Handlebars blocks such as {{#if}} and {{#each}} become Liquid tags, and helpers like formatDate become Liquid filters.',
  },
  {
    question: 'Can I keep my dedicated IP?',
    answer:
      'No. Plunk sends through Amazon SES and does not offer dedicated IPs. Your reputation comes with your domain, which you authenticate with DKIM in Plunk.',
  },
  {
    question: 'Does Plunk support cc, bcc and scheduled sends?',
    answer:
      'Not on the send endpoint. Each address in to gets its own email, and there is no send_at. Schedule on your side, or use a Plunk campaign, which can be scheduled.',
  },
];

export default function MigrateFromSendGrid() {
  return (
    <GuideLayout
      slug={'migrate-from-sendgrid'}
      title="How to Migrate from SendGrid to Plunk"
      heading={'Migrate from SendGrid'}
      description="A step-by-step guide to moving from SendGrid to Plunk: domain authentication, contacts and suppressions, dynamic templates, mail/send code, automations and the Event Webhook."
      lead={
        'Moving from SendGrid means verifying your domain in Plunk, importing contacts together with every suppression list, converting Handlebars templates to Liquid, and replacing mail/send calls. SendGrid keeps sending until you switch.'
      }
      lastUpdated="2026-10-17"
      readTime="9 min"
      canonical="https://www.useplunk.com/guides/migrate-from-sendgrid"
      faqs={faqs}
      cta={'Move from SendGrid at your own pace.'}
    >
      <GuideSection id={'overview'} title={'What moves, and what you rebuild'}>
        <GuideTable
          head={['From SendGrid', 'In Plunk', 'How']}
          rows={[
            ['Domain authentication', 'Domain', 'New DNS records, alongside SendGrid’s'],
            ['Marketing contacts', 'Contacts', 'CSV import'],
            ['Suppressions (all six types)', 'Unsubscribed contacts', 'CSV import with subscribed set to false'],
            ['Dynamic templates', 'Templates', 'Copy the HTML, convert Handlebars to Liquid'],
            ['mail/send calls', 'POST /v1/send', 'Restructure the request'],
            ['Automations', 'Workflows', 'Rebuild by hand; SendGrid has no export'],
            ['Event Webhook', 'Workflows with a webhook step', 'Rebuild by hand'],
          ]}
        />
      </GuideSection>

      <DomainSection
        provider={'SendGrid'}
        theirRecords={
          'SendGrid’s domain authentication uses CNAMEs on em#### and the s1._domainkey and s2._domainkey selectors.'
        }
      />

      <GuideSection id={'contacts'} title={'2. Move contacts and suppressions'}>
        <p>
          In SendGrid, open <strong>Marketing → Contacts</strong>, use the action menu on a list and choose{' '}
          <strong>Export</strong>. SendGrid emails you when it is ready, and the download link lasts 12 hours. The API
          equivalent is <code>POST /v3/marketing/contacts/exports</code>. Rename the address column to{' '}
          <code>email</code> if it is called something else.
        </p>
        <p>
          SendGrid keeps opt-outs and failures out of the contact list, in six suppression lists. Bring all of them,
          each as rows with <code>subscribed</code> set to <code>false</code>:
        </p>
        <GuideTable
          head={['Suppression list', 'Where to export it']}
          rows={[
            ['Global unsubscribes', 'Suppressions → Global Unsubscribes → Download as CSV, or GET /v3/suppression/unsubscribes'],
            ['Group unsubscribes', 'GET /v3/asm/suppressions (see the questions below)'],
            ['Bounces', 'Suppressions → Bounces → Export CSV, or GET /v3/suppression/bounces'],
            ['Spam reports', 'GET /v3/suppression/spam_reports'],
            ['Blocks and invalid emails', 'Listed under Suppressions in the dashboard'],
          ]}
        />
        <ImportRules />
        <InfoBox title={'Unsubscribed is not the same as blocked'}>
          SendGrid drops sends to suppressed addresses. In Plunk, an unsubscribed contact stops receiving marketing
          email, but the send endpoint still delivers transactional email. Check bounced addresses in your own code if
          that matters to you.
        </InfoBox>
      </GuideSection>

      <GuideSection id={'templates'} title={'3. Convert templates'}>
        <p>
          Fetch each dynamic template’s active version with{' '}
          <code>GET /v3/templates/{'{template_id}'}/versions/{'{version_id}'}</code>; the <code>html_content</code>{' '}
          field is what you paste into a Plunk template in HTML mode. Plunk renders with Liquid, which reads like
          Handlebars for plain variables but differs for logic:
        </p>
        <GuideTable
          mono
          head={['Handlebars (SendGrid)', 'Liquid (Plunk)']}
          rows={[
            ['{{first_name}}', '{{first_name}}'],
            ['{{{html_snippet}}}', '{{html_snippet}}'],
            ['{{#if premium}} … {{else}} … {{/if}}', '{% if premium %} … {% else %} … {% endif %}'],
            ['{{#each items}} {{this.name}} {{/each}}', '{% for item in items %} {{item.name}} {% endfor %}'],
            ['{{formatDate date "MMM D, YYYY"}}', '{{date | date: "%b %-d, %Y"}}'],
          ]}
        />
      </GuideSection>

      <GuideSection id={'sending'} title={'4. Change your sending code'}>
        <p>
          SendGrid nests recipients and their data in <code>personalizations</code>. Plunk keeps it flat: one request can
          list several recipients, and each gets its own email with the same <code>data</code>.
        </p>
        <GuideTable
          mono
          head={['SendGrid field', 'Plunk field', 'Notes']}
          rows={[
            ['personalizations[].to', 'to', 'A string, {name, email} or an array'],
            ['personalizations[].dynamic_template_data', 'data', 'Shared by every recipient in the request'],
            ['template_id', 'template', 'The Plunk template’s ID'],
            ['from {email, name}', 'from {email, name}', ''],
            ['reply_to {email}', 'reply', 'An address string'],
            ['subject', 'subject', ''],
            ['content[{type: "text/html"}].value', 'body', 'Plunk builds the plain-text part itself'],
            ['attachments[] {content, filename, type, content_id}', 'attachments[] {content, filename, contentType, contentId}', ''],
            ['headers', 'headers', ''],
            ['cc, bcc, send_at, categories, custom_args, asm, ip_pool_name', '(none)', 'Not supported on the send endpoint'],
            ['tracking_settings', '(project setting)', 'Track all email, marketing only, or nothing'],
          ]}
        />
        <GuideCode
          title={'Before: SendGrid'}
          code={`await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.SENDGRID_API_KEY}\`,
  },
  body: JSON.stringify({
    personalizations: [
      {to: [{email: 'ana@acme.com'}], dynamic_template_data: {first_name: 'Ana'}},
    ],
    from: {email: 'hello@acme.com', name: 'Acme'},
    template_id: 'd-1234567890abcdef',
  }),
});`}
        />
        <GuideCode
          title={'After: Plunk'}
          code={plunkSend(`{
    to: 'ana@acme.com',
    from: {email: 'hello@acme.com', name: 'Acme'},
    template: 'YOUR_PLUNK_TEMPLATE_ID',
    data: {first_name: 'Ana'},
  }`)}
        />
        <SmtpSwap
          provider={'SendGrid'}
          theirs={`host:     smtp.sendgrid.net
username: apikey
password: your SendGrid API key`}
        />
      </GuideSection>

      <GuideSection id={'automations'} title={'5. Rebuild automations'}>
        <p>
          SendGrid has no way to export an automation, so list each one’s trigger, emails and delays from the dashboard
          and rebuild it as a Plunk workflow. A workflow starts from a tracked event, a segment entry, a schedule or a
          manual run, and can send, wait, branch on conditions, call a webhook and update the contact.
        </p>
        <p>
          SendGrid automations start when a contact joins a list. The closest Plunk trigger is a segment entry: build a
          segment on the field that put the contact on the list and start the workflow when they enter it.
        </p>
      </GuideSection>

      <WebhooksSection
        id={'webhooks'}
        title={'6. Rebuild the Event Webhook'}
        provider={'SendGrid'}
        mapping={[
          ['processed', 'email.sent'],
          ['delivered', 'email.delivery'],
          ['open', 'email.open'],
          ['click', 'email.click'],
          ['bounce', 'email.bounce'],
          ['spamreport', 'email.complaint'],
          ['unsubscribe, group_unsubscribe', 'contact.unsubscribed'],
          ['dropped, deferred', '(no equivalent)'],
        ]}
      />

      <CutoverSection provider={'SendGrid'} title={'7. Switch over'} />
    </GuideLayout>
  );
}

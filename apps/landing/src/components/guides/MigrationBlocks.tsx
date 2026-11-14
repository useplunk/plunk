import Link from 'next/link';
import React from 'react';

import {GuideCode, GuideSection, GuideSteps, GuideTable} from './GuideBlocks';
import {InfoBox} from './InfoBox';

/**
 * The parts every migration guide shares. They describe Plunk, so they are
 * written once: if the import rules or the DNS records change, one file
 * changes. Every claim here is checked against the code it describes
 * (apps/api/src/jobs/import-processor.ts, apps/web DomainsSettings,
 * apps/smtp, apps/api Webhooks controller).
 */

export const PLUNK_ENDPOINT = 'https://next-api.useplunk.com/v1/send';

/** The Plunk side of a send, shared by the "after" code samples. */
export function plunkSend(body: string, comment = ''): string {
  return `${comment}const response = await fetch('${PLUNK_ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.PLUNK_SECRET_KEY}\`,
  },
  body: JSON.stringify(${body}),
});

if (!response.ok) {
  throw new Error(\`Plunk returned \${response.status}\`);
}`;
}

/** Adding the domain in Plunk while the old provider keeps sending. */
export function DomainSection({provider, theirRecords}: {provider: string; theirRecords: string}) {
  return (
    <GuideSection id={'domain'} title={'1. Verify your domain in Plunk'}>
      <p>
        Add your sending domain under <strong>Settings → Domains</strong> in Plunk. Plunk shows three CNAME records
        named <code>&lt;token&gt;._domainkey</code>, pointing to <code>&lt;token&gt;.dkim.amazonses.com</code>. Add
        them at your DNS provider and Plunk marks the domain verified once they resolve.
      </p>
      <p>
        You do not need to remove anything first. {theirRecords} Plunk’s DKIM selectors are different, so both sets of
        records can live side by side and {provider} keeps working while you move.
      </p>
      <p>
        Plunk also offers an optional custom MAIL FROM domain: an MX and an SPF TXT record on a <code>plunk.</code>{' '}
        subdomain. It aligns bounces with your domain and is worth adding, but sending works without it.
      </p>
      <InfoBox title={'Check the records before you switch'}>
        Use the <Link href={'/tools/dkim-checker'}>DKIM checker</Link> to confirm the new records are public. DNS
        changes can take a while to spread, so do this step first and the rest while you wait.
      </InfoBox>
    </GuideSection>
  );
}

/** What the importer actually does with a CSV, from import-processor.ts. */
export function ImportRules() {
  return (
    <GuideTable
      head={['Column', 'What Plunk does with it']}
      rows={[
        [<code key={'e'}>email</code>, 'Required. Rows without a valid address are skipped and listed as errors.'],
        [
          <code key={'s'}>subscribed</code>,
          'Optional. true, 1 or yes subscribes the contact; any other value unsubscribes it. Empty keeps an existing contact as it is; new contacts default to subscribed.',
        ],
        [
          'Anything else',
          'Stored as a custom field. Headers are lowercased, so firstName becomes firstname and First Name becomes first name.',
        ],
      ]}
    />
  );
}

/** Webhooks are workflows with a webhook step, not a global endpoint setting. */
export function WebhooksSection({
  id,
  title,
  provider,
  mapping,
}: {
  id: string;
  title: string;
  provider: string;
  mapping: [string, string][];
}) {
  return (
    <GuideSection id={id} title={title}>
      <p>
        Plunk has no global webhook setting. Instead, you create a workflow that starts on an event and add a{' '}
        <strong>Webhook</strong> step that posts to your URL. One workflow per event you care about, each with its own
        URL and headers if you want them.
      </p>
      <GuideTable
        mono
        head={[`${provider} event`, 'Plunk event']}
        rows={mapping.map(([theirs, ours]) => [theirs, ours])}
      />
      <p>
        Plunk’s <code>email.open</code> and <code>email.click</code> fire on the first open and first click of each
        email, not on every one. The payloads differ, so the code that reads them needs updating. Plunk’s payload for each event is listed in the{' '}
        <a href={'https://docs.useplunk.com/guides/webhooks'}>webhooks guide</a>.
      </p>
    </GuideSection>
  );
}

/** Running both, then switching. */
export function CutoverSection({provider, id = 'switch', title}: {provider: string; id?: string; title: string}) {
  return (
    <GuideSection id={id} title={title}>
      <GuideSteps
        steps={[
          {
            title: 'Send to yourself first',
            body: 'Send a few real templates from Plunk to your own inboxes and check rendering, links and variables. Gmail’s “Show original” should report DKIM pass for your domain.',
          },
          {
            title: 'Move one kind of email at a time',
            body: `Switch one flow, such as password resets, and watch delivery in Plunk for a day before moving the rest. ${provider} stays available as a fallback the whole time.`,
          },
          {
            title: 'Remove the old records last',
            body: `Once nothing sends through ${provider} any more, wait a few days for any retries to settle, then remove its DNS records and cancel the plan.`,
          },
        ]}
      />
    </GuideSection>
  );
}

/** The SMTP alternative for apps that already send over SMTP. */
export function SmtpSwap({provider, theirs}: {provider: string; theirs: string}) {
  return (
    <>
      <p>
        If your app sends through {provider}’s SMTP server instead of the API, only the settings change:
      </p>
      <GuideCode
        title={'SMTP settings'}
        code={`# Before (${provider})
${theirs}

# After (Plunk)
host:     smtp.useplunk.com
port:     587 (STARTTLS) or 465 (TLS)
username: plunk
password: your Plunk secret key (sk_...)`}
      />
    </>
  );
}

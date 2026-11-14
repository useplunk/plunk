import Link from 'next/link';
import React from 'react';

import type {FAQ} from '../../components/FAQSection';
import {
  AuthResultsFragment,
  DnsRecordFragment,
  GuideCode,
  GuideCompare,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideSteps,
  GuideTable,
  InfoBox,
} from '../../components/guides';
import {SnippetTile, StatusPill, UICard} from '../../components/snippets';

const faqs: FAQ[] = [
  {
    question: 'What is DKIM?',
    answer:
      'DKIM (DomainKeys Identified Mail) is an email authentication method that adds a cryptographic signature to every message you send. Receiving servers use it to confirm the email really came from your domain and was not changed in transit, which improves deliverability and protects against spoofing.',
  },
  {
    question: 'What is a DKIM key?',
    answer:
      'A DKIM key is a pair of cryptographic keys. The private key stays on your mail server and signs outgoing email. The public key is published as a TXT record in DNS at selector._domainkey.yourdomain.com, where receiving servers fetch it to verify the signature. Never share or expose the private key.',
  },
  {
    question: 'How do I set up DKIM?',
    answer:
      'There are three steps: generate a DKIM key pair for your domain (most email providers do this for you), publish the public key in DNS at selector._domainkey.yourdomain.com, and have your mail server or email provider sign outgoing email with the private key. Plunk handles the keys and signing when you add your domain; you only add the DNS records.',
  },
  {
    question: 'What is the difference between DKIM and SPF?',
    answer:
      'SPF checks that the sending server is allowed to send for your domain, by comparing its IP address with your DNS record. DKIM adds a cryptographic signature that proves the content was not changed in transit. SPF validates the server; DKIM validates the message. Use both, together with DMARC, for the strongest authentication.',
  },
  {
    question: 'What happens if DKIM fails?',
    answer:
      'The receiving server may treat the email as suspicious. Depending on your DMARC policy, it is delivered normally (p=none), sent to spam (p=quarantine) or rejected (p=reject). Repeated failures hurt your sender reputation. Common causes are a wrong DNS record, an expired or rotated key, or a message changed during forwarding.',
  },
];

const KEY = 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu3QEKyU1fSma0axspqYK5iAj+54lsAg4qRRCnpKK68hawSJ';

export default function WhatIsDKIM() {
  return (
    <GuideLayout
      slug={'what-is-dkim'}
      title="What is DKIM? Email Authentication Explained"
      heading={'What is DKIM?'}
      description="Learn how DKIM (DomainKeys Identified Mail) works, what a DKIM key is, and how to set it up to protect your emails from spoofing and improve deliverability."
      lead={
        'DKIM adds a cryptographic signature to every email you send. Inboxes check it against a public key in your DNS to confirm the message came from your domain and was not changed on the way.'
      }
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/what-is-dkim"
      faqs={faqs}
      cta={'Every email signed, from the first send.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <DnsRecordFragment
              type={'TXT'}
              name={'s1._domainkey.acme.com'}
              value={`${KEY}…`}
              status={{tone: 'ok', label: 'Verified'}}
              className={'w-full max-w-lg'}
            />
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'Signed by', value: 'acme.com', tone: 'neutral'},
                {label: 'DKIM', value: 'Pass', tone: 'ok'},
              ]}
              className={'ml-10 w-full max-w-xs'}
            />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'how-dkim-works'} title={'How DKIM works'}>
        <p>
          DKIM uses a key pair. The private key stays on the sending server and signs each message; the public key sits
          in your DNS where anyone can use it to check the signature. Only the holder of the private key can produce a
          signature that verifies.
        </p>
        <GuideSteps
          steps={[
            {
              title: 'The sending server signs the email',
              body: 'It hashes the body and selected headers (from, subject, date) and signs the result with your private key.',
            },
            {
              title: 'The signature goes in the headers',
              body: 'It is added as a DKIM-Signature header, which names your domain and the selector of the key used.',
            },
            {
              title: 'The receiving server verifies',
              body: 'It fetches your public key from DNS, recomputes the hashes and checks them against the signature.',
            },
            {
              title: 'Pass or fail',
              body: 'A match passes DKIM and builds trust in your domain. A missing or failed signature can send the message to spam.',
            },
          ]}
        />
        <GuideFigure caption={'Same signature, two messages. Change one character in transit and DKIM fails.'}>
          <div className={'grid w-full max-w-xl gap-3 sm:grid-cols-2'}>
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'Body', value: 'Unchanged', tone: 'neutral'},
                {label: 'DKIM', value: 'Pass', tone: 'ok'},
              ]}
              className={'w-full'}
            />
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'Body', value: 'Modified', tone: 'neutral'},
                {label: 'DKIM', value: 'Fail', tone: 'err'},
              ]}
              className={'w-full'}
            />
          </div>
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'dkim-record'} title={'Reading a DKIM record'}>
        <p>
          A DKIM record is a TXT record that holds your public key. It lives under a selector, not at the root of your
          domain.
        </p>
        <GuideCode title={'TXT record on s1._domainkey.acme.com'} code={`${KEY}...`} />
        <GuideTable
          mono
          head={['Part', 'What it means']}
          rows={[
            ['s1._domainkey', 'Where the record lives. s1 is the selector; _domainkey is fixed.'],
            ['v=DKIM1', 'The DKIM version.'],
            ['k=rsa', 'The key type. RSA is the most common.'],
            ['p=MIIBIj...', 'The public key, base64 encoded.'],
          ]}
        />
        <p>
          The selector lets one domain have several keys: one per sending service, or a new one while you rotate the old
          one out. Each signature names its selector, so the receiver knows which record to fetch.
        </p>
        <GuideFigure caption={'One domain, several keys. The selector in each signature says which one to use.'}>
          <SelectorsFragment />
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'dkim-signature'} title={'Reading a DKIM signature'}>
        <p>The signature is a header on every message you send. You can see it in the raw source of any email.</p>
        <GuideCode
          title={'DKIM-Signature header'}
          code={`DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
  d=acme.com; s=s1;
  h=from:subject:date:message-id:to;
  bh=frcCV1k9oG9oKj3dpUqdJg1PxRT2RSN/XKdLCPjaYaY=;
  b=GJwP3Qr8KqKKKNT5HL8j3fjXvLEm9KmZs6YdO2KqEqr...`}
        />
        <GuideTable
          mono
          head={['Tag', 'What it means']}
          rows={[
            ['v=1', 'The DKIM version.'],
            ['a=rsa-sha256', 'The signing algorithm.'],
            ['d=acme.com', 'The signing domain. DMARC compares it with the From address.'],
            ['s=s1', 'The selector. Points to s1._domainkey.acme.com.'],
            ['h=from:subject...', 'The headers covered by the signature.'],
            ['bh=frcCV1...', 'A hash of the message body.'],
            ['b=GJwP3Q...', 'The signature itself.'],
          ]}
        />
      </GuideSection>

      <GuideSection id={'why-dkim-matters'} title={'Why DKIM matters'}>
        <GuidePoints
          columns={2}
          items={[
            {
              title: 'Stops spoofing',
              body: 'Nobody can produce a valid signature for your domain without your private key.',
            },
            {title: 'Helps you reach the inbox', body: 'Gmail, Outlook and Yahoo use a valid signature as a trust signal.'},
            {title: 'Protects your brand', body: 'Phishing that uses your domain is easier for inboxes to catch.'},
            {
              title: 'Needed for DMARC',
              body: (
                <>
                  <Link href={'/guides/what-is-dmarc'}>DMARC</Link> builds on DKIM and SPF results.
                </>
              ),
            },
          ]}
        />
        <InfoBox type={'warning'} title={'Required by Gmail and Yahoo'}>
          <p>
            Since February 2024, Gmail and Yahoo require DKIM for bulk senders (5,000+ emails a day). Below that it is
            still expected as standard practice.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'dkim-vs-spf'} title={'DKIM vs SPF'}>
        <p>
          Both are authentication checks, but they look at different things. Use both: each covers a case the other
          misses.
        </p>
        <GuideCompare
          items={[
            {
              title: 'DKIM',
              body: 'Checks the message was not changed.',
              points: [
                'Cryptographic signature in the headers',
                'Survives forwarding if the content is unchanged',
                'TXT record at selector._domainkey',
                'Counts toward DMARC',
              ],
            },
            {
              title: 'SPF',
              body: 'Checks the server is allowed to send.',
              points: [
                'IP address compared with a DNS list',
                'Breaks on forwarding, because the server changes',
                'TXT record at the root domain',
                'Counts toward DMARC',
              ],
            },
          ]}
        />
        <p>
          SPF catches mail from servers you never listed; DKIM keeps forwarded mail authenticated where SPF breaks. Read
          the <Link href={'/guides/what-is-spf'}>SPF guide</Link> for the other half.
        </p>
      </GuideSection>

      <GuideSection id={'setting-up-dkim'} title={'How to set up DKIM'}>
        <GuideSteps
          steps={[
            {
              title: 'Generate a key pair',
              body: 'Most email providers create the keys for you when you add a domain. Use 2048-bit keys where you can.',
            },
            {
              title: 'Publish the public key',
              body: 'Add the record your provider gives you at selector._domainkey.yourdomain.com. Some providers, Plunk included, give you CNAME records that point to keys they host, so they can rotate them for you.',
            },
            {
              title: 'Sign outgoing email',
              body: 'Your provider signs every message with the private key once the record is in place.',
            },
            {
              title: 'Check it',
              body: (
                <>
                  Look up your selector with the <Link href={'/tools/dkim-checker'}>DKIM checker</Link> to confirm the key
                  is published and valid.
                </>
              ),
            },
          ]}
        />
        <InfoBox type={'success'} title={'Plunk signs every email for you'}>
          <p>
            When you add a domain, Plunk generates the keys, shows the exact records to add and verifies them. Every
            email you send through Plunk is then signed with DKIM, with nothing to configure.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'testing-dkim'} title={'How to test DKIM'}>
        <GuideSteps
          steps={[
            {
              title: 'Send yourself a test and open the original',
              body: 'In Gmail, open the message, click the three-dot menu and choose Show original. The summary at the top says whether DKIM passed.',
            },
            {
              title: 'Read the headers',
              body: (
                <>
                  The Authentication-Results header shows the verdict per check. Paste raw headers into the{' '}
                  <Link href={'/tools/email-headers'}>email header analyzer</Link> to read them more easily.
                </>
              ),
              children: (
                <GuideCode
                  code={`Authentication-Results: mx.google.com;
  dkim=pass header.i=@acme.com header.s=s1 header.b=GJwP3Qr8;
  spf=pass (google.com: domain of billing@acme.com designates 54.240.8.1 as permitted sender);
  dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=acme.com`}
                />
              ),
            },
            {
              title: 'Query DNS',
              body: 'Confirm the public key is published under the right selector.',
              children: <GuideCode code={'dig TXT s1._domainkey.acme.com'} />,
            },
          ]}
        />
        <GuideFigure caption={'What a passing message looks like in Gmail’s Show original.'}>
          <OriginalMessageFragment />
        </GuideFigure>
        <p>If DKIM fails, check that:</p>
        <ul>
          <li>The record uses the selector your provider signs with.</li>
          <li>Your DNS provider has not truncated the key. Long keys sometimes need to be split into several strings.</li>
          <li>DNS has propagated, which can take up to 48 hours.</li>
          <li>Your email service signs with the private key that matches the published record.</li>
        </ul>
      </GuideSection>

      <GuideSection id={'best-practices'} title={'Best practices'}>
        <GuidePoints
          tone={'do'}
          items={[
            {title: 'Use 2048-bit keys', body: '1024-bit keys still work, but Gmail and others recommend 2048.'},
            {
              title: 'Set up SPF and DMARC too',
              body: 'The three work together. DKIM alone does not tell inboxes what to do with forged mail.',
            },
            {title: 'Monitor results', body: 'Check that signatures keep passing, especially after DNS or provider changes.'},
            {
              title: 'Rotate keys every 6 to 12 months',
              body: 'Publish the new selector before you switch, and remove the old one after.',
            },
          ]}
        />
        <GuidePoints
          tone={'dont'}
          items={[
            {title: 'Share your private key', body: 'Treat it like a password. Anyone who has it can sign as you.'},
            {title: 'Reuse a key across domains', body: 'Give each domain its own key pair.'},
          ]}
        />
      </GuideSection>
    </GuideLayout>
  );
}

/** A domain's DKIM records: one per sender, plus a key being rotated out. */
function SelectorsFragment() {
  const records = [
    {service: 'Google Workspace', name: 'google._domainkey', state: {tone: 'ok' as const, label: 'Verified'}},
    {service: 'Help desk', name: 'zd1._domainkey', state: {tone: 'ok' as const, label: 'Verified'}},
    {service: 'Product email, new key', name: 's2._domainkey', state: {tone: 'ok' as const, label: 'Verified'}},
    {service: 'Product email, old key', name: 's1._domainkey', state: {tone: 'warn' as const, label: 'Retiring'}},
  ];

  return (
    <UICard className={'w-full max-w-md'}>
      <div className={'flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3'}>
        <p className={'text-ui font-semibold text-neutral-900'}>acme.com</p>
        <p className={'text-label text-neutral-500'}>4 DKIM records</p>
      </div>
      <div className={'divide-y divide-neutral-100'}>
        {records.map(r => (
          <div key={r.name} className={'flex items-center gap-3 px-4 py-3'}>
            <div className={'min-w-0 flex-1'}>
              <p className={'truncate text-ui font-semibold text-neutral-900'}>{r.name}</p>
              <p className={'truncate text-label text-neutral-500'}>{r.service}</p>
            </div>
            <StatusPill tone={r.state.tone}>{r.state.label}</StatusPill>
          </div>
        ))}
      </div>
    </UICard>
  );
}

/** The summary block Gmail shows at the top of "Show original". */
function OriginalMessageFragment() {
  const rows: {label: string; value: string; pass?: boolean}[] = [
    {label: 'From', value: 'Acme <billing@acme.com>'},
    {label: 'Subject', value: 'Your receipt from Acme'},
    {label: 'SPF', value: 'with IP 54.240.8.1', pass: true},
    {label: 'DKIM', value: 'with domain acme.com', pass: true},
    {label: 'DMARC', value: '', pass: true},
  ];

  return (
    <UICard className={'w-full max-w-md p-4'}>
      <p className={'text-ui font-semibold text-neutral-900'}>Original message</p>
      <dl className={'mt-3 flex flex-col gap-2.5 border-t border-neutral-100 pt-3'}>
        {rows.map(r => (
          <div key={r.label} className={'grid grid-cols-[4.5rem_1fr] items-center gap-3'}>
            <dt className={'text-ui text-neutral-500'}>{r.label}</dt>
            <dd className={'flex min-w-0 items-center gap-2'}>
              {r.pass && <StatusPill tone={'ok'}>Pass</StatusPill>}
              {r.value && <span className={'truncate text-ui text-neutral-800'}>{r.value}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </UICard>
  );
}

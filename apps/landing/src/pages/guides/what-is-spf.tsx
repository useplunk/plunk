import Link from 'next/link';
import React from 'react';

import type {FAQ} from '../../components/FAQSection';
import {
  AuthResultsFragment,
  DnsRecordFragment,
  GuideCode,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideSteps,
  GuideTable,
  InfoBox,
} from '../../components/guides';
import {SnippetTile} from '../../components/snippets';

const faqs: FAQ[] = [
  {
    question: 'What is SPF in email?',
    answer:
      'SPF (Sender Policy Framework) is an email authentication standard that lets a domain owner list which mail servers may send email for their domain. The list is published in DNS as a TXT record. When a message arrives, the receiving server checks whether the server that sent it is on that list.',
  },
  {
    question: 'What is the difference between SPF and DKIM?',
    answer:
      'SPF checks that the sending server is allowed to send for your domain, by comparing its IP address with your DNS record. DKIM adds a cryptographic signature to the message, which proves the content was not changed in transit. SPF checks who sent it; DKIM checks what was sent. Use both: DMARC needs at least one of them to pass and align with your domain.',
  },
  {
    question: 'How do I create an SPF record?',
    answer:
      'Add a TXT record at the root of your domain (@) in the form v=spf1 include:your-provider ~all, using the include value your email provider gives you. If you send through more than one service, list them all in the same record, for example v=spf1 include:_spf.google.com include:spf.useplunk.com ~all. A domain can only have one SPF record.',
  },
  {
    question: 'What does ~all mean in an SPF record?',
    answer:
      '~all is a soft fail: mail from servers that are not listed should be accepted but treated as suspicious. -all is a hard fail and asks receivers to reject that mail outright. Start with ~all while you confirm every sender is listed, then move to -all if you want. Never use +all, which lets any server pass.',
  },
  {
    question: 'Why is SPF failing even though I set it up correctly?',
    answer:
      'The usual causes are: two SPF records on the same domain (merge them into one); more than 10 DNS lookups (each include counts); a new sending service that was never added; DNS changes that have not propagated yet, which can take up to 48 hours; or forwarding, which changes the sending server and breaks SPF. Set up DKIM as well so forwarded mail still authenticates.',
  },
];

/** The record most readers will end up with: their mailbox provider plus Plunk. */
const RECORD = 'v=spf1 include:_spf.google.com include:spf.useplunk.com ~all';

export default function WhatIsSPF() {
  return (
    <GuideLayout
      slug={'what-is-spf'}
      title="What is SPF? Email Sender Policy Framework Explained"
      heading={'What is SPF?'}
      description="Learn how SPF records work, prevent email spoofing, and improve deliverability. Complete guide with setup examples and best practices."
      lead={
        'SPF is a DNS record that lists the servers allowed to send email for your domain. Inboxes check it on every message, and mail from anywhere else can be sent to spam or rejected.'
      }
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/what-is-spf"
      faqs={faqs}
      cta={'Get SPF right the first time.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <DnsRecordFragment
              type={'TXT'}
              name={'acme.com'}
              value={RECORD}
              status={{tone: 'ok', label: 'Verified'}}
              className={'w-full max-w-lg'}
            />
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'Sent by', value: 'spf.useplunk.com', tone: 'neutral'},
                {label: 'SPF', value: 'Pass', tone: 'ok'},
              ]}
              className={'ml-10 w-full max-w-xs'}
            />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'how-spf-works'} title={'How SPF works'}>
        <p>
          Anyone can put your domain in the From line of an email. SPF is how a receiving server tells real mail from
          forged mail: it compares the server that delivered the message with the list you published.
        </p>
        <GuideSteps
          steps={[
            {
              title: 'You publish a record',
              body: 'A TXT record on your domain lists every service and IP address allowed to send for it.',
            },
            {title: 'A message arrives', body: 'The receiving server notes the IP address of the server that delivered it.'},
            {title: 'It looks up your record', body: 'It fetches the SPF record for the domain in the message’s return path.'},
            {
              title: 'Pass or fail',
              body: 'If the IP is on the list, SPF passes. If not, it fails, and the message may be filtered or rejected.',
            },
          ]}
        />
        <GuideFigure caption={'Same From address, two servers. Only the listed one passes.'}>
          <div className={'grid w-full max-w-xl gap-3 sm:grid-cols-2'}>
            <AuthResultsFragment
              subject={'Your receipt from Acme'}
              from={'billing@acme.com'}
              results={[
                {label: 'Sent by', value: 'Plunk', tone: 'neutral'},
                {label: 'SPF', value: 'Pass', tone: 'ok'},
              ]}
              className={'w-full'}
            />
            <AuthResultsFragment
              subject={'Urgent: verify your account'}
              from={'billing@acme.com'}
              results={[
                {label: 'Sent by', value: 'Unknown server', tone: 'neutral'},
                {label: 'SPF', value: 'Fail', tone: 'err'},
              ]}
              className={'w-full'}
            />
          </div>
        </GuideFigure>
        <InfoBox title={'SPF checks the server, not the message'}>
          <p>
            SPF says nothing about whether the content was changed on the way. That is what{' '}
            <Link href={'/guides/what-is-dkim'}>DKIM</Link> is for, which is why the two are used together.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'spf-record-syntax'} title={'Reading an SPF record'}>
        <p>
          An SPF record is one line of text. It starts with the version, lists the allowed senders, and ends with what to
          do about everyone else.
        </p>
        <GuideCode title={'TXT record on acme.com'} code={'v=spf1 include:_spf.google.com include:sendgrid.net ip4:192.0.2.1 ~all'} />
        <GuideTable
          mono
          head={['Part', 'What it means']}
          rows={[
            ['v=spf1', 'The SPF version. Every record starts with this.'],
            ['include:sendgrid.net', 'Allow every server listed in another domain’s SPF record. This is how you add a provider.'],
            ['ip4:192.0.2.1', 'Allow one IPv4 address, or a range such as 192.0.2.0/24.'],
            ['ip6:2001:db8::1', 'Allow one IPv6 address or range.'],
            ['a', 'Allow the IP addresses in the domain’s A record.'],
            ['mx', 'Allow the servers in the domain’s MX records.'],
            ['~all', 'Soft fail: accept mail from anyone else, but mark it as suspicious.'],
            ['-all', 'Hard fail: reject mail from anyone else.'],
          ]}
        />
        <InfoBox type={'warning'} title={'The 10-lookup limit'}>
          <p>
            Receivers stop after 10 DNS lookups. Every <code>include</code>, <code>a</code> and <code>mx</code> counts,
            including the ones nested inside a provider’s record. Go over and SPF fails for every message, so remove
            services you no longer use.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'why-spf-matters'} title={'Why SPF matters'}>
        <GuidePoints
          columns={2}
          items={[
            {title: 'Stops spoofing', body: 'Forged mail from servers you did not list fails the check.'},
            {title: 'Helps you reach the inbox', body: 'Gmail, Yahoo and Outlook expect bulk senders to pass SPF.'},
            {title: 'Protects your domain', body: 'Phishing that uses your name is easier for inboxes to catch.'},
            {
              title: 'Needed for DMARC',
              body: (
                <>
                  <Link href={'/guides/what-is-dmarc'}>DMARC</Link> builds on SPF and DKIM results.
                </>
              ),
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'setting-up-spf'} title={'How to set up SPF'}>
        <GuideSteps
          steps={[
            {
              title: 'List everything that sends as you',
              body: 'Your mailbox provider, your product’s email service, your help desk, your newsletter tool.',
            },
            {
              title: 'Collect each service’s include',
              body: 'Every provider documents the value to add.',
              children: (
                <GuideTable
                  mono
                  head={['Value', 'Service']}
                  rows={[
                    ['include:_spf.google.com', 'Google Workspace'],
                    ['include:spf.protection.outlook.com', 'Microsoft 365'],
                    ['include:spf.useplunk.com', 'Plunk'],
                  ]}
                />
              ),
            },
            {
              title: 'Combine them into one record',
              children: <GuideCode code={RECORD} />,
            },
            {
              title: 'Add it to your DNS',
              body: 'Create a TXT record at the root of your domain, usually written as @. Replace any SPF record that is already there rather than adding a second one.',
            },
            {
              title: 'Check it',
              body: (
                <>
                  Run your domain through the <Link href={'/tools/spf-checker'}>SPF checker</Link> to confirm the record is
                  valid and under the lookup limit.
                </>
              ),
            },
          ]}
        />
        <InfoBox type={'success'} title={'Plunk gives you the exact record'}>
          <p>
            When you add a domain, Plunk shows the SPF value to add, checks your DNS for it and tells you when it is
            verified.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'common-mistakes'} title={'Common mistakes'}>
        <GuidePoints
          tone={'dont'}
          items={[
            {
              title: 'Two SPF records',
              body: 'A domain can only have one. With two, both are ignored and SPF fails. Merge them.',
            },
            {
              title: 'Too many lookups',
              body: 'Each include adds at least one lookup. Past 10, every message fails.',
            },
            {
              title: 'Forgetting a new tool',
              body: 'When you start sending from a new service, add it to the record the same day.',
            },
            {
              title: 'Ending with +all',
              body: (
                <>
                  <code>+all</code> lets any server in the world pass. Use <code>~all</code> or <code>-all</code>.
                </>
              ),
            },
          ]}
        />
      </GuideSection>
    </GuideLayout>
  );
}

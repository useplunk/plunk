import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import {CodeBlock} from '../../components/CodeBlock';
import Link from 'next/link';
import type {FAQ} from '../../components/FAQSection';

const faqs: FAQ[] = [
  {
    question: 'What is SPF in email?',
    answer:
      'SPF (Sender Policy Framework) is an email authentication protocol that lets domain owners specify which mail servers are authorized to send email on behalf of their domain. It works by publishing a list of authorized IP addresses in your DNS as a TXT record. When an email arrives, the receiving server checks if the sending server\'s IP address is on your approved list.',
  },
  {
    question: 'What is the difference between SPF and DKIM?',
    answer:
      'SPF verifies that the sending mail server is authorized to send from your domain by checking the server\'s IP address against your DNS record. DKIM adds a cryptographic signature to the email body and headers, verifying the content was not modified in transit. SPF validates who is sending; DKIM validates what was sent. Both work best together, and DMARC requires at least one of them to be properly configured.',
  },
  {
    question: 'How do I create an SPF record?',
    answer:
      'Add a TXT record to your domain\'s DNS at the root domain (@ or yourdomain.com) with the format: v=spf1 include:[your-email-service] ~all. Replace the include: with the SPF value from your email provider. If you use multiple email services, combine them in one record: v=spf1 include:_spf.google.com include:spf.useplunk.com ~all. You can only have one SPF record per domain.',
  },
  {
    question: 'What does ~all mean in an SPF record?',
    answer:
      '~all (tilde-all) at the end of an SPF record is a "soft fail" qualifier, meaning emails from unlisted servers should be accepted but flagged as potentially suspicious. The alternative -all (hard fail) completely rejects emails from unlisted servers. Most experts recommend ~all for initial setup to avoid blocking legitimate emails. Never use +all—it passes all emails and completely defeats SPF\'s purpose.',
  },
  {
    question: 'Why is SPF failing even though I set it up correctly?',
    answer:
      'Common SPF failure causes: (1) You have multiple SPF records—you can only have one, combine all senders into a single record, (2) You exceeded the 10 DNS lookup limit—each include: counts as one lookup, (3) You added a new email service but forgot to add its SPF include, (4) DNS propagation is still in progress—can take up to 48 hours, (5) Your email is being forwarded, which changes the sending IP and breaks SPF (use DKIM too to handle forwarding).',
  },
];

export default function WhatIsSPF() {
  return (
    <GuideLayout
      title="What is SPF? Email Sender Policy Framework Explained"
      description="Learn how SPF records work, prevent email spoofing, and improve deliverability. Complete guide with setup examples and best practices."
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/what-is-spf"
      faqs={faqs}
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          SPF (Sender Policy Framework) is an email authentication protocol that allows domain owners to specify which
          mail servers are authorized to send emails on behalf of their domain.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          Think of SPF as a guest list for your domain—it tells receiving servers, "These are the only servers allowed
          to send email using my domain name."
        </p>
      </section>

      {/* How SPF Works */}
      <section id="how-spf-works" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How SPF Works</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          SPF works by publishing a list of authorized sending servers in your DNS records. Here's the process:
        </p>

        <div className="space-y-6 mb-8">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. You Publish an SPF Record</h3>
            <p className="text-neutral-700">
              You add a TXT record to your domain's DNS that lists all IP addresses and services authorized to send
              email from your domain.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. An Email is Sent</h3>
            <p className="text-neutral-700">
              When someone sends an email claiming to be from your domain, the receiving server notes the IP address of
              the sending server.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. The Receiving Server Checks SPF</h3>
            <p className="text-neutral-700">
              The receiving server looks up your domain's SPF record in DNS and checks if the sending server's IP
              address is listed as authorized.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. Pass or Fail</h3>
            <p className="text-neutral-700">
              If the IP matches, SPF passes. If not, SPF fails and the email may be flagged as spam or rejected,
              depending on your policy.
            </p>
          </div>
        </div>

        <InfoBox type="info" title="SPF Validates the Server, Not the Content">
          <p>
            Unlike DKIM which validates email content, SPF only checks if the sending server is authorized. This is why
            using both SPF and DKIM together provides stronger authentication.
          </p>
        </InfoBox>
      </section>

      {/* SPF Record Syntax */}
      <section id="spf-record-syntax" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">SPF Record Syntax</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          An SPF record is a TXT record with a specific format. Here's a typical example:
        </p>

        <CodeBlock
          language="dns"
          title="Example SPF Record"
          code={`v=spf1 include:_spf.google.com include:sendgrid.net ip4:192.0.2.1 ~all

# Breaking down the components:
# v=spf1                    -> SPF version (always v=spf1)
# include:_spf.google.com   -> Include Google's SPF record
# include:sendgrid.net      -> Include SendGrid's SPF record
# ip4:192.0.2.1            -> Authorize specific IPv4 address
# ~all                     -> Soft fail for all others`}
        />

        <div className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Common SPF Mechanisms</h3>
            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-ui font-semibold text-neutral-900">Mechanism</th>
                    <th className="px-6 py-3 text-left text-ui font-semibold text-neutral-900">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">ip4:192.0.2.1</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Authorize specific IPv4 address</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">ip6:2001:db8::1</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Authorize specific IPv6 address</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">include:domain.com</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Include another domain's SPF record</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">a</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Authorize domain's A record IP</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">mx</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Authorize domain's MX record IPs</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">~all</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Soft fail (treat others as suspicious)</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">-all</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Hard fail (reject all others)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <InfoBox type="warning" title="10 DNS Lookup Limit">
          <p>
            SPF has a hard limit of 10 DNS lookups. Each <code>include:</code> mechanism counts as one lookup. Exceeding
            this limit causes SPF validation to fail. Keep your SPF record concise and avoid excessive includes.
          </p>
        </InfoBox>
      </section>

      {/* Why SPF Matters */}
      <section id="why-spf-matters" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Why SPF Matters</h2>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Prevents Email Spoofing</h3>
            <p className="text-neutral-700">
              SPF makes it much harder for spammers to send emails that appear to come from your domain. Only authorized
              servers can send on your behalf.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Improves Deliverability</h3>
            <p className="text-neutral-700">
              Emails from domains with proper SPF records are more trusted by receiving servers, leading to better inbox
              placement rates.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Protects Your Domain</h3>
            <p className="text-neutral-700">
              By specifying authorized senders, you protect your domain from being used in phishing and spam campaigns.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Required for DMARC</h3>
            <p className="text-neutral-700">
              SPF (along with DKIM) is necessary for implementing DMARC, which provides comprehensive email
              authentication and reporting.
            </p>
          </div>
        </div>
      </section>

      {/* Setting Up SPF */}
      <section id="setting-up-spf" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Set Up SPF</h2>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Identify All Email Senders</h3>
              <p className="text-neutral-700">
                List all services and servers that send email from your domain: your email service provider, marketing
                tools, support systems, etc.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Gather SPF Include Values</h3>
              <p className="text-neutral-700 mb-3">Each email service provides SPF values to include. For example:</p>
              <CodeBlock
                language="text"
                code={`Google Workspace:     include:_spf.google.com\nMicrosoft 365:        include:spf.protection.outlook.com\nPlunk:                include:spf.useplunk.com\nSendGrid:             include:sendgrid.net`}
                showCopy={false}
              />
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Create Your SPF Record</h3>
              <p className="text-neutral-700 mb-3">Combine all authorized senders into one SPF record:</p>
              <CodeBlock language="dns" code={`v=spf1 include:_spf.google.com include:spf.useplunk.com ~all`} />
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Add to DNS</h3>
              <p className="text-neutral-700">
                Add the SPF record as a TXT record in your DNS settings. The record name should be your root domain
                (e.g., "@" or "yourdomain.com").
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Verify SPF</h3>
              <p className="text-neutral-700">
                Use SPF validation tools to confirm your record is correct and doesn't exceed the 10 DNS lookup limit.
              </p>
            </div>
          </div>
        </div>

        <InfoBox type="success" title="Plunk Handles This Automatically">
          <p>
            When you set up a domain in Plunk, we provide the exact SPF record you need. Just copy and paste it into
            your DNS, and we'll verify it's working correctly.
          </p>
        </InfoBox>
      </section>

      {/* Common SPF Mistakes */}
      <section id="common-mistakes" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Common SPF Mistakes to Avoid</h2>

        <div className="space-y-6">
          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Multiple SPF Records</h3>
            <p className="text-neutral-700">
              Never create multiple SPF TXT records. You can only have ONE SPF record per domain. Combine all authorized
              senders into a single record.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Exceeding 10 DNS Lookups</h3>
            <p className="text-neutral-700">
              Each <code>include:</code> mechanism counts toward the 10 lookup limit. Too many includes will cause SPF
              to fail. Consolidate where possible.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Forgetting to Update SPF</h3>
            <p className="text-neutral-700">
              When you add new email services, remember to update your SPF record. Outdated SPF records cause legitimate
              emails to fail authentication.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Using +all</h3>
            <p className="text-neutral-700">
              Never use <code>+all</code> (pass all). This completely defeats the purpose of SPF by allowing anyone to
              send from your domain. Always use <code>~all</code> or <code>-all</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Related Guides */}
      <section id="related-guides" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Related Email Authentication Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/guides/what-is-dkim"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is DKIM?</h3>
            <p className="text-ui text-neutral-600">Learn how DKIM complements SPF for email authentication.</p>
          </Link>
          <Link
            href="/guides/what-is-dmarc"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is DMARC?</h3>
            <p className="text-ui text-neutral-600">Implement DMARC using SPF and DKIM together.</p>
          </Link>
          <Link
            href="/guides/email-deliverability"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Deliverability Guide</h3>
            <p className="text-ui text-neutral-600">Complete guide to improving email deliverability.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

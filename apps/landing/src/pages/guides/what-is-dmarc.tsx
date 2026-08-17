import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import {CodeBlock} from '../../components/CodeBlock';
import Link from 'next/link';
import type {FAQ} from '../../components/FAQSection';

const faqs: FAQ[] = [
  {
    question: 'What is DMARC?',
    answer:
      'DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol that builds on SPF and DKIM to protect your domain from spoofing and phishing. It tells receiving mail servers what to do when an email fails authentication checks—none (monitor), quarantine (spam), or reject (block)—and provides detailed reports about who is sending email using your domain.',
  },
  {
    question: 'What is a DMARC policy?',
    answer:
      'A DMARC policy (the "p=" tag) determines how receiving mail servers handle emails that fail authentication. p=none means monitor only and take no action; p=quarantine sends failed emails to spam; p=reject completely blocks failed emails. Start with p=none to gather data, then progressively tighten to quarantine and reject as you confirm all your legitimate senders are properly authenticated.',
  },
  {
    question: 'What does p=reject mean in DMARC?',
    answer:
      'p=reject is the strictest DMARC policy. Emails that fail DMARC authentication are completely rejected and not delivered to the recipient. This provides maximum protection against phishing and spoofing, but requires that all your legitimate email sources (newsletters, CRMs, transactional tools) are properly configured with SPF and DKIM before enabling it.',
  },
  {
    question: 'How do I add a DMARC record?',
    answer:
      'Add a TXT record in your DNS with the name _dmarc.yourdomain.com. Start with a monitoring-only value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com. This records email activity without affecting delivery. After reviewing reports for 2-4 weeks and confirming your SPF and DKIM setup, gradually strengthen to p=quarantine then p=reject.',
  },
  {
    question: 'Is DMARC required for email deliverability?',
    answer:
      'Since February 2024, Google and Yahoo require DMARC authentication (with at least p=none) for bulk senders sending more than 5,000 emails per day to Gmail or Yahoo addresses. While not strictly required for smaller senders, implementing DMARC is strongly recommended for all domains to improve deliverability, prevent phishing, and meet industry best practices.',
  },
];

export default function WhatIsDMARC() {
  return (
    <GuideLayout
      title="What is DMARC? Policy, Setup & Reporting Explained"
      description="Learn how DMARC works with SPF and DKIM to protect your domain. Understand DMARC policies (none, quarantine, reject), how to set up a DMARC record, and read reports."
      lastUpdated="2025-12-20"
      readTime="9 min"
      canonical="https://www.useplunk.com/guides/what-is-dmarc"
      faqs={faqs}
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol
          that builds on SPF and DKIM to protect your domain from email spoofing and phishing.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          While SPF and DKIM authenticate emails, DMARC tells receiving servers what to do when authentication fails and
          provides reports about your email authentication status.
        </p>
      </section>

      {/* How DMARC Works */}
      <section id="how-dmarc-works" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How DMARC Works</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          DMARC adds a policy layer on top of SPF and DKIM. Here's how it works:
        </p>

        <div className="space-y-6 mb-8">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. Email Authentication</h3>
            <p className="text-neutral-700">
              When an email is received, the server first checks SPF and DKIM authentication. At least one of these must
              pass for DMARC to pass.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. Alignment Check</h3>
            <p className="text-neutral-700">
              DMARC checks if the domain in the "From" header aligns with the domain that passed SPF or DKIM. This is
              called "identifier alignment."
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. Policy Application</h3>
            <p className="text-neutral-700">
              If authentication and alignment pass, the email is delivered. If they fail, the receiving server follows
              your DMARC policy: none (monitor only), quarantine (send to spam), or reject (block completely).
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. Reporting</h3>
            <p className="text-neutral-700">
              Receiving servers send daily reports to your specified email address, showing authentication results for
              all emails claiming to be from your domain.
            </p>
          </div>
        </div>

        <InfoBox type="info" title="DMARC Requires SPF or DKIM">
          <p>
            DMARC doesn't work alone—you must have SPF and/or DKIM configured first. DMARC builds on these protocols to
            provide policy enforcement and reporting.
          </p>
        </InfoBox>
      </section>

      {/* DMARC Record Syntax */}
      <section id="dmarc-record-syntax" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">DMARC Record Syntax</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          A DMARC record is a TXT record published at <code>_dmarc.yourdomain.com</code>. Here's an example:
        </p>

        <CodeBlock
          language="dns"
          title="Example DMARC Record"
          code={`_dmarc.yourdomain.com  IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:forensic@yourdomain.com; pct=100; adkim=r; aspf=r"

# Breaking down the components:
# v=DMARC1                           -> DMARC version
# p=quarantine                       -> Policy (none, quarantine, or reject)
# rua=mailto:dmarc@yourdomain.com   -> Aggregate report email
# ruf=mailto:forensic@yourdomain.com -> Forensic report email
# pct=100                            -> Percentage of mail to apply policy (100%)
# adkim=r                            -> DKIM alignment mode (r=relaxed, s=strict)
# aspf=r                             -> SPF alignment mode (r=relaxed, s=strict)`}
        />

        <div className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">DMARC Policy Tags</h3>
            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-ui font-semibold text-neutral-900">Tag</th>
                    <th className="px-6 py-3 text-left text-ui font-semibold text-neutral-900">Description</th>
                    <th className="px-6 py-3 text-left text-ui font-semibold text-neutral-900">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">v</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">DMARC version (always DMARC1)</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">p</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Policy: none, quarantine, or reject</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">rua</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Aggregate report email address</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Recommended</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">ruf</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Forensic report email address</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Optional</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">pct</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Percentage of mail to filter (0-100)</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Optional</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">sp</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Policy for subdomains</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Optional</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">adkim</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">DKIM alignment: r (relaxed) or s (strict)</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Optional</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono text-ui text-neutral-900">aspf</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">SPF alignment: r (relaxed) or s (strict)</td>
                    <td className="px-6 py-4 text-ui text-neutral-700">Optional</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* DMARC Policies */}
      <section id="dmarc-policies" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Understanding DMARC Policies</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          DMARC offers three policy levels. You should implement them progressively:
        </p>

        <div className="space-y-6">
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">p=none (Monitor Mode)</h3>
                <p className="text-neutral-700 mb-3">
                  No action is taken on failed emails—they're still delivered. Use this initially to monitor your email
                  authentication without affecting delivery.
                </p>
                <CodeBlock language="dns" code={`v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`} showCopy={false} />
                <p className="text-ui text-neutral-600 mt-3">
                  <strong>Best for:</strong> Initial setup, gathering data, testing configuration
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-amber-900 mb-2">p=quarantine (Quarantine Failed Mail)</h3>
                <p className="text-neutral-700 mb-3">
                  Emails that fail authentication are sent to spam/junk folders. This is a good middle ground that
                  protects your domain while minimizing delivery issues.
                </p>
                <CodeBlock
                  language="dns"
                  code={`v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100`}
                  showCopy={false}
                />
                <p className="text-ui text-neutral-600 mt-3">
                  <strong>Best for:</strong> After monitoring, when you're confident in your setup
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-900 mb-2">p=reject (Block Failed Mail)</h3>
                <p className="text-neutral-700 mb-3">
                  Emails that fail authentication are completely rejected and not delivered. This provides maximum
                  protection but requires perfect configuration.
                </p>
                <CodeBlock
                  language="dns"
                  code={`v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; pct=100`}
                  showCopy={false}
                />
                <p className="text-ui text-neutral-600 mt-3">
                  <strong>Best for:</strong> Mature implementations with complete authentication coverage
                </p>
              </div>
            </div>
          </div>
        </div>

        <InfoBox type="warning" title="Progressive Implementation">
          <p>
            Always start with <code>p=none</code> and monitor for at least 2-4 weeks. Review DMARC reports, fix any
            authentication issues, then gradually move to <code>p=quarantine</code> and finally <code>p=reject</code>.
          </p>
        </InfoBox>
      </section>

      {/* Setting Up DMARC */}
      <section id="setting-up-dmarc" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Set Up DMARC</h2>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Ensure SPF and DKIM are Working</h3>
              <p className="text-neutral-700">
                DMARC requires either SPF or DKIM (or both) to be configured. Verify these are working before
                implementing DMARC.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Create a Mailbox for Reports</h3>
              <p className="text-neutral-700">
                Set up an email address to receive DMARC reports (e.g., dmarc@yourdomain.com). These reports can be
                large and frequent, so use a dedicated mailbox.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Create Your DMARC Record</h3>
              <p className="text-neutral-700 mb-3">Start with a monitoring-only policy:</p>
              <CodeBlock language="dns" code={`v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; pct=100`} />
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Add to DNS</h3>
              <p className="text-neutral-700">
                Add the DMARC record as a TXT record at <code>_dmarc.yourdomain.com</code>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Monitor Reports</h3>
              <p className="text-neutral-700">
                Review DMARC reports for 2-4 weeks. Look for failed authentications and identify any legitimate sources
                that need SPF/DKIM configuration.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              6
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Gradually Increase Policy</h3>
              <p className="text-neutral-700">
                Once confident, update to <code>p=quarantine</code>, monitor again, then move to <code>p=reject</code>{' '}
                if desired.
              </p>
            </div>
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
            <p className="text-ui text-neutral-600">Learn how DKIM authenticates email content.</p>
          </Link>
          <Link
            href="/guides/what-is-spf"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is SPF?</h3>
            <p className="text-ui text-neutral-600">Understand SPF records and server authorization.</p>
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

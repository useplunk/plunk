import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import {CodeBlock} from '../../components/CodeBlock';
import Link from 'next/link';
import type {FAQ} from '../../components/FAQSection';

const faqs: FAQ[] = [
  {
    question: 'What is a good email bounce rate?',
    answer:
      'A bounce rate below 2% is considered excellent. Between 2–5% is concerning and needs attention. Above 5% is critical and will seriously damage your sender reputation and deliverability. For hard bounces specifically, keep this below 0.5% per campaign. Most reputable email platforms will suspend accounts or pause sending if hard bounce rates exceed 5–10%.',
  },
  {
    question: 'What is the difference between a hard bounce and a soft bounce?',
    answer:
      'A hard bounce is a permanent delivery failure—the email address does not exist, the domain is invalid, or the receiving server has permanently blocked delivery. Remove hard bounce addresses immediately and never send to them again. A soft bounce is a temporary failure—the mailbox is full, the server is temporarily down, or the email is too large. Email platforms typically retry soft bounces automatically for 24–72 hours.',
  },
  {
    question: 'How do I reduce email bounce rates?',
    answer:
      'Key strategies to reduce bounces: (1) Use double opt-in to confirm email addresses at signup, (2) Validate email addresses in real-time on forms to catch typos and invalid formats, (3) Remove hard bounces immediately and automatically, (4) Clean your list every 6–12 months to remove stale addresses (15–20% of email addresses go invalid per year), (5) Never purchase email lists—they have 20–40% invalid addresses, and (6) Maintain consistent sending to prevent addresses going stale.',
  },
  {
    question: 'Do bounces affect my email deliverability?',
    answer:
      'Yes, high bounce rates directly damage your sender reputation. Email providers like Gmail and Outlook track bounce rates as a signal of list quality and sending practices. High bounce rates cause more of your emails—even to valid addresses—to land in spam. Persistent high bounce rates can lead to your sending IP being blacklisted, making it extremely difficult to deliver any emails.',
  },
  {
    question: 'Why are my emails bouncing suddenly?',
    answer:
      'Sudden increases in bounce rates can be caused by: sending to an old list that has gone stale (addresses expire over time), sending to a purchased list, a domain or server configuration change, your sending IP or domain being blacklisted, or reaching inbox provider sending limits. Identify the pattern—are bounces happening on specific domains or across all recipients?—then investigate the root cause.',
  },
];

export default function EmailBounceRate() {
  return (
    <GuideLayout
      title="Email Bounce Rate: Hard vs Soft Bounces & How to Reduce Them"
      description="Understand email bounce rates, the difference between hard and soft bounces, and proven strategies to reduce bounces and protect your sender reputation."
      lastUpdated="2025-12-20"
      readTime="9 min"
      canonical="https://www.useplunk.com/guides/email-bounce-rate"
      faqs={faqs}
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          Email bounce rate measures the percentage of emails that couldn't be delivered to recipients' inboxes. Bounces
          occur for various reasons—some temporary, others permanent—and high bounce rates seriously damage your sender
          reputation and deliverability.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          Understanding the types of bounces and how to minimize them is essential for maintaining a healthy email
          program.
        </p>
      </section>

      {/* What is Bounce Rate */}
      <section id="what-is-bounce-rate" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What is Email Bounce Rate?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Bounce rate is the percentage of sent emails that were rejected by receiving mail servers and couldn't be
          delivered.
        </p>

        <div className="rounded-xl border-2 border-neutral-900 bg-neutral-50 p-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-neutral-900 mb-4">Bounce Rate Formula</div>
            <CodeBlock
              language="text"
              code={`Bounce Rate = (Bounced Emails ÷ Sent Emails) × 100

Example:
- Sent: 10,000 emails
- Bounced: 150 emails

Bounce Rate = (150 ÷ 10,000) × 100 = 1.5%`}
              showCopy={false}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">&lt;2%</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Excellent</h3>
            <p className="text-ui text-neutral-700">Healthy list with good hygiene practices</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-amber-600 mb-2">2-5%</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Concerning</h3>
            <p className="text-ui text-neutral-700">List quality issues need attention</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-red-600 mb-2">&gt;5%</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Critical</h3>
            <p className="text-ui text-neutral-700">Serious problems damaging sender reputation</p>
          </div>
        </div>
      </section>

      {/* Types of Bounces */}
      <section id="types-of-bounces" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Hard Bounces vs Soft Bounces</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Not all bounces are the same. Understanding the difference between hard and soft bounces is crucial for
          managing your email list.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <h3 className="text-2xl font-semibold text-red-900 mb-4">Hard Bounces (Permanent)</h3>
            <p className="text-neutral-700 mb-4">
              Hard bounces occur when an email can't be delivered for permanent reasons. These addresses will never
              receive your emails.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <h4 className="font-semibold text-neutral-900 mb-2">Common Causes:</h4>
                <ul className="space-y-1 text-ui text-neutral-700">
                  <li>• Email address doesn't exist</li>
                  <li>• Domain name doesn't exist</li>
                  <li>• Email server has completely blocked delivery</li>
                  <li>• Invalid email address format</li>
                </ul>
              </div>
            </div>
            <div className="rounded-lg bg-red-100 border border-red-200 p-4">
              <p className="text-ui font-semibold text-red-900 mb-2">Action Required:</p>
              <p className="text-ui text-neutral-700">
                <strong>Remove immediately.</strong> Never send to hard bounce addresses again. Continuing to send to
                them damages your sender reputation.
              </p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
            <h3 className="text-2xl font-semibold text-amber-900 mb-4">Soft Bounces (Temporary)</h3>
            <p className="text-neutral-700 mb-4">
              Soft bounces are temporary delivery failures. The email address is valid, but delivery failed for a
              temporary reason.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <h4 className="font-semibold text-neutral-900 mb-2">Common Causes:</h4>
                <ul className="space-y-1 text-ui text-neutral-700">
                  <li>• Recipient's mailbox is full</li>
                  <li>• Email server is temporarily down or busy</li>
                  <li>• Email message is too large</li>
                  <li>• Recipient's server is experiencing issues</li>
                </ul>
              </div>
            </div>
            <div className="rounded-lg bg-amber-100 border border-amber-200 p-4">
              <p className="text-ui font-semibold text-amber-900 mb-2">Action Required:</p>
              <p className="text-ui text-neutral-700">
                <strong>Retry automatically.</strong> Most platforms retry for 24-72 hours. After 3-5 consecutive soft
                bounces, treat as a hard bounce and remove.
              </p>
            </div>
          </div>
        </div>

        <InfoBox type="info" title="Bounce vs Block" className="mt-6">
          <p>
            A <strong>block</strong> occurs when the receiving server actively rejects your email due to reputation or
            content issues. Unlike bounces (address problems), blocks indicate deliverability problems that affect all
            your emails to that domain.
          </p>
        </InfoBox>
      </section>

      {/* Common Bounce Reasons */}
      <section id="bounce-reasons" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Common Bounce Reasons & Error Codes</h2>

        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-ui font-semibold">Error Type</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Reason</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Type</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              <tr>
                <td className="px-6 py-4 font-mono text-ui text-neutral-900">550</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Mailbox unavailable</td>
                <td className="px-6 py-4 text-ui text-red-600">Hard</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Remove</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-ui text-neutral-900">551</td>
                <td className="px-6 py-4 text-ui text-neutral-700">User not local/Invalid address</td>
                <td className="px-6 py-4 text-ui text-red-600">Hard</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Remove</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-ui text-neutral-900">552</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Mailbox full</td>
                <td className="px-6 py-4 text-ui text-amber-600">Soft</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Retry</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-ui text-neutral-900">553</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Mailbox name invalid</td>
                <td className="px-6 py-4 text-ui text-red-600">Hard</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Remove</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-ui text-neutral-900">554</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Transaction failed</td>
                <td className="px-6 py-4 text-ui text-neutral-600">Varies</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Investigate</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-ui text-neutral-900">421</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Service not available</td>
                <td className="px-6 py-4 text-ui text-amber-600">Soft</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Retry</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-ui text-neutral-900">450</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Mailbox busy</td>
                <td className="px-6 py-4 text-ui text-amber-600">Soft</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Retry</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* How to Reduce Bounces */}
      <section id="reduce-bounces" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Reduce Email Bounce Rates</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Use Double Opt-In</h3>
              <p className="text-neutral-700">
                Require new subscribers to confirm their email address by clicking a verification link. This ensures the
                address is valid, active, and belongs to the person who submitted it. Double opt-in reduces bounce rates
                by 50-70%.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Validate Email Addresses</h3>
              <p className="text-neutral-700 mb-3">
                Use real-time email validation on signup forms to catch typos and invalid formats. Validate:
              </p>
              <ul className="list-disc list-inside space-y-1 text-ui text-neutral-700">
                <li>Email format (contains @ and valid domain)</li>
                <li>Domain has valid MX records</li>
                <li>Catch common typos (gmial.com → gmail.com)</li>
                <li>Block disposable email addresses (if needed)</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Remove Hard Bounces Immediately</h3>
              <p className="text-neutral-700">
                Automate removal of hard bounce addresses from your list. Never send to them again. Continued sending to
                invalid addresses signals poor list hygiene to email providers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Clean Your List Regularly</h3>
              <p className="text-neutral-700">
                Remove or re-engage inactive subscribers every 6-12 months. Email addresses become invalid over time
                (15- 20% per year). Regular list cleaning prevents bounce accumulation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Never Buy Email Lists</h3>
              <p className="text-neutral-700">
                Purchased lists have 20-40% invalid addresses and zero engagement. They'll destroy your bounce rate and
                sender reputation. Build your list organically—it's slower but dramatically more effective.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              6
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Monitor Soft Bounces</h3>
              <p className="text-neutral-700">
                Track addresses that repeatedly soft bounce. After 3-5 consecutive soft bounces over multiple campaigns,
                treat them as hard bounces and remove them.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              7
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Optimize Email Size</h3>
              <p className="text-neutral-700">
                Keep email size under 100KB to avoid soft bounces from size limits. Compress images, minimize code, and
                avoid large attachments (link to downloads instead).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              8
            </div>
            <div className="w-full max-w-full break-words">
              <h3 className="font-semibold text-neutral-900 mb-2">Maintain Consistent Sending</h3>
              <p className="text-neutral-700">
                Send regularly to maintain list freshness. Long gaps between sends (3+ months) increase bounce rates as
                addresses become invalid or subscribers forget about you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact on Deliverability */}
      <section id="impact" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How Bounce Rate Affects Deliverability</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Bounce rates directly impact your sender reputation and ability to reach the inbox:
        </p>

        <div className="space-y-6">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3">Damaged Sender Reputation</h3>
            <p className="text-neutral-700">
              Email providers track bounce rates. High rates signal poor list quality and careless email practices,
              damaging your reputation score. This causes more emails—even to valid addresses—to land in spam.
            </p>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
            <h3 className="text-xl font-semibold text-amber-900 mb-3">Spam Trap Hits</h3>
            <p className="text-neutral-700">
              Invalid addresses can be recycled as spam traps—addresses used to catch senders with poor list hygiene.
              Sending to spam traps can get you blacklisted, severely impacting deliverability across all recipients.
            </p>
          </div>

          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-3">IP/Domain Blacklisting</h3>
            <p className="text-neutral-700">
              Consistently high bounce rates can lead to your sending IP or domain being blacklisted by email providers
              or third-party blacklist services, making it extremely difficult to deliver emails.
            </p>
          </div>

          <div className="rounded-xl border-2 border-neutral-200 bg-neutral-50 p-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Reduced Engagement</h3>
            <p className="text-neutral-700">
              High bounce rates correlate with low engagement. Email providers notice when large portions of your list
              aren't valid, reducing trust in your remaining emails.
            </p>
          </div>
        </div>

        <InfoBox type="warning" title="Recovery Takes Time" className="mt-6">
          <p>
            Once your sender reputation is damaged by high bounce rates, recovery can take weeks or months of
            consistently good sending behavior. Prevention is far easier than recovery.
          </p>
        </InfoBox>
      </section>

      {/* Monitoring Bounces */}
      <section id="monitoring" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Monitoring & Managing Bounces</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">What to Track</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Overall bounce rate (target: &lt;2%)</li>
              <li>• Hard bounce rate specifically</li>
              <li>• Soft bounce rate and retry success</li>
              <li>• Bounce rate by campaign</li>
              <li>• Bounce rate trends over time</li>
              <li>• Specific bounce reasons/error codes</li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Automated Actions</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Auto-remove hard bounces immediately</li>
              <li>• Retry soft bounces 3-5 times over 72 hours</li>
              <li>• Remove persistent soft bouncers</li>
              <li>• Alert when bounce rate exceeds threshold</li>
              <li>• Weekly bounce rate reports</li>
              <li>• Validate emails at signup</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related Guides */}
      <section id="related-guides" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Related Email Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/guides/email-deliverability"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Deliverability</h3>
            <p className="text-ui text-neutral-600">Complete guide to reaching the inbox.</p>
          </Link>
          <Link
            href="/guides/email-sender-reputation"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Sender Reputation</h3>
            <p className="text-ui text-neutral-600">Build and maintain sender reputation.</p>
          </Link>
          <Link
            href="/guides/email-marketing-best-practices"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Marketing Best Practices</h3>
            <p className="text-ui text-neutral-600">Complete email marketing guide.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

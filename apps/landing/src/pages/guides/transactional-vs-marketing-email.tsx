import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import Link from 'next/link';

export default function TransactionalVsMarketingEmail() {
  return (
    <GuideLayout
      title="Transactional vs Marketing Email: Legal & Technical Differences"
      description="Understand the critical differences between transactional and marketing emails, including legal requirements, deliverability, and best practices."
      lastUpdated="2025-12-20"
      readTime="10 min"
      canonical="https://www.useplunk.com/guides/transactional-vs-marketing-email"
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          Not all emails are created equal. Transactional and marketing emails serve different purposes, follow
          different legal rules, and require different strategies. Understanding these differences is essential for
          compliance, deliverability, and effective email communication.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          This guide explains the key distinctions, legal requirements, and best practices for each email type.
        </p>
      </section>

      {/* Quick Comparison */}
      <section id="comparison" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Quick Comparison</h2>

        <div className="rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-ui font-semibold">Aspect</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Transactional Email</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Marketing Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              <tr>
                <td className="px-6 py-4 text-ui font-semibold text-neutral-900">Purpose</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Facilitate transaction or provide service info</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Promote products, services, or content</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-semibold text-neutral-900">Trigger</td>
                <td className="px-6 py-4 text-ui text-neutral-700">User action or system event</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Scheduled or campaign-based</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-semibold text-neutral-900">Consent Required</td>
                <td className="px-6 py-4 text-ui text-neutral-700">No (expected as part of service)</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Yes (explicit opt-in required)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-semibold text-neutral-900">Unsubscribe Link</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Not required</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Required by law</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-semibold text-neutral-900">Open Rate</td>
                <td className="px-6 py-4 text-ui text-neutral-700">60-80% (very high)</td>
                <td className="px-6 py-4 text-ui text-neutral-700">15-25% (average)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-semibold text-neutral-900">Volume</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Lower, event-based</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Higher, scheduled campaigns</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Transactional Email */}
      <section id="transactional" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What is Transactional Email?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Transactional emails are automated messages sent in response to a user's action or system event. They contain
          information the user needs or expects to facilitate a transaction or use a service.
        </p>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-neutral-900 mb-4">Common Types of Transactional Emails</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Account & Authentication</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Welcome emails after signup</li>
                  <li>• Email verification/confirmation</li>
                  <li>• Password reset requests</li>
                  <li>• Login notifications</li>
                  <li>• Two-factor authentication codes</li>
                  <li>• Account deletion confirmations</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Commerce & Transactions</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Order confirmations</li>
                  <li>• Shipping notifications</li>
                  <li>• Delivery updates</li>
                  <li>• Payment receipts</li>
                  <li>• Refund confirmations</li>
                  <li>• Invoice emails</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Notifications & Alerts</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Activity notifications</li>
                  <li>• Comment or mention alerts</li>
                  <li>• Security alerts</li>
                  <li>• System status updates</li>
                  <li>• Subscription renewals</li>
                  <li>• Trial expiration notices</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Account Management</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Billing statements</li>
                  <li>• Usage reports</li>
                  <li>• Account updates</li>
                  <li>• Plan changes</li>
                  <li>• Subscription confirmations</li>
                  <li>• Account deactivation notices</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-neutral-900 mb-4">Transactional Email Best Practices</h3>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Send Immediately</h4>
              <p className="text-neutral-700">
                Transactional emails should be sent within seconds or minutes of the triggering action. Users expect
                instant confirmation—delays cause anxiety and support tickets.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Prioritize Clarity & Accuracy</h4>
              <p className="text-neutral-700">
                Include all critical information: order numbers, amounts, dates, tracking links. Be precise—errors in
                transactional emails damage trust significantly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Use Descriptive Subject Lines</h4>
              <p className="text-neutral-700">
                Make subject lines scannable and specific: "Your order #12345 has shipped" not "Update from
                YourCompany". Users should know what the email contains at a glance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Minimize Promotional Content</h4>
              <p className="text-neutral-700">
                The primary content must be transactional. Small promotional sections (cross-sells, upsells) are
                acceptable at the bottom, but don't turn order confirmations into marketing emails.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Ensure High Deliverability</h4>
              <p className="text-neutral-700">
                Use a dedicated sending infrastructure for transactional emails. They're mission-critical—users depend
                on them. Don't let marketing email issues affect transactional deliverability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Marketing Email */}
      <section id="marketing" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What is Marketing Email?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Marketing emails are promotional messages sent to build relationships, drive engagement, and encourage
          conversions. Recipients must explicitly opt-in to receive them.
        </p>

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-neutral-900 mb-4">Common Types of Marketing Emails</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Promotional Campaigns</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Product announcements</li>
                  <li>• Sale and discount promotions</li>
                  <li>• New feature launches</li>
                  <li>• Seasonal campaigns</li>
                  <li>• Limited-time offers</li>
                  <li>• Flash sales</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Content Marketing</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Newsletters</li>
                  <li>• Blog post roundups</li>
                  <li>• Educational content</li>
                  <li>• Industry news and trends</li>
                  <li>• Case studies</li>
                  <li>• Webinar invitations</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Nurture & Engagement</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Welcome series (beyond initial welcome)</li>
                  <li>• Onboarding sequences</li>
                  <li>• Re-engagement campaigns</li>
                  <li>• Win-back emails</li>
                  <li>• Customer surveys</li>
                  <li>• Loyalty program updates</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="w-full max-w-full break-words">
                <h4 className="font-semibold text-neutral-900 mb-3">Lifecycle Marketing</h4>
                <ul className="space-y-2 text-ui text-neutral-700">
                  <li>• Abandoned cart reminders</li>
                  <li>• Product recommendations</li>
                  <li>• Upsell/cross-sell campaigns</li>
                  <li>• Birthday or anniversary emails</li>
                  <li>• Renewal reminders (if promotional)</li>
                  <li>• Review requests</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-neutral-900 mb-4">Marketing Email Best Practices</h3>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Always Get Explicit Consent</h4>
              <p className="text-neutral-700">
                Use clear opt-in forms (preferably double opt-in). Never add people without permission or use purchased
                lists. GDPR and CAN-SPAM require explicit consent for marketing emails.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Provide Value, Not Just Promotions</h4>
              <p className="text-neutral-700">
                Balance promotional content with educational value, entertainment, or useful information. Subscribers
                who only receive sales pitches will unsubscribe.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Segment Your Audience</h4>
              <p className="text-neutral-700">
                Send targeted emails based on behavior, preferences, demographics, or engagement. Segmented campaigns
                see 3x higher engagement than mass blasts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Make Unsubscribing Easy</h4>
              <p className="text-neutral-700">
                Include a clear, one-click unsubscribe link in every email (required by law). Making it hard to
                unsubscribe leads to spam complaints, which are much worse for deliverability.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 mb-2">Test and Optimize</h4>
              <p className="text-neutral-700">
                A/B test subject lines, send times, content, and CTAs. Marketing emails benefit from continuous
                optimization based on performance data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Requirements */}
      <section id="legal" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Legal Requirements</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          The legal distinction between transactional and marketing emails is critical. Violating these rules can result
          in significant fines and damage to your reputation.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-4">Transactional Email Laws</h3>
            <div className="space-y-3 text-neutral-700">
              <div>
                <h4 className="font-semibold text-neutral-900 mb-1">CAN-SPAM (US)</h4>
                <p className="text-ui">Exempt from most requirements but must not include false/misleading headers</p>
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 mb-1">GDPR (EU)</h4>
                <p className="text-ui">
                  Allowed as "legitimate interest" for service provision. Must still protect user data and allow opt-out
                  of optional transactional emails
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 mb-1">Key Point</h4>
                <p className="text-ui">
                  Transactional emails don't require explicit consent or unsubscribe links, but abuse this category (by
                  making promotional emails appear transactional) violates laws
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-neutral-200 bg-neutral-50 p-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Marketing Email Laws</h3>
            <div className="space-y-3 text-neutral-700">
              <div>
                <h4 className="font-semibold text-neutral-900 mb-1">CAN-SPAM (US)</h4>
                <ul className="text-ui space-y-1">
                  <li>• Clear opt-out mechanism (unsubscribe link)</li>
                  <li>• Honor opt-outs within 10 business days</li>
                  <li>• Include physical mailing address</li>
                  <li>• Identify message as advertisement</li>
                  <li>• No false/misleading subject lines or headers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 mb-1">GDPR (EU)</h4>
                <ul className="text-ui space-y-1">
                  <li>• Explicit opt-in consent required</li>
                  <li>• Clear information about data usage</li>
                  <li>• Easy opt-out anytime</li>
                  <li>• Right to data access/deletion</li>
                  <li>• Records of consent</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <InfoBox type="warning" title="Don't Abuse the Transactional Category" className="mt-6">
          <p>
            It's illegal and unethical to disguise marketing emails as transactional to avoid consent requirements.
            Regulators and ISPs actively monitor for this abuse. Keep transactional emails purely functional.
          </p>
        </InfoBox>
      </section>

      {/* Infrastructure Considerations */}
      <section id="infrastructure" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Infrastructure & Sending Practices</h2>

        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Separate Sending Domains</h3>
            <p className="text-neutral-700 mb-3">Use different subdomains for transactional and marketing emails:</p>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>
                • <strong>Transactional:</strong> transact.yourdomain.com or mail.yourdomain.com
              </li>
              <li>
                • <strong>Marketing:</strong> marketing.yourdomain.com or news.yourdomain.com
              </li>
              <li>
                • <strong>Benefit:</strong> Protects critical transactional email reputation from marketing
                deliverability issues
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Dedicated IP Addresses (High Volume)</h3>
            <p className="text-neutral-700 mb-3">For organizations sending 100,000+ emails/month:</p>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Use separate dedicated IPs for transactional and marketing</li>
              <li>• Properly warm up new IPs to build sender reputation</li>
              <li>• Monitor reputation for each IP independently</li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Monitoring & Analytics</h3>
            <p className="text-neutral-700 mb-3">Track metrics separately for each type:</p>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>
                • <strong>Transactional:</strong> Delivery rate (target: 99%+), delivery speed, bounce rate
              </li>
              <li>
                • <strong>Marketing:</strong> Open rate, CTR, conversions, engagement, unsubscribe rate
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* The Gray Area */}
      <section id="gray-area" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">The Gray Area: What's What?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Some emails can be tricky to categorize. Here's guidance:
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
            <h3 className="text-xl font-semibold text-green-900 mb-3">Clearly Transactional</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>✓ Order confirmations and shipping updates</li>
              <li>✓ Password resets and account verification</li>
              <li>✓ Billing receipts and invoices</li>
              <li>✓ System alerts and security notifications</li>
            </ul>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
            <h3 className="text-xl font-semibold text-amber-900 mb-3">Gray Area (Be Careful)</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>
                • <strong>Cart abandonment:</strong> If purely reminder = transactional. If includes promotions =
                marketing
              </li>
              <li>
                • <strong>Review requests:</strong> If tied to recent purchase = transactional. If general request =
                marketing
              </li>
              <li>
                • <strong>Welcome emails:</strong> Initial verification = transactional. Follow-up series = marketing
              </li>
              <li>
                • <strong>Renewal reminders:</strong> If informational only = transactional. If promotional = marketing
              </li>
            </ul>
          </div>

          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3">Clearly Marketing</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>✗ Newsletters and content roundups</li>
              <li>✗ Product announcements and promotions</li>
              <li>✗ Sales and discount offers</li>
              <li>✗ Educational content and webinars</li>
              <li>✗ Re-engagement campaigns</li>
            </ul>
          </div>
        </div>

        <InfoBox type="tip" title="When in Doubt" className="mt-6">
          <p>
            If you're unsure whether an email is transactional or marketing, err on the side of treating it as
            marketing. Include an unsubscribe link, get proper consent, and follow all marketing email regulations.
          </p>
        </InfoBox>
      </section>

      {/* Related Guides */}
      <section id="related-guides" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Related Email Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/guides/email-api-guide"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email API Guide</h3>
            <p className="text-ui text-neutral-600">Implement transactional emails with APIs.</p>
          </Link>
          <Link
            href="/guides/email-marketing-best-practices"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Marketing Best Practices</h3>
            <p className="text-ui text-neutral-600">Complete marketing email guide.</p>
          </Link>
          <Link
            href="/guides/email-deliverability"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Deliverability</h3>
            <p className="text-ui text-neutral-600">Ensure both email types reach the inbox.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

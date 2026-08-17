import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import Link from 'next/link';

export default function EmailDeliverability() {
  return (
    <GuideLayout
      title="Email Deliverability Guide: Reach the Inbox Every Time"
      description="Learn proven strategies to improve email deliverability, avoid spam filters, and maximize inbox placement rates. Complete guide with best practices."
      lastUpdated="2025-12-20"
      readTime="12 min"
      canonical="https://www.useplunk.com/guides/email-deliverability"
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          Email deliverability is the measure of how successfully your emails reach recipients' inboxes rather than spam
          folders or being blocked entirely. Even perfectly crafted emails are worthless if they never reach your
          audience.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          This comprehensive guide covers everything you need to know about email deliverability—from technical
          authentication to content best practices—so you can maximize inbox placement rates.
        </p>
      </section>

      {/* What is Email Deliverability */}
      <section id="what-is-deliverability" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What is Email Deliverability?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Email deliverability refers to your ability to deliver emails to subscribers' inboxes. It's measured as a
          percentage of sent emails that successfully reach the inbox.
        </p>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">95%+</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Excellent</h3>
            <p className="text-ui text-neutral-700">
              Strong sender reputation, proper authentication, engaged audience
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-amber-600 mb-2">85-94%</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Good</h3>
            <p className="text-ui text-neutral-700">Room for improvement in authentication or engagement</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-red-600 mb-2">&lt;85%</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Poor</h3>
            <p className="text-ui text-neutral-700">Serious issues requiring immediate attention</p>
          </div>
        </div>

        <InfoBox type="info" title="Deliverability vs Delivery Rate">
          <p>
            <strong>Delivery rate</strong> measures emails that weren't bounced (reached the server).{' '}
            <strong>Deliverability</strong> measures emails that reached the inbox specifically, not spam. You want both
            to be high.
          </p>
        </InfoBox>
      </section>

      {/* Key Factors */}
      <section id="key-factors" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Key Factors Affecting Deliverability</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Email deliverability depends on multiple interconnected factors:
        </p>

        <div className="space-y-6">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. Sender Reputation</h3>
            <p className="text-neutral-700">
              Email providers track your sending behavior over time. High engagement rates, low spam complaints, and few
              bounces build a positive reputation. Poor practices damage it.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. Email Authentication</h3>
            <p className="text-neutral-700">
              SPF, DKIM, and DMARC authenticate your emails and prove they're legitimate. Without proper authentication,
              emails are more likely to be flagged as spam.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. Email Content</h3>
            <p className="text-neutral-700">
              Spam filters analyze your subject lines, body content, links, and images. Spammy language, excessive
              links, or misleading content trigger filters.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. List Quality & Engagement</h3>
            <p className="text-neutral-700">
              Sending to engaged subscribers who want your emails is crucial. High open rates and clicks signal quality.
              Low engagement or spam complaints hurt deliverability.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">5. Technical Infrastructure</h3>
            <p className="text-neutral-700">
              Your sending IP address, domain reputation, and email infrastructure affect how providers perceive your
              emails. Dedicated IPs and proper warm-up are important at scale.
            </p>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section id="best-practices" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Email Deliverability Best Practices</h2>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Authentication & Technical Setup</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Configure SPF, DKIM, and DMARC</h4>
                  <p className="text-neutral-700">
                    Implement all three authentication protocols. This proves your emails are legitimate and protects
                    your domain from spoofing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Use a Dedicated Sending Domain</h4>
                  <p className="text-neutral-700">
                    Send marketing emails from a subdomain (e.g., mail.yourdomain.com) to protect your main domain's
                    reputation if issues arise.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Warm Up New IPs and Domains</h4>
                  <p className="text-neutral-700">
                    If using a new IP or domain, gradually increase sending volume over 2-4 weeks. Sudden high volume
                    from new sources looks suspicious.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">List Management</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Use Double Opt-In</h4>
                  <p className="text-neutral-700">
                    Require subscribers to confirm their email address. This ensures list quality and prevents spam trap
                    addresses from being added.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  5
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Clean Your List Regularly</h4>
                  <p className="text-neutral-700">
                    Remove hard bounces immediately and consider removing subscribers who haven't engaged in 6-12
                    months. Inactive subscribers hurt your reputation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  6
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Make Unsubscribing Easy</h4>
                  <p className="text-neutral-700">
                    Include a clear unsubscribe link in every email. Making it hard to unsubscribe leads to spam
                    complaints, which are much worse for deliverability.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Content Best Practices</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  7
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Avoid Spam Trigger Words</h4>
                  <p className="text-neutral-700 mb-3">
                    Words like "FREE", "ACT NOW", "LIMITED TIME", excessive exclamation marks, and all caps trigger spam
                    filters. Write naturally and professionally.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  8
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Balance Text and Images</h4>
                  <p className="text-neutral-700">
                    Don't send image-only emails. Maintain a healthy text-to-image ratio (at least 60% text). Include
                    alt text for images.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
                  9
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Use Relevant Subject Lines</h4>
                  <p className="text-neutral-700">
                    Subject lines should accurately reflect email content. Misleading subjects increase spam complaints
                    and damage trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Common Issues */}
      <section id="common-issues" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Common Deliverability Issues & Solutions</h2>

        <div className="space-y-6">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3">Problem: Emails Going to Spam</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Causes:</strong> Poor sender reputation, missing authentication, spammy content, low engagement
            </p>
            <p className="text-neutral-700">
              <strong>Solutions:</strong> Verify SPF/DKIM/DMARC setup, improve email content, segment your list to send
              to engaged subscribers, warm up sending reputation
            </p>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
            <h3 className="text-xl font-semibold text-amber-900 mb-3">Problem: High Bounce Rate</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Causes:</strong> Invalid email addresses, purchased lists, poor list hygiene
            </p>
            <p className="text-neutral-700">
              <strong>Solutions:</strong> Use double opt-in, validate email addresses, remove hard bounces immediately,
              regularly clean your list
            </p>
          </div>

          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-3">Problem: Low Engagement Rates</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Causes:</strong> Irrelevant content, wrong send frequency, stale email list
            </p>
            <p className="text-neutral-700">
              <strong>Solutions:</strong> Segment your audience, personalize content, test send times, re-engagement
              campaigns for inactive subscribers
            </p>
          </div>

          <div className="rounded-xl border-2 border-neutral-200 bg-neutral-50 p-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">Problem: Blacklisted IP or Domain</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Causes:</strong> Spam complaints, sending to spam traps, compromised account
            </p>
            <p className="text-neutral-700">
              <strong>Solutions:</strong> Check blacklists (MXToolbox, Spamhaus), request delisting, fix underlying
              issues, consider a new sending domain if severely damaged
            </p>
          </div>
        </div>
      </section>

      {/* Monitoring */}
      <section id="monitoring" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Monitoring Email Deliverability</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">Track these metrics to stay on top of deliverability:</p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Delivery Rate</h3>
            <p className="text-neutral-700">
              Percentage of emails that didn't bounce. Target: 98%+. Track hard vs soft bounces separately.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Inbox Placement Rate</h3>
            <p className="text-neutral-700">
              Percentage of delivered emails that reached the inbox (not spam). Target: 95%+. Use seed list testing.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Spam Complaint Rate</h3>
            <p className="text-neutral-700">
              Percentage of recipients who mark as spam. Target: &lt;0.1%. Even 0.3% is concerning.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Engagement Metrics</h3>
            <p className="text-neutral-700">
              Open rates, click rates, and unsubscribe rates. Sustained low engagement signals poor deliverability.
            </p>
          </div>
        </div>

        <InfoBox type="tip" title="Use DMARC Reports">
          <p>
            DMARC aggregate reports show authentication success rates and potential spoofing attempts. Review these
            weekly to catch deliverability issues early.
          </p>
        </InfoBox>
      </section>

      {/* Related Guides */}
      <section id="related-guides" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Related Email Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/guides/what-is-dkim"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is DKIM?</h3>
            <p className="text-ui text-neutral-600">Learn about DKIM email authentication.</p>
          </Link>
          <Link
            href="/guides/what-is-spf"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is SPF?</h3>
            <p className="text-ui text-neutral-600">Understand SPF records and sender authorization.</p>
          </Link>
          <Link
            href="/guides/email-sender-reputation"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Sender Reputation</h3>
            <p className="text-ui text-neutral-600">Build and maintain sender reputation.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

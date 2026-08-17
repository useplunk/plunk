import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import Link from 'next/link';

export default function EmailMarketingBestPractices() {
  return (
    <GuideLayout
      title="Email Marketing Best Practices: The Complete Guide"
      description="Master email marketing with proven best practices for content, design, timing, deliverability, and compliance. Comprehensive guide for 2025."
      lastUpdated="2025-12-20"
      readTime="15 min"
      canonical="https://www.useplunk.com/guides/email-marketing-best-practices"
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          Email marketing remains one of the most effective digital marketing channels, delivering an average ROI of
          $36-42 for every $1 spent. But success requires following best practices that have evolved with technology,
          regulations, and user expectations.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          This comprehensive guide covers everything you need to know: from building your list to crafting compelling
          content, optimizing deliverability, and staying compliant with regulations.
        </p>
      </section>

      {/* List Building */}
      <section id="list-building" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Building Your Email List</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          A high-quality email list is the foundation of successful email marketing. Focus on engaged subscribers who
          genuinely want to hear from you.
        </p>

        <div className="space-y-6">
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
            <h3 className="text-xl font-semibold text-green-900 mb-3">✓ Best Practices</h3>
            <ul className="space-y-3 text-neutral-700">
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span>
                  <strong>Use double opt-in:</strong> Require subscribers to confirm their email address. This ensures
                  list quality and reduces spam complaints.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span>
                  <strong>Offer clear value:</strong> Explain what subscribers will receive and how often. "Get weekly
                  tips on [topic]" is better than "Subscribe to our newsletter."
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span>
                  <strong>Use multiple touchpoints:</strong> Add signup forms on your website, blog, checkout page,
                  social media, and in-person events.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span>
                  <strong>Provide incentives:</strong> Lead magnets like ebooks, discounts, templates, or exclusive
                  content encourage signups.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span>
                  <strong>Make forms easy:</strong> Keep signup forms simple—ask only for essential information (usually
                  just email, sometimes name).
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <h3 className="text-xl font-semibold text-red-900 mb-3">✗ Avoid These Mistakes</h3>
            <ul className="space-y-3 text-neutral-700">
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">•</span>
                <span>
                  <strong>Never buy email lists:</strong> Purchased lists lead to spam complaints, poor engagement, and
                  damaged reputation.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">•</span>
                <span>
                  <strong>Don't use pre-checked boxes:</strong> Subscribers must actively opt-in. Pre-checked boxes
                  violate GDPR and reduce engagement.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">•</span>
                <span>
                  <strong>Avoid hidden signup terms:</strong> Be transparent about email frequency and content type.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Content Best Practices */}
      <section id="content" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Email Content Best Practices</h2>

        <div className="space-y-6 mb-8">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. Craft Compelling Subject Lines</h3>
            <p className="text-neutral-700 mb-3">
              Your subject line determines whether emails get opened. Keep them under 50 characters, create curiosity,
              and be specific about value.
            </p>
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-ui font-semibold text-neutral-900 mb-2">Examples:</p>
              <ul className="space-y-1 text-ui text-neutral-700">
                <li>✓ "5 proven strategies to reduce churn by 30%"</li>
                <li>✓ "Your personalized year-end report is ready"</li>
                <li>✓ "Last chance: Sale ends tonight at midnight"</li>
                <li>✗ "Newsletter #47"</li>
                <li>✗ "Check this out!!!"</li>
              </ul>
            </div>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. Personalize Beyond First Names</h3>
            <p className="text-neutral-700">
              Use behavioral data, purchase history, browsing activity, or preferences. Personalized emails deliver 6x
              higher transaction rates than generic blasts.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. Focus on One Primary Goal</h3>
            <p className="text-neutral-700">
              Each email should have one clear call-to-action (CTA). Multiple CTAs confuse readers and reduce conversion
              rates. Guide recipients toward a single action.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. Write Scannable Content</h3>
            <p className="text-neutral-700 mb-3">Most people skim emails. Structure content for easy scanning:</p>
            <ul className="list-disc list-inside space-y-1 text-neutral-700">
              <li>Use short paragraphs (2-3 sentences max)</li>
              <li>Include bullet points and numbered lists</li>
              <li>Add descriptive subheadings</li>
              <li>Use white space generously</li>
              <li>Highlight key points with bold text</li>
            </ul>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">5. Create Compelling CTAs</h3>
            <p className="text-neutral-700 mb-3">Effective CTAs are:</p>
            <ul className="list-disc list-inside space-y-1 text-neutral-700">
              <li>
                <strong>Action-oriented:</strong> "Download the guide" not "Click here"
              </li>
              <li>
                <strong>Specific:</strong> "Start your 14-day free trial" not "Get started"
              </li>
              <li>
                <strong>Visually prominent:</strong> Button format with contrasting colors
              </li>
              <li>
                <strong>Urgent when appropriate:</strong> "Claim your discount today"
              </li>
            </ul>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">6. Provide Real Value</h3>
            <p className="text-neutral-700">
              Every email should benefit the reader. Share insights, solve problems, offer exclusive content, or provide
              entertainment. Don't just promote—educate and engage.
            </p>
          </div>
        </div>
      </section>

      {/* Design Best Practices */}
      <section id="design" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Email Design Best Practices</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Mobile-First Design</h3>
              <p className="text-neutral-700">
                60%+ of emails are opened on mobile. Use responsive templates, large tap targets (44x44px minimum), and
                test on multiple devices and email clients.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Optimize Images</h3>
              <p className="text-neutral-700">
                Compress images for fast loading, use alt text (many clients block images), and maintain 60/40
                text-to-image ratio. Never send image-only emails.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Brand Consistency</h3>
              <p className="text-neutral-700">
                Use your brand colors, fonts, logo, and voice consistently. Recipients should instantly recognize your
                emails. Create a template system for efficiency.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Accessible Design</h3>
              <p className="text-neutral-700">
                Use sufficient color contrast (4.5:1 minimum), readable font sizes (14px+ for body text), descriptive
                link text, and semantic HTML for screen readers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Test Across Email Clients</h3>
              <p className="text-neutral-700">
                Email rendering varies dramatically across Gmail, Outlook, Apple Mail, etc. Test your designs across
                major clients before sending to your full list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timing & Frequency */}
      <section id="timing" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Timing & Frequency Best Practices</h2>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Best Send Times (General)</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>
                <strong>B2B:</strong> Tuesday-Thursday, 10am-11am or 2pm-3pm
              </li>
              <li>
                <strong>B2C:</strong> Varies widely—test evenings and weekends
              </li>
              <li>
                <strong>Avoid:</strong> Monday mornings (inbox overload) and Friday afternoons
              </li>
            </ul>
            <InfoBox type="info" title="Test Your Audience" className="mt-4">
              <p className="text-ui">
                These are starting points. Your specific audience may behave differently. A/B test send times and let
                data guide your strategy.
              </p>
            </InfoBox>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Email Frequency Guidelines</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>
                <strong>Weekly:</strong> Most common for newsletters and content
              </li>
              <li>
                <strong>2-3x/week:</strong> Works for engaged audiences with fresh content
              </li>
              <li>
                <strong>Daily:</strong> Only for news, deals, or highly engaged communities
              </li>
              <li>
                <strong>Monthly:</strong> Risk of being forgotten; better for curated content
              </li>
            </ul>
            <InfoBox type="warning" title="Monitor Unsubscribes">
              <p className="text-ui">
                If unsubscribe rates spike when you increase frequency, you're sending too often. Find the balance.
              </p>
            </InfoBox>
          </div>
        </div>
      </section>

      {/* Segmentation */}
      <section id="segmentation" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Segmentation & Personalization</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Segmented campaigns generate 30% more opens and 50% more clicks than non-segmented campaigns. Send targeted
          messages to specific groups rather than blasting your entire list.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Common Segmentation Criteria</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>
                • <strong>Demographics:</strong> Age, location, job title, company size
              </li>
              <li>
                • <strong>Behavior:</strong> Purchase history, browsing activity, email engagement
              </li>
              <li>
                • <strong>Lifecycle stage:</strong> New subscriber, active customer, churned user
              </li>
              <li>
                • <strong>Engagement level:</strong> Highly engaged vs inactive subscribers
              </li>
              <li>
                • <strong>Preferences:</strong> Product interests, content topics, email frequency
              </li>
              <li>
                • <strong>Purchase recency:</strong> Recent buyers, lapsed customers
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Segment-Specific Campaigns</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Welcome series for new subscribers</li>
              <li>• Re-engagement campaigns for inactive users</li>
              <li>• Win-back campaigns for churned customers</li>
              <li>• Product recommendations based on past purchases</li>
              <li>• Location-specific offers and events</li>
              <li>• VIP campaigns for high-value customers</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Testing & Optimization */}
      <section id="testing" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Testing & Optimization</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Continuous testing is essential for improving email performance. Never assume—test and let data guide
          decisions.
        </p>

        <div className="space-y-6">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">What to A/B Test</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>
                • <strong>Subject lines:</strong> Length, personalization, questions vs statements, emojis
              </li>
              <li>
                • <strong>Send times:</strong> Day of week, time of day, time zones
              </li>
              <li>
                • <strong>Content:</strong> Long vs short, text vs image-heavy, tone and style
              </li>
              <li>
                • <strong>CTAs:</strong> Button text, color, placement, number of CTAs
              </li>
              <li>
                • <strong>Sender name:</strong> Company name vs person's name
              </li>
              <li>
                • <strong>Personalization:</strong> Generic vs personalized content
              </li>
            </ul>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">A/B Testing Best Practices</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>• Test one variable at a time for clear results</li>
              <li>• Use statistically significant sample sizes (minimum 1,000+ per variant)</li>
              <li>• Run tests long enough to account for timing variations</li>
              <li>• Test with random splits, not cherry-picked segments</li>
              <li>• Implement winners, then test the next variable</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Legal Compliance</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Email marketing is heavily regulated. Non-compliance can result in massive fines and damage to your
          reputation.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
            <h3 className="text-xl font-semibold text-blue-900 mb-3">CAN-SPAM (US)</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>• Don't use misleading subject lines or headers</li>
              <li>• Include your physical mailing address</li>
              <li>• Provide a clear, easy unsubscribe mechanism</li>
              <li>• Honor unsubscribe requests within 10 business days</li>
              <li>• Identify the email as an advertisement (if applicable)</li>
            </ul>
          </div>

          <div className="rounded-xl border-2 border-neutral-200 bg-neutral-50 p-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">GDPR (EU)</h3>
            <ul className="space-y-2 text-neutral-700">
              <li>• Obtain explicit consent before sending marketing emails</li>
              <li>• Provide clear information about data usage</li>
              <li>• Allow subscribers to access, modify, or delete their data</li>
              <li>• Keep records of consent</li>
              <li>• Implement appropriate data security measures</li>
            </ul>
          </div>
        </div>

        <InfoBox type="warning" title="When in Doubt, Get Consent" className="mt-6">
          <p>
            Laws vary by jurisdiction. The safest approach is always to get explicit, documented consent before adding
            anyone to your email list. Make unsubscribing easy and honor requests immediately.
          </p>
        </InfoBox>
      </section>

      {/* Metrics to Track */}
      <section id="metrics" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Key Metrics to Track</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Engagement Metrics</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>
                • <strong>Open rate:</strong> Industry average: 15-25%
              </li>
              <li>
                • <strong>Click-through rate (CTR):</strong> Industry average: 2-5%
              </li>
              <li>
                • <strong>Click-to-open rate (CTOR):</strong> Clicks ÷ opens
              </li>
              <li>
                • <strong>Conversion rate:</strong> Goal completions ÷ delivered
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Health Metrics</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>
                • <strong>Bounce rate:</strong> Target: &lt;2%
              </li>
              <li>
                • <strong>Unsubscribe rate:</strong> Target: &lt;0.5%
              </li>
              <li>
                • <strong>Spam complaint rate:</strong> Target: &lt;0.1%
              </li>
              <li>
                • <strong>List growth rate:</strong> New subscribers vs unsubscribes
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Business Metrics</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>
                • <strong>ROI:</strong> Revenue generated ÷ cost
              </li>
              <li>
                • <strong>Revenue per email:</strong> Total revenue ÷ emails sent
              </li>
              <li>
                • <strong>Customer lifetime value (CLV):</strong> Long-term value
              </li>
              <li>
                • <strong>Cost per acquisition (CPA):</strong> Acquisition cost
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Deliverability Metrics</h3>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>
                • <strong>Delivery rate:</strong> Target: 98%+
              </li>
              <li>
                • <strong>Inbox placement rate:</strong> Target: 95%+
              </li>
              <li>
                • <strong>Sender reputation score:</strong> Monitor regularly
              </li>
              <li>
                • <strong>Authentication status:</strong> SPF, DKIM, DMARC passing
              </li>
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
            <p className="text-ui text-neutral-600">Ensure your emails reach the inbox.</p>
          </Link>
          <Link
            href="/guides/email-open-rate"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Open Rates</h3>
            <p className="text-ui text-neutral-600">Improve your open rates with proven tactics.</p>
          </Link>
          <Link
            href="/guides/email-click-through-rate"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Click-Through Rate</h3>
            <p className="text-ui text-neutral-600">Optimize CTAs for more clicks.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

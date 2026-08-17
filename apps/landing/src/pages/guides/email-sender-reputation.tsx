import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import {CodeBlock} from '../../components/CodeBlock';
import Link from 'next/link';

export default function EmailSenderReputation() {
  return (
    <GuideLayout
      title="Email Sender Reputation: Build & Maintain Trust for Better Deliverability"
      description="Learn how sender reputation works, what affects it, and proven strategies to build and maintain a positive reputation for maximum deliverability."
      lastUpdated="2025-12-20"
      readTime="11 min"
      canonical="https://www.useplunk.com/guides/email-sender-reputation"
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          Email sender reputation is your sending domain and IP address's trustworthiness score in the eyes of email
          providers. It's the single most important factor determining whether your emails reach the inbox or spam
          folder.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          Think of it like a credit score for email: good reputation = inbox placement, bad reputation = spam folder or
          blocked delivery. This guide explains how reputation works and how to build and maintain it.
        </p>
      </section>

      {/* What is Sender Reputation */}
      <section id="what-is-reputation" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What is Email Sender Reputation?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Sender reputation is a score (typically 0-100) that email providers (Gmail, Outlook, Yahoo) assign to your
          sending domain and IP address. It's calculated based on your sending history, engagement rates, spam
          complaints, authentication, and list quality.
        </p>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">80-100</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Excellent</h3>
            <p className="text-ui text-neutral-700">
              Strong inbox placement, trusted sender, high engagement, proper authentication
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-amber-600 mb-2">50-79</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Moderate</h3>
            <p className="text-ui text-neutral-700">Some emails may reach spam, mixed signals, needs improvement</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="text-3xl font-bold text-red-600 mb-2">&lt;50</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Poor</h3>
            <p className="text-ui text-neutral-700">Most emails go to spam or blocked, serious deliverability issues</p>
          </div>
        </div>

        <InfoBox type="info" title="Domain vs IP Reputation">
          <p>
            Email providers track reputation for both your <strong>sending domain</strong> (yourdomain.com) and{' '}
            <strong>IP address</strong>. Both matter. Domain reputation is more permanent, while IP reputation can be
            changed by switching IPs (though you have to rebuild it).
          </p>
        </InfoBox>
      </section>

      {/* Factors Affecting Reputation */}
      <section id="factors" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What Affects Sender Reputation?</h2>

        <div className="space-y-6">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. Spam Complaint Rate</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: Critical.</strong> When recipients mark your emails as spam, it severely damages
              reputation. Target: &lt;0.1% (1 complaint per 1,000 emails). Even 0.3% is concerning.
            </p>
            <p className="text-ui text-neutral-600">
              Prevention: Only send to opted-in subscribers, provide value, make unsubscribing easy.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. Engagement Metrics</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: Very High.</strong> Email providers track opens, clicks, replies, forwards, and deletes.
              High engagement signals that recipients want your emails. Low engagement suggests spam.
            </p>
            <p className="text-ui text-neutral-600">
              Boost engagement: Send relevant, valuable content to interested subscribers.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. Bounce Rate</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: High.</strong> High bounce rates (especially hard bounces) indicate poor list hygiene,
              purchased lists, or spam traps. Target: &lt;2% overall bounce rate.
            </p>
            <p className="text-ui text-neutral-600">
              Prevent bounces: Use double opt-in, validate emails, remove hard bounces immediately.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. Email Authentication</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: High.</strong> Proper SPF, DKIM, and DMARC authentication proves your emails are
              legitimate. Missing authentication raises red flags.
            </p>
            <p className="text-ui text-neutral-600">
              Required: Implement all three authentication protocols (SPF, DKIM, DMARC).
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">5. Spam Trap Hits</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: Critical.</strong> Spam traps are email addresses used to catch senders with poor
              practices. Hitting spam traps can get you blacklisted instantly.
            </p>
            <p className="text-ui text-neutral-600">
              Avoid: Never buy lists, use double opt-in, clean old addresses regularly.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">6. Sending Volume & Consistency</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: Moderate.</strong> Sudden spikes in volume look suspicious. Inconsistent sending (long
              gaps, then huge blasts) damages reputation.
            </p>
            <p className="text-ui text-neutral-600">
              Best practice: Send consistently and gradually increase volume over time (warm-up).
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">7. Content Quality</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: Moderate.</strong> Spammy content (excessive links, misleading subject lines, all caps)
              triggers filters and reduces engagement.
            </p>
            <p className="text-ui text-neutral-600">
              Write naturally: Professional, valuable content that matches subject line promises.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">8. Blacklist Status</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: Critical.</strong> Being listed on major blacklists (Spamhaus, Barracuda, SURBL) can block
              delivery to entire domains.
            </p>
            <p className="text-ui text-neutral-600">
              Monitor: Regularly check blacklist status and request delisting if listed.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">9. Sending History</h3>
            <p className="text-neutral-700 mb-3">
              <strong>Impact: Cumulative.</strong> Reputation is built over time. New domains/IPs have no history (zero
              reputation) and need to be warmed up gradually.
            </p>
            <p className="text-ui text-neutral-600">
              For new senders: Start with small volumes and gradually increase over 4-8 weeks.
            </p>
          </div>
        </div>
      </section>

      {/* Building Reputation */}
      <section id="building" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Build Sender Reputation</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Building reputation from scratch (new domain or IP) requires patience and best practices:
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Warm Up New IPs and Domains</h3>
              <p className="text-neutral-700 mb-3">
                Gradually increase sending volume over 4-8 weeks. Start with your most engaged subscribers.
              </p>
              <CodeBlock
                language="text"
                title="Example Warm-Up Schedule"
                code={`Week 1:  200-500 emails/day
Week 2:  500-1,000 emails/day
Week 3:  1,000-5,000 emails/day
Week 4:  5,000-10,000 emails/day
Week 5:  10,000-20,000 emails/day
Week 6:  20,000-50,000 emails/day
Week 7:  50,000-100,000 emails/day
Week 8+: Full volume

Adjust based on engagement and bounce rates.`}
                showCopy={false}
              />
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Start with Highly Engaged Subscribers</h3>
              <p className="text-neutral-700">
                During warm-up, send only to subscribers who recently opened or clicked. High engagement in early sends
                establishes positive reputation quickly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Implement Full Authentication</h3>
              <p className="text-neutral-700">
                Set up SPF, DKIM, and DMARC before sending. Proper authentication is table stakes for building
                reputation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Maintain Consistent Sending</h3>
              <p className="text-neutral-700">
                Send regularly (daily or weekly) rather than sporadic blasts. Consistency builds trust with email
                providers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Use Double Opt-In</h3>
              <p className="text-neutral-700">
                Require email confirmation before adding subscribers. This ensures list quality and prevents spam trap
                addresses from the start.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              6
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Monitor Metrics Closely</h3>
              <p className="text-neutral-700">
                Track bounce rate, spam complaints, and engagement during warm-up. If metrics degrade, slow down volume
                increases and improve list quality.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              7
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-neutral-900 mb-2">Provide Immediate Value</h3>
              <p className="text-neutral-700">
                Your first emails set the tone. Deliver on promises made during signup. High engagement on early emails
                accelerates reputation building.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Maintaining Reputation */}
      <section id="maintaining" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Maintaining Good Sender Reputation</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">Once built, reputation requires ongoing attention:</p>

        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Clean Your List Regularly</h3>
            <p className="text-neutral-700 mb-3">Remove or re-engage inactive subscribers every 6-12 months:</p>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Send re-engagement campaigns to inactive subscribers</li>
              <li>• Remove those who don't re-engage</li>
              <li>• Immediately remove hard bounces</li>
              <li>• Remove persistent soft bouncers (3-5 bounces)</li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Make Unsubscribing Easy</h3>
            <p className="text-neutral-700 mb-3">
              Paradoxically, easy unsubscribes protect reputation. Frustrated users who can't unsubscribe mark as spam
              instead, which is far worse.
            </p>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Include clear, one-click unsubscribe in every email</li>
              <li>• Process unsubscribes immediately (don't require confirmation)</li>
              <li>• Honor unsubscribes permanently</li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Monitor Reputation Metrics</h3>
            <p className="text-neutral-700 mb-3">Track these indicators weekly:</p>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Delivery rate (target: 98%+)</li>
              <li>• Spam complaint rate (target: &lt;0.1%)</li>
              <li>• Bounce rate (target: &lt;2%)</li>
              <li>• Engagement rates (opens, clicks)</li>
              <li>• Blacklist status (monthly checks)</li>
              <li>• Sender Score (check quarterly)</li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Segment and Personalize</h3>
            <p className="text-neutral-700">
              Send targeted, relevant emails to specific subscriber groups. Segmentation dramatically improves
              engagement, which protects reputation.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">
              Use Separate Domains for Different Email Types
            </h3>
            <p className="text-neutral-700 mb-3">
              Protect critical transactional email reputation by separating from marketing:
            </p>
            <ul className="space-y-2 text-ui text-neutral-700">
              <li>• Transactional: transact.yourdomain.com</li>
              <li>• Marketing: news.yourdomain.com or marketing.yourdomain.com</li>
              <li>• Benefits: Marketing issues won't affect mission-critical transactional emails</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Recovering Damaged Reputation */}
      <section id="recovery" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Recovering from Damaged Reputation</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          If your reputation suffers, recovery is possible but takes time and discipline:
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-ui font-bold">
              1
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-amber-900 mb-2">Identify the Root Cause</h3>
              <p className="text-neutral-700">
                Review recent campaigns for spam complaints, high bounces, poor engagement. Check if you're blacklisted.
                Find and fix the underlying issue.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-ui font-bold">
              2
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-amber-900 mb-2">Clean Your List Aggressively</h3>
              <p className="text-neutral-700">
                Remove all unengaged subscribers, bounced addresses, and anyone who hasn't opened in 6+ months. Yes,
                your list shrinks, but quality beats quantity for reputation recovery.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-ui font-bold">
              3
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-amber-900 mb-2">Reduce Volume Temporarily</h3>
              <p className="text-neutral-700">
                Cut sending volume by 50-70% while you fix issues. Send only to highly engaged subscribers. Rebuild
                trust before scaling back up.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-ui font-bold">
              4
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-amber-900 mb-2">Request Blacklist Removal</h3>
              <p className="text-neutral-700">
                If blacklisted, identify which lists, fix the underlying issues, then request delisting. Most blacklists
                have removal request processes. Be honest about what you fixed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-ui font-bold">
              5
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-amber-900 mb-2">Send Valuable, Engaging Content</h3>
              <p className="text-neutral-700">
                Recovery requires proving you send emails people want. Focus on value, not promotions. High engagement
                signals to providers that you've reformed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-ui font-bold">
              6
            </div>
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="font-semibold text-amber-900 mb-2">Be Patient</h3>
              <p className="text-neutral-700">
                Reputation recovery typically takes 4-12 weeks of consistently good behavior. Monitor metrics closely
                and don't rush back to high volumes before reputation improves.
              </p>
            </div>
          </div>
        </div>

        <InfoBox type="warning" title="Severe Damage May Require Starting Fresh" className="mt-6">
          <p>
            If reputation is severely damaged (sender score &lt;30, multiple blacklistings, blocked by major providers),
            recovery may be impractical. Consider migrating to a new subdomain or IP and starting reputation from
            scratch. This is a last resort.
          </p>
        </InfoBox>
      </section>

      {/* Monitoring Tools */}
      <section id="monitoring" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Reputation Monitoring Tools</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Google Postmaster Tools</h3>
            <p className="text-ui text-neutral-700 mb-3">
              Free tool showing domain reputation, spam rate, authentication, and encryption for Gmail delivery.
            </p>
            <a
              href="https://postmaster.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui text-blue-600 hover:underline"
            >
              postmaster.google.com →
            </a>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Microsoft SNDS</h3>
            <p className="text-ui text-neutral-700 mb-3">
              Smart Network Data Services provides data on how Microsoft views your IPs, including spam complaints.
            </p>
            <a
              href="https://sendersupport.olc.protection.outlook.com/snds/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui text-blue-600 hover:underline"
            >
              Microsoft SNDS →
            </a>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Sender Score (Validity)</h3>
            <p className="text-ui text-neutral-700 mb-3">
              Free sender reputation score (0-100) based on industry data. Widely used benchmark for IP reputation.
            </p>
            <a
              href="https://www.validity.com/everest/senderscore/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui text-blue-600 hover:underline"
            >
              Check Sender Score →
            </a>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">MXToolbox Blacklist Check</h3>
            <p className="text-ui text-neutral-700 mb-3">
              Check if your domain or IP is on major blacklists. Monitor regularly to catch listings early.
            </p>
            <a
              href="https://mxtoolbox.com/blacklists.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui text-blue-600 hover:underline"
            >
              MXToolbox →
            </a>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Talos Intelligence</h3>
            <p className="text-ui text-neutral-700 mb-3">
              Cisco Talos provides sender reputation data. Check your IP's reputation and request delisting if needed.
            </p>
            <a
              href="https://talosintelligence.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui text-blue-600 hover:underline"
            >
              Talos Intelligence →
            </a>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">BarracudaCentral</h3>
            <p className="text-ui text-neutral-700 mb-3">
              Check reputation and blacklist status on Barracuda's network. Important for enterprise email delivery.
            </p>
            <a
              href="https://www.barracudacentral.org/lookups"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui text-blue-600 hover:underline"
            >
              BarracudaCentral →
            </a>
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
            <p className="text-ui text-neutral-600">Complete deliverability guide.</p>
          </Link>
          <Link
            href="/guides/email-bounce-rate"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Bounce Rate</h3>
            <p className="text-ui text-neutral-600">Reduce bounces to protect reputation.</p>
          </Link>
          <Link
            href="/guides/what-is-dkim"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is DKIM?</h3>
            <p className="text-ui text-neutral-600">Email authentication for better reputation.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

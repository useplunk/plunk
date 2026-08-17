import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import {CodeBlock} from '../../components/CodeBlock';
import Link from 'next/link';

export default function EmailClickThroughRate() {
  return (
    <GuideLayout
      title="Email Click-Through Rate: How to Optimize CTAs & Increase Clicks"
      description="Learn what affects email click-through rates, industry benchmarks, and proven tactics to optimize CTAs and boost engagement."
      lastUpdated="2025-12-20"
      readTime="10 min"
      canonical="https://www.useplunk.com/guides/email-click-through-rate"
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          Email click-through rate (CTR) measures the percentage of recipients who clicked a link in your email. While
          open rates show subject line effectiveness, CTR reveals how compelling your email content and calls-to-action
          are.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          High CTR indicates engaged subscribers who find value in your emails and are moving toward conversion. This
          guide covers everything you need to optimize CTAs and maximize clicks.
        </p>
      </section>

      {/* What is CTR */}
      <section id="what-is-ctr" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What is Email Click-Through Rate?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Click-through rate is the percentage of delivered emails that received at least one click on a link.
        </p>

        <div className="rounded-xl border-2 border-neutral-900 bg-neutral-50 p-8 mb-8">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-neutral-900 mb-4">CTR Formula</div>
            <CodeBlock
              language="text"
              code={`CTR = (Unique Clicks ÷ Delivered Emails) × 100

Example:
- Sent: 10,000 emails
- Delivered: 9,800 emails
- Unique Clicks: 294

CTR = (294 ÷ 9,800) × 100 = 3.0%`}
              showCopy={false}
            />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-neutral-900 mb-4">CTOR Formula</div>
            <CodeBlock
              language="text"
              code={`CTOR (Click-to-Open Rate) = (Unique Clicks ÷ Unique Opens) × 100

Example:
- Unique Opens: 2,450
- Unique Clicks: 294

CTOR = (294 ÷ 2,450) × 100 = 12.0%`}
              showCopy={false}
            />
          </div>
        </div>

        <InfoBox type="info" title="CTR vs CTOR">
          <p>
            <strong>CTR</strong> measures overall campaign effectiveness (including deliverability and opens).{' '}
            <strong>CTOR</strong> isolates content quality by measuring engagement from those who opened. Use both—CTR
            for overall performance, CTOR for content optimization.
          </p>
        </InfoBox>
      </section>

      {/* Benchmarks */}
      <section id="benchmarks" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">CTR Benchmarks by Industry</h2>

        <div className="rounded-xl border border-neutral-200 overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-ui font-semibold">Industry</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Average CTR</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Good CTR</th>
                <th className="px-6 py-4 text-left text-ui font-semibold">Average CTOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              <tr>
                <td className="px-6 py-4 text-ui text-neutral-900">SaaS / Technology</td>
                <td className="px-6 py-4 text-ui text-neutral-700">2-3%</td>
                <td className="px-6 py-4 text-ui text-neutral-700">4%+</td>
                <td className="px-6 py-4 text-ui text-neutral-700">10-15%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui text-neutral-900">E-commerce / Retail</td>
                <td className="px-6 py-4 text-ui text-neutral-700">3-5%</td>
                <td className="px-6 py-4 text-ui text-neutral-700">6%+</td>
                <td className="px-6 py-4 text-ui text-neutral-700">12-18%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui text-neutral-900">Media / Publishing</td>
                <td className="px-6 py-4 text-ui text-neutral-700">4-6%</td>
                <td className="px-6 py-4 text-ui text-neutral-700">7%+</td>
                <td className="px-6 py-4 text-ui text-neutral-700">15-20%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui text-neutral-900">Financial Services</td>
                <td className="px-6 py-4 text-ui text-neutral-700">2-4%</td>
                <td className="px-6 py-4 text-ui text-neutral-700">5%+</td>
                <td className="px-6 py-4 text-ui text-neutral-700">10-14%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui text-neutral-900">Non-Profit</td>
                <td className="px-6 py-4 text-ui text-neutral-700">2-4%</td>
                <td className="px-6 py-4 text-ui text-neutral-700">5%+</td>
                <td className="px-6 py-4 text-ui text-neutral-700">10-16%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui text-neutral-900">Education</td>
                <td className="px-6 py-4 text-ui text-neutral-700">3-5%</td>
                <td className="px-6 py-4 text-ui text-neutral-700">6%+</td>
                <td className="px-6 py-4 text-ui text-neutral-700">12-17%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <InfoBox type="tip" title="Context Matters">
          <p>
            CTR varies dramatically by email type: promotional emails (2-3%), newsletters (4-6%), transactional emails
            (10-15%), and triggered emails (15-30%). Compare similar email types, not all campaigns together.
          </p>
        </InfoBox>
      </section>

      {/* Factors Affecting CTR */}
      <section id="factors" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What Affects Click-Through Rates?</h2>

        <div className="space-y-6">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. Call-to-Action (CTA) Design</h3>
            <p className="text-neutral-700">
              Your CTA's design, placement, and copy directly impact clicks. Clear, prominent, action-oriented CTAs
              significantly outperform generic "Click here" links.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. Email Relevance</h3>
            <p className="text-neutral-700">
              Targeted, personalized content generates 2-3x higher CTR than generic blasts. Segmentation and
              personalization ensure emails match subscriber interests.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. Value Proposition</h3>
            <p className="text-neutral-700">
              Recipients need a clear reason to click. Compelling value propositions—exclusive content, limited offers,
              solutions to problems—drive clicks.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. Mobile Optimization</h3>
            <p className="text-neutral-700">
              60%+ of emails are read on mobile. Unoptimized emails with small links or poorly formatted content see 50%
              lower CTR on mobile devices.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">5. Content Scannability</h3>
            <p className="text-neutral-700">
              Most people skim emails. Clear structure with headers, bullet points, and whitespace helps readers find
              and click CTAs quickly.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">6. Number of CTAs</h3>
            <p className="text-neutral-700">
              More CTAs = divided attention. Emails with one primary CTA convert 371% better than those with multiple
              competing CTAs.
            </p>
          </div>
        </div>
      </section>

      {/* How to Improve CTR */}
      <section id="improve-ctr" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Increase Email Click-Through Rates</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Use Clear, Action-Oriented CTA Copy</h3>
              <p className="text-neutral-700 mb-3">
                Be specific about what happens when users click. Action verbs + value = higher CTR.
              </p>
              <div className="rounded-lg bg-neutral-100 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-ui text-neutral-700">"Download your free guide"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-ui text-neutral-700">"Start your 14-day free trial"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-ui text-neutral-700">"Get 20% off today only"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span className="text-ui text-neutral-700">"Click here"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span className="text-ui text-neutral-700">"Learn more"</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Design Prominent CTA Buttons</h3>
              <p className="text-neutral-700 mb-3">Button best practices:</p>
              <ul className="list-disc list-inside space-y-1 text-ui text-neutral-700">
                <li>Use contrasting colors that stand out from email design</li>
                <li>Make buttons large enough to tap on mobile (44x44px minimum)</li>
                <li>Add white space around buttons for visual prominence</li>
                <li>Use button text, not images (better for accessibility and loading)</li>
                <li>Repeat primary CTA if email is long (top and bottom)</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Create a Single, Clear Focus</h3>
              <p className="text-neutral-700">
                Each email should have one primary goal. Multiple CTAs competing for attention reduce overall clicks.
                Guide readers toward one clear action.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Personalize Content</h3>
              <p className="text-neutral-700">
                Go beyond "Hi [Name]". Use behavioral data, purchase history, browsing activity, or preferences to send
                highly relevant emails. Personalized CTAs see 202% higher CTR.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Optimize for Mobile</h3>
              <p className="text-neutral-700 mb-3">Mobile optimization is critical:</p>
              <ul className="list-disc list-inside space-y-1 text-ui text-neutral-700">
                <li>Responsive design that adapts to screen size</li>
                <li>Large, tappable buttons (not small text links)</li>
                <li>Single-column layout for easy scrolling</li>
                <li>Concise copy (mobile users scan quickly)</li>
                <li>Place CTAs above the fold when possible</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              6
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Use Urgency and Scarcity (Authentically)</h3>
              <p className="text-neutral-700">
                Genuine limited-time offers or limited quantity create urgency that drives clicks. Be authentic—false
                urgency damages trust. "Sale ends tonight" or "Only 5 spots remaining" work when true.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              7
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Segment Your Audience</h3>
              <p className="text-neutral-700">
                Send targeted emails to specific groups based on behavior, interests, or demographics. Segmented
                campaigns see 3x higher CTR than non-segmented blasts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              8
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Include Preview/Teaser Content</h3>
              <p className="text-neutral-700">
                Show just enough value to create curiosity. Product images, stat highlights, or content snippets
                encourage clicks to see more. "Read the full article" works better than just a headline.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              9
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">A/B Test CTAs</h3>
              <p className="text-neutral-700 mb-3">Test systematically:</p>
              <ul className="list-disc list-inside space-y-1 text-ui text-neutral-700">
                <li>Button copy ("Get started" vs "Start free trial")</li>
                <li>Button color (brand color vs high-contrast color)</li>
                <li>Button placement (top, middle, bottom)</li>
                <li>Number of CTAs (one vs multiple)</li>
                <li>Button size and shape</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              10
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Improve Email-Landing Page Match</h3>
              <p className="text-neutral-700">
                Ensure landing pages match email promises. Mismatched expectations cause immediate bounces. Email says
                "20% off"? Landing page should show 20% off, not a generic homepage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Placement */}
      <section id="cta-placement" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">CTA Placement Best Practices</h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Short Emails (&lt;200 words)</h3>
            <p className="text-ui text-neutral-700 mb-3">One CTA in the middle or at the end.</p>
            <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">Intro → Value prop → CTA</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Medium Emails (200-500 words)</h3>
            <p className="text-ui text-neutral-700 mb-3">CTAs at the beginning and end.</p>
            <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
              Intro + CTA → Content → Final CTA
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Long Emails (&gt;500 words)</h3>
            <p className="text-ui text-neutral-700 mb-3">Multiple CTAs throughout.</p>
            <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
              CTA → Content → CTA → More content → Final CTA
            </div>
          </div>
        </div>

        <InfoBox type="tip" title="Above the Fold" className="mt-6">
          <p>
            Place at least one CTA above the fold (visible without scrolling) on mobile. Many readers won't scroll, so
            give them an early opportunity to click.
          </p>
        </InfoBox>
      </section>

      {/* Common Mistakes */}
      <section id="common-mistakes" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Common CTR Mistakes to Avoid</h2>

        <div className="space-y-6">
          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Too Many CTAs</h3>
            <p className="text-neutral-700">
              Multiple competing CTAs confuse readers and reduce overall clicks. Focus on one primary action per email.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Vague CTA Copy</h3>
            <p className="text-neutral-700">
              "Click here" and "Learn more" don't communicate value. Be specific: "Download free guide" or "Start 14-day
              trial" tell readers exactly what they'll get.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Image-Only CTAs</h3>
            <p className="text-neutral-700">
              Many email clients block images by default. If your CTA is an image, users won't see it. Use HTML buttons
              with text.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Small, Hard-to-Tap Links</h3>
            <p className="text-neutral-700">
              Tiny text links are difficult to tap on mobile. Use large buttons (minimum 44x44px) for easy tapping.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ No Clear Value Proposition</h3>
            <p className="text-neutral-700">
              Readers won't click if they don't know why they should. Clearly communicate the benefit of clicking before
              asking them to act.
            </p>
          </div>
        </div>
      </section>

      {/* Related Guides */}
      <section id="related-guides" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Related Email Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/guides/email-open-rate"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Open Rates</h3>
            <p className="text-ui text-neutral-600">Improve opens to get more clicks.</p>
          </Link>
          <Link
            href="/guides/email-marketing-best-practices"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Marketing Best Practices</h3>
            <p className="text-ui text-neutral-600">Complete email marketing guide.</p>
          </Link>
          <Link
            href="/guides/email-deliverability"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Deliverability</h3>
            <p className="text-ui text-neutral-600">Reach the inbox for better engagement.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}

import {ComparisonTable, FAQSection, Footer, Navbar, SwitchOffer} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, BarChart3, Check, DollarSign, Globe, PackageOpen, Users, Zap} from 'lucide-react';
import type {ComparisonRow} from '../../components/ComparisonTable';
import type {FAQ} from '../../components/FAQSection';

const comparisonData: ComparisonRow[] = [
  {feature: 'Pricing Model', plunk: 'Pay-as-you-go', competitor: 'Monthly subscription tiers'},
  {feature: 'Setup Time', plunk: '5 minutes', competitor: 'Hours of configuration'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Transactional Emails', plunk: true, competitor: true},
  {feature: 'Marketing Campaigns', plunk: 'Included', competitor: 'Separate product'},
  {feature: 'Workflow Automation', plunk: true, competitor: 'Enterprise only'},
  {feature: 'Dynamic Segmentation', plunk: true, competitor: 'Limited'},
  {feature: 'API Simplicity', plunk: 'Modern REST', competitor: 'Complex legacy API'},
];

const faqs: FAQ[] = [
  {
    question: 'What is the difference between Plunk and SendGrid pricing?',
    answer:
      "Plunk uses a pay-as-you-go model where you only pay for emails sent, with no monthly minimums. SendGrid uses monthly subscription tiers with fixed costs regardless of actual usage. Plunk's approach means you're not locked into a monthly fee if your email volume varies.",
  },
  {
    question: 'Why is SendGrid so complicated to set up?',
    answer:
      'SendGrid is built for large enterprises with complex needs. It requires configuring IP addresses, sender authentication, subuser accounts, and understanding their legacy API structure. Plunk is built for developers who want to start sending emails in minutes with a simple, modern API.',
  },
  {
    question: 'Does Plunk have the same deliverability as SendGrid?',
    answer:
      'Yes. Plunk is built on top of AWS SES, which has excellent deliverability comparable to SendGrid. Both platforms support custom domains, DKIM authentication, and dedicated IPs (for high-volume senders). The key difference is Plunk makes these features accessible without the complexity.',
  },
  {
    question: 'Can I migrate from SendGrid to Plunk?',
    answer:
      "Yes, migration is straightforward. Export your contacts from SendGrid, import them to Plunk via CSV, and update your application to use Plunk's easy API. Most migrations take less than a day.",
  },
  {
    question: 'What SendGrid features does Plunk not have?',
    answer:
      'Plunk focuses on modern email workflows rather than enterprise-specific features. For 95% of use cases, Plunk provides everything you need.',
  },
];

/**
 * Plunk vs SendGrid comparison page
 */
export default function SendGridComparison() {
  return (
    <>
      <NextSeo
        title="SendGrid Alternative: Pay-As-You-Go & Open Source | Plunk"
        description="Tired of SendGrid's pricing tiers and complexity? Plunk is an open-source alternative with pay-as-you-go pricing at $0.001/email, a modern API, and no lock-in."
        canonical="https://www.useplunk.com/vs/sendgrid"
        openGraph={{
          title: 'SendGrid Alternative: Pay-As-You-Go & Open Source | Plunk',
          description:
            "Tired of SendGrid's pricing tiers and complexity? Plunk is open-source with pay-as-you-go pricing at $0.001/email and no lock-in.",
          url: 'https://www.useplunk.com/vs/sendgrid',
          images: [{url: 'https://www.useplunk.com/api/og?title=SendGrid+Alternative%3A+Open+Source+%26+Pay-As-You-Go&tag=Comparison', alt: 'Plunk vs SendGrid', width: 1200, height: 630}],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>

        {/* Hero */}
        <section className={'relative overflow-hidden'}>
          <div aria-hidden className={'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'} />
          <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pt-28 sm:pb-28'}>
            <motion.div initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}>
              <h1 style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'}>
                Open-source alternative
                <br />
                for SendGrid
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>Pay-as-you-go instead of fixed subscriptions. No complex setup, no feature gating, no enterprise sales pitches. Built for developers, not procurement teams.</p>
              <div className={'mt-10 flex flex-wrap gap-3'}>
                <motion.a whileHover={{scale: 1.015}} whileTap={{scale: 0.985}} href={`${DASHBOARD_URI}/auth/signup`} className={'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(23,23,23,0.35)] transition hover:bg-neutral-800'}>
                  Get started free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link href={WIKI_URI} target={'_blank'} className={'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'}>
                  View documentation
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing comparison */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>
                The Pricing Model That Makes Sense
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Pay for what you use, not for what you might use</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Pay per email sent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Pay-as-you-go pricing. Only pay for emails you actually send, no monthly minimums.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />No monthly minimum or commitment</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Marketing campaigns included</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Workflow automation included</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>SendGrid</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Monthly subscription tiers</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Fixed monthly fees based on email volume tiers with feature restrictions.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>Fixed subscription</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Locked into monthly subscription plan</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Marketing is a separate paid product</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Automation locked to enterprise tier</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>Why Choose Plunk Over SendGrid</h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Built for modern developers, not enterprise sales teams</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3'}>
              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><DollarSign className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Simple, Transparent Pricing</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Pay-as-you-go per email. No hidden fees, no complex tiers, no enterprise sales calls. Start free, scale as you grow.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Zap className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>5-Minute Setup</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Start sending emails in minutes, not hours. Modern API, clear documentation, no complex configuration. Copy-paste and go.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><BarChart3 className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Marketing Included</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Campaigns, workflows, and segmentation at no extra cost. SendGrid requires their separate Marketing Campaigns product with additional fees.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><PackageOpen className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Open Source & Transparent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>AGPL-3.0 licensed. Inspect the code, contribute features, self-host if needed. No black boxes, no vendor lock-in.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Globe className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Self-Hostable</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Run on your infrastructure with Docker. Full data control, compliance-ready, cost-optimized. SendGrid is cloud-only.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Users className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>No Feature Gating</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>All features available on all plans. No artificial limits, no forced upgrades to "enterprise" for basic automation.</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature comparison table */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>Feature comparison</h2>
            </motion.div>
            <ComparisonTable competitorName="SendGrid" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-sendgrid" />

        <SwitchOffer competitorName="SendGrid" />

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2 initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}} style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}>
                Make the switch today
              </motion.h2>
              <motion.div initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}} className={'flex max-w-md flex-col gap-6'}>
                <p className={'text-lead text-neutral-300'}>Join hundreds of developers who've ditched SendGrid's complexity for Plunk's simplicity.</p>
                <div className={'flex flex-wrap gap-3'}>
                  <motion.a whileHover={{scale: 1.015}} whileTap={{scale: 0.985}} href={`${DASHBOARD_URI}/auth/signup`} className={'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'}>
                    Get started free <ArrowRight className="h-4 w-4" />
                  </motion.a>
                  <Link href={'/pricing'} className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}>
                    View pricing
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

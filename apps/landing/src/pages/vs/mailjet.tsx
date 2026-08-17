import {ComparisonTable, FAQSection, Footer, Navbar, SwitchOffer} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, BarChart3, Globe, Layers, PackageOpen, Users, Workflow} from 'lucide-react';
import type {ComparisonRow} from '../../components/ComparisonTable';
import type {FAQ} from '../../components/FAQSection';

const comparisonData: ComparisonRow[] = [
  {feature: 'Free Tier', plunk: '1,000 emails/month', competitor: '200 emails/day (6,000/month)'},
  {feature: 'Pricing Model', plunk: 'Pay-as-you-go', competitor: 'Monthly subscription plans'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Transactional Emails', plunk: true, competitor: true},
  {feature: 'Marketing Campaigns', plunk: true, competitor: true},
  {feature: 'Workflow Automation', plunk: true, competitor: false},
  {feature: 'Dynamic Segmentation', plunk: true, competitor: 'Basic'},
  {feature: 'Event Tracking', plunk: true, competitor: true},
  {feature: 'Custom Domains', plunk: true, competitor: true},
];

const faqs: FAQ[] = [
  {
    question: 'When should I choose Mailjet over Plunk?',
    answer:
      'Choose Mailjet if you need inbox preview testing or built-in A/B testing for email campaigns. Mailjet has been around longer and has a broad feature set. Choose Plunk if you need workflow automation, want an open-source platform you can self-host, or prefer pay-as-you-go pricing without monthly subscription commitments.',
  },
  {
    question: 'What is the pricing difference between Plunk and Mailjet?',
    answer:
      "Plunk is pure pay-as-you-go at $0.001/email — you pay only for what you send. Mailjet uses monthly subscription tiers: their Essential plan starts around $17/month for 15,000 emails, scaling up from there. For variable sending volumes, Plunk is more cost-effective since you never pay for capacity you don't use.",
  },
  {
    question: 'Is migration from Mailjet to Plunk complex?',
    answer:
      "Migration requires updating your API integration since Plunk and Mailjet use different API structures. Core concepts (templates, webhooks, custom domains) map directly. Most teams complete the technical migration in a few hours. Contact lists and templates can be adapted with minimal effort.",
  },
  {
    question: "What does Plunk offer that Mailjet doesn't?",
    answer:
      'Plunk adds multi-step workflow automation (triggers, delays, conditions — perfect for onboarding and drip sequences) and is fully open-source under AGPL-3.0, meaning you can self-host on your own infrastructure. Mailjet offers neither workflow automation nor self-hosting. Plunk also uses pure pay-as-you-go pricing rather than tiered subscriptions.',
  },
];

export default function MailjetComparison() {
  return (
    <>
      <NextSeo
        title="Open-Source Mailjet Alternative: Pay-As-You-Go with Workflow Automation | Plunk"
        description="Mailjet uses monthly subscription plans and lacks workflow automation. Plunk is pay-as-you-go at $0.001/email — open-source, self-hostable, with transactional, marketing, and automation in one platform."
        canonical="https://www.useplunk.com/vs/mailjet"
        openGraph={{
          title: 'Open-Source Mailjet Alternative: Pay-As-You-Go with Workflow Automation | Plunk',
          description:
            'Mailjet uses monthly subscriptions and lacks automation. Plunk is pay-as-you-go, open-source, and self-hostable with transactional, marketing, and automation included.',
          url: 'https://www.useplunk.com/vs/mailjet',
          images: [{url: 'https://www.useplunk.com/api/og?title=Open-Source+Mailjet+Alternative&tag=Comparison', alt: 'Plunk vs Mailjet', width: 1200, height: 630}],
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
                for Mailjet
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>Mailjet is a solid email platform but locks you into monthly subscriptions and has no workflow automation. Plunk is open-source, self-hostable, pay-as-you-go, and includes automation — no second tool required.</p>
              <div className={'mt-10 flex flex-wrap gap-3'}>
                <motion.a whileHover={{scale: 1.015}} whileTap={{scale: 0.985}} href={`${DASHBOARD_URI}/auth/signup`} className={'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(23,23,23,0.35)] transition hover:bg-neutral-800'}>
                  Try Plunk free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
              <p className={'mt-4 text-lead text-neutral-600'}>Pay for what you use, not fixed subscriptions</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Pay per email sent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Pay-as-you-go pricing. Only pay for emails you actually send.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Only pay for emails you actually send</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Scale up or down without commitment</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Automation and marketing included</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>Mailjet</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Monthly subscription plans</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Tiered monthly plans based on email volume. Essential starts ~$17/month.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>Fixed subscription</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Locked into monthly subscription tiers</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Pay for capacity whether you use it or not</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />No workflow automation on any plan</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>What Plunk Adds</h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Beyond what Mailjet offers</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-3'}>
              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Workflow className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Workflow Automation</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Build multi-step email sequences with triggers, delays, and conditions. Onboarding flows, drip campaigns, re-engagement — Mailjet has none of this.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><BarChart3 className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Dynamic Segmentation</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Auto-updating audience segments based on contact data and behavior. Target campaigns with precision beyond Mailjet's basic list management.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Users className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Event Tracking</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Track any custom event from your product and use it to trigger workflows or build segments. Connect your app's behavior to your email platform.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><PackageOpen className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Open Source</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>AGPL-3.0 licensed. Inspect the code, contribute features, no vendor lock-in. Mailjet is a closed, proprietary platform.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Globe className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Self-Hostable</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Run on your own infrastructure with Docker. Full data sovereignty, compliance-ready, and you only pay AWS SES fees when self-hosting.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Layers className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>All-in-One Platform</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Transactional, marketing, and automation under one roof. Pay-as-you-go for all of it — no separate tool for workflows.</p>
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
            <ComparisonTable competitorName="Mailjet" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-mailjet" />

        <SwitchOffer competitorName="Mailjet" />

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2 initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}} style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}>
                Try Plunk free
              </motion.h2>
              <motion.div initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}} className={'flex max-w-md flex-col gap-6'}>
                <p className={'text-lead text-neutral-300'}>1,000 emails/month free. No credit card required. Add marketing and automation when you need it.</p>
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

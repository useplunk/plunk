import {ComparisonTable, FAQSection, Footer, Navbar, SwitchOffer} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, Check, Code2, DollarSign, Globe, PackageOpen, Zap} from 'lucide-react';
import type {ComparisonRow} from '../../components/ComparisonTable';
import type {FAQ} from '../../components/FAQSection';

const comparisonData: ComparisonRow[] = [
  {feature: 'Pricing Model', plunk: 'Pay-as-you-go', competitor: 'Trial then subscription'},
  {feature: 'Target Audience', plunk: 'Developers', competitor: 'Small businesses/creators'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Transactional Emails', plunk: true, competitor: true},
  {feature: 'Marketing Campaigns', plunk: true, competitor: true},
  {feature: 'Workflow Automation', plunk: true, competitor: true},
  {feature: 'CRM Features', plunk: false, competitor: true},
  {feature: 'Live Chat', plunk: false, competitor: true},
  {feature: 'API-First Design', plunk: true, competitor: 'Integration-focused'},
];

const faqs: FAQ[] = [
  {
    question: 'When should I choose Bento over Plunk?',
    answer:
      "Choose Bento if you need an all-in-one platform with CRM, live chat, and customer relationship features alongside email. Bento is designed for small businesses and creators who want everything in one place. Choose Plunk if you're a developer who needs focused email automation without CRM bloat. It's built specifically for integrating email into your product.",
  },
  {
    question: 'What is the pricing difference between Plunk and Bento?',
    answer:
      'Bento offers a 30-day unlimited trial, then switches to subscription pricing. Plunk uses pay-as-you-go pricing with no trials needed. You only pay for emails sent. For email-focused needs, Plunk is typically more cost-effective. Bento includes CRM and live chat in the price, so if you need those features, Bento may offer better value.',
  },
  {
    question: 'Can Plunk handle email automation like Bento?',
    answer:
      'Yes. Plunk supports workflow automation, event-based triggers, transactional emails, and marketing campaigns. All the email features Bento offers. The difference is Plunk focuses purely on email, while Bento includes CRM, live chat, and customer relationship management. If you only need email automation, Plunk is simpler.',
  },
  {
    question: 'How does the developer experience compare?',
    answer:
      'Plunk is API-first, designed specifically for developers who want to integrate email into their applications. Bento is integration-focused, designed for small businesses using tools like Shopify and WordPress. Plunk gives developers more control and flexibility, while Bento offers pre-built integrations and a UI-first approach.',
  },
  {
    question: 'Is migration from Bento to Plunk easy?',
    answer:
      "For email features, yes. Export your contacts from Bento, import them to Plunk, recreate your workflows using our API or dashboard, and integrate Plunk into your application. If you rely heavily on Bento's CRM, live chat, or multi-channel features, you'll need separate tools for those. Most email-only migrations take a few hours.",
  },
];

export default function BentoComparison() {
  return (
    <>
      <NextSeo
        title="Bento Alternative: Developer-First Email Platform | Plunk"
        description="Open-source alternative to Bento. API-first email platform without CRM bloat. Self-hostable, pay-as-you-go pricing, built for developers."
        canonical="https://www.useplunk.com/vs/bento"
        openGraph={{
          title: 'Bento Alternative: Developer-First Email Platform | Plunk',
          description:
            'Open-source alternative to Bento. API-first email platform without CRM bloat. Self-hostable, pay-as-you-go pricing.',
          url: 'https://www.useplunk.com/vs/bento',
          images: [{url: 'https://www.useplunk.com/api/og?title=Bento+Alternative%3A+Developer-First+Email+Platform&tag=Comparison', alt: 'Plunk vs Bento', width: 1200, height: 630}],
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
                for Bento
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>Bento is an all-in-one platform. Plunk is focused on email. Get powerful email automation without CRM, live chat, or multi-channel complexity. Developer-first, API-driven, transparent pricing.</p>
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
                Focused Email vs All-in-One Complexity
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Pay for what you use, not what you don't need</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Pay per email sent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Pay-as-you-go for email only. No CRM or chat features you don't need. Simple, transparent pricing.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Only pay for emails sent</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />No monthly commitments</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Focus on email, nothing more</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>Bento</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Trial then subscription</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>30-day unlimited trial, then subscription pricing. Includes CRM, chat, and multi-channel features.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>30-day trial</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Trial ends, then monthly subscription</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Includes features beyond email</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />All-in-one platform approach</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>Developer-First Email Platform</h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Everything you need for email, nothing you don't</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3'}>
              {[
                {icon: <Code2 className="h-5 w-5" />, title: 'API-First Design', body: 'Built for developers who integrate email into their applications. Clean REST API, comprehensive docs, webhook support.'},
                {icon: <PackageOpen className="h-5 w-5" />, title: 'Open Source', body: 'AGPL-3.0 licensed. Full code transparency, contribute features, understand the system. Bento is proprietary closed-source.'},
                {icon: <DollarSign className="h-5 w-5" />, title: 'Pay-as-you-go', body: 'Only pay for emails sent. No subscriptions, no trials that expire, no forced plan upgrades. Predictable costs based on usage.'},
                {icon: <Zap className="h-5 w-5" />, title: 'Simple Setup', body: 'Start sending in 5 minutes. No CRM to configure, no multi-channel setup, no live chat integration. Just email, done right.'},
                {icon: <Globe className="h-5 w-5" />, title: 'Self-Hostable', body: 'Deploy on your infrastructure with Docker. Full data ownership, compliance control, no vendor lock-in. Bento is cloud-only.'},
              ].map((item, i) => (
                <motion.div key={item.title} initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                  <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}>{item.icon}</div>
                  <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>{item.title}</h3>
                  <p className={'mt-3 leading-relaxed text-neutral-600'}>{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature comparison table */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>Feature comparison</h2>
            </motion.div>
            <ComparisonTable competitorName="Bento" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-bento" />

        <SwitchOffer competitorName="Bento" />

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2 initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}} style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}>
                Focused email. No bloat.
              </motion.h2>
              <motion.div initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}} className={'flex max-w-md flex-col gap-6'}>
                <p className={'text-lead text-neutral-300'}>API-first email without CRM complexity. Open-source, self-hostable, pay-as-you-go. Start free.</p>
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

import {ComparisonTable, FAQSection, Footer, Navbar, SwitchOffer} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, Check, Code2, DollarSign, Globe, PackageOpen, Workflow, Zap} from 'lucide-react';
import type {ComparisonRow} from '../../components/ComparisonTable';
import type {FAQ} from '../../components/FAQSection';

const comparisonData: ComparisonRow[] = [
  {feature: 'Pricing Model', plunk: 'Pay-as-you-go', competitor: 'Expensive tiers'},
  {feature: 'Setup Complexity', plunk: '5 minutes', competitor: 'Hours to days'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Transactional Emails', plunk: true, competitor: true},
  {feature: 'Marketing Campaigns', plunk: true, competitor: true},
  {feature: 'Workflow Automation', plunk: true, competitor: true},
  {feature: 'CRM Included', plunk: false, competitor: true},
  {feature: 'Sales Automation', plunk: false, competitor: true},
  {feature: 'Machine Learning', plunk: false, competitor: true},
];

const faqs: FAQ[] = [
  {
    question: 'When should I choose ActiveCampaign over Plunk?',
    answer:
      'Choose ActiveCampaign if you need a full CRM with sales automation, lead scoring, and machine learning features. ActiveCampaign is designed for marketing and sales teams that need an all-in-one platform. Choose Plunk if you need powerful email automation without the complexity. It is built for developers who want to integrate email into their product without CRM overhead.',
  },
  {
    question: 'What is the price difference between Plunk and ActiveCampaign?',
    answer:
      'ActiveCampaign starts at $29/month for basic features and quickly scales to $149/month or more for automation features. Plunk uses pay-as-you-go pricing. You only pay for emails sent. For email-focused needs, Plunk typically costs 50-80% less than ActiveCampaign while providing the same email automation capabilities.',
  },
  {
    question: "Can Plunk match ActiveCampaign's automation capabilities?",
    answer:
      'For email automation, yes. Plunk supports workflow automation, event-based triggers, and audience segmentation just like ActiveCampaign. The difference is Plunk focuses purely on email, while ActiveCampaign includes CRM, sales automation, and ML-powered recommendations. If you need email automation without sales/CRM features, Plunk delivers the same capability with simpler implementation.',
  },
  {
    question: 'Is migration from ActiveCampaign to Plunk difficult?',
    answer:
      "It depends on your ActiveCampaign usage. If you're primarily using email automation and campaigns, migration is straightforward: export contacts, recreate workflows, and integrate Plunk's API. If you heavily rely on CRM, lead scoring, or sales automation, you'll need separate tools for those features. Most developers migrate in a day or less.",
  },
  {
    question: 'What ActiveCampaign features does Plunk not have?',
    answer:
      "Plunk focuses on email, so it doesn't include ActiveCampaign's CRM, sales pipeline management, lead scoring, SMS marketing, or machine learning features. If you need those, ActiveCampaign is better. If you want powerful email automation without the enterprise complexity, Plunk is the simpler choice.",
  },
];

export default function ActiveCampaignComparison() {
  return (
    <>
      <NextSeo
        title="ActiveCampaign Alternative: Open-Source & Affordable | Plunk"
        description="Powerful email automation without ActiveCampaign's complexity and cost. Open-source, developer-friendly, pay-as-you-go pricing. No CRM bloat."
        canonical="https://www.useplunk.com/vs/activecampaign"
        openGraph={{
          title: 'ActiveCampaign Alternative: Open-Source & Affordable | Plunk',
          description:
            "Powerful email automation without ActiveCampaign's complexity and cost. Open-source, developer-friendly, pay-as-you-go pricing.",
          url: 'https://www.useplunk.com/vs/activecampaign',
          images: [{url: 'https://www.useplunk.com/api/og?title=ActiveCampaign+Alternative%3A+Open-Source+%26+Affordable&tag=Comparison', alt: 'Plunk vs ActiveCampaign', width: 1200, height: 630}],
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
                for ActiveCampaign
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>ActiveCampaign is powerful but expensive and complex. Plunk delivers essential email automation without CRM bloat, sales features, or enterprise pricing. Built for developers, not marketing departments.</p>
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
                Enterprise Features Without Enterprise Prices
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Email automation that doesn't break the bank</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Simple pay-as-you-go</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Only pay for emails sent. All features included, no tier gating, no forced upgrades.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />All automation features included</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />No monthly minimums or contracts</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Typical savings: 50-80% vs ActiveCampaign</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>ActiveCampaign</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Expensive subscription tiers</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Complex pricing with feature gating. Automation requires higher tiers.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>From $29/month</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Advanced automation: $149+/month</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Feature limits on lower tiers</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Includes CRM/sales features you may not need</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>Automation Without Complexity</h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Powerful email workflows without the enterprise overhead</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3'}>
              {[
                {icon: <Workflow className="h-5 w-5" />, title: 'Workflow Automation', body: 'Build automated email sequences with triggers, delays, and conditions. No CRM required. Pure email automation that integrates with your product.'},
                {icon: <Code2 className="h-5 w-5" />, title: 'Developer-First API', body: 'Integrate email into your application with a clean REST API. No complex marketing UI to navigate — just code and send.'},
                {icon: <DollarSign className="h-5 w-5" />, title: '50-80% Cost Savings', body: 'ActiveCampaign charges $149+/month for automation features. Plunk charges for emails sent only. The savings add up fast.'},
                {icon: <PackageOpen className="h-5 w-5" />, title: 'Open Source', body: 'AGPL-3.0 licensed. Inspect the code, understand the system, contribute features. No proprietary algorithms or black-box systems.'},
                {icon: <Globe className="h-5 w-5" />, title: 'Self-Hostable', body: 'Deploy on your own infrastructure with Docker. Full data ownership and compliance control. ActiveCampaign is cloud-only.'},
                {icon: <Zap className="h-5 w-5" />, title: 'Fast Setup', body: 'Start sending in 5 minutes. Simple authentication, clean API, comprehensive docs. No CRM to configure before you can send your first email.'},
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
            <ComparisonTable competitorName="ActiveCampaign" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-activecampaign" />

        <SwitchOffer competitorName="ActiveCampaign" />

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2 initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}} style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}>
                Email automation, not enterprise complexity.
              </motion.h2>
              <motion.div initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}} className={'flex max-w-md flex-col gap-6'}>
                <p className={'text-lead text-neutral-300'}>Save 50-80% on email automation. Open-source, self-hostable, pay-as-you-go. Start free.</p>
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

import {ComparisonTable, FAQSection, Footer, Navbar, SwitchOffer} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, Check, Code2, DollarSign, Globe, Package, PackageOpen, Zap} from 'lucide-react';
import type {ComparisonRow} from '../../components/ComparisonTable';
import type {FAQ} from '../../components/FAQSection';

const comparisonData: ComparisonRow[] = [
  {feature: 'Pricing Model', plunk: 'Pay-as-you-go', competitor: 'Contact-based tiers'},
  {feature: 'Typical Cost', plunk: 'Affordable', competitor: 'Very expensive'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Transactional Emails', plunk: true, competitor: true},
  {feature: 'Marketing Campaigns', plunk: true, competitor: true},
  {feature: 'Workflow Automation', plunk: true, competitor: true},
  {feature: 'E-commerce Integration', plunk: 'API-based', competitor: 'Native deep'},
  {feature: 'SMS Marketing', plunk: false, competitor: true},
  {feature: 'Predictive Analytics', plunk: false, competitor: true},
];

const faqs: FAQ[] = [
  {
    question: 'When should I choose Klaviyo over Plunk?',
    answer:
      'Choose Klaviyo if you need deep native e-commerce integrations (Shopify, WooCommerce), SMS marketing, and AI-powered predictive analytics. Klaviyo excels for established e-commerce brands with dedicated marketing teams and budget for enterprise features. Choose Plunk if you need powerful email automation for e-commerce (or any use case) without the premium price tag. It is built for developers and growing businesses who want the capabilities without the cost.',
  },
  {
    question: 'How much cheaper is Plunk compared to Klaviyo?',
    answer:
      'Klaviyo can be dramatically more expensive. With 10,000 contacts, Klaviyo costs $150-300+/month depending on email volume. Plunk uses pay-as-you-go pricing. You only pay for emails sent, not contacts stored. For most use cases, Plunk costs 60-90% less than Klaviyo while providing the same email automation capabilities. The savings increase as your contact list grows.',
  },
  {
    question: 'Can Plunk handle e-commerce emails?',
    answer:
      'Yes. Plunk supports all e-commerce email use cases: transactional emails (order confirmations, shipping notifications), marketing campaigns (product launches, sales), and automated workflows (abandoned cart, post-purchase sequences). You integrate via API instead of native Shopify plugins, which gives you more flexibility and control over your email logic.',
  },
  {
    question: 'Does Plunk integrate with Shopify like Klaviyo?',
    answer:
      'Plunk integrates with Shopify and other e-commerce platforms via API. While Klaviyo offers a native Shopify app with pre-built flows, Plunk gives you more control by letting you build exactly the integration you need. You can use webhooks, our API, or build custom integrations. This approach is more flexible but requires development work.',
  },
  {
    question: 'What Klaviyo features does Plunk not have?',
    answer:
      "Plunk focuses on email, so it doesn't include Klaviyo's SMS marketing, native e-commerce platform integrations, AI-powered product recommendations, or predictive analytics. If you need those enterprise features and have the budget, Klaviyo is better. If you want powerful email automation at a fraction of the cost, Plunk delivers.",
  },
];

export default function KlaviyoComparison() {
  return (
    <>
      <NextSeo
        title="Klaviyo Alternative: Affordable E-commerce Email | Plunk"
        description="E-commerce email automation without Klaviyo's price tag. Pay-as-you-go pricing, open-source, self-hostable. Perfect for developers building e-commerce."
        canonical="https://www.useplunk.com/vs/klaviyo"
        openGraph={{
          title: 'Klaviyo Alternative: Affordable E-commerce Email | Plunk',
          description:
            "E-commerce email automation without Klaviyo's price tag. Pay-as-you-go pricing, open-source, self-hostable.",
          url: 'https://www.useplunk.com/vs/klaviyo',
          images: [{url: 'https://www.useplunk.com/api/og?title=Klaviyo+Alternative%3A+Affordable+E-commerce+Email&tag=Comparison', alt: 'Plunk vs Klaviyo', width: 1200, height: 630}],
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
                for Klaviyo
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>Klaviyo is powerful for e-commerce but extremely expensive. Plunk delivers the same email automation, including full e-commerce support, at a fraction of the cost. No hidden fees, no contact-based pricing.</p>
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
                E-commerce Email Without the Premium Price
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Pay for emails sent, not contacts stored</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Pay per email sent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Pay-as-you-go pricing. Only pay for emails sent, not contacts stored. Predictable costs as you scale.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Unlimited contacts at no extra cost</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />No surprise charges as you grow</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Typical savings: 60-90% vs Klaviyo</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>Klaviyo</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Contact-based tiers</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Expensive pricing based on contact count. Costs escalate quickly as your list grows.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>From $20/month</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />10K contacts = $150-300+/month</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Price increases with contact list growth</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Hidden costs for additional features</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>E-commerce Email, Developer-Friendly</h2>
              <p className={'mt-4 text-lead text-neutral-600'}>All the automation power, at a fraction of the cost</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3'}>
              {[
                {icon: <DollarSign className="h-5 w-5" />, title: 'Affordable Pricing', body: 'Pay-as-you-go instead of expensive contact-based tiers. Save 60-90% compared to Klaviyo while getting the same email automation power.'},
                {icon: <Package className="h-5 w-5" />, title: 'E-commerce Ready', body: 'Handle order confirmations, shipping notifications, abandoned carts, and product campaigns. All e-commerce email use cases via flexible API.'},
                {icon: <Code2 className="h-5 w-5" />, title: 'Developer-Friendly', body: 'Modern API designed for developers. Integrate with Shopify, WooCommerce, or any e-commerce platform via webhooks and API calls.'},
                {icon: <PackageOpen className="h-5 w-5" />, title: 'Open Source', body: 'AGPL-3.0 licensed. Full transparency into how your emails work. No black-box algorithms or proprietary systems. Klaviyo is closed-source.'},
                {icon: <Globe className="h-5 w-5" />, title: 'Self-Hostable', body: 'Run on your infrastructure with Docker. Full data ownership, compliance control, cost optimization at scale. Klaviyo is cloud-only.'},
                {icon: <Zap className="h-5 w-5" />, title: 'Simple Integration', body: 'Connect your store via webhooks or API. No complex Shopify app to configure. Build exactly the integration you need with full control.'},
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
            <ComparisonTable competitorName="Klaviyo" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-klaviyo" />

        <SwitchOffer competitorName="Klaviyo" />

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2 initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}} style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}>
                E-commerce email at a fraction of the cost.
              </motion.h2>
              <motion.div initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}} className={'flex max-w-md flex-col gap-6'}>
                <p className={'text-lead text-neutral-300'}>Save 60-90% vs Klaviyo. Open-source, self-hostable, pay-as-you-go. No contact-based tiers. Start free.</p>
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

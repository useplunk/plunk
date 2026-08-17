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
  {feature: 'Free Tier', plunk: '1,000 emails/month', competitor: 'Up to 100 subscribers'},
  {feature: 'Pricing Model', plunk: 'Pay-as-you-go', competitor: 'Per-subscriber monthly plans'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Transactional Emails', plunk: true, competitor: false},
  {feature: 'Marketing Campaigns', plunk: true, competitor: true},
  {feature: 'Workflow Automation', plunk: true, competitor: false},
  {feature: 'Dynamic Segmentation', plunk: true, competitor: false},
  {feature: 'API Access', plunk: true, competitor: 'Limited'},
  {feature: 'Custom Domains', plunk: true, competitor: true},
];

const faqs: FAQ[] = [
  {
    question: 'When should I choose Buttondown over Plunk?',
    answer:
      "Choose Buttondown if you're an individual writer or creator who only needs newsletter publishing with a simple, minimal interface. Buttondown is purpose-built for newsletters with a great writing experience. Choose Plunk if you need transactional emails alongside your newsletters, workflow automation, dynamic segmentation, or an open-source platform you can self-host.",
  },
  {
    question: 'What is the pricing difference between Plunk and Buttondown?',
    answer:
      "Plunk is pay-as-you-go at $0.001/email — you pay per email sent regardless of list size. Buttondown charges per subscriber: free up to 100, then $9/month for up to 1,000 subscribers, scaling up from there. If you have a large list but send infrequently, Plunk's model is significantly more cost-effective.",
  },
  {
    question: 'Can Plunk replace Buttondown for newsletter publishing?',
    answer:
      "Yes. Plunk's marketing campaigns handle newsletter-style broadcasts to your entire list or segments. You get scheduling, tracking (opens, clicks), and unsubscribe management. The main difference is Plunk is built for developers first — if you want a polished writing-focused UI without any code, Buttondown's editor may feel more natural.",
  },
  {
    question: "What does Plunk offer that Buttondown doesn't?",
    answer:
      'Plunk adds transactional emails (password resets, receipts, notifications), workflow automation (multi-step sequences triggered by events), dynamic audience segmentation, and a full API for programmatic control. Plunk is also open-source (AGPL-3.0) and self-hostable. Buttondown is focused purely on newsletter publishing with no transactional email support.',
  },
];

export default function ButtondownComparison() {
  return (
    <>
      <NextSeo
        title="Open-Source Buttondown Alternative: Newsletters + Transactional Emails | Plunk"
        description="Buttondown is newsletters-only. Plunk is pay-as-you-go at $0.001/email — open-source, self-hostable, with transactional emails, marketing campaigns, and workflow automation in one platform."
        canonical="https://www.useplunk.com/vs/buttondown"
        openGraph={{
          title: 'Open-Source Buttondown Alternative: Newsletters + Transactional Emails | Plunk',
          description:
            'Buttondown is newsletters-only. Plunk is open-source, pay-as-you-go, and handles transactional emails, newsletters, and automation in one self-hostable platform.',
          url: 'https://www.useplunk.com/vs/buttondown',
          images: [{url: 'https://www.useplunk.com/api/og?title=Open-Source+Buttondown+Alternative&tag=Comparison', alt: 'Plunk vs Buttondown', width: 1200, height: 630}],
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
                for Buttondown
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>Buttondown is newsletter-only. Plunk handles newsletters, transactional emails, and workflow automation in one open-source platform — at $0.001 per email, not per subscriber.</p>
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
                Pay Per Email, Not Per Subscriber
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Your costs should scale with what you send, not the size of your list</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Pay per email sent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>$0.001 per email. A list of 10,000 subscribers costs nothing until you actually send.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Only pay when you actually send emails</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>No charge for subscriber count</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Transactional, marketing, and automation included</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>Buttondown</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Per-subscriber monthly plans</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>$9/month for up to 1,000 subscribers, scaling as your list grows.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>Per subscriber</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Pay based on list size, not sending activity</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Cost grows as your audience grows</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Newsletters only — no transactional emails</li>
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
              <p className={'mt-4 text-lead text-neutral-600'}>Beyond newsletter publishing</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-3'}>
              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><BarChart3 className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Transactional Emails</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Send password resets, receipts, notifications, and alerts through the same platform as your newsletters. Buttondown can't do this at all.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Workflow className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Workflow Automation</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Build multi-step email sequences with triggers, delays, and conditions. Welcome sequences, drip campaigns, re-engagement — Buttondown offers none of this.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Users className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Dynamic Segmentation</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Create audience segments that update automatically based on contact data and behavior. Go beyond static lists to target the right people at the right time.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><PackageOpen className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Open Source</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>AGPL-3.0 licensed. Inspect the code, contribute features, no vendor lock-in. Buttondown is a proprietary closed-source service.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Globe className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Self-Hostable</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Deploy on your own infrastructure with Docker. Full data ownership, GDPR compliance without relying on third-party processors.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Layers className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Developer API</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Full REST API and SDKs for programmatic control. Trigger emails from your backend, track custom events, manage contacts — all without touching the dashboard.</p>
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
            <ComparisonTable competitorName="Buttondown" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-buttondown" />

        <SwitchOffer competitorName="Buttondown" />

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

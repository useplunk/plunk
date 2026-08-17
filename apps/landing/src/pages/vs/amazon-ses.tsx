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
  {feature: 'Free Tier', plunk: '1,000 emails/month', competitor: '62,000 emails/month (from EC2)'},
  {feature: 'Pricing Model', plunk: 'Pay-as-you-go', competitor: 'Pay-as-you-go (delivery only)'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: 'N/A (AWS-managed)'},
  {feature: 'Transactional Emails', plunk: true, competitor: true},
  {feature: 'Marketing Campaigns', plunk: true, competitor: false},
  {feature: 'Workflow Automation', plunk: true, competitor: false},
  {feature: 'Dynamic Segmentation', plunk: true, competitor: false},
  {feature: 'Contact Management', plunk: true, competitor: false},
  {feature: 'Dashboard & Analytics', plunk: true, competitor: false},
];

const faqs: FAQ[] = [
  {
    question: 'When should I use raw Amazon SES instead of Plunk?',
    answer:
      'Use raw SES if you have an existing email platform and only need a delivery layer, or if your engineering team wants full control over every part of the stack and has the capacity to build contact management, unsubscribe handling, bounce processing, and analytics themselves. Plunk is built on SES — when you self-host Plunk, you get the full platform at near-SES prices.',
  },
  {
    question: 'Is Plunk more expensive than Amazon SES?',
    answer:
      "SES charges $0.10 per 1,000 emails ($0.0001/email) for delivery alone. Plunk's managed service is $0.001/email — 10x more, but that includes contact management, campaigns, automation, segmentation, bounce/complaint handling, an admin dashboard, and unsubscribe management. If you self-host Plunk on your own infrastructure, you pay SES rates directly plus your hosting costs.",
  },
  {
    question: 'Does Plunk use Amazon SES under the hood?',
    answer:
      'Yes. Plunk uses AWS SES for email delivery. That means you get the same deliverability infrastructure as SES, plus the full platform layer on top. When you self-host Plunk, your SES account handles delivery directly — giving you SES pricing with Plunk functionality.',
  },
  {
    question: 'How hard is it to migrate from SES to Plunk?',
    answer:
      "If you're currently sending through SES directly, migrating to Plunk means switching your sending code to use Plunk's API instead of the SES SDK. Your existing SES domain verification and DKIM configuration can carry over. The benefit: you immediately gain contact management, bounce handling, unsubscribe lists, campaign tools, and a dashboard — without building any of that yourself.",
  },
];

export default function AmazonSesComparison() {
  return (
    <>
      <NextSeo
        title="Plunk vs Amazon SES: Full Email Platform vs Raw Delivery | Plunk"
        description="Amazon SES only handles delivery — no contacts, no campaigns, no dashboard. Plunk is the full email platform built on SES infrastructure. Open-source, self-hostable, with marketing and automation included."
        canonical="https://www.useplunk.com/vs/amazon-ses"
        openGraph={{
          title: 'Plunk vs Amazon SES: Full Email Platform vs Raw Delivery | Plunk',
          description:
            'SES is raw email delivery. Plunk is the full platform built on SES — contact management, campaigns, automation, and analytics. Open-source and self-hostable.',
          url: 'https://www.useplunk.com/vs/amazon-ses',
          images: [{url: 'https://www.useplunk.com/api/og?title=Plunk+vs+Amazon+SES&tag=Comparison', alt: 'Plunk vs Amazon SES', width: 1200, height: 630}],
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
                The full platform,
                <br />
                not just delivery.
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>Amazon SES is raw email infrastructure — no contacts, no campaigns, no dashboard. Plunk is the complete email platform built on top of SES. Open-source, self-hostable, and available managed at $0.001 per email.</p>
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
                The Real Cost Comparison
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>SES is cheap per email — but you still have to build everything else yourself</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Complete platform, managed</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Everything included. Or self-host and pay SES rates directly.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>$0.001 / email</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Contact management, campaigns, automation</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Bounce & complaint handling built in</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><div className={'h-4 w-4 flex-shrink-0 text-neutral-400'}>✓</div>Self-host for near-SES pricing</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>Amazon SES</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Delivery infrastructure only</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Cheap delivery — but everything else is your problem to build.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>$0.0001 / email</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />No contacts, no campaigns, no dashboard</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />You must handle bounces and complaints yourself</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Significant engineering cost to build the rest</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>What Plunk Provides</h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Everything SES doesn't — ready to use, not to build</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-3'}>
              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Users className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Contact Management</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Store and manage your subscribers. Track events, manage unsubscribes, and build dynamic segments. SES has no concept of contacts.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><BarChart3 className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Marketing Campaigns</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Send one-time broadcasts, schedule campaigns, track opens and clicks. SES delivers bytes — Plunk runs your entire email program.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Workflow className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Workflow Automation</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Multi-step sequences triggered by events. Onboarding flows, drip campaigns, re-engagement. None of this exists in SES — you'd build it yourself.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><PackageOpen className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Open Source</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>AGPL-3.0 licensed. Inspect the code, contribute, and self-host. You get all the benefits of SES deliverability with full control over the platform layer.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Globe className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Self-Hostable</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Run Plunk on your own infrastructure. Your SES account handles delivery — you get full-platform functionality at SES prices, nothing more.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Layers className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Bounce & Complaint Handling</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Automatic processing of SES bounce and complaint notifications. Plunk keeps your sender reputation clean without any code on your end.</p>
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
            <ComparisonTable competitorName="Amazon SES" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-amazon-ses" />

        <SwitchOffer competitorName="Amazon SES" />

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

import {ComparisonTable, FAQSection, Footer, Navbar, SwitchOffer} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, Check, Code2, DollarSign, Mail, PackageOpen, Zap} from 'lucide-react';
import type {ComparisonRow} from '../../components/ComparisonTable';
import type {FAQ} from '../../components/FAQSection';

const comparisonData: ComparisonRow[] = [
  {feature: 'Pricing Model', plunk: 'Pay per email', competitor: 'Pay per contact'},
  {feature: 'Target Audience', plunk: 'Developers', competitor: 'Marketers'},
  {feature: 'API Quality', plunk: 'Modern REST', competitor: 'Legacy/complex'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Transactional Emails', plunk: 'Built-in', competitor: 'Mandrill (separate)'},
  {feature: 'Marketing Campaigns', plunk: true, competitor: true},
  {feature: 'Event-Based Triggers', plunk: true, competitor: 'Limited'},
  {feature: 'Developer Experience', plunk: 'Excellent', competitor: 'Marketing-first'},
  {feature: 'Setup Time', plunk: '5 minutes', competitor: '1-2 hours'},
];

const faqs: FAQ[] = [
  {
    question: 'When should I choose Mailchimp over Plunk?',
    answer:
      "Choose Mailchimp if you're a marketer who needs a drag-and-drop email builder and prefers a marketing-first interface. Mailchimp excels at visual design and non-technical users. Choose Plunk if you're a developer who values API-first design, wants transactional + marketing in one platform, and prefers code over drag-and-drop.",
  },
  {
    question: 'What is the difference between Plunk and Mailchimp pricing?',
    answer:
      'Mailchimp charges per contact stored, regardless of how many emails you send. Plunk uses a pay-as-you-go model where you only pay for emails sent. This means with Mailchimp, your cost increases as your contact list grows, while with Plunk, you only pay when you actually send emails.',
  },
  {
    question: 'Can Plunk handle both transactional and marketing emails?',
    answer:
      "Yes, that's one of Plunk's key advantages. Transactional emails (receipts, password resets) and marketing emails (newsletters, campaigns) are built into one platform. With Mailchimp, you need their separate Mandrill service for transactional emails, which adds complexity.",
  },
  {
    question: "Is Plunk's API easier to use than Mailchimp's?",
    answer:
      'Yes, significantly. Plunk has a modern RESTful API designed for developers. Mailchimp\'s API is complex and marketing-focused, requiring you to understand concepts like "audiences," "campaigns," and "merge fields." Most developers find Plunk\'s API 10x easier to integrate.',
  },
  {
    question: 'Does Plunk have a visual email builder like Mailchimp?',
    answer:
      'Plunk has a minimal email editor, most of our users manage their own templates using their own HTML. This gives developers full control and enables version control, testing, and reusability. If you need a drag-and-drop builder, Mailchimp is better. If you prefer code and want beautiful, responsive emails, Plunk is the better choice.',
  },
];

/**
 * Plunk vs Mailchimp comparison page
 */
export default function MailchimpComparison() {
  return (
    <>
      <NextSeo
        title="Mailchimp Alternative for Developers | Plunk"
        description="Plunk is Mailchimp for developers: code-first email platform with modern API. Pay per email, not per contact. Transactional + marketing in one platform."
        canonical="https://www.useplunk.com/vs/mailchimp"
        openGraph={{
          title: 'Mailchimp Alternative for Developers | Plunk',
          description:
            'Plunk is Mailchimp for developers: code-first email platform with modern API. Pay per email, not per contact.',
          url: 'https://www.useplunk.com/vs/mailchimp',
          images: [{url: 'https://www.useplunk.com/api/og?title=Mailchimp+Alternative+for+Developers&tag=Comparison', alt: 'Plunk vs Mailchimp', width: 1200, height: 630}],
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
                for Mailchimp
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>Mailchimp is for marketers. Plunk is for developers who need full control, modern API, and transparent pay-as-you-go pricing. Same features, better DX.</p>
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
              <p className={'mt-4 text-lead text-neutral-600'}>Pay for what you use, not for what you store</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              {/* Plunk card - DARK */}
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Pay per email sent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Pay-as-you-go pricing. Only pay for emails you actually send, not for contacts stored.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Only pay for emails you actually send</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Unlimited contacts in your database</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />No penalties for growing your list</li>
                </ul>
              </motion.div>
              {/* Competitor card - LIGHT */}
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>Mailchimp</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Pay per contact stored</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Charged for every contact in your list, whether you email them or not.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>Fixed subscription</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Pay for contacts even if you don't email them</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Growing your list = automatic price increase</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Duplicate contacts count multiple times</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>Why Developers Choose Plunk</h2>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3'}>
              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><DollarSign className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Pay-as-you-go Pricing</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Only pay for emails you send, not for contacts you store. No monthly minimums or fixed subscription costs.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Code2 className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>API-First</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Modern REST API designed for developers. 10x easier to integrate than Mailchimp's marketing-focused API.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Zap className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>5-Minute Setup</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Start sending in minutes. No audiences to configure, no lists to manage. Just send emails.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><PackageOpen className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Open Source</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>AGPL-3.0 licensed. Inspect the code, self-host, no vendor lock-in. Mailchimp is proprietary.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><Mail className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>All-in-One</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Transactional and marketing emails in one platform. No need for separate Mandrill account.</p>
              </motion.div>

              <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1]}} className={'bg-white p-10'}>
                <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}><ArrowRight className="h-5 w-5" /></div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>Event-Driven</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Trigger workflows based on user actions. Advanced automation that Mailchimp can't match.</p>
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
            <ComparisonTable competitorName="Mailchimp" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-mailchimp" />

        <SwitchOffer competitorName="Mailchimp" />

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2 initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}} style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}>
                Ready for a better developer experience?
              </motion.h2>
              <motion.div initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}} className={'flex max-w-md flex-col gap-6'}>
                <p className={'text-lead text-neutral-300'}>Join developers who've switched from Mailchimp to Plunk for better DX and transparent pay-as-you-go pricing.</p>
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

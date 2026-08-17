import {ComparisonTable, FAQSection, Footer, Navbar, SwitchOffer} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, Check, Code2, DollarSign, Globe, PackageOpen, Users, Zap} from 'lucide-react';
import type {ComparisonRow} from '../../components/ComparisonTable';
import type {FAQ} from '../../components/FAQSection';

const comparisonData: ComparisonRow[] = [
  {feature: 'Pricing Model', plunk: 'Pay per email', competitor: 'Pay per subscriber'},
  {feature: 'Open Source', plunk: true, competitor: false},
  {feature: 'Self-Hostable', plunk: true, competitor: false},
  {feature: 'Free Tier', plunk: '1,000 emails/month', competitor: '1,000 subscribers'},
  {feature: 'Transactional Emails', plunk: true, competitor: true},
  {feature: 'Marketing Campaigns', plunk: true, competitor: true},
  {feature: 'Workflow Automation', plunk: true, competitor: true},
  {feature: 'Drag-and-Drop Builder', plunk: 'Basic', competitor: 'Advanced'},
  {feature: 'API Quality', plunk: 'Modern REST', competitor: 'Good REST'},
  {feature: 'Developer Experience', plunk: 'Excellent', competitor: 'Good'},
];

const faqs: FAQ[] = [
  {
    question: 'What is the main difference between Plunk and MailerLite?',
    answer:
      "The main difference is that Plunk is open-source and self-hostable, while MailerLite is proprietary SaaS. Plunk uses pay-per-email pricing versus MailerLite's pay-per-subscriber model. Both are developer-friendly, but Plunk is API-first with full code transparency, while MailerLite focuses more on visual email builders with good API support.",
  },
  {
    question: 'Is Plunk more expensive than MailerLite?',
    answer:
      'It depends on your usage pattern. MailerLite charges based on subscriber count (e.g., $10/month for 1,000 subscribers), while Plunk charges per email sent. If you have a large subscriber list but send infrequently, Plunk is typically cheaper. If you email your entire list frequently, costs are similar. The key difference is predictability: Plunk only charges for actual usage.',
  },
  {
    question: 'Can I self-host Plunk unlike MailerLite?',
    answer:
      'Yes. Plunk is open-source (AGPL-3.0) and can be self-hosted using Docker. This gives you full control over your data, infrastructure costs, and compliance requirements. MailerLite is cloud-only with no self-hosting option. Self-hosting is ideal for privacy-sensitive use cases or cost optimization at scale.',
  },
  {
    question: 'Does Plunk have a drag-and-drop builder like MailerLite?',
    answer:
      "Plunk has a basic email editor, but most users manage templates using HTML/code for full control, version control, and reusability. MailerLite excels at visual drag-and-drop building for non-technical users. If you're a developer who prefers code-based templates, Plunk is better. If you need rich visual builders for marketers, MailerLite is better.",
  },
  {
    question: "How does Plunk's API compare to MailerLite?",
    answer:
      "Both have modern REST APIs, but Plunk's API is designed with developers as the primary user. Plunk prioritizes API-first workflows, making it easier to integrate email into your application. MailerLite has a good API but is built UI-first with API as secondary. For programmatic email sending and automation, Plunk offers a superior developer experience.",
  },
];

export default function MailerliteComparison() {
  return (
    <>
      <NextSeo
        title="MailerLite Alternative: Open-Source & Self-Hostable | Plunk"
        description="The truly developer-first MailerLite alternative. Open-source, self-hostable, pay per email not per subscriber. Modern API, full transparency."
        canonical="https://www.useplunk.com/vs/mailerlite"
        openGraph={{
          title: 'MailerLite Alternative: Open-Source & Self-Hostable | Plunk',
          description:
            'The truly developer-first MailerLite alternative. Open-source, self-hostable, pay per email not per subscriber.',
          url: 'https://www.useplunk.com/vs/mailerlite',
          images: [{url: 'https://www.useplunk.com/api/og?title=MailerLite+Alternative%3A+Open-Source+%26+Self-Hostable&tag=Comparison', alt: 'Plunk vs MailerLite', width: 1200, height: 630}],
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
                for MailerLite
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>MailerLite is developer-friendly. Plunk is developer-FIRST. Open-source, self-hostable, with API-first design and pay-as-you-go pricing instead of subscriber tiers.</p>
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
                Open Source Meets Developer Experience
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Pay for emails sent, not subscribers stored</p>
            </motion.div>
            <div className={'grid gap-4 lg:grid-cols-2'}>
              <motion.div initial={{opacity: 0, x: -20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-400'}>Plunk</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-white'}>Pay per email sent</h3>
                <p className={'mt-3 leading-relaxed text-neutral-300'}>Pay-as-you-go pricing. Open-source and self-hostable for full control.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-white'}>Pay-as-you-go</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Unlimited contacts, no subscriber fees</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Self-host or use our cloud</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-300'}><Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />Full code transparency (AGPL-3.0)</li>
                </ul>
              </motion.div>
              <motion.div initial={{opacity: 0, x: 20}} whileInView={{opacity: 1, x: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'rounded-card border border-neutral-200 bg-white p-10'}>
                <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>MailerLite</div>
                <h3 style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-2xl font-bold tracking-[-0.025em] text-neutral-900'}>Pay per subscriber count</h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>Monthly subscription based on total subscribers. Proprietary cloud-only platform.</p>
                <div style={{fontFamily: 'var(--font-display)'}} className={'mt-6 text-4xl font-extrabold tracking-[-0.03em] text-neutral-900'}>From $10/month</div>
                <ul className={'mt-8 space-y-3'}>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Pricing based on subscriber count</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Cloud-only, no self-hosting</li>
                  <li className={'flex items-center gap-3 text-ui text-neutral-600'}><div className={'h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-400'} />Proprietary closed-source code</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:py-20 sm:px-10'}>
            <motion.div initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}} className={'mb-10'}>
              <h2 style={{fontFamily: 'var(--font-display)'}} className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}>The Truly Developer-First Alternative</h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Full control, transparent code, pay only for what you send</p>
            </motion.div>
            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3'}>
              {[
                {icon: <PackageOpen className="h-5 w-5" />, title: 'Open Source', body: 'AGPL-3.0 licensed. Inspect the code, contribute features, understand exactly how your platform works. MailerLite is proprietary.'},
                {icon: <Code2 className="h-5 w-5" />, title: 'API-First Design', body: 'Built for developers from day one. Modern REST API with comprehensive documentation. Integrate email into your product seamlessly.'},
                {icon: <DollarSign className="h-5 w-5" />, title: 'Pay per Email', body: 'Only pay for emails sent, not subscribers stored. Grow your contact list without worrying about tier upgrades or price increases.'},
                {icon: <Globe className="h-5 w-5" />, title: 'Self-Hostable', body: 'Deploy on your infrastructure with Docker. Full data ownership, compliance control, no vendor lock-in. MailerLite is cloud-only.'},
                {icon: <Zap className="h-5 w-5" />, title: 'Fast Setup', body: 'Start sending in 5 minutes. Simple authentication, clean API endpoints, comprehensive docs. No visual builder learning curve.'},
                {icon: <Users className="h-5 w-5" />, title: 'Unlimited Contacts', body: 'Store unlimited contacts without additional cost. Your database grows freely, pricing stays predictable based on emails sent.'},
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
            <ComparisonTable competitorName="MailerLite" rows={comparisonData} />
          </div>
        </section>

        {/* FAQ */}
        <FAQSection faqs={faqs} schemaId="faq-schema-mailerlite" />

        <SwitchOffer competitorName="MailerLite" />

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2 initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}} style={{fontFamily: 'var(--font-display)'}} className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}>
                Experience true developer-first email.
              </motion.h2>
              <motion.div initial={{opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}} className={'flex max-w-md flex-col gap-6'}>
                <p className={'text-lead text-neutral-300'}>Open-source transparency and API-first design. Unlimited contacts. Pay only for emails sent. Start free.</p>
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

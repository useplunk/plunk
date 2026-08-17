import {Footer, Navbar} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React from 'react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {ArrowRight, Code, DollarSign, Mail} from 'lucide-react';

const competitors = [
  {
    name: 'Postmark',
    slug: 'postmark',
    description: 'Transactional email reliability with marketing power',
    features: ['Transactional Emails', 'Marketing Campaigns', 'Workflow Automation'],
  },
  {
    name: 'SendGrid',
    slug: 'sendgrid',
    description: "Enterprise email platform vs Plunk's simplicity",
    features: ['Transactional Emails', 'Marketing Campaigns', 'API-First Design'],
  },
  {
    name: 'Mailgun',
    slug: 'mailgun',
    description: 'Developer-focused email vs open-source alternative',
    features: ['Transactional Emails', 'Marketing Campaigns', 'SMTP Support'],
  },
  {
    name: 'Mailchimp',
    slug: 'mailchimp',
    description: 'All-in-one marketing vs specialized email platform',
    features: ['Marketing Campaigns', 'Transactional Emails', 'CRM Integration'],
  },
  {
    name: 'Resend',
    slug: 'resend',
    description: 'Modern transactional email vs comprehensive solution',
    features: ['Transactional Emails', 'Developer Experience', 'Marketing Ready'],
  },
  {
    name: 'Customer.io',
    slug: 'customerio',
    description: 'Behavioral email vs workflow automation',
    features: ['Behavioral Emails', 'Transactional Emails', 'Automation'],
  },
  {
    name: 'Loops',
    slug: 'loops',
    description: 'Simple newsletter tool vs full email platform',
    features: ['Newsletters', 'Transactional Emails', 'Simple Setup'],
  },
  {
    name: 'Brevo',
    slug: 'brevo',
    description: 'European email platform vs global open-source',
    features: ['Transactional Emails', 'Marketing Campaigns', 'GDPR Compliant'],
  },
  {
    name: 'ConvertKit',
    slug: 'convertkit',
    description: 'Creator platform vs developer-first email',
    features: ['Marketing Campaigns', 'Workflow Automation', 'API-First Design'],
  },
  {
    name: 'ActiveCampaign',
    slug: 'activecampaign',
    description: 'Enterprise automation vs simple workflows',
    features: ['Marketing Campaigns', 'Workflow Automation', 'Transactional Emails'],
  },
  {
    name: 'MailerLite',
    slug: 'mailerlite',
    description: 'Developer-friendly vs developer-first platform',
    features: ['Marketing Campaigns', 'Transactional Emails', 'Open Source'],
  },
  {
    name: 'Klaviyo',
    slug: 'klaviyo',
    description: 'E-commerce leader vs affordable alternative',
    features: ['E-commerce Integration', 'Workflow Automation', 'Pay-as-you-go'],
  },
  {
    name: 'Bento',
    slug: 'bento',
    description: 'All-in-one platform vs focused email solution',
    features: ['Transactional Emails', 'Marketing Campaigns', 'API-First'],
  },
  {
    name: 'Mailjet',
    slug: 'mailjet',
    description: 'Subscription-based email vs pay-as-you-go open source',
    features: ['Transactional Emails', 'Marketing Campaigns', 'Workflow Automation'],
  },
  {
    name: 'Buttondown',
    slug: 'buttondown',
    description: 'Newsletter publishing vs full email platform',
    features: ['Newsletters', 'Transactional Emails', 'Pay-as-you-go'],
  },
  {
    name: 'Amazon SES',
    slug: 'amazon-ses',
    description: 'Raw email delivery vs complete email platform',
    features: ['Transactional Emails', 'Marketing Campaigns', 'Self-Hostable'],
  },
];

export default function CompetitorsIndex() {
  return (
    <>
      <NextSeo
        title="Best Resend, Mailgun & SendGrid Alternatives | Open-Source Email | Plunk"
        description="Looking for a Resend, Mailgun, or SendGrid alternative? Plunk is open-source, self-hostable, and includes transactional emails, marketing campaigns, and workflow automation — at $0.001/email."
        canonical="https://www.useplunk.com/vs"
        openGraph={{
          title: 'Best Resend, Mailgun & SendGrid Alternatives | Open-Source Email | Plunk',
          description:
            'Open-source alternative to Resend, Mailgun, and SendGrid. Transactional + marketing emails in one self-hostable platform at $0.001/email.',
          url: 'https://www.useplunk.com/vs',
          images: [{url: 'https://www.useplunk.com/api/og?title=Best+Email+Platform+Alternatives&tag=Comparison', alt: 'Plunk vs Competitors', width: 1200, height: 630}],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>

        {/* Hero */}
        <section className={'relative overflow-hidden'}>
          <div
            aria-hidden
            className={'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'}
          />
          <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pt-28 sm:pb-28'}>
            <motion.div
              initial={{opacity: 0, y: 16}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
            >
              <h1
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'}
              >
                Plunk vs the
                <br />
                competition.
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>
                Most email platforms charge by the contact, lock you in, and split transactional from marketing. Plunk does all three in one open-source platform at $0.001 per email.
              </p>
              <div className={'mt-10 flex flex-wrap gap-3'}>
                <motion.a
                  whileHover={{scale: 1.015}}
                  whileTap={{scale: 0.985}}
                  href={`${DASHBOARD_URI}/auth/signup`}
                  className={'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(23,23,23,0.35)] transition hover:bg-neutral-800'}
                >
                  Get started free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link
                  href={WIKI_URI}
                  target={'_blank'}
                  className={'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'}
                >
                  View documentation
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Competitors grid */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-24'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-10'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}
              >
                All comparisons
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>See how Plunk stacks up against popular email platforms</p>
            </motion.div>

            <div className={'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}>
              {competitors.map((competitor, index) => (
                <motion.div
                  key={competitor.slug}
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: index * 0.04, ease: [0.22, 1, 0.36, 1]}}
                  className={'h-full'}
                >
                  <Link
                    href={`/vs/${competitor.slug}`}
                    className={'group flex h-full flex-col justify-between rounded-card border border-neutral-200 bg-white p-6 sm:p-8 transition hover:border-neutral-900'}
                  >
                    <div className={'flex items-start justify-between'}>
                      <h3
                        style={{fontFamily: 'var(--font-display)'}}
                        className={'text-h3 font-bold tracking-[-0.02em] text-neutral-900'}
                      >
                        {competitor.name}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900" />
                    </div>
                    <div>
                      <p className={'text-ui text-neutral-600'}>{competitor.description}</p>
                      <div className={'mt-4 flex flex-wrap items-center gap-x-2 gap-y-1'}>
                        {competitor.features.map((feature, i) => (
                          <React.Fragment key={feature}>
                            {i > 0 && <span className={'text-neutral-300'} aria-hidden>·</span>}
                            <span
                              style={{fontFamily: 'var(--font-mono)'}}
                              className={'text-label text-neutral-500'}
                            >
                              {feature}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Plunk */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-14 sm:px-10 sm:py-20'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-10'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}
              >
                Why Plunk wins
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>One platform for all your email needs</p>
            </motion.div>

            <div className={'grid gap-px bg-neutral-200 sm:grid-cols-3'}>
              {[
                {
                  icon: <Mail className="h-5 w-5" />,
                  title: 'Transactional + Marketing',
                  body: 'Send transactional emails with the same reliability as dedicated providers, plus marketing campaigns, automation, and segmentation. All in one platform.',
                },
                {
                  icon: <Code className="h-5 w-5" />,
                  title: 'Open Source & Self-Hostable',
                  body: 'AGPL-3.0 licensed code you can inspect, modify, and self-host. Full control over your data and infrastructure. No vendor lock-in.',
                },
                {
                  icon: <DollarSign className="h-5 w-5" />,
                  title: 'Simple Pricing',
                  body: 'Pay-as-you-go with all features included. No separate charges for transactional vs marketing emails. No tiers, no commitments.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{opacity: 0, y: 20}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1]}}
                  className={'bg-white p-10'}
                >
                  <div className={'flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white'}>
                    {item.icon}
                  </div>
                  <h3
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'mt-6 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}
                  >
                    {item.title}
                  </h3>
                  <p className={'mt-3 leading-relaxed text-neutral-600'}>{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}
              >
                Ready to try Plunk?
              </motion.h2>
              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                className={'flex max-w-md flex-col gap-6'}
              >
                <p className={'text-lead text-neutral-300'}>
                  Start free. No credit card required.
                </p>
                <div className={'flex flex-wrap gap-3'}>
                  <motion.a
                    whileHover={{scale: 1.015}}
                    whileTap={{scale: 0.985}}
                    href={`${DASHBOARD_URI}/auth/signup`}
                    className={'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'}
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </motion.a>
                  <Link
                    href={'/pricing'}
                    className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}
                  >
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

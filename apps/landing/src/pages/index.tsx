import {AgentExchange, Artifact, Footer, Label, Navbar, SectionHeader} from '../components';
import type {Exchange} from '../components';
import {motion} from 'framer-motion';
import {Funnel_Display, Funnel_Sans, JetBrains_Mono} from 'next/font/google';
import {DASHBOARD_URI, LANDING_URI, WIKI_URI} from '../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';
import Artur from '../../public/assets/artur.png';
import Joe from '../../public/assets/joe.png';
import Noah from '../../public/assets/noah.png';
import Pierre from '../../public/assets/pierre.png';
import Jonni from '../../public/assets/jonni.png';
import Alisson from '../../public/assets/alisson.png';
import Image from 'next/image';
import Script from 'next/script';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Globe,
  Inbox,
  Mail,
  Megaphone,
  PackageOpen,
  Send,
  Shield,
  User,
  Users,
  Workflow,
} from 'lucide-react';

const display = Funnel_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const body = Funnel_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

const testimonials = [
  {
    testimonial: 'Transparent and intuitive UI, extremely easy setup & automation and great support.',
    author: 'Artur Czemiel',
    image: Artur,
    role: 'Founder at GraphQL Editor',
    featured: true,
  },
  {
    testimonial: 'Lots of care put into Plunk',
    author: 'Jonni Lundy',
    image: Jonni,
    role: 'Founding Operations Manager at Resend',
  },
  {
    testimonial: "I've been using Plunk for building & sending out marketing emails and genuinely love it!",
    author: 'Joe Ashwell',
    image: Joe,
    role: 'Founder at UnwindHR',
  },
  {
    testimonial: 'I loved the ease of use, beautiful UI and great UX. Everything simply works.',
    author: 'Alisson Leal',
    image: Alisson,
    role: 'Founder at Brapi',
  },
  {
    testimonial: 'Simple to use, efficient and no regrets!',
    author: 'Noah Di Gesu',
    image: Noah,
    role: 'Founder at Smoothey',
  },
  {
    testimonial: 'Clean design, easy to understand, fair pricing.',
    author: 'Pierre Jacquel',
    image: Pierre,
    role: 'Founder at Landingly',
  },
];

const features = [
  {
    icon: <Workflow className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Workflow Automation',
    description:
      'Visual builder for complex email sequences with triggers, delays, and conditional logic. No code required.',
    feature: true,
  },
  {
    icon: <Users className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Dynamic Segments',
    description: 'Real-time audience segmentation based on contact data and behavior.',
  },
  {
    icon: <Mail className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Campaign Management',
    description: 'Broadcast emails with scheduling and performance tracking.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Analytics',
    description: 'Detailed metrics on opens, clicks, bounces, and conversions across campaigns.',
  },
  {
    icon: <Inbox className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Inbound Email',
    description: 'Receive and process incoming emails with webhook notifications.',
  },
  {
    icon: <Globe className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Custom Domains',
    description: 'Brand consistency with DKIM authentication and custom sending domains.',
  },
];

const competitors = [
  {name: 'Resend', slug: 'resend'},
  {name: 'SendGrid', slug: 'sendgrid'},
  {name: 'Mailchimp', slug: 'mailchimp'},
  {name: 'Customer.io', slug: 'customerio'},
  {name: 'Mailgun', slug: 'mailgun'},
];

const customers: {name: string; url: string; logo: string; imgClassName?: string; label?: string}[] = [
  {name: 'Krumzi', url: 'https://krumzi.com', logo: '/assets/krumzi.svg'},
  {name: 'Waidwissen', url: 'https://waidwissen.com', logo: '/assets/waidwissen.svg'},
  {name: 'Dodo Payments', url: 'https://dodopayments.com', logo: '/assets/dodo.svg'},
  {name: 'SnowSEO', url: 'https://snowseo.com', logo: '/assets/snowseo.svg', imgClassName: 'h-9'},
  {name: 'Viral', url: 'https://viral.app', logo: '/assets/viral.svg', imgClassName: 'h-9'},
];

const tickerItems = [
  'Open Source',
  'AGPL-3.0',
  'Self-Hostable',
  '$0.001 / email',
  'Unlimited Contacts',
  'GDPR Compliant',
  '5,000+ GitHub Stars',
  'EU Hosted',
];

/**
 * The homepage MCP demo. Tool names are the ones @plunk/mcp actually registers,
 * and the confirmation gate is real behaviour: a campaign send asks first and
 * reports how many people it would reach.
 */
const mcpExchange: Exchange = {
  prompt: 'Draft a win-back email for pro users who have gone quiet.',
  tools: ['plunk_list_segments', 'plunk_list_contacts', 'plunk_create_campaign'],
  result: {title: 'Win-back, August', recipients: 2431},
};

export default function Index() {
  return (
    <>
      <NextSeo
        title="Plunk — Open-Source Transactional Email Platform"
        description="Send transactional emails, run marketing campaigns, and automate workflows — all open-source and self-hostable. $0.001/email, no contact limits."
        openGraph={{
          title: 'Plunk — Open-Source Transactional Email Platform',
          description:
            'Send transactional emails, run marketing campaigns, and automate workflows — all open-source and self-hostable. $0.001/email, no contact limits.',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=The+Open-Source+Email+Platform',
              width: 1200,
              height: 630,
              alt: 'Plunk — The Open-Source Email Platform',
            },
          ],
        }}
      />
      <Script
        id={`faq-schema-index`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            'mainEntity': [
              {
                '@type': 'Question',
                'name': 'How is Plunk different from other email automation tools?',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text':
                    'Plunk is the email tool built for SaaS businesses, indie hackers and developers. Plunk allows you to create complex, automated email flows and to trigger them from anywhere through a single API call.',
                },
              },
              {
                '@type': 'Question',
                'name': 'Can I use Plunk for transactional emails?',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text':
                    'Yes, Plunk is a full-fledged email tool that allows you to send transactional emails as well as marketing emails. You can use Plunk to send emails to your customers when they sign up, when they cancel their subscription, when they upgrade their plan, etc.',
                },
              },
              {
                '@type': 'Question',
                'name': 'Can I use Plunk for sending newsletters?',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text':
                    'Yes, Plunk allows you to send newsletters and other broadcast emails to multiple contacts at once.',
                },
              },
              {
                '@type': 'Question',
                'name': 'What programming languages and frameworks does Plunk support?',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text':
                    'Plunk supports all programming languages and frameworks that are capable of sending API calls. You can use Plunk to send emails from your backend, frontend, mobile app, or any other platform.',
                },
              },
              {
                '@type': 'Question',
                'name': 'How much does Plunk cost?',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text':
                    'Plunk offers a free plan that includes 1000 emails per month. You can upgrade to a pay-as-you-go plan that costs $0.001 per email.',
                },
              },
            ],
          }),
        }}
      />
      <Script
        id={`corp-schema-index`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Corporation',
            'name': 'Plunk',
            'alternateName': 'UsePlunk',
            'url': LANDING_URI,
            'logo': `${LANDING_URI}/assets/logo.png`,
            'sameAs': ['https://www.twitter.com/useplunk', LANDING_URI],
          }),
        }}
      />
      <Script
        id={`software-schema-index`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'Plunk',
            'applicationCategory': 'Email Marketing Software',
            'operatingSystem': 'Web, Docker',
            'offers': {
              '@type': 'Offer',
              'price': '0',
              'priceCurrency': 'USD',
              'priceSpecification': {
                '@type': 'UnitPriceSpecification',
                'price': '0.001',
                'priceCurrency': 'USD',
                'unitText': 'email',
              },
            },
            'featureList':
              'Workflow Automation, Dynamic Segmentation, Campaign Management, Analytics, Developer API, Custom Domains, Self-Hosting, Open Source',
          }),
        }}
      />

      <Navbar />

      <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <main className={'text-neutral-800'}>
          {/* ========== HERO ========== */}
          <section className={'relative overflow-hidden'}>
            <div
              aria-hidden
              className={
                'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
              }
            />

            <div className={'mx-auto max-w-[88rem] px-6 pb-24 pt-20 sm:px-10 sm:pt-28 lg:pb-36'}>
              {/* Centered hero — single clear message, CTA directly below */}
              <motion.div
                initial={{opacity: 0, y: 16}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                className={'mx-auto max-w-5xl text-center'}
              >
                <h1
                  style={{fontFamily: 'var(--font-display)'}}
                  className={
                    'text-display font-extrabold leading-none tracking-[-0.04em] text-neutral-900'
                  }
                >
                  The open-source
                  <br />
                  email platform
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Transactional emails, marketing campaigns, and workflow automation — in one platform. Self-hostable,
                  $0.001 per email, no contact limits.
                </p>

                <div className={'mt-10 flex flex-wrap justify-center gap-3'}>
                  <motion.a
                    whileHover={{scale: 1.015}}
                    whileTap={{scale: 0.985}}
                    href={`${DASHBOARD_URI}/auth/signup`}
                    className={
                      'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(23,23,23,0.35)] transition hover:bg-neutral-800'
                    }
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </motion.a>
                  <Link
                    href={WIKI_URI}
                    target={'_blank'}
                    rel={'noopener noreferrer'}
                    className={
                      'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'
                    }
                  >
                    Read the docs
                  </Link>
                </div>
              </motion.div>

              {/* Stat strip */}
              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true, margin: '-10%'}}
                transition={{duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1]}}
                className={
                  'mt-20 grid grid-cols-2 gap-x-12 gap-y-10 border-t border-neutral-200 pt-10 sm:mt-28 sm:grid-cols-4 sm:gap-x-20'
                }
              >
                {[
                  {value: '$0.001', label: 'per email, flat'},
                  {value: '5,000+', label: 'stars on GitHub'},
                  {value: '∞', label: 'contacts, always free'},
                  {value: '< 5min', label: 'to first email sent'},
                ].map(stat => (
                  <div key={stat.label} className={'flex flex-col gap-2'}>
                    <div
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-4xl font-extrabold tracking-[-0.02em] text-neutral-900 sm:text-5xl'}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ========== CUSTOMER LOGO STRIP ========== */}
          <section aria-label="Customers">
            <div className={'mx-auto max-w-[88rem] px-6 pb-14 pt-8 sm:px-10 sm:pb-16 sm:pt-10'}>
              <motion.div
                initial={{opacity: 0, y: 8}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
                className={'flex flex-col items-center gap-4'}
              >
                <span
                  style={{fontFamily: 'var(--font-mono)'}}
                  className={'text-label text-neutral-500'}
                >
                  Built into products at
                </span>
                <div className={'flex flex-wrap items-center justify-center gap-10 sm:gap-14'}>
                  {customers.map(c => (
                    <a
                      key={c.name}
                      href={c.url}
                      target={'_blank'}
                      rel={'noopener noreferrer'}
                      className={'group flex flex-col items-center gap-1.5'}
                      aria-label={c.name}
                    >
                      <img
                        src={c.logo}
                        alt={c.name}
                        className={`${c.imgClassName ?? 'h-7'} w-auto max-w-none grayscale opacity-40 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100`}
                      />
                      {c.label && (
                        <span
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'text-label text-neutral-500 transition-colors duration-300 group-hover:text-neutral-600'}
                        >
                          {c.label}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* ========== MARQUEE TICKER ========== */}
          <section className={'overflow-hidden border-y border-neutral-900 bg-neutral-900 py-7'} aria-hidden>
            <div className={'flex'}>
              <div className={'marquee-track flex shrink-0 items-center gap-14 whitespace-nowrap pr-14'}>
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span
                    key={i}
                    style={{fontFamily: 'var(--font-display)'}}
                    className={
                      'flex items-center gap-14 text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl'
                    }
                  >
                    {item}
                    <span className={'text-neutral-600'}>✦</span>
                  </span>
                ))}
              </div>
              <div className={'marquee-track flex shrink-0 items-center gap-14 whitespace-nowrap pr-14'} aria-hidden>
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span
                    key={`b-${i}`}
                    style={{fontFamily: 'var(--font-display)'}}
                    className={
                      'flex items-center gap-14 text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl'
                    }
                  >
                    {item}
                    <span className={'text-neutral-600'}>✦</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ========== COMPETITORS — EDITORIAL LIST ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10 sm:py-28'}>
            <SectionHeader
              title={'Replace your email stack'}
              subtitle={'One tool in place of Resend, SendGrid, Mailchimp, Customer.io, and Mailgun.'}
            />

            <ul className={'mt-12 divide-y divide-neutral-200 border-y border-neutral-200'}>
              {competitors.map((c, i) => (
                <motion.li
                  key={c.slug}
                  initial={{opacity: 0, y: 12}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1]}}
                >
                  <Link
                    href={`/vs/${c.slug}`}
                    className={
                      'group flex items-center justify-between gap-6 py-5 transition-colors hover:bg-neutral-50 sm:py-7'
                    }
                  >
                    <div className={'flex items-center gap-6 sm:gap-10'}>
                      <span
                        style={{fontFamily: 'var(--font-display)'}}
                        className={
                          'text-3xl font-semibold tracking-[-0.025em] text-neutral-900 transition-transform duration-300 group-hover:translate-x-1 sm:text-4xl lg:text-5xl'
                        }
                      >
                        {c.name}
                      </span>
                    </div>
                    <div className={'flex items-center gap-5'}>
                      <Label className={'hidden transition group-hover:text-neutral-900 sm:inline'}>vs Plunk</Label>
                      <ArrowUpRight
                        className={'h-5 w-5 text-neutral-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-900 sm:h-6 sm:w-6'}
                        strokeWidth={1.75}
                      />
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>

          {/* ========== PROBLEM — THREE OVERSIZED STATEMENTS ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'Simple to start. Serious at scale.'}
                subtitle={'Easy enough for a side project. Ready for the business it becomes.'}
              />

              <div className={'mt-20 grid gap-10 sm:grid-cols-3 sm:gap-20 lg:gap-28'}>
                {[
                  {
                    tag: 'Setup',
                    big: '< 5 min',
                    title: 'Zero-configuration start',
                    body: 'Most email platforms take days to configure. Plunk is running in under five minutes — domain, DKIM and first send.',
                  },
                  {
                    tag: 'Pricing',
                    big: '0 limits',
                    title: 'Pay per email, never per contact',
                    body: 'Other platforms charge more as your list grows. Plunk stores unlimited contacts for free and bills only on send.',
                  },
                  {
                    tag: 'Ownership',
                    big: 'AGPL-3.0',
                    title: 'No lock-in, ever',
                    body: 'Closed-source platforms own your stack. Plunk is fully inspectable, forkable, and self-hostable on your own infra.',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.tag}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1]}}
                    className={'flex flex-col gap-6'}
                  >
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      / {item.tag}
                    </span>
                    <div
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-5xl font-extrabold tracking-[-0.035em] text-neutral-900 sm:text-6xl lg:text-7xl'}
                    >
                      {item.big}
                    </div>
                    <div className={'h-px w-full bg-neutral-300'} />
                    <h3 className={'text-xl font-semibold text-neutral-900'}>{item.title}</h3>
                    <p className={'text-base leading-relaxed text-neutral-600'}>{item.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ========== FEATURES — BENTO ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
            <SectionHeader
              title={'Everything you need.'}
              titleAccent={'Nothing you don\u2019t.'}
              subtitle={'Every Plunk install ships with the full platform — no upsell pages, no locked modules.'}
            />

            <div className={'mt-16 grid gap-5 sm:grid-cols-2 lg:auto-rows-[17rem] lg:grid-cols-3'}>
              {features.map((feature, index) => {
                const highlighted = feature.feature;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1]}}
                    className={
                      highlighted
                        ? 'flex min-h-80 flex-col justify-between overflow-hidden rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white sm:col-span-2 lg:row-span-2 lg:p-12'
                        : 'flex min-h-72 flex-col justify-between overflow-hidden rounded-card border border-neutral-200 bg-white p-8 transition hover:border-neutral-900'
                    }
                  >
                    <div className={highlighted ? 'text-white' : 'text-neutral-900'}>
                      {highlighted ? <Workflow className="h-10 w-10" strokeWidth={1.25} /> : feature.icon}
                    </div>
                    <div>
                      <h3
                        style={{fontFamily: 'var(--font-display)'}}
                        className={
                          highlighted
                            ? 'text-h2 font-extrabold tracking-[-0.035em] text-white'
                            : 'mt-10 text-h3 font-bold tracking-[-0.025em] text-neutral-900'
                        }
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={
                          highlighted
                            ? 'mt-5 max-w-[45ch] text-lead text-neutral-300'
                            : 'mt-3 text-neutral-600'
                        }
                      >
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* ========== UNIFIED CONTACTS ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'One contact,'}
                titleAccent={'complete history.'}
                subtitle={
                  'Every interaction flows into a single contact record. Transactional, campaign and workflow events — one source of truth.'
                }
              />

              <div className={'mx-auto mt-20 max-w-3xl'}>
                <div className={'grid gap-4 sm:grid-cols-2'}>
                  {[
                    {
                      icon: <Send className="h-5 w-5" strokeWidth={1.5} />,
                      title: 'Transactional',
                      sub: 'Receipts, resets',
                    },
                    {
                      icon: <Megaphone className="h-5 w-5" strokeWidth={1.5} />,
                      title: 'Campaigns',
                      sub: 'Newsletters, launches',
                    },
                    {
                      icon: <Workflow className="h-5 w-5" strokeWidth={1.5} />,
                      title: 'Workflows',
                      sub: 'Onboarding, drip sequences',
                    },
                    {
                      icon: <Inbox className="h-5 w-5" strokeWidth={1.5} />,
                      title: 'Inbound',
                      sub: 'Replies, support',
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{opacity: 0, y: 16}}
                      whileInView={{opacity: 1, y: 0}}
                      viewport={{once: true}}
                      transition={{duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1]}}
                      className={'flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5'}
                    >
                      <div
                        className={
                          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900'
                        }
                      >
                        {item.icon}
                      </div>
                      <div className={'min-w-0'}>
                        <h3
                          style={{fontFamily: 'var(--font-display)'}}
                          className={'text-base font-semibold tracking-[-0.01em] text-neutral-900'}
                        >
                          {item.title}
                        </h3>
                        <p className={'mt-0.5 text-xs text-neutral-600'}>{item.sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className={'relative my-10 hidden justify-center sm:flex'}>
                  <svg width="40" height="80" viewBox="0 0 40 80" aria-hidden>
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#a3a3a3" />
                      </marker>
                    </defs>
                    <motion.path
                      d="M 20 0 L 20 70"
                      stroke="#d4d4d4"
                      strokeWidth="1.5"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      initial={{pathLength: 0}}
                      whileInView={{pathLength: 1}}
                      viewport={{once: true}}
                      transition={{duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1]}}
                    />
                  </svg>
                </div>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1]}}
                  className={'mx-auto max-w-xl'}
                  data-nosnippet
                >
                  <div className={'overflow-hidden rounded-card border border-neutral-200 bg-white'}>
                    <div className={'flex items-center gap-5 p-6'}>
                      <div
                        className={
                          'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900'
                        }
                      >
                        <User className="h-7 w-7 text-white" strokeWidth={1.5} />
                      </div>
                      <div className={'flex-1 space-y-1'}>
                        <div
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'text-ui font-medium text-neutral-900'}
                        >
                          hello@useplunk.com
                        </div>
                        <div
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'text-label text-neutral-500'}
                        >
                          CONTACT · ACTIVE
                        </div>
                      </div>
                    </div>
                    <div className={'grid grid-cols-3 gap-px border-t border-neutral-200 bg-neutral-200'}>
                      {[
                        {big: '1,247', small: 'Emails received'},
                        {big: '89%', small: 'Open rate'},
                        {big: '12', small: 'Workflows'},
                      ].map(s => (
                        <div key={s.small} className={'bg-white px-4 py-4 text-center'}>
                          <div
                            style={{fontFamily: 'var(--font-display)'}}
                            className={'text-2xl font-bold tracking-[-0.02em] text-neutral-900'}
                          >
                            {s.big}
                          </div>
                          <div
                            style={{fontFamily: 'var(--font-mono)'}}
                            className={'mt-1 text-label text-neutral-500'}
                          >
                            {s.small}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ========== MCP SERVER ========== */}
          <section className={'border-y border-neutral-200'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'Your agent can'}
                titleAccent={'run your email.'}
                subtitle={
                  'The official Plunk MCP server connects Claude, Cursor and any Model Context Protocol client to your project — 15 tools for email, contacts, segments and campaigns.'
                }
              />

              <div className={'mt-16 grid items-start gap-12 lg:grid-cols-12'}>
                <div className={'min-w-0 lg:col-span-7'}>
                  <Artifact label={'Claude Code'}>
                    <AgentExchange exchange={mcpExchange} />
                  </Artifact>
                </div>

                <div className={'lg:col-span-5 lg:pt-6'}>
                  <p className={'text-lead text-neutral-600'}>
                    Fifteen tools, covering the same ground as the dashboard: contacts, segments, templates, campaigns
                    and transactional sends.
                  </p>
                  <p className={'mt-5 text-neutral-600'}>
                    Anything that reaches a real inbox stops and asks you first, and read-only mode registers the six
                    read tools and nothing else, so an agent can look without being able to touch.
                  </p>

                  <Link
                    href={'/features/mcp'}
                    className={
                      'group mt-8 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-ui font-semibold text-neutral-900 transition hover:border-neutral-900'
                    }
                  >
                    Explore the MCP server
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ========== OPEN SOURCE ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
            <SectionHeader
              title={'Privacy first.'}
              titleAccent={'Code visible.'}
              subtitle={'AGPL-3.0 licensed, EU-hosted, GDPR compliant. Inspect the code, self-host, or use our cloud.'}
            />

            <div className={'mt-14 grid gap-5 sm:grid-cols-3'}>
              {[
                {
                  icon: <PackageOpen className="h-8 w-8" strokeWidth={1.25} />,
                  title: 'Open Source',
                  meta: 'AGPL-3.0',
                  note: '5,000+ stars on GitHub',
                },
                {
                  icon: <Shield className="h-8 w-8" strokeWidth={1.25} />,
                  title: 'Privacy First',
                  meta: 'EU hosted',
                  note: 'GDPR compliant',
                },
                {
                  icon: <Globe className="h-8 w-8" strokeWidth={1.25} />,
                  title: 'Self-Hostable',
                  meta: 'Deploy anywhere',
                  note: 'Docker Compose ready',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex flex-col gap-8 rounded-card border border-neutral-200 bg-white p-10'}
                >
                  <div className={'flex items-start justify-between'}>
                    <div className={'text-neutral-900'}>{item.icon}</div>
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      {item.meta}
                    </span>
                  </div>
                  <div>
                    <h3
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-2xl font-bold tracking-[-0.02em] text-neutral-900'}
                    >
                      {item.title}
                    </h3>
                    <p className={'mt-2 text-neutral-600'}>{item.note}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className={'mt-10 flex justify-center'}>
              <motion.a
                whileHover={{scale: 1.02}}
                whileTap={{scale: 0.98}}
                href={'https://github.com/useplunk/plunk'}
                target={'_blank'}
                rel={'noopener noreferrer'}
                className={
                  'group inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:border-neutral-900'
                }
              >
                View on GitHub
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </motion.a>
            </div>
          </section>

          {/* ========== PRICING — BIG MOMENT ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-40 sm:px-10 sm:py-56'}>
              <SectionHeader
                title={'Simple.'}
                titleAccent={'Transparent.'}
                subtitle={'Pay for what you send, nothing more. No tiers. No surprises at scale.'}
              />

              <motion.div
                initial={{opacity: 0, y: 24}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                className={'mt-24 text-center'}
              >
                <div className={'flex items-baseline justify-center gap-3 text-neutral-900'}>
                  <span
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'text-7xl font-extrabold tracking-[-0.035em] sm:text-8xl'}
                  >
                    $0.001
                  </span>
                  <span className={'text-xl text-neutral-500 sm:text-2xl'}>/email</span>
                </div>
                <div className={'mx-auto mt-16 max-w-4xl'}>
                  <p
                    style={{fontFamily: 'var(--font-mono)'}}
                    className={'mb-8 text-label text-neutral-500'}
                  >
                    For the same plan, others charge
                  </p>
                  <div className={'grid gap-8 sm:grid-cols-3'}>
                    <div className={'flex flex-col items-center gap-y-2'}>
                      <svg role="img" className="h-8 w-8" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <title>Mailchimp</title>
                        <path d="M11.267 0C6.791-.015-1.82 10.246 1.397 12.964l.79.669a3.88 3.88 0 0 0-.22 1.792c.084.84.518 1.644 1.22 2.266.666.59 1.542.964 2.392.964 1.406 3.24 4.62 5.228 8.386 5.34 4.04.12 7.433-1.776 8.854-5.182.093-.24.488-1.316.488-2.267 0-.956-.54-1.352-.885-1.352-.01-.037-.078-.286-.172-.586-.093-.3-.19-.51-.19-.51.375-.563.382-1.065.332-1.35-.053-.353-.2-.653-.496-.964-.296-.311-.902-.63-1.753-.868l-.446-.124c-.002-.019-.024-1.053-.043-1.497-.014-.32-.042-.822-.197-1.315-.186-.668-.508-1.253-.911-1.627 1.112-1.152 1.806-2.422 1.804-3.511-.003-2.095-2.576-2.729-5.746-1.416l-.672.285A678.22 678.22 0 0 0 12.7.504C12.304.159 11.817.002 11.267 0zm.073.873c.166 0 .322.019.465.058.297.084 1.28 1.224 1.28 1.224s-1.826 1.013-3.52 2.426c-2.28 1.757-4.005 4.311-5.037 7.082-.811.158-1.526.618-1.963 1.253-.261-.218-.748-.64-.834-.804-.698-1.326.761-3.902 1.781-5.357C5.834 3.44 9.37.867 11.34.873zm3.286 3.273c.04-.002.06.05.028.074-.143.11-.299.26-.413.414a.04.04 0 0 0 .031.064c.659.004 1.587.235 2.192.574.041.023.012.103-.034.092-.915-.21-2.414-.369-3.97.01-1.39.34-2.45.863-3.224 1.426-.04.028-.086-.023-.055-.06.896-1.035 1.999-1.935 2.987-2.44.034-.018.07.019.052.052-.079.143-.23.447-.278.678-.007.035.032.063.062.042.615-.42 1.684-.868 2.622-.926zm3.023 3.205l.056.001a.896.896 0 0 1 .456.146c.534.355.61 1.216.638 1.845.015.36.059 1.229.074 1.478.034.571.184.651.487.751.17.057.33.098.563.164.706.198 1.125.4 1.39.658.157.162.23.333.253.497.083.608-.472 1.36-1.942 2.041-1.607.746-3.557.935-4.904.785l-.471-.053c-1.078-.145-1.693 1.247-1.046 2.201.417.615 1.552 1.015 2.688 1.015 2.604 0 4.605-1.111 5.35-2.072a.987.987 0 0 0 .06-.085c.036-.055.006-.085-.04-.054-.608.416-3.31 2.069-6.2 1.571 0 0-.351-.057-.672-.182-.255-.1-.788-.344-.853-.891 2.333.72 3.801.039 3.801.039a.072.072 0 0 0 .042-.072.067.067 0 0 0-.074-.06s-1.911.283-3.718-.378c.197-.64.72-.408 1.51-.345a11.045 11.045 0 0 0 3.647-.394c.818-.234 1.892-.697 2.727-1.356.281.618.38 1.299.38 1.299s.219-.04.4.073c.173.106.299.326.213.895-.176 1.063-.628 1.926-1.387 2.72a5.714 5.714 0 0 1-1.666 1.244c-.34.18-.704.334-1.087.46-2.863.935-5.794-.093-6.739-2.3a3.545 3.545 0 0 1-.189-.522c-.403-1.455-.06-3.2 1.008-4.299.065-.07.132-.153.132-.256 0-.087-.055-.179-.102-.243-.374-.543-1.669-1.466-1.409-3.254.187-1.284 1.31-2.189 2.357-2.135.089.004.177.01.266.015.453.027.85.085 1.223.1.625.028 1.187-.063 1.853-.618.225-.187.405-.35.71-.401.028-.005.092-.028.215-.028zm.022 2.18a.42.42 0 0 0-.06.005c-.335.054-.347.468-.228 1.04.068.32.187.595.32.765.175-.02.343-.022.498 0 .089-.205.104-.557.024-.942-.112-.535-.261-.872-.554-.868zm-3.66 1.546a1.724 1.724 0 0 0-1.016.326c-.16.117-.311.28-.29.378.008.032.031.056.088.063.131.015.592-.217 1.122-.25.374-.023.684.094.923.2.239.104.386.173.443.113.037-.038.026-.11-.031-.204-.118-.192-.36-.387-.618-.497a1.601 1.601 0 0 0-.621-.129zm4.082.81c-.171-.003-.313.186-.317.42-.004.236.131.43.303.432.172.003.314-.185.318-.42.004-.236-.132-.429-.304-.432zm-3.58.172c-.05 0-.102.002-.155.008-.311.05-.483.152-.593.247-.094.082-.152.173-.152.237a.075.075 0 0 0 .075.076c.07 0 .228-.063.228-.063a1.98 1.98 0 0 1 1.001-.104c.157.018.23.027.265-.026.01-.016.022-.049-.01-.1-.063-.103-.311-.269-.66-.275zm2.26.4c-.127 0-.235.051-.283.148-.075.154.035.363.246.466.21.104.443.063.52-.09.075-.155-.035-.364-.246-.467a.542.542 0 0 0-.237-.058zm-11.635.024c.048 0 .098 0 .149.003.73.04 1.806.6 2.052 2.19.217 1.41-.128 2.843-1.449 3.069-.123.02-.248.029-.374.026-1.22-.033-2.539-1.132-2.67-2.435-.145-1.44.591-2.548 1.894-2.811.117-.024.252-.04.398-.042zm-.07.927a1.144 1.144 0 0 0-.847.364c-.38.418-.439.988-.366 1.19.027.073.07.094.1.098.064.008.16-.039.22-.2a1.2 1.2 0 0 0 .017-.052 1.58 1.58 0 0 1 .157-.37.689.689 0 0 1 .955-.199c.266.174.369.5.255.81-.058.161-.154.469-.133.721.043.511.357.717.64.738.274.01.466-.143.515-.256.029-.067.005-.107-.011-.125-.043-.053-.113-.037-.18-.021a.638.638 0 0 1-.16.022.347.347 0 0 1-.294-.148c-.078-.12-.073-.3.013-.504.011-.028.025-.058.04-.092.138-.308.368-.825.11-1.317-.195-.37-.513-.602-.894-.65a1.135 1.135 0 0 0-.138-.01z"></path>
                      </svg>
                      <span className={'font-semibold text-neutral-900'}>Mailchimp</span>
                      <span className={'text-neutral-500'}>$0.004 / email</span>
                    </div>
                    <div className={'flex flex-col items-center gap-y-2'}>
                      <svg role="img" viewBox="0 0 24 24" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
                        <title>Twilio SendGrid</title>
                        <path d="M12 0C5.381-.008.008 5.352 0 11.971V12c0 6.64 5.359 12 12 12 6.64 0 12-5.36 12-12 0-6.641-5.36-12-12-12zm0 20.801c-4.846.015-8.786-3.904-8.801-8.75V12c-.014-4.846 3.904-8.786 8.75-8.801H12c4.847-.014 8.786 3.904 8.801 8.75V12c.015 4.847-3.904 8.786-8.75 8.801H12zm5.44-11.76c0 1.359-1.12 2.479-2.481 2.479-1.366-.007-2.472-1.113-2.479-2.479 0-1.361 1.12-2.481 2.479-2.481 1.361 0 2.481 1.12 2.481 2.481zm0 5.919c0 1.36-1.12 2.48-2.481 2.48-1.367-.008-2.473-1.114-2.479-2.48 0-1.359 1.12-2.479 2.479-2.479 1.361-.001 2.481 1.12 2.481 2.479zm-5.919 0c0 1.36-1.12 2.48-2.479 2.48-1.368-.007-2.475-1.113-2.481-2.48 0-1.359 1.12-2.479 2.481-2.479 1.358-.001 2.479 1.12 2.479 2.479zm0-5.919c0 1.359-1.12 2.479-2.479 2.479-1.367-.007-2.475-1.112-2.481-2.479 0-1.361 1.12-2.481 2.481-2.481 1.358 0 2.479 1.12 2.479 2.481z"></path>
                      </svg>
                      <span className={'font-semibold text-neutral-900'}>SendGrid</span>
                      <span className={'text-neutral-500'}>$0.002 / email</span>
                    </div>
                    <div className={'flex flex-col items-center gap-y-2'}>
                      <svg role="img" viewBox="0 0 24 24" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
                        <title>Mailgun</title>
                        <path d="M11.837 0c6.602 0 11.984 5.381 11.984 11.994-.017 2.99-3.264 4.84-5.844 3.331a3.805 3.805 0 0 1-.06-.035l-.055-.033-.022.055c-2.554 4.63-9.162 4.758-11.894.232-2.732-4.527.46-10.313 5.746-10.416a6.868 6.868 0 0 1 7.002 6.866 1.265 1.265 0 0 0 2.52 0c0-5.18-4.197-9.38-9.377-9.387C4.611 2.594.081 10.41 3.683 16.673c3.238 5.632 11.08 6.351 15.289 1.402l1.997 1.686A11.95 11.95 0 0 1 11.837 24C2.6 23.72-2.87 13.543 1.992 5.684A12.006 12.006 0 0 1 11.837 0Zm0 7.745c-3.276-.163-5.5 3.281-4.003 6.2a4.26 4.26 0 0 0 4.014 2.31c3.276-.171 5.137-3.824 3.35-6.575a4.26 4.26 0 0 0-3.36-1.935Zm0 2.53c1.324 0 2.152 1.433 1.49 2.58a1.72 1.72 0 0 1-1.49.86 1.72 1.72 0 1 1 0-3.44Z"></path>
                      </svg>
                      <span className={'font-semibold text-neutral-900'}>Mailgun</span>
                      <span className={'text-neutral-500'}>$0.003 / email</span>
                    </div>
                  </div>
                  <p className={'mt-8 text-xs text-neutral-500'}>
                    Based on plans matching Plunk at 10,000 emails per month.
                  </p>
                </div>

                <div className={'mt-16 flex flex-wrap justify-center gap-3'}>
                  <Link
                    href={'/pricing'}
                    className={
                      'rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:border-neutral-900'
                    }
                  >
                    Pricing details
                  </Link>
                  <motion.a
                    whileHover={{scale: 1.015}}
                    whileTap={{scale: 0.985}}
                    href={`${DASHBOARD_URI}/auth/signup`}
                    className={
                      'inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-ui font-semibold text-white transition hover:bg-neutral-800'
                    }
                  >
                    Start for free
                    <ArrowRight className="h-4 w-4" />
                  </motion.a>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ========== TESTIMONIALS — BENTO ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
            <SectionHeader
              title={'Quiet praise,'}
              titleAccent={'from operators.'}
              subtitle={'No hyperbole. Just the people building products on Plunk.'}
            />

            <div className={'mt-16 grid gap-5 sm:grid-cols-2 lg:auto-rows-[17rem] lg:grid-cols-3'}>
              {testimonials.map((t, i) => {
                const highlighted = t.featured;
                return (
                  <motion.figure
                    key={t.author}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1]}}
                    className={
                      highlighted
                        ? 'flex min-h-80 flex-col justify-between rounded-card border border-neutral-900 bg-neutral-900 p-10 text-white sm:col-span-2 lg:row-span-2 lg:p-12'
                        : 'flex min-h-72 flex-col justify-between rounded-card border border-neutral-200 bg-white p-8'
                    }
                  >
                    <blockquote
                      style={highlighted ? {fontFamily: 'var(--font-display)'} : undefined}
                      className={
                        highlighted
                          ? 'text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl'
                          : 'text-neutral-700'
                      }
                    >
                      &ldquo;{t.testimonial}&rdquo;
                    </blockquote>
                    <figcaption className={`mt-6 flex items-center ${highlighted ? 'gap-4' : 'gap-3'}`}>
                      <div
                        className={`relative overflow-hidden rounded-full ${
                          highlighted ? 'h-12 w-12 border border-neutral-700' : 'h-10 w-10'
                        }`}
                      >
                        <Image src={t.image} alt={t.author} placeholder="blur" className={'object-cover'} />
                      </div>
                      <div>
                        <div
                          className={
                            highlighted
                              ? 'text-ui font-semibold text-white'
                              : 'text-xs font-semibold text-neutral-900'
                          }
                        >
                          {t.author}
                        </div>
                        <div
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={`mt-0.5 ${
                            highlighted ? 'text-[11px] text-neutral-400' : 'text-[10px] text-neutral-500'
                          }`}
                        >
                          {t.role}
                        </div>
                      </div>
                    </figcaption>
                  </motion.figure>
                );
              })}
            </div>
          </section>

          {/* ========== CTA ========== */}
          <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-32 sm:px-10 sm:py-40'}>
              <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
                <motion.h2
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                  style={{fontFamily: 'var(--font-display)'}}
                  className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}
                >
                  Start sending in 5 minutes.
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Free plan available. $0.001 per email on paid. No contact limits, no surprises.
                  </p>
                  <div className={'flex flex-wrap gap-3'}>
                    <motion.a
                      whileHover={{scale: 1.015}}
                      whileTap={{scale: 0.985}}
                      href={`${DASHBOARD_URI}/auth/signup`}
                      className={
                        'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'
                      }
                    >
                      Create free account
                      <ArrowRight className="h-4 w-4" />
                    </motion.a>
                    <Link
                      href={WIKI_URI}
                      target={'_blank'}
                      rel={'noopener noreferrer'}
                      className={
                        'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'
                      }
                    >
                      Read the docs
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}

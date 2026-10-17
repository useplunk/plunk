import {motion, useReducedMotion} from 'framer-motion';
import {ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {DifferenceSnippets, FeatureCTA, FeatureHero, Footer, Navbar, SectionHeader} from '../../components';
import {WIKI_URI} from '../../lib/constants';

/**
 * Every comparison, as the same editorial list the homepage uses for the five
 * it features: name, what the tool is, arrow. The old cards added a sales line
 * and three mono feature tags each, which made sixteen cards of near-identical
 * noise; what a visitor is scanning for here is their own tool's name.
 */
const competitors: {name: string; slug: string; category: string}[] = [
  {name: 'Resend', slug: 'resend', category: 'Transactional email API'},
  {name: 'SendGrid', slug: 'sendgrid', category: 'Email API and marketing platform'},
  {name: 'Mailgun', slug: 'mailgun', category: 'Email API for developers'},
  {name: 'Mailchimp', slug: 'mailchimp', category: 'Marketing email platform'},
  {name: 'Postmark', slug: 'postmark', category: 'Transactional email service'},
  {name: 'Customer.io', slug: 'customerio', category: 'Behavioural messaging platform'},
  {name: 'Loops', slug: 'loops', category: 'Email for software companies'},
  {name: 'Brevo', slug: 'brevo', category: 'Marketing and CRM suite'},
  {name: 'ConvertKit', slug: 'convertkit', category: 'Email for creators'},
  {name: 'ActiveCampaign', slug: 'activecampaign', category: 'Marketing automation and CRM'},
  {name: 'MailerLite', slug: 'mailerlite', category: 'Newsletters and marketing email'},
  {name: 'Klaviyo', slug: 'klaviyo', category: 'E-commerce marketing platform'},
  {name: 'Bento', slug: 'bento', category: 'Email marketing and automation'},
  {name: 'Mailjet', slug: 'mailjet', category: 'Email API and newsletters'},
  {name: 'Buttondown', slug: 'buttondown', category: 'Newsletter publishing'},
  {name: 'Amazon SES', slug: 'amazon-ses', category: 'Raw sending infrastructure'},
];

export default function CompetitorsIndex() {
  const still = useReducedMotion();

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
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Best+Email+Platform+Alternatives&tag=Comparison',
              alt: 'Plunk vs Competitors',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={
            <>
              How Plunk compares
              <br />
              to your email tools
            </>
          }
          subtitle={
            'Most email tools charge per contact, keep their code closed, and split transactional from marketing email. Plunk does all three in one open-source platform at $0.001 per email.'
          }
          docsHref={WIKI_URI}
        />

        <section className={'mx-auto max-w-[88rem] px-6 pb-24 sm:px-10 sm:pb-32'}>
          <ul className={'grid border-t border-neutral-200 lg:grid-cols-2 lg:gap-x-16'}>
            {competitors.map((c, i) => (
              <motion.li
                key={c.slug}
                initial={still ? undefined : {opacity: 0, y: 8}}
                whileInView={still ? undefined : {opacity: 1, y: 0}}
                viewport={{once: true, margin: '-5%'}}
                transition={{duration: 0.4, delay: still ? 0 : (i % 8) * 0.04, ease: [0.22, 1, 0.36, 1]}}
                className={'border-b border-neutral-200'}
              >
                <Link
                  href={`/vs/${c.slug}`}
                  className={
                    'group flex items-center justify-between gap-6 py-5 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
                  }
                >
                  <span className={'min-w-0'}>
                    <span
                      className={
                        'block font-display text-2xl font-semibold tracking-[-0.02em] text-neutral-900 transition-transform duration-300 group-hover:translate-x-1'
                      }
                    >
                      Plunk vs {c.name}
                    </span>
                    <span className={'mt-1 block text-ui text-neutral-500'}>{c.category}</span>
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    strokeWidth={1.75}
                    className={
                      'h-5 w-5 flex-shrink-0 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
                    }
                  />
                </Link>
              </motion.li>
            ))}
          </ul>
        </section>

        <section className={'mx-auto max-w-[88rem] px-6 pb-24 sm:px-10 sm:pb-32'}>
          <SectionHeader title={'What every comparison comes down to'} />
          <div className={'mt-14'} data-nosnippet>
            <DifferenceSnippets />
          </div>
        </section>

        <FeatureCTA title={'Try Plunk alongside what you use now.'} />
      </main>

      <Footer />
    </>
  );
}

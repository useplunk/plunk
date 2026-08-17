import {FAQSection, FeatureCTA, FeatureHero, FeatureSection, Footer, Navbar, SpecList, Surface} from '../../components';
import type {FAQ, Spec} from '../../components';
import {motion} from 'framer-motion';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

const capabilities: Spec[] = [
  {
    title: 'Credentials, not a rewrite',
    description:
      'Swap the host, port and credentials in whatever already sends your mail. Nothing else about your application changes.',
    machine: 'smtp.useplunk.com : 587',
  },
  {
    title: 'TLS on 465 and 587',
    description: 'Encrypted in transit on both the implicit and STARTTLS ports.',
  },
  {
    title: 'Any client, any language',
    description: 'Outlook, Thunderbird, Apple Mail, or any framework with an SMTP transport. There is no SDK to adopt.',
  },
  {
    title: 'The same pipeline as the API',
    description:
      'SMTP mail goes out over the same infrastructure, against the same verified domains, with the same open and click tracking.',
  },
  {
    title: 'Attachments and custom headers',
    description: 'Full MIME support, multiple recipients, and your own headers passed straight through.',
  },
];

const useCases: Spec[] = [
  {
    title: 'Legacy systems',
    description:
      'Something in your stack already speaks SMTP and nobody wants to touch it. Point it at Plunk and it keeps working, now with tracking.',
    machine: 'Zero code changes',
  },
  {
    title: 'Sending from a mail client',
    description:
      'People who live in Outlook or Apple Mail can send through your verified domain without learning an API.',
    machine: 'No technical knowledge needed',
  },
  {
    title: 'Frameworks without an HTTP client',
    description:
      'Older platforms, embedded systems and anything else where an SMTP transport is the only option available.',
    machine: 'Universal protocol support',
  },
];

/**
 * Was a hand-rolled `<table>` even though `ComparisonTable` exists and every
 * `/vs/*` page uses it. Rendered as a surface here instead: the question this
 * answers is "which of the two should I use", so three columns of short values
 * beat a paragraph either way.
 */
const comparison = [
  {feature: 'Protocol', smtp: 'SMTP', api: 'HTTP / REST'},
  {feature: 'Setup', smtp: 'Credentials', api: 'API key'},
  {feature: 'Works with mail clients', smtp: 'Yes', api: 'No'},
  {feature: 'Open and click tracking', smtp: 'Yes', api: 'Yes'},
  {feature: 'Attachments', smtp: 'Yes', api: 'Yes'},
  {feature: 'Plunk templates', smtp: 'No', api: 'Yes'},
  {feature: 'Triggers workflows', smtp: 'No', api: 'Yes'},
];

const faqs: FAQ[] = [
  {
    question: 'Should I use SMTP or the API?',
    answer:
      'Use SMTP when something already sends mail and you do not want to change it, or when a person is sending from a mail client. Use the API when you want Plunk templates or want the send to trigger a workflow.',
  },
  {
    question: 'Do SMTP sends get tracked?',
    answer:
      'Yes. SMTP mail goes out over the same infrastructure as API mail, so opens, clicks and bounces are recorded the same way.',
  },
  {
    question: 'Which ports and encryption are supported?',
    answer: 'Port 587 with STARTTLS and port 465 with implicit TLS. Both are encrypted in transit.',
  },
  {
    question: 'Can I send from any address?',
    answer:
      'Only from domains you have verified on your project. Plunk checks the sending domain before accepting the message.',
  },
];

export default function SMTPFeature() {
  return (
    <>
      <NextSeo
        title="SMTP Server - Send Emails via SMTP or API | Plunk"
        description="Use Plunk's SMTP server with any email client or application. TLS encryption, the same delivery infrastructure as the API, and full tracking."
        canonical="https://www.useplunk.com/features/smtp"
        openGraph={{
          title: 'SMTP Server - Send Emails via SMTP or API | Plunk',
          description:
            "Use Plunk's SMTP server with any email client or application. TLS encryption, the same delivery infrastructure as the API, and full tracking.",
          url: 'https://www.useplunk.com/features/smtp',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=SMTP+Server&tag=Feature',
              alt: 'Plunk SMTP Server',
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
              Send via SMTP
              <br />
              or API. Your call.
            </>
          }
          subtitle={'Point any existing client or framework at Plunk. Same domains, same tracking, same price.'}
          docsHref={`${WIKI_URI}/guides/verifying-domains`}
          docsLabel={'SMTP docs'}
          artifact={
            <Surface label={'smtp'} meta={<span>TLS</span>} bodyClassName={'divide-y divide-neutral-100'}>
              {[
                {k: 'host', v: 'smtp.useplunk.com'},
                {k: 'port', v: '587'},
                {k: 'username', v: 'plunk'},
                {k: 'password', v: 'sk_your_secret_key'},
              ].map((row, i) => (
                <motion.div
                  key={row.k}
                  initial={{opacity: 0, y: 4}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-15%'}}
                  transition={{duration: 0.3, delay: 0.1 + i * 0.06, ease: [0.23, 1, 0.32, 1]}}
                  className={'flex items-baseline gap-4 px-5 py-3.5'}
                >
                  <span className={'w-20 flex-shrink-0 font-code text-[0.6875rem] text-neutral-400'}>{row.k}</span>
                  <span className={'min-w-0 truncate font-code text-ui text-neutral-900'}>{row.v}</span>
                </motion.div>
              ))}
            </Surface>
          }
        />

        <FeatureSection tone={'muted'} title={'What you get'} intro={'The protocol is the only old thing about it.'}>
          <SpecList specs={capabilities} />
        </FeatureSection>

        <FeatureSection title={'SMTP or API'} intro={'Both send through the same pipeline. These are the differences.'}>
          <Surface label={'comparison'} bodyClassName={'divide-y divide-neutral-100'}>
            <div className={'grid grid-cols-12 gap-4 bg-neutral-50 px-5 py-3'}>
              <span className={'col-span-6 font-code text-label text-neutral-500'}>Feature</span>
              <span className={'col-span-3 font-code text-label text-neutral-900'}>SMTP</span>
              <span className={'col-span-3 font-code text-label text-neutral-500'}>API</span>
            </div>
            {comparison.map((row, i) => (
              <motion.div
                key={row.feature}
                initial={{opacity: 0}}
                whileInView={{opacity: 1}}
                viewport={{once: true, margin: '-10%'}}
                transition={{duration: 0.3, delay: i * 0.04, ease: [0.23, 1, 0.32, 1]}}
                className={'grid grid-cols-12 items-baseline gap-4 px-5 py-3.5'}
              >
                <span className={'col-span-6 text-ui text-neutral-700'}>{row.feature}</span>
                <span className={'col-span-3 font-code text-ui font-medium text-neutral-900'}>{row.smtp}</span>
                <span className={'col-span-3 font-code text-ui text-neutral-500'}>{row.api}</span>
              </motion.div>
            ))}
          </Surface>
        </FeatureSection>

        <FeatureSection tone={'muted'} title={'When SMTP is the right answer'}>
          <SpecList specs={useCases} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-smtp'} />

        <FeatureCTA title={'Point your app at Plunk.'} />
      </main>

      <Footer />
    </>
  );
}

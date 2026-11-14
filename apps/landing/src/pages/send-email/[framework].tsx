import type {GetStaticPaths, GetStaticProps} from 'next';
import Link from 'next/link';
import {BreadcrumbJsonLd, NextSeo} from 'next-seo';
import React from 'react';

import {
  CodeBlock,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureSection,
  Footer,
  Navbar,
  StepSequence,
  TransactionalSnippet,
} from '../../components';
import type {Step} from '../../components';
import {FRAMEWORKS, getFramework} from '../../content/frameworks';
import type {Example, Framework} from '../../content/frameworks';
import {WIKI_URI} from '../../lib/constants';

const steps: Step[] = [
  {title: 'Create a project', body: 'Sign up for free and copy your secret key from the project settings.'},
  {title: 'Verify your domain', body: 'Add the DNS records Plunk shows you. It checks them and tells you when you can send.'},
  {title: 'Send', body: 'Use the API or your framework’s mailer, below. Every email shows up in the dashboard.'},
];

function ExampleSection({title, example}: {title: string; example: Example & {intro: string}}) {
  return (
    <FeatureSection title={title} intro={example.intro}>
      <div className={'max-w-3xl'}>
        <CodeBlock code={example.code} title={example.title} />
      </div>
    </FeatureSection>
  );
}

/**
 * "Send email with X" for each framework people search with. There are no
 * SDKs, so the page shows the framework's own tools: its HTTP client and its
 * mailer over SMTP, whichever is the natural default first.
 */
export default function SendEmailWith({framework: f}: {framework: Framework}) {
  const url = `https://www.useplunk.com/send-email/${f.slug}`;
  const title = `How to Send Email with ${f.name} | Plunk`;
  const description = `Send transactional email from ${f.name} with one API call or over SMTP. Copy-paste examples, no SDK to install, $0.001 per email.`;
  const api = <ExampleSection title={'Send with the API'} example={f.api} />;
  const smtp = <ExampleSection title={`Send with ${f.name} over SMTP`} example={f.smtp} />;
  const others = FRAMEWORKS.filter(other => other.slug !== f.slug);

  return (
    <>
      <NextSeo
        title={title}
        description={description}
        canonical={url}
        openGraph={{
          title,
          description,
          url,
          images: [
            {
              url: `https://www.useplunk.com/api/og?title=${encodeURIComponent(`Send email with ${f.name}`)}&tag=Guide`,
              alt: `Send email with ${f.name}`,
              width: 1200,
              height: 630,
            },
          ],
        }}
      />
      <BreadcrumbJsonLd
        itemListElements={[
          {position: 1, name: 'Home', item: 'https://www.useplunk.com'},
          {position: 2, name: 'Send email', item: 'https://www.useplunk.com/send-email'},
          {position: 3, name: f.name, item: url},
        ]}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={
            <>
              Send email
              <br />
              with {f.name}
            </>
          }
          subtitle={f.intro}
          docsHref={`${WIKI_URI}/concepts/transactional-emails`}
          docsLabel={'API docs'}
          artifact={<TransactionalSnippet />}
        />

        <FeatureSection title={'Before you send'}>
          <StepSequence steps={steps} />
        </FeatureSection>

        {f.primary === 'api' ? (
          <>
            {api}
            {smtp}
          </>
        ) : (
          <>
            {smtp}
            {api}
          </>
        )}

        <FAQSection faqs={f.faqs} schemaId={`faq-send-email-${f.slug}`} />

        <FeatureCTA title={`Send your first email from ${f.name}.`} />

        <nav aria-label={'Other frameworks'} className={'mx-auto max-w-[88rem] px-6 pb-20 sm:px-10'}>
          <p className={'text-label font-semibold text-neutral-500'}>Send email with</p>
          <ul className={'mt-4 flex flex-wrap gap-x-6 gap-y-2'}>
            {others.map(other => (
              <li key={other.slug}>
                <Link href={`/send-email/${other.slug}`} className={'text-ui text-neutral-600 transition hover:text-neutral-900'}>
                  {other.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={'/features/transactional-email'} className={'text-ui font-semibold text-neutral-900'}>
                Transactional email
              </Link>
            </li>
          </ul>
        </nav>
      </main>

      <Footer />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: FRAMEWORKS.map(f => ({params: {framework: f.slug}})),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{framework: Framework}> = ({params}) => {
  const framework = getFramework(String(params?.framework));
  return framework ? {props: {framework}} : {notFound: true};
};

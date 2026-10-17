import {ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import React from 'react';

import {FeatureCTA, FeatureHero, Footer, Navbar} from '../../components';
import {FRAMEWORKS} from '../../content/frameworks';
import {WIKI_URI} from '../../lib/constants';

/** Every framework guide, as the same editorial list the comparisons use. */
export default function SendEmailIndex() {
  return (
    <>
      <NextSeo
        title="Send Email from Your App: Framework Guides | Plunk"
        description="Copy-paste examples for sending email from Next.js, Node.js, Python, Django, Laravel, Rails, Go and Supabase, with the API or over SMTP."
        canonical="https://www.useplunk.com/send-email"
        openGraph={{
          title: 'Send Email from Your App: Framework Guides | Plunk',
          description:
            'Copy-paste examples for sending email from Next.js, Node.js, Python, Django, Laravel, Rails, Go and Supabase.',
          url: 'https://www.useplunk.com/send-email',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Send+Email+from+Your+App&tag=Guide',
              alt: 'Send email from your app',
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
              Send email from
              <br />
              whatever you build with
            </>
          }
          subtitle={
            'Plunk is one HTTPS endpoint and a standard SMTP server, so there is no SDK to install. Pick your framework for a copy-paste example.'
          }
          docsHref={`${WIKI_URI}/concepts/transactional-emails`}
          docsLabel={'API docs'}
        />

        <section className={'mx-auto max-w-[88rem] px-6 pb-24 sm:px-10 sm:pb-32'}>
          <ul className={'grid border-t border-neutral-200 lg:grid-cols-2 lg:gap-x-16'}>
            {FRAMEWORKS.map(f => (
              <li key={f.slug} className={'border-b border-neutral-200'}>
                <Link
                  href={`/send-email/${f.slug}`}
                  className={
                    'group flex items-center justify-between gap-6 py-5 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
                  }
                >
                  <span className={'min-w-0'}>
                    <span className={'block font-display text-2xl font-semibold tracking-[-0.02em] text-neutral-900'}>
                      Send email with {f.name}
                    </span>
                    <span className={'mt-1 block text-ui text-neutral-500'}>
                      {f.primary === 'api' ? 'API, or SMTP' : 'SMTP, or the API'}
                    </span>
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className={
                      'h-5 w-5 flex-shrink-0 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <FeatureCTA title={'Send your first email in minutes.'} />
      </main>

      <Footer />
    </>
  );
}

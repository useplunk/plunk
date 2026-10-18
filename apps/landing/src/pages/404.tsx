import {NextSeo} from 'next-seo';
import Link from 'next/link';
import React from 'react';

import {Footer, Navbar} from '../components';

const destinations = [
  {href: '/', label: 'Home', copy: 'Transactional email, campaigns, and workflows on one contact list.'},
  {href: '/pricing', label: 'Pricing', copy: '$0.001 per email, unlimited contacts, or a free plan with 1,000 emails a month.'},
  {href: '/features/workflows', label: 'Features', copy: 'Workflows, segments, the editor, SMTP, inbound email, and MCP.'},
  {href: '/vs', label: 'Comparisons', copy: 'How Plunk compares to Resend, SendGrid, Mailchimp, and others.'},
  {href: '/guides', label: 'Guides', copy: 'Deliverability, authentication, and email metrics explained.'},
  {href: '/tools', label: 'Free tools', copy: 'SPF, DKIM, DMARC, and MX checkers, and more.'},
];

/**
 * Lost visitors get the full navigation and a way back to every section,
 * instead of the bare framework 404 with nowhere to go.
 */
export default function NotFound() {
  return (
    <>
      <NextSeo title={'Page not found | Plunk'} noindex />

      <Navbar />

      <main className={'text-neutral-800'}>
        <section className={'mx-auto max-w-[88rem] px-6 pb-24 pt-20 sm:px-10 sm:pb-32 sm:pt-28'}>
          <div className={'max-w-4xl'}>
            <p className={'text-label font-semibold text-neutral-500'}>404</p>
            <h1 className={'mt-4 font-display text-display font-extrabold tracking-[-0.035em] text-neutral-900'}>
              This page went undelivered.
            </h1>
            <p className={'mt-6 max-w-[55ch] text-lead text-neutral-600'}>
              The link may be old or mistyped. One of these is probably what you were after.
            </p>
          </div>

          <ul className={'mt-14 grid gap-px overflow-hidden rounded-card bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3'}>
            {destinations.map(d => (
              <li key={d.href} className={'bg-white'}>
                <Link href={d.href} className={'block h-full p-6 transition hover:bg-neutral-50'}>
                  <span className={'font-display text-xl font-semibold text-neutral-900'}>{d.label}</span>
                  <span className={'mt-2 block text-ui leading-relaxed text-neutral-600'}>{d.copy}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </>
  );
}

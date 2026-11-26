import {Printer} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import React, {ReactNode} from 'react';

import {Footer} from '../Footer';
import {Navbar} from '../Navbar';
import {ReadingBody} from '../ReadingBody';

import {ENTITY} from './entity';

const DOCUMENTS = [
  {href: '/terms', name: 'Terms of Service'},
  {href: '/privacy', name: 'Privacy Policy'},
  {href: '/dpa', name: 'Data Processing Agreement'},
] as const;

type LegalPath = (typeof DOCUMENTS)[number]['href'];

interface LegalLayoutProps {
  path: LegalPath;
  title: string;
  /** Meta description, also the lead under the heading. */
  description: string;
  /** ISO date of the current version. */
  lastUpdated: string;
  children: ReactNode;
}

/**
 * The frame for the three legal documents: a switcher between them, the title
 * and version date, then the shared reading column with a contents rail. The
 * documents are long and referenced by section number, so the rail and the
 * numbered headings are the navigation; there is no other chrome.
 */
export function LegalLayout({path, title, description, lastUpdated, children}: LegalLayoutProps) {
  const canonical = `https://www.useplunk.com${path}`;
  const updated = new Date(lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <>
      <NextSeo
        title={`${title} | Plunk`}
        description={description}
        canonical={canonical}
        openGraph={{url: canonical, title: `${title} | Plunk`, description}}
      />

      <div className={'print:hidden'}>
        <Navbar />
      </div>

      <main className={'pb-24 text-neutral-800 sm:pb-32'}>
        <header className={'mx-auto max-w-[88rem] px-6 pb-12 pt-14 sm:px-10 sm:pb-16 sm:pt-20'}>
          <div className={'grid gap-12 lg:grid-cols-12'}>
            <div className={'min-w-0 lg:col-span-8 lg:col-start-4 xl:col-span-7 xl:col-start-4'}>
              <nav aria-label={'Legal documents'} className={'print:hidden'}>
                <ul className={'flex flex-wrap gap-2'}>
                  {DOCUMENTS.map(doc => {
                    const current = doc.href === path;
                    return (
                      <li key={doc.href}>
                        <Link
                          href={doc.href}
                          aria-current={current ? 'page' : undefined}
                          className={`inline-flex rounded-full border px-3.5 py-1.5 text-ui transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                            current
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900'
                          }`}
                        >
                          {doc.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <h1
                className={
                  'mt-10 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-neutral-900'
                }
              >
                {title}
              </h1>
              <p className={'mt-5 max-w-[60ch] text-lead text-pretty text-neutral-600'}>{description}</p>

              <div className={'mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-ui text-neutral-500'}>
                <p>
                  Last updated <time dateTime={lastUpdated}>{updated}</time>
                </p>
                <button
                  type={'button'}
                  onClick={() => window.print()}
                  className={
                    'inline-flex items-center gap-1.5 text-neutral-700 underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-900 hover:decoration-neutral-900 print:hidden'
                  }
                >
                  <Printer aria-hidden className={'h-3.5 w-3.5'} />
                  Print or save as PDF
                </button>
              </div>
            </div>
          </div>
        </header>

        <ReadingBody label={'Contents'} mobileContents>
          <div className={'border-t border-neutral-200 pt-12 sm:pt-16'}>{children}</div>
          <LegalContact />
        </ReadingBody>
      </main>

      <div className={'print:hidden'}>
        <Footer />
      </div>
    </>
  );
}

/** The provider's details, closing every document. */
function LegalContact() {
  return (
    <aside aria-label={'Contact details'} className={'mt-4 rounded-card bg-tile p-6 sm:p-8'}>
      <p className={'font-display text-lg font-bold tracking-[-0.01em] text-neutral-900'}>Contact</p>
      <address className={'mt-3 text-body not-italic leading-relaxed text-neutral-700'}>
        {ENTITY.name}, trading as {ENTITY.tradeName}
        <br />
        {ENTITY.address}
        <br />
        Enterprise number {ENTITY.enterpriseNumber}
        <br />
        <a
          href={`mailto:${ENTITY.email}`}
          className={
            'font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900'
          }
        >
          {ENTITY.email}
        </a>
      </address>
    </aside>
  );
}

/**
 * A top-level section. The number is part of the heading so the contents rail shows it.
 * Annexes pass no number: they are cited by name, not by section.
 */
export function LegalSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number?: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={'pb-14 sm:pb-16'}>
      <h2
        id={id}
        className={'scroll-mt-28 font-display text-h3 font-bold tracking-[-0.02em] text-balance text-neutral-900'}
      >
        {number !== undefined && <span className={'tabular-nums text-neutral-500'}>{number}. </span>}
        {title}
      </h2>
      <div className={'guide-prose mt-6'}>{children}</div>
    </section>
  );
}

/** A numbered clause inside a section, e.g. 5.2. Clause numbers are what other sections and customers cite. */
export function Clause({number, title, children}: {number: string; title: string; children: ReactNode}) {
  return (
    <>
      <h3 id={`clause-${number.replace('.', '-')}`} className={'scroll-mt-28'}>
        <span className={'tabular-nums text-neutral-500'}>{number}</span> {title}
      </h3>
      {children}
    </>
  );
}

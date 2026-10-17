import {ArrowUpRight} from 'lucide-react';
import {ArticleJsonLd, BreadcrumbJsonLd, NextSeo} from 'next-seo';
import Link from 'next/link';
import React, {ReactNode, useEffect, useRef, useState} from 'react';

import {FAQSection, FeatureCTA, Footer, Navbar} from '../';
import type {FAQ} from '../FAQSection';

import {getGuide, relatedGuides} from './registry';

interface GuideLayoutProps {
  /** Registry slug: drives the breadcrumb, related guides and tool link. */
  slug: string;
  /** The SEO title. Long and keyword-led; it is not shown on the page. */
  title: string;
  /** The page heading. Short, sentence case. */
  heading: ReactNode;
  /** Meta description, also the lead under the heading unless `lead` is set. */
  description: string;
  lead?: ReactNode;
  lastUpdated: string;
  readTime: string;
  canonical: string;
  /** The graphic beside the heading: one SnippetTile that carries the guide's answer. */
  figure?: ReactNode;
  faqs?: FAQ[];
  /** The closing tile's heading. */
  cta?: string;
  children: ReactNode;
}

/**
 * The frame every guide sits in.
 *
 * Guides were a long column of prose plugin output with a boxed table of
 * contents floating beside it, and every page styled its own headings, cards
 * and tables inline. The page now has the same shape as the rest of the site:
 * a hero with one graphic that answers the title, a reading column at a
 * comfortable measure with a quiet contents rail to its left, and the same
 * related links, questions and closing tile at the end of every guide.
 *
 * The contents list only shows h2s. Listing h3s too made it as long as the
 * article on some pages, which defeats the point of a contents list.
 */
export function GuideLayout({
  slug,
  title,
  heading,
  description,
  lead,
  lastUpdated,
  readTime,
  canonical,
  figure,
  faqs,
  cta = 'Send email that lands.',
  children,
}: GuideLayoutProps) {
  const guide = getGuide(slug);
  const ogImage = `https://www.useplunk.com/api/og?title=${encodeURIComponent(guide.name)}&tag=Guide`;
  const updated = new Date(lastUpdated).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});

  return (
    <>
      <NextSeo
        title={`${title} | Plunk`}
        description={description}
        canonical={canonical}
        openGraph={{
          title: `${title} | Plunk`,
          description,
          url: canonical,
          type: 'article',
          images: [{url: ogImage, alt: guide.name, width: 1200, height: 630}],
          article: {publishedTime: lastUpdated, modifiedTime: lastUpdated, authors: ['Plunk']},
        }}
      />
      <ArticleJsonLd
        type="Article"
        url={canonical}
        title={title}
        images={[ogImage]}
        datePublished={lastUpdated}
        dateModified={lastUpdated}
        authorName="Plunk"
        description={description}
      />
      <BreadcrumbJsonLd
        itemListElements={[
          {position: 1, name: 'Home', item: 'https://www.useplunk.com'},
          {position: 2, name: 'Guides', item: 'https://www.useplunk.com/guides'},
          {position: 3, name: guide.name, item: canonical},
        ]}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        {/* Hero */}
        <section className={'mx-auto max-w-[88rem] px-6 pb-16 pt-14 sm:px-10 sm:pb-24 sm:pt-20'}>
          <div className={`grid items-center gap-12 lg:gap-16 ${figure ? 'lg:grid-cols-12' : ''}`}>
            <div className={`hero-enter ${figure ? 'lg:col-span-6' : 'max-w-4xl'}`}>
              <nav aria-label={'Breadcrumb'}>
                <ol className={'flex flex-wrap items-center gap-2 text-ui text-neutral-500'}>
                  <li>
                    <Link href={'/guides'} className={'transition hover:text-neutral-900'}>
                      Guides
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  <li>{guide.category}</li>
                </ol>
              </nav>
              <h1
                className={
                  'mt-6 font-display text-h2 font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[clamp(2.5rem,5vw,4.25rem)] sm:leading-[1.02]'
                }
              >
                {heading}
              </h1>
              <p className={'mt-6 max-w-[52ch] text-lead text-pretty text-neutral-600'}>{lead ?? description}</p>
              <p className={'mt-8 text-ui text-neutral-500'}>
                Updated <time dateTime={lastUpdated}>{updated}</time> · {readTime} read
              </p>
            </div>

            {figure && (
              <div className={'hero-enter min-w-0 lg:col-span-6'} style={{animationDelay: '0.1s'}}>
                {figure}
              </div>
            )}
          </div>
        </section>

        {/* Body */}
        <GuideBody>{children}</GuideBody>

        {/* What next */}
        <GuideNext slug={slug} />

        {faqs && faqs.length > 0 && <FAQSection faqs={faqs} schemaId={`faq-${slug}`} />}

        <FeatureCTA title={cta} />
      </main>

      <Footer />
    </>
  );
}

/** The reading column and its contents rail. */
function GuideBody({children}: {children: ReactNode}) {
  const article = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<{id: string; text: string}[]>([]);
  const [active, setActive] = useState('');

  useEffect(() => {
    const root = article.current;
    if (!root) return;

    const elements = Array.from(root.querySelectorAll<HTMLHeadingElement>('h2[id]'));
    setHeadings(elements.map(el => ({id: el.id, text: el.textContent ?? ''})));

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      {rootMargin: '-96px 0px -70% 0px'},
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={'mx-auto max-w-[88rem] px-6 sm:px-10'}>
      <div className={'grid gap-12 lg:grid-cols-12'}>
        <aside className={'hidden lg:col-span-3 lg:block'}>
          {headings.length > 0 && (
            <nav aria-label={'On this page'} className={'sticky top-28'}>
              <p className={'mb-4 text-ui font-semibold text-neutral-900'}>On this page</p>
              <ul className={'flex flex-col border-l border-neutral-200'}>
                {headings.map(h => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className={`-ml-px block border-l py-1.5 pl-4 text-ui transition-colors ${
                        active === h.id
                          ? 'border-neutral-900 font-medium text-neutral-900'
                          : 'border-transparent text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>

        <article ref={article} className={'min-w-0 lg:col-span-8 lg:col-start-4 xl:col-span-7 xl:col-start-4'}>
          {children}
        </article>
      </div>
    </div>
  );
}

/** The free tool for this topic, then three related guides. */
function GuideNext({slug}: {slug: string}) {
  const guide = getGuide(slug);
  const related = relatedGuides(slug);

  return (
    <section className={'mx-auto max-w-[88rem] px-6 pt-24 sm:px-10 sm:pt-32'}>
      <h2 className={'font-display text-h3 font-bold tracking-[-0.025em] text-neutral-900'}>Keep reading</h2>
      <ul className={'mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
        {guide.tool && (
          <li>
            <NextTile
              href={`/tools/${guide.tool.slug}`}
              kicker={'Free tool'}
              title={guide.tool.name}
              copy={guide.tool.pitch}
            />
          </li>
        )}
        {related.map(g => (
          <li key={g.slug}>
            <NextTile href={`/guides/${g.slug}`} kicker={g.category} title={g.name} copy={g.description} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NextTile({href, kicker, title, copy}: {href: string; kicker: string; title: string; copy: string}) {
  return (
    <Link
      href={href}
      className={
        'group flex h-full flex-col justify-between gap-8 rounded-card bg-tile p-6 transition-colors hover:bg-neutral-200/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
      }
    >
      <span className={'flex items-center justify-between'}>
        <span className={'text-ui text-neutral-500'}>{kicker}</span>
        <ArrowUpRight
          aria-hidden
          className={
            'h-4 w-4 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
          }
        />
      </span>
      <span>
        <span className={'block font-display text-lg font-bold tracking-[-0.01em] text-neutral-900'}>{title}</span>
        <span className={'mt-1.5 block text-ui text-neutral-600'}>{copy}</span>
      </span>
    </Link>
  );
}

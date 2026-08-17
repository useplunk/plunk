import {FAQSection, Footer, Navbar} from '../';
import type {FAQ} from '../FAQSection';
import {motion} from 'framer-motion';
import React, {ReactNode, useLayoutEffect, useState} from 'react';
import {Label} from '../Mono';
import Link from 'next/link';
import {ArticleJsonLd, BreadcrumbJsonLd, NextSeo} from 'next-seo';
import {Calendar, Clock} from 'lucide-react';

interface GuideLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  readTime: string;
  children: ReactNode;
  canonical?: string;
  ogImage?: string;
  faqs?: FAQ[];
}

/**
 * Reusable layout for educational guide pages
 */
export function GuideLayout({
  title,
  description,
  lastUpdated,
  readTime,
  children,
  canonical,
  ogImage,
  faqs,
}: GuideLayoutProps) {
  const resolvedOgImage =
    ogImage ||
    `https://www.useplunk.com/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&tag=Guide`;
  const [headings, setHeadings] = useState<{id: string; text: string; level: number}[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings for table of contents
  useLayoutEffect(() => {
    const elements = Array.from(document.querySelectorAll('h2, h3'));

    // Generate IDs for headings that don't have them
    const headingData = elements.map(element => {
      let id = element.id;
      if (!id) {
        // Generate ID from text content
        id = (element.textContent || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        element.id = id;
      }
      return {
        id,
        text: element.textContent || '',
        level: parseInt(element.tagName.substring(1)),
      };
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(headingData);

    // Set up intersection observer for active heading
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {rootMargin: '-100px 0px -80% 0px'},
    );

    elements.forEach(element => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  // Generate breadcrumb items
  const breadcrumbItems = [
    {position: 1, name: 'Home', item: 'https://www.useplunk.com'},
    {position: 2, name: 'Guides', item: 'https://www.useplunk.com/guides'},
    {position: 3, name: title, item: canonical || ''},
  ];

  return (
    <>
      <NextSeo
        title={`${title} | Plunk`}
        description={description}
        canonical={canonical}
        openGraph={{
          title: `${title} | Plunk`,
          description: description,
          url: canonical,
          type: 'article',
          images: [{url: resolvedOgImage, alt: title, width: 1200, height: 630}],
          article: {
            publishedTime: lastUpdated,
            modifiedTime: lastUpdated,
            authors: ['Plunk'],
          },
        }}
      />

      <ArticleJsonLd
        type="Article"
        url={canonical || ''}
        title={title}
        images={[resolvedOgImage]}
        datePublished={lastUpdated}
        dateModified={lastUpdated}
        authorName="Plunk"
        description={description}
      />

      <BreadcrumbJsonLd itemListElements={breadcrumbItems} />

      <Navbar />

      <main className={'mx-auto max-w-[88rem] px-4 sm:px-8 w-full overflow-x-hidden'}>
        <div className={'flex flex-col lg:flex-row gap-8 lg:gap-12 py-8 sm:py-16 w-full'}>
          {/* Main Content */}
          <article className={'flex-1 max-w-full lg:max-w-4xl w-full'}>
            {/* Breadcrumbs */}
            <nav className={'mb-6 sm:mb-8 w-full overflow-x-auto'}>
              <ol
                className={
                  'flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-ui text-neutral-600 whitespace-normal'
                }
              >
                <li className={'truncate max-w-[90vw]'}>
                  <Link href="/" className={'hover:text-neutral-900'}>
                    Home
                  </Link>
                </li>
                <li>/</li>
                <li className={'truncate max-w-[90vw]'}>
                  <Link href="/guides" className={'hover:text-neutral-900'}>
                    Guides
                  </Link>
                </li>
                <li>/</li>
                <li className={'text-neutral-900 font-medium truncate max-w-[90vw]'}>{title}</li>
              </ol>
            </nav>

            {/* Header */}
            <motion.header
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-8 sm:mb-12 w-full'}
            >
              <h1
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-h2 font-extrabold tracking-[-0.03em] text-neutral-900 break-words max-w-full'}
              >
                {title}
              </h1>
              <p
                className={'mt-6 max-w-[65ch] text-lead text-neutral-600 break-words'}
              >
                {description}
              </p>

              <div
                className={
                  'mt-6 sm:mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-ui text-neutral-600'
                }
              >
                <div className={'flex items-center gap-2'}>
                  <Calendar className="h-4 w-4" />
                  <span>
                    Updated{' '}
                    {new Date(lastUpdated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className={'flex items-center gap-2'}>
                  <Clock className="h-4 w-4" />
                  <span>{readTime} read</span>
                </div>
              </div>
            </motion.header>

            {/* Content */}
            <div className={'prose prose-neutral max-w-full'} style={{overflowX: 'visible'}}>
              {/* Responsive table and code block styles */}
              <style>{`
                .prose table { display: block; width: 100%; overflow-x: auto; }
                .prose th, .prose td { white-space: normal; word-break: break-word; }
                .prose pre, .prose code { max-width: 100vw; overflow-x: auto; word-break: break-word; }
                .prose img { max-width: 100%; height: auto; }
              `}</style>
              {children}
            </div>
          </article>

          {/* Table of Contents - Desktop Only */}
          {headings.length > 0 && (
            <aside className={'hidden lg:block w-64 shrink-0 sticky top-24 self-start'}>
              <div className={'rounded-xl border border-neutral-200 bg-white p-6 shadow-sm'}>
                <h2 className={'mb-4'}>
                  <Label>On this page</Label>
                </h2>
                <nav>
                  <ul className={'space-y-0.5'}>
                    {headings.map(heading => (
                      <li key={heading.id} className={heading.level === 3 ? 'ml-3' : ''}>
                        <a
                          href={`#${heading.id}`}
                          onClick={e => {
                            e.preventDefault();
                            const element = document.getElementById(heading.id);
                            if (element) {
                              const offset = 100;
                              const elementPosition = element.getBoundingClientRect().top + window.scrollY;
                              window.scrollTo({
                                top: elementPosition - offset,
                                behavior: 'smooth',
                              });
                            }
                          }}
                          className={`block rounded px-2 py-1.5 transition-all duration-200 ${
                            heading.level === 2
                              ? activeId === heading.id
                                ? 'bg-neutral-100 text-ui font-semibold text-neutral-900'
                                : 'text-ui font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                              : activeId === heading.id
                                ? 'bg-neutral-50 text-xs font-medium text-neutral-800'
                                : 'text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                          }`}
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>
          )}
        </div>
      </main>

      {faqs && faqs.length > 0 && (
        <FAQSection
          faqs={faqs}
          schemaId={`faq-${canonical ? canonical.split('/').pop() : 'guide'}`}
        />
      )}

      <Footer />
    </>
  );
}

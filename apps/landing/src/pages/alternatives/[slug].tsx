import {ArrowUpRight} from 'lucide-react';
import type {GetStaticPaths, GetStaticProps} from 'next';
import Link from 'next/link';
import {BreadcrumbJsonLd, NextSeo} from 'next-seo';
import React from 'react';

import {FAQSection, FeatureCTA, FeatureHero, FeatureSection, Footer, Navbar} from '../../components';
import {ALTERNATIVES, ALTERNATIVES_UPDATED, TOOLS, getAlternativesPage} from '../../content/alternatives';
import type {AlternativesPage} from '../../content/alternatives';

/**
 * "X alternatives" is a different search from "Plunk vs X": the reader wants
 * the field, not one head-to-head. Each page lists Plunk first, says so, and
 * links every tool that has one to its full comparison.
 */
export default function Alternatives({page}: {page: AlternativesPage}) {
  const url = `https://www.useplunk.com/alternatives/${page.slug}`;
  const title = `${page.picks.length} Best ${page.name} Alternatives (${ALTERNATIVES_UPDATED.split(' ')[1]}), Compared | Plunk`;
  const description = `The best ${page.name} alternatives for developers and SaaS teams, with what each is best for and how it is priced. Updated ${ALTERNATIVES_UPDATED}.`;
  const picks = page.picks.map(key => ({key, ...TOOLS[key]}));

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
              url: `https://www.useplunk.com/api/og?title=${encodeURIComponent(`${page.name} Alternatives`)}&tag=Comparison`,
              alt: `${page.name} alternatives`,
              width: 1200,
              height: 630,
            },
          ],
        }}
      />
      <BreadcrumbJsonLd
        itemListElements={[
          {position: 1, name: 'Home', item: 'https://www.useplunk.com'},
          {position: 2, name: 'Comparisons', item: 'https://www.useplunk.com/vs'},
          {position: 3, name: `${page.name} alternatives`, item: url},
        ]}
      />
      <script
        id={`itemlist-alternatives-${page.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            'name': `${page.name} alternatives`,
            'itemListElement': picks.map((tool, i) => ({'@type': 'ListItem', 'position': i + 1, 'name': tool.name})),
          }),
        }}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={
            <>
              {page.name} alternatives,
              <br />
              compared
            </>
          }
          subtitle={page.intro}
          docsHref={`/vs/${page.slug}`}
          docsLabel={`Plunk vs ${page.name}`}
        />

        <FeatureSection title={`Why teams look beyond ${page.name}`}>
          <ul className={'grid gap-8 md:grid-cols-3'}>
            {page.reasons.map(reason => (
              <li key={reason.title} className={'rounded-card bg-tile p-6 sm:p-8'}>
                <h3 className={'font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'}>
                  {reason.title}
                </h3>
                <p className={'mt-2 text-neutral-600'}>{reason.copy}</p>
              </li>
            ))}
          </ul>
        </FeatureSection>

        <FeatureSection
          title={`${picks.length} alternatives to ${page.name}`}
          intro={`Plunk is first because we build it; the rest are in order of how often they fit teams leaving ${page.name}. Updated ${ALTERNATIVES_UPDATED}.`}
        >
          <ol className={'divide-y divide-neutral-200 border-y border-neutral-200'}>
            {picks.map((tool, i) => {
              const body = (
                <>
                  <span className={'flex items-baseline gap-3 sm:col-span-4'}>
                    <span className={'font-display text-ui font-bold text-neutral-400 tabular-nums'}>{i + 1}</span>
                    <span>
                      <span className={'block font-display text-xl font-semibold text-neutral-900'}>
                        {tool.name}
                        {tool.key === 'plunk' && <span className={'ml-2 text-ui font-normal text-neutral-500'}>(us)</span>}
                      </span>
                      <span className={'mt-0.5 block text-label text-neutral-500'}>
                        {tool.category}
                        {tool.eu && ' · EU'}
                      </span>
                    </span>
                  </span>
                  <span className={'text-neutral-700 sm:col-span-5'}>{tool.bestFor}</span>
                  <span className={'text-ui text-neutral-500 sm:col-span-3'}>{tool.pricing}</span>
                </>
              );
              const className = 'grid gap-2 py-6 sm:grid-cols-12 sm:items-baseline sm:gap-6 sm:px-2';

              return (
                <li key={tool.key}>
                  {tool.vs ? (
                    <Link href={`/vs/${tool.vs}`} className={`group ${className} transition-colors hover:bg-neutral-50`}>
                      {body}
                    </Link>
                  ) : tool.key === 'plunk' ? (
                    <Link href={'/pricing'} className={`group ${className} transition-colors hover:bg-neutral-50`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={className}>{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className={'mt-6 flex items-center gap-1.5 text-ui text-neutral-600'}>
            Each row links to its full comparison with Plunk, or see{' '}
            <Link href={'/vs'} className={'inline-flex items-center gap-1 text-neutral-900 underline underline-offset-4'}>
              every comparison
              <ArrowUpRight aria-hidden className={'h-3.5 w-3.5'} />
            </Link>
          </p>
        </FeatureSection>

        <FAQSection faqs={page.faqs} schemaId={`faq-alternatives-${page.slug}`} />

        <FeatureCTA title={`Try Plunk alongside ${page.name}.`} />
      </main>

      <Footer />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: ALTERNATIVES.map(page => ({params: {slug: page.slug}})),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{page: AlternativesPage}> = ({params}) => {
  const page = getAlternativesPage(String(params?.slug));
  return page ? {props: {page}} : {notFound: true};
};

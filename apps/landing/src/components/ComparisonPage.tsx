import {motion, useReducedMotion} from 'framer-motion';
import {Check} from 'lucide-react';
import {BreadcrumbJsonLd, NextSeo} from 'next-seo';
import Link from 'next/link';
import React from 'react';

import {getAlternativesPage} from '../content/alternatives';
import {COMPARISONS} from '../content/comparisons';
import {WIKI_URI} from '../lib/constants';
import {ComparisonTable, type ComparisonRow} from './ComparisonTable';
import {FAQSection, type FAQ} from './FAQSection';
import {FeatureCTA, FeatureHero} from './features';
import {Footer} from './Footer';
import {Navbar} from './Navbar';
import {SectionHeader} from './SectionHeader';
import {DifferenceTiles, type Difference} from './snippets';
import {SwitchOffer} from './SwitchOffer';

export interface Comparison {
  slug: string;
  /** The competitor, as they write their own name. */
  name: string;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    /** The title rendered into the OG image. */
    ogImageTitle: string;
  };
  /** Two short lines; names the competitor so the page answers the search. */
  headline: React.ReactNode;
  /** One sentence: the single biggest difference. */
  summary: string;
  /** Exactly three, most important first. */
  differences: [Difference, Difference, Difference];
  /** Who should pick which. Three short lines each, written to be fair. */
  choosePlunk: string[];
  chooseThem: string[];
  table: ComparisonRow[];
  faqs: FAQ[];
  cta: {title: string; body?: string};
}

function ChooseColumn({title, items, strong}: {title: string; items: string[]; strong: boolean}) {
  return (
    <div className={'rounded-card bg-tile p-8 sm:p-10'}>
      <h3 className={'font-display text-h3 font-bold tracking-[-0.02em] text-neutral-900'}>{title}</h3>
      <ul className={'mt-6 flex flex-col gap-4'}>
        {items.map(item => (
          <li key={item} className={'flex gap-3 text-neutral-700'}>
            <Check
              aria-hidden
              strokeWidth={2.25}
              className={`mt-1 h-4 w-4 flex-shrink-0 ${strong ? 'text-neutral-900' : 'text-neutral-400'}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Every "Plunk vs X" page, in one order: the difference in a sentence, the
 * three differences that matter shown as tiles, who should pick which, the
 * full table as evidence, then questions.
 *
 * Sixteen pages used to hand-roll this with a black pricing card, a six-cell
 * grid of title-case claims and a boxed table, and each had drifted. The
 * content is per page; the hierarchy is not.
 */
export function ComparisonPage({comparison: c}: {comparison: Comparison}) {
  const still = useReducedMotion();
  const url = `https://www.useplunk.com/vs/${c.slug}`;

  return (
    <>
      <NextSeo
        title={c.seo.title}
        description={c.seo.description}
        canonical={url}
        openGraph={{
          title: c.seo.ogTitle,
          description: c.seo.ogDescription,
          url,
          images: [
            {
              url: `https://www.useplunk.com/api/og?title=${encodeURIComponent(c.seo.ogImageTitle).replace(/%20/g, '+')}&tag=Comparison`,
              alt: `Plunk vs ${c.name}`,
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
          {position: 3, name: `Plunk vs ${c.name}`, item: url},
        ]}
      />

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero title={c.headline} subtitle={c.summary} docsHref={WIKI_URI} />

        <section className={'mx-auto max-w-[88rem] px-6 pb-24 sm:px-10 sm:pb-32'}>
          <SectionHeader title={`How Plunk differs from ${c.name}`} />
          <div className={'mt-14'}>
            <DifferenceTiles items={c.differences} />
          </div>
        </section>

        <section className={'mx-auto max-w-[88rem] px-6 pb-24 sm:px-10 sm:pb-32'}>
          <SectionHeader title={'Which one is right for you?'} />
          <motion.div
            initial={still ? undefined : {opacity: 0, y: 12}}
            whileInView={still ? undefined : {opacity: 1, y: 0}}
            viewport={{once: true, margin: '-10%'}}
            transition={{duration: 0.5, ease: [0.23, 1, 0.32, 1]}}
            className={'mt-14 grid gap-4 md:grid-cols-2'}
          >
            <ChooseColumn title={'Choose Plunk if'} items={c.choosePlunk} strong />
            <ChooseColumn title={`Choose ${c.name} if`} items={c.chooseThem} strong={false} />
          </motion.div>
        </section>

        <section className={'mx-auto max-w-[88rem] px-6 pb-24 sm:px-10 sm:pb-32'}>
          <SectionHeader title={'Feature by feature'} />
          <div className={'mt-10'}>
            <ComparisonTable competitorName={c.name} rows={c.table} />
          </div>
        </section>

        <FAQSection faqs={c.faqs} schemaId={`faq-schema-${c.slug}`} />

        <SwitchOffer competitorName={c.name} />

        <FeatureCTA title={c.cta.title} body={c.cta.body} />

        <OtherComparisons current={c.slug} />
      </main>

      <Footer />
    </>
  );
}

/**
 * A quiet row of the other comparisons. Readers weighing one tool are usually
 * weighing two or three, and before this every comparison was a dead end that
 * only linked back out through the footer.
 */
function OtherComparisons({current}: {current: string}) {
  const others = COMPARISONS.filter(other => other.slug !== current);
  const alternatives = getAlternativesPage(current);

  return (
    <nav aria-label={'Other comparisons'} className={'mx-auto max-w-[88rem] px-6 pb-20 sm:px-10'}>
      <p className={'text-label font-semibold text-neutral-500'}>Compare Plunk with</p>
      <ul className={'mt-4 flex flex-wrap gap-x-6 gap-y-2'}>
        {others.map(other => (
          <li key={other.slug}>
            <Link href={`/vs/${other.slug}`} className={'text-ui text-neutral-600 transition hover:text-neutral-900'}>
              {other.name} alternative
            </Link>
          </li>
        ))}
        {alternatives && (
          <li>
            <Link href={`/alternatives/${alternatives.slug}`} className={'text-ui font-semibold text-neutral-900'}>
              All {alternatives.name} alternatives
            </Link>
          </li>
        )}
        <li>
          <Link href={'/vs'} className={'text-ui font-semibold text-neutral-900'}>
            All comparisons
          </Link>
        </li>
      </ul>
    </nav>
  );
}

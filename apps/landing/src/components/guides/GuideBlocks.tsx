import {motion, useReducedMotion} from 'framer-motion';
import {Check, Copy, Minus, X} from 'lucide-react';
import React, {ReactNode, useState} from 'react';

import {StepMarker} from '../sections';
import {SnippetTile} from '../snippets';

/**
 * What guide bodies are built from.
 *
 * Every guide used to hand-roll its own headings, cards, numbered boxes and
 * tables inline, at slightly different sizes, so no two pages had the same
 * hierarchy. These are the only blocks a guide needs. Prose goes straight
 * inside a GuideSection as plain <p>, <ul> and <h3>; `.guide-prose` styles it.
 */

/** One h2 and its content. The id feeds the contents rail. */
export function GuideSection({id, title, children}: {id: string; title: string; children: ReactNode}) {
  return (
    <section className={'pb-16 sm:pb-20'}>
      <h2
        id={id}
        className={
          'scroll-mt-28 font-display text-[1.75rem] font-bold leading-[1.15] tracking-[-0.025em] text-balance text-neutral-900 sm:text-[2rem]'
        }
      >
        {title}
      </h2>
      <div className={'guide-prose mt-6'}>{children}</div>
    </section>
  );
}

/** The opening paragraph, a step up from body text. Optional; most guides start with one. */
export function GuideIntro({children}: {children: ReactNode}) {
  return <div className={'pb-16 text-lead text-pretty text-neutral-700 sm:pb-20 [&>p+p]:mt-5'}>{children}</div>;
}

/**
 * A graphic in the body: one SnippetTile with a short caption under it. The
 * caption says what to notice, so a scanner gets the point without the
 * paragraph around it.
 */
export function GuideFigure({
  caption,
  align = 'center',
  className = 'min-h-72',
  children,
}: {
  caption?: ReactNode;
  align?: 'center' | 'bleed-right' | 'bleed-bottom';
  className?: string;
  children: ReactNode;
}) {
  const still = useReducedMotion();

  return (
    <motion.figure
      initial={still ? undefined : {opacity: 0, y: 10}}
      whileInView={still ? undefined : {opacity: 1, y: 0}}
      viewport={{once: true, margin: '-10%'}}
      transition={{duration: 0.5, ease: [0.23, 1, 0.32, 1]}}
      className={'!my-10'}
    >
      <SnippetTile align={align} className={className}>
        {children}
      </SnippetTile>
      {caption && <figcaption className={'mt-3 text-ui text-neutral-500'}>{caption}</figcaption>}
    </motion.figure>
  );
}

/**
 * A real sequence: setup steps, the order a check runs in. Use it only when
 * order matters.
 *
 * The same markers as StepSequence, joined by one line down the left that
 * stops short of each marker, the way FlowFragment joins workflow steps. The
 * old solid black dots with a line that touched one dot and not the next read
 * as bullets, not as a sequence.
 */
export function GuideSteps({steps}: {steps: {title: string; body?: ReactNode; children?: ReactNode}[]}) {
  return (
    <ol className={'!my-10 !list-none !pl-0'}>
      {steps.map((step, i) => (
        <li key={step.title} className={'relative flex gap-5 pb-9 last:pb-0 !mt-0'}>
          {i < steps.length - 1 && (
            <span aria-hidden className={'absolute bottom-2 left-4 top-10 w-px bg-neutral-300'} />
          )}
          <StepMarker n={i + 1} />
          <div className={'min-w-0 flex-1 pt-1'}>
            <p className={'!text-base font-semibold !leading-6 !text-neutral-900'}>{step.title}</p>
            {step.body && <div className={'mt-1.5 text-neutral-700'}>{step.body}</div>}
            {step.children && <div className={'mt-4'}>{step.children}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * A list of short points, each a bold lead and one line. `do` and `dont` mark
 * each with a tick or a cross, for best practices and mistakes; `plain` is a
 * hairline list for factors or reasons that are neither.
 */
export function GuidePoints({
  items,
  tone = 'plain',
  columns = 1,
}: {
  items: {title: string; body: ReactNode}[];
  tone?: 'do' | 'dont' | 'plain';
  columns?: 1 | 2;
}) {
  const icon = {
    do: <Check aria-hidden className={'h-4 w-4 text-ok'} strokeWidth={2.25} />,
    dont: <X aria-hidden className={'h-4 w-4 text-err'} strokeWidth={2.25} />,
    plain: <Minus aria-hidden className={'h-4 w-4 text-neutral-400'} strokeWidth={2} />,
  }[tone];

  return (
    <ul className={`!my-8 grid !list-none gap-x-10 gap-y-6 !pl-0 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map(item => (
        <li key={item.title} className={'flex gap-3 !mt-0'}>
          <span className={'mt-1 flex-shrink-0'}>{icon}</span>
          <div className={'min-w-0'}>
            <p className={'font-semibold !text-neutral-900'}>{item.title}</p>
            <div className={'mt-1 text-neutral-700'}>{item.body}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Two or three things side by side: hard against soft bounces, SPF against
 * DKIM. Each column is a pale tile with a heading, a line and a short list.
 */
export function GuideCompare({
  items,
}: {
  items: {title: string; body?: ReactNode; points?: string[]; badge?: ReactNode}[];
}) {
  return (
    <div className={`!my-10 grid gap-3 ${items.length === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {items.map(item => (
        <div key={item.title} className={'rounded-card bg-tile p-6'}>
          <div className={'flex items-center justify-between gap-3'}>
            <p className={'font-display text-lg font-bold tracking-[-0.01em] !text-neutral-900'}>{item.title}</p>
            {item.badge}
          </div>
          {item.body && <div className={'mt-2 text-ui text-neutral-600'}>{item.body}</div>}
          {item.points && (
            <ul className={'mt-5 flex !list-none flex-col gap-2.5 border-t border-neutral-200 !pl-0 pt-5'}>
              {item.points.map(point => (
                <li key={point} className={'flex gap-2.5 !text-ui !leading-normal !mt-0'}>
                  <Check aria-hidden className={'mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400'} strokeWidth={2} />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * A reference table: hairline rows, no zebra, no boxed header. `mono` sets the
 * first column in code type, for record tags and mechanisms.
 */
export function GuideTable({
  head,
  rows,
  mono = false,
}: {
  head: string[];
  rows: ReactNode[][];
  mono?: boolean;
}) {
  return (
    <div className={'!my-10 overflow-x-auto'}>
      <table className={'w-full min-w-[32rem] border-collapse text-left'}>
        <thead>
          <tr className={'border-b border-neutral-900'}>
            {head.map(h => (
              <th key={h} scope={'col'} className={'pb-3 pr-6 text-ui font-semibold text-neutral-900 last:pr-0'}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className={'border-b border-neutral-200'}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`py-3.5 pr-6 align-top text-ui last:pr-0 ${
                    c === 0
                      ? `font-medium text-neutral-900 ${mono ? 'whitespace-nowrap font-code' : ''}`
                      : 'text-neutral-600'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A record or a code sample, light: a white card on a tile, the same material
 * as the graphics. The dark terminal block was the heaviest thing on every
 * guide and read as a different site.
 */
export function GuideCode({code, title, copy = true}: {code: string; title?: string; copy?: boolean}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={'!my-8 rounded-[1.25rem] bg-tile p-2'}>
      <div className={'overflow-hidden rounded-card border border-neutral-200/80 bg-white shadow-fragment'}>
        {(title || copy) && (
          <div className={'flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-2.5'}>
            <span className={'truncate text-ui font-medium text-neutral-600'}>{title}</span>
            {copy && (
              <button
                type={'button'}
                onClick={handleCopy}
                className={
                  'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-label font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900'
                }
                aria-label={'Copy code'}
              >
                {copied ? <Check aria-hidden className={'h-3.5 w-3.5'} /> : <Copy aria-hidden className={'h-3.5 w-3.5'} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        )}
        <pre className={'overflow-x-auto px-5 py-4'}>
          <code className={'font-code text-ui leading-relaxed text-neutral-800'}>{code}</code>
        </pre>
      </div>
    </div>
  );
}

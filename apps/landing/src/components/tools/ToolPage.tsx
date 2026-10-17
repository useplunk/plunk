import {motion, useReducedMotion} from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Code2,
  FileText,
  Key,
  Mail,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {SectionHeader} from '../SectionHeader';

/**
 * The parts every free tool page is built from.
 *
 * These pages are where most search traffic lands, so the tool itself sits in
 * the first screen, directly under the heading, rather than below a full-height
 * hero. Everything after it (the explainer, the other tools, the questions)
 * is for the people who stay.
 */

export interface ToolInfo {
  name: string;
  slug: string;
  description: string;
  icon: React.ElementType;
}

/** Every tool, in the order the index lists them. */
export const TOOLS: ToolInfo[] = [
  {
    name: 'SPF checker',
    slug: 'spf-checker',
    description: 'Look up and validate a domain’s SPF record.',
    icon: Shield,
  },
  {
    name: 'DKIM checker',
    slug: 'dkim-checker',
    description: 'Find a DKIM key by selector and check it is valid.',
    icon: Key,
  },
  {
    name: 'DMARC checker',
    slug: 'dmarc-checker',
    description: 'Check a DMARC policy and how close it is to enforcement.',
    icon: ShieldCheck,
  },
  {
    name: 'MX record checker',
    slug: 'mx-checker',
    description: 'See which servers receive mail for a domain.',
    icon: Mail,
  },
  {
    name: 'Email headers analyzer',
    slug: 'email-headers',
    description: 'Trace a message’s route and authentication results.',
    icon: FileText,
  },
  {
    name: 'Spam checker',
    slug: 'spam-checker',
    description: 'Test a subject and body for spam triggers.',
    icon: ShieldAlert,
  },
  {
    name: 'Email verification',
    slug: 'verify-email',
    description: 'Check an address for typos, MX records and disposable domains.',
    icon: Search,
  },
  {
    name: 'Markdown to email',
    slug: 'markdown-to-email',
    description: 'Turn rich text into email-safe HTML.',
    icon: Code2,
  },
];

/**
 * Heading, one line, and the tool. `wide` is for tools that need room, like
 * an editor or a pasted block of headers.
 */
export function ToolHero({
  title,
  subtitle,
  wide = false,
  children,
}: {
  title: React.ReactNode;
  subtitle: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-14 sm:px-10 sm:pb-24 sm:pt-20'}>
        <div className={'hero-enter mx-auto max-w-3xl text-center'}>
          <Link
            href={'/tools'}
            className={'inline-flex items-center gap-1.5 text-ui text-neutral-500 transition hover:text-neutral-900'}
          >
            <ArrowLeft aria-hidden className={'h-3.5 w-3.5'} />
            Free email tools
          </Link>
          <h1
            className={
              'mt-6 font-display text-h2 font-extrabold tracking-[-0.03em] text-balance text-neutral-900 sm:text-[clamp(2.5rem,5vw,4rem)] sm:leading-[1.02]'
            }
          >
            {title}
          </h1>
          <p className={'mx-auto mt-5 max-w-[52ch] text-lead text-neutral-600'}>{subtitle}</p>
        </div>

        <div className={`hero-enter mx-auto mt-12 ${wide ? 'max-w-6xl' : 'max-w-2xl'}`} style={{animationDelay: '0.1s'}}>
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * The tool's input, as a white card on a pale tile: the same material as the
 * product snippets elsewhere on the site, so the tool reads as a piece of
 * Plunk rather than a form.
 */
export function ToolPanel({children}: {children: React.ReactNode}) {
  return (
    <div className={'rounded-[1.25rem] bg-tile p-2 sm:p-3'}>
      <div className={'rounded-card border border-neutral-200/80 bg-white p-6 shadow-fragment sm:p-8'}>{children}</div>
    </div>
  );
}

/** One block of results: a plain white card with an optional heading. */
export function ToolResult({title, children}: {title?: string; children: React.ReactNode}) {
  return (
    <div className={'rounded-card border border-neutral-200 bg-white p-6 sm:p-8'}>
      {title && <h3 className={'mb-5 font-display text-lg font-bold text-neutral-900'}>{title}</h3>}
      {children}
    </div>
  );
}

const tones = {
  ok: {icon: CheckCircle2, color: 'text-ok', surface: 'bg-ok-surface'},
  warn: {icon: AlertTriangle, color: 'text-warn', surface: 'bg-warn-surface'},
  err: {icon: XCircle, color: 'text-err', surface: 'bg-err-surface'},
} as const;

export type ToolTone = keyof typeof tones;

/**
 * The answer, first: one icon, one line, one sentence. Colour is only on the
 * icon, so a failing result reads as serious without turning the whole card
 * red.
 */
export function ToolVerdict({tone, title, detail}: {tone: ToolTone; title: string; detail?: React.ReactNode}) {
  const {icon: Icon, color, surface} = tones[tone];

  return (
    <div className={'flex items-start gap-4 rounded-card border border-neutral-200 bg-white p-6 sm:p-8'}>
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${surface}`}>
        <Icon aria-hidden className={`h-5 w-5 ${color}`} strokeWidth={2} />
      </span>
      <div className={'min-w-0'}>
        <p className={'font-display text-xl font-bold tracking-[-0.01em] text-neutral-900'}>{title}</p>
        {detail && <div className={'mt-1 text-neutral-600'}>{detail}</div>}
      </div>
    </div>
  );
}

/** A finding in a list of findings: icon by severity, label, one line. */
export function ToolFinding({tone, label, detail}: {tone: ToolTone; label: string; detail?: React.ReactNode}) {
  const {icon: Icon, color} = tones[tone];

  return (
    <li className={'flex items-start gap-3'}>
      <Icon aria-hidden className={`mt-0.5 h-5 w-5 flex-shrink-0 ${color}`} strokeWidth={2} />
      <div>
        <p className={'text-ui font-semibold text-neutral-900'}>{label}</p>
        {detail && <p className={'mt-0.5 text-ui text-neutral-600'}>{detail}</p>}
      </div>
    </li>
  );
}

/** A small status label: a pill, sentence case, colour only for state. */
export function ToolPill({tone, children}: {tone: ToolTone | 'neutral'; children: React.ReactNode}) {
  const cls = {
    ok: 'bg-ok-surface text-ok',
    warn: 'bg-warn-surface text-warn',
    err: 'bg-err-surface text-err',
    neutral: 'bg-neutral-100 text-neutral-700',
  }[tone];

  return (
    <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-label font-medium ${cls}`}>
      {children}
    </span>
  );
}

/** A DNS record or other literal value, in mono, on a pale ground. */
export function ToolRecord({children}: {children: React.ReactNode}) {
  return (
    <code className={'block break-all rounded-lg bg-neutral-50 px-4 py-3 font-code text-ui text-neutral-800'}>
      {children}
    </code>
  );
}

/**
 * The explainer under the tool, as open columns with a rule above each. It
 * was six bordered cards on a grey band; the words are what search engines and
 * readers came for, and the boxes added nothing to them.
 */
export function ToolExplainer({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: {title: string; body: string}[];
}) {
  const still = useReducedMotion();

  return (
    <section className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20'}>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className={'mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3'}>
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={still ? undefined : {opacity: 0, y: 10}}
            whileInView={still ? undefined : {opacity: 1, y: 0}}
            viewport={{once: true, margin: '-10%'}}
            transition={{duration: 0.45, delay: still ? 0 : (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1]}}
            className={'border-t border-neutral-200 pt-6'}
          >
            <h3 className={'font-display text-xl font-semibold tracking-[-0.01em] text-neutral-900'}>{item.title}</h3>
            <p className={'mt-2 text-neutral-600'}>{item.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/**
 * The other tools. Someone checking SPF usually needs DKIM and DMARC next,
 * and before this the only way to reach them was back through the index.
 */
export function MoreTools({current}: {current: string}) {
  const others = TOOLS.filter(tool => tool.slug !== current);

  return (
    <section className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20'}>
      <SectionHeader title={'More free tools'} />
      <ul className={'mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
        {others.map(tool => (
          <li key={tool.slug}>
            <Link
              href={`/tools/${tool.slug}`}
              className={
                'group flex h-full flex-col gap-4 rounded-card bg-tile p-5 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
              }
            >
              <span className={'flex items-center justify-between'}>
                <span
                  className={
                    'flex h-9 w-9 items-center justify-center rounded-lg bg-white text-neutral-700 shadow-fragment'
                  }
                >
                  <tool.icon aria-hidden className={'h-4 w-4'} strokeWidth={1.75} />
                </span>
                <ArrowUpRight
                  aria-hidden
                  className={
                    'h-4 w-4 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900'
                  }
                />
              </span>
              <span>
                <span className={'block font-semibold text-neutral-900'}>{tool.name}</span>
                <span className={'mt-1 block text-ui text-neutral-600'}>{tool.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

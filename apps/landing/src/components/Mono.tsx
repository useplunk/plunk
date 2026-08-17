import React from 'react';

/**
 * The mono system.
 *
 * Monospace is the landing site's signature and it stays. What changed is that
 * it now has a job description: three sanctioned roles, and nothing outside
 * them. Before this, mono was applied by reflex to eyebrows, card numbers, step
 * markers, benefit lines, flow strings and filter conditions alike — 144
 * uppercase-tracked labels across the site, including full sentences set in
 * 11px tracked caps. At that density it stopped reading as a deliberate choice.
 *
 * The rule that decides between the first two roles:
 *
 *   If it is a sentence, it is not a Label.
 *
 * A flow like "Trigger on signup -> Send welcome email" is machine text, so it
 * stays mono — but as `Code`, in sentence case at a readable size, not as a
 * tracked all-caps `Label`.
 */

type Tone = 'default' | 'muted' | 'inverted';

/** `Label` tones. Contrast is against a light surface unless inverted. */
const labelTone: Record<Tone, string> = {
  // 4.74:1 on white. This is the floor for text on a light surface.
  default: 'text-neutral-500',
  // Same tone, used where the label sits beside something heavier.
  muted: 'text-neutral-500',
  // On neutral-900 surfaces.
  inverted: 'text-neutral-400',
};

const codeTone: Record<Tone, string> = {
  default: 'text-neutral-700',
  muted: 'text-neutral-600',
  inverted: 'text-neutral-300',
};

interface MonoProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

/**
 * Metadata that names something: a stat caption, a table header, a figure
 * caption, a node type inside an artifact.
 *
 * Deliberately NOT uppercase and NOT letter-spaced. Tracked capitals were the
 * house mannerism here and they were doing more harm than work: at 12px they
 * are harder to read than sentence case, they force extra width, and repeated
 * above every section they read as scaffolding rather than as information.
 * Monospace alone is enough to mark text as metadata — that is the signal, and
 * it survives without the shouting.
 *
 * A `Label` should still be short. If it runs to a sentence it belongs in the
 * body face, and if it is machine text it belongs in `Code`.
 */
export function Label({children, tone = 'default', className = '', as: As = 'span'}: MonoProps & {as?: 'span' | 'div' | 'p'}) {
  return (
    <As
      style={{fontFamily: 'var(--font-mono)'}}
      className={`text-label font-medium ${labelTone[tone]} ${className}`}
    >
      {children}
    </As>
  );
}

/**
 * Literal machine text: env vars, DNS records, API paths, addresses, event
 * names, workflow steps.
 *
 * Sentence case, no tracking. This is the role that lets a flow string stay
 * monospace without being shouted at 11px.
 */
export function Code({children, tone = 'default', className = ''}: MonoProps) {
  return (
    <span
      style={{fontFamily: 'var(--font-mono)'}}
      className={`text-[0.8125rem] leading-relaxed ${codeTone[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Numerals in data displays: prices, stats, comparison cells.
 *
 * Tabular figures so columns of numbers line up, and no tracking — tracking is
 * for labels, and it makes digits harder to compare.
 */
export function Figure({children, tone = 'default', className = ''}: MonoProps) {
  return (
    <span
      style={{fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums'}}
      className={`${codeTone[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

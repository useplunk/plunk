import type {ContactField} from './hooks/useContacts';

/**
 * A reference that parses but probably will not do what the author meant.
 *
 * Distinct from a syntax error: `{% if emai %}` is valid Liquid. It is simply false for
 * every contact, forever, silently — the template sends, renders nothing, and nobody
 * finds out. Syntax validation is structurally blind to this class of mistake.
 */
export interface TemplateFieldWarning {
  kind: 'unknown' | 'sparse';
  field: string;
  message: string;
}

/** Below this, a conditional is likely to take the branch the author didn't picture. */
const SPARSE_COVERAGE_THRESHOLD = 50;

/** More than a few and the strip becomes a wall; the rest are usually the same mistake. */
const MAX_WARNINGS = 3;

/** Liquid's own vocabulary, plus operators and literals. Never contact fields. */
const KEYWORDS = new Set([
  'if',
  'elsif',
  'else',
  'endif',
  'unless',
  'endunless',
  'case',
  'when',
  'endcase',
  'for',
  'endfor',
  'in',
  'and',
  'or',
  'not',
  'contains',
  'assign',
  'capture',
  'endcapture',
  'increment',
  'decrement',
  'cycle',
  'tablerow',
  'endtablerow',
  'break',
  'continue',
  'raw',
  'endraw',
  'comment',
  'endcomment',
  'liquid',
  'echo',
  'include',
  'render',
  'layout',
  'with',
  'as',
  'limit',
  'offset',
  'reversed',
  'by',
  'true',
  'false',
  'nil',
  'null',
  'empty',
  'blank',
  'forloop',
  'tablerowloop',
]);

/**
 * Present in the render scope regardless of what a contact's data holds.
 *
 * `event` is the workflow trigger's payload: templates used as workflow steps are edited
 * on the same screen and legitimately read keys that no contact carries.
 */
const RUNTIME_NAMES = [
  'id',
  'email',
  'subscribed',
  'unsubscribeUrl',
  'subscribeUrl',
  'manageUrl',
  'locale',
  'data',
  'event',
];

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_.]*/g;

/**
 * Remove what is not a reference before tokenizing.
 *
 * Entities first: the rich-text editor serialises through the DOM, so a typed `>` is
 * stored as `&gt;` and a quote as `&quot;`. Their letters tokenize as identifiers, which
 * would report `gt` and `quot` as missing contact fields on a perfectly good template.
 * Decoding rather than deleting keeps `&quot;pro&quot;` a quoted literal for the next
 * step, which then strips it.
 */
function stripLiterals(expression: string): string {
  return expression
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&[a-zA-Z]+;|&#\d+;/g, ' ')
    .replace(/"[^"]*"|'[^']*'/g, ' ');
}

/**
 * Reduce a path to the name worth checking. `plan` stays `plan`; `profile.city` checks
 * `profile`, since that is the key a contact either has or does not; `data.plan` checks
 * `plan`, because `data` is the container the renderer always provides.
 */
function rootOf(path: string): string | undefined {
  const segments = path.split('.').filter(Boolean);

  if (segments[0] === 'data') {
    return segments[1];
  }

  return segments[0];
}

function identifiersIn(expression: string): string[] {
  const names: string[] = [];
  // Filters and their arguments are Liquid's vocabulary, not the contact's.
  const beforeFilter = stripLiterals(expression).split('|')[0] ?? '';

  for (const match of beforeFilter.matchAll(IDENTIFIER)) {
    const root = rootOf(match[0]);
    if (root && !KEYWORDS.has(root)) {
      names.push(root);
    }
  }

  return names;
}

interface References {
  referenced: string[];
  /** Names the template defines for itself: loop variables, `assign`, `capture`. */
  bound: Set<string>;
}

/**
 * Collect what a template reads and what it defines.
 *
 * Binding is tracked template-wide rather than per scope. A name assigned anywhere
 * silences it everywhere, which can miss a genuine mistake — the right trade, because a
 * warning that fires on correct templates is worse than one that stays quiet on a rare
 * wrong one.
 */
export function collectReferences(source: string): References {
  const referenced: string[] = [];
  const bound = new Set<string>();

  // `{% raw %}` content is literal text at send time, so nothing in it is a reference.
  const withoutRaw = source.replace(/\{%-?\s*raw\s*-?%\}[\s\S]*?\{%-?\s*endraw\s*-?%\}/g, ' ');

  for (const match of withoutRaw.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    // Plunk's legacy `?? fallback` is a literal string, not a second variable.
    const expression = (match[1] ?? '').split('??')[0] ?? '';
    referenced.push(...identifiersIn(expression));
  }

  for (const match of withoutRaw.matchAll(/\{%([\s\S]*?)%\}/g)) {
    const body = (match[1] ?? '').replace(/^[-+]|[-+]$/g, '').trim();
    const [tag = '', ...rest] = body.split(/\s+/);
    const remainder = rest.join(' ');

    if (tag === 'assign') {
      const [target, value = ''] = remainder.split('=');
      const name = target?.trim();
      if (name) {
        bound.add(name);
      }
      referenced.push(...identifiersIn(value));
      continue;
    }

    if (tag === 'capture' || tag === 'increment' || tag === 'decrement') {
      const name = remainder.trim();
      if (name) {
        bound.add(name);
      }
      continue;
    }

    if (tag === 'for' || tag === 'tablerow') {
      const [item, collection = ''] = remainder.split(/\s+in\s+/);
      const name = item?.trim();
      if (name) {
        bound.add(name);
      }
      referenced.push(...identifiersIn(collection));
      continue;
    }

    referenced.push(...identifiersIn(remainder));
  }

  return {referenced, bound};
}

/** Edit distance, capped: only near-misses are worth proposing as a correction. */
function distance(a: string, b: string): number {
  const rows = Array.from({length: a.length + 1}, (_, i) => [i, ...Array<number>(b.length).fill(0)]);

  for (let column = 0; column <= b.length; column += 1) {
    rows[0]![column] = column;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const substitution = a[row - 1] === b[column - 1] ? 0 : 1;
      rows[row]![column] = Math.min(
        rows[row - 1]![column]! + 1,
        rows[row]![column - 1]! + 1,
        rows[row - 1]![column - 1]! + substitution,
      );
    }
  }

  return rows[a.length]![b.length]!;
}

function nearest(name: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const score = distance(name.toLowerCase(), candidate.toLowerCase());
    if (score < bestDistance) {
      bestDistance = score;
      best = candidate;
    }
  }

  // One or two characters out on a name long enough for that to be a typo, not a
  // different word. `emai`/`email` qualifies; `plan`/`name` does not.
  return best !== undefined && bestDistance <= 2 && name.length >= 4 ? best : undefined;
}

/**
 * Check a template's field references against the project's actual contact fields.
 *
 * Returns nothing when `fields` is empty: that means the field list has not loaded (or
 * the project has no contacts yet), and every reference would look like a mistake.
 */
export function lintTemplateFields(source: string, fields: ContactField[]): TemplateFieldWarning[] {
  if (fields.length === 0 || !source) {
    return [];
  }

  const {referenced, bound} = collectReferences(source);
  const byName = new Map(fields.map(field => [field.field, field]));
  const known = [...RUNTIME_NAMES, ...byName.keys()];
  const knownSet = new Set(known);

  const warnings: TemplateFieldWarning[] = [];
  const seen = new Set<string>();

  for (const name of referenced) {
    if (seen.has(name) || bound.has(name)) {
      continue;
    }
    seen.add(name);

    if (!knownSet.has(name)) {
      const suggestion = nearest(name, known);
      warnings.push({
        kind: 'unknown',
        field: name,
        message: suggestion
          ? `No contact has a field called ${name}. Did you mean ${suggestion}?`
          : `No contact has a field called ${name}, so this will always be empty.`,
      });
      continue;
    }

    const field = byName.get(name);
    if (field && field.coverage < SPARSE_COVERAGE_THRESHOLD) {
      warnings.push({
        kind: 'sparse',
        field: name,
        message: `Only ${Math.round(field.coverage)}% of contacts have ${name}. The rest see this as empty.`,
      });
    }
  }

  // A typo is actionable; a sparse field is context. Lead with the actionable one.
  return warnings.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'unknown' ? -1 : 1)).slice(0, MAX_WARNINGS);
}

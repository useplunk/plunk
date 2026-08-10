import {SCOPE_ALIAS} from './engine.js';

const OUTPUT_OPEN = '{{';
const OUTPUT_CLOSE = '}}';
const TAG_OPEN = '{%';
const TAG_CLOSE = '%}';

/**
 * Entities the dashboard's rich-text editor introduces when Liquid markup is typed as
 * plain text. TipTap serialises text nodes through the DOM, so `{% if age > 18 %}`
 * reaches the API as `{% if age &gt; 18 %}` and fails to tokenize. Inside the
 * delimiters the content is code rather than prose, so decoding is always the intent.
 */
const ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&amp;': '&',
  '&nbsp;': ' ',
  '&#160;': ' ',
};

// A single pass, so `&amp;gt;` correctly decodes to `&gt;` rather than to `>`.
const ENTITY_PATTERN = /&(?:lt|gt|quot|apos|amp|nbsp|#34|#39|#160);/g;

/**
 * A plain variable path and nothing else — no filters, operators, quotes or brackets.
 * Used to detect the legacy `{{first name}}` form, which Liquid cannot express.
 */
const BARE_PATH = /^[A-Za-z_][\w .-]*$/;

/** `{% raw %}` content must survive verbatim, so preprocessing skips over it. */
const RAW_TAG = /^\s*raw\s*$/;
const END_RAW_TAG = /\{%-?\s*endraw\s*-?%\}/;

function decodeEntities(source: string): string {
  return source.includes('&') ? source.replace(ENTITY_PATTERN, entity => ENTITIES[entity] ?? entity) : source;
}

/**
 * Peel off Liquid's whitespace-control markers so the expression in between can be
 * rewritten without losing them: `{{- name -}}` -> `-`, `name`, `-`.
 */
function splitTrimMarkers(inner: string): {prefix: string; body: string; suffix: string} {
  let prefix = '';
  let suffix = '';
  let body = inner;

  if (body.startsWith('-') || body.startsWith('+')) {
    prefix = body.slice(0, 1);
    body = body.slice(1);
  }

  if (body.endsWith('-') || body.endsWith('+')) {
    suffix = body.slice(-1);
    body = body.slice(0, -1);
  }

  return {prefix, body, suffix};
}

/** Split an expression on top-level `??`, ignoring occurrences inside string literals. */
function splitDefaults(expression: string): string[] {
  if (!expression.includes('??')) {
    return [expression];
  }

  const parts: string[] = [];
  let start = 0;
  let quote: string | undefined;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];

    if (quote) {
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '?' && expression[index + 1] === '?') {
      parts.push(expression.slice(start, index));
      index += 1;
      start = index + 1;
    }
  }

  parts.push(expression.slice(start));
  return parts;
}

/**
 * Quote a legacy `?? fallback` operand. The old renderer always treated the fallback
 * as a literal string, so it stays quoted rather than being resolved as a variable —
 * `{{plan ?? free}}` keeps rendering "free" and not the (missing) `free` variable.
 * Authors who want a variable fallback can use Liquid's `| default:` directly.
 */
function toLiquidLiteral(raw: string): string {
  const value = raw.trim();

  const alreadyQuoted =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
  if (alreadyQuoted) {
    return value;
  }

  if (!value.includes('"')) {
    return `"${value}"`;
  }
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  // LiquidJS string literals have no escape sequences, so a fallback containing both
  // quote styles keeps its double quotes as an entity.
  return `"${value.replace(/"/g, '&quot;')}"`;
}

/**
 * Route a key containing spaces through the scope alias. `{{first name}}` becomes
 * `{{ __plunk["first name"] }}` and `{{profile.first name}}` becomes
 * `{{ __plunk["profile"]["first name"] }}`, mirroring how the old renderer resolved
 * dotted paths segment by segment.
 */
function rewriteSpacedPath(expression: string): string {
  const path = expression.trim();

  if (!path.includes(' ') || !BARE_PATH.test(path)) {
    return expression;
  }

  const segments = path
    .split('.')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0);

  if (segments.length === 0) {
    return expression;
  }

  return SCOPE_ALIAS + segments.map(segment => `[${JSON.stringify(segment)}]`).join('');
}

function rewriteOutput(inner: string): string {
  const decoded = decodeEntities(inner);
  const {prefix, body, suffix} = splitTrimMarkers(decoded);

  // The old renderer replaced `{{}}` with an empty string; Liquid rejects it outright.
  if (body.trim().length === 0) {
    return '';
  }

  const [head = '', ...fallbacks] = splitDefaults(body);
  const expression = rewriteSpacedPath(head).trim();

  if (decoded === inner && fallbacks.length === 0 && expression === head.trim()) {
    return `${OUTPUT_OPEN}${inner}${OUTPUT_CLOSE}`;
  }

  const defaults = fallbacks.map(fallback => ` | default: ${toLiquidLiteral(fallback)}`).join('');
  return `${OUTPUT_OPEN}${prefix} ${expression}${defaults} ${suffix}${OUTPUT_CLOSE}`;
}

/**
 * Bridge Plunk's historic template syntax to Liquid, and undo the escaping the
 * rich-text editor applies to markup typed inside `{{ }}` / `{% %}`.
 *
 * Runs once per template at parse time, never per recipient.
 */
export function preprocessTemplate(source: string): string {
  if (!source.includes(OUTPUT_OPEN) && !source.includes(TAG_OPEN)) {
    return source;
  }

  let result = '';
  let index = 0;

  while (index < source.length) {
    const outputAt = source.indexOf(OUTPUT_OPEN, index);
    const tagAt = source.indexOf(TAG_OPEN, index);

    if (outputAt === -1 && tagAt === -1) {
      break;
    }

    const isOutput = tagAt === -1 || (outputAt !== -1 && outputAt < tagAt);
    const openAt = isOutput ? outputAt : tagAt;
    const closeAt = source.indexOf(isOutput ? OUTPUT_CLOSE : TAG_CLOSE, openAt + 2);

    if (closeAt === -1) {
      // Unterminated delimiter: leave the remainder untouched and let Liquid report it.
      break;
    }

    result += source.slice(index, openAt);
    const inner = source.slice(openAt + 2, closeAt);

    if (isOutput) {
      result += rewriteOutput(inner);
      index = closeAt + 2;
      continue;
    }

    const {body} = splitTrimMarkers(inner);

    if (RAW_TAG.test(body)) {
      // Copy `{% raw %}...{% endraw %}` through byte for byte.
      const rest = source.slice(closeAt + 2);
      const endRaw = END_RAW_TAG.exec(rest);
      const rawEnd = endRaw ? closeAt + 2 + endRaw.index + endRaw[0].length : source.length;
      result += source.slice(openAt, rawEnd);
      index = rawEnd;
      continue;
    }

    result += `${TAG_OPEN}${decodeEntities(inner)}${TAG_CLOSE}`;
    index = closeAt + 2;
  }

  return result + source.slice(index);
}

import {validateTemplate} from '@plunk/shared';
import {useEffect, useState} from 'react';

export interface TemplateSyntaxIssue {
  /** Human-readable description of the problem, without Liquid's trailing position. */
  message: string;
  /** Position in the source. Only meaningful where the author can see line numbers. */
  line?: number;
  column?: number;
  /**
   * The offending `{{ }}` or `{% %}` block, extracted from the source. The visual editor
   * has no line numbers — its HTML is a single line — so this is the only locator that
   * means anything there.
   */
  excerpt?: string;
}

/** Long enough that a half-typed `{% if` doesn't flash an error mid-keystroke. */
const DEBOUNCE_MS = 500;

/** Cap on the excerpt, so a tag spanning half the document doesn't fill the strip. */
const MAX_EXCERPT_LENGTH = 80;

/** How far back to look for the delimiter that opened the offending block. */
const EXCERPT_LOOKBEHIND = 200;

const DISPLAY_ENTITIES: Record<string, string> = {
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

/**
 * The rich-text editor stores markup typed inside delimiters HTML-escaped, so a
 * condition reaches us as `{% if age &gt; 18 %}`. Show it back the way it was typed.
 */
function decodeForDisplay(text: string): string {
  return text.replace(/&(?:lt|gt|quot|apos|amp|nbsp|#34|#39|#160);/g, entity => DISPLAY_ENTITIES[entity] ?? entity);
}

/** Liquid's messages start lowercase ("tag {% if %} not closed"); we lead a sentence. */
function sentenceCase(message: string): string {
  const first = message.charAt(0);
  return first >= 'a' && first <= 'z' ? first.toUpperCase() + message.slice(1) : message;
}

/** Convert a 1-based line/column pair into an index into `source`. */
function toOffset(source: string, line: number, column: number): number | undefined {
  const lines = source.split('\n');
  if (line < 1 || line > lines.length) {
    return undefined;
  }

  let offset = 0;
  for (let index = 0; index < line - 1; index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }

  return Math.min(offset + Math.max(column - 1, 0), source.length);
}

/**
 * Pull the delimiter block containing `offset` out of the source.
 *
 * Positions come from the preprocessed source, so the column can drift by the length of
 * a rewrite earlier on the same line. Anchoring on the nearest opening delimiter at or
 * before the reported offset absorbs that drift.
 */
function extractExcerpt(source: string, offset: number): string | undefined {
  const searchFrom = Math.max(0, offset - EXCERPT_LOOKBEHIND);
  const window = source.slice(searchFrom, offset + 2);

  const openAt = Math.max(window.lastIndexOf('{{'), window.lastIndexOf('{%'));
  if (openAt === -1) {
    return undefined;
  }

  const start = searchFrom + openAt;
  const closeAt = source.slice(start).search(/\}\}|%\}/);
  const end = closeAt === -1 ? Math.min(start + MAX_EXCERPT_LENGTH, source.length) : start + closeAt + 2;

  const excerpt = decodeForDisplay(source.slice(start, end)).trim();
  if (excerpt.length === 0) {
    return undefined;
  }

  return excerpt.length > MAX_EXCERPT_LENGTH ? `${excerpt.slice(0, MAX_EXCERPT_LENGTH)}…` : excerpt;
}

/**
 * Report Liquid syntax errors while the author is still typing.
 *
 * The API rejects an unparseable template on save, but a 400 after the fact is a poor
 * way to learn you mistyped a tag — and its line/column is unreadable in the visual
 * editor. Validation is pure and runs client-side, so it can run on every pause instead.
 *
 * Returns `null` while the template is valid.
 */
export function useTemplateValidation(source: string): TemplateSyntaxIssue | null {
  const [issue, setIssue] = useState<TemplateSyntaxIssue | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = validateTemplate(source || '');

      if (result.valid) {
        setIssue(null);
        return;
      }

      const offset =
        result.line !== undefined && result.column !== undefined
          ? toOffset(source, result.line, result.column)
          : undefined;

      setIssue({
        message: result.error ? sentenceCase(result.error) : 'This template could not be parsed',
        line: result.line,
        column: result.column,
        excerpt: offset === undefined ? undefined : extractExcerpt(source, offset),
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [source]);

  return issue;
}

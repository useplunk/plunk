import sanitizeHtml from 'sanitize-html';

import {htmlToPlainText} from './mime.js';

/**
 * Inline styles that hide an element from the recipient in every mainstream client.
 * Matched against the style attribute after lower-casing and stripping whitespace, and
 * anchored on declaration boundaries so `line-height:0` never reads as `height:0`.
 *
 * `font-size:0` is deliberately absent: MJML-style layouts (including Plunk's own badge)
 * set it on wrapper cells and reset it on the children, so treating it as hidden would
 * throw away legitimate visible content.
 */
const HIDDEN_DECLARATIONS = [
  /(?:^|;)display:none(?:!important)?(?:;|$)/,
  /(?:^|;)visibility:hidden(?:!important)?(?:;|$)/,
  /(?:^|;)opacity:0(?:\.0+)?(?:!important)?(?:;|$)/,
];

/** The preheader trick: collapse the box to nothing and clip whatever is inside it. */
const COLLAPSED_HEIGHT = /(?:^|;)(?:max-)?height:0(?:px)?(?:!important)?(?:;|$)/;
const OVERFLOW_HIDDEN = /(?:^|;)overflow:hidden(?:!important)?(?:;|$)/;

function isHiddenElement(attribs: Record<string, string>): boolean {
  if (attribs.hidden !== undefined) return true;

  const style = (attribs.style ?? '').toLowerCase().replace(/\s+/g, '');
  if (!style) return false;

  if (HIDDEN_DECLARATIONS.some(pattern => pattern.test(style))) return true;
  return COLLAPSED_HEIGHT.test(style) && OVERFLOW_HIDDEN.test(style);
}

export interface VisibleEmailText {
  /** The text a recipient actually reads, with layout, styling and hidden elements removed. */
  text: string;
  /**
   * Characters of text that sat in elements hidden from the recipient. A large number is
   * itself a signal: hidden filler is a known way to push the real message out of a
   * content scanner's window.
   */
  hiddenTextLength: number;
}

/**
 * Reduce an email's HTML to the content a recipient sees, for content analysis.
 *
 * A tag-stripping regex is not enough. It drops the tags but keeps whatever sits between
 * them, so the CSS in a `<style>` block survives as text. The visual editor's wrapper
 * alone adds about 5 KB of CSS ahead of the message, which used to fill the analysis
 * window completely and hide the actual email from the phishing check. Senders can
 * also pad a message on purpose, with CSS or with hidden filler text, to push the real
 * content out of view.
 *
 * Two passes:
 * 1. `sanitize-html` removes everything a recipient never sees: `<head>`, `<style>`,
 *    `<script>`, comments, and elements hidden with inline styles or the `hidden` attribute.
 * 2. {@link htmlToPlainText} renders what remains the same way as the text/plain part
 *    of outgoing mail, with entities decoded and links shown as `text [url]`.
 */
export function extractVisibleEmailText(html: string): VisibleEmailText {
  let hiddenTextLength = 0;

  const visibleHtml = sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'html', 'body', 'center', 'font'],
    allowedAttributes: {'*': ['style', 'hidden'], a: ['href']},
    // Without this, sanitize-html drops a bare `hidden` attribute (empty value) before
    // the filter below can see it.
    nonBooleanAttributes: [],
    // Disallowed tags are unwrapped and their text is kept, except for these, whose
    // contents are discarded with them.
    nonTextTags: ['head', 'title', 'style', 'script', 'noscript', 'template', 'svg', 'textarea', 'option'],
    exclusiveFilter: frame => {
      if (!isHiddenElement(frame.attribs)) return false;
      hiddenTextLength += frame.text.trim().length;
      return true;
    },
  });

  return {text: htmlToPlainText(visibleHtml).trim(), hiddenTextLength};
}

/**
 * Cap text at `maxLength`, keeping both the start and the end of the message.
 *
 * Keeping only the start would let a sender put a long benign preamble ahead of the
 * payload; keeping only the end is open to the reverse. Keeping both ends means a
 * sender has to bury the payload in the middle of an unusually long email to slip
 * past, and the omission marker tells the model that something was cut.
 */
export function truncateForAnalysis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const headLength = Math.floor(maxLength * 0.75);
  const tailLength = maxLength - headLength;
  const omitted = text.length - headLength - tailLength;

  return `${text.slice(0, headLength)}\n[... ${omitted} characters omitted ...]\n${text.slice(-tailLength)}`;
}

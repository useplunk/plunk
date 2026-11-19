// Detects if HTML contains custom patterns that indicate it was written in the HTML editor
// rather than the visual editor. Custom HTML should render as-is without prose wrapper.
//
// The TipTap editor in EmailEditor.tsx loads: StarterKit (paragraphs, headings, lists,
// blockquote, code, hr, bold, italic, strike, etc.), TextAlign, Color, TextStyle, Link,
// ResizableImage, and VariableMention. Of these, TextStyle + Color + Link natively
// round-trip <span style="color: ..."> / <a style="color: ..."> markup that TipTap itself
// generates when you change text color or style a link. We must therefore PERMIT what
// TipTap can represent and REJECT only what it can't.
// TipTap's TextStyle + Color extensions only keep `color` on a <span>. The editor also
// emits `background-color: initial|transparent` as an export artifact, which is harmless.
// Any other declaration (a real background-color, font-size, ...) is dropped as soon as
// the HTML is loaded into the visual editor, so such a span counts as custom HTML.
const hasUnsupportedSpanStyle = (html: string): boolean => {
  const spanMatches = html.matchAll(/<span\b[^>]*?\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi);
  for (const match of spanMatches) {
    const declarations = (match[1] ?? match[2] ?? '').split(';');
    for (const declaration of declarations) {
      const separator = declaration.indexOf(':');
      if (separator === -1) continue;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim().toLowerCase();
      if (!property) continue;
      if (property === 'color') continue;
      if (property === 'background-color' && (value === 'initial' || value === 'transparent')) continue;
      return true;
    }
  }
  return false;
};

export const detectCustomHtmlPatterns = (html: string): boolean => {
  if (!html || html.trim() === '') return false;

  const classMatches = html.matchAll(/class\s*=\s*["']([^"']*)["']/gi);
  let hasCustomClasses = false;
  for (const match of classMatches) {
    const classValue = match[1];
    if (!classValue) continue;

    const classes = classValue.split(/\s+/).filter(c => c.length > 0);
    const allowedPrefixes = [
      'prose',
      'variable-',
      'email-image',
      'ProseMirror',
      'resizable-image',
      'selected',
      'resize-handle',
    ];
    const hasDisallowedClass = classes.some(cls => !allowedPrefixes.some(prefix => cls.startsWith(prefix)));
    if (hasDisallowedClass) {
      hasCustomClasses = true;
      break;
    }
  }

  // Custom attributes that carry semantics TipTap doesn't preserve. We require an
  // attribute-boundary (whitespace, `=`, or quote) before the prefix so that query
  // strings like `?id=...` inside an `href="..."` value don't false-match.
  const hasCustomAttributes = /<[a-z][^>]*?[\s"'](?:data-|aria-|role=|id=)/i.test(html);

  // Elements TipTap cannot round-trip with the currently-loaded extension set.
  // - No Table/TableRow/TableCell extensions are loaded -> all table markup is custom.
  // - No Div/Section/etc. block-layout extensions -> reject layout containers.
  // - Form/embed/media/interactive elements have no TipTap representation here.
  // <span> is intentionally NOT in this list: TipTap's TextStyle extension emits and
  // accepts <span style="..."> for text color (see hasUnsupportedSpanStyle for the rest).
  const hasCustomElements =
    /<(?:div|section|article|header|footer|nav|aside|main|table|tr|td|th|tbody|thead|tfoot|colgroup|col|form|input|button|select|textarea|iframe|video|audio|svg|object|embed|details|summary|dialog)\b/i.test(
      html,
    );

  const hasMediaQueries = /@media/i.test(html);
  const hasStyleTags = /<style[^>]*>/i.test(html);

  const hasCustomSpanStyle = hasUnsupportedSpanStyle(html);

  return (
    hasCustomClasses ||
    hasCustomAttributes ||
    hasCustomElements ||
    hasMediaQueries ||
    hasStyleTags ||
    hasCustomSpanStyle
  );
};

export const wrapEmailWithStyles = (htmlBody: string): string => {
  if (detectCustomHtmlPatterns(htmlBody)) {
    return htmlBody;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Base reset */
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      color: #111827;
    }

    /* Tailwind Typography (prose) base styles */
    .prose {
      color: #374151;
      max-width: 600px;
    }
    .prose [class~="lead"] {
      color: #4b5563;
      font-size: 1.25em;
      line-height: 1.6;
      margin-top: 1.2em;
      margin-bottom: 1.2em;
    }
    .prose a {
      color: #3b82f6;
      text-decoration: underline;
      font-weight: 500;
    }
    .prose strong {
      color: #111827;
      font-weight: 600;
    }
    .prose ol, .prose ul {
      margin-top: 1.25em;
      margin-bottom: 1.25em;
      padding-left: 1.625em;
    }
    .prose li {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
    .prose ol > li {
      padding-left: 0.375em;
    }
    .prose ul > li {
      padding-left: 0.375em;
    }
    .prose > ul > li p {
      margin-top: 0.75em;
      margin-bottom: 0.75em;
    }
    .prose > ul > li > *:first-child {
      margin-top: 1.25em;
    }
    .prose > ul > li > *:last-child {
      margin-bottom: 1.25em;
    }
    .prose > ol > li > *:first-child {
      margin-top: 1.25em;
    }
    .prose > ol > li > *:last-child {
      margin-bottom: 1.25em;
    }
    .prose ul ul, .prose ul ol, .prose ol ul, .prose ol ol {
      margin-top: 0.75em;
      margin-bottom: 0.75em;
    }
    .prose hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin-top: 3em;
      margin-bottom: 3em;
    }
    .prose blockquote {
      font-weight: 500;
      font-style: italic;
      color: #111827;
      border-left-width: 0.25rem;
      border-left-color: #e5e7eb;
      quotes: "\\201C""\\201D""\\2018""\\2019";
      margin-top: 1.6em;
      margin-bottom: 1.6em;
      padding-left: 1em;
    }
    .prose h1 {
      color: #111827;
      font-weight: 800;
      font-size: 2.25em;
      margin-top: 0;
      margin-bottom: 0.8888889em;
      line-height: 1.1111111;
    }
    .prose h2 {
      color: #111827;
      font-weight: 700;
      font-size: 1.5em;
      margin-top: 2em;
      margin-bottom: 1em;
      line-height: 1.3333333;
    }
    .prose h3 {
      color: #111827;
      font-weight: 600;
      font-size: 1.25em;
      margin-top: 1.6em;
      margin-bottom: 0.6em;
      line-height: 1.6;
    }
    .prose h4 {
      color: #111827;
      font-weight: 600;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.5;
    }
    .prose img {
      margin-top: 2em;
      margin-bottom: 2em;
    }
    .prose figure {
      margin-top: 2em;
      margin-bottom: 2em;
    }
    .prose figure > * {
      margin-top: 0;
      margin-bottom: 0;
    }
    .prose code {
      color: #111827;
      font-weight: 600;
      font-size: 0.875em;
    }
    .prose code::before {
      content: "\`";
    }
    .prose code::after {
      content: "\`";
    }
    .prose pre {
      color: #e5e7eb;
      background-color: #1f2937;
      overflow-x: auto;
      font-size: 0.875em;
      line-height: 1.7142857;
      margin-top: 1.7142857em;
      margin-bottom: 1.7142857em;
      border-radius: 0.375rem;
      padding-top: 0.8571429em;
      padding-right: 1.1428571em;
      padding-bottom: 0.8571429em;
      padding-left: 1.1428571em;
    }
    .prose pre code {
      background-color: transparent;
      border-width: 0;
      border-radius: 0;
      padding: 0;
      font-weight: 400;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      line-height: inherit;
    }
    .prose pre code::before {
      content: none;
    }
    .prose pre code::after {
      content: none;
    }
    .prose table {
      width: 100%;
      table-layout: auto;
      text-align: left;
      margin-top: 2em;
      margin-bottom: 2em;
      font-size: 0.875em;
      line-height: 1.7142857;
      border-collapse: collapse;
    }
    .prose thead {
      border-bottom-width: 1px;
      border-bottom-color: #d1d5db;
    }
    .prose thead th {
      color: #111827;
      font-weight: 600;
      vertical-align: bottom;
      padding-right: 0.5714286em;
      padding-bottom: 0.5714286em;
      padding-left: 0.5714286em;
    }
    .prose tbody tr {
      border-bottom-width: 1px;
      border-bottom-color: #e5e7eb;
    }
    .prose tbody tr:last-child {
      border-bottom-width: 0;
    }
    .prose tbody td {
      vertical-align: top;
      padding-top: 0.5714286em;
      padding-right: 0.5714286em;
      padding-bottom: 0.5714286em;
      padding-left: 0.5714286em;
    }
    .prose p {
      margin-top: 1.25em;
      margin-bottom: 1.25em;
    }

    /* prose-sm modifier */
    .prose-sm {
      font-size: 0.875rem;
      line-height: 1.7142857;
    }
    .prose-sm p {
      margin-top: 1.1428571em;
      margin-bottom: 1.1428571em;
    }
    .prose-sm h1 {
      font-size: 2.1428571em;
      margin-top: 0;
      margin-bottom: 0.8em;
      line-height: 1.2;
    }
    .prose-sm h2 {
      font-size: 1.4285714em;
      margin-top: 1.6em;
      margin-bottom: 0.8em;
      line-height: 1.4;
    }
    .prose-sm h3 {
      font-size: 1.2857143em;
      margin-top: 1.5555556em;
      margin-bottom: 0.4444444em;
      line-height: 1.5555556;
    }
    .prose-sm h4 {
      margin-top: 1.4285714em;
      margin-bottom: 0.5714286em;
      line-height: 1.4285714;
    }
    .prose-sm img {
      margin-top: 1.7142857em;
      margin-bottom: 1.7142857em;
    }
    .prose-sm ol, .prose-sm ul {
      margin-top: 1.1428571em;
      margin-bottom: 1.1428571em;
      padding-left: 1.5714286em;
    }
    .prose-sm li {
      margin-top: 0.2857143em;
      margin-bottom: 0.2857143em;
    }

    /* max-w-none utility */
    .max-w-none {
      max-width: none;
    }

    /* Custom editor styles */
    .variable-highlight, .variable-placeholder, .variable-mention {
      background-color: #dbeafe;
      color: #1e40af;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      display: inline;
    }

    .prose table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }

    .prose th, .prose td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
      min-width: 100px;
    }

    .prose th {
      background-color: #f3f4f6;
      font-weight: 600;
    }

    .prose img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 16px 0;
    }

    .prose .resizable-image-wrapper {
      display: block;
      margin: 16px 0;
    }

    .prose .resizable-image-container {
      display: inline-block;
      position: relative;
      max-width: 100%;
    }

    .prose .resizable-image-container img {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="prose prose-sm max-w-none">
    ${htmlBody}
  </div>
</body>
</html>`;
};

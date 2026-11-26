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

// Detects if HTML contains custom patterns that indicate it was written in the HTML editor
// rather than the visual editor. Custom HTML should render as-is without prose wrapper.
// Shared by the web preview and the API send path so a previewed email matches the sent one.
//
// The TipTap editor in apps/web EmailEditor.tsx loads: StarterKit (paragraphs, headings, lists,
// blockquote, code, hr, bold, italic, strike, etc.), TextAlign, Color, TextStyle, Link,
// ResizableImage, and VariableMention. Of these, TextStyle + Color + Link natively
// round-trip <span style="color: ..."> / <a style="color: ..."> markup that TipTap itself
// generates when you change text color or style a link. We must therefore PERMIT what
// TipTap can represent and REJECT only what it can't.
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

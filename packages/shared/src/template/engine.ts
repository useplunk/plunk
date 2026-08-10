import {Liquid} from 'liquidjs';

/**
 * Tags that resolve a partial by name through the file system. Template bodies are
 * authored by users, so leaving these enabled turns every template into an arbitrary
 * file read on the worker's disk (`{% render '../../.env' %}`). We both remove the
 * file system (`templates: {}` shadows the `root`/`partials`/`layouts` lookups) and
 * replace the tags, so authors get a clear message instead of a confusing ENOENT.
 */
const BLOCKED_TAGS = ['include', 'render', 'layout'] as const;

/**
 * DoS ceilings. Templates are user input and are rendered once per recipient, so a
 * single pathological template must not be able to stall a worker. The limits are far
 * above anything a real email needs — a 60 KB template renders in tens of
 * microseconds, so a 1 s render budget is roughly four orders of magnitude of slack.
 */
export const TEMPLATE_PARSE_LIMIT = 2_000_000;
export const TEMPLATE_RENDER_LIMIT_MS = 1_000;
export const TEMPLATE_MEMORY_LIMIT = 10_000_000;

/**
 * Key under which the render scope references itself. Liquid has no syntax for
 * looking up a top-level key that contains a space, and CSV imports routinely produce
 * them (a "First Name" header becomes the key `first name`). Templates referencing
 * those keys are rewritten to `__plunk["first name"]` during preprocessing.
 */
export const SCOPE_ALIAS = '__plunk';

/**
 * Preserves the pre-Liquid behaviour of outputting a bare array as an HTML list.
 *
 * Liquid joins arrays without a separator, which would silently mangle templates that
 * relied on `{{ items }}` rendering `<li>` elements. Registered as Liquid's
 * `outputEscape` hook, which appends itself to every output's filter chain — so
 * `{{ items | raw }}` opts out and `{% for %}` is unaffected.
 */
function renderArrayAsListItems(value: unknown): string {
  if (!Array.isArray(value)) {
    // Not necessarily a string: Liquid stringifies whatever we hand back, and
    // deferring to it keeps Drops, dates and numbers formatted exactly as usual.
    return value as string;
  }

  return value.map(item => `<li>${item ?? ''}</li>`).join('\n');
}

function createEngine({strictFilters}: {strictFilters: boolean}): Liquid {
  const engine = new Liquid({
    // No file system access whatsoever — see BLOCKED_TAGS.
    templates: {},
    relativeReference: false,
    // JavaScript truthiness. Contact data arrives from CSV imports and API payloads
    // where "key present but blank" is the norm, and Liquid's Shopify-compatible
    // truthiness would make `{% if firstName %}` true for an empty string.
    jsTruthy: true,
    // Contact data is unsanitised user input; never walk its prototype chain.
    ownPropertyOnly: true,
    // An unknown variable renders as an empty string, matching the previous
    // regex-based renderer. Templates are written against per-contact custom fields
    // that legitimately differ from contact to contact, so this can't be strict.
    strictVariables: false,
    strictFilters,
    parseLimit: TEMPLATE_PARSE_LIMIT,
    renderLimit: TEMPLATE_RENDER_LIMIT_MS,
    memoryLimit: TEMPLATE_MEMORY_LIMIT,
    outputEscape: renderArrayAsListItems,
  });

  for (const name of BLOCKED_TAGS) {
    engine.registerTag(name, {
      parse() {
        throw new Error(`The {% ${name} %} tag is not available in Plunk templates`);
      },
      render() {
        return '';
      },
    });
  }

  return engine;
}

/** Engine used for every send. Lenient: unknown filters and variables are skipped. */
export const renderEngine = createEngine({strictFilters: false});

/**
 * Engine used by `validateTemplate` at authoring time. Identical except that unknown
 * filters raise, so a typo like `{{ name | upcse }}` is reported while the author is
 * still editing rather than silently dropping the value from every email.
 */
export const validationEngine = createEngine({strictFilters: true});

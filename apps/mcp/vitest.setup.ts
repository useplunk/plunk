/**
 * The MCP server formats numbers with the host's default locale, which is what a user
 * running it locally should see. Tests assert on that text, so they pin the default to
 * en-US: on a machine set to French, 43812 would otherwise render as "43 812" and fail
 * assertions that have nothing to do with locale.
 *
 * Node reads its default locale from the OS (LANG is ignored on Windows), so the default
 * is pinned here rather than through the environment.
 */
const TEST_LOCALE = 'en-US';

const toLocaleString = Number.prototype.toLocaleString;

Number.prototype.toLocaleString = function (
  this: number,
  locales?: Intl.LocalesArgument,
  options?: Intl.NumberFormatOptions,
): string {
  return toLocaleString.call(this, locales ?? TEST_LOCALE, options);
};

import type {ParsedUrlQuery} from 'querystring';

/**
 * The public list-management pages (subscribe / unsubscribe / manage) are reached
 * from a link inside an email, which tags itself with `?e=<emailId>` so the
 * resulting subscription change can be attributed to the message that prompted
 * it. See `withSourceEmail` in the API's EmailHeaderService.
 *
 * The parameter is absent on mail sent before it existed, and on links a sender
 * built by hand, so everything here treats it as optional.
 */
export function getSourceEmailId(query: ParsedUrlQuery): string | undefined {
  const value = query.e;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * `?e=<id>` suffix for an API call, or an empty string when the page was reached
 * without a source email.
 */
export function sourceEmailQuery(query: ParsedUrlQuery): string {
  const sourceEmailId = getSourceEmailId(query);
  return sourceEmailId ? `?e=${encodeURIComponent(sourceEmailId)}` : '';
}

/**
 * Carry the source email across a hop between the list-management pages, so a
 * recipient who lands on `/manage` and then unsubscribes is still attributed to
 * the email they started from.
 */
export function withSourceEmail(path: string, query: ParsedUrlQuery): string {
  return `${path}${sourceEmailQuery(query)}`;
}

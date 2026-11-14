import {DASHBOARD_URI, LANDING_URI, NODE_ENV, WIKI_URI} from './constants.js';

/**
 * Origins allowed to make credentialed requests to the API.
 * Shared by the CORS middleware and the session cookie check in `parseJwt`, so the two cannot drift apart.
 */
export const ALLOWED_ORIGINS: (string | RegExp)[] =
  NODE_ENV === 'development'
    ? [/.*\.localhost:1000/, 'http://localhost:3000', 'http://localhost:4000']
    : [DASHBOARD_URI, LANDING_URI, WIKI_URI];

/**
 * Check whether an Origin header value is in the allow-list
 * @param origin The Origin header value
 */
export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some(allowed => (allowed instanceof RegExp ? allowed.test(origin) : allowed === origin));
}

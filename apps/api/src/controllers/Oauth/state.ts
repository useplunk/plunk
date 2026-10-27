import {randomBytes, timingSafeEqual} from 'node:crypto';
import type {Request, Response} from 'express';

import {API_URI, NODE_ENV} from '../../app/constants.js';

export const OAUTH_STATE_COOKIE = 'oauth_state';

const STATE_TTL_MS = 10 * 60 * 1000;

function stateCookieOptions(maxAge: number) {
  const isHttps = NODE_ENV === 'development' ? false : API_URI.startsWith('https://');

  // Lax so the cookie comes back on the provider's top-level redirect to the callback
  return {httpOnly: true, secure: isHttps, sameSite: 'lax', path: '/', maxAge} as const;
}

/**
 * Generate an OAuth `state` value and bind it to this browser with a short-lived cookie.
 * Without it, an attacker can complete the flow with their own provider account and send the
 * victim the callback URL, signing the victim into the attacker's Plunk account (login CSRF).
 * @param res The express response object
 */
export function issueOAuthState(res: Response): string {
  const state = randomBytes(32).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, stateCookieOptions(STATE_TTL_MS));
  return state;
}

/**
 * Check the callback's `state` against the cookie set by `issueOAuthState`, and clear the cookie so it is single use
 * @param req The express request object
 * @param res The express response object
 */
export function verifyOAuthState(req: Request, res: Response): boolean {
  const expected: unknown = req.cookies?.[OAUTH_STATE_COOKIE];
  const received = req.query.state;

  res.clearCookie(OAUTH_STATE_COOKIE, stateCookieOptions(0));

  if (typeof expected !== 'string' || typeof received !== 'string' || expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

import signale from 'signale';

import {TURNSTILE_ENABLED, TURNSTILE_SECRET_KEY} from '../app/constants.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 10_000;
// Cloudflare documents 2048 as the maximum token length
const MAX_TOKEN_LENGTH = 2048;

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

export class TurnstileService {
  /**
   * Verify a Turnstile token with Cloudflare. Always true when Turnstile is not configured.
   * Fails closed: a timeout or network error rejects the request, because an attacker who can
   * provoke failures should not be able to skip the check.
   */
  public static async verify(token: string | undefined): Promise<boolean> {
    if (!TURNSTILE_ENABLED) {
      return true;
    }

    if (!token || token.length > MAX_TOKEN_LENGTH) {
      return false;
    }

    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({secret: TURNSTILE_SECRET_KEY, response: token}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const result = (await response.json()) as SiteverifyResponse;

      if (!result.success) {
        const codes = result['error-codes'] ?? [];
        // Secret misconfiguration blocks every login; make it loud rather than look like bot traffic
        if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
          signale.error('[TURNSTILE] Siteverify rejected the secret key; check TURNSTILE_SECRET_KEY');
        }
      }

      return result.success === true;
    } catch (error) {
      signale.error('[TURNSTILE] Siteverify request failed:', error);
      return false;
    }
  }
}

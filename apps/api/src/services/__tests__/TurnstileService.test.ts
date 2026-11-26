import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const constants = vi.hoisted(() => ({TURNSTILE_ENABLED: true, TURNSTILE_SECRET_KEY: 'test-secret'}));

vi.mock('../../app/constants.js', () => ({
  get TURNSTILE_ENABLED() {
    return constants.TURNSTILE_ENABLED;
  },
  TURNSTILE_SECRET_KEY: constants.TURNSTILE_SECRET_KEY,
}));

import {TurnstileService} from '../TurnstileService';

const fetchMock = vi.fn();

function siteverifyReturns(body: unknown) {
  fetchMock.mockResolvedValueOnce({json: async () => body});
}

describe('TurnstileService.verify', () => {
  beforeEach(() => {
    constants.TURNSTILE_ENABLED = true;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes without calling Cloudflare when Turnstile is not configured', async () => {
    constants.TURNSTILE_ENABLED = false;

    expect(await TurnstileService.verify(undefined)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing token without calling Cloudflare', async () => {
    expect(await TurnstileService.verify(undefined)).toBe(false);
    expect(await TurnstileService.verify('')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a token over the 2048 character limit', async () => {
    expect(await TurnstileService.verify('a'.repeat(2049))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the secret and token to siteverify and accepts a successful result', async () => {
    siteverifyReturns({success: true});

    expect(await TurnstileService.verify('good-token')).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(JSON.parse(init.body)).toEqual({secret: 'test-secret', response: 'good-token'});
  });

  it('rejects a token Cloudflare marks as invalid or already used', async () => {
    siteverifyReturns({success: false, 'error-codes': ['timeout-or-duplicate']});

    expect(await TurnstileService.verify('used-token')).toBe(false);
  });

  it('fails closed when siteverify is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    expect(await TurnstileService.verify('token')).toBe(false);
  });
});

import {afterEach, describe, expect, it, vi} from 'vitest';

import {PlunkApiError, PlunkClient} from '../client.js';
import type {PlunkMcpConfig} from '../config.js';

const config: PlunkMcpConfig = {
  apiKey: 'sk_test',
  apiUrl: 'https://api.example.com',
  readOnly: false,
};

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const response = new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json', ...headers},
  });

  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlunkClient', () => {
  it('sends the secret key as a bearer token', async () => {
    const spy = mockFetch(200, {ok: true});

    await new PlunkClient(config).request({path: '/contacts'});

    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toBe('https://api.example.com/contacts');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk_test');
  });

  it('omits empty query parameters rather than sending blanks', async () => {
    const spy = mockFetch(200, {ok: true});

    await new PlunkClient(config).request({
      path: '/contacts',
      query: {search: 'ada', subscribed: undefined, cursor: ''},
    });

    expect(String(spy.mock.calls[0]![0])).toBe('https://api.example.com/contacts?search=ada');
  });

  it('surfaces Retry-After on a rate limit so the agent can back off', async () => {
    mockFetch(429, {error: {code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded.'}}, {'Retry-After': '12'});

    const error = await new PlunkClient(config).request({path: '/contacts'}).catch((e: unknown) => e as PlunkApiError);

    expect(error).toBeInstanceOf(PlunkApiError);
    expect(error.retryAfterSeconds).toBe(12);
    expect(error.message).toMatch(/wait 12s/i);
  });

  it('flattens field-level validation errors into the message', async () => {
    // A 422 is the case where the model can actually fix its own input, but
    // only if it is told which field was wrong.
    mockFetch(422, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: [{field: 'email', message: 'must be a valid email'}],
      },
    });

    const error = await new PlunkClient(config).request({path: '/contacts'}).catch((e: unknown) => e as PlunkApiError);

    expect(error.message).toContain('email: must be a valid email');
  });

  it('explains a 401 in terms of the key that is configured', async () => {
    mockFetch(401, {error: {code: 'INVALID_API_KEY', message: 'Invalid secret API key.'}});

    const error = await new PlunkClient(config).request({path: '/contacts'}).catch((e: unknown) => e as PlunkApiError);

    expect(error.message).toMatch(/PLUNK_API_KEY/);
  });

  it('refuses a public-key call when no public key is configured', async () => {
    const error = await new PlunkClient(config)
      .request({path: '/v1/track', usePublicKey: true})
      .catch((e: unknown) => e as PlunkApiError);

    expect(error.code).toBe('MISSING_PUBLIC_KEY');
  });

  it('reports an unreachable instance against the configured URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const error = await new PlunkClient(config).request({path: '/contacts'}).catch((e: unknown) => e as PlunkApiError);

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toContain('https://api.example.com');
  });
});

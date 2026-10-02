import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../database/prisma.js', () => ({prisma: {}}));
vi.mock('../../database/redis.js', () => ({wrapRedis: vi.fn()}));

// constants.ts reads API_URI at import time, so each case imports a fresh copy.
async function cookieDomainFor(apiUri: string) {
  vi.resetModules();
  vi.stubEnv('API_URI', apiUri);

  const {UserService} = await import('../UserService.js');
  return UserService.cookieOptions().domain;
}

describe('UserService.cookieOptions domain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['https://api.example.com', '.example.com'],
    ['https://api.example.com.br', '.example.com.br'],
    ['https://api.plunk.example.com.br', '.example.com.br'],
    ['https://api.example.co.uk', '.example.co.uk'],
    ['https://api.example.com.au', '.example.com.au'],
    ['https://plunk-api.up.railway.app', '.plunk-api.up.railway.app'],
    ['http://app.plunk.local', '.plunk.local'],
    ['http://api.localhost', '.localhost'],
  ])('scopes the cookie for %s to %s', async (apiUri, expected) => {
    expect(await cookieDomainFor(apiUri)).toBe(expected);
  });

  it.each(['http://localhost:8080', 'http://127.0.0.1:8080'])('sets no domain for %s', async apiUri => {
    expect(await cookieDomainFor(apiUri)).toBeUndefined();
  });
});

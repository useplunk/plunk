import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../database/prisma.js', () => ({prisma: {}}));
vi.mock('../../database/redis.js', () => ({wrapRedis: vi.fn()}));

// constants.ts reads the URIs at import time, so each case imports a fresh copy.
async function sameSiteFor(apiUri: string, dashboardUri: string) {
  vi.resetModules();
  vi.stubEnv('API_URI', apiUri);
  vi.stubEnv('DASHBOARD_URI', dashboardUri);

  const {UserService} = await import('../UserService.js');
  return UserService.cookieOptions().sameSite;
}

describe('UserService.cookieOptions sameSite', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['https://next-api.useplunk.com', 'https://next-app.useplunk.com'],
    ['https://api.example.co.uk', 'https://example.co.uk'],
    ['https://plunk.example.com', 'https://plunk.example.com'],
  ])('is lax when the API (%s) and dashboard (%s) are the same site', async (apiUri, dashboardUri) => {
    expect(await sameSiteFor(apiUri, dashboardUri)).toBe('lax');
  });

  it.each([
    ['https://api.example.com', 'https://dashboard.other.com'],
    // Different private suffix registrations are separate sites to browsers
    ['https://plunk-api.up.railway.app', 'https://plunk-app.up.railway.app'],
    ['https://api.example.com', 'http://app.example.com'],
  ])('is none when the API (%s) and dashboard (%s) are cross-site', async (apiUri, dashboardUri) => {
    expect(await sameSiteFor(apiUri, dashboardUri)).toBe('none');
  });

  it('is lax over plain HTTP', async () => {
    expect(await sameSiteFor('http://api.example.com', 'http://app.other.com')).toBe('lax');
  });
});

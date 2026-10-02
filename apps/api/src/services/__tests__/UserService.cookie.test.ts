import express from 'express';
import request from 'supertest';
import {describe, expect, it, vi} from 'vitest';

vi.mock('../../app/constants.js', () => ({
  API_URI: 'https://api.example.com',
  DASHBOARD_URI: 'https://app.example.com',
  NODE_ENV: 'production',
}));

vi.mock('../../database/prisma.js', () => ({prisma: {}}));
vi.mock('../../database/redis.js', () => ({wrapRedis: vi.fn()}));

import {getCookieSameSite, UserService} from '../UserService.js';

function createCookieApp(action: 'clear' | 'set') {
  const app = express();

  app.get('/', (_req, res) => {
    if (action === 'set') {
      UserService.setAuthCookie(res, 'signed-token').json(true);
    } else {
      UserService.clearAuthCookie(res).json(true);
    }
  });

  return app;
}

function setCookieHeaders(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

describe('authentication cookie scope', () => {
  it('uses Public Suffix List semantics for same-site decisions', () => {
    expect(getCookieSameSite('https://api.example.co.uk', 'https://app.example.co.uk', true)).toBe('lax');
    expect(
      getCookieSameSite(
        'https://plunk-api-production-7c42.up.railway.app',
        'https://plunk-dashboard-production-e2e5.up.railway.app',
        true,
      ),
    ).toBe('none');
    expect(getCookieSameSite('http://api.example.com', 'http://app.example.com', false)).toBe('lax');
  });

  it('expires the legacy domain cookie before setting a host-only cookie', async () => {
    const response = await request(createCookieApp('set')).get('/');
    const cookies = setCookieHeaders(response);

    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('next_token=;');
    expect(cookies[0]).toContain('Domain=.example.com');
    expect(cookies[0]).toContain('Expires=');
    expect(cookies[1]).toContain('next_token=signed-token;');
    expect(cookies[1]).not.toContain('Domain=');
    expect(cookies[1]).toContain('Path=/');
    expect(cookies[1]).toContain('HttpOnly');
    expect(cookies[1]).toContain('Secure');
    expect(cookies[1]).toContain('SameSite=Lax');
  });

  it('expires both the legacy domain cookie and the current host-only cookie on logout', async () => {
    const response = await request(createCookieApp('clear')).get('/');
    const cookies = setCookieHeaders(response);

    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('Domain=.example.com');
    expect(cookies[0]).toContain('Expires=');
    expect(cookies[1]).not.toContain('Domain=');
    expect(cookies[1]).toContain('Expires=');
  });
});

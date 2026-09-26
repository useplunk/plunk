import type {NextFunction, Request, Response} from 'express';
import express from 'express';
import request from 'supertest';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories} from '../../../../../test/helpers/index.js';
import {NtfyService} from '../../services/NtfyService.js';
import {Auth} from '../Auth.js';

vi.mock('../../app/constants.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../app/constants.js')>()),
  DISABLE_SIGNUPS: false,
  PLUNK_ENABLED: false,
  VERIFY_EMAIL_ON_SIGNUP: false,
}));

function createAuthApp() {
  const app = express();
  const auth = new Auth();

  app.use(express.json());
  app.post('/auth/login', (req, res, next) => void auth.login(req, res, next));
  app.post('/auth/signup', (req, res, next) => void auth.signup(req, res, next));
  app.get('/auth/logout', (req, res) => auth.logout(req, res));
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({success: false, error: error.message});
  });

  return app;
}

function currentCookie(response: request.Response): string {
  const header = response.headers['set-cookie'];
  if (!header) return '';
  const cookies = Array.isArray(header) ? header : [header];
  return cookies.at(-1) ?? '';
}

describe('authentication response cookies', () => {
  beforeEach(() => {
    vi.spyOn(NtfyService, 'notifyUserSignup').mockResolvedValue(undefined);
  });

  it('sets a host-only cookie on signup', async () => {
    const response = await request(createAuthApp()).post('/auth/signup').send({
      email: 'cookie-signup@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(currentCookie(response)).toContain('next_token=');
    expect(currentCookie(response)).not.toContain('Domain=');
  });

  it('sets a host-only cookie on login', async () => {
    await factories.createUser({email: 'cookie-login@example.com', password: 'password123'});

    const response = await request(createAuthApp()).post('/auth/login').send({
      email: 'cookie-login@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(currentCookie(response)).toContain('next_token=');
    expect(currentCookie(response)).not.toContain('Domain=');
  });

  it('expires a host-only cookie on logout', async () => {
    const response = await request(createAuthApp()).get('/auth/logout');

    expect(response.status).toBe(200);
    expect(currentCookie(response)).toContain('next_token=;');
    expect(currentCookie(response)).toContain('Expires=');
    expect(currentCookie(response)).not.toContain('Domain=');
  });
});

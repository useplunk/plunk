import cookies from 'cookie-parser';
import express, {json, type NextFunction, type Request, type Response} from 'express';
import request from 'supertest';
import {describe, expect, it} from 'vitest';

import {DASHBOARD_URI} from '../../app/constants';
import {HttpException} from '../../exceptions/index';
import {isAuthenticated, jwt} from '../auth';

/**
 * GHSA-9g9f-4cpj-p2jv: cookie-only routes ran for cross-site form submissions, because CORS hides the
 * response but does not stop the request. These drive a real Express stack with a valid session cookie
 * and a form-encoded body, the shape a malicious page can send without triggering a preflight.
 */
function createApp() {
  const app = express();
  app.use(json());
  app.use(cookies());

  app.post('/users/@me/projects/:id/reset', isAuthenticated, (_req, res) => {
    res.json({success: true, userId: res.locals.auth.userId});
  });
  app.get('/users/@me', isAuthenticated, (_req, res) => {
    res.json({success: true});
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof HttpException ? error.code : 500;
    res.status(status).json({success: false});
  });

  return app;
}

const app = createApp();
const userId = 'user-1';
const sessionCookie = `next_token=${jwt.sign(userId)}`;

function crossSiteReset(origin?: string) {
  const req = request(app)
    .post('/users/@me/projects/project-1/reset')
    .set('Cookie', sessionCookie)
    .type('form')
    .send('x=1');

  return origin === undefined ? req : req.set('Origin', origin);
}

describe('session cookie origin check', () => {
  it('rejects a cross-site form submission carrying a valid session', async () => {
    const res = await crossSiteReset('https://evil.example');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects an opaque origin (sandboxed iframes, cross-site redirects)', async () => {
    const res = await crossSiteReset('null');

    expect(res.status).toBe(403);
  });

  it('allows the dashboard origin', async () => {
    const res = await crossSiteReset(DASHBOARD_URI);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId);
  });

  it('allows requests without an Origin header (non-browser clients)', async () => {
    const res = await crossSiteReset();

    expect(res.status).toBe(200);
  });

  it('leaves safe methods alone, since CORS already keeps their responses from other origins', async () => {
    const res = await request(app).get('/users/@me').set('Cookie', sessionCookie).set('Origin', 'https://evil.example');

    expect(res.status).toBe(200);
  });

  it('rejects a cross-site request before reading the cookie', async () => {
    const res = await request(app)
      .post('/users/@me/projects/project-1/reset')
      .set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
  });
});

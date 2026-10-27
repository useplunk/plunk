import cookies from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import {describe, expect, it} from 'vitest';

import {issueOAuthState, OAUTH_STATE_COOKIE, verifyOAuthState} from '../Oauth/state';

function createApp() {
  const app = express();
  app.use(cookies());

  app.get('/outbound', (_req, res) => {
    res.json({state: issueOAuthState(res)});
  });
  app.get('/callback', (req, res) => {
    res.json({valid: verifyOAuthState(req, res)});
  });

  return app;
}

const app = createApp();

async function startFlow() {
  const res = await request(app).get('/outbound');
  const cookie = (res.headers['set-cookie'] as unknown as string[]).find(c => c.startsWith(`${OAUTH_STATE_COOKIE}=`))!;

  return {state: res.body.state as string, cookie: cookie.split(';')[0]};
}

describe('OAuth state', () => {
  it('binds the state to the browser with an httpOnly, lax cookie', async () => {
    const res = await request(app).get('/outbound');
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];

    expect(res.body.state).toMatch(/^[0-9a-f]{64}$/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('accepts a callback from the browser that started the flow', async () => {
    const {state, cookie} = await startFlow();

    const res = await request(app).get('/callback').query({state}).set('Cookie', cookie);

    expect(res.body.valid).toBe(true);
  });

  it('rejects a callback without the state cookie (a link sent to a victim)', async () => {
    const {state} = await startFlow();

    const res = await request(app).get('/callback').query({state});

    expect(res.body.valid).toBe(false);
  });

  it('rejects a mismatched state', async () => {
    const {cookie} = await startFlow();
    const {state: otherState} = await startFlow();

    const res = await request(app).get('/callback').query({state: otherState}).set('Cookie', cookie);

    expect(res.body.valid).toBe(false);
  });

  it('rejects a missing state', async () => {
    const {cookie} = await startFlow();

    const res = await request(app).get('/callback').set('Cookie', cookie);

    expect(res.body.valid).toBe(false);
  });

  it('clears the state cookie so it cannot be replayed', async () => {
    const {state, cookie} = await startFlow();

    const res = await request(app).get('/callback').query({state}).set('Cookie', cookie);
    const cleared = (res.headers['set-cookie'] as unknown as string[])[0];

    expect(cleared).toMatch(new RegExp(`^${OAUTH_STATE_COOKIE}=;`));
  });
});

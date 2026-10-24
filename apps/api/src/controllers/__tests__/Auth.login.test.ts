import {randomUUID} from 'node:crypto';
import type {Request, Response} from 'express';
import {describe, expect, it, vi} from 'vitest';

// The per-IP counter ships disabled (see constants.ts). Enable it before constants.ts
// is evaluated so both counters are exercised.
vi.hoisted(() => {
  process.env.LOGIN_RATE_LIMIT_PER_EMAIL = '5';
  process.env.LOGIN_RATE_LIMIT_PER_IP = '20';
  process.env.LOGIN_RATE_LIMIT_WINDOW = '900';
});

import {redis} from '../../database/redis.js';
import {ErrorCode, HttpException} from '../../exceptions/index.js';
import {Keys} from '../../services/keys.js';
import {Auth} from '../Auth.js';
import {factories} from '../../../../../test/helpers';

/**
 * These run against the worker's real Redis (see test/setup.ts), since the counters
 * and their expiry live there. Every test uses a fresh email and IP, so counters left
 * behind by one test can't leak into another.
 */

interface LoginOutcome {
  body?: {success: boolean | string; data?: unknown};
  error?: unknown;
  headers: Record<string, string>;
}

/**
 * Invoke the login handler and resolve with whatever it sent or passed to `next`.
 * `CatchAsync` does not return its promise, so the response itself is the signal.
 */
function login(email: string, password: string, ip: string): Promise<LoginOutcome> {
  return new Promise(resolve => {
    const headers: Record<string, string> = {};

    const res = {
      set(field: string, value: string) {
        headers[field] = value;
        return res;
      },
      cookie() {
        return res;
      },
      json(body: LoginOutcome['body']) {
        resolve({body, headers});
        return res;
      },
    } as unknown as Response;

    const req = {body: {email, password}, ip, socket: {}} as unknown as Request;

    void new Auth().login(req, res, (error?: unknown) => resolve({error, headers}));
  });
}

function uniqueIp() {
  return `test-${randomUUID()}`;
}

function expectRateLimited(outcome: LoginOutcome) {
  expect(outcome.error).toBeInstanceOf(HttpException);
  expect((outcome.error as HttpException).code).toBe(429);
  expect((outcome.error as HttpException).errorCode).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
  expect(Number(outcome.headers['Retry-After'])).toBeGreaterThan(0);
}

describe('POST /auth/login rate limiting', () => {
  it('still lets the right password in while under the per-email limit', async () => {
    const user = await factories.createUser();
    const ip = uniqueIp();

    for (let i = 0; i < 4; i++) {
      const outcome = await login(user.email, 'wrong-password', ip);
      expect(outcome.body).toEqual({success: false, data: 'Incorrect email or password'});
    }

    const outcome = await login(user.email, 'password123', ip);
    expect(outcome.body?.success).toBe(true);
  });

  it('refuses the email once the limit is exceeded, even with the right password', async () => {
    const user = await factories.createUser();
    const ip = uniqueIp();

    for (let i = 0; i < 5; i++) {
      await login(user.email, 'wrong-password', ip);
    }

    expectRateLimited(await login(user.email, 'password123', ip));
    // The counter is per email, not per casing of it.
    expectRateLimited(await login(user.email.toUpperCase(), 'password123', uniqueIp()));
  });

  it('does not let concurrent guesses slip past the per-email limit', async () => {
    const user = await factories.createUser();
    const ip = uniqueIp();

    const outcomes = await Promise.all(Array.from({length: 15}, () => login(user.email, 'wrong-password', ip)));

    expect(outcomes.filter(outcome => outcome.body).length).toBe(5);
    expect(outcomes.filter(outcome => outcome.error).length).toBe(10);
  });

  it('limits an unknown email exactly like a wrong password', async () => {
    const email = `missing-${randomUUID()}@test.com`;
    const ip = uniqueIp();

    for (let i = 0; i < 5; i++) {
      const outcome = await login(email, 'wrong-password', ip);
      expect(outcome.body).toEqual({success: false, data: 'Incorrect email or password'});
    }

    expectRateLimited(await login(email, 'wrong-password', ip));
  });

  it('does not extend the window while attempts continue', async () => {
    const user = await factories.createUser();
    const ip = uniqueIp();
    const key = Keys.User.loginFailuresByEmail(user.email);

    await login(user.email, 'wrong-password', ip);
    await redis.expire(key, 100);

    for (let i = 0; i < 6; i++) {
      await login(user.email, 'wrong-password', ip);
    }

    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(100);
  });

  it('resets the email counter after a successful login', async () => {
    const user = await factories.createUser();
    const ip = uniqueIp();

    for (let i = 0; i < 4; i++) {
      await login(user.email, 'wrong-password', ip);
    }

    expect((await login(user.email, 'password123', ip)).body?.success).toBe(true);

    for (let i = 0; i < 5; i++) {
      const outcome = await login(user.email, 'wrong-password', ip);
      expect(outcome.body?.success).toBe(false);
    }

    expectRateLimited(await login(user.email, 'wrong-password', ip));
  });

  it('refuses an IP after too many failures across different emails', async () => {
    const ip = uniqueIp();

    for (let i = 0; i < 20; i++) {
      const outcome = await login(`missing-${randomUUID()}@test.com`, 'wrong-password', ip);
      expect(outcome.body?.success).toBe(false);
    }

    const user = await factories.createUser();
    expectRateLimited(await login(user.email, 'password123', ip));
    // Another address is unaffected.
    expect((await login(user.email, 'password123', uniqueIp())).body?.success).toBe(true);
  });

  it('does not charge an IP for successful logins', async () => {
    const user = await factories.createUser();
    const ip = uniqueIp();

    for (let i = 0; i < 25; i++) {
      expect((await login(user.email, 'password123', ip)).body?.success).toBe(true);
    }
  });
});

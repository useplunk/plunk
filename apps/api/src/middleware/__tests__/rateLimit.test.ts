import {randomUUID} from 'node:crypto';
import type {Request, Response} from 'express';
import {describe, expect, it} from 'vitest';

import {ErrorCode, HttpException} from '../../exceptions/index.js';
import {rateLimit} from '../rateLimit.js';

/**
 * These run against the worker's real Redis (see test/setup.ts) rather than a mock,
 * because the behaviour under test lives in the Lua script — refill maths, the
 * clock read, and the atomicity that stops concurrent requests from each spending
 * the same token. A mocked client would only assert that we call it.
 */

function createResponse(projectId?: string) {
  const headers: Record<string, string> = {};

  const res = {
    locals: {auth: projectId ? {type: 'apiKey', projectId} : undefined},
    set(field: string | Record<string, string>, value?: string) {
      if (typeof field === 'string') {
        headers[field] = value as string;
      } else {
        Object.assign(headers, field);
      }
      return res;
    },
  } as unknown as Response;

  return {res, headers};
}

const request = {method: 'POST', path: '/v1/track'} as unknown as Request;

/** Resolve with whatever the middleware passes to next() — an error, or undefined. */
function run(middleware: ReturnType<typeof rateLimit>, res: Response): Promise<unknown> {
  return new Promise(resolve => {
    void middleware(request, res, (error?: unknown) => resolve(error) as unknown as void);
  });
}

describe('Rate Limit Middleware', () => {
  it('allows requests up to the burst ceiling and reports the remaining budget', async () => {
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 1, burst: 3});
    const projectId = randomUUID();

    for (let i = 0; i < 3; i++) {
      const {res, headers} = createResponse(projectId);

      expect(await run(limiter, res)).toBeUndefined();
      expect(headers['RateLimit-Limit']).toBe('3');
      expect(headers['RateLimit-Remaining']).toBe(String(2 - i));
    }
  });

  it('refuses the request once the burst is spent, with a retry hint', async () => {
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 1, burst: 2});
    const projectId = randomUUID();

    await run(limiter, createResponse(projectId).res);
    await run(limiter, createResponse(projectId).res);

    const {res, headers} = createResponse(projectId);
    const error = await run(limiter, res);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).code).toBe(429);
    expect((error as HttpException).errorCode).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(headers['RateLimit-Remaining']).toBe('0');
    // Never advertise an immediate retry — that guarantees a second rejection.
    expect(Number(headers['Retry-After'])).toBeGreaterThanOrEqual(1);
  });

  it('refills over time so a throttled caller recovers without resetting the bucket', async () => {
    // 20/s refills a single token in ~50ms, keeping the test honest but quick.
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 20, burst: 1});
    const projectId = randomUUID();

    expect(await run(limiter, createResponse(projectId).res)).toBeUndefined();
    expect(await run(limiter, createResponse(projectId).res)).toBeInstanceOf(HttpException);

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(await run(limiter, createResponse(projectId).res)).toBeUndefined();
  });

  it('never refills past the burst ceiling while idle', async () => {
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 100, burst: 2});
    const projectId = randomUUID();

    await run(limiter, createResponse(projectId).res);
    // Long enough at 100/s to have accrued far more than the ceiling.
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(await run(limiter, createResponse(projectId).res)).toBeUndefined();
    expect(await run(limiter, createResponse(projectId).res)).toBeUndefined();
    expect(await run(limiter, createResponse(projectId).res)).toBeInstanceOf(HttpException);
  });

  it('gives each project its own budget', async () => {
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 1, burst: 1});
    const noisy = randomUUID();

    await run(limiter, createResponse(noisy).res);
    expect(await run(limiter, createResponse(noisy).res)).toBeInstanceOf(HttpException);

    // A different project is unaffected by the first one exhausting its bucket.
    expect(await run(limiter, createResponse(randomUUID()).res)).toBeUndefined();
  });

  it('gives each bucket its own budget for the same project', async () => {
    const projectId = randomUUID();
    const first = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 1, burst: 1});
    const second = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 1, burst: 1});

    await run(first, createResponse(projectId).res);
    expect(await run(first, createResponse(projectId).res)).toBeInstanceOf(HttpException);

    // Saturating contact sync must not also block transactional sends.
    expect(await run(second, createResponse(projectId).res)).toBeUndefined();
  });

  it('is disabled when the bucket rate is zero', async () => {
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 0, burst: 0});
    const projectId = randomUUID();

    for (let i = 0; i < 5; i++) {
      const {res, headers} = createResponse(projectId);

      expect(await run(limiter, res)).toBeUndefined();
      // A disabled bucket costs nothing and advertises nothing.
      expect(headers['RateLimit-Limit']).toBeUndefined();
    }
  });

  it('passes through a request with no resolved project', async () => {
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 1, burst: 1});

    for (let i = 0; i < 3; i++) {
      expect(await run(limiter, createResponse().res)).toBeUndefined();
    }
  });

  it('does not let concurrent requests overspend the bucket', async () => {
    const limiter = rateLimit({name: `test:${randomUUID()}`, refillPerSecond: 1, burst: 5});
    const projectId = randomUUID();

    const results = await Promise.all(
      Array.from({length: 20}, () => run(limiter, createResponse(projectId).res)),
    );

    // Exactly the burst is granted; a read-then-write check would let more through.
    expect(results.filter(error => error === undefined)).toHaveLength(5);
  });
});

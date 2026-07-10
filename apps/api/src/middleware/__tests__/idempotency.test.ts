import type {Request, Response} from 'express';
import {EventEmitter} from 'node:events';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {ErrorCode, HttpException} from '../../exceptions/index.js';
import {idempotency} from '../idempotency.js';

/**
 * Minimal Response stand-in: the middleware only needs res.locals and the
 * 'finish' event, which it uses to settle the claim once the handler responds.
 */
function createResponse(projectId: string) {
  const res = new EventEmitter() as unknown as Response & {statusCode: number};
  res.locals = {auth: {type: 'secret', projectId}};
  res.statusCode = 200;
  return res;
}

function createRequest(key?: string): Request {
  return {
    method: 'POST',
    path: '/v1/send',
    headers: key === undefined ? {} : {'idempotency-key': key},
  } as unknown as Request;
}

/** Resolve once the middleware calls next(), returning whatever it passed. */
function run(req: Request, res: Response): Promise<unknown> {
  return new Promise(resolve => {
    void idempotency(req, res, (error?: unknown) => resolve(error) as unknown as void);
  });
}

/** The claim is settled in a 'finish' listener that we deliberately do not await. */
async function respond(res: Response & {statusCode: number}, statusCode: number) {
  res.statusCode = statusCode;
  res.emit('finish');
  await vi.waitFor(async () => {
    // Settled means the row is either gone (4xx) or has a statusCode written.
    const rows = await getPrismaClient().idempotencyKey.findMany({where: {statusCode: null}});
    expect(rows).toHaveLength(0);
  });
}

describe('Idempotency Middleware', () => {
  const prisma = getPrismaClient();
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  it('is a no-op when no Idempotency-Key header is present', async () => {
    const error = await run(createRequest(), createResponse(projectId));

    expect(error).toBeUndefined();
    expect(await prisma.idempotencyKey.count()).toBe(0);
  });

  it('claims the key before the handler runs', async () => {
    const error = await run(createRequest('key-alpha'), createResponse(projectId));

    expect(error).toBeUndefined();

    const claim = await prisma.idempotencyKey.findUniqueOrThrow({
      where: {projectId_key: {projectId, key: 'key-alpha'}},
    });
    expect(claim.method).toBe('POST');
    expect(claim.path).toBe('/v1/send');
    // Null until the response settles the claim
    expect(claim.statusCode).toBeNull();
    expect(claim.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('refuses a reused key with 409', async () => {
    const first = createResponse(projectId);
    await run(createRequest('key-reused'), first);
    await respond(first, 200);

    const error = await run(createRequest('key-reused'), createResponse(projectId));

    expect(error).toBeInstanceOf(HttpException);
    const httpError = error as HttpException;
    expect(httpError.code).toBe(409);
    expect(httpError.errorCode).toBe(ErrorCode.IDEMPOTENCY_KEY_REUSED);
    expect(httpError.details).toMatchObject({
      key: 'key-reused',
      originalRequest: 'POST /v1/send',
      originalStatusCode: 200,
    });
  });

  it('refuses a reused key while the original request is still in flight', async () => {
    // No respond() call: the first claim is unsettled, mimicking a concurrent retry
    await run(createRequest('key-inflight'), createResponse(projectId));

    const error = await run(createRequest('key-inflight'), createResponse(projectId));

    expect((error as HttpException).code).toBe(409);
    expect((error as HttpException).details).toMatchObject({originalStatusCode: null});
  });

  it('scopes keys to a project, so a different project may reuse the same key', async () => {
    await run(createRequest('key-shared'), createResponse(projectId));

    const {project: other} = await factories.createUserWithProject();
    const error = await run(createRequest('key-shared'), createResponse(other.id));

    expect(error).toBeUndefined();
    expect(await prisma.idempotencyKey.count({where: {key: 'key-shared'}})).toBe(2);
  });

  it('releases the claim on a 4xx so the caller can fix the request and retry', async () => {
    const res = createResponse(projectId);
    await run(createRequest('key-4xx'), res);
    await respond(res, 422);

    expect(await prisma.idempotencyKey.count({where: {key: 'key-4xx'}})).toBe(0);

    // The same key is now free
    const retry = await run(createRequest('key-4xx'), createResponse(projectId));
    expect(retry).toBeUndefined();
  });

  it('keeps the claim on a 5xx, because side effects are in an unknown state', async () => {
    const res = createResponse(projectId);
    await run(createRequest('key-5xx'), res);
    await respond(res, 500);

    const claim = await prisma.idempotencyKey.findUniqueOrThrow({
      where: {projectId_key: {projectId, key: 'key-5xx'}},
    });
    expect(claim.statusCode).toBe(500);

    const retry = await run(createRequest('key-5xx'), createResponse(projectId));
    expect((retry as HttpException).code).toBe(409);
  });

  it.each([
    ['an empty key', ''],
    ['a key over 255 characters', 'k'.repeat(256)],
    ['a key with non-printable characters', 'key\nwith-newline'],
  ])('rejects %s with 400', async (_label, key) => {
    const error = await run(createRequest(key), createResponse(projectId));

    expect((error as HttpException).code).toBe(400);
    expect(await prisma.idempotencyKey.count()).toBe(0);
  });
});

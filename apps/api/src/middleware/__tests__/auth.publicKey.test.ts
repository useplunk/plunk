import type {NextFunction, Request, Response} from 'express';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ErrorCode, HttpException} from '../../exceptions/index.js';
import {ProjectService} from '../../services/ProjectService.js';
import {requirePublicKey} from '../auth.js';

/**
 * /v1/track is called from browser code, so a secret key there must fail loudly: accepted, it would
 * work while sitting exposed in a public bundle for anyone to lift and send email with.
 */
async function run(authorization: string) {
  const req = {headers: {authorization}, method: 'POST'} as unknown as Request;
  const res = {locals: {}} as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;

  await requirePublicKey(req, res, next);

  return {res, next: vi.mocked(next)};
}

describe('requirePublicKey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a secret key by name, without looking it up', async () => {
    const lookup = vi.spyOn(ProjectService, 'public');

    const {next} = await run('Bearer sk_abc123');

    const error = next.mock.calls[0]![0] as unknown as HttpException;
    expect(error).toBeInstanceOf(HttpException);
    expect(error.code).toBe(401);
    expect(error.errorCode).toBe(ErrorCode.INVALID_API_KEY);
    expect(error.message).toContain('Secret keys (sk_*) cannot be used');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('accepts a public key', async () => {
    vi.spyOn(ProjectService, 'public').mockResolvedValue({id: 'project-1', disabled: false} as never);

    const {res, next} = await run('Bearer pk_abc123');

    expect(next).toHaveBeenCalledWith();
    expect(res.locals.auth).toEqual({type: 'apiKey', projectId: 'project-1'});
  });
});

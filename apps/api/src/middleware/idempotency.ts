import type {NextFunction, Request, Response} from 'express';
import signale from 'signale';

import {IDEMPOTENCY_KEY_TTL_HOURS} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {BadRequest, ConflictError, ErrorCode} from '../exceptions/index.js';

const HEADER = 'idempotency-key';
const MAX_KEY_LENGTH = 255;
const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;

/**
 * Refuses a request whose Idempotency-Key has already been used by this project.
 *
 * The key is claimed by inserting a row before the handler runs, so the unique
 * constraint on (projectId, key) — not a read-then-write check — is what decides
 * the race between two concurrent retries.
 *
 * The claim is released when the handler responds 4xx, because those errors are
 * raised before any contact, event, or email is written and the caller should be
 * free to fix the request and retry with the same key. It is *kept* on 2xx (the
 * request succeeded) and on 5xx (the request failed with side effects in an
 * unknown state, so a blind retry is exactly what this feature exists to stop).
 *
 * Must run after an auth middleware, which populates res.locals.auth.projectId.
 */
export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers[HEADER];

  if (header === undefined) {
    return next();
  }

  try {
    const key = Array.isArray(header) ? header[0] : header;

    if (!key || key.length > MAX_KEY_LENGTH || !PRINTABLE_ASCII.test(key)) {
      throw new BadRequest(
        `Idempotency-Key must be 1-${MAX_KEY_LENGTH} printable ASCII characters`,
        ErrorCode.BAD_REQUEST,
      );
    }

    const projectId = res.locals.auth.projectId as string;

    const expiresAt = new Date(Date.now() + IDEMPOTENCY_KEY_TTL_HOURS * 60 * 60 * 1000);

    let claimId: string;

    try {
      const claim = await prisma.idempotencyKey.create({
        data: {projectId, key, method: req.method, path: req.path, expiresAt},
        select: {id: true},
      });
      claimId = claim.id;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        const existing = await prisma.idempotencyKey.findUnique({
          where: {projectId_key: {projectId, key}},
          select: {method: true, path: true, createdAt: true, statusCode: true},
        });

        throw new ConflictError(
          `Idempotency-Key "${key}" has already been used`,
          existing
            ? {
                key,
                originalRequest: `${existing.method} ${existing.path}`,
                originalRequestAt: existing.createdAt.toISOString(),
                // Null while the original request is still in flight
                originalStatusCode: existing.statusCode,
              }
            : {key},
          ErrorCode.IDEMPOTENCY_KEY_REUSED,
        );
      }

      throw error;
    }

    res.on('finish', () => {
      const settle =
        res.statusCode >= 400 && res.statusCode < 500
          ? prisma.idempotencyKey.delete({where: {id: claimId}})
          : prisma.idempotencyKey.update({where: {id: claimId}, data: {statusCode: res.statusCode}});

      settle.catch((error: unknown) => {
        signale.error(`[IDEMPOTENCY] Failed to settle key claim ${claimId}:`, error);
      });
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

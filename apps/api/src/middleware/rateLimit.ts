import type {NextFunction, Request, Response} from 'express';
import signale from 'signale';

import {
  RATE_LIMIT_CONTACTS_BURST,
  RATE_LIMIT_CONTACTS_PER_SECOND,
  RATE_LIMIT_ENABLED,
  RATE_LIMIT_SEND_BURST,
  RATE_LIMIT_SEND_PER_SECOND,
  RATE_LIMIT_TRACK_BURST,
  RATE_LIMIT_TRACK_PER_SECOND,
} from '../app/constants.js';
import {redis} from '../database/redis.js';
import {RateLimitError} from '../exceptions/index.js';
import {Keys} from '../services/keys.js';

/**
 * A named request budget. Each bucket is tracked separately per project, so a
 * project saturating its contact-sync budget can still send transactional email.
 */
export interface RateLimitBucket {
  /** Identifies the bucket in Redis. Two routes sharing a name share a budget. */
  name: string;
  /** Sustained requests per second. `0` disables the bucket entirely. */
  refillPerSecond: number;
  /**
   * Maximum tokens held at once — how large a burst is absorbed before throttling.
   * Real-time sync integrations are bursty by nature (a backlog drains all at once,
   * then the stream idles), so this is deliberately larger than the sustained rate.
   */
  burst: number;
}

/**
 * Token bucket, evaluated atomically so concurrent requests from the same project
 * can't each read a stale token count and collectively overspend the budget.
 *
 * The clock comes from `TIME` rather than the caller, because every API instance
 * shares these buckets and their wall clocks don't agree to the millisecond. Redis
 * has replicated script *effects* rather than the script itself since Redis 5, so
 * reading a non-deterministic value here is safe.
 *
 * Returns [allowed, tokensRemaining, retryAfterMs]. Redis truncates Lua numbers to
 * integers on the way out, so each value is rounded explicitly in the direction that
 * errs toward the caller waiting slightly too long rather than retrying too early.
 */
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])

local time = redis.call('TIME')
local now = tonumber(time[1]) + (tonumber(time[2]) / 1000000)

local stored = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(stored[1])
local ts = tonumber(stored[2])

if tokens == nil or ts == nil then
  tokens = capacity
  ts = now
end

-- A clock that moved backwards must not mint tokens.
tokens = math.min(capacity, tokens + math.max(0, now - ts) * refill)

local allowed = 0
local retryAfterMs = 0

if tokens >= 1 then
  allowed = 1
  tokens = tokens - 1
else
  retryAfterMs = math.ceil(((1 - tokens) / refill) * 1000)
end

redis.call('HSET', key, 'tokens', tokens, 'ts', now)

-- Expire once a bucket could only have refilled to full anyway: recreating it from
-- scratch then yields the same answer, so idle projects cost no memory.
redis.call('EXPIRE', key, math.ceil(capacity / refill) + 60)

return {allowed, math.floor(tokens), retryAfterMs}
`;

interface TokenBucketCommand {
  rateLimitTokenBucket(key: string, capacity: string, refillPerSecond: string): Promise<[number, number, number]>;
}

redis.defineCommand('rateLimitTokenBucket', {numberOfKeys: 1, lua: TOKEN_BUCKET_SCRIPT});

const client = redis as unknown as TokenBucketCommand;

/**
 * Rejects a project's requests to this route once it outruns `bucket`.
 *
 * Must run *after* an auth middleware: the budget is keyed on
 * `res.locals.auth.projectId` so limits follow the customer rather than an IP.
 * Sync integrations all arrive from one address, and browser traffic to
 * `/v1/track` arrives from thousands that are shared by NAT — in both cases the
 * IP is the wrong unit. A request with no resolved project is passed through,
 * since auth has already refused anything that shouldn't reach the handler.
 *
 * If Redis is unreachable the request is allowed. A limiter that converts a Redis
 * blip into an ingestion outage causes more damage than the abuse it prevents.
 */
export const rateLimit = (bucket: RateLimitBucket) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!RATE_LIMIT_ENABLED || bucket.refillPerSecond <= 0) {
      return next();
    }

    const projectId = (res.locals.auth as {projectId?: string} | undefined)?.projectId;

    if (!projectId) {
      return next();
    }

    let exceeded: RateLimitError | undefined;

    try {
      const [allowed, remaining, retryAfterMs] = await client.rateLimitTokenBucket(
        Keys.RateLimit.bucket(bucket.name, projectId),
        String(bucket.burst),
        String(bucket.refillPerSecond),
      );

      // Seconds until the bucket is full again, so a client pacing itself off the
      // headers knows when its whole burst allowance is back rather than just the
      // next single token.
      const resetSeconds = Math.ceil((bucket.burst - remaining) / bucket.refillPerSecond);

      res.set({
        'RateLimit-Limit': String(bucket.burst),
        'RateLimit-Remaining': String(Math.max(0, remaining)),
        'RateLimit-Reset': String(Math.max(0, resetSeconds)),
      });

      if (!allowed) {
        // Never advertise a 0-second wait — that invites an immediate retry that is
        // certain to fail again.
        const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));

        res.set('Retry-After', String(retryAfter));

        exceeded = new RateLimitError(
          `Rate limit exceeded for this endpoint (${bucket.refillPerSecond}/second sustained, ${bucket.burst} burst). Retry in ${retryAfter}s.`,
          retryAfter,
        );
      }
    } catch (error) {
      signale.warn(`[RATE-LIMIT] Redis check failed for bucket "${bucket.name}", allowing request:`, error);
      return next();
    }

    return next(exceeded);
  };
};

/** POST /v1/track */
export const trackRateLimit = rateLimit({
  name: 'track',
  refillPerSecond: RATE_LIMIT_TRACK_PER_SECOND,
  burst: RATE_LIMIT_TRACK_BURST,
});

/** POST /v1/send */
export const sendRateLimit = rateLimit({
  name: 'send',
  refillPerSecond: RATE_LIMIT_SEND_PER_SECOND,
  burst: RATE_LIMIT_SEND_BURST,
});

/**
 * Contact writes. One shared budget across create/update/delete, because a sync
 * integration issues all three against the same upstream change feed — separate
 * budgets would let one runaway sync spend three times the intended allowance.
 */
export const contactWriteRateLimit = rateLimit({
  name: 'contacts:write',
  refillPerSecond: RATE_LIMIT_CONTACTS_PER_SECOND,
  burst: RATE_LIMIT_CONTACTS_BURST,
});

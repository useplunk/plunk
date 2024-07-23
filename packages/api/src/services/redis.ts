import Redis from 'ioredis';
import {REDIS_URL} from '../app/constants';

export const redis = new Redis(REDIS_URL);

export const REDIS_ONE_MINUTE = 60;
export const REDIS_DEFAULT_EXPIRY = REDIS_ONE_MINUTE / 60;

/**
 * @param key The key for redis (use Keys#<type>)
 * @param fn The function to return a resource. Can be a promise
 * @param seconds The amount of seconds to hold this resource in redis for. Defaults to 60
 */
export async function wrapRedis<T>(key: string, fn: () => Promise<T>, seconds = REDIS_DEFAULT_EXPIRY): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const recent = await fn();

  if (recent) {
    await redis.set(key, JSON.stringify(recent), 'EX', seconds);
  }

  return recent;
}

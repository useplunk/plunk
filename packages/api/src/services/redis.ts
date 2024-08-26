import Redis from 'ioredis';
import {REDIS_URL} from '../app/constants';
import signale from "signale";

export let redis: Redis;
const maxRetries = 5;
const retryDelay = 2000; // 2 seconds

const connectToRedis = async (attempt = 0) => {
  try {
    redis = new Redis(REDIS_URL);
    await redis.ping();
    const infoString = await redis.info();
    signale.info('Redis initialized: ', infoString);
  } catch (error) {
    if (attempt < maxRetries) {
      signale.warn(`Failed to connect to Redis. Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      await connectToRedis(attempt + 1);
    } else {
      signale.error('Failed to initialize Redis after multiple attempts: ', error);
      throw error;
    }
  }
};

connectToRedis();

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

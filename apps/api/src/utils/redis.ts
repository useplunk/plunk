import type {RedisOptions} from 'ioredis';

/**
 * Turn a REDIS_URL into ioredis connection options for BullMQ, keeping the ACL
 * username and enabling TLS for rediss:// URLs.
 */
export function parseRedisUrl(
  url: string,
): Pick<RedisOptions, 'host' | 'port' | 'username' | 'password' | 'db' | 'tls'> {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port || '6379', 10),
    ...(urlObj.username && {username: decodeURIComponent(urlObj.username)}),
    password: urlObj.password ? decodeURIComponent(urlObj.password) : undefined,
    db: parseInt(urlObj.pathname.slice(1) || '0', 10),
    ...(urlObj.protocol === 'rediss:' && {tls: {}}),
  };
}

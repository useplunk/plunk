import {describe, expect, it} from 'vitest';

import {parseRedisUrl} from '../redis.js';

describe('parseRedisUrl', () => {
  it('reads host, port, password and db', () => {
    expect(parseRedisUrl('redis://:secret@redis:6380/2')).toEqual({
      host: 'redis',
      port: 6380,
      password: 'secret',
      db: 2,
    });
  });

  it('falls back to the default port and db', () => {
    expect(parseRedisUrl('redis://localhost')).toEqual({host: 'localhost', port: 6379, db: 0});
  });

  it('keeps the username for ACL users', () => {
    expect(parseRedisUrl('redis://plunk:password@redis:6379/1')).toMatchObject({
      username: 'plunk',
      password: 'password',
    });
  });

  it('decodes percent-encoded credentials', () => {
    expect(parseRedisUrl('redis://us%40er:p%40ss%3Aword@redis:6379')).toMatchObject({
      username: 'us@er',
      password: 'p@ss:word',
    });
  });

  it('enables TLS for rediss:// URLs', () => {
    expect(parseRedisUrl('rediss://default:secret@cache.example.com:6380')).toMatchObject({
      host: 'cache.example.com',
      tls: {},
    });
  });

  it('does not enable TLS for redis:// URLs', () => {
    expect(parseRedisUrl('redis://localhost:6379').tls).toBeUndefined();
  });
});

import signale from 'signale';

import {Keys} from './keys.js';
import {redis, wrapRedis} from '../database/redis.js';
import {prisma} from '../database/prisma.js';

export class ProjectService {
  public static async id(id: string) {
    return wrapRedis(Keys.Project.id(id), async () => {
      return prisma.project.findUnique({where: {id}});
    });
  }

  public static async secret(key: string) {
    return wrapRedis(Keys.Project.secret(key), async () => {
      return prisma.project.findUnique({
        where: {
          secret: key,
        },
      });
    });
  }

  public static async public(key: string) {
    return wrapRedis(Keys.Project.public(key), async () => {
      return prisma.project.findUnique({
        where: {
          public: key,
        },
      });
    });
  }

  /**
   * Invalidate cached project lookups (id + secret/public keys).
   * Must be called whenever a project's API keys, `disabled` flag, or other
   * auth-affecting fields change, otherwise stale records can keep
   * revoked keys or just-disabled projects authorized until cache TTL.
   *
   * Accepts the previous key values too, so rotated keys are also dropped.
   */
  public static async invalidate(
    projectId: string,
    keys?: {secret?: string | null; public?: string | null}[],
  ): Promise<void> {
    try {
      const cacheKeys = new Set<string>([Keys.Project.id(projectId)]);
      for (const k of keys ?? []) {
        if (k.secret) cacheKeys.add(Keys.Project.secret(k.secret));
        if (k.public) cacheKeys.add(Keys.Project.public(k.public));
      }
      await Promise.all([...cacheKeys].map(key => redis.del(key)));
    } catch (error) {
      signale.warn(`[PROJECT] Failed to invalidate cache for ${projectId}:`, error);
    }
  }
}

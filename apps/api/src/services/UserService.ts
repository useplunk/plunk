import type {ProjectWithRole} from '@plunk/types';
import dayjs from 'dayjs';

import {API_URI, NODE_ENV} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {wrapRedis} from '../database/redis.js';

import {Keys} from './keys.js';

/**
 * Extract base domain from URL for cookie sharing across subdomains
 * e.g., "http://api.example.com" -> ".example.com"
 * e.g., "http://api.localhost" -> ".localhost"
 * e.g., "http://app.plunk.local" -> ".plunk.local"
 */
function getCookieDomain(): string | undefined {
  if (NODE_ENV === 'development') {
    return undefined;
  }

  try {
    const url = new URL(API_URI);
    const hostname = url.hostname;

    // For localhost or IP addresses, don't set a domain
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return undefined;
    }

    // Extract base domain (last two parts for most domains, or .localhost)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      // For *.localhost, use .localhost (reserved TLD)
      if (hostname.endsWith('.localhost')) {
        return '.localhost';
      }
      // For *.local (mDNS TLD), use the actual base domain
      if (hostname.endsWith('.local')) {
        return `.${parts.slice(-2).join('.')}`;
      }
      // For other domains, use the last two parts (e.g., .example.com)
      return `.${parts.slice(-2).join('.')}`;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export class UserService {
  public static readonly COOKIE_NAME = 'next_token';

  public static async id(id: string) {
    return wrapRedis(Keys.User.id(id), async () => {
      return prisma.user.findUnique({where: {id}});
    });
  }

  public static async email(email: string) {
    if (!email) {
      return null;
    }

    return wrapRedis(Keys.User.email(email), async () => {
      return prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
      });
    });
  }

  /**
   * The projects this user belongs to, each carrying the user's role in it.
   *
   * The role rides along on the membership rows we already read, so the account
   * page can show it without a per-project members lookup.
   */
  public static async projects(userId: string): Promise<ProjectWithRole[]> {
    const memberships = await prisma.user.findUnique({where: {id: userId}}).memberships({
      include: {
        project: true,
      },
    });

    return memberships ? memberships.map(({project, role}) => ({...project, role})) : [];
  }

  /**
   * Generates cookie options
   * @param expires An optional expiry for this cookie (useful for a logout)
   */
  public static cookieOptions(expires?: Date) {
    // Check if using HTTPS from API_URI
    const isHttps = NODE_ENV === 'development' ? false : API_URI.startsWith('https://');

    return {
      httpOnly: true,
      expires: expires ?? dayjs().add(7, 'days').toDate(),
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      domain: getCookieDomain(),
    } as const;
  }
}

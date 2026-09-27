import type {ProjectWithRole} from '@plunk/types';
import dayjs from 'dayjs';
import {getDomain} from 'tldts';

import {API_URI, NODE_ENV} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {wrapRedis} from '../database/redis.js';

import {Keys} from './keys.js';

/**
 * Extract the registrable domain from URL for cookie sharing across subdomains.
 * Uses the Public Suffix List: taking the last two labels would scope the cookie
 * to a public suffix such as ".com.br" or ".co.uk", which browsers reject.
 * e.g., "http://api.example.com" -> ".example.com"
 * e.g., "http://api.example.com.br" -> ".example.com.br"
 * e.g., "http://api.localhost" -> ".localhost"
 * e.g., "http://app.plunk.local" -> ".plunk.local"
 * e.g., "http://localhost" or an IP address -> no domain
 */
function getCookieDomain(): string | undefined {
  if (NODE_ENV === 'development') {
    return undefined;
  }

  try {
    const {hostname} = new URL(API_URI);

    // *.localhost is a reserved TLD, so share the cookie across all of it
    if (hostname.endsWith('.localhost')) {
      return '.localhost';
    }

    // Private suffixes (e.g. up.railway.app) are included, since browsers reject cookies scoped to them too
    const domain = getDomain(hostname, {allowPrivateDomains: true});
    return domain ? `.${domain}` : undefined;
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

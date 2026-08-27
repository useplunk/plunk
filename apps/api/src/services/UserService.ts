import dayjs from 'dayjs';
import type {Response} from 'express';
import {getDomain} from 'tldts';

import {API_URI, DASHBOARD_URI, NODE_ENV} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {wrapRedis} from '../database/redis.js';

import {Keys} from './keys.js';

/**
 * Reproduce the domain scope used before host-only cookies. This is used only
 * to expire an existing legacy cookie during login/logout migration.
 */
function getLegacyCookieDomain(): string | undefined {
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

    // This intentionally matches the old last-two-label algorithm exactly.
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      if (hostname.endsWith('.localhost')) {
        return '.localhost';
      }
      if (hostname.endsWith('.local')) {
        return `.${parts.slice(-2).join('.')}`;
      }
      return `.${parts.slice(-2).join('.')}`;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function getSchemefulSite(uri: string): string | undefined {
  try {
    const url = new URL(uri);
    const registrableDomain = getDomain(url.hostname, {allowPrivateDomains: true});

    return `${url.protocol}//${registrableDomain ?? url.hostname}`;
  } catch {
    return undefined;
  }
}

export function getCookieSameSite(apiUri: string, dashboardUri: string, secure: boolean): 'lax' | 'none' {
  if (!secure) {
    return 'lax';
  }

  const apiSite = getSchemefulSite(apiUri);
  const dashboardSite = getSchemefulSite(dashboardUri);

  return apiSite !== undefined && apiSite === dashboardSite ? 'lax' : 'none';
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

  public static async projects(userId: string) {
    const memberships = await prisma.user.findUnique({where: {id: userId}}).memberships({
      include: {
        project: true,
      },
    });

    return memberships ? memberships.map(({project}) => project) : [];
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
      sameSite: getCookieSameSite(API_URI, DASHBOARD_URI, isHttps),
      path: '/',
    } as const;
  }

  private static clearLegacyCookie(res: Response) {
    const domain = getLegacyCookieDomain();

    if (domain) {
      res.cookie(UserService.COOKIE_NAME, '', {
        ...UserService.cookieOptions(new Date()),
        domain,
      });
    }
  }

  public static setAuthCookie(res: Response, token: string) {
    UserService.clearLegacyCookie(res);
    return res.cookie(UserService.COOKIE_NAME, token, UserService.cookieOptions());
  }

  public static clearAuthCookie(res: Response) {
    UserService.clearLegacyCookie(res);
    return res.cookie(UserService.COOKIE_NAME, '', UserService.cookieOptions(new Date()));
  }
}

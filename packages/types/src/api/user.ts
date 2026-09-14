/**
 * Current user (account) types
 */

import type {AuthMethod, Project, Role} from '@plunk/db';

/**
 * The authenticated user's own account, as returned by GET /users/@me.
 *
 * Deliberately narrower than the Prisma `User`: the password hash must never
 * leave the API.
 */
export interface AccountUser {
  id: string;
  email: string;
  type: AuthMethod;
  emailVerified: boolean;
  /**
   * Whether the dashboard should ask this user to verify their address.
   *
   * Not the same as `!emailVerified`: verification only means anything when the
   * instance has platform email configured. Without it no verification mail can
   * be sent and nothing is gated on it, so an unverified account is inert.
   */
  emailVerificationRequired: boolean;
  createdAt: Date;
}

/**
 * A project the current user belongs to, with their role in it.
 * Returned by GET /users/@me/projects.
 */
export type ProjectWithRole = Project & {role: Role};

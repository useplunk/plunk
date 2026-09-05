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
  createdAt: Date;
}

/**
 * A project the current user belongs to, with their role in it.
 * Returned by GET /users/@me/projects.
 */
export type ProjectWithRole = Project & {role: Role};

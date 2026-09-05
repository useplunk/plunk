import type {AccountUser} from '@plunk/types';
import useSWR from 'swr';

/**
 * Fetch the current user. undefined means loading, null means logged out
 *
 */
export function useUser() {
  return useSWR<AccountUser | null>('/users/@me', {shouldRetryOnError: false});
}

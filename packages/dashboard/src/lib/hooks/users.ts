import useSWR from 'swr';

/**
 * Fetch the current user. undefined means loading, null means logged out
 *
 */
export function useUser() {
  return useSWR('/users/@me', {shouldRetryOnError: false});
}

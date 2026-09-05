import {useRouter} from 'next/router';
import {useCallback} from 'react';

import {network} from '../network';

import {useUser} from './useUser';

/**
 * Clears the session and returns to the login page.
 *
 * The local teardown runs even when the API call fails, so a logout always takes
 * effect client-side.
 */
export function useLogout() {
  const router = useRouter();
  const {mutate: mutateUser} = useUser();

  return useCallback(async () => {
    try {
      await network.fetch('GET', '/auth/logout');
    } catch {
      // The cookie may already be gone; the local teardown below still has to run.
    }

    localStorage.removeItem('token');
    localStorage.removeItem('activeProjectId');
    await mutateUser(null, false);
    await router.push('/auth/login');
  }, [mutateUser, router]);
}

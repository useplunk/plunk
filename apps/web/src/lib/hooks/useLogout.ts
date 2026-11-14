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
  const {mutate: mutateUser} = useUser();

  return useCallback(async () => {
    try {
      await network.fetch('POST', '/auth/logout');
    } catch {
      // The cookie may already be gone; the local teardown below still has to run.
    }

    localStorage.removeItem('token');
    localStorage.removeItem('activeProjectId');
    await mutateUser(null, false);
    // A hard navigation, so no SWR state survives into the login page. Otherwise the next
    // sign-in reuses the cached project list and the active project id is not stored again;
    // another user signing in would also see this one's cached data at first.
    window.location.href = '/auth/login';
  }, [mutateUser]);
}

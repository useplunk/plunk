import {useActiveProject} from './projects';
import useSWR from 'swr';

/**

 * @param method
 */
export function useAnalytics(method?: 'week' | 'month' | 'year') {
  const activeProject = useActiveProject();

  return useSWR<{
    contacts: {
      timeseries: {
        day: Date;
        count: number;
      }[];
      subscribed: number;
      unsubscribed: number;
    };
    emails: {
      total: number;
      bounced: number;
      opened: number;
      complaint: number;
      totalPrev: number;
      bouncedPrev: number;
      openedPrev: number;
      complaintPrev: number;
    };
    clicks: {
      actions: {link: string; name: string; count: number}[];
    };
  }>(activeProject ? `/projects/id/${activeProject.id}/analytics?method=${method ?? 'week'}` : null);
}

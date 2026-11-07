import type {ActivityStats, CursorPaginatedResponse, PaginatedResponse} from '@plunk/types';
import useSWR from 'swr';

// Specific response types for dashboard (using unknown[] since we only need counts)
type ContactsResponse = CursorPaginatedResponse<unknown>;
type CampaignsResponse = PaginatedResponse<unknown>;

export interface DashboardStats {
  totalContacts: number;
  totalEmailsSent: number;
  /** Sent with open and click tracking: what the open rate is measured against */
  totalEmailsTracked: number;
  totalCampaigns: number;
  openRate: number;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to fetch dashboard statistics
 * Fetches activity stats, contact count, and campaign count in parallel
 */
export function useDashboardStats(): DashboardStats {
  // Fetch activity stats (last 30 days by default)
  const {
    data: activityStats,
    error: activityError,
    isLoading: isLoadingActivity,
  } = useSWR<ActivityStats>('/activity/stats');

  // Fetch contacts (only need the total count)
  const {
    data: contactsData,
    error: contactsError,
    isLoading: isLoadingContacts,
  } = useSWR<ContactsResponse>('/contacts?limit=1');

  // Fetch campaigns (only need the total count)
  const {
    data: campaignsData,
    error: campaignsError,
    isLoading: isLoadingCampaigns,
  } = useSWR<CampaignsResponse>('/campaigns?page=1&limit=1');

  // Still loading if ANY of the requests are still in progress
  const isLoading = isLoadingActivity || isLoadingContacts || isLoadingCampaigns;
  const error = activityError || contactsError || campaignsError;

  return {
    totalContacts: contactsData?.total ?? 0,
    totalEmailsSent: activityStats?.totalEmailsSent ?? 0,
    totalEmailsTracked: activityStats?.totalEmailsTracked ?? 0,
    totalCampaigns: campaignsData?.total ?? 0,
    openRate: activityStats?.openRate ?? 0,
    isLoading,
    error,
  };
}

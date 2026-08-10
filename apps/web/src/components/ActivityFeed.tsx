import {Button, EmptyState, IconSpinner} from '@plunk/ui';
import type {Activity, CursorPaginatedResponse} from '@plunk/types';
import {network} from '../lib/network';
import {ActivityItem} from './ActivityItem';
import {Activity as ActivityIcon} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';

export interface ActivityFeedProps {
  typeFilter?: string;
  dateRangeDays?: number;
  contactId?: string;
}

export function ActivityFeed({typeFilter, dateRangeDays = 30, contactId}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize start date to prevent recreation on every render
  const startDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - dateRangeDays);
    return date.toISOString();
  }, [dateRangeDays]);

  const fetchActivities = useCallback(
    async (cursor?: string) => {
      try {
        if (cursor) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          // Don't clear activities immediately - we'll do a smart merge
          // This preserves React component instances and their local state
          setNextCursor(undefined);
          setHasMore(true);
        }
        setError(null);

        const params = new URLSearchParams({
          limit: '20', // Conservative limit to avoid overloading
        });

        // Only apply startDate filter on initial load, not during pagination
        // When cursor is present, we're paginating backwards and should not limit by startDate.
        // Contact-scoped feeds show the contact's full history, so skip the date floor entirely.
        if (!cursor && !contactId) {
          params.set('startDate', startDate);
        }

        if (cursor) {
          params.set('cursor', cursor);
        }
        if (typeFilter) {
          params.set('types', typeFilter);
        }
        if (contactId) {
          params.set('contactId', contactId);
        }

        const result = await network.fetch<CursorPaginatedResponse<Activity>>('GET', `/activity?${params.toString()}`);

        if (cursor) {
          // Append to existing activities (pagination)
          setActivities(prev => [...prev, ...result.data]);
        } else {
          // Smart merge: preserve existing activity objects by ID to maintain component state
          setActivities(prev => {
            // If no previous activities, just use new data
            if (prev.length === 0) {
              return result.data;
            }

            // Create a map of existing activities by ID for fast lookup
            const existingMap = new Map(prev.map(activity => [activity.id, activity]));

            // For each new activity, reuse existing object if ID matches (preserves React component instances)
            // Otherwise use new object. This maintains correct ordering while preserving component state.
            return result.data.map(newActivity => existingMap.get(newActivity.id) ?? newActivity);
          });
        }

        setNextCursor(result.cursor);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Couldn’t load activity. Try again.');
        console.error('Error fetching activities:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [typeFilter, startDate, contactId],
  );

  // Fetch upcoming activities
  const fetchUpcomingActivities = useCallback(async () => {
    try {
      // Don't fetch upcoming if we're filtering by contact
      // (upcoming items aren't contact-specific)
      if (contactId) {
        setUpcomingActivities([]);
        return;
      }

      const params = new URLSearchParams({
        limit: '20',
        daysAhead: dateRangeDays.toString(),
      });

      const result = await network.fetch<{activities: Activity[]}>('GET', `/activity/upcoming?${params.toString()}`);

      // Smart merge: preserve existing activity objects by ID to maintain component state
      setUpcomingActivities(prev => {
        // If no previous activities, just use new data
        if (prev.length === 0) {
          return result.activities;
        }

        // Create a map of existing activities by ID for fast lookup
        const existingMap = new Map(prev.map(activity => [activity.id, activity]));

        // For each new activity, reuse existing object if ID matches
        return result.activities.map(newActivity => existingMap.get(newActivity.id) ?? newActivity);
      });
    } catch (err) {
      console.error('Error fetching upcoming activities:', err);
      // Don't set error state for upcoming - just fail silently
      setUpcomingActivities([]);
    }
  }, [dateRangeDays, contactId]);

  // Initial fetch - only run once when filters change
  useEffect(() => {
    void fetchActivities();
    void fetchUpcomingActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, startDate, contactId]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    // Don't set up auto-refresh if still loading initial data
    if (isLoading) {
      return;
    }

    const interval = setInterval(() => {
      // Only refresh if we're on the first page and not already loading
      if (!isLoading && !isLoadingMore && activities.length > 0) {
        void fetchActivities();
        void fetchUpcomingActivities();
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isLoadingMore, activities.length]);

  const loadMore = () => {
    if (nextCursor && hasMore && !isLoadingMore) {
      void fetchActivities(nextCursor);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm">{error}</p>
        <Button onClick={() => fetchActivities()} variant="outline" className="mt-4">
          Try again
        </Button>
      </div>
    );
  }

  if (activities.length === 0 && upcomingActivities.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No activity yet"
        description="Events will appear here as contacts interact with your emails."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Past Activity Timeline */}
      {activities.length > 0 && (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={`${activity.id}-${index}`}>
              <ActivityItem activity={activity} />
              {index < activities.length - 1 && <div className="border-t border-neutral-100 my-4" />}
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={loadMore} variant="outline" disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <IconSpinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {/* Separator between past and upcoming */}
      {activities.length > 0 && upcomingActivities.length > 0 && (
        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-neutral-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm font-medium text-neutral-500">Upcoming scheduled</span>
          </div>
        </div>
      )}

      {/* Upcoming Activities */}
      {upcomingActivities.length > 0 && (
        <div className="space-y-4">
          {upcomingActivities.map((activity, index) => (
            <div key={`${activity.id}-${index}`}>
              <ActivityItem activity={activity} status="upcoming" />
              {index < upcomingActivities.length - 1 && <div className="border-t border-neutral-100 my-4" />}
            </div>
          ))}
        </div>
      )}

      {/* End of results indicator */}
      {!hasMore && activities.length > 0 && upcomingActivities.length === 0 && (
        <div className="text-center pt-4">
          <p className="text-sm text-neutral-400">You&apos;ve reached the end of the activity feed</p>
        </div>
      )}
    </div>
  );
}

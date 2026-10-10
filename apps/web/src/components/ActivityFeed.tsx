import type {Activity, CursorPaginatedResponse} from '@plunk/types';
import {Button, EmptyState, IconSpinner, Skeleton} from '@plunk/ui';
import dayjs from 'dayjs';
import {Activity as ActivityIcon, ArrowUp, ChevronRight} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {network} from '../lib/network';
import {ActivityItem} from './ActivityItem';

export interface ActivityFeedProps {
  /** Comma-separated activity types; all types when omitted */
  typeFilter?: string;
  contactId?: string;
  /** Show scheduled campaigns and workflow emails above the history */
  showScheduled?: boolean;
  /** Shown when nothing matches; lets the page explain its own filters */
  emptyMessage?: string;
}

const PAGE_SIZE = 25;
const POLL_INTERVAL = 30_000;
/**
 * How far back the first request looks. Not a filter: it keeps a sparse filter (say, only
 * complaints) from scanning a project's whole history just to fill the first page. When it
 * runs out, the reader can continue past it.
 */
const FIRST_WINDOW_DAYS = 90;

/**
 * Chronological activity, newest first, grouped by day. There is no date filter: in a feed
 * read from the top, older activity is simply further down.
 *
 * New activity is fetched in the background but never inserted on its own: the reader
 * gets a "new activity" button instead, so rows do not move under them mid-read.
 */
export function ActivityFeed({typeFilter, contactId, showScheduled = !contactId, emptyMessage}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [incoming, setIncoming] = useState<Activity[] | null>(null);
  const [scheduled, setScheduled] = useState<Activity[]>([]);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  // Set once the first window is exhausted: the next page reaches past it
  const [beyondWindow, setBeyondWindow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // Bumped on every filter change, so a slow response for old filters is ignored
  const generation = useRef(0);

  const firstPageUrl = useCallback(() => {
    const params = new URLSearchParams({limit: String(PAGE_SIZE)});
    // A contact's history is small, so it is read without a window
    if (!contactId) params.set('startDate', windowStart().toISOString());
    if (typeFilter) params.set('types', typeFilter);
    if (contactId) params.set('contactId', contactId);
    return `/activity?${params.toString()}`;
  }, [typeFilter, contactId]);

  const load = useCallback(async () => {
    const run = ++generation.current;
    setIsLoading(true);
    setError(false);
    setIncoming(null);
    try {
      const [page, upcoming] = await Promise.all([
        network.fetch<CursorPaginatedResponse<Activity>>('GET', firstPageUrl()),
        showScheduled
          ? network
              .fetch<{
                activities: Activity[];
              }>('GET', '/activity/upcoming?limit=20&daysAhead=30')
              .catch(() => ({activities: []}))
          : Promise.resolve({activities: []}),
      ]);
      if (run !== generation.current) return;
      setActivities(page.data);
      setScheduled(upcoming.activities);
      if (page.hasMore || contactId) {
        setNextCursor(page.cursor);
        setHasMore(page.hasMore);
        setBeyondWindow(false);
      } else {
        // The window ran out, which says nothing about what came before it. A cursor at the
        // window's start continues from there; the API applies no window to cursor pages.
        setNextCursor(`${windowStart().getTime()}_`);
        setHasMore(true);
        setBeyondWindow(true);
      }
    } catch {
      if (run === generation.current) setError(true);
    } finally {
      if (run === generation.current) setIsLoading(false);
    }
  }, [firstPageUrl, showScheduled, contactId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    const run = generation.current;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({limit: String(PAGE_SIZE), cursor: nextCursor});
      if (typeFilter) params.set('types', typeFilter);
      if (contactId) params.set('contactId', contactId);
      const page = await network.fetch<CursorPaginatedResponse<Activity>>('GET', `/activity?${params.toString()}`);
      if (run !== generation.current) return;
      setActivities(prev => {
        const seen = new Set(prev.map(a => a.id));
        return [...prev, ...page.data.filter(a => !seen.has(a.id))];
      });
      setNextCursor(page.cursor);
      setHasMore(page.hasMore);
      setBeyondWindow(false);
    } catch {
      // The button stays, so the reader can simply try again
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Background check for new activity, paused while the tab is hidden
  useEffect(() => {
    if (isLoading || error) return;

    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      const run = generation.current;
      try {
        const page = await network.fetch<CursorPaginatedResponse<Activity>>('GET', firstPageUrl());
        if (run !== generation.current) return;
        const newestShown = activities[0] ? new Date(activities[0].timestamp).getTime() : 0;
        const known = new Set(activities.map(a => a.id));
        const fresh = page.data.filter(a => !known.has(a.id) && new Date(a.timestamp).getTime() >= newestShown);
        setIncoming(fresh.length > 0 ? fresh : null);
      } catch {
        // Silent: the next tick tries again
      }
    };

    const interval = setInterval(() => void check(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isLoading, error, activities, firstPageUrl]);

  const showIncoming = () => {
    if (!incoming) return;
    // A full page of new activity may have skipped some in between: start over rather than
    // leave a silent gap in the timeline
    if (incoming.length >= PAGE_SIZE) {
      void load();
      return;
    }
    setActivities(prev => [...incoming, ...prev]);
    setIncoming(null);
  };

  const days = useMemo(() => groupByDay(activities), [activities]);

  if (isLoading) {
    return <FeedSkeleton />;
  }

  if (error) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-neutral-600">Activity didn&apos;t load.</p>
        <Button onClick={() => void load()} variant="outline" size="sm" className="mt-3">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {incoming && (
        <div className="sticky top-0 z-10 flex justify-center border-b border-neutral-100 bg-white/95 py-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={showIncoming}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <ArrowUp className="h-3 w-3" aria-hidden />
            {incoming.length >= PAGE_SIZE ? `${PAGE_SIZE}+ new` : `${incoming.length} new`}
          </button>
        </div>
      )}

      {scheduled.length > 0 && (
        <section className="border-b border-neutral-100">
          <button
            type="button"
            onClick={() => setScheduledOpen(o => !o)}
            aria-expanded={scheduledOpen}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-neutral-600 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 sm:px-6"
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none ${scheduledOpen ? 'rotate-90' : ''}`}
              aria-hidden
            />
            Scheduled
            <span className="tabular-nums text-neutral-400">{scheduled.length}</span>
            {!scheduledOpen && scheduled[0] && (
              <span className="ml-auto truncate font-normal text-neutral-500">
                Next {dayjs(scheduled[0].timestamp).format('ddd, MMM D [at] HH:mm')}
              </span>
            )}
          </button>
          {scheduledOpen && (
            <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
              {scheduled.map(activity => (
                <ActivityItem key={activity.id} activity={activity} status="upcoming" />
              ))}
            </ul>
          )}
        </section>
      )}

      {activities.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity yet"
          description={emptyMessage ?? 'Emails, events and workflow runs show up here as they happen.'}
        />
      ) : (
        days.map(day => (
          <section key={day.key} aria-label={day.label}>
            <h3 className="sticky top-0 z-[1] bg-white px-4 pt-5 pb-1 text-xs font-medium text-neutral-500 sm:px-6">
              {day.label}
            </h3>
            <ul className="divide-y divide-neutral-100">
              {day.items.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </ul>
          </section>
        ))
      )}

      {hasMore ? (
        <div className="flex flex-col items-center gap-2 border-t border-neutral-100 px-4 py-6 text-center">
          {beyondWindow && activities.length > 0 && (
            <p className="text-sm text-neutral-500">That&apos;s everything from the last {FIRST_WINDOW_DAYS} days.</p>
          )}
          <Button onClick={() => void loadMore()} variant="outline" size="sm" disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <IconSpinner size="sm" />
                Loading
              </>
            ) : beyondWindow ? (
              activities.length === 0 ? (
                `Look further back than ${FIRST_WINDOW_DAYS} days`
              ) : (
                'Show older activity'
              )
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      ) : (
        activities.length > 0 && (
          <p className="border-t border-neutral-100 py-6 text-center text-sm text-neutral-400">
            You&apos;ve reached the end of the activity feed
          </p>
        )
      )}
    </div>
  );
}

function groupByDay(activities: Activity[]) {
  const today = dayjs().startOf('day');
  const groups: {key: string; label: string; items: Activity[]}[] = [];

  for (const activity of activities) {
    const day = dayjs(activity.timestamp).startOf('day');
    const key = day.format('YYYY-MM-DD');
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label = day.isSame(today)
        ? 'Today'
        : day.isSame(today.subtract(1, 'day'))
          ? 'Yesterday'
          : day.format(day.year() === today.year() ? 'dddd, MMMM D' : 'dddd, MMMM D, YYYY');
      group = {key, label, items: []};
      groups.push(group);
    }
    group.items.push(activity);
  }

  return groups;
}

function FeedSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading activity">
      <div className="px-6 pt-5 pb-1">
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({length: 7}, (_, i) => (
          <div key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 px-6 py-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function windowStart(): Date {
  return dayjs().subtract(FIRST_WINDOW_DAYS, 'day').toDate();
}

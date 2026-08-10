import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  IconSpinner,
  Input,
} from '@plunk/ui';
import type {Segment} from '@plunk/db';
import type {FilterCondition} from '@plunk/types';
import {EmptyState} from '@plunk/ui';
import {DashboardLayout} from '../../components/DashboardLayout';
import {network} from '../../lib/network';
import {formatRelativeTime} from '../../lib/dateUtils';
import {AlertTriangle, Calendar, Edit, Filter, Plus, Search, Trash2, X} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import dayjs from 'dayjs';

// Helper function to count total filters in a condition
function countFiltersInCondition(condition: unknown): number {
  if (!condition || typeof condition !== 'object') return 0;

  const cond = condition as FilterCondition;
  if (!cond.groups || !Array.isArray(cond.groups)) return 0;

  return cond.groups.reduce((total, group) => {
    let count = group.filters?.length || 0;
    // Recursively count nested conditions
    if (group.conditions) {
      count += countFiltersInCondition(group.conditions);
    }
    return total + count;
  }, 0);
}

export default function SegmentsPage() {
  // Limit to 50 segments to avoid loading thousands into the browser
  const {
    data: segments,
    mutate,
    isLoading,
  } = useSWR<Segment[]>('/segments', {
    revalidateOnFocus: false,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Show warning if there are many segments
  const showLimitWarning = segments && segments.length >= 50;

  const filteredSegments = useMemo(() => {
    if (!segments || !searchInput.trim()) return segments;
    const q = searchInput.toLowerCase();
    return segments.filter(s => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
  }, [segments, searchInput]);

  const handleDelete = async () => {
    if (!segmentToDelete) return;

    try {
      await network.fetch('DELETE', `/segments/${segmentToDelete}`);
      toast.success('Segment deleted');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the segment. Try again.');
    } finally {
      setSegmentToDelete(null);
    }
  };

  return (
    <>
      <NextSeo title="Segments" />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Segments</h1>
              <p className="text-neutral-500 mt-2 text-sm sm:text-base">
                Groups of contacts, defined by filters or picked by hand.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/segments/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create segment</span>
                <span className="sm:hidden">Create</span>
              </Link>
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search segments…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Warning if too many segments */}
          {showLimitWarning && (
            <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Showing first {segments?.length} segments. Consider archiving old segments to improve performance.
              </AlertDescription>
            </Alert>
          )}

          {/* Segments Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconSpinner />
            </div>
          ) : filteredSegments?.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Filter}
                  title={searchInput ? 'No segments match' : 'No segments yet'}
                  description={searchInput ? 'Try a different search term.' : 'Group contacts by attributes to target specific audiences.'}
                  action={
                    !searchInput ? (
                      <Button asChild>
                        <Link href="/segments/new">
                          <Plus className="h-4 w-4" />
                          Create segment
                        </Link>
                      </Button>
                    ) : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSegments?.map(segment => {
                const isDynamic = (segment as unknown as {type: string}).type !== 'STATIC';
                const filterCount = isDynamic ? countFiltersInCondition(segment.condition) : 0;
                return (
                  <Card key={segment.id} className="transition-colors hover:border-neutral-300 flex flex-col [&:has([data-card-link]:focus-visible)]:ring-2 [&:has([data-card-link]:focus-visible)]:ring-ring [&:has([data-card-link]:focus-visible)]:ring-offset-2">
                    <Link
                      href={`/segments/${segment.id}`}
                      data-card-link=""
                      className="flex-1 block p-6 pb-4 hover:bg-neutral-50/50 transition-colors rounded-t-xl focus-visible:outline-none"
                      aria-label={`Open ${segment.name}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-neutral-900 leading-snug">{segment.name}</h3>
                        <Badge variant={isDynamic ? 'default' : 'neutral'} className="shrink-0 mt-0.5">
                          {isDynamic ? 'Dynamic' : 'Static'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          <strong className="font-semibold text-neutral-900">{segment.memberCount.toLocaleString()}</strong>
                          <span className="text-neutral-400 ml-1 text-xs">members</span>
                        </span>
                        {isDynamic && (
                          <>
                            <span className="h-3 w-px bg-neutral-200" />
                            <span>
                              <strong className="font-semibold text-neutral-900">{filterCount}</strong>
                              <span className="text-neutral-400 ml-1 text-xs">filters</span>
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                    <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <Calendar className="h-3 w-3" />
                        <div className="group relative inline-block cursor-help">
                          <span>Updated {formatRelativeTime(segment.updatedAt)}</span>
                          <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-0 mb-1 whitespace-nowrap">
                            {dayjs(segment.updatedAt).format('DD MMMM YYYY, hh:mm')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="sm" title="Edit segment">
                          <Link href={`/segments/${segment.id}`} aria-label="Edit segment"><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete segment"
                          onClick={() => {
                            setSegmentToDelete(segment.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete this segment?"
          description="The contacts in it are kept. Only the segment is deleted."
          confirmText="Delete segment"
          variant="destructive"
        />
      </DashboardLayout>
    </>
  );
}

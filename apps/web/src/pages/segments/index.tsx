import {Badge, Button, Card, CardContent, ConfirmDialog, EmptyState, IconSpinner} from '@plunk/ui';
import type {Segment} from '@plunk/db';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {DashboardLayout} from '../../components/DashboardLayout';
import {SegmentRuleSummary, segmentRuleText} from '../../components/SegmentRuleSummary';
import {
  DataTable,
  DataTableColumnHeader,
  DataTableViewOptions,
  DataTableViewSwitcher,
  FilterPill,
  NoResultsState,
  SearchInput,
  isDataTableView,
  type DataTableColumnMeta,
  type DataTableView,
} from '../../components/data-table';
import {network} from '../../lib/network';
import {formatRelativeTime} from '../../lib/dateUtils';
import {useColumnVisibility} from '../../lib/hooks/useColumnVisibility';
import {usePersistentState} from '../../lib/hooks/usePersistentState';
import {Filter, Plus, RefreshCw, Trash2} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import dayjs from 'dayjs';

type TypeFilter = 'ALL' | 'DYNAMIC' | 'STATIC';

const VIEW_STORAGE_KEY = 'plunk:segments:view';
const COLUMNS_STORAGE_KEY = 'plunk:segments:columns';

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  name: true,
  rules: true,
  type: true,
  memberCount: true,
  updatedAt: true,
  actions: true,
};

const TYPE_OPTIONS = [
  {value: 'DYNAMIC', label: 'Dynamic'},
  {value: 'STATIC', label: 'Static'},
];

// The count job rewrites every segment's memberCount on a schedule, which bumps `updatedAt`.
// So `updatedAt` is effectively "last recalculated" and is labelled that way.
function RefreshedAt({date, className = ''}: {date: Date | string; className?: string}) {
  return (
    <div className={'group relative inline-flex items-center gap-1.5 cursor-help whitespace-nowrap ' + className}>
      <RefreshCw className="h-3 w-3 shrink-0" />
      <span>Refreshed {formatRelativeTime(date)}</span>
      <div className="hidden group-hover:block absolute z-10 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-0 mb-1 whitespace-nowrap">
        Member count recalculated {dayjs(date).format('DD MMMM YYYY, HH:mm')}
      </div>
    </div>
  );
}

function StaticRules() {
  return <p className="text-xs text-neutral-500">Contacts added by hand</p>;
}

export default function SegmentsPage() {
  const {data: segments, mutate, isLoading} = useSWR<Segment[]>('/segments', {revalidateOnFocus: false});

  const [segmentToDelete, setSegmentToDelete] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [view, setView] = usePersistentState<DataTableView>(VIEW_STORAGE_KEY, 'card', isDataTableView);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(COLUMNS_STORAGE_KEY, DEFAULT_COLUMN_VISIBILITY);

  // Resolves "member of segment" filters to names. The list endpoint returns every segment in the
  // project, so this is complete.
  const segmentNames = useMemo(() => new Map((segments ?? []).map(s => [s.id, s.name])), [segments]);

  const filteredSegments = useMemo(() => {
    if (!segments) return [];
    const q = searchInput.trim().toLowerCase();
    return segments.filter(s => {
      if (typeFilter !== 'ALL' && s.type !== typeFilter) return false;
      if (!q) return true;
      // Rules are searchable too, so "plan" finds every segment that filters on plan.
      return [s.name, s.description ?? '', segmentRuleText(s.condition, segmentNames)].some(text =>
        text.toLowerCase().includes(q),
      );
    });
  }, [segments, searchInput, typeFilter, segmentNames]);

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

  const deleteButton = (segment: Segment) => (
    <Button
      variant="ghost"
      size="sm"
      title="Delete segment"
      aria-label={`Delete ${segment.name}`}
      onClick={() => setSegmentToDelete(segment.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  const columns = useMemo<Array<ColumnDef<Segment, unknown>>>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        enableHiding: false,
        meta: {label: 'Name', cellClassName: 'max-w-[16rem]'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Name</DataTableColumnHeader>,
        cell: ({row}) => (
          <div className="min-w-0">
            <Link
              href={`/segments/${row.original.id}`}
              className="block truncate text-sm font-medium text-neutral-900 hover:text-neutral-700 focus-visible:outline-none focus-visible:underline"
            >
              {row.original.name}
            </Link>
            {row.original.description && (
              <p className="truncate text-xs text-neutral-500" title={row.original.description}>
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'rules',
        enableSorting: false,
        meta: {label: 'Rules'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Rules</DataTableColumnHeader>,
        cell: ({row}) =>
          row.original.type === 'STATIC' ? (
            <StaticRules />
          ) : (
            <SegmentRuleSummary condition={row.original.condition} segmentNames={segmentNames} maxRules={2} />
          ),
      },
      {
        id: 'type',
        accessorKey: 'type',
        enableSorting: false,
        meta: {label: 'Type'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Type</DataTableColumnHeader>,
        cell: ({row}) => (
          <Badge variant={row.original.type === 'STATIC' ? 'neutral' : 'default'} className="shrink-0">
            {row.original.type === 'STATIC' ? 'Static' : 'Dynamic'}
          </Badge>
        ),
      },
      {
        id: 'memberCount',
        accessorKey: 'memberCount',
        sortDescFirst: true,
        meta: {label: 'Members', headClassName: 'text-right', cellClassName: 'text-right'} satisfies DataTableColumnMeta,
        header: ({column}) => (
          <DataTableColumnHeader column={column} align="right">
            Members
          </DataTableColumnHeader>
        ),
        cell: ({row}) => (
          <span className="text-sm font-semibold tabular-nums text-neutral-900">
            {row.original.memberCount.toLocaleString()}
          </span>
        ),
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        sortDescFirst: true,
        meta: {label: 'Refreshed'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Refreshed</DataTableColumnHeader>,
        cell: ({row}) => <RefreshedAt date={row.original.updatedAt} className="text-sm text-neutral-500" />,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        meta: {label: 'Actions', headClassName: 'text-right', cellClassName: 'text-right'} satisfies DataTableColumnMeta,
        header: () => <span className="flex justify-end">Actions</span>,
        cell: ({row}) => <div className="flex justify-end">{deleteButton(row.original)}</div>,
      },
    ],
    [segmentNames],
  );

  const table = useReactTable<Segment>({
    data: filteredSegments,
    columns,
    state: {sorting, columnVisibility},
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    enableMultiSort: false,
    // Every segment is already loaded, so sorting happens client-side.
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
  });

  const hasSegments = !!segments && segments.length > 0;
  const hasActiveFilters = searchInput.trim() !== '' || typeFilter !== 'ALL';

  const clearFilters = () => {
    setSearchInput('');
    setTypeFilter('ALL');
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
                Groups of contacts, defined by filters or picked by hand. {hasSegments ? `${segments.length} total` : ''}
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

          {/* Control row — same layout as the other list pages. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onClear={() => setSearchInput('')}
              placeholder="Search by name or rule…"
              className="flex-1"
            />
            <div className="flex items-center gap-2 shrink-0">
              <FilterPill
                title="Type"
                multiple={false}
                options={TYPE_OPTIONS}
                selected={typeFilter === 'ALL' ? [] : [typeFilter]}
                onChange={next => setTypeFilter((next[0] as TypeFilter) ?? 'ALL')}
              />
              {view === 'table' && <DataTableViewOptions table={table} lockedColumnIds={['name', 'actions']} />}
              <span className="hidden sm:block h-5 w-px bg-neutral-200" aria-hidden="true" />
              <DataTableViewSwitcher view={view} onChange={setView} />
            </div>
          </div>

          {/* Segments */}
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <IconSpinner />
                </div>
              </CardContent>
            </Card>
          ) : filteredSegments.length === 0 ? (
            <Card>
              <CardContent>
                {hasSegments && hasActiveFilters ? (
                  <NoResultsState icon={Filter} itemNoun="segments" onClear={clearFilters} />
                ) : (
                  <EmptyState
                    icon={Filter}
                    title="No segments yet"
                    description="Group contacts by attributes to target specific audiences."
                    action={
                      <Button asChild>
                        <Link href="/segments/new">
                          <Plus className="h-4 w-4" />
                          Create segment
                        </Link>
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          ) : view === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {table.getRowModel().rows.map(({original: segment}) => (
                <Card
                  key={segment.id}
                  className="transition-colors hover:border-neutral-300 flex flex-col [&:has([data-card-link]:focus-visible)]:ring-2 [&:has([data-card-link]:focus-visible)]:ring-ring [&:has([data-card-link]:focus-visible)]:ring-offset-2"
                >
                  <Link
                    href={`/segments/${segment.id}`}
                    data-card-link=""
                    className="flex-1 block p-6 pb-4 hover:bg-neutral-50/50 transition-colors rounded-t-xl focus-visible:outline-none"
                    aria-label={`Open ${segment.name}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-900 leading-snug truncate">{segment.name}</h3>
                          {segment.type === 'STATIC' && (
                            <Badge variant="neutral" className="shrink-0">
                              Static
                            </Badge>
                          )}
                        </div>
                        {segment.description && (
                          <p className="mt-0.5 text-sm text-neutral-500 truncate">{segment.description}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold leading-tight tabular-nums text-neutral-900">
                          {segment.memberCount.toLocaleString()}
                        </p>
                        <p className="text-xs text-neutral-400">members</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      {segment.type === 'STATIC' ? (
                        <StaticRules />
                      ) : (
                        <SegmentRuleSummary condition={segment.condition} segmentNames={segmentNames} />
                      )}
                    </div>
                  </Link>
                  <div className="px-6 py-2 border-t border-neutral-100 flex items-center justify-between">
                    <RefreshedAt date={segment.updatedAt} className="text-xs text-neutral-400" />
                    {deleteButton(segment)}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <DataTable table={table} />
              </CardContent>
            </Card>
          )}
        </div>

        <ConfirmDialog
          open={segmentToDelete !== null}
          onOpenChange={open => !open && setSegmentToDelete(null)}
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

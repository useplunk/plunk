import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  IconSpinner,
  Input,
} from '@plunk/ui';
import type {Template} from '@plunk/db';
import {TemplateSchemas} from '@plunk/shared';
import type {PaginatedResponse} from '@plunk/types';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {DashboardLayout} from '../../components/DashboardLayout';
import {
  BulkActionBar,
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  DataTableFilter,
  DataTableViewOptions,
  DataTableViewSwitcher,
  NoResultsState,
  isDataTableView,
  type DataTableColumnMeta,
  type DataTableView,
} from '../../components/data-table';
import {network} from '../../lib/network';
import {formatRelativeTime} from '../../lib/dateUtils';
import {useColumnVisibility} from '../../lib/hooks/useColumnVisibility';
import {usePersistentState} from '../../lib/hooks/usePersistentState';
import {useShiftClickSelection} from '../../lib/hooks/useShiftClickSelection';
import {Calendar, Copy, Edit, FileText, Plus, Search, Trash2, X} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import dayjs from 'dayjs';

type TypeFilter = 'ALL' | 'TRANSACTIONAL' | 'MARKETING' | 'HEADLESS';

const VIEW_STORAGE_KEY = 'plunk:templates:view';
const COLUMNS_STORAGE_KEY = 'plunk:templates:columns';

// Name + Actions are locked-visible (see lockedColumnIds below). `select` is
// also locked. Everything starts visible.
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  select: true,
  name: true,
  type: true,
  subject: true,
  updatedAt: true,
  actions: true,
};

// Fixed-value options for the Type column's faceted filter (table view) and the
// existing card-view pill row. Single source of truth for both.
const TYPE_OPTIONS = ['MARKETING', 'TRANSACTIONAL', 'HEADLESS'] as const;

export default function TemplatesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [view, setView] = usePersistentState<DataTableView>(VIEW_STORAGE_KEY, 'card', isDataTableView);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<'idle' | 'loading'>('idle');

  // Tanstack table state.
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useColumnVisibility(COLUMNS_STORAGE_KEY, DEFAULT_COLUMN_VISIBILITY);
  // Row-selection state drives the BulkActionBar above the table.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Build the sort query string from tanstack state. The backend is
  // authoritative (`?sort=<field>&dir=asc|desc`); without those params it falls
  // back to its default order. manualSorting is on, so the client only mirrors.
  const sortParam = sorting[0]?.id ?? '';
  const dirParam = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : '';

  const {data, mutate, isLoading} = useSWR<PaginatedResponse<Template>>(
    `/templates?page=${page}&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ''}${
      typeFilter !== 'ALL' ? `&type=${typeFilter}` : ''
    }${sortParam ? `&sort=${sortParam}&dir=${dirParam}` : ''}`,
    {revalidateOnFocus: false},
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Clear row selection whenever the visible data set changes (page, search,
  // type filter). Selections only make sense for currently-visible rows —
  // keeping a stale selection across pagination would let the user bulk-delete
  // templates they can no longer see.
  useEffect(() => {
    setRowSelection({});
  }, [page, search, typeFilter]);

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      await network.fetch('DELETE', `/templates/${templateToDelete}`);
      toast.success('Template deleted');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the template. Try again.');
    } finally {
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await network.fetch('POST', `/templates/${templateId}/duplicate`);
      toast.success('Template duplicated');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t duplicate the template. Try again.');
    }
  };

  const selectedIds = useMemo(() => Object.keys(rowSelection).filter(id => rowSelection[id]), [rowSelection]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteStatus('loading');
    try {
      const result = await network.fetch<{deleted?: number}, typeof TemplateSchemas.bulkUpdate>(
        'POST',
        '/templates/bulk-update',
        {
          ids: selectedIds,
          delete: true,
        },
      );
      const count = result?.deleted ?? selectedIds.length;
      toast.success(`${count} template${count === 1 ? '' : 's'} deleted`);
      setRowSelection({});
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete those templates. Try again.');
    } finally {
      // ConfirmDialog closes itself after onConfirm resolves.
      setBulkDeleteStatus('idle');
    }
  };

  const columns = useMemo<Array<ColumnDef<Template, unknown>>>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false, // Selection column is locked-visible.
        meta: {label: 'Select', headClassName: 'w-10', cellClassName: 'w-10'} satisfies DataTableColumnMeta,
        header: ({table}) => (
          <Checkbox
            aria-label="Select all rows on this page"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({row}) => (
          <Checkbox
            aria-label={`Select ${row.original.name}`}
            checked={row.getIsSelected()}
            // Capture shift-key state before the toggle, then apply range
            // selection on change (see useShiftClickSelection below).
            onClick={e => {
              e.stopPropagation();
              shiftSelect.onClick(e);
            }}
            onCheckedChange={value => shiftSelect.onCheckedChange(row, value)}
          />
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        enableHiding: false, // Name column is locked-visible.
        meta: {label: 'Name'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Name</DataTableColumnHeader>,
        cell: ({row}) => (
          <Link
            href={`/templates/${row.original.id}`}
            className="text-sm font-medium text-neutral-900 hover:text-neutral-700 focus-visible:outline-none focus-visible:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'type',
        accessorKey: 'type',
        enableSorting: false, // Type is faceted-filtered, not sorted.
        meta: {label: 'Type'} satisfies DataTableColumnMeta,
        header: ({column}) => (
          <DataTableColumnHeader
            column={column}
            filter={
              <DataTableFacetedFilter
                title="Type"
                multiple={false}
                options={TYPE_OPTIONS.map(t => ({value: t, label: t.toLowerCase()}))}
                selected={typeFilter === 'ALL' ? [] : [typeFilter]}
                onChange={next => {
                  setTypeFilter((next[0] as TypeFilter) ?? 'ALL');
                  setPage(1);
                }}
              />
            }
          >
            Type
          </DataTableColumnHeader>
        ),
        cell: ({row}) => (
          <Badge className="capitalize" variant="neutral">
            {row.original.type.toLowerCase()}
          </Badge>
        ),
      },
      {
        id: 'subject',
        accessorKey: 'subject',
        enableSorting: false, // No backend sort field for subject.
        meta: {label: 'Subject', cellClassName: 'max-w-xs'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Subject</DataTableColumnHeader>,
        cell: ({row}) => (
          <p className="text-sm text-neutral-700 truncate" title={row.original.subject}>
            {row.original.subject}
          </p>
        ),
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        // ISO-string values sort ascending on first click by default; flip so
        // the first click on "Updated" surfaces the most recently edited rows.
        sortDescFirst: true,
        meta: {label: 'Updated'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Updated</DataTableColumnHeader>,
        cell: ({row}) => (
          <div className="group relative inline-block cursor-help text-sm text-neutral-500 whitespace-nowrap">
            {formatRelativeTime(row.original.updatedAt)}
            <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap">
              {dayjs(row.original.updatedAt).format('DD MMMM YYYY, hh:mm')}
            </div>
          </div>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false, // Actions column is locked-visible.
        meta: {label: 'Actions', headClassName: 'text-right', cellClassName: 'text-right'} satisfies DataTableColumnMeta,
        header: () => <span className="flex justify-end">Actions</span>,
        cell: ({row}) => (
          <div className="flex items-center justify-end gap-1">
            <Button asChild variant="ghost" size="sm" title="Edit template">
              <Link href={`/templates/${row.original.id}`} aria-label="Edit template">
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Duplicate template"
              aria-label="Duplicate template"
              onClick={() => handleDuplicate(row.original.id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Delete template"
              aria-label="Delete template"
              onClick={() => {
                setTemplateToDelete(row.original.id);
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    // Re-creating columns on every render is cheap and avoids stale-closure bugs
    // for the typeFilter-driven facet and delete/duplicate handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeFilter],
  );

  const table = useReactTable<Template>({
    data: data?.data ?? [],
    columns,
    state: {sorting, columnVisibility, rowSelection},
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableMultiSort: false,
    manualSorting: true, // Backend handles sorting; client just exposes ?sort=&dir=.
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
  });

  // Range (shift-click) selection for the checkbox column.
  const shiftSelect = useShiftClickSelection(table);

  const hasData = data && data.data.length > 0;

  // Whether any search/facet filter is currently narrowing the list. Drives the
  // "no results vs first-run empty" distinction below.
  const hasActiveFilters = search !== '' || typeFilter !== 'ALL';

  // Reset everything that can hide rows (search + type + pagination) so the
  // user can recover from a filter combination that matched nothing.
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setTypeFilter('ALL');
    setPage(1);
  };

  return (
    <>
      <NextSeo title="Templates" />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Templates</h1>
              <p className="text-neutral-500 mt-2 text-sm sm:text-base">
                Reusable emails for campaigns and workflows.{' '}
                {data?.total ? `${data.total} total` : ''}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/templates/create">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create template</span>
                <span className="sm:hidden">Create</span>
              </Link>
            </Button>
          </div>

          {/* Control row. One aligned cluster of 32px-tall controls:
              - Search input: always present (both views).
              - Type filter: CARD VIEW ONLY, as a toolbar dropdown matching the
                Columns selector. In table view the Type filter lives in the
                column header facet instead (same shared menu body).
              - Columns selector: TABLE VIEW ONLY.
              - A hairline divider separates the data controls (filter/columns)
                from the layout control (view switcher). */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search templates…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-10 pr-10 h-8 text-xs"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {view === 'card' && (
                <DataTableFilter
                  title="Type"
                  multiple={false}
                  options={TYPE_OPTIONS.map(t => ({value: t, label: t.toLowerCase()}))}
                  selected={typeFilter === 'ALL' ? [] : [typeFilter]}
                  onChange={next => {
                    setTypeFilter((next[0] as TypeFilter) ?? 'ALL');
                    setPage(1);
                  }}
                />
              )}
              {view === 'table' && (
                <DataTableViewOptions table={table} lockedColumnIds={['select', 'name', 'actions']} />
              )}
              <span className="hidden sm:block h-5 w-px bg-neutral-200" aria-hidden="true" />
              <DataTableViewSwitcher view={view} onChange={setView} />
            </div>
          </div>

          {/* Bulk action bar — table view only (the selection column lives
              there). Wires the delete action; the children slot stays open for
              future bulk operations. */}
          {view === 'table' && (
            <BulkActionBar selectedCount={selectedIds.length} itemNoun="template" onClear={() => setRowSelection({})}>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
                disabled={bulkDeleteStatus === 'loading'}
              >
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
            </BulkActionBar>
          )}

          {/* Templates */}
          <div>
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <IconSpinner />
                  </div>
                </CardContent>
              </Card>
            ) : !hasData ? (
              <Card>
                <CardContent>
                  {hasActiveFilters ? (
                    // Items exist, but the active search/type filters matched
                    // none — offer a one-click recovery.
                    <NoResultsState icon={FileText} itemNoun="templates" onClear={clearFilters} />
                  ) : (
                    // Genuinely empty project — first-run state.
                    <EmptyState
                      icon={FileText}
                      title="No templates yet"
                      description="Create reusable email designs for campaigns."
                      action={
                        <Button asChild>
                          <Link href="/templates/create">
                            <Plus className="h-4 w-4" />
                            Create template
                          </Link>
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            ) : view === 'card' ? (
              <>
                {/* Card Grid View — unchanged from before. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data?.data.map(template => (
                    <Card
                      key={template.id}
                      className="transition-colors hover:border-neutral-300 flex flex-col [&:has([data-card-link]:focus-visible)]:ring-2 [&:has([data-card-link]:focus-visible)]:ring-ring [&:has([data-card-link]:focus-visible)]:ring-offset-2"
                    >
                      <Link
                        href={`/templates/${template.id}`}
                        data-card-link=""
                        className="flex-1 block p-6 pb-4 hover:bg-neutral-50/50 transition-colors rounded-t-xl focus-visible:outline-none"
                        aria-label={`Edit ${template.name}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-neutral-900 leading-snug">{template.name}</h3>
                          <Badge className="capitalize shrink-0 mt-0.5" variant="neutral">
                            {template.type.toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-neutral-700 truncate">{template.subject}</p>
                      </Link>
                      <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <Calendar className="h-3 w-3" />
                          <div className="group relative inline-block cursor-help">
                            <span>Updated {formatRelativeTime(template.updatedAt)}</span>
                            <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-0 mb-1 whitespace-nowrap">
                              {dayjs(template.updatedAt).format('DD MMMM YYYY, hh:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="sm" title="Edit template">
                            <Link href={`/templates/${template.id}`} aria-label="Edit template">
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Duplicate template"
                            onClick={() => handleDuplicate(template.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete template"
                            onClick={() => {
                              setTemplateToDelete(template.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-neutral-500">
                      Showing {(page - 1) * data.pageSize + 1} to {Math.min(page * data.pageSize, data.total)} of{' '}
                      {data.total} templates
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                        Previous
                      </Button>
                      <span className="text-sm text-neutral-700">
                        Page {page} of {data.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === data.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Table View (tanstack-driven) */}
                <Card>
                  <CardContent className="p-0">
                    <DataTable table={table} />
                  </CardContent>
                </Card>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-neutral-500">
                      Showing {(page - 1) * data.pageSize + 1} to {Math.min(page * data.pageSize, data.total)} of{' '}
                      {data.total} templates
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                        Previous
                      </Button>
                      <span className="text-sm text-neutral-700">
                        Page {page} of {data.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === data.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete this template?"
          description="Campaigns already sent with it are unaffected. This can't be undone."
          confirmText="Delete template"
          variant="destructive"
        />

        <ConfirmDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
          onConfirm={handleBulkDelete}
          title={`Delete ${selectedIds.length} template${selectedIds.length === 1 ? '' : 's'}?`}
          description="Campaigns already sent with them are unaffected, and this can't be undone. A template used by a workflow step can't be deleted — if your selection includes one, nothing will be deleted."
          confirmText="Delete templates"
          variant="destructive"
          status={bulkDeleteStatus}
        />
      </DashboardLayout>
    </>
  );
}

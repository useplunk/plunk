import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconSpinner,
  Input,
} from '@plunk/ui';
import type {Campaign, Template} from '@plunk/db';
import {CampaignStatus} from '@plunk/db';
import {CampaignSchemas} from '@plunk/shared';
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
import {TemplateSelectionDialog} from '../../components/TemplateSelectionDialog';
import {CampaignSelectionDialog} from '../../components/CampaignSelectionDialog';
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
import {useShiftClickSelection} from '../../lib/hooks/useShiftClickSelection';
import {network} from '../../lib/network';
import {formatRelativeTime} from '../../lib/dateUtils';
import {Ban, Calendar, ChevronDown, Copy, Edit, FileText, Mail, Plus, RefreshCw, Search, Trash2, X} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import dayjs from 'dayjs';
import {useColumnVisibility} from '../../lib/hooks/useColumnVisibility';
import {usePersistentState} from '../../lib/hooks/usePersistentState';

type StatusFilter = 'ALL' | 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';

const VIEW_STORAGE_KEY = 'plunk:campaigns:view';
const COLUMNS_STORAGE_KEY = 'plunk:campaigns:columns';

// Name + Actions are locked-visible (see lockedColumnIds below). `select` is
// also locked. Everything starts visible.
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  select: true,
  name: true,
  subject: true,
  status: true,
  recipients: true,
  updatedAt: true,
  actions: true,
};

// Fixed-value options for the Status column's faceted filter (table view) and
// the existing card-view pill row. Single source of truth for both.
const STATUS_OPTIONS: ReadonlyArray<Exclude<StatusFilter, 'ALL'>> = [
  'DRAFT',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'CANCELLED',
];

const statusBadgeConfig: Record<CampaignStatus, {label: string; variant: 'neutral' | 'default' | 'success'}> = {
  DRAFT: {label: 'Draft', variant: 'neutral'},
  SCHEDULED: {label: 'Scheduled', variant: 'default'},
  SENDING: {label: 'Sending', variant: 'default'},
  SENT: {label: 'Sent', variant: 'success'},
  CANCELLED: {label: 'Cancelled', variant: 'neutral'},
};

const getStatusBadge = (status: CampaignStatus) => {
  const {label, variant} = statusBadgeConfig[status];
  return (
    <Badge variant={variant} className="shrink-0">
      {label}
    </Badge>
  );
};

export default function CampaignsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  // Status travels with the id: cancelling has two outcomes and the dialog has to
  // name the right one. Deliberately not keyed off the row's `sentCount` -- that
  // column is only written when a send finalizes, so it reads 0 for a campaign that
  // is mid-flight and has in fact already sent thousands.
  const [campaignToCancel, setCampaignToCancel] = useState<{id: string; status: CampaignStatus} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<'idle' | 'loading'>('idle');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [view, setView] = usePersistentState<DataTableView>(VIEW_STORAGE_KEY, 'card', isDataTableView);

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

  const {data, mutate, isLoading} = useSWR<PaginatedResponse<Campaign>>(
    `/campaigns?page=${page}&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ''}${
      statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''
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
  // status filter). Selections only make sense for currently-visible rows —
  // keeping a stale selection across pagination would let the user bulk-delete
  // campaigns they can no longer see.
  useEffect(() => {
    setRowSelection({});
  }, [page, search, statusFilter]);

  const handleCancel = async () => {
    if (!campaignToCancel) return;

    try {
      const res = await network.fetch<{data: {status: CampaignStatus}; revertPending?: boolean}>(
        'POST',
        `/campaigns/${campaignToCancel.id}/cancel`,
      );
      // A campaign stopped mid-send has its unsent emails cleared in the background and
      // only then becomes a draft, so the list reports the stop rather than an outcome
      // it would have to poll for. The next load shows where it landed.
      toast.success(
        res.revertPending
          ? 'Campaign stopped. Clearing its unsent emails, then it returns to draft.'
          : res.data.status === CampaignStatus.DRAFT
            ? 'Campaign stopped and returned to draft'
            : 'Campaign canceled',
      );
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t cancel the campaign. Try again.');
    } finally {
      setCampaignToCancel(null);
    }
  };

  const handleDuplicate = async (campaignId: string) => {
    try {
      await network.fetch('POST', `/campaigns/${campaignId}/duplicate`);
      toast.success('Campaign duplicated');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t duplicate the campaign. Try again.');
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;

    try {
      await network.fetch('DELETE', `/campaigns/${campaignToDelete}`);
      toast.success('Campaign deleted');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the campaign. Try again.');
    } finally {
      setCampaignToDelete(null);
    }
  };

  const selectedIds = useMemo(() => Object.keys(rowSelection).filter(id => rowSelection[id]), [rowSelection]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteStatus('loading');
    try {
      const result = await network.fetch<{deleted?: number}, typeof CampaignSchemas.bulkUpdate>(
        'POST',
        '/campaigns/bulk-update',
        {
          ids: selectedIds,
          delete: true,
        },
      );
      const count = result?.deleted ?? selectedIds.length;
      toast.success(`${count} campaign${count === 1 ? '' : 's'} deleted`);
      setRowSelection({});
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete those campaigns. Try again.');
    } finally {
      // ConfirmDialog closes itself after onConfirm resolves.
      setBulkDeleteStatus('idle');
    }
  };

  const handleSelectTemplate = (
    template: Template,
    selectedFields: {
      subject: boolean;
      body: boolean;
      from: boolean;
      fromName: boolean;
      replyTo: boolean;
    },
  ) => {
    // Navigate to create page with template data as query params
    const query: Record<string, string> = {
      name: `${template.name}`,
    };

    // Only include templateId if body is selected (needed to fetch body content)
    if (selectedFields.body) {
      query.templateId = template.id;
    }

    // Add selected fields to query params
    if (selectedFields.subject) {
      query.subject = template.subject;
    }
    if (selectedFields.from) {
      query.from = template.from;
    }
    if (selectedFields.fromName && template.fromName) {
      query.fromName = template.fromName;
    }
    if (selectedFields.replyTo && template.replyTo) {
      query.replyTo = template.replyTo;
    }

    void router.push({
      pathname: '/campaigns/create',
      query,
    });
  };

  const handleSelectCampaign = (
    campaign: Campaign,
    selectedFields: {
      subject: boolean;
      body: boolean;
      from: boolean;
      fromName: boolean;
      replyTo: boolean;
      audience: boolean;
    },
  ) => {
    // Navigate to create page with campaign data as query params
    const query: Record<string, string> = {
      name: `${campaign.name}`,
    };

    // Only include campaignId if body is selected (needed to fetch body content)
    if (selectedFields.body) {
      query.campaignId = campaign.id;
    }

    // Add selected fields to query params
    if (selectedFields.subject) {
      query.subject = campaign.subject;
    }
    if (selectedFields.from) {
      query.from = campaign.from;
    }
    if (selectedFields.fromName && campaign.fromName) {
      query.fromName = campaign.fromName;
    }
    if (selectedFields.replyTo && campaign.replyTo) {
      query.replyTo = campaign.replyTo;
    }
    if (selectedFields.audience) {
      query.audienceType = campaign.audienceType;
      if (campaign.segmentId) {
        query.segmentId = campaign.segmentId;
      }
    }

    void router.push({
      pathname: '/campaigns/create',
      query,
    });
  };

  // Recipients/delivered summary mirroring what each card surfaces, condensed
  // into a single cell appropriate per status.
  const recipientSummary = (campaign: Campaign) => {
    const deliveryPct =
      campaign.totalRecipients > 0 ? (campaign.sentCount / campaign.totalRecipients) * 100 : 0;
    const openRate = campaign.sentCount > 0 ? (campaign.openedCount / campaign.sentCount) * 100 : 0;

    switch (campaign.status) {
      case 'SENT':
        return (
          <span className="text-sm text-neutral-700">
            <strong className="font-semibold text-neutral-900">{campaign.sentCount.toLocaleString()}</strong>
            <span className="text-neutral-400 ml-1 text-xs">sent</span>
            <span className="text-neutral-300 mx-1.5">·</span>
            <strong className="font-semibold text-neutral-900">{openRate.toFixed(1)}%</strong>
            <span className="text-neutral-400 ml-1 text-xs">opens</span>
          </span>
        );
      case 'SENDING':
        return (
          <span className="text-sm text-neutral-700">
            <strong className="font-semibold text-neutral-900">{deliveryPct.toFixed(0)}%</strong>
            <span className="text-neutral-400 ml-1 text-xs">delivered</span>
          </span>
        );
      default:
        return (
          <span className="text-sm text-neutral-700">
            <strong className="font-semibold text-neutral-900">{campaign.totalRecipients.toLocaleString()}</strong>
            <span className="text-neutral-400 ml-1 text-xs">recipients</span>
          </span>
        );
    }
  };

  const columns = useMemo<Array<ColumnDef<Campaign, unknown>>>(
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
            href={`/campaigns/${row.original.id}`}
            className="text-sm font-medium text-neutral-900 hover:text-neutral-700 focus-visible:outline-none focus-visible:underline"
          >
            {row.original.name}
          </Link>
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
        id: 'status',
        accessorKey: 'status',
        enableSorting: false, // Status is faceted-filtered, not sorted.
        meta: {label: 'Status'} satisfies DataTableColumnMeta,
        header: ({column}) => (
          <DataTableColumnHeader
            column={column}
            filter={
              <DataTableFacetedFilter
                title="Status"
                multiple={false}
                options={STATUS_OPTIONS.map(s => ({value: s, label: statusBadgeConfig[s].label}))}
                selected={statusFilter === 'ALL' ? [] : [statusFilter]}
                onChange={next => {
                  setStatusFilter((next[0] as StatusFilter) ?? 'ALL');
                  setPage(1);
                }}
              />
            }
          >
            Status
          </DataTableColumnHeader>
        ),
        cell: ({row}) => getStatusBadge(row.original.status),
      },
      {
        id: 'recipients',
        enableSorting: false, // No backend sort field for computed counts.
        meta: {label: 'Recipients'} satisfies DataTableColumnMeta,
        header: ({column}) => <DataTableColumnHeader column={column}>Recipients</DataTableColumnHeader>,
        cell: ({row}) => recipientSummary(row.original),
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
            <Button
              asChild
              variant="ghost"
              size="sm"
              title={row.original.status === 'DRAFT' ? 'Edit campaign' : 'View campaign'}
            >
              <Link
                href={`/campaigns/${row.original.id}`}
                aria-label={row.original.status === 'DRAFT' ? 'Edit campaign' : 'View campaign'}
              >
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Duplicate campaign"
              aria-label="Duplicate campaign"
              onClick={() => handleDuplicate(row.original.id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {row.original.status === 'DRAFT' && (
              <Button
                variant="ghost"
                size="sm"
                title="Delete campaign"
                aria-label="Delete campaign"
                onClick={() => {
                  setCampaignToDelete(row.original.id);
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {(row.original.status === 'SCHEDULED' || row.original.status === 'SENDING') && (
              <Button
                variant="ghost"
                size="sm"
                title="Cancel campaign"
                aria-label="Cancel campaign"
                onClick={() => {
                  setCampaignToCancel({id: row.original.id, status: row.original.status});
                  setShowCancelDialog(true);
                }}
              >
                <Ban className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // Re-creating columns on every render is cheap and avoids stale-closure bugs
    // for the statusFilter-driven facet and cancel/delete/duplicate handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusFilter],
  );

  const table = useReactTable<Campaign>({
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
  const hasActiveFilters = search !== '' || statusFilter !== 'ALL';

  // Reset everything that can hide rows (search + status + pagination) so the
  // user can recover from a filter combination that matched nothing.
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  return (
    <>
      <NextSeo title="Campaigns" />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Campaigns</h1>
              <p className="text-neutral-500 mt-2 text-sm sm:text-base">
                One-off emails sent to a list of contacts. {data?.total ? `${data.total} total` : ''}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create campaign</span>
                  <span className="sm:hidden">Create</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuItem asChild className="py-3 cursor-pointer">
                  <Link href="/campaigns/create" className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-0.5 text-neutral-700" />
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="font-medium text-sm">Empty campaign</span>
                      <span className="text-xs text-neutral-500 leading-snug">
                        Start from scratch with a blank canvas
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTemplateDialog(true)} className="py-3 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-neutral-700" />
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="font-medium text-sm">From template</span>
                      <span className="text-xs text-neutral-500 leading-snug">
                        Use an existing template as a starting point
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCampaignDialog(true)} className="py-3 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-4 w-4 mt-0.5 text-neutral-700" />
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="font-medium text-sm">From previous campaign</span>
                      <span className="text-xs text-neutral-500 leading-snug">
                        Copy content and settings from an existing campaign
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Control row. One aligned cluster of 32px-tall controls:
              - Search input: always present (both views).
              - Status filter: CARD VIEW ONLY, as a toolbar dropdown matching the
                Columns selector. In table view the Status filter lives in the
                column header facet instead (same shared menu body).
              - Columns selector: TABLE VIEW ONLY.
              - A hairline divider separates the data controls (filter/columns)
                from the layout control (view switcher). */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search campaigns…"
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
                  title="Status"
                  multiple={false}
                  options={STATUS_OPTIONS.map(s => ({value: s, label: statusBadgeConfig[s].label}))}
                  selected={statusFilter === 'ALL' ? [] : [statusFilter]}
                  onChange={next => {
                    setStatusFilter((next[0] as StatusFilter) ?? 'ALL');
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
            <BulkActionBar selectedCount={selectedIds.length} itemNoun="campaign" onClear={() => setRowSelection({})}>
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

          {/* Campaigns */}
          <div className="space-y-4">
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
                    // Items exist, but the active search/status filters matched
                    // none — offer a one-click recovery.
                    <NoResultsState icon={Mail} itemNoun="campaigns" onClear={clearFilters} />
                  ) : (
                    // Genuinely empty project — first-run state.
                    <EmptyState
                      icon={Mail}
                      title="No campaigns yet"
                      description="Send one-off emails to groups of contacts."
                      action={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button>
                              <Plus className="h-4 w-4" />
                              Create Campaign
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-80">
                            <DropdownMenuItem asChild className="py-3 cursor-pointer">
                              <Link href="/campaigns/create" className="flex items-start gap-3">
                                <Mail className="h-4 w-4 mt-0.5 text-neutral-700" />
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <span className="font-medium text-sm">Empty campaign</span>
                                  <span className="text-xs text-neutral-500 leading-snug">
                                    Start from scratch with a blank canvas
                                  </span>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowTemplateDialog(true)} className="py-3 cursor-pointer">
                              <div className="flex items-start gap-3">
                                <FileText className="h-4 w-4 mt-0.5 text-neutral-700" />
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <span className="font-medium text-sm">From template</span>
                                  <span className="text-xs text-neutral-500 leading-snug">
                                    Use an existing template as a starting point
                                  </span>
                                </div>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowCampaignDialog(true)} className="py-3 cursor-pointer">
                              <div className="flex items-start gap-3">
                                <RefreshCw className="h-4 w-4 mt-0.5 text-neutral-700" />
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <span className="font-medium text-sm">From previous campaign</span>
                                  <span className="text-xs text-neutral-500 leading-snug">
                                    Copy content and settings from an existing campaign
                                  </span>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            ) : view === 'card' ? (
              <>
                {/* Card List View — unchanged from before. */}
                {data?.data.map(campaign => {
                  const openRate = campaign.sentCount > 0 ? (campaign.openedCount / campaign.sentCount) * 100 : 0;
                  const clickRate = campaign.sentCount > 0 ? (campaign.clickedCount / campaign.sentCount) * 100 : 0;
                  const deliveryPct =
                    campaign.totalRecipients > 0 ? (campaign.sentCount / campaign.totalRecipients) * 100 : 0;

                  return (
                    <Card key={campaign.id} className="transition-colors hover:border-neutral-300 flex flex-col [&:has([data-card-link]:focus-visible)]:ring-2 [&:has([data-card-link]:focus-visible)]:ring-ring [&:has([data-card-link]:focus-visible)]:ring-offset-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        data-card-link=""
                        className="flex-1 block p-6 pb-4 hover:bg-neutral-50/50 transition-colors rounded-t-xl focus-visible:outline-none"
                        aria-label={`Open ${campaign.name}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-neutral-900 leading-snug truncate">{campaign.name}</h3>
                          {getStatusBadge(campaign.status)}
                        </div>

                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          {campaign.status === 'DRAFT' && (
                            <>
                              <span>
                                <strong className="font-semibold text-neutral-900">{campaign.totalRecipients.toLocaleString()}</strong>
                                <span className="text-neutral-400 ml-1 text-xs">estimated recipients</span>
                              </span>
                            </>
                          )}
                          {campaign.status === 'SCHEDULED' && (
                            <>
                              <span>
                                <strong className="font-semibold text-neutral-900">{campaign.totalRecipients.toLocaleString()}</strong>
                                <span className="text-neutral-400 ml-1 text-xs">recipients</span>
                              </span>
                              {campaign.scheduledFor && (
                                <>
                                  <span className="h-3 w-px bg-neutral-200" />
                                  <span className="text-xs text-neutral-500">
                                    Sending {dayjs(campaign.scheduledFor).format('MMM D, YYYY [at] h:mm A')}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                          {campaign.status === 'SENDING' && (
                            <>
                              <span>
                                <strong className="font-semibold text-neutral-900">{deliveryPct.toFixed(0)}%</strong>
                                <span className="text-neutral-400 ml-1 text-xs">delivered</span>
                              </span>
                              <span className="h-3 w-px bg-neutral-200" />
                              <span>
                                <strong className="font-semibold text-neutral-900">{openRate.toFixed(1)}%</strong>
                                <span className="text-neutral-400 ml-1 text-xs">opens</span>
                              </span>
                            </>
                          )}
                          {campaign.status === 'SENT' && (
                            <>
                              <span>
                                <strong className="font-semibold text-neutral-900">{campaign.sentCount.toLocaleString()}</strong>
                                <span className="text-neutral-400 ml-1 text-xs">sent</span>
                              </span>
                              <span className="h-3 w-px bg-neutral-200" />
                              <span>
                                <strong className="font-semibold text-neutral-900">{openRate.toFixed(1)}%</strong>
                                <span className="text-neutral-400 ml-1 text-xs">opens</span>
                              </span>
                              {clickRate > 0 && (
                                <>
                                  <span className="h-3 w-px bg-neutral-200" />
                                  <span>
                                    <strong className="font-semibold text-neutral-900">{clickRate.toFixed(1)}%</strong>
                                    <span className="text-neutral-400 ml-1 text-xs">clicks</span>
                                  </span>
                                </>
                              )}
                            </>
                          )}
                          {campaign.status === 'CANCELLED' && (
                            <span>
                              <strong className="font-semibold text-neutral-900">{campaign.totalRecipients.toLocaleString()}</strong>
                              <span className="text-neutral-400 ml-1 text-xs">recipients</span>
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <Calendar className="h-3 w-3" />
                          <div className="group relative inline-block cursor-help">
                            <span>Updated {formatRelativeTime(campaign.updatedAt)}</span>
                            <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-0 mb-1 whitespace-nowrap">
                              {dayjs(campaign.updatedAt).format('DD MMMM YYYY, hh:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="sm" title={campaign.status === 'DRAFT' ? 'Edit campaign' : 'View campaign'}>
                            <Link href={`/campaigns/${campaign.id}`} aria-label={campaign.status === 'DRAFT' ? 'Edit campaign' : 'View campaign'}><Edit className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" title="Duplicate campaign" onClick={() => handleDuplicate(campaign.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          {campaign.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete campaign"
                              onClick={() => {
                                setCampaignToDelete(campaign.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {(campaign.status === 'SCHEDULED' || campaign.status === 'SENDING') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Cancel campaign"
                              onClick={() => {
                                setCampaignToCancel({id: campaign.id, status: campaign.status});
                                setShowCancelDialog(true);
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-neutral-600">
                      Page {page} of {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                    >
                      Next
                    </Button>
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
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-neutral-600">
                      Page {page} of {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleCancel}
          title={campaignToCancel?.status === CampaignStatus.SCHEDULED ? 'Stop this campaign?' : 'Cancel this campaign?'}
          description={
            campaignToCancel?.status === CampaignStatus.SCHEDULED
              ? 'Nothing has been sent yet, so the campaign returns to draft and stays editable.'
              : 'Sending stops now. If nothing has gone out yet the campaign returns to draft; otherwise it is permanently cancelled and contacts who already received it keep their copy.'
          }
          cancelText="Keep sending"
          confirmText={campaignToCancel?.status === CampaignStatus.SCHEDULED ? 'Stop campaign' : 'Cancel campaign'}
          variant="destructive"
        />

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete this draft?"
          description="The draft and its content are gone for good."
          confirmText="Delete campaign"
          variant="destructive"
        />

        <ConfirmDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
          onConfirm={handleBulkDelete}
          title={`Delete ${selectedIds.length} campaign${selectedIds.length === 1 ? '' : 's'}?`}
          description="Only drafts can be deleted. If your selection includes a sent or scheduled campaign, nothing will be deleted."
          confirmText="Delete campaigns"
          variant="destructive"
          status={bulkDeleteStatus}
        />

        <TemplateSelectionDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          onSelectTemplate={handleSelectTemplate}
        />

        <CampaignSelectionDialog
          open={showCampaignDialog}
          onOpenChange={setShowCampaignDialog}
          onSelectCampaign={handleSelectCampaign}
        />
      </DashboardLayout>
    </>
  );
}

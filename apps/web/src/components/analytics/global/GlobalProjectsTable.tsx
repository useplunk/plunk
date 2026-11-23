import type {GlobalAnalyticsAlert, GlobalAnalyticsProjectRow} from '@plunk/types';
import {Badge, Input} from '@plunk/ui';
import {Search} from 'lucide-react';
import {useMemo} from 'react';

import {type Column, RateTable} from '../RateTable';
import {computeDelta, formatCount, formatRate, metric, thresholdTone} from '../metrics';
import {DeltaLabel, Panel, PanelEmpty, PanelError, RowsSkeleton} from '../primitives';

/** Rates below this volume are greyed out and sorted last, as on the per-project tables */
const MIN_VOLUME = 100;

const rateColumn = (key: 'deliveryRate' | 'openRate' | 'clickRate' | 'bounceRate', label: string) => {
  const def = metric(key);
  return {
    key,
    label,
    render: (row: GlobalAnalyticsProjectRow) => (row.current.sent > 0 ? formatRate(row.current[key]) : '—'),
    sortValue: (row: GlobalAnalyticsProjectRow) => row.current[key],
    tone: (row: GlobalAnalyticsProjectRow) => thresholdTone(def, row.current[key], row.current.sent),
  } satisfies Column<GlobalAnalyticsProjectRow>;
};

/**
 * Every project side by side for the period. Searchable by name and sortable by any
 * figure; a row opens that project's own analytics.
 */
export function GlobalProjectsTable({
  rows,
  alerts,
  search,
  onSearch,
  narrowed,
  error,
  onRetry,
  onOpen,
}: {
  rows: GlobalAnalyticsProjectRow[] | undefined;
  alerts: GlobalAnalyticsAlert[] | undefined;
  search: string;
  onSearch: (value: string) => void;
  /** Whether the page is narrowed to selected projects, which may since have become inaccessible */
  narrowed: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (projectId: string) => void;
}) {
  const flagged = useMemo(() => {
    const worst = new Map<string, GlobalAnalyticsAlert['severity']>();
    for (const alert of alerts ?? []) {
      if (alert.severity !== 'info' && worst.get(alert.projectId) !== 'critical') {
        worst.set(alert.projectId, alert.severity);
      }
    }
    return worst;
  }, [alerts]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? (rows ?? []).filter(row => row.name.toLowerCase().includes(term)) : (rows ?? []);
  }, [rows, search]);

  const columns: Column<GlobalAnalyticsProjectRow>[] = [
    {
      key: 'name',
      label: 'Project',
      align: 'left',
      // Fills the spare width but never squeezes the name below a readable size
      className: 'w-full min-w-[14rem] max-w-0',
      tone: () => 'text-neutral-900',
      render: row => {
        const severity = flagged.get(row.id);
        return (
          <span className="flex min-w-0 items-center gap-2">
            {severity && (
              <span
                className={
                  severity === 'critical'
                    ? 'h-2 w-2 shrink-0 rounded-full bg-red-500'
                    : 'h-2 w-2 shrink-0 rounded-full bg-amber-500'
                }
                aria-label={severity === 'critical' ? 'Critical issue' : 'Needs attention'}
              />
            )}
            <span className="truncate font-medium">{row.name}</span>
            {row.disabled && <Badge variant="destructive">Disabled</Badge>}
          </span>
        );
      },
    },
    {
      key: 'sent',
      label: 'Sent',
      render: row => (
        <span className="inline-flex flex-col items-end">
          <span>{formatCount(row.current.sent)}</span>
          <DeltaLabel
            delta={computeDelta(metric('sent'), row.current.sent, row.previous.sent, row.previous.sent)}
            neutral
            fallback=""
          />
        </span>
      ),
      sortValue: row => row.current.sent,
    },
    rateColumn('deliveryRate', 'Delivery'),
    rateColumn('bounceRate', 'Bounce'),
    {
      key: 'complained',
      label: 'Complaints',
      render: row => formatCount(row.current.complained),
      sortValue: row => row.current.complained,
      tone: row => thresholdTone(metric('complaintRate'), row.current.complaintRate, row.current.sent),
    },
    rateColumn('openRate', 'Open'),
    rateColumn('clickRate', 'Click'),
    {
      key: 'failed',
      label: 'Failed',
      render: row => formatCount(row.current.failed),
      sortValue: row => row.current.failed,
      tone: row => (row.current.failed > 0 ? 'text-amber-600' : 'text-neutral-400'),
    },
  ];

  return (
    <Panel
      title="Projects"
      description={
        rows
          ? `${visible.length === rows.length ? rows.length : `${visible.length} of ${rows.length}`} ${
              rows.length === 1 ? 'project' : 'projects'
            }. Select one to open its analytics.`
          : undefined
      }
      actions={
        <div className="relative w-full sm:w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={event => onSearch(event.target.value)}
            placeholder="Search projects"
            aria-label="Search projects by name"
            className="h-8 pl-8 text-sm"
          />
        </div>
      }
    >
      {error && !rows ? (
        <PanelError onRetry={onRetry} />
      ) : !rows ? (
        <RowsSkeleton />
      ) : visible.length === 0 ? (
        <PanelEmpty>
          {search
            ? `No project matches “${search}”.`
            : narrowed
              ? 'None of the selected projects are available to you. Clear the project filter to see all of them.'
              : 'No projects to show.'}
        </PanelEmpty>
      ) : (
        <div className="overflow-x-auto border-t border-neutral-100">
          <RateTable
            columns={columns}
            rows={visible}
            rowKey={row => row.id}
            volume={row => row.current.sent}
            minVolume={MIN_VOLUME}
            defaultSort={{key: 'sent', direction: 'desc'}}
            onRowClick={row => onOpen(row.id)}
          />
        </div>
      )}
    </Panel>
  );
}

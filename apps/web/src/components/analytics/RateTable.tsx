import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn} from '@plunk/ui';
import {ArrowDown, ArrowUp} from 'lucide-react';
import {type ReactNode, useMemo, useState} from 'react';

export interface Column<Row> {
  key: string;
  label: string;
  /** The first column holds names and stays left-aligned; figures align right */
  align?: 'left' | 'right';
  render: (row: Row) => ReactNode;
  /** Present on sortable columns */
  sortValue?: (row: Row) => number;
  /** Classes for the cell, e.g. a threshold colour */
  tone?: (row: Row) => string;
  className?: string;
}

/**
 * A compact table of figures. Sorting by a rate puts rows below `minVolume` last, so an
 * email sent to three people cannot top a list with a 100% click rate.
 */
export function RateTable<Row>({
  columns,
  rows,
  rowKey,
  volume,
  minVolume = 0,
  defaultSort,
  onRowClick,
  isActive,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  volume?: (row: Row) => number;
  minVolume?: number;
  defaultSort?: {key: string; direction: 'asc' | 'desc'};
  onRowClick?: (row: Row) => void;
  isActive?: (row: Row) => boolean;
}) {
  const [sort, setSort] = useState(defaultSort);

  const sorted = useMemo(() => {
    const column = columns.find(c => c.key === sort?.key);
    if (!sort || !column?.sortValue) return rows;
    const lowVolume = (row: Row) => (volume ? volume(row) < minVolume : false);
    return [...rows].sort((a, b) => {
      if (lowVolume(a) !== lowVolume(b)) return lowVolume(a) ? 1 : -1;
      const diff = column.sortValue!(a) - column.sortValue!(b);
      return sort.direction === 'asc' ? diff : -diff;
    });
  }, [rows, columns, sort, volume, minVolume]);

  return (
    <Table className="text-[13px]">
      <TableHeader>
        <TableRow className="border-neutral-100 hover:bg-transparent">
          {columns.map(column => {
            const active = sort?.key === column.key;
            const right = column.align !== 'left';
            return (
              <TableHead
                key={column.key}
                aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                className={cn(
                  'h-9 whitespace-nowrap px-3 text-xs font-medium text-neutral-500 first:pl-5 last:pr-5',
                  right && 'text-right',
                  column.className,
                )}
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSort({
                        key: column.key,
                        direction: active && sort!.direction === 'desc' ? 'asc' : 'desc',
                      })
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded align-middle hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900',
                      active && 'text-neutral-900',
                      right && 'flex-row-reverse',
                    )}
                  >
                    {column.label}
                    {active ? (
                      sort!.direction === 'desc' ? (
                        <ArrowDown className="h-3 w-3" aria-hidden />
                      ) : (
                        <ArrowUp className="h-3 w-3" aria-hidden />
                      )
                    ) : (
                      <span className="w-3" aria-hidden />
                    )}
                  </button>
                ) : (
                  <span className="inline-flex items-center align-middle">{column.label}</span>
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(row => {
          const muted = volume ? volume(row) < minVolume : false;
          const active = isActive?.(row) ?? false;
          return (
            <TableRow
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              data-state={active ? 'selected' : undefined}
              className={cn(
                'border-neutral-100',
                onRowClick && 'cursor-pointer',
                active && 'bg-neutral-50 data-[state=selected]:bg-neutral-50',
              )}
              title={muted ? `Fewer than ${minVolume} emails, so rates are not reliable` : undefined}
            >
              {columns.map(column => (
                <TableCell
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 tabular-nums first:pl-5 last:pr-5',
                    column.align !== 'left' && 'text-right',
                    muted ? 'text-neutral-400' : (column.tone?.(row) ?? 'text-neutral-700'),
                    column.className,
                  )}
                >
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

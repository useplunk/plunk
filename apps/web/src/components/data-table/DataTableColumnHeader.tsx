import type {Column} from '@tanstack/react-table';
import {ChevronDown, ChevronUp, ChevronsUpDown} from 'lucide-react';
import type {ReactNode} from 'react';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  children: ReactNode;
  /** Align the header content (defaults to `left`). */
  align?: 'left' | 'right' | 'center';
  /**
   * Optional slot rendered next to the sort control — used for the per-column
   * faceted filter (`DataTableFacetedFilter`). Table-view-only.
   */
  filter?: ReactNode;
}

const alignClass = (align: 'left' | 'right' | 'center') =>
  align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

/**
 * Sortable column header for the tanstack-driven `DataTable`, following the
 * shadcn data-table convention but adapted to Plunk's primitives. Clicking the
 * label cycles asc → desc → unsorted with chevron indicators; the surrounding
 * `<th>` is responsible for the `aria-sort` attribute (see `DataTable`).
 *
 * An optional `filter` slot lets fixed-value columns (e.g. Type) render a
 * faceted dropdown right in the header — the table-view-only Excel-style filter.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  children,
  align = 'left',
  filter,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();

  // Match the plain (non-sortable) `<th>` header styling exactly so every column
  // header reads uniformly — see `DataTable`'s `<TableHead>` className
  // (`text-xs font-medium uppercase tracking-wider text-neutral-500`). The
  // sortable label is a `<button>`, which would otherwise inherit nothing
  // guaranteed, so we apply the same type styling here explicitly.
  const labelTypeClass = 'text-xs font-medium uppercase tracking-wider';

  const label = canSort ? (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={`group inline-flex items-center gap-1 select-none transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:underline ${labelTypeClass}`}
    >
      <span>{children}</span>
      {(() => {
        const Icon = sorted === 'asc' ? ChevronUp : sorted === 'desc' ? ChevronDown : ChevronsUpDown;
        return (
          <Icon
            className={
              'h-3.5 w-3.5 shrink-0 ' +
              (sorted ? 'text-neutral-700' : 'text-neutral-400 opacity-60 group-hover:opacity-100')
            }
            aria-hidden="true"
          />
        );
      })()}
      <span className="sr-only">
        , {sorted === 'asc' ? 'sorted ascending' : sorted === 'desc' ? 'sorted descending' : 'not sorted'}
      </span>
    </button>
  ) : (
    <span className={labelTypeClass}>{children}</span>
  );

  return (
    <span className={`inline-flex items-center gap-1.5 ${alignClass(align)}`}>
      {label}
      {filter}
    </span>
  );
}

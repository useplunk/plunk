import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@plunk/ui';
import {flexRender, type Table as TanstackTable} from '@tanstack/react-table';

/**
 * Per-column presentation hints read off `columnDef.meta`. Optional — a column
 * without them just gets the default cell padding/alignment.
 */
export interface DataTableColumnMeta {
  /** Display label, used by the column-visibility menu. */
  label?: string;
  /** Extra className applied to this column's `<th>`. */
  headClassName?: string;
  /** Extra className applied to this column's `<td>` cells. */
  cellClassName?: string;
}

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  /**
   * Optional empty-state node rendered (spanning all columns) when the table
   * has zero rows. Callers usually short-circuit before rendering the table at
   * all, but this keeps the component self-sufficient.
   */
  emptyState?: React.ReactNode;
}

/**
 * Generic, presentation-only table built on tanstack-react-table + Plunk's
 * `@plunk/ui` Table primitives, following the shadcn `DataTable` convention.
 *
 * The table instance (and therefore all sorting / selection / visibility state)
 * is owned by the caller and passed in, so this component stays reusable for
 * any list page — workflows and campaigns can adopt it with just a column
 * definition. Sorting indicators live in the column headers
 * (`DataTableColumnHeader`); this component owns the `aria-sort` attribute on
 * each `<th>` so it always mirrors the real sort state.
 */
export function DataTable<TData>({table, emptyState}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const leafColumnCount = table.getVisibleLeafColumns().length;

  return (
    <Table>
      <TableHeader className="bg-neutral-50">
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map(header => {
              const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;
              const sorted = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    sorted === 'asc'
                      ? 'ascending'
                      : sorted === 'desc'
                        ? 'descending'
                        : header.column.getCanSort()
                          ? 'none'
                          : undefined
                  }
                  className={
                    'text-xs font-medium uppercase tracking-wider text-neutral-500 ' + (meta?.headClassName ?? '')
                  }
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={leafColumnCount} className="h-24 text-center text-sm text-neutral-500">
              {emptyState ?? 'No results.'}
            </TableCell>
          </TableRow>
        ) : (
          rows.map(row => (
            <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
              {row.getVisibleCells().map(cell => {
                const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
                return (
                  <TableCell key={cell.id} className={meta?.cellClassName ?? ''}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

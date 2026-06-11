import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@plunk/ui';
import type {Table} from '@tanstack/react-table';
import {ChevronDown, Columns3} from 'lucide-react';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
  /**
   * Column IDs pinned visible (their checkbox is disabled). A column declared
   * with `enableHiding: false` is treated as locked even if not listed here.
   */
  lockedColumnIds?: ReadonlyArray<string>;
}

/**
 * "Columns" selector (shadcn `DataTableViewOptions` convention) built on
 * Plunk's `@plunk/ui` DropdownMenu. Lists every leaf column with a checkbox,
 * honouring each column's `enableHiding` flag and the optional `lockedColumnIds`
 * (Name + Actions stay locked-visible on the templates table). Reads each
 * column's display label from `columnDef.meta.label`, falling back to its id.
 */
export function DataTableViewOptions<TData>({table, lockedColumnIds = []}: DataTableViewOptionsProps<TData>) {
  const lockedSet = new Set(lockedColumnIds);
  const columns = table.getAllLeafColumns();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Toggle column visibility"
          title="Columns"
          className="gap-1.5"
        >
          <Columns3 className="h-4 w-4 text-neutral-500" />
          <span className="hidden sm:inline">Columns</span>
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(column => {
          const id = column.id;
          const locked = lockedSet.has(id) || !column.getCanHide();
          const label = (column.columnDef.meta as {label?: string} | undefined)?.label ?? id;
          return (
            <DropdownMenuCheckboxItem
              key={id}
              checked={locked ? true : column.getIsVisible()}
              disabled={locked}
              onCheckedChange={value => {
                if (locked) return;
                column.toggleVisibility(!!value);
              }}
              onSelect={e => e.preventDefault()}
              className="capitalize"
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

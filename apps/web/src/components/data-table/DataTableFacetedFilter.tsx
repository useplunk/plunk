import {Badge, Popover, PopoverContent, PopoverTrigger} from '@plunk/ui';
import {ListFilter} from 'lucide-react';
import {FacetedFilterMenu, type FacetedFilterOption} from './FacetedFilterMenu';

export type {FacetedFilterOption};

interface DataTableFacetedFilterProps {
  /** Title shown in the dropdown header and the trigger's accessible name. */
  title: string;
  options: FacetedFilterOption[];
  /** Currently-selected values (controlled). The component itself owns no state. */
  selected: string[];
  /** Called with the full next selection whenever the user toggles an option or clears. */
  onChange: (next: string[]) => void;
  /**
   * When false, only a single option can be selected at a time (a fresh pick
   * replaces the prior one). Defaults to true (multi-select). Templates use
   * single-select for Type.
   */
  multiple?: boolean;
}

/**
 * Excel-style faceted filter rendered inside a column header (shadcn data-table
 * convention), adapted to Plunk's `@plunk/ui` Popover + Command primitives.
 *
 * Table-view only: the trigger is a compact icon that sits next to a sortable
 * column label. The dropdown body is the shared `FacetedFilterMenu`, identical
 * to the toolbar-level `DataTableFilter` used in card view, so filtering looks
 * and behaves the same across both views.
 *
 * It is intentionally controlled and value-agnostic: the parent decides what a
 * selection means (the templates page maps it straight onto the `?type=` query
 * param so the server stays authoritative). Only meant for fixed-value columns —
 * free text stays in the global search bar.
 */
export function DataTableFacetedFilter({title, options, selected, onChange, multiple = true}: DataTableFacetedFilterProps) {
  const count = selected.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${title}`}
          title={`Filter by ${title}`}
          className={
            'inline-flex items-center rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ' +
            (count > 0 ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700')
          }
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
          {count > 0 && (
            <Badge variant="default" className="ml-1 h-4 px-1 text-[10px] leading-none">
              {count}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <FacetedFilterMenu title={title} options={options} selected={selected} onChange={onChange} multiple={multiple} />
      </PopoverContent>
    </Popover>
  );
}

import {Badge, Button, Popover, PopoverContent, PopoverTrigger} from '@plunk/ui';
import {ChevronDown, ListFilter} from 'lucide-react';
import {FacetedFilterMenu, type FacetedFilterOption} from './FacetedFilterMenu';

interface DataTableFilterProps {
  /** Title shown on the trigger, as the menu heading, and in the accessible name. */
  title: string;
  options: FacetedFilterOption[];
  /** Currently-selected values (controlled). */
  selected: string[];
  /** Called with the full next selection whenever the user toggles an option or clears. */
  onChange: (next: string[]) => void;
  /**
   * When false, only a single option can be selected at a time (a fresh pick
   * replaces the prior one). Single-select also lets the trigger show the chosen
   * label instead of a count. Defaults to true (multi-select).
   */
  multiple?: boolean;
}

/**
 * Toolbar-level filter dropdown for card view — the card-view counterpart to the
 * in-header `DataTableFacetedFilter`. Replaces the old row of solid filter pills
 * with a single button that matches the Columns selector and view switcher, so
 * the toolbar reads as one aligned control cluster.
 *
 * The trigger surfaces the active selection inline: for single-select it shows
 * the chosen option's label, for multi-select a count badge. The dropdown body
 * is the shared `FacetedFilterMenu`, so card-view and table-view filtering are
 * the same control.
 */
export function DataTableFilter({title, options, selected, onChange, multiple = true}: DataTableFilterProps) {
  const count = selected.length;
  const hasSelection = count > 0;
  // Single-select shows the chosen label inline; multi-select shows a count.
  const selectedLabel = !multiple && count > 0 ? options.find(o => o.value === selected[0])?.label : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Filter by ${title}`}
          title={`Filter by ${title}`}
          className={'gap-1.5 ' + (hasSelection ? 'border-neutral-300' : '')}
        >
          <ListFilter className="h-4 w-4 text-neutral-500" />
          <span>{title}</span>
          {hasSelection && (
            <>
              <span className="h-3.5 w-px bg-neutral-200" aria-hidden="true" />
              {selectedLabel !== undefined ? (
                <span className="font-normal capitalize text-neutral-600">{selectedLabel}</span>
              ) : (
                <Badge variant="secondary" className="h-4 rounded px-1 text-[10px] leading-none">
                  {count}
                </Badge>
              )}
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="end">
        <FacetedFilterMenu title={title} options={options} selected={selected} onChange={onChange} multiple={multiple} />
      </PopoverContent>
    </Popover>
  );
}

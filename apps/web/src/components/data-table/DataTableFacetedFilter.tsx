import {
  Badge,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@plunk/ui';
import {Check, ListFilter} from 'lucide-react';
import type {ComponentType, ReactNode} from 'react';

export interface FacetedFilterOption {
  /** Stable value sent back through `onChange` (e.g. a `TemplateType` enum member). */
  value: string;
  /** Human label shown in the dropdown. */
  label: ReactNode;
  /** Optional leading icon. */
  icon?: ComponentType<{className?: string}>;
}

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
 * It is intentionally controlled and value-agnostic: the parent decides what a
 * selection means (the templates page maps it straight onto the `?type=` query
 * param so the server stays authoritative). Only meant for fixed-value columns —
 * free text stays in the global search bar.
 */
export function DataTableFacetedFilter({
  title,
  options,
  selected,
  onChange,
  multiple = true,
}: DataTableFacetedFilterProps) {
  const selectedSet = new Set(selected);

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter(v => v !== value));
      return;
    }
    onChange(multiple ? [...selected, value] : [value]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${title}`}
          title={`Filter by ${title}`}
          className={
            'inline-flex items-center rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ' +
            (selectedSet.size > 0 ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700')
          }
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
          {selectedSet.size > 0 && (
            <Badge variant="default" className="ml-1 h-4 px-1 text-[10px] leading-none">
              {selectedSet.size}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No options.</CommandEmpty>
            <CommandGroup heading={title}>
              {options.map(option => {
                const isSelected = selectedSet.has(option.value);
                const Icon = option.icon;
                return (
                  <CommandItem key={option.value} onSelect={() => toggle(option.value)} className="cursor-pointer">
                    <span
                      className={
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ' +
                        (isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-300 [&_svg]:invisible')
                      }
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    {Icon ? <Icon className="mr-2 h-4 w-4 text-neutral-500" aria-hidden="true" /> : null}
                    <span className="capitalize">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedSet.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="cursor-pointer justify-center text-center text-sm text-neutral-600"
                  >
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

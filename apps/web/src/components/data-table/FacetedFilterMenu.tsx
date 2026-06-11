import {Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator} from '@plunk/ui';
import {Check} from 'lucide-react';
import type {ComponentType, ReactNode} from 'react';

export interface FacetedFilterOption {
  /** Stable value sent back through `onChange` (e.g. a `TemplateType` enum member). */
  value: string;
  /** Human label shown in the dropdown. */
  label: ReactNode;
  /** Optional leading icon. */
  icon?: ComponentType<{className?: string}>;
}

interface FacetedFilterMenuProps {
  /** Heading shown above the option list. */
  title: string;
  options: FacetedFilterOption[];
  /** Currently-selected values (controlled). */
  selected: string[];
  /** Called with the full next selection whenever the user toggles an option or clears. */
  onChange: (next: string[]) => void;
  /**
   * When false, only a single option can be selected at a time (a fresh pick
   * replaces the prior one). Defaults to true (multi-select).
   */
  multiple?: boolean;
}

/**
 * Shared option list for the faceted filters. Both the in-header trigger
 * (`DataTableFacetedFilter`) and the toolbar trigger (`DataTableFilter`) render
 * this exact body inside their own Popover so the two filter affordances stay
 * pixel-identical — one source of truth for the checkbox rows, selection logic,
 * and the "Clear filter" recovery.
 */
export function FacetedFilterMenu({title, options, selected, onChange, multiple = true}: FacetedFilterMenuProps) {
  const selectedSet = new Set(selected);

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter(v => v !== value));
      return;
    }
    onChange(multiple ? [...selected, value] : [value]);
  };

  return (
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
                    (isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 [&_svg]:invisible')
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
  );
}

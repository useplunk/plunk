import {Popover, PopoverContent, PopoverTrigger, cn} from '@plunk/ui';
import {PlusCircle, X} from 'lucide-react';
import type {ReactNode} from 'react';

import {FacetedFilterMenu, type FacetedFilterOption} from './FacetedFilterMenu';

/** How many chosen values the pill names before summarising the rest as "+2" */
const VISIBLE_VALUES = 2;

/**
 * The outline of a filter pill, shared by option pills and custom ones (like a contact
 * search). Empty, it is a dashed "+ Title" invitation; set, it shows the title, what is
 * chosen, and a button to remove the filter.
 */
export function FilterPillFrame({
  title,
  value,
  onClear,
  disabled = false,
  children,
}: {
  title: string;
  /** What is chosen, or undefined while the filter is not set */
  value?: ReactNode;
  onClear: () => void;
  /** Shown but inert, for a filter that does not apply to the current view */
  disabled?: boolean;
  /** The trigger button; receives the pill's label as its children */
  children: (label: ReactNode) => ReactNode;
}) {
  const active = value !== undefined;

  const label = active ? (
    <>
      <span className="text-neutral-500">{title}</span>
      <span className="h-3.5 w-px bg-neutral-200" aria-hidden />
      <span className="max-w-[16rem] truncate font-medium text-neutral-900">{value}</span>
    </>
  ) : (
    <>
      <PlusCircle className="h-3.5 w-3.5" aria-hidden />
      {title}
    </>
  );

  return (
    <span
      className={cn(
        'inline-flex h-8 max-w-full items-center rounded-full border bg-white text-xs transition-colors sm:text-sm',
        // Focus on the trigger outlines the whole pill, so the remove button reads as part of it
        'has-[[data-pill-trigger]:focus-visible]:ring-2 has-[[data-pill-trigger]:focus-visible]:ring-neutral-900 has-[[data-pill-trigger]:focus-visible]:ring-offset-1',
        active ? 'border-neutral-300' : 'border-dashed border-neutral-300 text-neutral-600',
        !active && !disabled && 'hover:border-neutral-400',
        disabled && 'opacity-50',
      )}
    >
      {children(label)}
      {active && !disabled && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${title} filter`}
          className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

/** Classes for the trigger button inside a FilterPillFrame */
export function filterPillTriggerClass(active: boolean) {
  return cn(
    'inline-flex h-full min-w-0 items-center gap-1.5 rounded-full focus-visible:outline-none',
    active ? 'pl-3 pr-1.5' : 'px-3 hover:text-neutral-900',
  );
}

/**
 * A filter over a fixed set of options, Stripe-style: one pill per property, values picked
 * from the shared FacetedFilterMenu.
 */
export function FilterPill({
  title,
  options,
  selected,
  onChange,
  multiple = true,
  disabledReason,
}: {
  title: string;
  options: FacetedFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  /** When set, the pill stays in place but is inert, and this explains why */
  disabledReason?: string;
}) {
  const labels = options.filter(o => selected.includes(o.value)).map(o => o.label);
  const value =
    labels.length === 0 ? undefined : (
      // Option labels are capitalised in the menu too, so a pill reads the same as its list
      <span className="capitalize">
        {labels.slice(0, VISIBLE_VALUES).map((label, i) => (
          <span key={i}>
            {i > 0 && ', '}
            {label}
          </span>
        ))}
        {labels.length > VISIBLE_VALUES && (
          <span className="text-neutral-500">{` +${labels.length - VISIBLE_VALUES}`}</span>
        )}
      </span>
    );

  return (
    <FilterPillFrame title={title} value={value} onClear={() => onChange([])} disabled={!!disabledReason}>
      {label => (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-pill-trigger
              disabled={!!disabledReason}
              title={disabledReason}
              className={filterPillTriggerClass(value !== undefined)}
            >
              {label}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0" align="start">
            <FacetedFilterMenu
              title={title}
              options={options}
              selected={selected}
              onChange={onChange}
              multiple={multiple}
            />
          </PopoverContent>
        </Popover>
      )}
    </FilterPillFrame>
  );
}

import {cn} from '@plunk/ui';

/**
 * A small single-choice control for switching what a view shows: a date range, a
 * preview width, a grouping. The active option is filled, so the choice reads at a glance.
 *
 * Not for filtering a list (that is `FilterPill`) and not for navigation (that is Tabs).
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
}: {
  /** Null when none of the options applies, e.g. a custom range is active */
  value: T | null;
  options: readonly {value: T; label: string}[];
  onChange: (value: T) => void;
  /** Accessible name for the group */
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5"
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'whitespace-nowrap rounded-[5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-xs sm:text-sm',
              active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

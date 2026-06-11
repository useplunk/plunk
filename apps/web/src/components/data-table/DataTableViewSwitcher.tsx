import {LayoutGrid, List} from 'lucide-react';

export type DataTableView = 'card' | 'table';

export const isDataTableView = (value: string): value is DataTableView => value === 'card' || value === 'table';

interface DataTableViewSwitcherProps {
  view: DataTableView;
  onChange: (next: DataTableView) => void;
}

const VIEWS = [
  {value: 'card', label: 'Card view', Icon: LayoutGrid},
  {value: 'table', label: 'Table view', Icon: List},
] as const;

/**
 * Card / table view toggle, rendered as a segmented control: a single neutral
 * track with the active segment lifted to white. Generic and stateless — the
 * parent owns the value (persisted via `usePersistentState`) so any list page
 * can drop this in. Card view is the default everywhere; this only switches the
 * rendering, never the data.
 *
 * Heights are tuned to land at exactly 32px (h-8) so it lines up with the search
 * input, the Columns selector, and the toolbar filter on the same row.
 */
export function DataTableViewSwitcher({view, onChange}: DataTableViewSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="View"
      className="inline-flex shrink-0 items-center gap-px rounded-md border border-neutral-200 bg-neutral-50 p-px"
    >
      {VIEWS.map(({value, label, Icon}) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={
              'inline-flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ' +
              (active
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900')
            }
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

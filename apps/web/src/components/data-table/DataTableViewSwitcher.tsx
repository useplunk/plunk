import {Button} from '@plunk/ui';
import {LayoutGrid, List} from 'lucide-react';

export type DataTableView = 'card' | 'table';

export const isDataTableView = (value: string): value is DataTableView => value === 'card' || value === 'table';

interface DataTableViewSwitcherProps {
  view: DataTableView;
  onChange: (next: DataTableView) => void;
}

/**
 * Card / table view toggle (icon segmented control) built on Plunk's Button.
 * Generic and stateless — the parent owns the value (persisted via
 * `usePersistentState`) so any list page can drop this in. Card view is the
 * default everywhere; this only switches the rendering, never the data.
 */
export function DataTableViewSwitcher({view, onChange}: DataTableViewSwitcherProps) {
  return (
    <div className="flex gap-0.5 shrink-0 rounded-md border border-neutral-200 p-px" role="group" aria-label="View">
      <Button
        type="button"
        onClick={() => onChange('card')}
        variant={view === 'card' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2"
        aria-label="Card view"
        aria-pressed={view === 'card'}
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        onClick={() => onChange('table')}
        variant={view === 'table' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-2"
        aria-label="Table view"
        aria-pressed={view === 'table'}
        title="Table view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}

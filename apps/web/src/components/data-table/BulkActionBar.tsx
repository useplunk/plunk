import {Button} from '@plunk/ui';
import {X} from 'lucide-react';
import type {ReactNode} from 'react';

interface BulkActionBarProps {
  /** Number of currently-selected rows. The bar renders only when this is > 0. */
  selectedCount: number;
  /** Singular noun for the selected item type (e.g. "template"). Pluralized with a trailing 's'. */
  itemNoun: string;
  /** Clears the row selection state. */
  onClear: () => void;
  /**
   * Action slot — render the Buttons that belong to the bar here. Kept as
   * `children` (rather than a fixed `actions` prop) so future bulk operations
   * (e.g. tag add/remove, a separate PR) can be spliced in next to the delete
   * button without touching this component.
   */
  children?: ReactNode;
}

/**
 * Slim selection-driven action bar that sits above a table when one or more
 * rows are selected. This PR wires it for the templates table with a single
 * "Delete selected" action; the `children` slot keeps it open for later bulk
 * operations. Generic and reusable across list tables.
 *
 * Visually a neutral pill above the table — not sticky, so it scrolls with the
 * page, matching the rest of the dashboard's affordances and keeping tab order
 * predictable.
 */
export function BulkActionBar({selectedCount, itemNoun, onClear, children}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  const noun = selectedCount === 1 ? itemNoun : `${itemNoun}s`;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5"
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label="Clear selection"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-neutral-900">
          {selectedCount} {noun} selected
        </span>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

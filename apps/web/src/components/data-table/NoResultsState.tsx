import {Button, EmptyState} from '@plunk/ui';
import {FilterX} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

interface NoResultsStateProps {
  /** Icon for the empty state — usually the same icon the page uses elsewhere. */
  icon?: LucideIcon;
  /** Optional override for the noun shown in the default copy (e.g. "templates"). */
  itemNoun?: string;
  /** Resets the page's search + all active facet/tag/type/status filters + pagination. */
  onClear: () => void;
}

/**
 * Distinct "no results match your filters" state for the list pages. Separate
 * from the first-run "No X yet" empty state: this one only shows when the user
 * HAS items but the current search/facet/tag filters match none, and it always
 * offers a one-click "Clear filters" recovery so the user is never stuck behind
 * a filter that vanished the table (and, in table view, its header facets).
 */
export function NoResultsState({icon = FilterX, itemNoun, onClear}: NoResultsStateProps) {
  return (
    <EmptyState
      icon={icon}
      title="No results match your filters"
      description={
        itemNoun
          ? `No ${itemNoun} match the current search and filters. Try adjusting or clearing them.`
          : 'No items match the current search and filters. Try adjusting or clearing them.'
      }
      action={
        <Button type="button" variant="outline" onClick={onClear}>
          <FilterX className="h-4 w-4" />
          Clear filters
        </Button>
      }
    />
  );
}

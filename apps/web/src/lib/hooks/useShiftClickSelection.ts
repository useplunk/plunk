import {useCallback, useRef} from 'react';
import type {Row, RowSelectionState, Table} from '@tanstack/react-table';

interface ShiftClickHandlers<T> {
  /**
   * Attach to the selection control's `onClick` to capture the shift-key state
   * of the click. Pair with `onCheckedChange` below.
   */
  onClick: (event: React.MouseEvent) => void;
  /**
   * Attach to the selection control's `onCheckedChange`. On a plain click this
   * toggles the single row; when the preceding click had `shiftKey` pressed AND
   * a prior anchor row exists, every row between the anchor and this row is set
   * to the new checked state.
   */
  onCheckedChange: (row: Row<T>, value: boolean | 'indeterminate') => void;
}

/**
 * Range-selection helper for tanstack tables driven by a checkbox cell.
 *
 * Tracks the most-recently-clicked row as an anchor and, on a shift-click,
 * selects/deselects every row between the anchor and the current row using
 * `table.setRowSelection`.
 *
 * The anchor updates on every click (shift or not) so a user can chain
 * selections naturally: click row 1, shift-click row 10 (selects 1–10),
 * then shift-click row 5 (the new anchor is row 10, so rows 5–10 are set to
 * the checked state of row 5's click).
 */
export function useShiftClickSelection<T>(table: Table<T>): ShiftClickHandlers<T> {
  const shiftHeldRef = useRef(false);
  const anchorRowIdRef = useRef<string | null>(null);

  const onClick = useCallback((event: React.MouseEvent) => {
    shiftHeldRef.current = event.shiftKey;
  }, []);

  const onCheckedChange = useCallback(
    (row: Row<T>, value: boolean | 'indeterminate') => {
      const nextSelected = value === true;
      const rows = table.getRowModel().rows;
      const currentIndex = rows.findIndex(r => r.id === row.id);
      const anchorIndex = anchorRowIdRef.current ? rows.findIndex(r => r.id === anchorRowIdRef.current) : -1;

      if (shiftHeldRef.current && anchorIndex !== -1 && currentIndex !== -1 && anchorIndex !== currentIndex) {
        const [start, end] = anchorIndex < currentIndex ? [anchorIndex, currentIndex] : [currentIndex, anchorIndex];
        const updates: RowSelectionState = {};
        for (let i = start; i <= end; i++) {
          const r = rows[i];
          if (r) updates[r.id] = nextSelected;
        }
        table.setRowSelection(prev => ({...prev, ...updates}));
      } else {
        row.toggleSelected(nextSelected);
      }

      anchorRowIdRef.current = row.id;
      shiftHeldRef.current = false;
    },
    [table],
  );

  return {onClick, onCheckedChange};
}

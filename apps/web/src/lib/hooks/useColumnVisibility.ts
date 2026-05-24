import {useEffect, useState} from 'react';
import type {VisibilityState} from '@tanstack/react-table';

/**
 * Persist a tanstack `columnVisibility` state to localStorage under `storageKey`.
 *
 * Only string-keyed boolean entries that exist in `defaults` are merged, so a
 * malformed or stale stored value can't leak unknown keys into the tanstack
 * state. SSR-safe: reads happen inside an effect and the initial state is always
 * `defaults` (so server and first client render match).
 */
export function useColumnVisibility(storageKey: string, defaults: VisibilityState) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaults);

  // Hydrate from localStorage on first mount (client only).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return;
      const sanitized: VisibilityState = {...defaults};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'boolean' && key in defaults) {
          sanitized[key] = value;
        }
      }
      setColumnVisibility(sanitized);
    } catch {
      // Ignore malformed JSON — fall back to defaults.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist whenever it changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch {
      // Ignore quota / private-mode errors.
    }
  }, [storageKey, columnVisibility]);

  return [columnVisibility, setColumnVisibility] as const;
}

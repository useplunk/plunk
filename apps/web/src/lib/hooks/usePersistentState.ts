import {useCallback, useEffect, useState} from 'react';

/**
 * A tiny `useState` wrapper that persists a small, validated value in
 * localStorage under `storageKey`.
 *
 * Used by the card/table view switcher (`plunk:templates:view`) but kept
 * generic so other list pages (workflows, campaigns) can reuse the same
 * switcher with their own key. SSR-safe: the initial render always returns
 * `defaultValue` and hydration happens inside an effect, so server and first
 * client render agree.
 *
 * `validate` guards against stale / malformed stored values — only a value it
 * returns `true` for is adopted from storage.
 */
export function usePersistentState<T extends string>(
  storageKey: string,
  defaultValue: T,
  validate: (value: string) => value is T,
): readonly [T, (next: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null && validate(stored)) {
        setValue(stored);
      }
    } catch {
      // Ignore read errors (private mode etc.) — keep the default.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, next);
        } catch {
          // Ignore quota / private-mode errors.
        }
      }
    },
    [storageKey],
  );

  return [value, set] as const;
}

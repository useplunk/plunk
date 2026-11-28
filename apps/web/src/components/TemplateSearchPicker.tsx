import {Input} from '@plunk/ui';
import type {Template} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';
import {Command, CommandGroup, CommandItem, CommandList} from '@plunk/ui';
import {ChevronDown} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import useSWR from 'swr';

interface TemplateSearchPickerProps {
  /** Currently selected template ID */
  value: string;
  /** Display name for the pre-selected template (avoids a fetch just to show the name) */
  initialName?: string;
  onChange: (id: string) => void;
}

/**
 * Inline combobox for picking a template.
 * Fires a debounced server-side search (/templates?search=…&pageSize=20)
 * so it works correctly regardless of how many templates exist.
 */
export function TemplateSearchPicker({value, initialName, onChange}: TemplateSearchPickerProps) {
  const [query, setQuery] = useState(initialName ?? '');
  const [prevInitialName, setPrevInitialName] = useState(initialName);
  const [selectedName, setSelectedName] = useState(initialName ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (initialName !== prevInitialName) {
    setPrevInitialName(initialName);
    setQuery(initialName ?? '');
    if (initialName) setSelectedName(initialName);
  }

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  }, []);

  const {data, isLoading} = useSWR<PaginatedResponse<Template>>(
    open || debouncedQuery
      ? `/templates?pageSize=20${debouncedQuery ? `&search=${encodeURIComponent(debouncedQuery)}` : ''}`
      : null,
    {revalidateOnFocus: false},
  );

  // When closed, show the selected template's name rather than the raw query
  const displayValue = open
    ? query
    : (value ? (data?.data.find(t => t.id === value)?.name ?? selectedName ?? initialName ?? '') : '');

  return (
    <div
      className="relative"
      onBlur={event => {
        // Keep the list mounted while focus moves from the input to an option.
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Input
        type="text"
        value={displayValue}
        onChange={handleInput}
        onFocus={() => {
          setOpen(true);
          setDebouncedQuery(query);
        }}
        placeholder="Search templates…"
        autoComplete="off"
        className="pr-8"
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-neutral-200 bg-white shadow-md max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-neutral-500">Searching…</div>
          ) : !data?.data.length ? (
            <div className="px-3 py-2 text-sm text-neutral-500">No templates found</div>
          ) : (
            <Command>
              <CommandList>
                <CommandGroup>
                  {data.data.map(t => (
                    <CommandItem
                      key={t.id}
                      value={t.id}
                      onSelect={() => {
                        onChange(t.id);
                        setQuery(t.name);
                        setSelectedName(t.name);
                        setOpen(false);
                      }}
                    >
                      <span className="flex-1 truncate">{t.name}</span>
                      <span className="ml-2 text-xs text-neutral-400 shrink-0">{t.type}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
          {(data?.total ?? 0) > 20 && (
            <div className="px-3 py-1.5 text-xs text-neutral-400 border-t border-neutral-100">
              Showing 20 of {data!.total} — type to narrow results
            </div>
          )}
        </div>
      )}
    </div>
  );
}

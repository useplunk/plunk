import type {Contact} from '@plunk/db';
import type {CursorPaginatedResponse} from '@plunk/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@plunk/ui';
import {useEffect, useState} from 'react';
import useSWR from 'swr';

import {FilterPillFrame, filterPillTriggerClass} from './data-table';

/**
 * A filter pill that narrows a view to one contact. Searches as you type, against the
 * same endpoint the contacts list uses; the chosen contact is passed back by id.
 */
export function ContactFilter({
  contactId,
  onChange,
}: {
  contactId: string | null;
  onChange: (contactId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const {data: results, isLoading} = useSWR<CursorPaginatedResponse<Contact>>(
    open && debounced.length > 0 ? `/contacts?limit=8&search=${encodeURIComponent(debounced)}` : null,
    {keepPreviousData: true, revalidateOnFocus: false},
  );
  // The URL only holds the id, so the label is looked up once
  const {data: selected} = useSWR<Contact>(contactId ? `/contacts/${contactId}` : null, {revalidateOnFocus: false});

  return (
    <FilterPillFrame
      title="Contact"
      value={contactId ? (selected?.email ?? 'Loading') : undefined}
      onClear={() => onChange(null)}
    >
      {label => (
        <Popover
          open={open}
          onOpenChange={next => {
            setOpen(next);
            if (!next) setSearch('');
          }}
        >
          <PopoverTrigger asChild>
            <button type="button" data-pill-trigger className={filterPillTriggerClass(!!contactId)}>
              {label}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command shouldFilter={false}>
              <CommandInput value={search} onValueChange={setSearch} placeholder="Search by email" />
              <CommandList>
                {debounced.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-500">Type part of an email address</p>
                ) : (
                  <>
                    <CommandEmpty>{isLoading ? 'Searching' : 'No contacts match'}</CommandEmpty>
                    <CommandGroup>
                      {(results?.data ?? []).map(contact => (
                        <CommandItem
                          key={contact.id}
                          value={contact.id}
                          onSelect={() => {
                            onChange(contact.id);
                            setOpen(false);
                            setSearch('');
                          }}
                          className={cn('truncate py-2')}
                        >
                          <span className="truncate">{contact.email}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </FilterPillFrame>
  );
}

import type {Contact} from '@plunk/db';
import type {CursorPaginatedResponse} from '@plunk/types';
import {Button, Input, Label, Popover, PopoverContent, PopoverTrigger, Switch} from '@plunk/ui';
import {Check, ChevronsUpDown, ClipboardList, Loader2, MailCheck, MailX, Search, Sparkles, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import useSWR from 'swr';
import {ContactSchemas} from '@plunk/shared';
import {network} from '../lib/network';

type Mode = 'search' | 'paste';

interface ContactPickerProps {
  /** Currently selected emails (search mode) */
  selected: string[];
  /** Called when search-mode selection changes */
  onChange: (emails: string[]) => void;
  /**
   * Called by paste mode to submit directly — skips the chip staging area.
   * Receives the parsed email list and whether new contacts should be subscribed.
   */
  onAdd: (emails: string[], subscribed: boolean) => Promise<void>;
  /** Emails already in the segment (shown as disabled in search mode) */
  existing?: string[];
  placeholder?: string;
}

const CHIP_LIMIT = 8;

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export function ContactPicker({
  selected,
  onChange,
  onAdd,
  existing = [],
  placeholder = 'Search contacts…',
}: ContactPickerProps) {
  const [mode, setMode] = useState<Mode>('search');

  // Search mode
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Paste mode
  const [pasteText, setPasteText] = useState('');
  const [subscribeNew, setSubscribeNew] = useState(true);
  const [debouncedPaste, setDebouncedPaste] = useState('');
  const pasteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    if (pasteDebounceRef.current) clearTimeout(pasteDebounceRef.current);
    pasteDebounceRef.current = setTimeout(() => setDebouncedPaste(pasteText), 400);
    return () => {
      if (pasteDebounceRef.current) clearTimeout(pasteDebounceRef.current);
    };
  }, [pasteText]);

  const debouncedEmails = parseEmails(debouncedPaste).filter(e => !existing.includes(e));
  const {data: preview, isLoading: isLooking} = useSWR(
    debouncedEmails.length > 0 ? ['/contacts/lookup', ...debouncedEmails] : null,
    () => network.fetch<{found: string[]; notFound: string[]}, typeof ContactSchemas.lookup>(
      'POST', '/contacts/lookup', {emails: debouncedEmails},
    ),
    {revalidateOnFocus: false},
  );

  const {data, isLoading} = useSWR<CursorPaginatedResponse<Contact>>(
    open && debouncedSearch.length > 0 ? `/contacts?limit=20&search=${encodeURIComponent(debouncedSearch)}` : null,
    {revalidateOnFocus: false},
  );

  const contacts = data?.data ?? [];

  const toggle = (email: string) => {
    if (selected.includes(email)) {
      onChange(selected.filter(e => e !== email));
    } else {
      onChange([...selected, email]);
    }
  };

  const parsedEmails = parseEmails(pasteText);
  const newPastedEmails = parsedEmails.filter(e => !existing.includes(e));

  const handlePasteSubmit = async () => {
    if (newPastedEmails.length === 0) return;
    await onAdd(newPastedEmails, subscribeNew);
    setPasteText('');
  };

  const visibleChips = selected.slice(0, CHIP_LIMIT);
  const overflowCount = selected.length - CHIP_LIMIT;

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 p-0.5 bg-neutral-100 rounded-md w-fit">
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            mode === 'search' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            mode === 'paste' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Paste
        </button>
      </div>

      {mode === 'search' ? (
        <>
          <Popover open={open} onOpenChange={v => { setOpen(v); if (!v) setSearch(''); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={open}
                className="flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
              >
                <span>{placeholder}</span>
                <ChevronsUpDown className="h-4 w-4 opacity-40 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0"
              style={{width: 'var(--radix-popover-trigger-width)'}}
              align="start"
            >
              <div className="flex items-center border-b border-neutral-200 px-3 py-2">
                <Search className="mr-2 h-4 w-4 shrink-0 text-neutral-400" />
                <Input
                  placeholder="Type an email to search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                  autoFocus
                />
              </div>
              <div className="max-h-[240px] overflow-y-auto p-1">
                {debouncedSearch.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-400">Type to search contacts</p>
                ) : isLoading ? (
                  <p className="py-6 text-center text-sm text-neutral-400">Searching...</p>
                ) : contacts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-400">No contacts found</p>
                ) : (
                  contacts.map(contact => {
                    const isSelected = selected.includes(contact.email);
                    const isExisting = existing.includes(contact.email);
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        disabled={isExisting}
                        onClick={() => toggle(contact.email)}
                        className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
                      >
                        {contact.subscribed ? (
                          <MailCheck className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <MailX className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className="flex-1 truncate text-neutral-900">{contact.email}</span>
                        {isExisting && <span className="text-xs text-neutral-400 shrink-0">already member</span>}
                        {isSelected && !isExisting && <Check className="h-4 w-4 text-neutral-900 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Chips */}
          {selected.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {visibleChips.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 pl-3 pr-1.5 py-1 text-sm text-neutral-800"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => onChange(selected.filter(e => e !== email))}
                      className="rounded-full p-0.5 hover:bg-neutral-300 transition-colors"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {overflowCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-sm text-neutral-500">
                    +{overflowCount} more
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </>
      ) : (
        /* Paste mode — self-contained, submits directly via onAdd */
        <div className="space-y-3">
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={'Paste emails here, one per line or comma-separated...\n\nalice@example.com\nbob@example.com, carol@example.com'}
            rows={6}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-mono"
          />

          {/* Preview panel — toggle lives here, inline with the "new contacts" row */}
          {pasteText.trim() === '' ? (
            <p className="text-xs text-neutral-400">Accepts newline, comma, or semicolon-separated addresses</p>
          ) : isLooking ? (
            <p className="flex items-center gap-1.5 text-xs text-neutral-400"><Loader2 className="h-3 w-3 animate-spin" /> Checking...</p>
          ) : newPastedEmails.length > 0 && preview ? (
            <div className="rounded-md border border-neutral-200 divide-y divide-neutral-100 text-sm overflow-hidden">
              {preview.found.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2.5 text-neutral-700">
                  <MailCheck className="h-4 w-4 text-green-600 shrink-0" />
                  <span><span className="font-medium">{preview.found.length}</span> existing contact{preview.found.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              {preview.notFound.length > 0 && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 text-neutral-700">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    <span><span className="font-medium">{preview.notFound.length}</span> new — will be created</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label htmlFor="subscribe-new" className="text-xs text-neutral-500 cursor-pointer">Subscribe</Label>
                    <Switch id="subscribe-new" checked={subscribeNew} onCheckedChange={setSubscribeNew} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">
              {parsedEmails.length > 0 ? 'All detected emails are already in this segment' : 'No valid emails detected'}
            </p>
          )}

          <Button
            type="button"
            onClick={() => void handlePasteSubmit()}
            disabled={newPastedEmails.length === 0 || isLooking}
            className="w-full"
          >
            Add {newPastedEmails.length > 0 ? `${newPastedEmails.length} ` : ''}contact{newPastedEmails.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}

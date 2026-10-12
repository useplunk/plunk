import {Input, cn} from '@plunk/ui';
import {Search, X} from 'lucide-react';

/**
 * The search field at the start of a list toolbar. One component so every list page has
 * the same height, text size and clear button, sized to sit on a row with FilterPill.
 */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Runs when the clear button is used; defaults to emptying the field */
  onClear?: () => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        aria-hidden
      />
      <Input
        type="text"
        aria-label={placeholder.replace(/…$/, '')}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => (onClear ? onClear() : onChange(''))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

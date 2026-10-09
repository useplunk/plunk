import {
  Button,
  Calendar,
  type DateRange,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@plunk/ui';
import dayjs from 'dayjs';
import {CalendarDays} from 'lucide-react';
import {useState} from 'react';

import {
  type AnalyticsFilters as Filters,
  MAX_CUSTOM_DAYS,
  RANGE_PRESETS,
  STREAM_OPTIONS,
  type StreamOption,
} from '../../lib/hooks/useAnalytics';
import {Segmented} from './primitives';

export function AnalyticsFilters({filters, showStream}: {filters: Filters; showStream: boolean}) {
  const {range, setState, bounds} = filters;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Period"
        size="md"
        value={range === 'custom' ? null : range}
        options={RANGE_PRESETS}
        onChange={value => setState({range: value, from: null, to: null})}
      />
      <CustomRange filters={filters} />
      {/* Kept in place when it does not apply, so the controls do not shift between tabs */}
      <Select
        value={showStream ? filters.stream.value : 'all'}
        onValueChange={value => setState({stream: value as StreamOption})}
        disabled={!showStream}
      >
        <SelectTrigger
          className="h-8 w-[150px] text-sm"
          aria-label="Emails to include"
          title={showStream ? undefined : 'Contacts are not tied to a stream, so this tab always covers all of them'}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STREAM_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="sr-only" aria-live="polite">
        {`Showing ${bounds.first.format('MMMM D')} to ${bounds.last.format('MMMM D, YYYY')}`}
      </span>
    </div>
  );
}

function CustomRange({filters}: {filters: Filters}) {
  const {range, setState, bounds} = filters;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DateRange | undefined>();

  const active = range === 'custom';
  const today = dayjs().endOf('day').toDate();

  // Once a start is picked, days beyond the 90-day window are disabled rather than
  // silently trimmed after the fact
  const limit = pending?.from && !pending.to ? MAX_CUSTOM_DAYS - 1 : null;
  const disabled = [
    {after: today},
    ...(limit && pending?.from
      ? [
          {before: dayjs(pending.from).subtract(limit, 'day').toDate()},
          {after: dayjs(pending.from).add(limit, 'day').toDate()},
        ]
      : []),
  ];

  const sameYear = bounds.first.year() === bounds.last.year() && bounds.last.year() === dayjs().year();
  const label = active
    ? `${bounds.first.format(sameYear ? 'MMM D' : 'MMM D, YYYY')} – ${bounds.last.format(sameYear ? 'MMM D' : 'MMM D, YYYY')}`
    : 'Custom';

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) setPending(active ? {from: bounds.first.toDate(), to: bounds.last.toDate()} : undefined);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 sm:text-sm',
            active
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900',
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={pending}
          onSelect={setPending}
          defaultMonth={dayjs(pending?.from ?? bounds.first.toDate()).subtract(pending?.from ? 0 : 1, 'month').toDate()}
          disabled={disabled}
          weekStartsOn={1}
        />
        <div className="flex items-center justify-between gap-4 border-t border-neutral-100 px-3 py-2.5">
          <p className="text-xs text-neutral-500">
            {pending?.from && pending.to
              ? `${dayjs(pending.to).diff(pending.from, 'day') + 1} days selected`
              : `Pick a start and end day, up to ${MAX_CUSTOM_DAYS} days`}
          </p>
          <Button
            size="sm"
            disabled={!pending?.from || !pending.to}
            onClick={() => {
              if (!pending?.from || !pending.to) return;
              setState({range: 'custom', from: dayjs(pending.from).format('YYYY-MM-DD'), to: dayjs(pending.to).format('YYYY-MM-DD')});
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

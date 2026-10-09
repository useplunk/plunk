'use client';

import {ChevronLeft, ChevronRight} from 'lucide-react';
import * as React from 'react';
import {DayPicker} from 'react-day-picker';

import {cn} from '../../lib';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Month grid built on react-day-picker, styled with the app's tokens instead of the
 * library stylesheet. Range selection draws a continuous band between the two ends.
 */
function Calendar({className, classNames, showOutsideDays = true, ...props}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-6 sm:flex-row',
        month: 'flex flex-col gap-3',
        month_caption: 'flex h-8 items-center justify-center',
        caption_label: 'text-sm font-medium text-neutral-900',
        nav: 'absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between',
        button_previous:
          'inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-30',
        button_next:
          'inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-30',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-8 text-center text-[11px] font-normal text-neutral-400',
        week: 'mt-1 flex w-full',
        day: 'relative h-8 w-8 p-0 text-center text-sm',
        day_button:
          'inline-flex h-8 w-8 items-center justify-center rounded-md tabular-nums text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:pointer-events-none',
        range_start: 'rounded-l-md bg-neutral-100 [&>button]:bg-neutral-900 [&>button]:text-white [&>button]:hover:bg-neutral-900',
        range_end: 'rounded-r-md bg-neutral-100 [&>button]:bg-neutral-900 [&>button]:text-white [&>button]:hover:bg-neutral-900',
        range_middle: 'bg-neutral-100 [&>button]:rounded-none [&>button]:hover:bg-neutral-200',
        selected: '[&>button]:font-medium',
        today: '[&>button]:underline [&>button]:decoration-neutral-400 [&>button]:underline-offset-4',
        outside: '[&>button]:text-neutral-300',
        disabled: '[&>button]:text-neutral-300',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({orientation}) =>
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export {Calendar};
export type {DateRange} from 'react-day-picker';

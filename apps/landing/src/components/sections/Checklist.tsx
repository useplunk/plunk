import {Check} from 'lucide-react';
import React from 'react';

export interface ChecklistItem {
  title: string;
  /** One line. If it needs two, it wants a tile of its own. */
  description: string;
}

/**
 * The smaller capabilities, after the tiles have made the big points: a tick,
 * a bold phrase and one line, three across. Replaces long divided lists in
 * which every capability got a display heading and a paragraph, which made
 * the minor ones look as important as the major ones and the page read as a
 * wall of text.
 */
export function Checklist({items}: {items: ChecklistItem[]}) {
  return (
    <ul className={'grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3'}>
      {items.map(item => (
        <li key={item.title} className={'flex gap-3'}>
          <Check aria-hidden strokeWidth={2.25} className={'mt-1 h-4 w-4 flex-shrink-0 text-neutral-900'} />
          <div>
            <p className={'font-semibold text-neutral-900'}>{item.title}</p>
            <p className={'mt-1 text-ui text-neutral-600'}>{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

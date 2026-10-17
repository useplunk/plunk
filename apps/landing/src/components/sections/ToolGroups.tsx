import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

export interface ToolGroup {
  title: string;
  description: string;
  /** Tool names without the `plunk_` prefix. */
  read: string[];
  write: string[];
  /** Shown in the write column when `write` is empty: where that work happens instead. */
  writeElsewhere?: string;
}

/**
 * What an MCP server can do, as one table: area down the side, read and write
 * across the top.
 *
 * This replaces two sections that described the same tools twice. A capability
 * list (nine SpecList rows, about 1,800px) named a few tools per row, and a
 * second section then listed every tool again as two chip clouds, split into
 * read and write. Neither answered the question a reader actually has, which is
 * "what can it touch in each part of my project, and what goes away in
 * read-only mode". Putting the split in the columns answers both at once, and
 * read-only mode becomes something you can see: the left column.
 *
 * Hairline rows rather than cards: the rows are alike, and boxing them makes
 * them look interchangeable.
 */
export function ToolGroups({groups, writeNote}: {groups: ToolGroup[]; writeNote: string}) {
  const still = useReducedMotion();
  const readCount = groups.reduce((n, g) => n + g.read.length, 0);
  const writeCount = groups.reduce((n, g) => n + g.write.length, 0);

  return (
    <div>
      {/* Column heads. Desktop only; below lg each cell carries its own label. */}
      <div
        aria-hidden
        className={
          'hidden grid-cols-12 gap-x-8 border-b border-neutral-900 pb-3 font-code text-label text-neutral-500 lg:grid'
        }
      >
        <span className={'col-span-4'}>area</span>
        <span className={'col-span-3'}>read &middot; {readCount}</span>
        <span className={'col-span-5'}>
          write &middot; {writeCount} &middot; {writeNote}
        </span>
      </div>

      <ul className={'divide-y divide-neutral-200 border-b border-neutral-200 max-lg:border-t'}>
        {groups.map((group, i) => (
          <motion.li
            key={group.title}
            initial={still ? undefined : {opacity: 0, y: 8}}
            whileInView={still ? undefined : {opacity: 1, y: 0}}
            viewport={{once: true, margin: '-10%'}}
            transition={{duration: 0.45, delay: still ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1]}}
            className={'grid grid-cols-1 gap-x-8 gap-y-5 py-8 lg:grid-cols-12'}
          >
            <div className={'lg:col-span-4'}>
              <h3 className={'font-display text-lead font-bold tracking-[-0.02em] text-neutral-900'}>
                {group.title}
              </h3>
              <p className={'mt-2 max-w-[52ch] text-neutral-600'}>{group.description}</p>
            </div>

            <ToolCell label={'read'} tools={group.read} className={'lg:col-span-3'} />
            <ToolCell
              label={'write'}
              tools={group.write}
              empty={group.writeElsewhere}
              className={'lg:col-span-5'}
            />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function ToolCell({
  label,
  tools,
  empty,
  className,
}: {
  label: string;
  tools: string[];
  empty?: string;
  className: string;
}) {
  return (
    <div className={className}>
      {/* Visible below lg, where there are no column heads; kept for screen
          readers above it, since the heads are aria-hidden. */}
      <p className={'mb-2.5 font-code text-label text-neutral-500 lg:sr-only'}>{label}</p>
      {tools.length > 0 ? (
        <ul className={'flex flex-wrap gap-1.5'}>
          {tools.map(tool => (
            <li
              key={tool}
              className={
                'rounded-full border border-neutral-200 bg-white px-2.5 py-1 font-code text-[0.75rem] text-neutral-700'
              }
            >
              {tool}
            </li>
          ))}
        </ul>
      ) : (
        empty && <p className={'pt-1 text-ui text-neutral-500'}>{empty}</p>
      )}
    </div>
  );
}

import React from 'react';

/**
 * The frame every artifact on this page sits in.
 *
 * The homepage's illustrations work when they are faithful replicas of real
 * product surfaces and fail when they are abstract diagrams, so they should
 * all be framed like real surfaces: a titled panel with a header strip, a body,
 * and nothing decorative in between. Extracting that frame is what turns four
 * separate drawings into one family — the reader learns the convention on the
 * first artifact and reads the rest faster.
 *
 * `tone` picks which world the surface belongs to. `dark` is for things that
 * run on a machine — the terminal, the workflow engine. `light` is for things a
 * person looks at — the inbox, the segment, the contact record. That split is
 * doing real work: it tells you at a glance whether you are being shown your
 * software or someone else's behaviour.
 */
export function Surface({
  label,
  meta,
  tone = 'light',
  chrome = false,
  bodyClassName = '',
  children,
}: {
  /** What this surface is. Short, lowercase-ish, always mono. */
  label: string;
  /** Optional right-hand detail: a domain, a name, a count. */
  meta?: React.ReactNode;
  tone?: 'light' | 'dark';
  /** Traffic-light dots, for surfaces that are literally a window. */
  chrome?: boolean;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const dark = tone === 'dark';

  return (
    <figure
      className={`overflow-hidden rounded-card border ${
        dark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 border-b px-5 py-3.5 ${
          dark ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <span className={'flex min-w-0 items-center gap-3'}>
          {chrome && (
            <span aria-hidden className={'flex flex-shrink-0 gap-1.5'}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${dark ? 'bg-neutral-700' : 'bg-neutral-200'}`}
                />
              ))}
            </span>
          )}
          <span
            className={`truncate font-code text-label ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}
          >
            {label}
          </span>
        </span>

        {meta && (
          <span className={`flex flex-shrink-0 items-center gap-2 font-code text-label text-neutral-500`}>
            {meta}
          </span>
        )}
      </div>

      <div className={bodyClassName}>{children}</div>
    </figure>
  );
}

/**
 * A small mono chip used inside surfaces for machine values: an address, a
 * status, a segment condition. Kept here rather than in `Mono` because the tint
 * only makes sense against a surface body.
 */
export function Chip({children, tone = 'light'}: {children: React.ReactNode; tone?: 'light' | 'dark'}) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-code text-[0.6875rem] ${
        tone === 'dark' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
      }`}
    >
      {children}
    </span>
  );
}

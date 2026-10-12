import {Skeleton, cn} from '@plunk/ui';
import type {ReactNode} from 'react';

import {DELTA_TONE, type Delta} from './metrics';

/**
 * A bordered section with a compact title row. Lighter than Card's p-6 header so the page
 * can hold several of these without turning into a stack of padded boxes.
 */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-neutral-200 bg-white', className)}>
      <header className="flex flex-col items-start justify-between gap-x-6 gap-y-2 px-5 pt-4 pb-3 sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-neutral-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function DeltaLabel({
  delta,
  className,
  neutral = false,
  fallback = 'No earlier data',
}: {
  delta: Delta | null;
  className?: string;
  /** For figures where neither direction is good or bad */
  neutral?: boolean;
  fallback?: string;
}) {
  if (!delta) {
    return <span className={cn('text-xs text-neutral-400', className)}>{fallback}</span>;
  }
  return (
    <span className={cn('text-xs tabular-nums', neutral ? 'text-neutral-500' : DELTA_TONE[delta.tone], className)}>
      <span aria-hidden>{delta.label}</span>
      <span className="sr-only">{delta.description}</span>
    </span>
  );
}

export function ChartSkeleton({height = 260}: {height?: number}) {
  return (
    <div className="px-5 pb-5">
      <Skeleton className="w-full" style={{height}} />
    </div>
  );
}

export function RowsSkeleton({rows = 5}: {rows?: number}) {
  return (
    <div className="divide-y divide-neutral-100 border-t border-neutral-100">
      {Array.from({length: rows}, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Inline, quiet empty state for one panel; the page itself never goes blank */
export function PanelEmpty({children, height}: {children: ReactNode; height?: number}) {
  return (
    <div
      className="mx-5 mb-5 flex items-center justify-center rounded-md border border-dashed border-neutral-200 px-6 text-center text-sm text-neutral-500"
      style={{minHeight: height ?? 120}}
    >
      {children}
    </div>
  );
}

export function PanelError({onRetry}: {onRetry: () => void}) {
  return (
    <PanelEmpty>
      <span>
        These numbers didn&apos;t load.{' '}
        <button
          type="button"
          onClick={onRetry}
          className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
        >
          Try again
        </button>
      </span>
    </PanelEmpty>
  );
}

export interface Figure {
  label: string;
  /** Undefined while loading */
  value?: ReactNode;
  detail?: ReactNode;
  tone?: string;
}

/** A row of figures in one hairline-divided band, the static sibling of the overview's metric switch */
export function FigureBand({
  figures,
  failed = false,
  className,
}: {
  figures: Figure[];
  /** The data behind the figures failed to load: show a dash instead of loading forever */
  failed?: boolean;
  className?: string;
}) {
  const columns: Record<number, string> = {
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
  };
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200',
        columns[figures.length],
        className,
      )}
    >
      {figures.map(figure => (
        <div key={figure.label} className="bg-white px-4 py-3.5">
          <dt className="text-xs font-medium text-neutral-500">{figure.label}</dt>
          {figure.value === undefined && failed ? (
            <dd className="mt-1 text-xl font-semibold text-neutral-300">—</dd>
          ) : figure.value === undefined ? (
            <dd>
              <Skeleton className="mt-1.5 h-6 w-16" />
              <Skeleton className="mt-1.5 h-3 w-20" />
            </dd>
          ) : (
            <dd>
              <span className={cn('mt-1 block text-xl font-semibold tracking-tight tabular-nums', figure.tone ?? 'text-neutral-900')}>
                {figure.value}
              </span>
              {figure.detail && <span className="mt-0.5 block text-xs text-neutral-500">{figure.detail}</span>}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

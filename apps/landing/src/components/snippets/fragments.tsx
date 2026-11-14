import React from 'react';

/**
 * The pieces snippet graphics are built from. They are drawn the way the
 * dashboard draws them: the UI sans at interface size, real names and states,
 * no mono, no IDs. If a fragment needs a field name or an operator to make
 * sense, it is the wrong fragment.
 */

/** A white piece of interface, lifted off its tile. */
export function UICard({className = '', children}: {className?: string; children: React.ReactNode}) {
  return (
    <div className={`rounded-xl border border-neutral-200/80 bg-white shadow-fragment ${className}`}>{children}</div>
  );
}

/** The small square icon the dashboard puts beside a step or a row. */
export function SnippetIcon({icon: Icon}: {icon: React.ElementType}) {
  return (
    <span className={'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100'}>
      <Icon className={'h-4 w-4 text-neutral-700'} strokeWidth={1.75} aria-hidden />
    </span>
  );
}

/** A contact, as the dashboard shows one before it has a photo: initials. */
export function Avatar({name}: {name: string}) {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2);

  return (
    <span
      aria-hidden
      className={
        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-label font-semibold text-neutral-700'
      }
    >
      {initials}
    </span>
  );
}

/**
 * An icon or avatar, the thing itself, and an optional trailing state. The
 * small label sits above the title by default; `below` puts it underneath, for
 * rows where the title is a person and the label is what they did.
 */
export function SnippetRow({
  icon,
  leading,
  label,
  title,
  trailing,
  labelPosition = 'above',
}: {
  icon?: React.ElementType;
  leading?: React.ReactNode;
  label: string;
  title: string;
  trailing?: React.ReactNode;
  labelPosition?: 'above' | 'below';
}) {
  const small = <p className={'truncate text-label text-neutral-500'}>{label}</p>;

  return (
    <div className={'flex items-center gap-3'}>
      {icon ? <SnippetIcon icon={icon} /> : leading}
      <div className={'min-w-0 flex-1'}>
        {labelPosition === 'above' && small}
        <p className={'truncate text-ui font-semibold text-neutral-900'}>{title}</p>
        {labelPosition === 'below' && small}
      </div>
      {trailing}
    </div>
  );
}

/** The quiet timestamp at the end of a row. */
export function TimeAgo({children}: {children: React.ReactNode}) {
  return <span className={'flex-shrink-0 text-label text-neutral-500'}>{children}</span>;
}

/**
 * A state, the way the dashboard shows one. Colour only ever means state here,
 * so `neutral` is the default and the semantic tones are opt-in.
 */
export function StatusPill({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'ok' | 'warn' | 'err';
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700',
    ok: 'bg-ok-surface text-ok',
    warn: 'bg-warn-surface text-warn',
    err: 'bg-err-surface text-err',
  }[tone];

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-label font-medium ${tones}`}
    >
      {tone !== 'neutral' && <span aria-hidden className={'h-1.5 w-1.5 rounded-full bg-current'} />}
      {children}
    </span>
  );
}

/**
 * A short sequence, top to bottom, the way the workflow builder stacks steps.
 * Each step is one card; the thin line between them is the only connector.
 */
export function FlowFragment({steps}: {steps: {icon: React.ElementType; label: string; title: string}[]}) {
  return (
    <div className={'flex w-full max-w-xs flex-col items-center'}>
      {steps.map((step, i) => (
        <React.Fragment key={`${step.label}-${step.title}`}>
          {i > 0 && <span aria-hidden className={'h-4 w-px bg-neutral-300'} />}
          <UICard className={'w-full px-3 py-2.5'}>
            <SnippetRow icon={step.icon} label={step.label} title={step.title} />
          </UICard>
        </React.Fragment>
      ))}
    </div>
  );
}

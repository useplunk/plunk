import React, {ReactNode} from 'react';
import {AlertTriangle, CheckCircle2, Info, Lightbulb} from 'lucide-react';

type InfoBoxType = 'info' | 'warning' | 'tip' | 'success';

interface InfoBoxProps {
  type?: InfoBoxType;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Callout for guides: notes, tips, warnings, and confirmations.
 *
 * Colour here follows the product rule — neutral by default, semantic by
 * exception. `warning` and `success` describe a state, so they carry the warn
 * and ok tokens. `info` and `tip` do not describe a state; they were tinted
 * blue and purple purely for variety, which is the decoration the brand
 * palette rules out. They are neutral now, and the icon plus the heading do the
 * distinguishing.
 *
 * Colours come from the semantic tokens in globals.css rather than raw Tailwind
 * hues, so a change to the palette reaches every callout on the site at once.
 */
const infoBoxConfig: Record<
  InfoBoxType,
  {
    icon: React.ComponentType<{className?: string}>;
    container: string;
    iconColor: string;
    titleColor: string;
  }
> = {
  info: {
    icon: Info,
    container: 'border-neutral-200 bg-neutral-50',
    iconColor: 'text-neutral-500',
    titleColor: 'text-neutral-900',
  },
  tip: {
    icon: Lightbulb,
    container: 'border-neutral-200 bg-neutral-50',
    iconColor: 'text-neutral-500',
    titleColor: 'text-neutral-900',
  },
  warning: {
    icon: AlertTriangle,
    container: 'border-warn/25 bg-warn-surface',
    iconColor: 'text-warn',
    titleColor: 'text-neutral-900',
  },
  success: {
    icon: CheckCircle2,
    container: 'border-ok/25 bg-ok-surface',
    iconColor: 'text-ok',
    titleColor: 'text-neutral-900',
  },
};

/**
 * InfoBox component for displaying tips, warnings, notes, and other callouts in guides
 */
export function InfoBox({type = 'info', title, children, className}: InfoBoxProps) {
  const config = infoBoxConfig[type];
  const Icon = config.icon;

  const defaultTitles: Record<InfoBoxType, string> = {
    info: 'Note',
    warning: 'Warning',
    tip: 'Tip',
    success: 'Success',
  };

  return (
    <div className={`rounded-card border ${config.container} p-6 my-6 ${className || ''}`}>
      <div className={'flex gap-4'}>
        <div className={'shrink-0'}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div>
          {(title || defaultTitles[type]) && (
            <h4 className={`not-prose font-semibold ${config.titleColor}`}>{title || defaultTitles[type]}</h4>
          )}
          <div className={'text-neutral-700 leading-relaxed mt-1 prose max-w-none'}>{children}</div>
        </div>
      </div>
    </div>
  );
}

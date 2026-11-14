import {AlertTriangle, CheckCircle2, Info, Lightbulb} from 'lucide-react';
import React, {ReactNode} from 'react';

type InfoBoxType = 'info' | 'warning' | 'tip' | 'success';

/**
 * A callout in a guide: one pale tile, an icon, a short heading and a line or
 * two. All four kinds share the tile; only the icon changes colour, and only
 * for `warning` and `success`, which describe a state. Tinted panels with
 * coloured borders made every guide look like a page of alerts.
 *
 * Use one or two per guide, for the thing a reader must not miss. More than
 * that and none of them stand out.
 */
const kinds: Record<InfoBoxType, {icon: React.ElementType; color: string; label: string}> = {
  info: {icon: Info, color: 'text-neutral-500', label: 'Note'},
  tip: {icon: Lightbulb, color: 'text-neutral-500', label: 'Tip'},
  warning: {icon: AlertTriangle, color: 'text-warn', label: 'Watch out'},
  success: {icon: CheckCircle2, color: 'text-ok', label: 'Good to know'},
};

export function InfoBox({
  type = 'info',
  title,
  children,
}: {
  type?: InfoBoxType;
  title?: string;
  children: ReactNode;
}) {
  const {icon: Icon, color, label} = kinds[type];

  return (
    <aside className={'!my-8 flex gap-4 rounded-card bg-tile p-6'}>
      <Icon aria-hidden className={`mt-0.5 h-5 w-5 flex-shrink-0 ${color}`} strokeWidth={2} />
      <div className={'min-w-0'}>
        <p className={'font-semibold !text-neutral-900'}>{title ?? label}</p>
        <div className={'mt-1 text-neutral-700 [&>p+p]:mt-3 [&_p]:!leading-relaxed'}>{children}</div>
      </div>
    </aside>
  );
}

import type {GlobalAnalyticsAlert, GlobalAnalyticsAlertSeverity} from '@plunk/types';
import {cn} from '@plunk/ui';
import {AlertOctagon, AlertTriangle, ChevronRight, Info} from 'lucide-react';

import {formatCount, formatRate} from '../metrics';
import {Panel, PanelEmpty, PanelError, RowsSkeleton} from '../primitives';

const SEVERITY: Record<GlobalAnalyticsAlertSeverity, {icon: typeof Info; tone: string; label: string}> = {
  critical: {icon: AlertOctagon, tone: 'text-red-600', label: 'Critical'},
  warning: {icon: AlertTriangle, tone: 'text-amber-600', label: 'Warning'},
  info: {icon: Info, tone: 'text-neutral-400', label: 'Note'},
};

function describe(alert: GlobalAnalyticsAlert): string {
  switch (alert.kind) {
    case 'project_disabled':
      return 'Project is disabled and cannot send';
    case 'high_bounce_rate':
      return `Bounce rate of ${formatRate(alert.value)}`;
    case 'high_complaint_rate':
      return `Complaint rate of ${formatRate(alert.value)}`;
    case 'failed_emails':
      return `${formatCount(alert.value)} ${alert.value === 1 ? 'email' : 'emails'} failed to send`;
    case 'volume_spike':
      return `Sent ${alert.value}× more than the previous period`;
    case 'no_activity':
      return `No emails sent, after ${formatCount(alert.value)} in the previous period`;
  }
}

/** Projects that need a look, most severe first. Each row opens that project's analytics. */
export function GlobalAlerts({
  alerts,
  error,
  onRetry,
  onOpen,
}: {
  alerts: GlobalAnalyticsAlert[] | undefined;
  error: boolean;
  onRetry: () => void;
  onOpen: (projectId: string) => void;
}) {
  const critical = alerts?.filter(a => a.severity === 'critical').length ?? 0;

  return (
    <Panel
      title="Alerts"
      description={
        alerts && alerts.length > 0
          ? `${alerts.length} ${alerts.length === 1 ? 'issue' : 'issues'}${critical > 0 ? `, ${critical} critical` : ''}`
          : 'Delivery problems, disabled projects and unusual volume'
      }
    >
      {error && !alerts ? (
        <PanelError onRetry={onRetry} />
      ) : !alerts ? (
        <RowsSkeleton rows={3} />
      ) : alerts.length === 0 ? (
        <PanelEmpty>Every project looks healthy for this period.</PanelEmpty>
      ) : (
        <ul className="max-h-[22rem] divide-y divide-neutral-100 overflow-y-auto border-t border-neutral-100">
          {alerts.map(alert => {
            const {icon: Icon, tone, label} = SEVERITY[alert.severity];
            return (
              <li key={`${alert.projectId}:${alert.kind}`}>
                <button
                  type="button"
                  onClick={() => onOpen(alert.projectId)}
                  className="group flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                >
                  <Icon className={cn('h-4 w-4 shrink-0', tone)} aria-label={label} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">{alert.projectName}</span>
                    <span className="block truncate text-xs text-neutral-500">{describe(alert)}</span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-neutral-500"
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

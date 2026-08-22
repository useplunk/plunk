import {Badge, Button, Collapsible, CollapsibleContent, CollapsibleTrigger} from '@plunk/ui';
import type {Activity} from '@plunk/types';
import {memo, useState} from 'react';
import {EmailPreviewModal} from './EmailPreviewModal';
import {
  AlertCircle,
  Calendar,
  CheckCheck,
  CheckCircle,
  ChevronRight,
  Eye,
  Inbox,
  MousePointerClick,
  Send,
  ShieldAlert,
  UserMinus,
  UserPlus,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

/**
 * Simple relative time formatter for past events
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Format upcoming time (for future events)
 */
function getUpcomingTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'in a moment';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `in ${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `in ${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return `tomorrow at ${date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})}`;
  }

  if (diffInDays < 7) {
    return `in ${diffInDays} days`;
  }

  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `in ${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'}`;
}

/**
 * Check if an activity is an email activity
 */
function isEmailActivity(type: string): boolean {
  return [
    'email.sent',
    'email.delivered',
    'email.received',
    'email.opened',
    'email.clicked',
    'email.bounced',
    'email.complaint',
  ].includes(type);
}

interface ActivityItemProps {
  activity: Activity;
  status?: 'upcoming' | 'completed';
}

interface ActivityConfig {
  icon: React.ComponentType<{className?: string}>;
  color: string;
  bgColor: string;
  title: string;
  description?: string;
  badge?: {
    label: string;
    variant: 'default' | 'secondary' | 'neutral' | 'destructive' | 'outline';
  };
  jsonData?: Record<string, unknown>;
}

/**
 * Read an event's payload, which Prisma types as JsonValue
 */
function getEventData(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
  const {eventData} = metadata;
  return eventData && typeof eventData === 'object' && !Array.isArray(eventData)
    ? (eventData as Record<string, unknown>)
    : undefined;
}

/**
 * Human-readable cause of a subscription change, when the event recorded one.
 * Only the bounce and complaint paths write a reason today, so anything else
 * stays undefined rather than guessing at a source.
 */
function getSubscriptionReason(metadata: Record<string, unknown>): string | undefined {
  const reason = getEventData(metadata)?.reason;

  switch (reason) {
    case 'bounce':
      return 'Removed after a hard bounce';
    case 'complaint':
      return 'Removed after a spam complaint';
    default:
      return undefined;
  }
}

/**
 * Subject of the email a subscription change came from, which becomes the row's
 * title — the same slot an email row uses for its subject.
 *
 * Absent for changes with no email behind them (a dashboard toggle, a CSV
 * import, an API call) and for mail sent before unsubscribe links carried their
 * source; those rows title themselves by the action instead.
 */
function getSubscriptionSubject(metadata: Record<string, unknown>): string | undefined {
  return typeof metadata.sourceSubject === 'string' && metadata.sourceSubject ? metadata.sourceSubject : undefined;
}

/**
 * Which send the originating email belonged to, in the same `Campaign: x` /
 * `Workflow: x` form email rows use. Transactional sources have neither, and
 * name themselves through the subject in the title.
 */
function getSubscriptionOrigin(metadata: Record<string, unknown>): string | undefined {
  if (typeof metadata.campaignName === 'string' && metadata.campaignName) {
    return `Campaign: ${metadata.campaignName}`;
  }
  if (typeof metadata.workflowName === 'string' && metadata.workflowName) {
    return `Workflow: ${metadata.workflowName}`;
  }
  return undefined;
}

/**
 * Describe a subscription change as cause and origin — either, both, or neither.
 */
function getSubscriptionDescription(metadata: Record<string, unknown>): string | undefined {
  const parts = [getSubscriptionReason(metadata), getSubscriptionOrigin(metadata)].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : undefined;
}

function getActivityConfig(activity: Activity): ActivityConfig {
  const {type, metadata} = activity;

  switch (type) {
    case 'event.triggered':
      return {
        icon: Zap,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        title: (typeof metadata.eventName === 'string' ? metadata.eventName : undefined) || 'Event triggered',
        description: undefined,
        badge: {
          label: 'Event',
          variant: 'default',
        },
        jsonData: getEventData(metadata),
      };

    case 'email.sent':
      return {
        icon: Send,
        color: 'text-neutral-700',
        bgColor: 'bg-neutral-100',
        title: (typeof metadata.subject === 'string' ? metadata.subject : undefined) || 'Email sent',
        description: metadata.campaignName
          ? `Campaign: ${String(metadata.campaignName)}`
          : metadata.workflowName
            ? `Workflow: ${String(metadata.workflowName)}`
            : typeof metadata.sourceType === 'string'
              ? metadata.sourceType
              : undefined,
        badge: {
          label: 'Sent',
          variant: 'default',
        },
      };

    case 'email.delivered':
      return {
        icon: CheckCircle,
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        title: (typeof metadata.subject === 'string' ? metadata.subject : undefined) || 'Email delivered',
        description: metadata.campaignName
          ? `Campaign: ${String(metadata.campaignName)}`
          : metadata.workflowName
            ? `Workflow: ${String(metadata.workflowName)}`
            : undefined,
        badge: {
          label: 'Delivered',
          variant: 'default',
        },
      };

    case 'email.received':
      return {
        icon: Inbox,
        color: 'text-neutral-600',
        bgColor: 'bg-neutral-100',
        title: (typeof metadata.subject === 'string' ? metadata.subject : undefined) || 'Email received',
        description: typeof metadata.from === 'string' ? `From: ${metadata.from}` : 'Inbound email',
        badge: {
          label: 'Received',
          variant: 'default',
        },
      };

    case 'email.opened':
      return {
        icon: Eye,
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        title: (typeof metadata.subject === 'string' ? metadata.subject : undefined) || 'Email opened',
        description:
          typeof metadata.totalOpens === 'number' && metadata.totalOpens > 1
            ? `Opened ${metadata.totalOpens} times`
            : metadata.campaignName
              ? `Campaign: ${String(metadata.campaignName)}`
              : metadata.workflowName
                ? `Workflow: ${String(metadata.workflowName)}`
                : undefined,
        badge: {
          label: 'Opened',
          variant: 'secondary',
        },
      };

    case 'email.clicked':
      return {
        icon: MousePointerClick,
        color: 'text-sky-700',
        bgColor: 'bg-sky-50',
        title: (typeof metadata.subject === 'string' ? metadata.subject : undefined) || 'Email clicked',
        description:
          typeof metadata.totalClicks === 'number' && metadata.totalClicks > 1
            ? `Clicked ${metadata.totalClicks} times`
            : metadata.campaignName
              ? `Campaign: ${String(metadata.campaignName)}`
              : metadata.workflowName
                ? `Workflow: ${String(metadata.workflowName)}`
                : undefined,
        badge: {
          label: 'Clicked',
          variant: 'default',
        },
      };

    case 'email.bounced':
      return {
        icon: XCircle,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        title: (typeof metadata.subject === 'string' ? metadata.subject : undefined) || 'Email bounced',
        description: (typeof metadata.error === 'string' ? metadata.error : undefined) || 'Email failed to deliver',
        badge: {
          label: 'Bounced',
          variant: 'destructive',
        },
      };

    case 'email.complaint':
      return {
        icon: ShieldAlert,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        title: (typeof metadata.subject === 'string' ? metadata.subject : undefined) || 'Spam complaint',
        description: metadata.campaignName
          ? `Campaign: ${String(metadata.campaignName)}`
          : metadata.workflowName
            ? `Workflow: ${String(metadata.workflowName)}`
            : 'Recipient marked as spam',
        badge: {
          label: 'Complaint',
          variant: 'destructive',
        },
      };

    case 'workflow.started':
      return {
        icon: Workflow,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        title: (typeof metadata.workflowName === 'string' ? metadata.workflowName : undefined) || 'Workflow started',
        description: `Status: ${String(metadata.status || 'unknown')}`,
        badge: {
          label: 'Workflow',
          variant: 'default',
        },
      };

    case 'workflow.completed':
      return {
        icon: CheckCheck,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        title: (typeof metadata.workflowName === 'string' ? metadata.workflowName : undefined) || 'Workflow completed',
        description: metadata.exitReason
          ? `Exit: ${String(metadata.exitReason)}`
          : `Status: ${String(metadata.status || 'unknown')}`,
        badge: {
          label: 'Completed',
          variant: 'default',
        },
      };

    case 'contact.subscribed':
      return {
        icon: UserPlus,
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        title: getSubscriptionSubject(metadata) || 'Contact subscribed',
        description: getSubscriptionDescription(metadata),
        badge: {
          label: 'Subscribed',
          variant: 'default',
        },
        jsonData: getEventData(metadata),
      };

    case 'contact.unsubscribed':
      return {
        icon: UserMinus,
        color: 'text-neutral-700',
        bgColor: 'bg-neutral-100',
        title: getSubscriptionSubject(metadata) || 'Contact unsubscribed',
        description: getSubscriptionDescription(metadata),
        badge: {
          label: 'Unsubscribed',
          // `outline` is this feed's marker for scheduled, not-yet-happened
          // items; a past opt-out takes the muted fill instead.
          variant: 'neutral',
        },
        jsonData: getEventData(metadata),
      };

    case 'campaign.scheduled':
      return {
        icon: Calendar,
        color: 'text-sky-700',
        bgColor: 'bg-sky-50',
        title: (typeof metadata.campaignName === 'string' ? metadata.campaignName : undefined) || 'Campaign scheduled',
        description: metadata.subject
          ? `${String(metadata.subject)}${metadata.totalRecipients ? ` • ${metadata.totalRecipients} recipients` : ''}`
          : metadata.totalRecipients
            ? `${metadata.totalRecipients} recipients`
            : undefined,
        badge: {
          label: 'Scheduled',
          variant: 'outline',
        },
      };

    case 'workflow.email.scheduled':
      return {
        icon: Calendar,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        title: (typeof metadata.stepName === 'string' ? metadata.stepName : undefined) || 'Workflow email scheduled',
        description: metadata.workflowName
          ? `Workflow: ${String(metadata.workflowName)}${metadata.subject ? ` • ${String(metadata.subject)}` : ''}`
          : typeof metadata.subject === 'string'
            ? metadata.subject
            : undefined,
        badge: {
          label: 'Scheduled',
          variant: 'outline',
        },
      };

    default:
      return {
        icon: AlertCircle,
        color: 'text-neutral-600',
        bgColor: 'bg-neutral-100',
        title: 'Unknown activity',
        badge: {
          label: 'Unknown',
          variant: 'outline',
        },
      };
  }
}

export const ActivityItem = memo(function ActivityItem({activity, status = 'completed'}: ActivityItemProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const config = getActivityConfig(activity);
  const Icon = config.icon;
  const timestamp = new Date(activity.timestamp);
  const isUpcoming = status === 'upcoming';
  const relativeTime = isUpcoming ? getUpcomingTime(timestamp) : getRelativeTime(timestamp);

  return (
    <div className={`flex items-start gap-4 ${isUpcoming ? 'opacity-80' : ''}`}>
      {/* Icon */}
      <div
        className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0 ${isUpcoming ? 'border-2 border-dashed border-neutral-300' : ''}`}
      >
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm font-medium truncate ${isUpcoming ? 'text-neutral-700' : 'text-neutral-900'}`}>
                {config.title}
              </p>
              {config.badge && <Badge variant={config.badge.variant}>{config.badge.label}</Badge>}
              {isEmailActivity(activity.type) && activity.metadata.subject && activity.metadata.body ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreviewModal(true)}
                  className="h-6 px-2 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
              ) : null}
            </div>
            {config.description && <p className="text-sm text-neutral-500 line-clamp-2">{config.description}</p>}
            {activity.contactEmail && (
              <div className="flex items-center gap-2 mt-2">
                {activity.contactId ? (
                  <Link
                    href={`/contacts/${activity.contactId}`}
                    className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline"
                  >
                    {activity.contactEmail}
                  </Link>
                ) : (
                  <span className="text-xs text-neutral-600">{activity.contactEmail}</span>
                )}
              </div>
            )}
            {/* Collapsible JSON Data */}
            {config.jsonData && (
              <Collapsible className="mt-2">
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 transition-colors group">
                  <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
                  <span className="font-medium">Event data</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs overflow-x-auto">
                    <code className="text-neutral-700">{JSON.stringify(config.jsonData, null, 2)}</code>
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          <span
            className={`text-xs flex-shrink-0 whitespace-nowrap ${isUpcoming ? 'text-neutral-700 font-medium' : 'text-neutral-400'}`}
            title={timestamp.toLocaleString()}
          >
            {relativeTime}
          </span>
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreviewModal && activity.metadata.subject && activity.metadata.body ? (
        <EmailPreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          subject={String(activity.metadata.subject)}
          body={String(activity.metadata.body)}
          from={activity.metadata.from ? String(activity.metadata.from) : undefined}
          fromName={activity.metadata.fromName ? String(activity.metadata.fromName) : undefined}
          replyTo={activity.metadata.replyTo ? String(activity.metadata.replyTo) : undefined}
          toName={activity.metadata.toName ? String(activity.metadata.toName) : undefined}
          toEmail={activity.contactEmail}
        />
      ) : null}
    </div>
  );
});

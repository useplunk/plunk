import type {Activity} from '@plunk/types';
import {Badge, Button, cn} from '@plunk/ui';
import dayjs from 'dayjs';
import {
  AlertCircle,
  Calendar,
  CheckCheck,
  CheckCircle,
  ChevronRight,
  Clock,
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
import {memo, type ReactNode, useState} from 'react';

import {EmailPreviewModal} from './EmailPreviewModal';

type Metadata = Record<string, unknown>;

const str = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined);
const num = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

function isEmailActivity(type: string): boolean {
  return type.startsWith('email.');
}

/**
 * Read an event's payload, which Prisma types as JsonValue
 */
function getEventData(metadata: Metadata): Record<string, unknown> | undefined {
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
function getSubscriptionReason(metadata: Metadata): string | undefined {
  const eventData = getEventData(metadata);

  switch (eventData?.reason) {
    case 'bounce':
      return 'Removed after a hard bounce';
    case 'complaint':
      return 'Removed after a spam complaint';
    case 'snooze': {
      // Snoozing reuses `contact.unsubscribed`, so without this the feed would report a
      // recipient who asked for a two-week break as a lost subscriber.
      const until = formatSnoozeDate(eventData?.snoozedUntil);
      return until ? `Snoozed until ${until}` : 'Snoozed';
    }
    case 'snooze_expired':
      return 'Snooze ended, resubscribed automatically';
    default:
      return undefined;
  }
}

/**
 * The `reason` on a subscription event, when it is one of the snooze ones.
 *
 * Snoozing is not a distinct event type -- it rides on `contact.subscribed` /
 * `contact.unsubscribed` so that workflows and counters pick it up for free -- so the row's
 * icon and badge have to be chosen from this rather than from the event name.
 */
function getSnoozeReason(metadata: Metadata): 'snooze' | 'snooze_expired' | undefined {
  const reason = getEventData(metadata)?.reason;
  return reason === 'snooze' || reason === 'snooze_expired' ? reason : undefined;
}

/** Absolute date for a snooze end. See `formatSnoozedUntil` in lib/contactStatus. */
function formatSnoozeDate(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, {year: 'numeric', month: 'short', day: 'numeric'}).format(date);
}

/**
 * Where an activity came from, as a link when the source still has a page. Email rows
 * carry the campaign, workflow or template id; subscription rows only the source names.
 */
function getSource(activity: Activity): {label: string; href?: string} | undefined {
  const {type, metadata} = activity;
  // Workflow rows are titled by their workflow, which links there itself
  if (type.startsWith('workflow.') && type !== 'workflow.email.scheduled') return undefined;
  const campaign = str(metadata.campaignName);
  if (campaign) {
    return {label: `Campaign: ${campaign}`, href: str(metadata.campaignId) && `/campaigns/${str(metadata.campaignId)}`};
  }
  const workflow = str(metadata.workflowName);
  if (workflow) {
    return {label: `Workflow: ${workflow}`, href: str(metadata.workflowId) && `/workflows/${str(metadata.workflowId)}`};
  }
  if (str(metadata.templateId)) {
    return {label: 'Transactional template', href: `/templates/${str(metadata.templateId)}`};
  }
  if (metadata.sourceType === 'TRANSACTIONAL') {
    return {label: 'Transactional'};
  }
  return undefined;
}

const TILE = {
  neutral: 'bg-neutral-100 text-neutral-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  sky: 'bg-sky-50 text-sky-700',
  red: 'bg-red-50 text-red-700',
};

/** "5 minutes ago" for today; older rows sit under a day heading, so the clock time reads better there */
function formatWhen(date: dayjs.Dayjs, upcoming: boolean): string {
  if (upcoming) {
    return date.isSame(dayjs(), 'day') ? `today at ${date.format('HH:mm')}` : date.format('ddd, MMM D [at] HH:mm');
  }
  if (!date.isSame(dayjs(), 'day')) {
    return date.format('HH:mm');
  }
  const minutes = dayjs().diff(date, 'minute');
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = dayjs().diff(date, 'hour');
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

interface ActivityConfig {
  icon: React.ComponentType<{className?: string}>;
  /** Tile colours: each kind of activity keeps its own, so the feed reads at a glance */
  tile: string;
  title: string;
  badge: {label: string; variant: 'default' | 'neutral' | 'destructive' | 'outline'};
  /** One line under the title, after the contact; the source link is added separately */
  detail?: string;
}

function getActivityConfig(activity: Activity): ActivityConfig {
  const {type, metadata} = activity;
  const subject = str(metadata.subject);

  switch (type) {
    case 'event.triggered':
      return {
        icon: Zap,
        tile: TILE.amber,
        title: str(metadata.eventName) ?? 'Event triggered',
        badge: {label: 'Event', variant: 'default'},
      };

    case 'email.sent':
      return {
        icon: Send,
        tile: TILE.neutral,
        title: subject ?? 'Email sent',
        badge: {label: 'Sent', variant: 'default'},
      };

    case 'email.delivered':
      return {
        icon: CheckCircle,
        tile: TILE.emerald,
        title: subject ?? 'Email delivered',
        badge: {label: 'Delivered', variant: 'default'},
      };

    case 'email.received':
      return {
        icon: Inbox,
        tile: TILE.neutral,
        title: subject ?? 'Email received',
        badge: {label: 'Received', variant: 'default'},
        detail: str(metadata.from) ? `From ${str(metadata.from)}` : 'Inbound email',
      };

    case 'email.opened': {
      const opens = num(metadata.totalOpens);
      return {
        icon: Eye,
        tile: TILE.emerald,
        title: subject ?? 'Email opened',
        badge: {label: 'Opened', variant: 'default'},
        detail: opens && opens > 1 ? `Opened ${opens} times` : undefined,
      };
    }

    case 'email.clicked': {
      const clicks = num(metadata.totalClicks);
      return {
        icon: MousePointerClick,
        tile: TILE.sky,
        title: subject ?? 'Email clicked',
        badge: {label: 'Clicked', variant: 'default'},
        detail: clicks && clicks > 1 ? `Clicked ${clicks} times` : undefined,
      };
    }

    case 'email.bounced':
      return {
        icon: XCircle,
        tile: TILE.red,
        title: subject ?? 'Email bounced',
        badge: {label: 'Bounced', variant: 'destructive'},
        detail: str(metadata.bounceType) === 'Permanent' ? 'Hard bounce' : undefined,
      };

    case 'email.complaint':
      return {
        icon: ShieldAlert,
        tile: TILE.red,
        title: subject ?? 'Spam complaint',
        badge: {label: 'Complaint', variant: 'destructive'},
      };

    case 'workflow.started':
      return {
        icon: Workflow,
        tile: TILE.amber,
        title: str(metadata.workflowName) ?? 'Workflow started',
        badge: {label: 'Started', variant: 'default'},
      };

    case 'workflow.completed':
      return {
        icon: CheckCheck,
        tile: TILE.amber,
        title: str(metadata.workflowName) ?? 'Workflow completed',
        badge: {label: 'Completed', variant: 'default'},
        detail: str(metadata.exitReason) ? `Exited: ${str(metadata.exitReason)}` : undefined,
      };

    case 'contact.subscribed': {
      const resumed = getSnoozeReason(metadata) === 'snooze_expired';
      return {
        icon: resumed ? Clock : UserPlus,
        tile: TILE.emerald,
        title: str(metadata.sourceSubject) ?? (resumed ? 'Snooze ended' : 'Contact subscribed'),
        badge: {label: resumed ? 'Resumed' : 'Subscribed', variant: 'default'},
        detail: getSubscriptionReason(metadata),
      };
    }

    case 'contact.unsubscribed': {
      const snoozed = getSnoozeReason(metadata) === 'snooze';
      return {
        icon: snoozed ? Clock : UserMinus,
        tile: TILE.neutral,
        title: str(metadata.sourceSubject) ?? (snoozed ? 'Contact snoozed' : 'Contact unsubscribed'),
        // `outline` is this feed's marker for scheduled, not-yet-happened items; a past
        // opt-out takes the muted fill instead.
        badge: {label: snoozed ? 'Snoozed' : 'Unsubscribed', variant: 'neutral'},
        detail: getSubscriptionReason(metadata),
      };
    }

    case 'campaign.scheduled': {
      const recipients = num(metadata.totalRecipients);
      return {
        icon: Calendar,
        tile: TILE.sky,
        title: str(metadata.campaignName) ?? 'Campaign scheduled',
        badge: {label: 'Scheduled', variant: 'outline'},
        detail: recipients ? `${recipients.toLocaleString()} recipients` : undefined,
      };
    }

    case 'workflow.email.scheduled':
      return {
        icon: Calendar,
        tile: TILE.amber,
        title: str(metadata.stepName) ?? 'Workflow email scheduled',
        badge: {label: 'Scheduled', variant: 'outline'},
        detail: subject,
      };

    default:
      return {
        icon: AlertCircle,
        tile: TILE.neutral,
        title: 'Unknown activity',
        badge: {label: 'Unknown', variant: 'outline'},
      };
  }
}

/**
 * The details revealed when a row is opened: everything the row had no room for, and in
 * particular the "why" behind it (the link clicked, the bounce type, the event payload).
 */
function getDetails(activity: Activity): {label: string; value: ReactNode}[] {
  const {type, metadata} = activity;
  const rows: {label: string; value: ReactNode}[] = [];
  const add = (label: string, value: ReactNode | undefined) => {
    if (value !== undefined && value !== null && value !== '') rows.push({label, value});
  };

  if (isEmailActivity(type)) {
    add('Subject', str(metadata.subject));
    const fromName = str(metadata.fromName);
    const from = str(metadata.from);
    add('From', from && (fromName ? `${fromName} <${from}>` : from));
    add('To', activity.contactEmail);
    add('Reply-to', str(metadata.replyTo));
  }

  if (type === 'email.clicked') {
    const link = str(metadata.link);
    add(
      'Link',
      link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all underline-offset-4 hover:underline"
        >
          {link}
        </a>
      ),
    );
  }

  if (type === 'email.bounced') {
    const bounceType = str(metadata.bounceType);
    add(
      'Bounce',
      bounceType === 'Permanent'
        ? 'Hard bounce: the address does not exist or refuses mail. The contact was unsubscribed.'
        : bounceType
          ? `${bounceType} bounce. The contact was unsubscribed to be safe.`
          : undefined,
    );
    add('Error', str(metadata.error));
  }

  if (type === 'email.complaint') {
    add('Complaint', 'The recipient marked this email as spam. The contact was unsubscribed.');
  }

  if (type === 'workflow.started' || type === 'workflow.completed') {
    add('Status', str(metadata.status)?.toLowerCase());
    add('Exit reason', str(metadata.exitReason));
  }

  if (type === 'contact.subscribed' || type === 'contact.unsubscribed') {
    add('Reason', getSubscriptionReason(metadata));
    add('From email', str(metadata.sourceSubject));
  }

  if (type === 'campaign.scheduled' || type === 'workflow.email.scheduled') {
    add('Sends', dayjs(activity.timestamp).format('ddd, MMM D, YYYY [at] HH:mm'));
    add('Subject', str(metadata.subject));
  }

  return rows;
}

interface ActivityItemProps {
  activity: Activity;
  status?: 'upcoming' | 'completed';
}

export const ActivityItem = memo(function ActivityItem({activity, status = 'completed'}: ActivityItemProps) {
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const config = getActivityConfig(activity);
  const Icon = config.icon;
  const timestamp = dayjs(activity.timestamp);
  const isUpcoming = status === 'upcoming';
  const source = getSource(activity);
  const titleHref =
    (activity.type === 'workflow.started' || activity.type === 'workflow.completed') &&
    str(activity.metadata.workflowId)
      ? `/workflows/${str(activity.metadata.workflowId)}`
      : undefined;
  const details = getDetails(activity);
  const eventData = getEventData(activity.metadata);
  const canPreview =
    isEmailActivity(activity.type) && !!str(activity.metadata.subject) && !!str(activity.metadata.body);
  const detailsId = `activity-${activity.id}`;

  return (
    <li className={cn(open && 'bg-neutral-50/60')}>
      <div
        // The whole row toggles, but links and buttons inside it keep their own behaviour
        onClick={e => {
          if ((e.target as HTMLElement).closest('a, button')) return;
          setOpen(o => !o);
        }}
        className={cn(
          'grid cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-4 px-4 py-4 transition-colors hover:bg-neutral-50 sm:px-6',
          isUpcoming && 'opacity-80',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            config.tile,
            isUpcoming && 'border-2 border-dashed border-neutral-300',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {titleHref ? (
              <Link
                href={titleHref}
                className="truncate text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
              >
                {config.title}
              </Link>
            ) : (
              <span className="truncate text-sm font-medium text-neutral-900">{config.title}</span>
            )}
            <Badge variant={config.badge.variant} className="shrink-0">
              {config.badge.label}
            </Badge>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
            {activity.contactEmail &&
              (activity.contactId ? (
                <Link
                  href={`/contacts/${activity.contactId}`}
                  className="truncate text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
                >
                  {activity.contactEmail}
                </Link>
              ) : (
                <span className="truncate text-neutral-600">{activity.contactEmail}</span>
              ))}
            {source &&
              (source.href ? (
                <Link href={source.href} className="truncate underline-offset-4 hover:text-neutral-900 hover:underline">
                  {source.label}
                </Link>
              ) : (
                <span className="truncate">{source.label}</span>
              ))}
            {config.detail && <span className="truncate">{config.detail}</span>}
            <span className={cn('sm:hidden', isUpcoming ? 'font-medium text-neutral-700' : 'text-neutral-400')}>
              {formatWhen(timestamp, isUpcoming)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <time
            dateTime={timestamp.toISOString()}
            title={timestamp.format('ddd, MMM D, YYYY [at] HH:mm:ss')}
            className={cn(
              // On phones the time moves under the title, where it does not squeeze it
              'hidden whitespace-nowrap text-xs sm:block',
              isUpcoming ? 'font-medium text-neutral-700' : 'text-neutral-400',
            )}
          >
            {formatWhen(timestamp, isUpcoming)}
          </time>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={open ? 'Hide details' : 'Show details'}
            className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none',
                open && 'rotate-90',
              )}
            />
          </button>
        </div>
      </div>

      {open && (
        <div id={detailsId} className="pb-5 pl-[calc(1rem+2.5rem+1rem)] pr-4 sm:pl-[calc(1.5rem+2.5rem+1rem)] sm:pr-6">
          {details.length > 0 && (
            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
              {details.map(row => (
                <div key={row.label} className="contents">
                  <dt className="text-neutral-500">{row.label}</dt>
                  <dd className="min-w-0 text-neutral-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {eventData && Object.keys(eventData).length > 0 && (
            <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-700">
              <code>{JSON.stringify(eventData, null, 2)}</code>
            </pre>
          )}

          {canPreview && (
            <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => setShowPreview(true)}>
              <Eye className="h-3 w-3" />
              Preview email
            </Button>
          )}

          {details.length === 0 && !eventData && !canPreview && (
            <p className="text-xs text-neutral-500">Nothing more was recorded for this activity.</p>
          )}
        </div>
      )}

      {showPreview && canPreview && (
        <EmailPreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          subject={String(activity.metadata.subject)}
          body={String(activity.metadata.body)}
          from={str(activity.metadata.from)}
          fromName={str(activity.metadata.fromName)}
          replyTo={str(activity.metadata.replyTo)}
          toName={str(activity.metadata.toName)}
          toEmail={activity.contactEmail}
        />
      )}
    </li>
  );
});

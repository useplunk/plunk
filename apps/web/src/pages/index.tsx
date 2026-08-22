import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@plunk/ui';
import type {Activity, ActivityStats, CursorPaginatedResponse} from '@plunk/types';
import {animate, AnimatePresence, motion, useMotionValue, useTransform} from 'framer-motion';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Eye,
  Inbox,
  Mail,
  Minus,
  MousePointerClick,
  Send,
  ShieldCheck,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import useSWR from 'swr';
import {ApiKeyDisplay} from '../components/ApiKeyDisplay';
import {DashboardLayout} from '../components/DashboardLayout';
import {QuickStart} from '../components/QuickStart';
import {SecurityWarningBanner} from '../components/SecurityWarningBanner';
import {useActiveProject} from '../lib/contexts/ActiveProjectProvider';
import {useDashboardStats} from '../lib/hooks/useDashboardStats';
import {useOnboardingPath} from '../lib/hooks/useOnboardingPath';
import {useOnboardingStatus} from '../lib/hooks/useOnboardingStatus';
import {useProjectSetupState} from '../lib/hooks/useProjectSetupState';
import {useProjectSecurity} from '../lib/hooks/useProjectSecurity';
import {useConfig} from '../lib/hooks/useConfig';
import {useUser} from '../lib/hooks/useUser';
import {network} from '../lib/network';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

type TrendDirection = 'up' | 'down' | 'flat' | 'new' | 'none';

interface TrendInfo {
  direction: TrendDirection;
  pct: number;
}

function computeTrend(current: number, previous: number): TrendInfo {
  if (previous === 0 && current === 0) return {direction: 'none', pct: 0};
  if (previous === 0 && current > 0) return {direction: 'new', pct: 0};
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return {direction: 'flat', pct: 0};
  return {direction: pct > 0 ? 'up' : 'down', pct: Math.abs(pct)};
}

function TrendChip({trend, label}: {trend: TrendInfo; label?: string}) {
  if (trend.direction === 'none') {
    return (
      <p className="mt-1 text-xs text-neutral-400 tabular-nums">{label ?? 'No data yet'}</p>
    );
  }

  const config = {
    up: {Icon: ArrowUpRight, color: 'text-emerald-700', bg: 'bg-emerald-50'},
    down: {Icon: ArrowDownRight, color: 'text-red-700', bg: 'bg-red-50'},
    flat: {Icon: Minus, color: 'text-neutral-600', bg: 'bg-neutral-100'},
    new: {Icon: ArrowUpRight, color: 'text-emerald-700', bg: 'bg-emerald-50'},
  }[trend.direction];

  const {Icon, color, bg} = config;
  const text =
    trend.direction === 'new'
      ? 'New'
      : trend.direction === 'flat'
        ? 'No change'
        : `${trend.pct.toFixed(trend.pct >= 100 ? 0 : 1)}%`;

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium tabular-nums ${bg} ${color}`}>
        <Icon className="h-3 w-3" strokeWidth={2.5} />
        {text}
      </span>
      <span className="text-neutral-400">vs previous 30d</span>
    </div>
  );
}

function AnimatedNumber({value, format}: {value: number; format?: (n: number) => string}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, latest =>
    format ? format(Math.round(latest)) : Math.round(latest).toLocaleString(),
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}

interface ActivityVisual {
  icon: React.ComponentType<{className?: string}>;
  tone: 'neutral' | 'green' | 'blue' | 'amber' | 'red';
  label: string;
}

function activityVisual(a: Activity): ActivityVisual {
  switch (a.type) {
    case 'email.sent':
      return {icon: Send, tone: 'neutral', label: 'Sent'};
    case 'email.delivered':
      return {icon: Inbox, tone: 'green', label: 'Delivered'};
    case 'email.opened':
      return {icon: Eye, tone: 'green', label: 'Opened'};
    case 'email.clicked':
      return {icon: MousePointerClick, tone: 'blue', label: 'Clicked'};
    case 'email.bounced':
      return {icon: XCircle, tone: 'red', label: 'Bounced'};
    case 'email.complaint':
      return {icon: AlertCircle, tone: 'red', label: 'Complaint'};
    case 'event.triggered':
      return {icon: Zap, tone: 'amber', label: 'Event'};
    case 'contact.subscribed':
      return {icon: UserPlus, tone: 'green', label: 'Subscribed'};
    case 'contact.unsubscribed':
      return {icon: UserMinus, tone: 'neutral', label: 'Unsubscribed'};
    case 'campaign.sent':
      return {icon: Mail, tone: 'neutral', label: 'Campaign'};
    case 'campaign.scheduled':
      return {icon: Calendar, tone: 'blue', label: 'Scheduled'};
    case 'workflow.started':
    case 'workflow.completed':
    case 'workflow.email.scheduled':
      return {icon: Workflow, tone: 'amber', label: 'Workflow'};
    default:
      return {icon: Zap, tone: 'neutral', label: 'Event'};
  }
}

const TONE_CLASSES: Record<ActivityVisual['tone'], {bg: string; fg: string}> = {
  neutral: {bg: 'bg-neutral-100', fg: 'text-neutral-700'},
  green: {bg: 'bg-emerald-50', fg: 'text-emerald-700'},
  blue: {bg: 'bg-sky-50', fg: 'text-sky-700'},
  amber: {bg: 'bg-amber-50', fg: 'text-amber-700'},
  red: {bg: 'bg-red-50', fg: 'text-red-700'},
};

function activityTitle(a: Activity): string {
  const m = a.metadata;
  // Subscription events store a reserved name (`contact.unsubscribed`) that
  // would read as raw plumbing. Title them by the email they came from, which
  // is the fact this row adds; the state is already on the label beside it.
  if (a.type === 'contact.subscribed' || a.type === 'contact.unsubscribed') {
    if (typeof m.sourceSubject === 'string' && m.sourceSubject) return m.sourceSubject;
    if (typeof m.campaignName === 'string' && m.campaignName) return m.campaignName;
    if (typeof m.workflowName === 'string' && m.workflowName) return m.workflowName;
    return activityVisual(a).label;
  }
  if (typeof m.subject === 'string' && m.subject) return m.subject;
  if (typeof m.eventName === 'string' && m.eventName) return m.eventName;
  if (typeof m.campaignName === 'string' && m.campaignName) return m.campaignName;
  if (typeof m.workflowName === 'string' && m.workflowName) return m.workflowName;
  return activityVisual(a).label;
}

function LivePulse({count}: {count: number}) {
  const isLive = count > 0;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-neutral-300'}`}
        />
      </span>
      <span className="tabular-nums">
        {isLive ? `${count.toLocaleString()} ${count === 1 ? 'event' : 'events'} in the last 5 min` : 'Quiet right now'}
      </span>
    </div>
  );
}

function CompactActivityRow({activity}: {activity: Activity}) {
  const visual = activityVisual(activity);
  const Icon = visual.icon;
  const tone = TONE_CLASSES[visual.tone];
  const title = activityTitle(activity);
  const subtitle = activity.contactEmail;

  return (
    <motion.div
      layout
      initial={{opacity: 0, y: -8}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: 8}}
      transition={{duration: 0.35, ease: [0.22, 1, 0.36, 1]}}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50"
    >
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${tone.bg}`}>
        <Icon className={`h-4 w-4 ${tone.fg}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium text-neutral-900">{title}</p>
          <span className="flex-shrink-0 text-[11px] text-neutral-400">{visual.label}</span>
        </div>
        {subtitle && <p className="truncate text-xs text-neutral-500">{subtitle}</p>}
      </div>
      <span className="flex-shrink-0 tabular-nums text-xs text-neutral-400">
        {relativeTime(new Date(activity.timestamp))}
      </span>
    </motion.div>
  );
}

/**
 * Reason-specific copy for the disabled banner. A card that refused recurring billing is
 * something the owner can act on themselves, so saying so beats sending them to support.
 */
const DISABLED_COPY: Record<string, {detail: string; href: string}> = {
  CARD_VERIFICATION_FAILED: {
    detail:
      'Add a card that supports recurring payments to continue. Yours took the first payment but declined the follow-up charge that confirms monthly billing works, which is common with prepaid, virtual, and single-use cards.',
    href: '/settings?tab=billing',
  },
  PAYMENT_FAILED: {
    detail: 'A recurring payment could not be processed. Update your payment method to re-enable the project.',
    href: '/settings?tab=billing',
  },
};

const DISABLED_COPY_FALLBACK = {
  detail: 'Please contact support for more details and to get your project re-enabled.',
  href: '/settings?tab=security',
};

export default function Index() {
  const {activeProject} = useActiveProject();
  const {totalContacts, totalEmailsSent, totalCampaigns, openRate, isLoading} = useDashboardStats();
  const {setupState, isLoading: isLoadingSetupState} = useProjectSetupState(activeProject?.id);
  const {securityMetrics} = useProjectSecurity(activeProject?.id);
  const {data: config} = useConfig();
  const {data: user} = useUser();
  const onboardingStatus = useOnboardingStatus();
  const {path: onboardingPath} = useOnboardingPath(activeProject?.id);
  const bannerActive = onboardingStatus === 'show' && Boolean(onboardingPath);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string>('');

  // Previous-period stats (60d ago to 30d ago) for trend comparison.
  // Round to UTC day boundary so the URL — and therefore the Redis cache key —
  // is identical for every user on the same UTC day, letting the 5-minute
  // server-side stats cache actually be shared across the user base.
  const previousRangeUrl = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setUTCDate(today.getUTCDate() - 60);
    return `/activity/stats?startDate=${encodeURIComponent(sixtyDaysAgo.toISOString())}&endDate=${encodeURIComponent(thirtyDaysAgo.toISOString())}`;
  }, []);
  const {data: previousStats} = useSWR<ActivityStats>(previousRangeUrl, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });

  const emailsTrend = useMemo(
    () => computeTrend(totalEmailsSent, previousStats?.totalEmailsSent ?? 0),
    [totalEmailsSent, previousStats?.totalEmailsSent],
  );
  const openRateTrend = useMemo(
    () => computeTrend(openRate, previousStats?.openRate ?? 0),
    [openRate, previousStats?.openRate],
  );

  // Live pulse — refresh every 30s. This is the actual real-time signal, so it
  // gets the tightest cadence. Server-side it is backed by a short Redis cache
  // (see Activity controller) so the polling load stays bounded.
  const {data: recentCount} = useSWR<{count: number; minutes: number}>('/activity/recent-count?minutes=5', {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 15_000,
  });

  // Live activity feed — last 10 events, refresh every 60s. Slower than the
  // pulse because the heavier query doesn't need to be tracked second-by-second.
  // Sized to roughly match the Quick Start card's height in the side-by-side layout.
  const {data: recentActivity} = useSWR<CursorPaginatedResponse<Activity>>('/activity?limit=10', {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const greeting = useMemo(() => getGreeting(), []);

  const subtitle = useMemo(() => {
    if (isLoading) return 'Catching up on the last 30 days.';
    if (totalEmailsSent === 0) {
      if (totalContacts === 0) return `${activeProject?.name ?? 'Your project'} is fresh. Time to send the first email.`;
      return `${totalContacts.toLocaleString()} ${totalContacts === 1 ? 'contact' : 'contacts'} ready. Time to send something.`;
    }
    const projectLabel = activeProject?.name ? `${activeProject.name} sent` : 'You sent';
    const base = `${projectLabel} ${totalEmailsSent.toLocaleString()} ${totalEmailsSent === 1 ? 'email' : 'emails'} in the last 30 days.`;
    if (openRate >= 40) return `${base} Open rate is well above average.`;
    if (openRate >= 25) return `${base} Open rate is healthy.`;
    return base;
  }, [isLoading, totalEmailsSent, totalContacts, openRate, activeProject?.name]);

  // Friendly console message for the developer audience. Once per session.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {__plunkHi?: boolean};
    if (w.__plunkHi) return;
    w.__plunkHi = true;
    // eslint-disable-next-line no-console
    console.log(
      '%cPlunk%c  Built for developers who care about email.\nFound a rough edge? support@useplunk.com',
      'font: 600 14px ui-sans-serif, system-ui; color: #0a0a0a; background: #f5f5f5; padding: 2px 8px; border-radius: 4px;',
      'color: #525252; font: 12px ui-sans-serif, system-ui;',
    );
  }, []);

  // totalCampaigns intentionally unused — replaced by Deliverability card below
  void totalCampaigns;

  const stats = [
    {
      name: 'Total contacts',
      value: totalContacts,
      icon: Users,
      format: (n: number) => n.toLocaleString(),
    },
    {
      name: 'Emails sent',
      value: totalEmailsSent,
      icon: Mail,
      format: (n: number) => n.toLocaleString(),
    },
    {
      name: 'Open rate',
      value: openRate,
      icon: TrendingUp,
      format: (n: number) => `${n.toFixed(1)}%`,
    },
  ];

  // Deliverability — prefer 7-day window, fall back to all-time when no 7-day sends
  const sevenDay = securityMetrics?.status.sevenDay;
  const allTime = securityMetrics?.status.allTime;
  const delivWindow = sevenDay && sevenDay.total > 0 ? sevenDay : allTime;
  const delivWindowLabel = sevenDay && sevenDay.total > 0 ? 'Last 7 days' : 'All time';
  const deliveryRate =
    delivWindow && delivWindow.total > 0 ? ((delivWindow.total - delivWindow.bounces) / delivWindow.total) * 100 : 0;
  const bounceRate = delivWindow?.bounceRate ?? 0;
  const complaintRate = delivWindow?.complaintRate ?? 0;
  const hasDelivData = !!delivWindow && delivWindow.total > 0;

  const bounceLevel = securityMetrics?.levels.bounce7Day ?? 'healthy';
  const complaintLevel = securityMetrics?.levels.complaint7Day ?? 'healthy';
  const worstLevel: 'healthy' | 'warning' | 'critical' =
    bounceLevel === 'critical' || complaintLevel === 'critical'
      ? 'critical'
      : bounceLevel === 'warning' || complaintLevel === 'warning'
        ? 'warning'
        : 'healthy';
  const healthLabel = !hasDelivData ? 'No data yet' : worstLevel === 'healthy' ? 'Healthy' : worstLevel === 'warning' ? 'Watch' : 'Critical';
  const healthDot =
    !hasDelivData ? 'bg-neutral-300' : worstLevel === 'healthy' ? 'bg-emerald-500' : worstLevel === 'warning' ? 'bg-amber-500' : 'bg-red-500';
  const healthText =
    !hasDelivData ? 'text-neutral-500' : worstLevel === 'healthy' ? 'text-emerald-700' : worstLevel === 'warning' ? 'text-amber-700' : 'text-red-700';

  async function handleResendVerification() {
    setIsResending(true);
    setResendMessage('');
    try {
      const response = await network.fetch<{success: boolean}>('POST', '/auth/request-verification');

      if (response.success) {
        setResendMessage('Verification email sent! Please check your inbox.');
      } else {
        setResendMessage('Couldn’t send the verification email. Try again in a moment.');
      }
    } catch {
      setResendMessage('Couldn’t send the verification email. Try again in a moment.');
    } finally {
      setIsResending(false);
    }
  }

  const recentItems = recentActivity?.data ?? [];
  const liveCount = recentCount?.count ?? 0;

  return (
    <>
      <NextSeo title="Dashboard" />
      <DashboardLayout>
        <div className="space-y-8">
          {/* Project Disabled Banner */}
          {activeProject && activeProject.disabled && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Project Disabled - Read-Only Mode</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium">
                    This project has been disabled and is now in read-only mode. You can view your data but cannot
                    create, update, or delete anything.
                  </p>
                  <p className="text-xs text-red-800 mt-2">
                    {(activeProject.disabledReason && DISABLED_COPY[activeProject.disabledReason]?.detail) ??
                      DISABLED_COPY_FALLBACK.detail}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto flex-shrink-0">
                  <Link
                    href={
                      (activeProject.disabledReason && DISABLED_COPY[activeProject.disabledReason]?.href) ??
                      DISABLED_COPY_FALLBACK.href
                    }
                  >
                    View details
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Email Verification Banner */}
          {user && user.type === 'PASSWORD' && !user.emailVerified && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verify your email address</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm">
                  Please verify your email address to unlock all features. Check your inbox for the verification link.
                </span>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={handleResendVerification}
                    disabled={isResending}
                  >
                    {isResending ? 'Sending…' : 'Resend verification email'}
                  </Button>
                  {resendMessage && (
                    <p className={`text-xs ${resendMessage.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>
                      {resendMessage}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Security Warning Banner */}
          {activeProject && !activeProject.disabled && securityMetrics && (
            <SecurityWarningBanner status={securityMetrics.status} />
          )}

          {/* Subscription Warning Banner */}
          {activeProject &&
            !activeProject.disabled &&
            !activeProject.subscription &&
            config?.features.billing.enabled && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upgrade to remove Plunk branding</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-sm">
                    Your emails currently include Plunk branding. Upgrade to a subscription to remove it.
                  </span>
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href="/settings?tab=billing">Upgrade now</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

          {/* Header */}
          <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">{greeting}</h1>
              <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>
            </div>
            <LivePulse count={liveCount} />
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const isEmails = stat.name === 'Emails sent';
              const isOpenRate = stat.name === 'Open rate';
              return (
                <motion.div
                  key={stat.name}
                  initial={{opacity: 0, y: 12}}
                  animate={{opacity: 1, y: 0}}
                  transition={{
                    duration: 0.5,
                    delay: 0.05 + index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{y: -2}}
                  className="group"
                >
                  <Card className="relative overflow-hidden h-full transition-colors duration-200 hover:border-neutral-300">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardDescription>{stat.name}</CardDescription>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-50 border border-neutral-200/60 transition-colors duration-200 group-hover:bg-neutral-900 group-hover:border-neutral-900">
                          <Icon className="h-3.5 w-3.5 text-neutral-500 transition-colors duration-200 group-hover:text-white" />
                        </div>
                      </div>
                      <CardTitle className="text-2xl tabular-nums">
                        {isLoading ? (
                          <Skeleton className="h-7 w-16" />
                        ) : (
                          <AnimatedNumber value={stat.value} format={stat.format} />
                        )}
                      </CardTitle>
                      {isEmails && !isLoading && previousStats && <TrendChip trend={emailsTrend} />}
                      {isOpenRate && !isLoading && previousStats && <TrendChip trend={openRateTrend} />}
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}

            {/* Deliverability health */}
            <motion.div
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.5, delay: 0.05 + stats.length * 0.06, ease: [0.22, 1, 0.36, 1]}}
              whileHover={{y: -2}}
              className="group"
            >
              <Card className="relative overflow-hidden h-full transition-colors duration-200 hover:border-neutral-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardDescription>Deliverability</CardDescription>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 border border-neutral-200/60 px-2 py-0.5">
                      <span className="relative flex h-1.5 w-1.5">
                        {hasDelivData && worstLevel === 'healthy' && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        )}
                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${healthDot}`} />
                      </span>
                      <span className={`text-[11px] font-medium ${healthText}`}>{healthLabel}</span>
                    </div>
                  </div>
                  <CardTitle className="text-2xl tabular-nums">
                    {!securityMetrics ? (
                      <Skeleton className="h-7 w-20" />
                    ) : hasDelivData ? (
                      <AnimatedNumber value={deliveryRate} format={n => `${n.toFixed(1)}%`} />
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </CardTitle>
                  <p className="mt-1 text-xs text-neutral-500">
                    {hasDelivData ? 'delivered' : 'No emails sent yet'}
                    {hasDelivData && <span className="text-neutral-400"> · {delivWindowLabel}</span>}
                  </p>
                </CardHeader>
                {hasDelivData && (
                  <div className="px-6 pb-4 -mt-1">
                    <div className="flex items-center gap-4 text-[11px] text-neutral-500 tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 text-neutral-400" />
                        Bounce <span className="font-medium text-neutral-700">{bounceRate.toFixed(2)}%</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 text-neutral-400" />
                        Complaint <span className="font-medium text-neutral-700">{complaintRate.toFixed(3)}%</span>
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Quick Start + Recent Activity — 50/50 working area with a fixed
              row height so the layout doesn't reflow as Quick Start steps are
              completed. Both cards scroll internally. */}
          <div className={`grid grid-cols-1 gap-6 ${bannerActive ? '' : 'lg:grid-cols-2 lg:h-[480px]'}`}>
            {!bannerActive && <QuickStart setupState={setupState} isLoading={isLoadingSetupState} />}

            <div className={!bannerActive ? 'lg:relative' : ''}>
              <Card
                className={`flex flex-col h-full ${
                  !bannerActive ? 'lg:absolute lg:inset-0' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent activity</CardTitle>
                      <CardDescription>Live feed of what’s happening across your project</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/activity">View all</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto">
                  {!recentActivity ? (
                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                        <div key={i} className="flex items-center gap-3 px-2 py-2">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-2/5" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <Skeleton className="h-3 w-12" />
                        </div>
                      ))}
                    </div>
                  ) : recentItems.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                        <Inbox className="h-5 w-5 text-neutral-400" />
                      </div>
                      <p className="text-sm font-medium text-neutral-700">Nothing has happened yet</p>
                      <p className="text-xs text-neutral-500 max-w-xs">
                        Send your first email or trigger an event and you’ll see it land here in real time.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <AnimatePresence initial={false}>
                        {recentItems.map(activity => (
                          <CompactActivityRow key={activity.id} activity={activity} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* API Keys — full-width slim band with the two keys side-by-side */}
          <Card>
            <CardHeader>
              <CardTitle>API keys</CardTitle>
              <CardDescription>Use these keys to integrate with Plunk</CardDescription>
            </CardHeader>
            <CardContent>
              {activeProject ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                  <ApiKeyDisplay
                    label="Public key"
                    value={activeProject.public}
                    description="Use this key for client-side integrations"
                  />
                  <ApiKeyDisplay
                    label="Secret key"
                    value={activeProject.secret}
                    description="Keep this key secure and never expose it publicly"
                    isSecret
                  />
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No project selected</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}

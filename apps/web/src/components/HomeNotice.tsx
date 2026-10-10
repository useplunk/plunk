import {Button} from '@plunk/ui';
import type {ProjectSecurityMetrics, SecurityLevel} from '@plunk/types';
import {AlertTriangle, Ban, MailCheck, Sparkles} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {toast} from 'sonner';
import {network} from '../lib/network';

type Tone = 'critical' | 'warning' | 'neutral';

interface Notice {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  body: string;
  /** Secondary line, for context that matters less than the fix. */
  note?: string;
  action: ReactNode;
}

const TONE_STYLES: Record<Tone, {container: string; icon: string; body: string; note: string}> = {
  // Tone lives in the icon tile; the card itself stays white so the notice sits with the
  // rest of the dashboard instead of shouting over it. Only a paused project gets a tint.
  critical: {
    container: 'border-red-100 bg-red-50/40',
    icon: 'bg-red-100/70 text-red-600',
    body: 'text-neutral-600',
    note: 'text-neutral-500',
  },
  warning: {
    container: 'border-neutral-200 bg-white',
    icon: 'bg-amber-50 text-amber-600',
    body: 'text-neutral-600',
    note: 'text-neutral-500',
  },
  neutral: {
    container: 'border-neutral-200 bg-white',
    icon: 'bg-neutral-100 text-neutral-600',
    body: 'text-neutral-500',
    note: 'text-neutral-400',
  },
};

/**
 * Reason-specific copy for a disabled project. The body names the fix, and the button names
 * the action, so the owner doesn't have to open a settings page to learn what went wrong.
 */
const DISABLED_COPY: Record<string, {body: string; action: string; href: string}> = {
  CARD_VERIFICATION_FAILED: {
    body: 'Your card took the first payment but declined the recurring charge. This is common with prepaid, virtual and single-use cards. Add a card that supports monthly billing to resume.',
    action: 'Update card',
    href: '/settings?tab=billing',
  },
  PAYMENT_FAILED: {
    body: 'Your last payment didn’t go through. Update your payment method to resume sending.',
    action: 'Update payment method',
    href: '/settings?tab=billing',
  },
  EMAIL_REPUTATION: {
    body: 'Your bounce or complaint rate got too high. Clean your contact list, then contact support to re-enable sending.',
    action: 'Review deliverability',
    href: '/settings?tab=security',
  },
  PHISHING_DETECTED: {
    body: 'A recent email was flagged as possible phishing. Contact support to review it and re-enable sending.',
    action: 'View details',
    href: '/settings?tab=security',
  },
};

const DISABLED_FALLBACK = {
  body: 'Contact support to find out why and to re-enable sending.',
  action: 'View details',
  href: '/settings?tab=security',
};

const LEVEL_RANK: Record<SecurityLevel, number> = {healthy: 0, warning: 1, critical: 2};

type Metric = 'bounce' | 'complaint';

/**
 * Picks the metric to headline: the worst level wins, and the 7-day window beats all-time on a
 * tie because it's the one the owner can still move. Returns null when no rate is elevated,
 * which happens when enforcement tripped on the (deliberately undisclosed) new-project ceilings.
 */
function worstMetric(metrics: ProjectSecurityMetrics) {
  const {levels, status} = metrics;
  const candidates = [
    {metric: 'bounce' as Metric, level: levels.bounce7Day, rate: status.sevenDay.bounceRate, window: 'over the last 7 days'},
    {metric: 'complaint' as Metric, level: levels.complaint7Day, rate: status.sevenDay.complaintRate, window: 'over the last 7 days'},
    {metric: 'bounce' as Metric, level: levels.bounceAllTime, rate: status.allTime.bounceRate, window: 'across all your sends'},
    {metric: 'complaint' as Metric, level: levels.complaintAllTime, rate: status.allTime.complaintRate, window: 'across all your sends'},
  ];
  const worst = candidates.reduce((best, c) => (LEVEL_RANK[c.level] > LEVEL_RANK[best.level] ? c : best));
  return worst.level === 'healthy' ? null : worst;
}

const METRIC_ADVICE: Record<Metric, string> = {
  bounce: 'Remove invalid and inactive addresses before your next send.',
  complaint: 'Only email contacts who opted in, and make unsubscribing easy.',
};

function securityNotice(metrics: ProjectSecurityMetrics): Notice | null {
  // Violations and warnings are what enforcement acts on; levels only tell us which rate to name.
  const isCritical = metrics.status.violations.length > 0;
  if (!isCritical && metrics.status.warnings.length === 0) return null;

  const worst = worstMetric(metrics);
  const consequence = isCritical ? 'Sending may be paused if it stays this high.' : 'It’s above what we consider healthy.';

  return {
    tone: isCritical ? 'critical' : 'warning',
    icon: AlertTriangle,
    title: worst
      ? `${worst.metric === 'bounce' ? 'Bounce' : 'Complaint'} rate is ${worst.rate.toFixed(worst.metric === 'bounce' ? 2 : 3)}%`
      : 'Unusually many bounces or complaints',
    body: worst
      ? `That’s ${worst.window}. ${consequence} ${METRIC_ADVICE[worst.metric]}`
      : `${isCritical ? 'Sending may be paused if this continues.' : 'Keep an eye on it.'} Check that your contacts opted in and that their addresses are valid.`,
    action: (
      <Button asChild size="sm" variant="outline">
        <Link href="/settings?tab=security">Review deliverability</Link>
      </Button>
    ),
  };
}

function disabledNotice(reason: string | null | undefined): Notice {
  const copy = (reason && DISABLED_COPY[reason]) || DISABLED_FALLBACK;
  return {
    tone: 'critical',
    icon: Ban,
    title: 'Sending is paused for this project',
    body: copy.body,
    note: 'You can still view your data, but nothing can be created, changed or sent.',
    action: (
      <Button asChild size="sm" variant="outline">
        <Link href={copy.href}>{copy.action}</Link>
      </Button>
    ),
  };
}

/** Takes the resend button as the action, since it owns request state. */
function verifyEmailNotice(action: ReactNode): Notice {
  return {
    tone: 'warning',
    icon: MailCheck,
    title: 'Verify your email address',
    body: 'Click the link we sent to your inbox to unlock all features.',
    action,
  };
}

const UPSELL_NOTICE: Notice = {
  tone: 'neutral',
  icon: Sparkles,
  title: 'Send emails without Plunk branding',
  body: 'Emails on the free plan include a “Powered by Plunk” badge. Upgrade to remove it.',
  action: (
    <Button asChild size="sm">
      <Link href="/settings?tab=billing">Upgrade</Link>
    </Button>
  ),
};

interface HomeNoticeProps {
  project: {disabled: boolean; disabledReason?: string | null; subscription?: string | null} | null | undefined;
  securityMetrics: ProjectSecurityMetrics | undefined;
  emailVerificationRequired: boolean;
  billingEnabled: boolean;
}

/**
 * The single notice shown above the dashboard. Only the most pressing one renders, so a
 * paused project never competes with an upsell and the owner gets one clear next step:
 * disabled → critical rates → unverified email → elevated rates → branding upsell.
 */
export function HomeNotice({project, securityMetrics, emailVerificationRequired, billingEnabled}: HomeNoticeProps) {
  const [isResending, setIsResending] = useState(false);

  async function handleResendVerification() {
    setIsResending(true);
    try {
      const response = await network.fetch<{success: boolean}>('POST', '/auth/request-verification');
      if (response.success) {
        toast.success('Verification email sent. Check your inbox.');
      } else {
        toast.error('Couldn’t send the verification email. Try again in a moment.');
      }
    } catch {
      toast.error('Couldn’t send the verification email. Try again in a moment.');
    } finally {
      setIsResending(false);
    }
  }

  if (!project) return null;

  const security = securityMetrics ? securityNotice(securityMetrics) : null;

  let notice: Notice | null = null;
  if (project.disabled) {
    notice = disabledNotice(project.disabledReason);
  } else if (security?.tone === 'critical') {
    notice = security;
  } else if (emailVerificationRequired) {
    notice = verifyEmailNotice(
      <Button size="sm" variant="outline" onClick={handleResendVerification} disabled={isResending}>
        {isResending ? 'Sending…' : 'Resend email'}
      </Button>,
    );
  } else if (security) {
    notice = security;
  } else if (!project.subscription && billingEnabled) {
    notice = UPSELL_NOTICE;
  }

  if (!notice) return null;

  return <NoticeCard notice={notice} />;
}

function NoticeCard({notice}: {notice: Notice}) {
  const styles = TONE_STYLES[notice.tone];
  const Icon = notice.icon;

  return (
    <div
      role={notice.tone === 'neutral' ? 'status' : 'alert'}
      className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 ${styles.container}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${styles.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-neutral-900">{notice.title}</p>
          <p className={`text-sm ${styles.body}`}>{notice.body}</p>
          {notice.note && <p className={`text-xs ${styles.note}`}>{notice.note}</p>}
        </div>
      </div>
      <div className="flex-shrink-0 pl-11 sm:pl-0">{notice.action}</div>
    </div>
  );
}

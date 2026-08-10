import {Alert, AlertDescription, AlertTitle, Button} from '@plunk/ui';
import {AlertTriangle} from 'lucide-react';
import Link from 'next/link';
import type {SecurityStatus} from '@plunk/types';

interface SecurityWarningBannerProps {
  status: SecurityStatus;
}

export function SecurityWarningBanner({status}: SecurityWarningBannerProps) {
  const hasCriticalViolations = status.violations.length > 0;
  const hasWarnings = status.warnings.length > 0;

  if (!hasCriticalViolations && !hasWarnings) {
    return null;
  }

  const variant = hasCriticalViolations ? 'destructive' : 'warning';
  const title = hasCriticalViolations
    ? 'Critical - Immediate Action Required'
    : 'Warning - Action Recommended';
  const messageColor = hasCriticalViolations ? 'text-red-800' : 'text-amber-800';

  return (
    <Alert variant={variant}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-2 flex-1">
          <p className={`text-sm ${messageColor}`}>
            {hasCriticalViolations
              ? 'Your account requires immediate attention. Review your sending practices to avoid suspension. Contact support for more details.'
              : 'Your account health needs attention. Review your contact lists and sending practices to maintain good standing.'}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full sm:w-auto flex-shrink-0">
          <Link href="/settings?tab=security">View details</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

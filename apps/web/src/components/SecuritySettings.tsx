import {Alert, AlertDescription, AlertTitle, Card, CardContent, CardDescription, CardHeader, CardTitle} from '@plunk/ui';
import {AlertCircle, AlertTriangle, CheckCircle, Shield} from 'lucide-react';
import type {ProjectSecurityMetrics, SecurityLevel} from '@plunk/types';

interface SecuritySettingsProps {
  metrics: ProjectSecurityMetrics;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<SecurityLevel, {color: string; icon: typeof CheckCircle; bg: string; label: string}> = {
  healthy: {color: 'text-green-600', icon: CheckCircle, bg: 'bg-green-100', label: 'Healthy'},
  warning: {color: 'text-amber-700', icon: AlertTriangle, bg: 'bg-amber-100', label: 'Warning'},
  critical: {color: 'text-red-600', icon: AlertCircle, bg: 'bg-red-100', label: 'Critical'},
};

function getOverallLevel(status: ProjectSecurityMetrics['status']): SecurityLevel {
  if (status.violations.length > 0) return 'critical';
  if (status.warnings.length > 0) return 'warning';
  return 'healthy';
}

export function SecuritySettings({metrics, isLoading}: SecuritySettingsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security overview</CardTitle>
          <CardDescription>Monitor your project&apos;s email health and reputation</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">Loading security metrics...</p>
        </CardContent>
      </Card>
    );
  }

  const {status, levels, isDisabled} = metrics;
  const overallLevel = getOverallLevel(status);
  const overallConfig = STATUS_CONFIG[overallLevel];

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${overallConfig.bg}`}>
              <Shield className={`h-5 w-5 ${overallConfig.color}`} />
            </div>
            <div>
              <CardTitle>Security overview</CardTitle>
              <CardDescription>
                {overallLevel === 'healthy' && 'Your project is in good standing'}
                {overallLevel === 'warning' && 'Your email health needs attention'}
                {overallLevel === 'critical' && 'Action required to maintain project health'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isDisabled && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Project disabled</AlertTitle>
              <AlertDescription>
                This project has been disabled. Please contact support for more details.
              </AlertDescription>
            </Alert>
          )}

          {overallLevel === 'critical' && !isDisabled && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Critical</AlertTitle>
              <AlertDescription>
                Your account requires immediate attention. Please contact support or review your sending practices to
                avoid suspension.
              </AlertDescription>
            </Alert>
          )}

          {overallLevel === 'warning' && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Your account health needs attention. Review your contact lists and sending practices to maintain good
                standing.
              </AlertDescription>
            </Alert>
          )}

          {overallLevel === 'healthy' && !isDisabled && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Bounce and complaint rates are within limits.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Bounce Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Bounce rate</CardTitle>
          <CardDescription>Hard bounces indicate invalid or non-existent email addresses</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-100">
            <HealthMetric
              label="Last 7 days"
              level={levels.bounce7Day}
              detail={`${status.sevenDay.bounceRate.toFixed(2)}% bounce rate (${status.sevenDay.bounces.toLocaleString()} of ${status.sevenDay.total.toLocaleString()} emails)`}
            />
            <HealthMetric
              label="All time"
              level={levels.bounceAllTime}
              detail={`${status.allTime.bounceRate.toFixed(2)}% bounce rate (${status.allTime.bounces.toLocaleString()} of ${status.allTime.total.toLocaleString()} emails)`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Complaint Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Complaint rate</CardTitle>
          <CardDescription>Complaints occur when recipients mark emails as spam</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-100">
            <HealthMetric
              label="Last 7 days"
              level={levels.complaint7Day}
              detail={`${status.sevenDay.complaintRate.toFixed(3)}% complaint rate (${status.sevenDay.complaints.toLocaleString()} of ${status.sevenDay.total.toLocaleString()} emails)`}
            />
            <HealthMetric
              label="All time"
              level={levels.complaintAllTime}
              detail={`${status.allTime.complaintRate.toFixed(3)}% complaint rate (${status.allTime.complaints.toLocaleString()} of ${status.allTime.total.toLocaleString()} emails)`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface HealthMetricProps {
  label: string;
  level: SecurityLevel;
  detail: string;
}

function HealthMetric({label, level, detail}: HealthMetricProps) {
  const config = STATUS_CONFIG[level];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <h3 className="font-medium text-neutral-900">{label}</h3>
        <p className="text-sm text-neutral-600 mt-0.5">{detail}</p>
      </div>
      <div className={`flex items-center gap-2 ${config.color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    </div>
  );
}

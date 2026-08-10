import {Alert, Card, CardContent, CardDescription, CardHeader, CardTitle, IconSpinner} from '@plunk/ui';
import {AlertCircle, Coins, TrendingUp} from 'lucide-react';
import {useBillingConsumption} from '../lib/hooks/useBillingConsumption';
import {useConfig} from '../lib/hooks/useConfig';
import {useCallback} from 'react';

interface BillingConsumptionProps {
  projectId: string;
  hasSubscription: boolean;
}

/** One header for every state, so the title is written once rather than four times. */
function UsageCard({period, children}: {period?: string; children: React.ReactNode}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage this month</CardTitle>
        {period && <CardDescription>Billing period: {period}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function BillingConsumption({projectId, hasSubscription}: BillingConsumptionProps) {
  const {data: config} = useConfig();
  const billingEnabled = config?.features.billing.enabled ?? false;

  // Always call the hook to satisfy Rules of Hooks
  const {consumptionData, isLoading, error} = useBillingConsumption(projectId, hasSubscription && billingEnabled);

  // Define callbacks BEFORE any conditional returns (Rules of Hooks)
  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  if (!billingEnabled) {
    // If billing is globally disabled, hide the card entirely
    return null;
  }

  if (!hasSubscription) {
    return (
      <UsageCard>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm">Usage tracking starts when you start a subscription.</p>
          </div>
        </Alert>
      </UsageCard>
    );
  }

  if (isLoading) {
    return (
      <UsageCard>
        <div className="flex items-center justify-center py-4">
          <IconSpinner size="sm" />
        </div>
      </UsageCard>
    );
  }

  if (error) {
    return (
      <UsageCard>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm">Couldn’t load usage data. Try again in a moment.</p>
          </div>
        </Alert>
      </UsageCard>
    );
  }

  if (!consumptionData) {
    return null;
  }

  return (
    <UsageCard
      period={`${formatDate(consumptionData.period.start)} – ${formatDate(consumptionData.period.end)}`}
    >
        <div className="space-y-6">
          {/* Total Usage */}
          <div className="border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total emails sent</p>
                <p className="text-3xl font-bold text-neutral-900">{consumptionData.usage.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Account Credits */}
          {consumptionData.credits && consumptionData.credits.hasCredits && (
            <div className="border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-neutral-100 rounded-lg">
                  <Coins className="h-5 w-5 text-neutral-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Account credits</p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {formatCurrency(consumptionData.credits.creditAmount, consumptionData.credits.currency)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Credits will be automatically applied to your upcoming invoices
              </p>
            </div>
          )}

          {/* Upcoming Invoice */}
          {consumptionData.upcomingInvoice && (
            <div className="border border-neutral-200 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Upcoming invoice</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Billing period</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {formatDate(consumptionData.upcomingInvoice.periodStart)} -{' '}
                    {formatDate(consumptionData.upcomingInvoice.periodEnd)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Subtotal</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {formatCurrency(consumptionData.upcomingInvoice.subtotal, consumptionData.upcomingInvoice.currency)}
                  </span>
                </div>
                {consumptionData.credits && consumptionData.credits.hasCredits && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Credits applied</span>
                    <span className="text-sm font-medium text-green-600">
                      -{formatCurrency(consumptionData.credits.creditAmount, consumptionData.credits.currency)}
                    </span>
                  </div>
                )}
                <div className="border-t border-neutral-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-neutral-900">Amount due</span>
                    <span className="text-base font-bold text-neutral-900">
                      {formatCurrency(
                        consumptionData.upcomingInvoice.amountDue,
                        consumptionData.upcomingInvoice.currency,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No upcoming invoice message */}
          {!consumptionData.upcomingInvoice && consumptionData.usage.total === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm">No usage recorded yet for this billing period.</p>
              </div>
            </Alert>
          )}
        </div>
    </UsageCard>
  );
}

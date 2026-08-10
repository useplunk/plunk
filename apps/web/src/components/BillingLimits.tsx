import {memo, useEffect, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {BillingLimitSchemas} from '@plunk/shared';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  IconSpinner,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Progress,
} from '@plunk/ui';
import {AlertCircle, AlertTriangle, Check} from 'lucide-react';
import {AnimatePresence, motion} from 'framer-motion';
import type {z} from 'zod';
import {type BillingLimitsData, type CategoryLimit, useBillingLimits} from '../lib/hooks/useBillingLimits';
import {network} from '../lib/network';

// Price per email in the smallest currency unit (e.g., cents for USD/EUR)
const PRICE_PER_EMAIL = 0.1; // 0.001 USD/EUR = 0.1 cents

/**
 * Calculate the monetary cost for a given number of emails
 * @param emailCount - Number of emails
 * @param currency - Currency code (e.g., 'usd', 'eur')
 * @returns Formatted currency string
 */
const formatEmailCost = (emailCount: number, currency: string | null): string => {
  if (!currency) {
    return '';
  }

  // Calculate cost in smallest currency unit (cents)
  const costInCents = emailCount * PRICE_PER_EMAIL;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(costInCents / 100);
  } catch {
    // Fallback if currency is invalid
    return `${(costInCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
};

interface BillingLimitsProps {
  projectId: string;
  tier: 'free' | 'paid';
  billingEnabled: boolean;
}

type LimitsFormValues = z.infer<typeof BillingLimitSchemas.update>;

export function BillingLimits({projectId, tier, billingEnabled}: BillingLimitsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch billing limits using SWR (fetch for both free and paid tiers when billing is enabled)
  const {limitsData, isLoading, mutate} = useBillingLimits(projectId, billingEnabled);

  const form = useForm<LimitsFormValues>({
    resolver: zodResolver(BillingLimitSchemas.update),
    defaultValues: {
      workflows: null,
      campaigns: null,
      transactional: null,
      inbound: null,
    },
  });

  // Update form when limits data changes
  useEffect(() => {
    if (limitsData) {
      form.reset({
        workflows: limitsData.workflows.limit,
        campaigns: limitsData.campaigns.limit,
        transactional: limitsData.transactional.limit,
        inbound: limitsData.inbound.limit,
      });
    }
  }, [limitsData, form]);

  const onSubmit = async (values: LimitsFormValues) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      await network.fetch<BillingLimitsData, typeof BillingLimitSchemas.update>(
        'PUT',
        `/users/@me/projects/${projectId}/billing-limits`,
        values,
      );

      // Revalidate SWR cache
      await mutate();
      setIsEditing(false);
      setSuccessMessage('Billing limits updated');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Couldn’t save your billing limits. Try again.');
    }
  };

  const handleCancel = () => {
    if (limitsData) {
      form.reset({
        workflows: limitsData.workflows.limit,
        campaigns: limitsData.campaigns.limit,
        transactional: limitsData.transactional.limit,
        inbound: limitsData.inbound.limit,
      });
    }
    setIsEditing(false);
    setErrorMessage(null);
  };

  // Free tier projects can view their usage but can't edit limits
  const canEditLimits = tier === 'paid';

  // If billing is not enabled, don't show the component
  if (!billingEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing limits</CardTitle>
          <CardDescription>Set monthly limits for each email category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <IconSpinner size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing limits</CardTitle>
        <CardDescription>
          {tier === 'paid'
            ? 'Set monthly limits for each email category. Limits reset on the 1st of each month.'
            : 'Free tier projects have a total limit of 1,000 emails per month across all categories.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Free tier info banner */}
          {tier !== 'paid' && limitsData && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm">
                  You&apos;re on the free tier with 1,000 emails per month. Upgrade to a paid subscription for unlimited
                  emails or custom limits.
                </p>
              </div>
            </Alert>
          )}

          {/* Success/Error Messages */}
          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div
                initial={{opacity: 0, y: -10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0}}
                className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
              >
                {successMessage}
              </motion.div>
            )}
            {errorMessage && (
              <motion.div
                initial={{opacity: 0, y: -10}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0}}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Usage Display (when not editing) */}
          {!isEditing && limitsData && (
            <div className="space-y-4">
              {/* For free tier, show total usage across all categories */}
              {tier !== 'paid' ? (
                <UsageDisplay
                  category="Total Emails (All Categories)"
                  usage={limitsData.workflows}
                  currency={limitsData.currency}
                />
              ) : (
                <>
                  <UsageDisplay category="Workflows" usage={limitsData.workflows} currency={limitsData.currency} />
                  <UsageDisplay category="Campaigns" usage={limitsData.campaigns} currency={limitsData.currency} />
                  <UsageDisplay
                    category="Transactional"
                    usage={limitsData.transactional}
                    currency={limitsData.currency}
                  />
                  <UsageDisplay category="Inbound" usage={limitsData.inbound} currency={limitsData.currency} />
                </>
              )}

              {canEditLimits && (
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setIsEditing(true)}>Edit limits</Button>
                </div>
              )}
            </div>
          )}

          {/* Edit Form */}
          {isEditing && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="workflows"
                  render={({field}) => {
                    const estimatedCost =
                      limitsData?.currency && field.value
                        ? formatEmailCost(Number(field.value), limitsData.currency)
                        : null;
                    return (
                      <FormItem>
                        <FormLabel>Workflow emails limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum workflow emails per month. Leave empty for unlimited.
                          {estimatedCost && <span className="text-neutral-500"> ≈ {estimatedCost}/month</span>}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="campaigns"
                  render={({field}) => {
                    const estimatedCost =
                      limitsData?.currency && field.value
                        ? formatEmailCost(Number(field.value), limitsData.currency)
                        : null;
                    return (
                      <FormItem>
                        <FormLabel>Campaign emails limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum campaign emails per month. Leave empty for unlimited.
                          {estimatedCost && <span className="text-neutral-500"> ≈ {estimatedCost}/month</span>}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="transactional"
                  render={({field}) => {
                    const estimatedCost =
                      limitsData?.currency && field.value
                        ? formatEmailCost(Number(field.value), limitsData.currency)
                        : null;
                    return (
                      <FormItem>
                        <FormLabel>Transactional emails limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum transactional emails per month. Leave empty for unlimited.
                          {estimatedCost && <span className="text-neutral-500"> ≈ {estimatedCost}/month</span>}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="inbound"
                  render={({field}) => {
                    const estimatedCost =
                      limitsData?.currency && field.value
                        ? formatEmailCost(Number(field.value), limitsData.currency)
                        : null;
                    return (
                      <FormItem>
                        <FormLabel>Inbound emails limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum inbound emails per month. Leave empty for unlimited.
                          {estimatedCost && <span className="text-neutral-500"> ≈ {estimatedCost}/month</span>}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface UsageDisplayProps {
  category: string;
  usage: CategoryLimit;
  currency: string | null;
}

const UsageDisplay = memo(function UsageDisplay({category, usage, currency}: UsageDisplayProps) {
  const statusColor = useMemo(() => {
    if (usage.isBlocked) return 'text-red-700';
    if (usage.isWarning) return 'text-amber-700';
    return 'text-neutral-600';
  }, [usage.isBlocked, usage.isWarning]);

  const progressColor = useMemo(() => {
    if (usage.isBlocked) return 'bg-red-600';
    if (usage.isWarning) return 'bg-amber-500';
    return 'bg-neutral-900';
  }, [usage.isBlocked, usage.isWarning]);

  const statusIcon = useMemo(() => {
    if (usage.isBlocked) return <AlertCircle className="h-4 w-4" />;
    if (usage.isWarning) return <AlertTriangle className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  }, [usage.isBlocked, usage.isWarning]);

  const limitText = usage.limit === null ? 'Unlimited' : usage.limit.toLocaleString();

  // Calculate monetary values
  const usageCost = currency ? formatEmailCost(usage.usage, currency) : null;
  const limitCost = currency && usage.limit !== null ? formatEmailCost(usage.limit, currency) : null;

  return (
    <div className="border border-neutral-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-neutral-900">{category}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-sm text-neutral-600">
              {usage.usage.toLocaleString()} / {limitText} emails
            </p>
            {currency && (
              <>
                <span className="text-neutral-300">•</span>
                <p className="text-sm text-neutral-500">
                  {usageCost}
                  {limitCost && ` / ${limitCost}`}
                </p>
              </>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-2 ${statusColor}`}>
          {statusIcon}
          <span className="text-sm font-medium">
            {usage.limit === null ? 'Unlimited' : `${Math.round(usage.percentage)}%`}
          </span>
        </div>
      </div>

      {usage.limit !== null && (
        <>
          <Progress value={Math.min(usage.percentage, 100)} className="h-2" indicatorClassName={progressColor} />

          {usage.isBlocked && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm">
                  <strong>Limit reached:</strong> No more {category.toLowerCase()} emails can be sent this month.
                </p>
              </div>
            </Alert>
          )}

          {usage.isWarning && !usage.isBlocked && (
            <Alert variant="warning" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm">
                  <strong>Warning:</strong> You&apos;ve used {Math.round(usage.percentage)}% of your{' '}
                  {category.toLowerCase()} email limit.
                </p>
              </div>
            </Alert>
          )}
        </>
      )}
    </div>
  );
});

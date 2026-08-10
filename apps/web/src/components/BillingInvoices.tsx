import {Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, IconSpinner} from '@plunk/ui';
import {AlertCircle, Download, ExternalLink, FileText} from 'lucide-react';
import {useBillingInvoices} from '../lib/hooks/useBillingInvoices';

interface BillingInvoicesProps {
  projectId: string;
  hasSubscription: boolean;
  onManageBilling?: () => void;
}

/** One header for every state, so the title is written once rather than four times. */
function InvoicesCard({children}: {children: React.ReactNode}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function BillingInvoices({projectId, hasSubscription, onManageBilling}: BillingInvoicesProps) {
  const {invoicesData, isLoading, error} = useBillingInvoices(projectId, hasSubscription);

  if (!hasSubscription) {
    return (
      <InvoicesCard>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm">Invoices appear here once you start a subscription.</p>
          </div>
        </Alert>
      </InvoicesCard>
    );
  }

  if (isLoading) {
    return (
      <InvoicesCard>
        <div className="flex items-center justify-center py-4">
          <IconSpinner size="sm" />
        </div>
      </InvoicesCard>
    );
  }

  if (error) {
    return (
      <InvoicesCard>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <p className="text-sm">Couldn’t load your invoices. Try again in a moment.</p>
          </div>
        </Alert>
      </InvoicesCard>
    );
  }

  if (!invoicesData) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string, paid: boolean) => {
    // Stripe invoices have status 'paid' when paid, or paid boolean is true
    if (paid || status === 'paid') {
      return <Badge variant="success">Paid</Badge>;
    }

    switch (status) {
      case 'open':
        return <Badge variant="warning">Unpaid</Badge>;
      case 'draft':
        return <Badge variant="neutral">Draft</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive">Uncollectible</Badge>;
      case 'void':
        return <Badge variant="neutral">Void</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const isPaid = (invoice: {status: string; paid: boolean; amountDue: number}) => {
    // Check multiple conditions: paid flag, status, or zero amount due
    return (
      invoice.paid === true || invoice.status === 'paid' || (invoice.amountDue === 0 && invoice.status !== 'draft')
    );
  };

  // Show only the 5 most recent invoices
  const recentInvoices = invoicesData.invoices.slice(0, 5);
  const hasMoreInvoices = invoicesData.invoices.length > 5;

  return (
    <InvoicesCard>
      <>
        {invoicesData.invoices.length === 0 ? (
          <Alert>
            <FileText className="h-4 w-4" />
            <div className="ml-2">
              <p className="text-sm">Your first invoice appears here at the end of this billing period.</p>
            </div>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {recentInvoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-neutral-900">
                          {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                        </h3>
                        {getStatusBadge(invoice.status, invoice.paid)}
                      </div>
                      <div className="space-y-1 text-sm text-neutral-600">
                        <p>
                          <span className="font-medium">Date:</span> {formatDate(invoice.created)}
                        </p>
                        {invoice.periodStart && invoice.periodEnd && (
                          <p>
                            <span className="font-medium">Period:</span> {formatDate(invoice.periodStart)} -{' '}
                            {formatDate(invoice.periodEnd)}
                          </p>
                        )}
                        {isPaid(invoice) ? (
                          <p>
                            <span className="font-medium">Amount paid:</span>{' '}
                            {formatCurrency(invoice.amountPaid, invoice.currency)}
                          </p>
                        ) : (
                          <>
                            <p>
                              <span className="font-medium">Total:</span>{' '}
                              {formatCurrency(invoice.total, invoice.currency)}
                            </p>
                            <p className="text-amber-700 font-medium">
                              <span className="font-medium">Amount due:</span>{' '}
                              {formatCurrency(invoice.amountDue, invoice.currency)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {invoice.hostedInvoiceUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                      )}
                      {invoice.invoicePdf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.invoicePdf!, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message for viewing full history */}
            {hasMoreInvoices && (
              <Alert className="mt-4">
                <FileText className="h-4 w-4" />
                <div className="ml-2">
                  <p className="text-sm">
                    Showing your 5 most recent invoices.{' '}
                    {onManageBilling ? (
                      <>
                        <button
                          type="button"
                          onClick={onManageBilling}
                          className="underline font-medium cursor-pointer hover:text-neutral-900"
                        >
                          Open the customer portal
                        </button>{' '}
                        for your full history.
                      </>
                    ) : (
                      'Use Manage billing above for your full history.'
                    )}
                  </p>
                </div>
              </Alert>
            )}
          </div>
        )}
      </>
    </InvoicesCard>
  );
}

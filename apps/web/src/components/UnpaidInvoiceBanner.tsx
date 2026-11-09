import {Alert, Button} from '@plunk/ui';
import {AlertTriangle, ExternalLink} from 'lucide-react';
import {useBillingInvoices} from '../lib/hooks/useBillingInvoices';

interface UnpaidInvoiceBannerProps {
  projectId: string;
  hasSubscription: boolean;
}

export function UnpaidInvoiceBanner({projectId, hasSubscription}: UnpaidInvoiceBannerProps) {
  const {invoicesData, isLoading} = useBillingInvoices(projectId, hasSubscription);

  // Don't show banner if not loading and either no subscription or no unpaid invoices
  if (!hasSubscription || isLoading || !invoicesData?.hasUnpaidInvoices) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Soon';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalUnpaid = invoicesData.unpaidInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0);
  const currency = invoicesData.unpaidInvoices[0]?.currency || 'usd';
  const oldestDueDate = invoicesData.unpaidInvoices.reduce(
    (oldest, invoice) => {
      if (!invoice.dueDate) return oldest;
      if (!oldest) return invoice.dueDate;
      return new Date(invoice.dueDate) < new Date(oldest) ? invoice.dueDate : oldest;
    },
    null as string | null,
  );

  const handlePayNow = () => {
    const firstInvoice = invoicesData.unpaidInvoices[0];
    if (firstInvoice?.hostedInvoiceUrl) {
      window.open(firstInvoice.hostedInvoiceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Alert variant="destructive" className="mb-6 bg-red-50 border-red-300">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <div className="ml-3 flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-red-900 mb-1">
              {invoicesData.unpaidInvoices.length === 1
                ? 'You have an unpaid invoice'
                : `You have ${invoicesData.unpaidInvoices.length} unpaid invoices`}
            </h3>
            <p className="text-sm text-red-800">
              Total amount due: <span className="font-semibold">{formatCurrency(totalUnpaid, currency)}</span>
              {oldestDueDate && (
                <>
                  {' '}
                  • Due by: <span className="font-semibold">{formatDate(oldestDueDate)}</span>
                </>
              )}
            </p>
            <p className="text-xs text-red-700 mt-1">
              Please pay your outstanding invoices to avoid service interruption.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={handlePayNow} className="ml-4">
            Pay Now
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}

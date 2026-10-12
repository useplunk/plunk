/**
 * Outstanding Invoice Service
 *
 * What a customer still owes. `open` covers invoices Stripe is still retrying; `uncollectible`
 * covers the ones it gave up on, which remain payable and remain debt. Both have to be clear
 * before a project paused for a failed payment sends again, otherwise starting a fresh
 * subscription — whose first invoice is 0.00 and paid on the spot — would wipe the slate.
 */

import signale from 'signale';
import type Stripe from 'stripe';

import {stripe} from '../app/stripe.js';

/** A customer with more unpaid invoices than this has bigger problems than this page size. */
const PAGE_SIZE = 20;

export class OutstandingInvoiceService {
  public static async list(customerId: string): Promise<Stripe.Invoice[]> {
    if (!stripe) {
      return [];
    }

    const [open, uncollectible] = await Promise.all([
      stripe.invoices.list({customer: customerId, status: 'open', limit: PAGE_SIZE}),
      stripe.invoices.list({customer: customerId, status: 'uncollectible', limit: PAGE_SIZE}),
    ]);

    return [...open.data, ...uncollectible.data].filter(
      // A verification invoice is already paid by the time it is open for more than an
      // instant; one left behind by a failed attach is our bookkeeping, not the customer's debt.
      invoice => invoice.amount_remaining > 0 && invoice.metadata?.plunk_purpose !== 'card_verification',
    );
  }

  /**
   * Pay every outstanding invoice off-session with the given card. Each payment that lands
   * fires `invoice.paid`, which is where the project is re-enabled once nothing is left.
   */
  public static async payWith(customerId: string, paymentMethodId: string): Promise<{paid: number; failed: number}> {
    if (!stripe) {
      return {paid: 0, failed: 0};
    }

    const invoices = await this.list(customerId);
    let paid = 0;
    let failed = 0;

    for (const invoice of invoices) {
      if (!invoice.id) {
        continue;
      }

      try {
        await stripe.invoices.pay(invoice.id, {payment_method: paymentMethodId, off_session: true});
        paid += 1;
      } catch (error) {
        // A decline here is the customer's next problem to fix, not ours to retry: the
        // invoice stays outstanding and the project stays paused.
        failed += 1;
        signale.warn(`[BILLING] Paying invoice ${invoice.id} with ${paymentMethodId} failed:`, error);
      }
    }

    return {paid, failed};
  }
}

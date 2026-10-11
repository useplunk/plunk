/**
 * Billing queue job data types
 */

/**
 * Job data for verifying that a card accepts merchant-initiated charges
 * Used by: cardVerificationQueue worker
 */
export interface CardVerificationJobData {
  projectId: string;
  customerId: string;
  /** Currency of the subscription, so the validation charge matches what they were quoted */
  currency: string;
  /**
   * Derives the Stripe idempotency keys for the charge and its credit: the checkout session id
   * at activation, or the payment method id when the customer changes card.
   */
  attemptKey: string;
  /** Card to test. Pinned rather than read at run time, so a later card change cannot swap it. */
  paymentMethodId?: string;
  /** Promo code typed at checkout, applied as credit only once verification succeeds */
  promoCode?: string;
}

/**
 * Job data for reconciling projects stuck mid-verification
 * Used by: cardVerificationSweepQueue worker
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CardVerificationSweepJobData {
  // Empty - sweeps every project whose verification never reached a verdict
}

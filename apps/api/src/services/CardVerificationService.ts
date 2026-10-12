/**
 * Card Verification Service
 *
 * Checkout saves and authenticates the card while the cardholder is sitting there, which
 * proves nothing about the renewal a month later. That renewal is merchant-initiated and
 * off-session, which a prepaid or MIT-hostile card will refuse with `transaction_not_allowed`.
 * That gap is worth a month of unbilled sending per account, and it is what this service
 * closes: a single off-session charge, testing the exact thing that fails later. Checkout
 * itself collects nothing, so this is the only activation charge.
 *
 * It runs at activation and again whenever the customer changes card, so a card swapped in
 * after activation is held to the same bar, and a project paused for its card recovers as
 * soon as the customer adds one that passes. Every verdict short of a pass pauses sending:
 * an account that has paid nothing does not get to send on an unproven card.
 *
 * The off-session charge qualifies as a merchant-initiated transaction because the card was
 * authenticated when it was saved, so it falls outside SCA and the issuer raises no challenge.
 * Note the Radar "request 3DS" rule must exclude `:is_off_session:`, otherwise it asks for an
 * authentication no one is present to complete.
 */

import type {ProjectDisabledReason} from '@plunk/db';
import type {CardVerificationJobData} from '@plunk/types';
import React from 'react';
import signale from 'signale';
import type Stripe from 'stripe';

import {CardVerificationFailedEmail, sendPlatformEmail} from '@plunk/email';

import {DASHBOARD_URI, LANDING_URI, STRIPE_ENABLED} from '../app/constants.js';
import {stripe} from '../app/stripe.js';
import {prisma} from '../database/prisma.js';
import {MembershipService} from './MembershipService.js';
import {NtfyService} from './NtfyService.js';
import {OutstandingInvoiceService} from './OutstandingInvoiceService.js';
import {QueueService} from './QueueService.js';

/**
 * One charge rather than two: Stripe's fee is mostly fixed per charge, so a single 2.00 costs
 * half the fees of two 1.00s. Credited back in full once it lands. Disclosed on the Checkout
 * page, the billing settings and the terms — keep those in step if this changes.
 */
export const VERIFICATION_AMOUNT = 200;

/** Extra credit for the switching offer, carried over from the Checkout custom field. */
const SWITCH_PROMO_CREDIT = 200;

/**
 * Decline codes that mean the card structurally cannot support merchant-initiated charges.
 * These are verdicts rather than failures — the same card will decline the same way next
 * month, so there is nothing to retry and nothing to wait for.
 */
const HARD_DECLINE_CODES = new Set([
  'transaction_not_allowed',
  'do_not_honor',
  'card_not_supported',
  'stolen_card',
  'lost_card',
  'pickup_card',
  'card_velocity_exceeded',
  'restricted_card',
  'revocation_of_all_authorizations',
  'revocation_of_authorization',
  'no_action_taken',
  'service_not_allowed',
]);

/** Disable reasons this service owns. It never overwrites, or lifts, a pause it did not set. */
const VERIFICATION_REASONS: ProjectDisabledReason[] = ['CARD_VERIFICATION_FAILED', 'CARD_VERIFICATION_REQUIRED'];

export type CardVerificationOutcome =
  /** Card accepted a merchant-initiated charge. */
  | {status: 'verified'; paymentIntentId: string}
  /**
   * Issuer wanted the cardholder, or gave a decline that a good card can plausibly recover
   * from (an empty balance, say). Not a fraud verdict, but nothing was collected, so sending
   * pauses until the customer updates the card.
   */
  | {status: 'requires_action'; paymentIntentId: string | null; reason: string}
  /** Structural decline, a prepaid card, or a Radar block. Sending pauses until the card changes. */
  | {status: 'failed'; paymentIntentId: string | null; declineCode: string}
  /** No card we can test this way. Treated like requires_action: nothing was proven. */
  | {status: 'skipped'; reason: string};

export class CardVerificationService {
  /**
   * Run the off-session charge and apply its verdict to the project.
   *
   * Throws only on infrastructure failures (network, Stripe 5xx, rate limits) so BullMQ
   * retries those. Every issuer response is resolved here instead, because retrying a
   * decline just asks the same question again.
   */
  public static async verify(data: CardVerificationJobData): Promise<CardVerificationOutcome> {
    const {projectId, customerId, currency, attemptKey} = data;

    if (!STRIPE_ENABLED || !stripe) {
      return {status: 'skipped', reason: 'billing disabled'};
    }

    const project = await prisma.project.findUnique({where: {id: projectId}});

    if (!project) {
      return {status: 'skipped', reason: 'project not found'};
    }

    // A redelivered webhook or a replayed job must not charge twice. The Stripe idempotency
    // key below is the real guard; this just avoids the round trip.
    if (project.cardVerification === 'VERIFIED' && project.cardVerificationSession === attemptKey) {
      return {status: 'skipped', reason: 'already verified'};
    }

    // A newer card change superseded this attempt; its own job will test the newer card.
    if (project.cardVerificationSession && project.cardVerificationSession !== attemptKey) {
      return {status: 'skipped', reason: 'superseded by a newer attempt'};
    }

    const paymentMethod = await this.getPaymentMethod(data, project.subscription);

    if (!paymentMethod) {
      return this.resolve(data, {status: 'skipped', reason: 'no default payment method'}, null);
    }

    // Cards-only is the current Stripe configuration, but a bank debit would settle over days
    // rather than answering now, so it cannot gate activation. Guard rather than assume.
    if (paymentMethod.type !== 'card') {
      return this.resolve(
        data,
        {status: 'skipped', reason: `unsupported payment method type: ${paymentMethod.type}`},
        paymentMethod,
      );
    }

    // Prepaid cards are the bulk of the cards that pass verification and decline the renewal
    // anyway. Rejected before charging, which costs nothing and does not depend on the Radar
    // rule that blocks them also covering this charge.
    if (paymentMethod.card?.funding === 'prepaid') {
      return this.resolve(data, {status: 'failed', paymentIntentId: null, declineCode: 'prepaid_card'}, paymentMethod);
    }

    let outcome: CardVerificationOutcome;

    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: VERIFICATION_AMOUNT,
          currency,
          customer: customerId,
          payment_method: paymentMethod.id,
          off_session: true,
          confirm: true,
          description: 'Card verification',
          metadata: {
            plunk_project_id: projectId,
            plunk_purpose: 'card_verification',
          },
        },
        // Derived from the attempt, so a redelivered webhook or a sweep retry returns the
        // original charge instead of creating a second one.
        {idempotencyKey: `card-verification-${attemptKey}`},
      );

      outcome =
        intent.status === 'succeeded'
          ? {status: 'verified', paymentIntentId: intent.id}
          : {status: 'requires_action', paymentIntentId: intent.id, reason: `unexpected status: ${intent.status}`};
    } catch (error) {
      outcome = await this.classifyError(error);
    }

    return this.resolve(data, outcome, paymentMethod);
  }

  /**
   * React to the customer choosing a different default card, normally in the billing portal.
   *
   * A project paused for a failed renewal gets its outstanding invoices paid on the new card
   * straight away, and `invoice.paid` lifts the pause. Any other project has the new card
   * verified, which lifts a verification pause on success and catches a good card being
   * swapped for a bad one after activation.
   */
  public static async handlePaymentMethodChange(customerId: string, paymentMethodId: string): Promise<void> {
    if (!STRIPE_ENABLED || !stripe) {
      return;
    }

    const project = await prisma.project.findUnique({where: {customer: customerId}});

    // Without a subscription there is nothing to bill the card for. Starting one goes through
    // Checkout, which verifies the card itself.
    if (!project?.subscription) {
      return;
    }

    // One change in the portal fires several webhooks, and this method's own subscription
    // update fires another. Claiming the column makes exactly one of them act.
    const claim = await prisma.project.updateMany({
      where: {
        id: project.id,
        OR: [{cardVerificationPaymentMethod: null}, {cardVerificationPaymentMethod: {not: paymentMethodId}}],
      },
      data: {cardVerificationPaymentMethod: paymentMethodId},
    });

    if (claim.count === 0) {
      return;
    }

    // Checkout pins its card on the subscription, and a card pinned there wins over the
    // customer default — so without this, renewals would keep charging the old card.
    const subscription = await stripe.subscriptions.update(project.subscription, {
      default_payment_method: paymentMethodId,
    });

    if (project.disabled && project.disabledReason === 'PAYMENT_FAILED') {
      // Paying the debt on the new card is itself an off-session charge, so it is the
      // verification. Nothing else needed: `invoice.paid` re-enables once the debt is clear.
      const result = await OutstandingInvoiceService.payWith(customerId, paymentMethodId);
      signale.info(
        `[CARD-VERIFICATION] Card changed on project ${project.id} with failed payment: ${result.paid} invoice(s) paid, ${result.failed} declined`,
      );
      return;
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const fingerprint = paymentMethod.card?.fingerprint ?? null;

    // The same physical card re-added under a new id has already proven itself.
    if (project.cardVerification === 'VERIFIED' && fingerprint && fingerprint === project.cardVerificationFingerprint) {
      return;
    }

    await prisma.project.update({
      where: {id: project.id},
      data: {
        cardVerification: 'PENDING',
        cardVerificationAt: new Date(),
        cardVerificationSession: paymentMethodId,
        cardVerificationAttempts: 0,
      },
    });

    await QueueService.queueCardVerification({
      projectId: project.id,
      customerId,
      currency: subscription.currency,
      attemptKey: paymentMethodId,
      paymentMethodId,
    });

    signale.info(`[CARD-VERIFICATION] Card changed on project ${project.id}, verification queued`);
  }

  /**
   * Turn a Stripe error into a verdict, or rethrow it for BullMQ to retry.
   */
  private static async classifyError(error: unknown): Promise<CardVerificationOutcome> {
    const stripeError = error as Stripe.errors.StripeError;

    if (stripeError?.type !== 'StripeCardError') {
      // Not an issuer response — a network blip, a 5xx, a rate limit. Worth another attempt.
      throw error;
    }

    const paymentIntentId = stripeError.payment_intent?.id ?? null;
    const declineCode = stripeError.decline_code ?? null;

    if (stripeError.code === 'authentication_required') {
      return {
        status: 'requires_action',
        paymentIntentId,
        reason: 'authentication_required',
      };
    }

    if (declineCode && HARD_DECLINE_CODES.has(declineCode)) {
      return {status: 'failed', paymentIntentId, declineCode};
    }

    // A Radar block carries no decline code of its own and would otherwise read as a soft
    // decline. It is our own rule saying no (a blocklisted card, a prepaid card), so it is final.
    if (stripeError.charge && (await this.wasBlockedByRadar(stripeError.charge))) {
      return {status: 'failed', paymentIntentId, declineCode: 'blocked_by_radar'};
    }

    // Soft declines (insufficient_funds, processing_error, issuer_not_available) can happen to
    // a card that is otherwise fine. The customer can fix those, so they are not final.
    return {
      status: 'requires_action',
      paymentIntentId,
      reason: declineCode ?? stripeError.code ?? 'unknown decline',
    };
  }

  private static async wasBlockedByRadar(chargeId: string): Promise<boolean> {
    if (!stripe) {
      return false;
    }

    // Failing to look this up must not turn a decline into an infrastructure retry; the
    // decline then stands as a soft one, which still pauses sending.
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      return charge.outcome?.type === 'blocked';
    } catch (error) {
      signale.error(`[CARD-VERIFICATION] Failed to read outcome of charge ${chargeId}:`, error);
      return false;
    }
  }

  /**
   * Persist the verdict, apply credit for the charge if it landed, and pause or resume sending.
   */
  private static async resolve(
    data: CardVerificationJobData,
    outcome: CardVerificationOutcome,
    paymentMethod: Stripe.PaymentMethod | null,
  ): Promise<CardVerificationOutcome> {
    const {projectId, attemptKey, promoCode} = data;
    const project = await prisma.project.findUnique({where: {id: projectId}});

    if (!project) {
      return outcome;
    }

    const ownsPause = project.disabled && VERIFICATION_REASONS.includes(project.disabledReason as ProjectDisabledReason);
    // Pausing is only ours to do if nothing else has already paused the project.
    const mayPause = !project.disabled || ownsPause;

    switch (outcome.status) {
      case 'verified': {
        await prisma.project.update({
          where: {id: projectId},
          data: {
            cardVerification: 'VERIFIED',
            cardVerificationIntent: outcome.paymentIntentId,
            cardVerificationAt: new Date(),
            cardVerificationFingerprint: paymentMethod?.card?.fingerprint ?? null,
            ...(ownsPause && {disabled: false, disabledReason: null}),
          },
        });

        // Invoice before crediting: the credit would otherwise sit on the balance at the moment
        // the invoice finalises and be applied to it.
        await this.issueInvoice(project.customer, data, outcome.paymentIntentId);
        await this.applyCredit(project.customer, data.currency, attemptKey, VERIFICATION_AMOUNT, promoCode);

        if (ownsPause) {
          signale.success(`[CARD-VERIFICATION] Project ${project.name} (${projectId}) verified, sending resumed`);
          await NtfyService.notifyCardVerificationRecovered(project.name, projectId);
        } else {
          signale.success(`[CARD-VERIFICATION] Project ${project.name} (${projectId}) verified`);
        }
        break;
      }

      case 'requires_action':
      case 'skipped': {
        const reason = outcome.reason;

        // Recorded as REQUIRES_ACTION rather than left PENDING so the sweep does not retry a
        // check that will come out identically every time.
        await prisma.project.update({
          where: {id: projectId},
          data: {
            cardVerification: 'REQUIRES_ACTION',
            cardVerificationIntent: outcome.status === 'requires_action' ? outcome.paymentIntentId : null,
            cardVerificationAt: new Date(),
            ...(mayPause && {disabled: true, disabledReason: 'CARD_VERIFICATION_REQUIRED'}),
          },
        });

        // Nothing was collected, so only the promo credit (if any) applies.
        await this.applyCredit(project.customer, data.currency, attemptKey, 0, promoCode);

        signale.warn(`[CARD-VERIFICATION] Project ${project.name} (${projectId}) paused, needs attention: ${reason}`);
        await NtfyService.notifyCardVerificationRequiresAction(project.name, projectId, reason);

        if (mayPause) {
          await this.notifyMembers(projectId, project.name, 'action_required');
        }
        break;
      }

      case 'failed': {
        await prisma.project.update({
          where: {id: projectId},
          data: {
            cardVerification: 'FAILED',
            cardVerificationIntent: outcome.paymentIntentId,
            cardVerificationAt: new Date(),
            ...(mayPause && {disabled: true, disabledReason: 'CARD_VERIFICATION_FAILED'}),
          },
        });

        // Nothing was collected and nothing is refunded. The subscription is kept so the
        // customer can fix the card in the portal; the sweep cancels it if they never do.
        signale.warn(`[CARD-VERIFICATION] Project ${project.name} (${projectId}) paused: ${outcome.declineCode}`);
        await NtfyService.notifyCardVerificationFailed(project.name, projectId, outcome.declineCode);

        if (mayPause) {
          await this.notifyMembers(projectId, project.name, 'declined');
        }
        break;
      }
    }

    return outcome;
  }

  /**
   * Give the verification charge an invoice, so the customer has a document for it and it is
   * booked like every other payment. The charge itself stays a plain PaymentIntent — the
   * verdict must come from the card, never from an invoice — and is attached afterwards.
   *
   * Stripe applies a customer's credit balance to every invoice it finalises, with no way to
   * opt one out. A customer already holding credit (a re-verification after a card change,
   * typically) would have this invoice paid from that credit rather than by the charge, so
   * they get a Stripe receipt instead. Never throws: the verdict is already decided.
   */
  private static async issueInvoice(
    customerId: string | null,
    data: CardVerificationJobData,
    paymentIntentId: string,
  ): Promise<void> {
    if (!stripe || !customerId) {
      return;
    }

    const {attemptKey, currency, projectId} = data;
    let invoiceId: string | undefined;

    try {
      const customer = await stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        return;
      }

      if ((customer.balance ?? 0) < 0) {
        if (customer.email) {
          await stripe.paymentIntents.update(paymentIntentId, {receipt_email: customer.email});
        }
        signale.info(`[CARD-VERIFICATION] Customer ${customerId} holds credit, sent a receipt instead of an invoice`);
        return;
      }

      const invoice = await stripe.invoices.create(
        {
          customer: customerId,
          currency,
          collection_method: 'charge_automatically',
          auto_advance: false,
          pending_invoice_items_behavior: 'exclude',
          description: 'Card verification. Credited in full to your account balance and applied to your usage.',
          metadata: {plunk_project_id: projectId, plunk_purpose: 'card_verification'},
        },
        {idempotencyKey: `card-verification-invoice-${attemptKey}`},
      );
      invoiceId = invoice.id;

      await stripe.invoiceItems.create(
        {customer: customerId, invoice: invoiceId, amount: VERIFICATION_AMOUNT, currency, description: 'Card verification'},
        {idempotencyKey: `card-verification-invoice-item-${attemptKey}`},
      );

      await stripe.invoices.finalizeInvoice(
        invoiceId,
        {auto_advance: false},
        {idempotencyKey: `card-verification-invoice-finalize-${attemptKey}`},
      );

      // Attaching a succeeded PaymentIntent marks the invoice paid on the spot.
      await stripe.invoices.attachPayment(
        invoiceId,
        {payment_intent: paymentIntentId},
        {idempotencyKey: `card-verification-invoice-attach-${attemptKey}`},
      );
    } catch (error) {
      signale.error(`[CARD-VERIFICATION] Failed to invoice verification charge ${paymentIntentId}:`, error);

      // An open verification invoice is not debt, and must not linger looking like it.
      if (invoiceId) {
        await stripe.invoices.voidInvoice(invoiceId).catch(() => undefined);
      }
    }
  }

  /**
   * Credit back the verification charge, if it landed, plus any promo credit.
   *
   * Added as a balance transaction rather than by setting the balance, because verification
   * now re-runs on every card change and must not wipe credit the customer already holds.
   * Keyed by attempt, so a replayed job credits once.
   */
  private static async applyCredit(
    customerId: string | null,
    currency: string,
    attemptKey: string,
    amountCollected: number,
    promoCode?: string,
  ): Promise<void> {
    if (!stripe || !customerId) {
      return;
    }

    let credit = amountCollected;

    if (promoCode?.trim().toUpperCase() === 'SWITCH') {
      credit += SWITCH_PROMO_CREDIT;
    }

    if (credit === 0) {
      return;
    }

    try {
      await stripe.customers.createBalanceTransaction(
        customerId,
        {amount: -credit, currency, description: 'Card verification credit'},
        {idempotencyKey: `card-verification-credit-${attemptKey}`},
      );
    } catch (error) {
      // The credit is a courtesy; losing it must not strand the verification verdict.
      signale.error(`[CARD-VERIFICATION] Failed to apply credit to customer ${customerId}:`, error);
    }
  }

  /**
   * Cancel the subscription of a project that stayed paused for its card past the grace
   * period. Called by the sweep; the `customer.subscription.deleted` webhook clears the column.
   */
  public static async cancelAbandonedSubscription(subscriptionId: string, projectId: string): Promise<void> {
    if (!stripe) {
      return;
    }

    try {
      await stripe.subscriptions.cancel(subscriptionId);
      await prisma.project.update({where: {id: projectId}, data: {subscription: null}});
      signale.info(`[CARD-VERIFICATION] Cancelled abandoned subscription ${subscriptionId} (project ${projectId})`);
    } catch (error) {
      signale.error(`[CARD-VERIFICATION] Failed to cancel subscription ${subscriptionId}:`, error);
    }
  }

  private static async notifyMembers(
    projectId: string,
    projectName: string,
    variant: 'declined' | 'action_required',
  ): Promise<void> {
    try {
      const members = await MembershipService.getMembers(projectId);
      const emails = members.map(m => m.email);

      if (emails.length === 0) {
        return;
      }

      const template = React.createElement(CardVerificationFailedEmail, {
        projectName,
        projectId,
        variant,
        dashboardUrl: DASHBOARD_URI,
        landingUrl: LANDING_URI,
      });

      const subject =
        variant === 'declined'
          ? 'Sending Paused - Card Verification Failed'
          : 'Sending Paused - Your Card Needs Attention';

      await Promise.all(emails.map(email => sendPlatformEmail(email, subject, template)));
    } catch (error) {
      signale.error('[CARD-VERIFICATION] Failed to send verification email:', error);
    }
  }

  /**
   * The card to test: the one pinned on the job, else the subscription's (the one renewals
   * actually use), else the customer default.
   */
  private static async getPaymentMethod(
    data: CardVerificationJobData,
    subscriptionId: string | null,
  ): Promise<Stripe.PaymentMethod | null> {
    if (!stripe) {
      return null;
    }

    if (data.paymentMethodId) {
      const method = await stripe.paymentMethods.retrieve(data.paymentMethodId);
      const owner = typeof method.customer === 'string' ? method.customer : method.customer?.id;
      // A detached card cannot be charged; treat it as no card rather than letting it error.
      return owner === data.customerId ? method : null;
    }

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method'],
      });

      const method = subscription.default_payment_method;
      if (method && typeof method !== 'string') {
        return method;
      }
    }

    const customer = await stripe.customers.retrieve(data.customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });

    if (customer.deleted) {
      return null;
    }

    const method = customer.invoice_settings?.default_payment_method;
    return method && typeof method !== 'string' ? method : null;
  }
}

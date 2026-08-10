/**
 * Card Verification Service
 *
 * The onboarding charge collected at Checkout is customer-initiated and on-session, so it
 * proves only that the card can pay while the cardholder is sitting there. The renewal a
 * month later is merchant-initiated and off-session, which a prepaid or MIT-hostile card
 * will refuse with `transaction_not_allowed`. That gap is worth a month of unbilled sending
 * per account, and it is what this service closes: a second, off-session charge run at
 * onboarding, testing the exact thing that fails later.
 *
 * The off-session charge qualifies as a merchant-initiated transaction because Checkout
 * authenticates the card when it is saved, so it falls outside SCA and the issuer raises no
 * challenge. Note the Radar "request 3DS" rule must exclude `:is_off_session:`, otherwise it
 * asks for an authentication no one is present to complete.
 */

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

/** Matches the onboarding fee, so the customer sees two identical lines rather than a surprise. */
const VERIFICATION_AMOUNT = 100;

/** Each €1 charge that actually landed is credited back, so verification costs the customer nothing. */
const CREDIT_PER_CHARGE = 100;

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

export type CardVerificationOutcome =
  /** Card accepted a merchant-initiated charge. */
  | {status: 'verified'; paymentIntentId: string}
  /**
   * Issuer wanted the cardholder, or gave a decline that a good card can plausibly recover
   * from (an empty balance, say). Never a fraud verdict on its own, so the project stays
   * enabled and a human decides.
   */
  | {status: 'requires_action'; paymentIntentId: string | null; reason: string}
  /** Structural decline. Project disabled, subscription cancelled. */
  | {status: 'failed'; paymentIntentId: string | null; declineCode: string}
  /** Billing disabled, or a payment method we cannot test this way. */
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
    const {projectId, customerId, currency, sessionId} = data;

    if (!STRIPE_ENABLED || !stripe) {
      return {status: 'skipped', reason: 'billing disabled'};
    }

    const project = await prisma.project.findUnique({where: {id: projectId}});

    if (!project) {
      return {status: 'skipped', reason: 'project not found'};
    }

    // A redelivered webhook or a replayed job must not charge twice. The Stripe idempotency
    // key below is the real guard; this just avoids the round trip.
    if (project.cardVerification === 'VERIFIED') {
      return {status: 'skipped', reason: 'already verified'};
    }

    const paymentMethod = await this.getDefaultPaymentMethod(project.subscription, customerId);

    if (!paymentMethod) {
      return this.resolve(data, {status: 'skipped', reason: 'no default payment method'});
    }

    // Cards-only is the current Stripe configuration, but a bank debit would settle over days
    // rather than answering now, so it cannot gate activation. Guard rather than assume.
    if (paymentMethod.type !== 'card') {
      return this.resolve(data, {
        status: 'skipped',
        reason: `unsupported payment method type: ${paymentMethod.type}`,
      });
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
        // Derived from the checkout session, so a redelivered webhook returns the original
        // charge instead of creating a second one.
        {idempotencyKey: `card-verification-${sessionId}`},
      );

      outcome =
        intent.status === 'succeeded'
          ? {status: 'verified', paymentIntentId: intent.id}
          : {status: 'requires_action', paymentIntentId: intent.id, reason: `unexpected status: ${intent.status}`};
    } catch (error) {
      outcome = this.classifyError(error);
    }

    return this.resolve(data, outcome);
  }

  /**
   * Turn a Stripe error into a verdict, or rethrow it for BullMQ to retry.
   */
  private static classifyError(error: unknown): CardVerificationOutcome {
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

    // Soft declines (insufficient_funds, processing_error, issuer_not_available) can happen to
    // a card that is otherwise fine. Not grounds to disable a paying customer on our own.
    return {
      status: 'requires_action',
      paymentIntentId,
      reason: declineCode ?? stripeError.code ?? 'unknown decline',
    };
  }

  /**
   * Persist the verdict, apply credit for the charges that actually landed, and raise alerts.
   */
  private static async resolve(
    data: CardVerificationJobData,
    outcome: CardVerificationOutcome,
  ): Promise<CardVerificationOutcome> {
    const {projectId, sessionId, promoCode} = data;
    const project = await prisma.project.findUnique({where: {id: projectId}});

    if (!project) {
      return outcome;
    }

    switch (outcome.status) {
      case 'verified': {
        await prisma.project.update({
          where: {id: projectId},
          data: {
            cardVerification: 'VERIFIED',
            cardVerificationIntent: outcome.paymentIntentId,
            cardVerificationAt: new Date(),
          },
        });
        // Both charges landed, so both are credited back.
        await this.applyCredit(project.customer, 2, promoCode);
        signale.success(`[CARD-VERIFICATION] Project ${project.name} (${projectId}) verified`);
        break;
      }

      case 'requires_action': {
        await prisma.project.update({
          where: {id: projectId},
          data: {
            cardVerification: 'REQUIRES_ACTION',
            cardVerificationIntent: outcome.paymentIntentId,
            cardVerificationAt: new Date(),
          },
        });
        // Only the on-session onboarding fee was actually collected.
        await this.applyCredit(project.customer, 1, promoCode);
        signale.warn(
          `[CARD-VERIFICATION] Project ${project.name} (${projectId}) needs attention: ${outcome.reason}`,
        );
        await NtfyService.notifyCardVerificationRequiresAction(project.name, projectId, outcome.reason);
        break;
      }

      case 'failed': {
        await prisma.project.update({
          where: {id: projectId},
          data: {
            cardVerification: 'FAILED',
            cardVerificationIntent: outcome.paymentIntentId,
            cardVerificationAt: new Date(),
            disabled: true,
            disabledReason: 'CARD_VERIFICATION_FAILED',
          },
        });

        await this.cancelSubscription(project.subscription, projectId);

        // The verification charge never completed, so the onboarding fee is the only money
        // taken — for an account that now has nothing. Refunded rather than credited, because
        // credit on a cancelled subscription is unspendable. Costs the Stripe processing fee,
        // which is cheap next to a chargeback from someone we declined wrongly.
        await this.refundOnboardingCharge(sessionId);

        signale.warn(
          `[CARD-VERIFICATION] Project ${project.name} (${projectId}) disabled: ${outcome.declineCode}`,
        );

        await NtfyService.notifyCardVerificationFailed(project.name, projectId, outcome.declineCode);
        await this.notifyMembers(projectId, project.name);
        break;
      }

      case 'skipped': {
        // Nothing was tested, so this is not a pass — it is an unverified project that is
        // nonetheless able to send. Recorded as REQUIRES_ACTION rather than left PENDING so the
        // sweep escalates it to a human instead of retrying a check that will skip identically
        // every time.
        await prisma.project.update({
          where: {id: projectId},
          data: {cardVerification: 'REQUIRES_ACTION', cardVerificationAt: new Date()},
        });
        // Only the on-session onboarding fee was actually collected.
        await this.applyCredit(project.customer, 1, promoCode);
        signale.warn(`[CARD-VERIFICATION] Skipped for project ${projectId}: ${outcome.reason}`);
        await NtfyService.notifyCardVerificationRequiresAction(project.name, projectId, outcome.reason);
        break;
      }
    }

    return outcome;
  }

  /**
   * Credit back the verification charges the customer actually paid.
   *
   * Stripe's customer balance is absolute, not incremental — safe here because this runs once
   * per project, right after onboarding, on a customer with no other balance activity.
   */
  private static async applyCredit(
    customerId: string | null,
    chargesCollected: number,
    promoCode?: string,
  ): Promise<void> {
    if (!stripe || !customerId) {
      return;
    }

    let credit = chargesCollected * CREDIT_PER_CHARGE;

    if (promoCode?.trim().toUpperCase() === 'SWITCH') {
      credit += SWITCH_PROMO_CREDIT;
    }

    try {
      await stripe.customers.update(customerId, {balance: -credit});
    } catch (error) {
      // The credit is a courtesy; losing it must not strand the verification verdict.
      signale.error(`[CARD-VERIFICATION] Failed to apply credit to customer ${customerId}:`, error);
    }
  }

  /**
   * Refund the onboarding fee collected during Checkout.
   *
   * Reached only from the hard-decline path, where the account is being shut down before it
   * ever sent anything. Failure here is logged rather than thrown: the project is already
   * disabled and the verdict already recorded, and re-running the job to retry a refund would
   * re-attempt the whole verification.
   */
  private static async refundOnboardingCharge(sessionId: string): Promise<void> {
    if (!stripe) {
      return;
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['invoice.payments'],
      });

      const invoice = session.invoice;

      if (!invoice || typeof invoice === 'string') {
        signale.info(`[CARD-VERIFICATION] No invoice on session ${sessionId}, nothing to refund`);
        return;
      }

      // Self-hosters can leave STRIPE_PRICE_ONBOARDING unset, in which case the invoice is
      // zero and carries no settled payment.
      const settled = invoice.payments?.data.find(payment => payment.status === 'paid');
      const intent = settled?.payment.payment_intent;
      const paymentIntentId = typeof intent === 'string' ? intent : intent?.id;

      if (!paymentIntentId) {
        signale.info(`[CARD-VERIFICATION] No settled payment on session ${sessionId}, nothing to refund`);
        return;
      }

      await stripe.refunds.create(
        {payment_intent: paymentIntentId},
        {idempotencyKey: `card-verification-refund-${sessionId}`},
      );

      signale.success(`[CARD-VERIFICATION] Refunded onboarding fee for session ${sessionId}`);
    } catch (error) {
      signale.error(`[CARD-VERIFICATION] Failed to refund onboarding fee for session ${sessionId}:`, error);
    }
  }

  private static async cancelSubscription(subscriptionId: string | null, projectId: string): Promise<void> {
    if (!stripe || !subscriptionId) {
      return;
    }

    try {
      await stripe.subscriptions.cancel(subscriptionId);
      await prisma.project.update({where: {id: projectId}, data: {subscription: null}});
    } catch (error) {
      signale.error(`[CARD-VERIFICATION] Failed to cancel subscription ${subscriptionId}:`, error);
    }
  }

  private static async notifyMembers(projectId: string, projectName: string): Promise<void> {
    try {
      const members = await MembershipService.getMembers(projectId);
      const emails = members.map(m => m.email);

      if (emails.length === 0) {
        return;
      }

      const template = React.createElement(CardVerificationFailedEmail, {
        projectName,
        projectId,
        dashboardUrl: DASHBOARD_URI,
        landingUrl: LANDING_URI,
      });

      await Promise.all(
        emails.map(email => sendPlatformEmail(email, 'Project Disabled - Card Verification Failed', template)),
      );
    } catch (error) {
      signale.error('[CARD-VERIFICATION] Failed to send verification failed email:', error);
    }
  }

  /**
   * The subscription's payment method is the one renewals will actually use, so that is the
   * one worth testing. Falls back to the customer default for safety.
   */
  private static async getDefaultPaymentMethod(
    subscriptionId: string | null,
    customerId: string,
  ): Promise<Stripe.PaymentMethod | null> {
    if (!stripe) {
      return null;
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

    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });

    if (customer.deleted) {
      return null;
    }

    const method = customer.invoice_settings?.default_payment_method;
    return method && typeof method !== 'string' ? method : null;
  }
}

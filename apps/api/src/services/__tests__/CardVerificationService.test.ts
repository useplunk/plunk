import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CardVerificationService, VERIFICATION_AMOUNT} from '../CardVerificationService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

const stripeMock = vi.hoisted(() => ({
  paymentIntents: {create: vi.fn(), update: vi.fn()},
  paymentMethods: {retrieve: vi.fn()},
  subscriptions: {retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn()},
  customers: {retrieve: vi.fn(), createBalanceTransaction: vi.fn()},
  charges: {retrieve: vi.fn()},
  invoices: {
    list: vi.fn(),
    pay: vi.fn(),
    create: vi.fn(),
    finalizeInvoice: vi.fn(),
    attachPayment: vi.fn(),
    voidInvoice: vi.fn(),
  },
  invoiceItems: {create: vi.fn()},
}));

const queueMock = vi.hoisted(() => ({queueCardVerification: vi.fn()}));
const emailMock = vi.hoisted(() => ({sendPlatformEmail: vi.fn(), CardVerificationFailedEmail: vi.fn()}));

vi.mock('../../app/stripe.js', () => ({stripe: stripeMock}));

vi.mock('../../app/constants.js', async () => {
  const actual = await vi.importActual('../../app/constants.js');
  return {...actual, STRIPE_ENABLED: true};
});

vi.mock('../QueueService.js', () => ({QueueService: queueMock}));

vi.mock('../NtfyService.js', () => ({
  NtfyService: {
    notifyCardVerificationFailed: vi.fn(),
    notifyCardVerificationRequiresAction: vi.fn(),
    notifyCardVerificationRecovered: vi.fn(),
  },
}));

vi.mock('../MembershipService.js', () => ({
  MembershipService: {getMembers: vi.fn().mockResolvedValue([{email: 'owner@example.com'}])},
}));

vi.mock('@plunk/email', () => emailMock);

const CUSTOMER = 'cus_test';
const SUBSCRIPTION = 'sub_test';

function card(id: string, opts: {funding?: string; fingerprint?: string} = {}) {
  return {
    id,
    type: 'card',
    customer: CUSTOMER,
    card: {funding: opts.funding ?? 'credit', fingerprint: opts.fingerprint ?? `fp_${id}`},
  };
}

function cardError(opts: {code?: string; decline_code?: string; charge?: string}) {
  return {
    type: 'StripeCardError',
    code: opts.code ?? 'card_declined',
    decline_code: opts.decline_code,
    charge: opts.charge,
    payment_intent: {id: 'pi_declined'},
  };
}

describe('CardVerificationService', () => {
  const prisma = getPrismaClient();
  let projectId: string;

  async function setProject(data: Record<string, unknown>) {
    await prisma.project.update({where: {id: projectId}, data});
  }

  async function getProject() {
    return prisma.project.findUniqueOrThrow({where: {id: projectId}});
  }

  function job(overrides: Record<string, unknown> = {}) {
    return {
      projectId,
      customerId: CUSTOMER,
      currency: 'eur',
      attemptKey: 'cs_test',
      paymentMethodId: 'pm_good',
      ...overrides,
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    await setProject({
      customer: CUSTOMER,
      subscription: SUBSCRIPTION,
      cardVerification: 'PENDING',
      cardVerificationSession: 'cs_test',
    });

    stripeMock.paymentMethods.retrieve.mockImplementation(async (id: string) => card(id));
    stripeMock.paymentIntents.create.mockResolvedValue({id: 'pi_ok', status: 'succeeded'});
    stripeMock.subscriptions.update.mockResolvedValue({id: SUBSCRIPTION, currency: 'eur'});
    stripeMock.invoices.list.mockResolvedValue({data: []});
    stripeMock.customers.retrieve.mockResolvedValue({id: CUSTOMER, balance: 0, email: 'billing@example.com'});
    stripeMock.invoices.create.mockResolvedValue({id: 'in_verification'});
    stripeMock.invoices.voidInvoice.mockResolvedValue({});
  });

  describe('verify', () => {
    it('verifies the card, records its fingerprint and credits the charge once', async () => {
      const outcome = await CardVerificationService.verify(job());

      expect(outcome.status).toBe('verified');
      const project = await getProject();
      expect(project.cardVerification).toBe('VERIFIED');
      expect(project.cardVerificationFingerprint).toBe('fp_pm_good');
      expect(project.disabled).toBe(false);

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({amount: VERIFICATION_AMOUNT, payment_method: 'pm_good', off_session: true}),
        {idempotencyKey: 'card-verification-cs_test'},
      );
      expect(stripeMock.customers.createBalanceTransaction).toHaveBeenCalledWith(
        CUSTOMER,
        expect.objectContaining({amount: -VERIFICATION_AMOUNT, currency: 'eur'}),
        {idempotencyKey: 'card-verification-credit-cs_test'},
      );
    });

    it('treats card_not_supported as a hard decline and pauses without cancelling', async () => {
      stripeMock.paymentIntents.create.mockRejectedValue(cardError({decline_code: 'card_not_supported'}));

      const outcome = await CardVerificationService.verify(job());

      expect(outcome).toMatchObject({status: 'failed', declineCode: 'card_not_supported'});
      const project = await getProject();
      expect(project.cardVerification).toBe('FAILED');
      expect(project.disabled).toBe(true);
      expect(project.disabledReason).toBe('CARD_VERIFICATION_FAILED');
      expect(project.subscription).toBe(SUBSCRIPTION);
      expect(stripeMock.subscriptions.cancel).not.toHaveBeenCalled();
      expect(stripeMock.customers.createBalanceTransaction).not.toHaveBeenCalled();
      expect(emailMock.sendPlatformEmail).toHaveBeenCalledOnce();
    });

    it('rejects a prepaid card without charging it', async () => {
      stripeMock.paymentMethods.retrieve.mockResolvedValue(card('pm_prepaid', {funding: 'prepaid'}));

      const outcome = await CardVerificationService.verify(job({paymentMethodId: 'pm_prepaid'}));

      expect(outcome).toMatchObject({status: 'failed', declineCode: 'prepaid_card'});
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      expect((await getProject()).disabledReason).toBe('CARD_VERIFICATION_FAILED');
    });

    it('treats a Radar block as final even without a hard decline code', async () => {
      stripeMock.paymentIntents.create.mockRejectedValue(cardError({decline_code: 'generic_decline', charge: 'ch_1'}));
      stripeMock.charges.retrieve.mockResolvedValue({outcome: {type: 'blocked'}});

      const outcome = await CardVerificationService.verify(job());

      expect(outcome).toMatchObject({status: 'failed', declineCode: 'blocked_by_radar'});
    });

    it('pauses sending on a soft decline', async () => {
      stripeMock.paymentIntents.create.mockRejectedValue(cardError({decline_code: 'insufficient_funds', charge: 'ch_2'}));
      stripeMock.charges.retrieve.mockResolvedValue({outcome: {type: 'issuer_declined'}});

      const outcome = await CardVerificationService.verify(job());

      expect(outcome).toMatchObject({status: 'requires_action', reason: 'insufficient_funds'});
      const project = await getProject();
      expect(project.cardVerification).toBe('REQUIRES_ACTION');
      expect(project.disabled).toBe(true);
      expect(project.disabledReason).toBe('CARD_VERIFICATION_REQUIRED');
    });

    it('pauses sending when the bank asks for authentication', async () => {
      stripeMock.paymentIntents.create.mockRejectedValue(cardError({code: 'authentication_required'}));

      await CardVerificationService.verify(job());

      expect((await getProject()).disabledReason).toBe('CARD_VERIFICATION_REQUIRED');
    });

    it('resumes sending when a paused project passes on a new card', async () => {
      await setProject({
        disabled: true,
        disabledReason: 'CARD_VERIFICATION_FAILED',
        cardVerificationSession: 'pm_new',
      });

      await CardVerificationService.verify(job({attemptKey: 'pm_new', paymentMethodId: 'pm_new'}));

      const project = await getProject();
      expect(project.disabled).toBe(false);
      expect(project.disabledReason).toBeNull();
      expect(project.cardVerification).toBe('VERIFIED');
    });

    it('never lifts or overwrites a pause it did not set', async () => {
      await setProject({disabled: true, disabledReason: 'PHISHING_DETECTED'});

      await CardVerificationService.verify(job());
      expect((await getProject()).disabledReason).toBe('PHISHING_DETECTED');
      expect((await getProject()).disabled).toBe(true);

      await setProject({cardVerification: 'PENDING', cardVerificationSession: 'pm_bad'});
      stripeMock.paymentIntents.create.mockRejectedValue(cardError({decline_code: 'do_not_honor'}));
      await CardVerificationService.verify(job({attemptKey: 'pm_bad', paymentMethodId: 'pm_bad'}));

      expect((await getProject()).disabledReason).toBe('PHISHING_DETECTED');
      expect(emailMock.sendPlatformEmail).not.toHaveBeenCalled();
    });

    it('skips an attempt that a newer card change superseded', async () => {
      await setProject({cardVerificationSession: 'pm_newer'});

      const outcome = await CardVerificationService.verify(job({attemptKey: 'pm_older', paymentMethodId: 'pm_older'}));

      expect(outcome).toMatchObject({status: 'skipped'});
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });
  });

  describe('verification invoice', () => {
    it('invoices the charge and attaches the payment for a customer without credit', async () => {
      await CardVerificationService.verify(job());

      expect(stripeMock.invoices.create).toHaveBeenCalledWith(
        expect.objectContaining({customer: CUSTOMER, currency: 'eur', auto_advance: false}),
        {idempotencyKey: 'card-verification-invoice-cs_test'},
      );
      expect(stripeMock.invoiceItems.create).toHaveBeenCalledWith(
        expect.objectContaining({invoice: 'in_verification', amount: VERIFICATION_AMOUNT}),
        expect.anything(),
      );
      expect(stripeMock.invoices.attachPayment).toHaveBeenCalledWith(
        'in_verification',
        {payment_intent: 'pi_ok'},
        expect.anything(),
      );
      // Invoiced before the credit lands, so the credit cannot be applied to it.
      expect(stripeMock.invoices.finalizeInvoice.mock.invocationCallOrder[0]).toBeLessThan(
        stripeMock.customers.createBalanceTransaction.mock.invocationCallOrder[0],
      );
    });

    it('sends a receipt instead when the customer already holds credit', async () => {
      stripeMock.customers.retrieve.mockResolvedValue({id: CUSTOMER, balance: -200, email: 'billing@example.com'});

      await CardVerificationService.verify(job());

      expect(stripeMock.invoices.create).not.toHaveBeenCalled();
      expect(stripeMock.paymentIntents.update).toHaveBeenCalledWith('pi_ok', {receipt_email: 'billing@example.com'});
      expect((await getProject()).cardVerification).toBe('VERIFIED');
    });

    it('voids a half-made invoice and still records the verdict', async () => {
      stripeMock.invoices.attachPayment.mockRejectedValue(new Error('attach failed'));

      const outcome = await CardVerificationService.verify(job());

      expect(outcome.status).toBe('verified');
      expect(stripeMock.invoices.voidInvoice).toHaveBeenCalledWith('in_verification');
      expect(stripeMock.customers.createBalanceTransaction).toHaveBeenCalled();
    });

    it('does not invoice a declined charge', async () => {
      stripeMock.paymentIntents.create.mockRejectedValue(cardError({decline_code: 'do_not_honor'}));

      await CardVerificationService.verify(job());

      expect(stripeMock.invoices.create).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentMethodChange', () => {
    beforeEach(async () => {
      await setProject({
        cardVerification: 'VERIFIED',
        cardVerificationPaymentMethod: 'pm_good',
        cardVerificationFingerprint: 'fp_pm_good',
      });
    });

    it('re-verifies a different card and pins it on the subscription', async () => {
      await CardVerificationService.handlePaymentMethodChange(CUSTOMER, 'pm_other');

      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(SUBSCRIPTION, {default_payment_method: 'pm_other'});
      expect(queueMock.queueCardVerification).toHaveBeenCalledWith(
        expect.objectContaining({attemptKey: 'pm_other', paymentMethodId: 'pm_other', currency: 'eur'}),
      );
      const project = await getProject();
      expect(project.cardVerification).toBe('PENDING');
      expect(project.cardVerificationSession).toBe('pm_other');
    });

    it('does not charge again for the same card re-added under a new id', async () => {
      stripeMock.paymentMethods.retrieve.mockResolvedValue(card('pm_readded', {fingerprint: 'fp_pm_good'}));

      await CardVerificationService.handlePaymentMethodChange(CUSTOMER, 'pm_readded');

      expect(queueMock.queueCardVerification).not.toHaveBeenCalled();
      expect((await getProject()).cardVerification).toBe('VERIFIED');
    });

    it('acts once when one card change fires several webhooks', async () => {
      await CardVerificationService.handlePaymentMethodChange(CUSTOMER, 'pm_other');
      await CardVerificationService.handlePaymentMethodChange(CUSTOMER, 'pm_other');

      expect(queueMock.queueCardVerification).toHaveBeenCalledOnce();
      expect(stripeMock.subscriptions.update).toHaveBeenCalledOnce();
    });

    it('pays outstanding invoices on the new card for a project paused for a failed payment', async () => {
      await setProject({disabled: true, disabledReason: 'PAYMENT_FAILED'});
      stripeMock.invoices.list.mockImplementation(async ({status}: {status: string}) => ({
        data:
          status === 'open'
            ? [
                {id: 'in_1', amount_remaining: 1234, metadata: {}},
                {id: 'in_leftover', amount_remaining: 200, metadata: {plunk_purpose: 'card_verification'}},
              ]
            : [],
      }));

      await CardVerificationService.handlePaymentMethodChange(CUSTOMER, 'pm_other');

      expect(stripeMock.invoices.pay).toHaveBeenCalledWith('in_1', {payment_method: 'pm_other', off_session: true});
      // A verification invoice left behind is not debt and is never charged.
      expect(stripeMock.invoices.pay).toHaveBeenCalledOnce();
      expect(queueMock.queueCardVerification).not.toHaveBeenCalled();
    });

    it('ignores customers without a subscription', async () => {
      await setProject({subscription: null});

      await CardVerificationService.handlePaymentMethodChange(CUSTOMER, 'pm_other');

      expect(stripeMock.subscriptions.update).not.toHaveBeenCalled();
      expect(queueMock.queueCardVerification).not.toHaveBeenCalled();
    });
  });
});

import type {Request, Response} from 'express';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {EmailStatus} from '@plunk/db';

import {redis} from '../../database/redis';
import {CampaignService} from '../../services/CampaignService';
import {ContactService} from '../../services/ContactService';
import {Keys} from '../../services/keys';
import {NtfyService} from '../../services/NtfyService';
import {SecurityService} from '../../services/SecurityService';
import {getAwsAccountId} from '../../services/SESService';
import {Webhooks} from '../Webhooks';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// The account the SES credentials belong to, normally looked up through STS
vi.mock('../../services/SESService', async importOriginal => ({
  ...(await importOriginal<typeof import('../../services/SESService')>()),
  getAwsAccountId: vi.fn(),
}));

const OWN_TOPIC = 'arn:aws:sns:eu-north-1:111111111111:plunk-ses-events';
const FOREIGN_TOPIC = 'arn:aws:sns:eu-north-1:999999999999:plunk-ses-events';

/**
 * The SES event webhook, which is the only path that records delivery, opens, clicks, bounces
 * and complaints.
 *
 * It had no test coverage at all, while a second implementation of the same logic
 * (`EmailService.handleWebhookEvent`) had a thorough suite and no caller. That is how a campaign
 * came to report `delivered 0 · opened 0 · clicked 0 · bounced 0` across 3,086 recipients whose
 * email rows carried every one of those events: the tested code was not the running code. These
 * tests are aimed at the handler Express actually invokes.
 */
describe('Webhooks - SES event notifications', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let contactId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    const contact = await factories.createContact({projectId, subscribed: true});
    contactId = contact.id;

    // The signature is AWS's to produce; every test here is about what happens after it checks
    // out. The rejection path is covered separately below.
    vi.spyOn(SecurityService, 'verifySnsSignature').mockResolvedValue(true);
    vi.mocked(getAwsAccountId).mockResolvedValue('111111111111');

    // One Redis key holds the dirty set for the whole worker, so an id left behind by an
    // earlier test would be swept by a later one and make its count wrong.
    await redis.del(Keys.Campaign.statsDirty());
  });

  /**
   * Minimal Express response double.
   *
   * `sent` is the completion signal and tests must await it rather than the handler call: the
   * `CatchAsync` decorator does not return the promise it creates, so awaiting a decorated
   * method resolves before any of its async work has run.
   */
  function mockResponse() {
    const captured = {status: 200, body: undefined as unknown};

    let markSent: () => void;
    const sent = new Promise<void>(resolve => {
      markSent = resolve;
    });

    const res = {
      status(code: number) {
        captured.status = code;
        return this;
      },
      json(body: unknown) {
        captured.body = body;
        markSent();
        return this;
      },
    } as unknown as Response;

    return {res, captured, sent};
  }

  /** Deliver one SNS message as posted to the webhook. */
  async function postSns(body: Record<string, unknown>) {
    const {res, captured, sent} = mockResponse();
    const req = {body, get: () => undefined, headers: {}} as unknown as Request;

    await new Webhooks().receiveSNSWebhook(req, res);
    await sent;

    return captured;
  }

  /** Deliver one SES event notification, shaped the way SNS posts it. */
  async function post(event: Record<string, unknown>, topicArn = OWN_TOPIC) {
    return postSns({Type: 'Notification', TopicArn: topicArn, Message: JSON.stringify(event)});
  }

  const notification = (eventType: string, messageId: string, extra: Record<string, unknown> = {}) => ({
    eventType,
    mail: {messageId, timestamp: new Date().toISOString()},
    ...extra,
  });

  async function sentEmail(messageId: string, campaignId?: string) {
    return prisma.email.create({
      data: {
        projectId,
        contactId,
        campaignId: campaignId ?? null,
        subject: 'Product update',
        body: '<p>news</p>',
        from: 'hello@plunk.test',
        sourceType: campaignId ? 'CAMPAIGN' : 'TRANSACTIONAL',
        status: EmailStatus.SENT,
        sentAt: new Date(),
        messageId,
      },
    });
  }

  describe('email row transitions', () => {
    it('stamps a delivery', async () => {
      const email = await sentEmail('ses-delivery-1');

      const captured = await post(notification('Delivery', 'ses-delivery-1'));
      expect(captured.status).toBe(200);

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.DELIVERED);
      expect(updated?.deliveredAt).not.toBeNull();
    });

    it('stamps a first open', async () => {
      const email = await sentEmail('ses-open-1');

      await post(notification('Open', 'ses-open-1'));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.OPENED);
      expect(updated?.openedAt).not.toBeNull();
      expect(updated?.opens).toBe(1);
    });

    it('counts a second open without moving openedAt', async () => {
      const email = await sentEmail('ses-open-2');

      await post(notification('Open', 'ses-open-2'));
      const firstOpen = (await prisma.email.findUnique({where: {id: email.id}}))?.openedAt;
      await post(notification('Open', 'ses-open-2'));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.opens).toBe(2);
      expect(updated?.openedAt).toEqual(firstOpen);
    });

    it('stamps a click and keeps the link', async () => {
      const email = await sentEmail('ses-click-1');

      await post(notification('Click', 'ses-click-1', {click: {link: 'https://example.com/pricing'}}));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.CLICKED);
      expect(updated?.clickedAt).not.toBeNull();
      expect(updated?.clicks).toBe(1);

      const event = await prisma.event.findFirst({
        where: {emailId: email.id, name: 'email.click'},
      });
      expect((event?.data as {link?: string} | null)?.link).toBe('https://example.com/pricing');
    });

    it('bounces and unsubscribes the contact on a permanent bounce', async () => {
      const email = await sentEmail('ses-bounce-1');

      await post(notification('Bounce', 'ses-bounce-1', {bounce: {bounceType: 'Permanent'}}));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.BOUNCED);
      expect(updated?.bouncedAt).not.toBeNull();

      const contact = await prisma.contact.findUnique({where: {id: contactId}});
      expect(contact?.subscribed).toBe(false);
    });

    /**
     * The interaction that makes snoozing safe.
     *
     * A snooze is `subscribed = false` plus a date, and a sweep resubscribes the contact once
     * that date passes. If a suppression left the date in place, the sweep would resurrect a
     * hard-bounced address weeks later and mail it again -- exactly the reputation damage
     * suppression exists to prevent. The bounce has to take the snooze with it.
     */
    it('clears a snooze on a permanent bounce, so the sweep cannot resurrect the address', async () => {
      await sentEmail('ses-bounce-snoozed');
      await ContactService.snooze(contactId, '2_weeks');

      await post(notification('Bounce', 'ses-bounce-snoozed', {bounce: {bounceType: 'Permanent'}}));

      const contact = await prisma.contact.findUnique({where: {id: contactId}});
      expect(contact?.subscribed).toBe(false);
      expect(contact?.snoozedUntil).toBeNull();

      // Belt and braces: even with the clock wound past the original window, nothing is woken.
      expect(await ContactService.resumeExpiredSnoozes()).toBe(0);
    });

    it('clears a snooze on a complaint for the same reason', async () => {
      await sentEmail('ses-complaint-snoozed');
      await ContactService.snooze(contactId, '2_weeks');

      await post(notification('Complaint', 'ses-complaint-snoozed'));

      const contact = await prisma.contact.findUnique({where: {id: contactId}});
      expect(contact?.subscribed).toBe(false);
      expect(contact?.snoozedUntil).toBeNull();
    });

    /**
     * A transient bounce is an out-of-office or a full mailbox, not a dead address. It must not
     * suppress the contact, and it must not count toward the bounce rate SES enforcement
     * watches.
     */
    it('leaves the row and the contact alone on a transient bounce', async () => {
      const email = await sentEmail('ses-bounce-2');

      await post(notification('Bounce', 'ses-bounce-2', {bounce: {bounceType: 'Transient'}}));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.SENT);
      expect(updated?.bouncedAt).toBeNull();

      const contact = await prisma.contact.findUnique({where: {id: contactId}});
      expect(contact?.subscribed).toBe(true);
    });

    it('records a complaint and unsubscribes the contact', async () => {
      const email = await sentEmail('ses-complaint-1');

      await post(notification('Complaint', 'ses-complaint-1'));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.COMPLAINED);
      expect(updated?.complainedAt).not.toBeNull();

      const contact = await prisma.contact.findUnique({where: {id: contactId}});
      expect(contact?.subscribed).toBe(false);
    });
  });

  describe('campaign counters', () => {
    /**
     * The regression this suite exists for. Almost every open and click lands after the campaign
     * has finalized, and `finalizeIfDone` returns early once the campaign is SENT -- so if the
     * webhook does not mark the campaign, nothing ever recounts it and the stats endpoint reports
     * zeros over email rows full of events.
     */
    it('reconciles a finalized campaign after the sweep', async () => {
      const campaign = await factories.createCampaign({projectId, name: 'Finalized', status: 'SENT'});
      await sentEmail('ses-campaign-1', campaign.id);
      await prisma.campaign.update({where: {id: campaign.id}, data: {sentCount: 1}});

      await post(notification('Delivery', 'ses-campaign-1'));
      await post(notification('Open', 'ses-campaign-1'));

      // Not yet: the webhook only marks the campaign, it does not do the arithmetic.
      const beforeSweep = await prisma.campaign.findUnique({where: {id: campaign.id}});
      expect(beforeSweep?.deliveredCount).toBe(0);
      expect(beforeSweep?.openedCount).toBe(0);

      expect(await CampaignService.sweepDirtyStats(100)).toBeGreaterThan(0);

      const stats = await CampaignService.getStats(projectId, campaign.id);
      expect(stats.deliveredCount).toBe(1);
      expect(stats.openedCount).toBe(1);
      expect(stats.deliveryRate).toBe(100);
    });

    /**
     * SES delivers at least once, so the same event can arrive twice. The counters are recounted
     * rather than incremented precisely so that this cannot inflate them past `sentCount` and put
     * the delivery rate over 100%.
     */
    it('counts a replayed event once', async () => {
      const campaign = await factories.createCampaign({projectId, name: 'Replayed', status: 'SENT'});
      await sentEmail('ses-campaign-2', campaign.id);
      await prisma.campaign.update({where: {id: campaign.id}, data: {sentCount: 1}});

      await post(notification('Delivery', 'ses-campaign-2'));
      await post(notification('Delivery', 'ses-campaign-2'));
      await CampaignService.sweepDirtyStats(100);

      const stats = await CampaignService.getStats(projectId, campaign.id);
      expect(stats.deliveredCount).toBe(1);
      expect(stats.deliveryRate).toBe(100);
    });

    it('does not mark a transactional email', async () => {
      await sentEmail('ses-transactional-1');

      await post(notification('Delivery', 'ses-transactional-1'));

      expect(await CampaignService.sweepDirtyStats(100)).toBe(0);
    });
  });

  /**
   * A valid signature only proves AWS delivered a message. Anyone can create a topic in their
   * own AWS account, subscribe this webhook to it and publish SES-shaped events, which AWS then
   * signs. Only topics in the account Plunk sends from may be trusted.
   */
  describe('SNS topic origin', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const inbound = (sender: string, recipient: string) => ({
      notificationType: 'Received',
      mail: {source: sender, messageId: 'inbound-1', commonHeaders: {subject: 'Hello'}},
      receipt: {recipients: [recipient]},
    });

    it('rejects an event from a topic in another AWS account', async () => {
      const email = await sentEmail('ses-foreign-1');

      const captured = await post(notification('Complaint', 'ses-foreign-1'), FOREIGN_TOPIC);

      expect(captured.status).toBe(403);
      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.complainedAt).toBeNull();
      const contact = await prisma.contact.findUnique({where: {id: contactId}});
      expect(contact?.subscribed).toBe(true);
      expect(await prisma.event.count({where: {emailId: email.id}})).toBe(0);
    });

    it('rejects a forged inbound email from another account, so no contact is created or resubscribed', async () => {
      await factories.createDomain({projectId, domain: 'acme-inbound.test'});
      const unsubscribed = await factories.createContact({
        projectId,
        email: 'opted-out@example.test',
        subscribed: false,
      });

      const forged = await post(inbound('injected@example.test', 'hello@acme-inbound.test'), FOREIGN_TOPIC);
      const resubscribe = await post(inbound(unsubscribed.email, 'hello@acme-inbound.test'), FOREIGN_TOPIC);

      expect(forged.status).toBe(403);
      expect(resubscribe.status).toBe(403);
      expect(await prisma.contact.findFirst({where: {projectId, email: 'injected@example.test'}})).toBeNull();
      expect((await prisma.contact.findUnique({where: {id: unsubscribed.id}}))?.subscribed).toBe(false);
      expect(await prisma.email.count({where: {projectId, sourceType: 'INBOUND'}})).toBe(0);
    });

    it('still processes an inbound email from its own account', async () => {
      await factories.createDomain({projectId, domain: 'acme-inbound.test'});

      const captured = await post(inbound('customer@example.test', 'hello@acme-inbound.test'));

      expect(captured.status).toBe(200);
      expect(await prisma.contact.findFirst({where: {projectId, email: 'customer@example.test'}})).not.toBeNull();
      expect(await prisma.email.count({where: {projectId, sourceType: 'INBOUND'}})).toBe(1);
    });

    it('does not confirm a subscription to a topic in another account', async () => {
      const confirm = vi.fn().mockResolvedValue({ok: true});
      vi.stubGlobal('fetch', confirm);

      const captured = await postSns({
        Type: 'SubscriptionConfirmation',
        TopicArn: FOREIGN_TOPIC,
        SubscribeURL: 'https://sns.eu-north-1.amazonaws.com/?Action=ConfirmSubscription&Token=abc',
      });

      expect(captured.status).toBe(403);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('confirms a subscription to a topic in its own account', async () => {
      const confirm = vi.fn().mockResolvedValue({ok: true});
      vi.stubGlobal('fetch', confirm);

      const captured = await postSns({
        Type: 'SubscriptionConfirmation',
        TopicArn: OWN_TOPIC,
        SubscribeURL: 'https://sns.eu-north-1.amazonaws.com/?Action=ConfirmSubscription&Token=abc',
      });

      expect(captured.status).toBe(200);
      expect(confirm).toHaveBeenCalledOnce();
    });

    it('rejects a message without a topic ARN', async () => {
      const email = await sentEmail('ses-no-topic-1');

      const captured = await postSns({
        Type: 'Notification',
        Message: JSON.stringify(notification('Delivery', 'ses-no-topic-1')),
      });

      expect(captured.status).toBe(403);
      expect((await prisma.email.findUnique({where: {id: email.id}}))?.deliveredAt).toBeNull();
    });

    it('asks SNS to retry when the account cannot be looked up, then processes the redelivery', async () => {
      const email = await sentEmail('ses-lookup-down-1');
      vi.mocked(getAwsAccountId).mockRejectedValueOnce(new Error('STS unreachable'));

      const failed = await post(notification('Delivery', 'ses-lookup-down-1'));

      // 5xx, not 4xx: SNS retries server errors, so the genuine event is not lost
      expect(failed.status).toBe(503);
      expect((await prisma.email.findUnique({where: {id: email.id}}))?.deliveredAt).toBeNull();

      const redelivered = await post(notification('Delivery', 'ses-lookup-down-1'));

      expect(redelivered.status).toBe(200);
      expect((await prisma.email.findUnique({where: {id: email.id}}))?.deliveredAt).not.toBeNull();
    });
  });

  describe('rejected and unmatched events', () => {
    it('rejects a notification whose signature does not verify', async () => {
      vi.spyOn(SecurityService, 'verifySnsSignature').mockResolvedValue(false);
      const email = await sentEmail('ses-unsigned-1');

      const captured = await post(notification('Delivery', 'ses-unsigned-1'));

      expect(captured.status).toBe(403);
      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.deliveredAt).toBeNull();
    });

    it('404s an event for a messageId it does not know', async () => {
      const captured = await post(notification('Delivery', 'ses-never-sent'));

      expect(captured.status).toBe(404);
    });
  });
  /**
   * Mail addressed to `@simulator.amazonses.com` is how AWS documents rehearsing bounce and
   * complaint handling. It never leaves AWS, and AWS keeps it out of its own bounce rates,
   * complaint rates, quotas and reputation metrics -- so Plunk treating a simulated bounce
   * as a reputation event meant a sender testing their integration could warn or disable
   * their own project. The event itself is still fully processed; only the enforcement and
   * the operator alert are skipped.
   */
  describe('SES mailbox simulator', () => {
    // These tests spy on the two services the handler is supposed to *not* call, and the
    // suite configures no automatic mock restoration -- so without this, a later test in
    // this file would inherit a SecurityService whose enforcement is a no-op and would
    // pass whether or not the handler still enforces.
    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function simulatedEmail(messageId: string) {
      const email = await sentEmail(messageId);
      return prisma.email.update({where: {id: email.id}, data: {simulated: true}});
    }

    it('processes a simulated bounce without enforcing security limits', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      const notify = vi.spyOn(NtfyService, 'notifyEmailBounce').mockResolvedValue(undefined);
      const email = await simulatedEmail('ses-simulated-bounce');

      await post(notification('Bounce', 'ses-simulated-bounce', {bounce: {bounceType: 'Permanent'}}));

      // Everything the activity feed and the suppression list read is still written.
      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.BOUNCED);
      expect(updated?.bouncedAt).not.toBeNull();

      const contact = await prisma.contact.findUnique({where: {id: contactId}});
      expect(contact?.subscribed).toBe(false);

      // The tracked event is what fires the customer's own webhooks and workflows.
      const event = await prisma.event.findFirst({where: {emailId: email.id, name: 'email.bounce'}});
      expect(event).not.toBeNull();

      expect(enforce).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
    });

    it('processes a simulated complaint without enforcing security limits', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      const notify = vi.spyOn(NtfyService, 'notifyEmailComplaint').mockResolvedValue(undefined);
      const email = await simulatedEmail('ses-simulated-complaint');

      await post(notification('Complaint', 'ses-simulated-complaint'));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.COMPLAINED);
      expect(updated?.complainedAt).not.toBeNull();

      const event = await prisma.event.findFirst({where: {emailId: email.id, name: 'email.complaint'}});
      expect(event).not.toBeNull();

      expect(enforce).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
    });

    it('still enforces on a real bounce', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      await sentEmail('ses-real-bounce');

      await post(notification('Bounce', 'ses-real-bounce', {bounce: {bounceType: 'Permanent'}}));

      expect(enforce).toHaveBeenCalledWith(projectId, 'bounce');
    });
  });

  /**
   * SNS delivers at least once, so the same bounce or complaint notification arrives again
   * hours or days later. Reputation enforcement reads the rates by counting `bouncedAt` and
   * `complainedAt` rows, so a second copy of an old event leaves every number unchanged --
   * running the check on it could only re-disable a project over history it had already been
   * judged against. That is what re-disabled a manually re-enabled project whose complaint
   * count had not moved.
   */
  describe('duplicate SNS deliveries', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not re-enforce or re-alert on a redelivered complaint', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      const notify = vi.spyOn(NtfyService, 'notifyEmailComplaint').mockResolvedValue(undefined);
      const email = await sentEmail('ses-dup-complaint');

      await post(notification('Complaint', 'ses-dup-complaint'));
      const first = await prisma.email.findUnique({where: {id: email.id}});

      await post(notification('Complaint', 'ses-dup-complaint'));
      const second = await prisma.email.findUnique({where: {id: email.id}});

      expect(enforce).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledTimes(1);
      // The complaint happened once; the timestamp must not walk forward into a window it
      // does not belong to, or the 24-hour and 7-day rates count it again later.
      expect(second?.complainedAt).toEqual(first?.complainedAt);
    });

    it('does not re-enforce or re-alert on a redelivered permanent bounce', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      const notify = vi.spyOn(NtfyService, 'notifyEmailBounce').mockResolvedValue(undefined);
      const email = await sentEmail('ses-dup-bounce');
      const bounce = {bounce: {bounceType: 'Permanent'}};

      await post(notification('Bounce', 'ses-dup-bounce', bounce));
      const first = await prisma.email.findUnique({where: {id: email.id}});

      await post(notification('Bounce', 'ses-dup-bounce', bounce));
      const second = await prisma.email.findUnique({where: {id: email.id}});

      expect(enforce).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledTimes(1);
      expect(second?.bouncedAt).toEqual(first?.bouncedAt);
    });

    it('enforces on a complaint for an email that had already hard bounced', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      await sentEmail('ses-bounce-then-complaint');

      await post(notification('Bounce', 'ses-bounce-then-complaint', {bounce: {bounceType: 'Permanent'}}));
      await post(notification('Complaint', 'ses-bounce-then-complaint'));

      // Two distinct suppressions on one email. The complaint is new even though the bounce
      // was not, so it has to be counted -- and judged as a complaint, not as a bounce.
      expect(enforce).toHaveBeenCalledTimes(2);
      expect(enforce).toHaveBeenNthCalledWith(1, projectId, 'bounce');
      expect(enforce).toHaveBeenNthCalledWith(2, projectId, 'complaint');
    });

    it('suppresses an unknown bounce type without enforcing on it', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      const email = await sentEmail('ses-unknown-bounce');

      await post(notification('Bounce', 'ses-unknown-bounce', {bounce: {bounceType: 'Undetermined'}}));

      // An unclassifiable bounce is suppressed to be safe, but it is the one case where the
      // classification is a guess, so it must not be able to disable a project.
      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.bouncedAt).not.toBeNull();
      expect(enforce).not.toHaveBeenCalled();
    });

    it('does not enforce on a transient bounce', async () => {
      const enforce = vi.spyOn(SecurityService, 'checkAndEnforceSecurityLimits').mockResolvedValue();
      await sentEmail('ses-transient-bounce');

      await post(notification('Bounce', 'ses-transient-bounce', {bounce: {bounceType: 'Transient'}}));

      expect(enforce).not.toHaveBeenCalled();
    });
  });

  /**
   * Mail providers fetch the tracking pixel on their own, and SES marks those fetches. These are
   * the fetches measured against a Gmail inbox: Gmail's servers took the pixel about two seconds
   * after sending ("Likely"), and the reader's open came later through Google's image proxy, or
   * Apple's when reading in Apple Mail ("Unlikely").
   */
  describe('automatic opens', () => {
    const AUTOMATIC = {
      isBotEvent: 'Likely',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246 Mozilla/5.0',
    };
    const PEOPLE = {
      'Gmail web': {
        isBotEvent: 'Unlikely',
        userAgent: 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)',
      },
      'Apple Mail': {isBotEvent: 'Unlikely', userAgent: 'Mozilla/5.0'},
    };
    const HUMAN = PEOPLE['Gmail web'];

    const open = (messageId: string, mark: typeof AUTOMATIC) =>
      notification('Open', messageId, {open: {...mark, timestamp: new Date().toISOString()}});

    it('writes nothing for an open SES marks as automated', async () => {
      const campaign = await factories.createCampaign({projectId, name: 'Gmail', status: 'SENT'});
      const email = await sentEmail('ses-automatic-1', campaign.id);

      const captured = await post(open('ses-automatic-1', AUTOMATIC));
      expect(captured.status).toBe(200);

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.SENT);
      expect(updated?.openedAt).toBeNull();
      expect(updated?.opens).toBe(0);
      expect(await prisma.event.findFirst({where: {emailId: email.id, name: 'email.open'}})).toBeNull();
      expect(await CampaignService.sweepDirtyStats(100)).toBe(0);
    });

    it.each(Object.entries(PEOPLE))('counts an open SES marks as made by a person (%s)', async (client, mark) => {
      const messageId = `ses-human-${client.replace(' ', '-')}`;
      const email = await sentEmail(messageId);

      await post(open(messageId, mark));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.OPENED);
      expect(updated?.openedAt).not.toBeNull();
      expect(updated?.opens).toBe(1);
      const events = await prisma.event.findMany({where: {emailId: email.id, name: 'email.open'}});
      expect(events).toHaveLength(1);
      expect((events[0]?.data as {isFirstOpen?: boolean} | null)?.isFirstOpen).toBe(true);
    });

    it("counts the reader's open after the automatic fetch as the first one", async () => {
      const email = await sentEmail('ses-automatic-2');

      await post(open('ses-automatic-2', AUTOMATIC));
      await post(open('ses-automatic-2', HUMAN));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.opens).toBe(1);
      const events = await prisma.event.findMany({where: {emailId: email.id, name: 'email.open'}});
      expect(events).toHaveLength(1);
      expect((events[0]?.data as {isFirstOpen?: boolean} | null)?.isFirstOpen).toBe(true);
    });

    it('ignores a redelivered automatic open as well', async () => {
      const email = await sentEmail('ses-automatic-3');

      await post(open('ses-automatic-3', AUTOMATIC));
      await post(open('ses-automatic-3', AUTOMATIC));

      const updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.SENT);
      expect(updated?.openedAt).toBeNull();
      expect(updated?.opens).toBe(0);
      expect(await prisma.event.count({where: {emailId: email.id, name: 'email.open'}})).toBe(0);
    });
  });
});

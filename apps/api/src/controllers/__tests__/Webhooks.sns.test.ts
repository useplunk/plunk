import type {Request, Response} from 'express';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {EmailStatus} from '@plunk/db';

import {redis} from '../../database/redis';
import {CampaignService} from '../../services/CampaignService';
import {ContactService} from '../../services/ContactService';
import {Keys} from '../../services/keys';
import {NtfyService} from '../../services/NtfyService';
import {SecurityService} from '../../services/SecurityService';
import {Webhooks} from '../Webhooks';
import {factories, getPrismaClient} from '../../../../../test/helpers';

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

  /** Deliver one SES event notification, shaped the way SNS posts it. */
  async function post(event: Record<string, unknown>) {
    const {res, captured, sent} = mockResponse();
    const req = {
      body: {Type: 'Notification', Message: JSON.stringify(event)},
      get: () => undefined,
      headers: {},
    } as unknown as Request;

    await new Webhooks().receiveSNSWebhook(req, res);
    await sent;

    return captured;
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

      expect(enforce).toHaveBeenCalledWith(projectId);
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
      // was not, so it has to be counted.
      expect(enforce).toHaveBeenCalledTimes(2);
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
});

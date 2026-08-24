import type {Prisma} from '@plunk/db';
import {beforeEach, describe, expect, it} from 'vitest';
import {redis} from '../../database/redis';
import {CampaignService} from '../CampaignService';
import {Keys} from '../keys';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * The campaign counters are materialized and never recomputed on read, so every property that
 * used to be covered by the recompute has to hold on its own: an event must not be counted
 * twice, an event that arrives after the send finalizes must still land, and there must be a
 * path that repairs a counter that drifted.
 *
 * The counters are recounted from the email rows rather than incremented, which is what makes
 * the first of those free -- SES delivers at least once, and a count cannot be inflated by a
 * replay.
 */
describe('CampaignService - stats counters', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let campaignId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    const campaign = await factories.createCampaign({projectId, name: 'Counters'});
    campaignId = campaign.id;

    // One Redis key holds the dirty set for the whole worker, so an id left behind by an
    // earlier test would be swept by a later one and make its drain count wrong.
    await redis.del(Keys.Campaign.statsDirty());
  });

  async function sendTo(email: string) {
    const contact = await factories.createContact({projectId, email, subscribed: true});
    return prisma.email.create({
      data: {
        projectId,
        contactId: contact.id,
        campaignId,
        subject: 'Counters',
        body: '<p>x</p>',
        from: 'hello@plunk.test',
        sourceType: 'CAMPAIGN',
        sentAt: new Date(),
      },
    });
  }

  /**
   * One SES event as the webhook applies it: stamp the email row and mark the campaign. The
   * sweep is left to the caller, so tests can assert on the window between the two.
   */
  const EVENT_STAMPS: Record<string, Prisma.EmailUpdateInput> = {
    delivered: {status: 'DELIVERED', deliveredAt: new Date()},
    opened: {status: 'OPENED', openedAt: new Date()},
    clicked: {status: 'CLICKED', clickedAt: new Date()},
    bounced: {status: 'BOUNCED', bouncedAt: new Date()},
    complained: {status: 'COMPLAINED', complainedAt: new Date()},
  };

  async function receiveEvent(emailId: string, eventType: keyof typeof EVENT_STAMPS | string) {
    const stamp = EVENT_STAMPS[eventType];
    if (!stamp) {
      throw new Error(`Unknown event type ${eventType}`);
    }

    // First-event only, exactly as the webhook guards it: a replay must not move the timestamp.
    const email = await prisma.email.findUniqueOrThrow({where: {id: emailId}});
    const already =
      (eventType === 'delivered' && email.deliveredAt) ||
      (eventType === 'opened' && email.openedAt) ||
      (eventType === 'clicked' && email.clickedAt) ||
      (eventType === 'bounced' && email.bouncedAt) ||
      (eventType === 'complained' && email.complainedAt);

    if (!already) {
      await prisma.email.update({where: {id: emailId}, data: stamp});
    }

    await CampaignService.markStatsDirty(campaignId);
  }

  /**
   * SES delivers notifications at least once, so the same event can arrive twice. A counter that
   * went past `sentCount` would put the delivery rate over 100%.
   */
  describe('replayed events', () => {
    it.each(['delivered', 'opened', 'clicked', 'bounced', 'complained'] as const)(
      'counts a replayed %s once',
      async eventType => {
        const email = await sendTo(`${eventType}@example.com`);

        await receiveEvent(email.id, eventType);
        await receiveEvent(email.id, eventType);
        await CampaignService.sweepDirtyStats(10);

        const campaign = await prisma.campaign.findUnique({
          where: {id: campaignId},
          select: {
            deliveredCount: true,
            openedCount: true,
            clickedCount: true,
            bouncedCount: true,
            complainedCount: true,
          },
        });

        const counts = {
          delivered: campaign?.deliveredCount,
          opened: campaign?.openedCount,
          clicked: campaign?.clickedCount,
          bounced: campaign?.bouncedCount,
          complained: campaign?.complainedCount,
        };
        expect(counts[eventType]).toBe(1);
      },
    );

    it('never reports a delivery rate above 100%', async () => {
      const first = await sendTo('r1@example.com');
      const second = await sendTo('r2@example.com');
      await prisma.campaign.update({where: {id: campaignId}, data: {sentCount: 2}});

      for (const email of [first, second]) {
        await receiveEvent(email.id, 'delivered');
        await receiveEvent(email.id, 'delivered');
      }
      await CampaignService.sweepDirtyStats(10);

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.deliveredCount).toBe(2);
      expect(stats.deliveryRate).toBe(100);
    });
  });

  /**
   * The regression that produced a campaign reporting nothing at all. Opens and clicks arrive
   * for days after a send finalizes, and `finalizeIfDone` will not run again once the campaign
   * is SENT -- so the sweep is the only thing that can still move these counters.
   */
  describe('events after the send finalizes', () => {
    beforeEach(async () => {
      await prisma.campaign.update({
        where: {id: campaignId},
        data: {status: 'SENT', sentCount: 1, totalRecipients: 1},
      });
    });

    it('counts an open that arrives after finalization', async () => {
      const email = await sendTo('late@example.com');

      await receiveEvent(email.id, 'delivered');
      await receiveEvent(email.id, 'opened');
      await CampaignService.sweepDirtyStats(10);

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.deliveredCount).toBe(1);
      expect(stats.openedCount).toBe(1);
      expect(stats.openRate).toBe(100);
    });

    it('leaves the counters behind until the sweep runs', async () => {
      const email = await sendTo('pending@example.com');

      await receiveEvent(email.id, 'delivered');

      expect((await CampaignService.getStats(projectId, campaignId)).deliveredCount).toBe(0);

      await CampaignService.sweepDirtyStats(10);

      expect((await CampaignService.getStats(projectId, campaignId)).deliveredCount).toBe(1);
    });

    it('drains the dirty set, so a campaign with no new events is not recounted', async () => {
      const email = await sendTo('once@example.com');
      await receiveEvent(email.id, 'delivered');

      expect(await CampaignService.sweepDirtyStats(10)).toBe(1);
      expect(await CampaignService.sweepDirtyStats(10)).toBe(0);
    });
  });

  /**
   * While a campaign is in flight, sent progress lives in Redis rather than as a per-recipient
   * increment on the campaign row, which would serialize every send on one row and leave a dead
   * tuple per email.
   */
  describe('live sent progress', () => {
    beforeEach(async () => {
      await prisma.campaign.update({where: {id: campaignId}, data: {status: 'SENDING'}});
    });

    it('reports progress while the campaign is sending', async () => {
      await CampaignService.countCampaignSent(campaignId);
      await CampaignService.countCampaignSent(campaignId);

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.sentCount).toBe(2);
    });

    it('does not touch the campaign row while sending', async () => {
      await CampaignService.countCampaignSent(campaignId);

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {sentCount: true}});
      expect(campaign?.sentCount).toBe(0);
    });

    it('folds progress into the row on reconcile, without double counting', async () => {
      await sendTo('p1@example.com');
      await sendTo('p2@example.com');
      await CampaignService.countCampaignSent(campaignId);
      await CampaignService.countCampaignSent(campaignId);

      await CampaignService.reconcileStats(campaignId, {foldSentProgress: true});
      await prisma.campaign.update({where: {id: campaignId}, data: {status: 'SENT'}});

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {sentCount: true}});
      expect(campaign?.sentCount).toBe(2);
      expect((await CampaignService.getStats(projectId, campaignId)).sentCount).toBe(2);
    });

    /**
     * A sweep that ran mid-send must not settle `sentCount` against the Redis delta: the row
     * count and the delta move independently while the send is running, so writing the total and
     * dropping the key would lose every send that landed in between and walk the number
     * backwards. Only finalization folds them together.
     */
    it('leaves sent progress alone when the sweep reconciles a sending campaign', async () => {
      const email = await sendTo('inflight@example.com');
      await CampaignService.countCampaignSent(campaignId);

      await receiveEvent(email.id, 'delivered');
      await CampaignService.sweepDirtyStats(10);

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.sentCount).toBe(1);
      expect(stats.deliveredCount).toBe(1);

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {sentCount: true}});
      expect(campaign?.sentCount).toBe(0);
    });
  });

  /**
   * The repair path. It runs when a send finalizes and then from the sweep as events arrive --
   * never on read, which is what made the stats endpoint slow.
   */
  describe('reconcileStats', () => {
    it('rebuilds every counter from the emails', async () => {
      const first = await sendTo('x1@example.com');
      const second = await sendTo('x2@example.com');
      const third = await sendTo('x3@example.com');

      await receiveEvent(first.id, 'delivered');
      await receiveEvent(first.id, 'opened');
      await receiveEvent(second.id, 'delivered');
      await receiveEvent(third.id, 'bounced');

      await prisma.campaign.update({
        where: {id: campaignId},
        data: {sentCount: 999, deliveredCount: 0, openedCount: 42, bouncedCount: 7},
      });

      await CampaignService.reconcileStats(campaignId, {foldSentProgress: true});

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.sentCount).toBe(3);
      expect(stats.deliveredCount).toBe(2);
      expect(stats.openedCount).toBe(1);
      expect(stats.bouncedCount).toBe(1);
    });

    it('leaves sentCount alone unless asked to fold it', async () => {
      await sendTo('y1@example.com');
      await prisma.campaign.update({where: {id: campaignId}, data: {sentCount: 999}});

      await CampaignService.reconcileStats(campaignId);

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {sentCount: true}});
      expect(campaign?.sentCount).toBe(999);
    });

    it('leaves the unsubscribe count alone', async () => {
      await prisma.campaign.update({where: {id: campaignId}, data: {unsubscribedCount: 4}});

      await CampaignService.reconcileStats(campaignId);

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {unsubscribedCount: true}});
      expect(campaign?.unsubscribedCount).toBe(4);
    });

    it('counts only its own campaign', async () => {
      const other = await factories.createCampaign({projectId, name: 'Other'});
      const contact = await factories.createContact({projectId});
      await prisma.email.create({
        data: {
          projectId,
          contactId: contact.id,
          campaignId: other.id,
          subject: 'Other',
          body: '<p>x</p>',
          from: 'hello@plunk.test',
          sourceType: 'CAMPAIGN',
          sentAt: new Date(),
        },
      });
      await sendTo('own@example.com');

      await CampaignService.reconcileStats(campaignId, {foldSentProgress: true});

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {sentCount: true}});
      expect(campaign?.sentCount).toBe(1);
    });
  });
});

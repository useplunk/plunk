import {beforeEach, describe, expect, it} from 'vitest';
import {CampaignService} from '../CampaignService';
import {EmailService} from '../EmailService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * The campaign counters are materialized and never recomputed on read, so the two
 * properties that used to be covered by the recompute have to hold on their own:
 * an increment must not fire twice for one event, and there must still be a path
 * that repairs a counter that drifted.
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
   * SES delivers notifications at least once, so the same webhook can arrive twice.
   * Nothing recomputes these counters between sends, so an increment that fires
   * twice would stay wrong -- and a deliveredCount above sentCount would put
   * deliveryRate over 100%.
   */
  describe('replayed webhooks', () => {
    it.each(['delivered', 'bounced', 'complained'] as const)('counts a replayed %s once', async eventType => {
      const email = await sendTo(`${eventType}@example.com`);

      await EmailService.handleWebhookEvent(email.id, eventType);
      await EmailService.handleWebhookEvent(email.id, eventType);

      const campaign = await prisma.campaign.findUnique({
        where: {id: campaignId},
        select: {deliveredCount: true, bouncedCount: true, complainedCount: true},
      });

      const counts = {
        delivered: campaign?.deliveredCount,
        bounced: campaign?.bouncedCount,
        complained: campaign?.complainedCount,
      };
      expect(counts[eventType]).toBe(1);
    });

    it('counts a replayed open once', async () => {
      const email = await sendTo('open@example.com');

      await EmailService.handleWebhookEvent(email.id, 'opened');
      await EmailService.handleWebhookEvent(email.id, 'opened');

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {openedCount: true}});
      expect(campaign?.openedCount).toBe(1);
    });

    it('never reports a delivery rate above 100%', async () => {
      const first = await sendTo('r1@example.com');
      const second = await sendTo('r2@example.com');
      await prisma.campaign.update({where: {id: campaignId}, data: {sentCount: 2}});

      for (const email of [first, second]) {
        await EmailService.handleWebhookEvent(email.id, 'delivered');
        await EmailService.handleWebhookEvent(email.id, 'delivered');
      }

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.deliveredCount).toBe(2);
      expect(stats.deliveryRate).toBe(100);
    });
  });

  /**
   * While a campaign is in flight, sent progress lives in Redis rather than as a
   * per-recipient increment on the campaign row, which would serialize every send
   * on one row and leave a dead tuple per email.
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

      await CampaignService.reconcileStats(campaignId);
      await prisma.campaign.update({where: {id: campaignId}, data: {status: 'SENT'}});

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {sentCount: true}});
      expect(campaign?.sentCount).toBe(2);
      expect((await CampaignService.getStats(projectId, campaignId)).sentCount).toBe(2);
    });
  });

  /**
   * The repair path. It runs once per campaign when a send finalizes -- never on
   * read, which is what made the stats endpoint slow.
   */
  describe('reconcileStats', () => {
    it('rebuilds every counter from the emails', async () => {
      const first = await sendTo('x1@example.com');
      const second = await sendTo('x2@example.com');
      const third = await sendTo('x3@example.com');

      await EmailService.handleWebhookEvent(first.id, 'delivered');
      await EmailService.handleWebhookEvent(first.id, 'opened');
      await EmailService.handleWebhookEvent(second.id, 'delivered');
      await EmailService.handleWebhookEvent(third.id, 'bounced');

      await prisma.campaign.update({
        where: {id: campaignId},
        data: {sentCount: 999, deliveredCount: 0, openedCount: 42, bouncedCount: 7},
      });

      await CampaignService.reconcileStats(campaignId);

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.sentCount).toBe(3);
      expect(stats.deliveredCount).toBe(2);
      expect(stats.openedCount).toBe(1);
      expect(stats.bouncedCount).toBe(1);
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

      await CampaignService.reconcileStats(campaignId);

      const campaign = await prisma.campaign.findUnique({where: {id: campaignId}, select: {sentCount: true}});
      expect(campaign?.sentCount).toBe(1);
    });
  });
});

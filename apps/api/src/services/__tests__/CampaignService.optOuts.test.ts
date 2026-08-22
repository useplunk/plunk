import {beforeEach, describe, expect, it} from 'vitest';
import {CampaignService} from '../CampaignService';
import {ContactService} from '../ContactService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * What a campaign cost in recipients: opt-outs and spam complaints.
 *
 * Both are materialized on the campaign row and recomputed by getStats, and the
 * three ways a recipient can leave must never describe the same person twice —
 * a bounce, a complaint, and a deliberate unsubscribe each belong to exactly one
 * count. The unsubscribe count has two writers (the increment in ContactService
 * and the recompute here), so it is asserted through both.
 */
describe('CampaignService - opt-outs and complaints', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let campaignId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;

    const campaign = await factories.createCampaign({projectId, name: 'Product update'});
    campaignId = campaign.id;
  });

  /** A delivered campaign email for a fresh contact. */
  async function sendTo(email: string, overrides: Record<string, unknown> = {}) {
    const contact = await factories.createContact({projectId, email, subscribed: true});
    const sent = await prisma.email.create({
      data: {
        projectId,
        contactId: contact.id,
        campaignId,
        subject: 'Product update',
        body: '<p>news</p>',
        from: 'hello@plunk.test',
        sourceType: 'CAMPAIGN',
        sentAt: new Date(),
        deliveredAt: new Date(),
        ...overrides,
      },
    });

    return {contact, email: sent};
  }

  async function storedCount() {
    const campaign = await prisma.campaign.findUnique({
      where: {id: campaignId},
      select: {unsubscribedCount: true},
    });
    return campaign?.unsubscribedCount;
  }

  it('counts a recipient who unsubscribes from the campaign', async () => {
    const first = await sendTo('one@example.com');
    const second = await sendTo('two@example.com');

    await ContactService.unsubscribe(first.contact.id, {emailId: first.email.id});
    await ContactService.unsubscribe(second.contact.id, {emailId: second.email.id});

    expect(await storedCount()).toBe(2);

    const stats = await CampaignService.getStats(projectId, campaignId);
    expect(stats.unsubscribedCount).toBe(2);
  });

  it('does not count an unsubscribe with no originating email', async () => {
    const {contact} = await sendTo('three@example.com');

    await ContactService.unsubscribe(contact.id);

    expect(await storedCount()).toBe(0);
    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(0);
  });

  /**
   * A hard bounce unsubscribes the contact too. Counting it here would report the
   * same suppression twice, once as a bounce and once as an opt-out.
   */
  it('does not count suppression from a bounced email', async () => {
    const {contact, email} = await sendTo('four@example.com', {bouncedAt: new Date(), deliveredAt: null});

    await ContactService.unsubscribe(contact.id, {emailId: email.id});

    expect(await storedCount()).toBe(0);
    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(0);
  });

  it('does not count suppression from a complaint', async () => {
    const {contact, email} = await sendTo('five@example.com', {complainedAt: new Date()});

    await ContactService.unsubscribe(contact.id, {emailId: email.id});

    expect(await storedCount()).toBe(0);
    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(0);
  });

  it('does not count an unsubscribe from another campaign', async () => {
    const other = await factories.createCampaign({projectId, name: 'Other campaign'});
    const contact = await factories.createContact({projectId, subscribed: true});
    const otherEmail = await prisma.email.create({
      data: {
        projectId,
        contactId: contact.id,
        campaignId: other.id,
        subject: 'Other',
        body: '<p>x</p>',
        from: 'hello@plunk.test',
        sourceType: 'CAMPAIGN',
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    await ContactService.unsubscribe(contact.id, {emailId: otherEmail.id});

    expect(await storedCount()).toBe(0);
    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(0);
    expect((await CampaignService.getStats(projectId, other.id)).unsubscribedCount).toBe(1);
  });

  /**
   * The increment can be lost (it is deliberately non-fatal, so an opt-out never
   * fails on a stats write), which is only acceptable because the recompute
   * repairs it.
   */
  it('repairs a stored count that drifted from the events', async () => {
    const {contact, email} = await sendTo('six@example.com');
    await ContactService.unsubscribe(contact.id, {emailId: email.id});

    await prisma.campaign.update({where: {id: campaignId}, data: {unsubscribedCount: 99}});

    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(1);
    expect(await storedCount()).toBe(1);
  });

  /**
   * Every rate this endpoint returns divides by sentCount, which the API documents
   * and the project-level complaint rate also uses. The bounce here makes sent and
   * delivered differ, so a rate computed against the wrong one fails.
   */
  it('reports the rate against sent mail', async () => {
    const first = await sendTo('seven@example.com');
    await sendTo('eight@example.com');
    await sendTo('nine@example.com');
    await sendTo('ten@example.com', {bouncedAt: new Date(), deliveredAt: null});

    await ContactService.unsubscribe(first.contact.id, {emailId: first.email.id});

    const stats = await CampaignService.getStats(projectId, campaignId);
    expect(stats.sentCount).toBe(4);
    expect(stats.deliveredCount).toBe(3);
    expect(stats.unsubscribeRate).toBeCloseTo(25);
  });

  it('reports a zero rate for a campaign with nothing sent', async () => {
    const stats = await CampaignService.getStats(projectId, campaignId);

    expect(stats.unsubscribedCount).toBe(0);
    expect(stats.unsubscribeRate).toBe(0);
  });

  describe('spam complaints', () => {
    /**
     * Complaints need no attribution plumbing: the SES webhook stamps
     * complainedAt on the email row, which already knows its campaign.
     */
    it('counts complaints against the campaign that drew them', async () => {
      await sendTo('c1@example.com', {complainedAt: new Date()});
      await sendTo('c2@example.com', {complainedAt: new Date()});
      await sendTo('c3@example.com');

      const stats = await CampaignService.getStats(projectId, campaignId);

      expect(stats.complainedCount).toBe(2);
      expect(stats.complaintRate).toBeCloseTo((2 / 3) * 100);

      const campaign = await prisma.campaign.findUnique({
        where: {id: campaignId},
        select: {complainedCount: true},
      });
      expect(campaign?.complainedCount).toBe(2);
    });

    it('does not count a complaint from another campaign', async () => {
      const other = await factories.createCampaign({projectId, name: 'Other campaign'});
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
          complainedAt: new Date(),
        },
      });

      expect((await CampaignService.getStats(projectId, campaignId)).complainedCount).toBe(0);
      expect((await CampaignService.getStats(projectId, other.id)).complainedCount).toBe(1);
    });

    /**
     * A complaint suppresses the contact as well. It is reported as a complaint,
     * not as an opt-out, so the two counts never describe the same recipient.
     */
    it('keeps complaints out of the unsubscribe count', async () => {
      const {contact, email} = await sendTo('c4@example.com', {complainedAt: new Date()});

      await ContactService.unsubscribe(contact.id, {emailId: email.id});

      const stats = await CampaignService.getStats(projectId, campaignId);
      expect(stats.complainedCount).toBe(1);
      expect(stats.unsubscribedCount).toBe(0);
    });

    it('reports zero for a campaign nobody reported', async () => {
      await sendTo('c5@example.com');

      const stats = await CampaignService.getStats(projectId, campaignId);

      expect(stats.complainedCount).toBe(0);
      expect(stats.complaintRate).toBe(0);
    });
  });
});

import type {Prisma} from '@plunk/db';
import {beforeEach, describe, expect, it} from 'vitest';
import {CampaignService} from '../CampaignService';
import {ContactService} from '../ContactService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * What a campaign cost in recipients: opt-outs and spam complaints.
 *
 * Both are materialized on the campaign row and getStats reports those columns
 * without recounting: `unsubscribedCount` is incremented by
 * ContactService.unsubscribe, which is the path these tests drive, while
 * `complainedCount` is recounted from the email rows by CampaignService
 * .reconcileStats. The bounce and complaint below are therefore stamped onto the
 * row the way the SES webhook stamps them — what matters here is which
 * suppressions the opt-out count excludes, not how the timestamp got there.
 *
 * The three ways a recipient can leave must never describe the same person twice —
 * a bounce, a complaint, and a deliberate unsubscribe each belong to exactly one
 * count.
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

  /**
   * A sent campaign email for a fresh contact, counted the way the send path counts
   * it: the row is stamped and the campaign's `sentCount` moves with it.
   */
  async function sendTo(email: string, targetCampaignId: string = campaignId) {
    const contact = await factories.createContact({projectId, email, subscribed: true});
    const sent = await prisma.email.create({
      data: {
        projectId,
        contactId: contact.id,
        campaignId: targetCampaignId,
        subject: 'Product update',
        body: '<p>news</p>',
        from: 'hello@plunk.test',
        sourceType: 'CAMPAIGN',
        sentAt: new Date(),
      },
    });

    await prisma.campaign.update({
      where: {id: targetCampaignId},
      data: {sentCount: {increment: 1}},
    });

    return {contact, email: sent};
  }

  /**
   * One SES event, applied the way the webhook applies it: stamp the email row, mark the
   * campaign, then let the sweep recount it. Driving all three keeps these tests honest about
   * where the numbers come from -- stamping the row alone would prove nothing, since the stats
   * endpoint reads the campaign columns and never the emails. The handler itself is covered end
   * to end in Webhooks.sns.test.ts; the sweep runs inline here instead of on its timer.
   */
  async function applyEvent(emailId: string, data: Prisma.EmailUpdateInput) {
    const email = await prisma.email.update({where: {id: emailId}, data});

    if (email.campaignId) {
      await CampaignService.markStatsDirty(email.campaignId);
      await CampaignService.sweepDirtyStats(10);
    }

    return email;
  }

  const deliver = (emailId: string) => applyEvent(emailId, {status: 'DELIVERED', deliveredAt: new Date()});
  const complain = (emailId: string) => applyEvent(emailId, {status: 'COMPLAINED', complainedAt: new Date()});
  const bounce = (emailId: string) => applyEvent(emailId, {status: 'BOUNCED', bouncedAt: new Date()});

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
    const {contact, email} = await sendTo('four@example.com');
    await bounce(email.id);

    await ContactService.unsubscribe(contact.id, {emailId: email.id});

    expect(await storedCount()).toBe(0);
    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(0);
  });

  it('does not count suppression from a complaint', async () => {
    const {contact, email} = await sendTo('five@example.com');
    await complain(email.id);

    await ContactService.unsubscribe(contact.id, {emailId: email.id});

    expect(await storedCount()).toBe(0);
    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(0);
  });

  it('does not count an unsubscribe from another campaign', async () => {
    const other = await factories.createCampaign({projectId, name: 'Other campaign'});
    const {contact, email} = await sendTo('other@example.com', other.id);

    await ContactService.unsubscribe(contact.id, {emailId: email.id});

    expect(await storedCount()).toBe(0);
    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(0);
    expect((await CampaignService.getStats(projectId, other.id)).unsubscribedCount).toBe(1);
  });

  /**
   * getStats reads the stored counters and does not recount. Deriving them per
   * request meant scanning the campaign's emails — and, for unsubscribes, the whole
   * events table, since no index serves a predicate on Event.name alone — on an
   * endpoint the dashboard polls every 15s while a campaign sends.
   *
   * The counters are repaired where repair is cheap instead: finalizeIfDone
   * recomputes sentCount from the emails table once the send completes.
   */
  it('reports the stored counters without recounting', async () => {
    const {contact, email} = await sendTo('six@example.com');
    await ContactService.unsubscribe(contact.id, {emailId: email.id});

    await prisma.campaign.update({where: {id: campaignId}, data: {unsubscribedCount: 99}});

    expect((await CampaignService.getStats(projectId, campaignId)).unsubscribedCount).toBe(99);
  });

  /**
   * Every rate this endpoint returns divides by sentCount, which the API documents
   * and the project-level complaint rate also uses. The bounce here makes sent and
   * delivered differ, so a rate computed against the wrong one fails.
   */
  it('reports the rate against sent mail', async () => {
    const first = await sendTo('seven@example.com');
    const second = await sendTo('eight@example.com');
    const third = await sendTo('nine@example.com');
    const fourth = await sendTo('ten@example.com');

    await deliver(first.email.id);
    await deliver(second.email.id);
    await deliver(third.email.id);
    await bounce(fourth.email.id);

    await ContactService.unsubscribe(first.contact.id, {emailId: first.email.id});

    const stats = await CampaignService.getStats(projectId, campaignId);
    expect(stats.sentCount).toBe(4);
    expect(stats.deliveredCount).toBe(3);
    expect(stats.bouncedCount).toBe(1);
    expect(stats.unsubscribeRate).toBeCloseTo(25);
  });

  it('reports a zero rate for a campaign with nothing sent', async () => {
    const stats = await CampaignService.getStats(projectId, campaignId);

    expect(stats.unsubscribedCount).toBe(0);
    expect(stats.unsubscribeRate).toBe(0);
  });

  describe('spam complaints', () => {
    /**
     * Complaints need no attribution plumbing: the SES webhook names the email,
     * which already knows its campaign.
     */
    it('counts complaints against the campaign that drew them', async () => {
      const first = await sendTo('c1@example.com');
      const second = await sendTo('c2@example.com');
      await sendTo('c3@example.com');

      await complain(first.email.id);
      await complain(second.email.id);

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
      const {email} = await sendTo('c-other@example.com', other.id);

      await complain(email.id);

      expect((await CampaignService.getStats(projectId, campaignId)).complainedCount).toBe(0);
      expect((await CampaignService.getStats(projectId, other.id)).complainedCount).toBe(1);
    });

    /**
     * A complaint suppresses the contact as well. It is reported as a complaint,
     * not as an opt-out, so the two counts never describe the same recipient.
     */
    it('keeps complaints out of the unsubscribe count', async () => {
      const {contact, email} = await sendTo('c4@example.com');
      await complain(email.id);

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

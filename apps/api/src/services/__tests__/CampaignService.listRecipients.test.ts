import {beforeEach, describe, expect, it} from 'vitest';
import {CampaignService} from '../CampaignService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * The bounce and complaint drill-downs answer "who", and their whole value is that the list
 * agrees with the figure the reader clicked to open it.
 *
 * The list selects on `status`, so that agreement rests on BOUNCED and COMPLAINED being
 * terminal -- the `nextStatus` guard in the SES webhook, covered in Webhooks.status.test.ts.
 * What is covered here is everything downstream of that: ordering, the cursor, the total,
 * and project scoping.
 */
describe('CampaignService - listRecipients', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let campaignId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    const campaign = await factories.createCampaign({projectId, name: 'Recipients'});
    campaignId = campaign.id;
  });

  async function sendTo(email: string, stamps: Record<string, unknown> = {}) {
    const contact = await factories.createContact({projectId, email, subscribed: true});
    return prisma.email.create({
      data: {
        projectId,
        contactId: contact.id,
        campaignId,
        subject: 'Recipients',
        body: '<p>x</p>',
        from: 'hello@plunk.test',
        sourceType: 'CAMPAIGN',
        sentAt: new Date(),
        ...stamps,
      },
    });
  }

  it('lists the contacts behind each figure, newest first', async () => {
    await sendTo('delivered@plunk.test', {status: 'DELIVERED', deliveredAt: new Date()});
    await sendTo('older@plunk.test', {status: 'BOUNCED', bouncedAt: new Date('2026-01-01T10:00:00Z')});
    await sendTo('newer@plunk.test', {status: 'BOUNCED', bouncedAt: new Date('2026-01-02T10:00:00Z')});

    const result = await CampaignService.listRecipients(projectId, campaignId, 'bounced');

    expect(result.data.map(r => r.email)).toEqual(['newer@plunk.test', 'older@plunk.test']);
    expect(result.hasMore).toBe(false);
  });

  it('keeps the two lists apart', async () => {
    await sendTo('bounced@plunk.test', {status: 'BOUNCED', bouncedAt: new Date()});
    await sendTo('complained@plunk.test', {status: 'COMPLAINED', complainedAt: new Date()});

    const bounced = await CampaignService.listRecipients(projectId, campaignId, 'bounced');
    const complained = await CampaignService.listRecipients(projectId, campaignId, 'complained');

    expect(bounced.data.map(r => r.email)).toEqual(['bounced@plunk.test']);
    expect(complained.data.map(r => r.email)).toEqual(['complained@plunk.test']);
  });

  it('reports the timestamp of the event, not of the send', async () => {
    const complainedAt = new Date('2026-03-04T09:00:00Z');
    await sendTo('when@plunk.test', {status: 'COMPLAINED', complainedAt});

    const result = await CampaignService.listRecipients(projectId, campaignId, 'complained');

    expect(result.data[0]?.occurredAt).toBe(complainedAt.toISOString());
  });

  /**
   * A bounce storm stamps many rows inside the same millisecond, so the cursor carries the id
   * as well. On the timestamp alone, paging through a tie would skip or repeat every row in it.
   */
  it('pages through rows that share a timestamp without skipping or repeating', async () => {
    const bouncedAt = new Date('2026-01-01T10:00:00Z');
    for (const email of ['a@plunk.test', 'b@plunk.test', 'c@plunk.test', 'd@plunk.test']) {
      await sendTo(email, {status: 'BOUNCED', bouncedAt});
    }

    const seen: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await CampaignService.listRecipients(projectId, campaignId, 'bounced', {limit: 2, cursor});
      seen.push(...page.data.map(r => r.email));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    expect(seen.sort()).toEqual(['a@plunk.test', 'b@plunk.test', 'c@plunk.test', 'd@plunk.test']);
    expect(new Set(seen).size).toBe(4);
  });

  it('reports the campaign counter as the total rather than recounting', async () => {
    await sendTo('one@plunk.test', {status: 'BOUNCED', bouncedAt: new Date()});
    await prisma.campaign.update({where: {id: campaignId}, data: {bouncedCount: 1}});

    const result = await CampaignService.listRecipients(projectId, campaignId, 'bounced');

    expect(result.total).toBe(1);
  });

  it('falls back to the first page when handed a cursor it did not issue', async () => {
    await sendTo('only@plunk.test', {status: 'BOUNCED', bouncedAt: new Date()});

    const result = await CampaignService.listRecipients(projectId, campaignId, 'bounced', {cursor: 'not-a-cursor'});

    expect(result.data.map(r => r.email)).toEqual(['only@plunk.test']);
  });

  it('refuses a campaign belonging to another project', async () => {
    const {project: other} = await factories.createUserWithProject();

    await expect(CampaignService.listRecipients(other.id, campaignId, 'bounced')).rejects.toThrow();
  });
});

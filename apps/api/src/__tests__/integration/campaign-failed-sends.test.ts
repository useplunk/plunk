import {CampaignStatus, EmailSourceType, EmailStatus} from '@plunk/db';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {redis} from '../../database/redis.js';
import {processEmailJob} from '../../jobs/email-processor.js';
import {CampaignService} from '../../services/CampaignService.js';
import {Keys} from '../../services/keys.js';
import {sendRawEmail} from '../../services/SESService.js';

vi.mock('../../services/SESService.js', () => ({
  sendRawEmail: vi.fn(async () => ({messageId: `ses-${Math.random()}`})),
  getSendingQuota: vi.fn(async () => null),
}));

const prisma = getPrismaClient();

const QUOTA_ERROR = 'Daily message quota exceeded.';

/** The error the AWS SDK throws once the account's 24-hour sending quota is spent */
function quotaExceeded(): Error {
  const error = new Error(QUOTA_ERROR);
  error.name = 'Throttling';
  return error;
}

let projectId: string;
let campaignId: string;

/** A SENDING campaign with one PENDING email per recipient, as `processBatch` leaves it */
async function sendingCampaign(recipients: number): Promise<string[]> {
  const campaign = await factories.createCampaign({projectId, status: CampaignStatus.SENDING});
  campaignId = campaign.id;
  await prisma.campaign.update({where: {id: campaignId}, data: {totalRecipients: recipients}});

  const emailIds: string[] = [];
  for (let i = 0; i < recipients; i++) {
    const contact = await factories.createContact({projectId, email: `r${i}@acme.test`, subscribed: true});
    const email = await prisma.email.create({
      data: {
        projectId,
        contactId: contact.id,
        campaignId,
        subject: 'Hello',
        body: '<p>Hello</p>',
        from: 'hello@acme.test',
        sourceType: EmailSourceType.CAMPAIGN,
        status: EmailStatus.PENDING,
      },
    });
    emailIds.push(email.id);
  }

  return emailIds;
}

/** Run one email job the way the worker does, swallowing the rethrow that schedules a retry */
async function runJob(emailId: string): Promise<void> {
  await processEmailJob(emailId).catch(() => undefined);
}

/**
 * A campaign whose last emails fail -- SES refusing the rest of a send once the daily quota is
 * spent -- must still finish, and must say how many recipients it never reached and why.
 */
describe('Campaign with failed sends', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  it('finalizes when the last email of the campaign fails', async () => {
    const [first, second, third] = await sendingCampaign(3);

    vi.mocked(sendRawEmail)
      .mockResolvedValueOnce({messageId: 'ses-1'})
      .mockRejectedValueOnce(quotaExceeded())
      .mockRejectedValueOnce(quotaExceeded());

    await runJob(first!);
    await runJob(second!);
    await runJob(third!);

    const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
    expect(campaign.status).toBe(CampaignStatus.SENT);
    expect(campaign.sentCount).toBe(1);
    expect(campaign.failedCount).toBe(2);
  });

  it('finalizes when every email of the campaign fails', async () => {
    const emailIds = await sendingCampaign(2);
    vi.mocked(sendRawEmail).mockRejectedValue(quotaExceeded());

    for (const emailId of emailIds) {
      await runJob(emailId);
    }

    const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
    expect(campaign.status).toBe(CampaignStatus.SENT);
    expect(campaign.sentCount).toBe(0);
    expect(campaign.failedCount).toBe(2);
  });

  it('stays SENDING while other emails are still pending', async () => {
    const [first] = await sendingCampaign(2);
    vi.mocked(sendRawEmail).mockRejectedValueOnce(quotaExceeded());

    await runJob(first!);

    const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
    expect(campaign.status).toBe(CampaignStatus.SENDING);
  });

  it('rethrows the send error even though it finalized the campaign', async () => {
    const [only] = await sendingCampaign(1);
    vi.mocked(sendRawEmail).mockRejectedValueOnce(quotaExceeded());

    await expect(processEmailJob(only!)).rejects.toThrow(QUOTA_ERROR);
  });

  it('reports each failure cause separately, most common first', async () => {
    const [sent, ...rest] = await sendingCampaign(4);

    vi.mocked(sendRawEmail)
      .mockResolvedValueOnce({messageId: 'ses-1'})
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockRejectedValueOnce(quotaExceeded())
      .mockRejectedValueOnce(quotaExceeded());

    for (const emailId of [sent!, ...rest]) {
      await runJob(emailId);
    }

    const stats = await CampaignService.getStats(projectId, campaignId);
    expect(stats.sentCount).toBe(1);
    expect(stats.failedCount).toBe(3);
    expect(stats.failureReasons).toEqual([
      {error: QUOTA_ERROR, count: 2},
      {error: 'socket hang up', count: 1},
    ]);
  });

  it('does not count an email SES accepted as failed, even if a later step threw', async () => {
    const [only] = await sendingCampaign(1);
    await prisma.email.update({
      where: {id: only!},
      data: {status: EmailStatus.FAILED, sentAt: new Date(), error: 'Event tracking failed'},
    });

    await CampaignService.finalizeIfDone(campaignId);

    const stats = await CampaignService.getStats(projectId, campaignId);
    expect(stats.sentCount).toBe(1);
    expect(stats.failedCount).toBe(0);
    expect(stats.failureReasons).toEqual([]);
  });

  it('finalizes a campaign only once when several emails finish together', async () => {
    const emailIds = await sendingCampaign(3);
    await prisma.email.updateMany({
      where: {id: {in: emailIds}},
      data: {status: EmailStatus.FAILED, error: QUOTA_ERROR},
    });

    const results = await Promise.all(emailIds.map(() => CampaignService.finalizeIfDone(campaignId)));

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  describe('finalizeStalled', () => {
    /** Push the campaign's last write into the past, past the sweep's idle window */
    const ageCampaign = () =>
      prisma.$executeRaw`UPDATE "campaigns" SET "updatedAt" = NOW() - INTERVAL '1 hour' WHERE "id" = ${campaignId}`;

    it('finalizes a campaign left SENDING with nothing left to send', async () => {
      // The state the bug left behind: every email terminal, nobody finalized.
      const [sent, failed] = await sendingCampaign(2);
      await prisma.email.update({where: {id: sent!}, data: {status: EmailStatus.SENT, sentAt: new Date()}});
      await prisma.email.update({where: {id: failed!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});
      await ageCampaign();

      const finalized = await CampaignService.finalizeStalled();

      expect(finalized).toBe(1);
      const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
      expect(campaign.status).toBe(CampaignStatus.SENT);
      expect(campaign.sentCount).toBe(1);
      expect(campaign.failedCount).toBe(1);
    });

    it('leaves a campaign that still has emails to send', async () => {
      await sendingCampaign(1);
      await ageCampaign();

      expect(await CampaignService.finalizeStalled()).toBe(0);

      const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
      expect(campaign.status).toBe(CampaignStatus.SENDING);
    });

    it('leaves a campaign that was written to recently', async () => {
      const [only] = await sendingCampaign(1);
      await prisma.email.update({where: {id: only!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});

      expect(await CampaignService.finalizeStalled()).toBe(0);
    });
  });

  describe('live sent count', () => {
    it('adds the in-flight progress to a SENDING campaign in the list', async () => {
      await sendingCampaign(1);
      await redis.set(Keys.Campaign.sentProgress(campaignId), '7');

      const {data} = await CampaignService.list(projectId);

      expect(data.find(c => c.id === campaignId)?.sentCount).toBe(7);
      await redis.del(Keys.Campaign.sentProgress(campaignId));
    });
  });
});

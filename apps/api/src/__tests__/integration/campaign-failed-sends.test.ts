import {CampaignStatus, EmailSourceType, EmailStatus} from '@plunk/db';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {redis} from '../../database/redis.js';
import {processEmailJob} from '../../jobs/email-processor.js';
import {AnalyticsService} from '../../services/AnalyticsService.js';
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
  // `startSending` stamps sentAt when the send begins
  await prisma.campaign.update({where: {id: campaignId}, data: {totalRecipients: recipients, sentAt: new Date()}});

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

    // `clearAllMocks` keeps implementations, so a test that makes every send fail would
    // otherwise leak into the next one
    vi.mocked(sendRawEmail).mockReset().mockImplementation(async () => ({messageId: `ses-${Math.random()}`}));
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

  it('rethrows the send error when finalizing the campaign throws', async () => {
    const [only] = await sendingCampaign(1);
    vi.mocked(sendRawEmail).mockRejectedValueOnce(quotaExceeded());
    const finalize = vi.spyOn(CampaignService, 'finalizeIfDone').mockRejectedValueOnce(new Error('database down'));

    await expect(processEmailJob(only!)).rejects.toThrow(QUOTA_ERROR);
    expect(finalize).toHaveBeenCalledOnce();
    finalize.mockRestore();
  });

  it('keeps a sent email SENT when finalizing the campaign throws', async () => {
    const [only] = await sendingCampaign(1);
    const finalize = vi.spyOn(CampaignService, 'finalizeIfDone').mockRejectedValueOnce(new Error('database down'));

    await expect(processEmailJob(only!)).resolves.toBeUndefined();

    const email = await prisma.email.findUniqueOrThrow({where: {id: only!}});
    expect(email.status).toBe(EmailStatus.SENT);
    expect(email.error).toBeNull();
    finalize.mockRestore();
  });

  it('writes failedCount with the status, before the stats reconcile', async () => {
    const [only] = await sendingCampaign(1);
    await prisma.email.update({where: {id: only!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});
    const reconcile = vi.spyOn(CampaignService, 'reconcileStats').mockRejectedValueOnce(new Error('statement timeout'));

    await expect(CampaignService.finalizeIfDone(campaignId)).rejects.toThrow('statement timeout');

    const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
    expect(campaign.status).toBe(CampaignStatus.SENT);
    expect(campaign.failedCount).toBe(1);
    reconcile.mockRestore();
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

    const groupBy = vi.spyOn(prisma.email, 'groupBy');
    const stats = await CampaignService.getStats(projectId, campaignId);
    expect(stats.sentCount).toBe(1);
    expect(stats.failedCount).toBe(3);
    expect(stats.failureReasons).toEqual([
      {error: QUOTA_ERROR, count: 2},
      {error: 'socket hang up', count: 1},
    ]);
    // Stored at finalization: the polled stats endpoint must not aggregate failed rows
    expect(groupBy).not.toHaveBeenCalled();
    groupBy.mockRestore();
  });

  it('does not count emails skipped because the user cancelled the campaign', async () => {
    const [cancelled, missed] = await sendingCampaign(2);
    await prisma.campaign.update({where: {id: campaignId}, data: {status: CampaignStatus.CANCELLED}});
    await prisma.email.update({
      where: {id: cancelled!},
      data: {status: EmailStatus.FAILED, error: CampaignService.skippedEmailError(CampaignStatus.CANCELLED)},
    });
    // Skipped because the campaign had already finalized: a recipient the send really missed
    await prisma.email.update({
      where: {id: missed!},
      data: {status: EmailStatus.FAILED, error: CampaignService.skippedEmailError(CampaignStatus.SENT)},
    });

    await CampaignService.reconcileStats(campaignId);

    const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
    expect(campaign.failedCount).toBe(1);
  });

  it('resets the failure figures when a cancelled campaign reverts to draft', async () => {
    // A cancel that raced the last email: the campaign finalized with failures, then the
    // cancel overwrote SENT with CANCELLED. Nothing reached SES, so it reverts to a draft.
    const [only] = await sendingCampaign(1);
    await prisma.email.update({where: {id: only!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});
    await CampaignService.finalizeIfDone(campaignId);
    await prisma.campaign.update({where: {id: campaignId}, data: {status: CampaignStatus.CANCELLED}});

    expect(await CampaignService.completeCancelRevert(projectId, campaignId)).toBe(CampaignStatus.DRAFT);

    const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
    expect(campaign.failedCount).toBe(0);
    expect(campaign.failureReasons).toBeNull();
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

    expect(results.filter(outcome => outcome === 'finalized')).toHaveLength(1);
  });

  describe('finalizeStalled', () => {
    /** Move the campaign's send start into the past, beyond the sweep's minimum age */
    const startedAnHourAgo = () =>
      prisma.campaign.update({where: {id: campaignId}, data: {sentAt: new Date(Date.now() - 60 * 60 * 1000)}});

    it('finalizes a campaign left SENDING with nothing left to send', async () => {
      // The state the bug left behind: every email terminal, nobody finalized.
      const [sent, failed] = await sendingCampaign(2);
      await prisma.email.update({where: {id: sent!}, data: {status: EmailStatus.SENT, sentAt: new Date()}});
      await prisma.email.update({where: {id: failed!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});
      await startedAnHourAgo();

      const finalized = await CampaignService.finalizeStalled();

      expect(finalized).toBe(1);
      const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
      expect(campaign.status).toBe(CampaignStatus.SENT);
      expect(campaign.sentCount).toBe(1);
      expect(campaign.failedCount).toBe(1);
      expect(campaign.failureReasons).toEqual([{error: QUOTA_ERROR, count: 1}]);
    });

    it('finalizes a stuck campaign whose row the stats sweep keeps rewriting', async () => {
      // Opens and clicks keep arriving for the emails that did go out, and every sweep
      // reconcile rewrites the campaign row -- which must not make it look active.
      const [sent, failed] = await sendingCampaign(2);
      await prisma.email.update({where: {id: sent!}, data: {status: EmailStatus.OPENED, sentAt: new Date()}});
      await prisma.email.update({where: {id: failed!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});
      await startedAnHourAgo();
      await CampaignService.reconcileStats(campaignId);

      expect(await CampaignService.finalizeStalled()).toBe(1);
    });

    it('leaves a campaign that still has emails to send', async () => {
      await sendingCampaign(1);
      await startedAnHourAgo();

      expect(await CampaignService.finalizeStalled()).toBe(0);

      const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
      expect(campaign.status).toBe(CampaignStatus.SENDING);
    });

    it('leaves a campaign that started sending recently', async () => {
      const [only] = await sendingCampaign(1);
      await prisma.email.update({where: {id: only!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});
      const finalize = vi.spyOn(CampaignService, 'finalizeIfDone');

      expect(await CampaignService.finalizeStalled()).toBe(0);
      expect(finalize).not.toHaveBeenCalled();
      finalize.mockRestore();
    });

    it('backs off a campaign that cannot finish on its own instead of recounting it every run', async () => {
      // The batch chain died after creating one of three emails: nothing is in flight, but
      // the campaign is short of its recipients and must not be reported as finished.
      const [only] = await sendingCampaign(1);
      await prisma.campaign.update({where: {id: campaignId}, data: {totalRecipients: 3}});
      await prisma.email.update({where: {id: only!}, data: {status: EmailStatus.FAILED, error: QUOTA_ERROR}});
      await startedAnHourAgo();
      const finalize = vi.spyOn(CampaignService, 'finalizeIfDone');

      expect(await CampaignService.finalizeStalled()).toBe(0);
      expect(await CampaignService.finalizeStalled()).toBe(0);

      expect(finalize).toHaveBeenCalledOnce();
      expect(await finalize.mock.results[0]!.value).toBe('incomplete');
      const campaign = await prisma.campaign.findUniqueOrThrow({where: {id: campaignId}});
      expect(campaign.status).toBe(CampaignStatus.SENDING);
      finalize.mockRestore();
      await redis.del(Keys.Campaign.finalizeBackoff(campaignId));
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

    it('adds the in-flight progress to a SENDING campaign on the analytics leaderboard', async () => {
      await sendingCampaign(1);
      await redis.set(Keys.Campaign.sentProgress(campaignId), '7');

      const {rows} = await AnalyticsService.getLeaderboard(
        {
          projectId,
          from: new Date(Date.now() - 60 * 60 * 1000),
          to: new Date(Date.now() + 60 * 60 * 1000),
          tz: 'UTC',
          stream: 'ALL',
        },
        'campaigns',
      );

      expect(rows.find(row => row.id === campaignId)?.sent).toBe(7);
      await redis.del(Keys.Campaign.sentProgress(campaignId));
    });

    it('falls back to the stored count when Redis is unavailable', async () => {
      await sendingCampaign(1);
      await prisma.campaign.update({where: {id: campaignId}, data: {sentCount: 2}});
      const mget = vi.spyOn(redis, 'mget').mockRejectedValueOnce(new Error('connection refused'));

      const {data} = await CampaignService.list(projectId);

      expect(data.find(c => c.id === campaignId)?.sentCount).toBe(2);
      mget.mockRestore();
    });
  });
});

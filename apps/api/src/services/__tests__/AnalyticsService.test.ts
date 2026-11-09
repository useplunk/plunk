import {CampaignStatus, EmailSourceType, EmailStatus, TemplateType} from '@plunk/db';
import {beforeEach, describe, expect, it} from 'vitest';

import {type AnalyticsQuery, AnalyticsService} from '../AnalyticsService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// The streams each tracking mode sends with open and click tracking
const ENABLED = [EmailSourceType.TRANSACTIONAL, EmailSourceType.CAMPAIGN, EmailSourceType.WORKFLOW];
const MARKETING_ONLY = [EmailSourceType.CAMPAIGN, EmailSourceType.WORKFLOW];
const DISABLED: EmailSourceType[] = [];

/**
 * Opens and clicks can only be recorded on emails sent with tracking, so their rates are
 * measured against those emails alone. Counting untracked transactional mail in the
 * denominator diluted the rate of every project tracking marketing mail only.
 */
describe('AnalyticsService - open and click rates against tracked emails', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let contactId: string;

  beforeEach(async () => {
    const project = await factories.createProject();
    projectId = project.id;
    const contact = await factories.createContact({projectId});
    contactId = contact.id;
  });

  const send = (sourceType: EmailSourceType, options: {openedAt?: Date; clickedAt?: Date} = {}) =>
    factories.createEmail({projectId, contactId, sourceType, status: EmailStatus.SENT, sentAt: new Date(), ...options});

  const query = (trackedStreams: EmailSourceType[]): AnalyticsQuery => ({
    projectId,
    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    to: new Date(Date.now() + 60 * 1000),
    tz: 'UTC',
    stream: 'ALL',
    trackedStreams,
  });

  it('measures opens against tracked emails only when transactional mail is not tracked', async () => {
    await send(EmailSourceType.TRANSACTIONAL);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});

    const overview = await AnalyticsService.getOverview(query(MARKETING_ONLY));

    expect(overview.current).toMatchObject({sent: 2, tracked: 1, opened: 1, openRate: 100});
    expect(overview.streams.find(row => row.stream === 'TRANSACTIONAL')).toMatchObject({sent: 1, tracked: 0});
  });

  it('keeps the rates of a project that tracks everything as they were', async () => {
    await send(EmailSourceType.TRANSACTIONAL);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date(), clickedAt: new Date()});

    const {current} = await AnalyticsService.getOverview(query(ENABLED));

    expect(current.sent).toBe(2);
    expect(current.opened).toBe(1);
    expect(current.openRate).toBe(50);
    expect(current.clickRate).toBe(50);
  });

  it('measures nothing when tracking is disabled', async () => {
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});
    await send(EmailSourceType.TRANSACTIONAL);

    const {current} = await AnalyticsService.getOverview(query(DISABLED));

    expect(current).toMatchObject({sent: 2, tracked: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0});
  });

  it('leaves out opens of emails the current mode does not track, so no rate passes 100%', async () => {
    // Opened while the project still tracked transactional mail
    await send(EmailSourceType.TRANSACTIONAL, {openedAt: new Date()});
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});

    const {current} = await AnalyticsService.getOverview(query(MARKETING_ONLY));

    expect(current).toMatchObject({tracked: 1, opened: 1, openRate: 100});
  });

  it('leaves emails sent to the SES mailbox simulator out of every count', async () => {
    const simulated = await send(EmailSourceType.CAMPAIGN);
    await prisma.email.update({where: {id: simulated.id}, data: {simulated: true}});
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});

    const {current} = await AnalyticsService.getOverview(query(ENABLED));

    expect(current.sent).toBe(1);
    expect(current.openRate).toBe(100);
  });

  it('carries the tracked count on every point of the timeseries', async () => {
    await send(EmailSourceType.TRANSACTIONAL);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});

    const series = await AnalyticsService.getTimeseries(query(MARKETING_ONLY));
    const total = (key: 'sent' | 'tracked' | 'opened') => series.current.reduce((sum, point) => sum + point[key], 0);

    expect({sent: total('sent'), tracked: total('tracked'), opened: total('opened')}).toEqual({
      sent: 2,
      tracked: 1,
      opened: 1,
    });
  });

  it('measures mailbox providers against tracked emails', async () => {
    await send(EmailSourceType.TRANSACTIONAL);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});

    const {providers} = await AnalyticsService.getDeliverability(query(MARKETING_ONLY));

    expect(providers).toHaveLength(1);
    expect(providers[0]).toMatchObject({sent: 2, tracked: 1, openRate: 100});
  });

  it('marks campaigns sent as transactional as untracked when only marketing mail is tracked', async () => {
    const started = async (type: TemplateType) => {
      const campaign = await factories.createCampaign({projectId, type});
      return prisma.campaign.update({
        where: {id: campaign.id},
        data: {status: CampaignStatus.SENT, sentAt: new Date(), sentCount: 10, openedCount: 4},
      });
    };
    const transactional = await started(TemplateType.TRANSACTIONAL);
    const marketing = await started(TemplateType.MARKETING);

    const {rows} = await AnalyticsService.getLeaderboard(query(MARKETING_ONLY), 'campaigns');

    expect(rows.find(row => row.id === transactional.id)).toMatchObject({sent: 10, tracked: 0, opened: 0});
    expect(rows.find(row => row.id === marketing.id)).toMatchObject({sent: 10, tracked: 10, openRate: 40});
  });
});

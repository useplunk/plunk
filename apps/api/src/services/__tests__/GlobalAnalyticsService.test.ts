import type {GlobalAnalyticsProjectRow, GlobalMetrics} from '@plunk/types';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {prisma as servicePrisma} from '../../database/prisma';
import {
  GLOBAL_ALERT_THRESHOLDS,
  GlobalAnalyticsService,
  buildAlerts,
  snapToQuarterHour,
  toGlobalMetrics,
} from '../GlobalAnalyticsService';

const DAY = 24 * 60 * 60 * 1000;

function metrics(counts: Partial<Parameters<typeof toGlobalMetrics>[0]> = {}): GlobalMetrics {
  return toGlobalMetrics({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
    unsubscribed: 0,
    failed: 0,
    softBounces: 0,
    ...counts,
  });
}

function row(overrides: Partial<GlobalAnalyticsProjectRow> = {}): GlobalAnalyticsProjectRow {
  return {id: 'p1', name: 'Shop', disabled: false, current: metrics(), previous: metrics(), ...overrides};
}

describe('buildAlerts', () => {
  it('raises nothing for a healthy project', () => {
    expect(buildAlerts([row({current: metrics({sent: 500, delivered: 498, bounced: 2})})])).toEqual([]);
  });

  it('flags a disabled project as critical, and not also as silent', () => {
    const alerts = buildAlerts([row({disabled: true, previous: metrics({sent: 40})})]);
    expect(alerts.map(a => [a.kind, a.severity])).toEqual([['project_disabled', 'critical']]);
  });

  it('grades the bounce rate once enough mail was sent', () => {
    const at = (bounced: number, sent = 200) => buildAlerts([row({current: metrics({sent, bounced})})]);

    expect(at(6)).toEqual([]);
    expect(at(12)).toMatchObject([{kind: 'high_bounce_rate', severity: 'warning', value: 6}]);
    expect(at(22)).toMatchObject([{kind: 'high_bounce_rate', severity: 'critical', value: 11}]);
    // Too few emails for a rate to mean anything
    expect(at(10, GLOBAL_ALERT_THRESHOLDS.MIN_SENT_FOR_RATES - 1)).toEqual([]);
  });

  it('grades the complaint rate', () => {
    const at = (complained: number) => buildAlerts([row({current: metrics({sent: 10_000, complained})})]);

    expect(at(7)).toEqual([]);
    expect(at(8)).toMatchObject([{kind: 'high_complaint_rate', severity: 'warning'}]);
    expect(at(15)).toMatchObject([{kind: 'high_complaint_rate', severity: 'critical'}]);
  });

  it('needs enough complaints, not just a rate, before alerting', () => {
    // 0.09% of 1,100 is a single complaint: over the rate, under the count
    expect(buildAlerts([row({current: metrics({sent: 1_100, complained: 1})})])).toEqual([]);
    expect(buildAlerts([row({current: metrics({sent: 3_000, complained: 3})})])).toMatchObject([
      {kind: 'high_complaint_rate', severity: 'warning'},
    ]);
  });

  it('reports failed emails with their count', () => {
    expect(buildAlerts([row({current: metrics({sent: 10, failed: 3})})])).toMatchObject([
      {kind: 'failed_emails', severity: 'warning', value: 3},
    ]);
  });

  it('detects a volume spike against a meaningful previous period', () => {
    expect(
      buildAlerts([row({current: metrics({sent: 90}), previous: metrics({sent: 30})})]).map(a => [a.kind, a.value]),
    ).toEqual([['volume_spike', 3]]);
    // 5 to 50 is ten times more, but 5 emails is no baseline
    expect(buildAlerts([row({current: metrics({sent: 50}), previous: metrics({sent: 5})})])).toEqual([]);
  });

  it('notices a project that stopped sending', () => {
    expect(buildAlerts([row({previous: metrics({sent: 12})})])).toMatchObject([
      {kind: 'no_activity', severity: 'info', value: 12},
    ]);
    // Never sent anything: an unused project, not a silent one
    expect(buildAlerts([row()])).toEqual([]);
  });

  it('leaves volume comparisons out while the period is too young to compare', () => {
    const rows = [
      row({id: 'a', current: metrics({sent: 90}), previous: metrics({sent: 30})}),
      row({id: 'b', previous: metrics({sent: 12})}),
    ];
    expect(buildAlerts(rows, {compareVolume: false})).toEqual([]);
  });

  it('orders alerts by severity, then project name', () => {
    const alerts = buildAlerts([
      row({id: 'a', name: 'Zeta', previous: metrics({sent: 3})}),
      row({id: 'b', name: 'Beta', current: metrics({sent: 5, failed: 1})}),
      row({id: 'c', name: 'Alpha', disabled: true}),
      row({id: 'd', name: 'Alpha 2', current: metrics({sent: 1, failed: 2})}),
    ]);
    expect(alerts.map(a => `${a.severity}:${a.projectName}`)).toEqual([
      'critical:Alpha',
      'warning:Alpha 2',
      'warning:Beta',
      'info:Zeta',
    ]);
  });
});

describe('snapToQuarterHour', () => {
  it('rounds outward to the quarter hour', () => {
    expect(snapToQuarterHour(new Date('2026-10-27T10:07:31.123Z'), 'down').toISOString()).toBe(
      '2026-10-27T10:00:00.000Z',
    );
    expect(snapToQuarterHour(new Date('2026-10-27T10:07:31.123Z'), 'up').toISOString()).toBe(
      '2026-10-27T10:15:00.000Z',
    );
  });

  it('leaves local midnights untouched, even in quarter-hour offsets', () => {
    // Midnight in Kathmandu (UTC+05:45) and in Paris
    for (const midnight of ['2026-10-26T18:15:00.000Z', '2026-10-26T23:00:00.000Z']) {
      expect(snapToQuarterHour(new Date(midnight), 'down').toISOString()).toBe(midnight);
      expect(snapToQuarterHour(new Date(midnight), 'up').toISOString()).toBe(midnight);
    }
  });
});

describe('GlobalAnalyticsService', () => {
  const prisma = getPrismaClient();
  const to = new Date(Date.now() + DAY);
  const from = new Date(to.getTime() - 7 * DAY);
  const recent = new Date(Date.now() - 60 * 60 * 1000);

  let userId: string;
  let shopId: string;
  let blogId: string;
  let strangerProjectId: string;

  async function sendEmails(
    projectId: string,
    count: number,
    state: {delivered?: boolean; bounced?: boolean; failed?: boolean; createdAt?: Date; simulated?: boolean} = {},
  ) {
    const contact = await factories.createContact({projectId});
    const createdAt = state.createdAt ?? recent;
    await prisma.email.createMany({
      data: Array.from({length: count}, () => ({
        projectId,
        contactId: contact.id,
        subject: 'Order confirmed',
        body: '<p>Thanks</p>',
        from: 'shop@plunk.test',
        sourceType: 'TRANSACTIONAL' as const,
        status: state.failed ? ('FAILED' as const) : ('SENT' as const),
        simulated: state.simulated ?? false,
        createdAt,
        sentAt: state.failed ? null : createdAt,
        deliveredAt: state.delivered ? createdAt : null,
        bouncedAt: state.bounced ? createdAt : null,
      })),
    });
  }

  const query = (overrides: Partial<Parameters<typeof GlobalAnalyticsService.getOverview>[0]> = {}) => ({
    userId,
    from,
    to,
    tz: 'UTC',
    stream: 'ALL' as const,
    ...overrides,
  });

  beforeEach(async () => {
    const {user, project} = await factories.createUserWithProject({}, {name: 'Shop'});
    userId = user.id;
    shopId = project.id;

    const blog = await factories.createProject({name: 'Blog'});
    blogId = blog.id;
    await prisma.membership.create({data: {userId, projectId: blogId, role: 'MEMBER'}});

    const {project: stranger} = await factories.createUserWithProject({}, {name: 'Someone else'});
    strangerProjectId = stranger.id;

    await sendEmails(shopId, 90, {delivered: true});
    await sendEmails(shopId, 10, {bounced: true});
    await sendEmails(blogId, 9, {delivered: true});
    await sendEmails(blogId, 1, {bounced: true});
    await sendEmails(blogId, 2, {failed: true});
    await sendEmails(strangerProjectId, 50, {delivered: true});
  });

  it('sums counts across the user’s projects and derives rates from the totals', async () => {
    const overview = await GlobalAnalyticsService.getOverview(query());

    expect(overview.current.sent).toBe(110);
    expect(overview.current.delivered).toBe(99);
    expect(overview.current.bounced).toBe(11);
    expect(overview.current.failed).toBe(2);
    // 11 / 110, not the 10% average of two projects at 10% each
    expect(overview.current.bounceRate).toBe(10);
    expect(overview.current.deliveryRate).toBe(90);
  });

  it('returns one row per project the user is a member of, and nothing else', async () => {
    const overview = await GlobalAnalyticsService.getOverview(query());

    expect(overview.projects.map(p => p.name).sort()).toEqual(['Blog', 'Shop']);
    expect(overview.projects.find(p => p.id === strangerProjectId)).toBeUndefined();
    expect(overview.projects.find(p => p.id === blogId)?.current).toMatchObject({sent: 10, failed: 2});
  });

  it('ignores requested projects the user is not a member of', async () => {
    const overview = await GlobalAnalyticsService.getOverview(query({projectIds: [blogId, strangerProjectId]}));

    expect(overview.projects.map(p => p.id)).toEqual([blogId]);
    expect(overview.current.sent).toBe(10);
  });

  it('returns an empty overview when no requested project is accessible', async () => {
    const overview = await GlobalAnalyticsService.getOverview(query({projectIds: [strangerProjectId]}));

    expect(overview.projects).toEqual([]);
    expect(overview.current.sent).toBe(0);
  });

  it('leaves out simulated emails and emails outside the period', async () => {
    await sendEmails(shopId, 5, {simulated: true});
    await sendEmails(shopId, 7, {createdAt: new Date(from.getTime() - 2 * DAY)});

    const overview = await GlobalAnalyticsService.getOverview(query());
    expect(overview.current.sent).toBe(110);
    expect(overview.previous.sent).toBe(7);
  });

  it('raises alerts from the per-project figures', async () => {
    const overview = await GlobalAnalyticsService.getOverview(query());

    expect(overview.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({kind: 'high_bounce_rate', projectId: shopId, severity: 'critical'}),
        expect.objectContaining({kind: 'failed_emails', projectId: blogId, value: 2}),
      ]),
    );
  });

  it('reads the disabled flag fresh, even when the counts come from the cache', async () => {
    await GlobalAnalyticsService.getOverview(query());
    await prisma.project.update({where: {id: blogId}, data: {disabled: true}});

    const overview = await GlobalAnalyticsService.getOverview(query());
    expect(overview.projects.find(p => p.id === blogId)?.disabled).toBe(true);
    expect(overview.alerts).toEqual(
      expect.arrayContaining([expect.objectContaining({kind: 'project_disabled', projectId: blogId})]),
    );
  });

  it('counts soft bounces once per email, for emails of the period', async () => {
    const email = await prisma.email.findFirstOrThrow({where: {projectId: shopId, bouncedAt: null}});
    const old = await prisma.email.create({
      data: {
        projectId: shopId,
        contactId: email.contactId,
        subject: 'Old',
        body: '<p>Old</p>',
        from: 'shop@plunk.test',
        sourceType: 'TRANSACTIONAL',
        createdAt: new Date(from.getTime() - 2 * DAY),
        sentAt: new Date(from.getTime() - 2 * DAY),
      },
    });
    const bounce = (emailId: string) => ({
      projectId: shopId,
      contactId: email.contactId,
      emailId,
      name: 'email.bounce',
      data: {transientBounce: true, sourceType: 'TRANSACTIONAL'},
    });
    // SES retries and reports each attempt; the old email bounces now but belongs to the previous period
    await prisma.event.createMany({data: [bounce(email.id), bounce(email.id), bounce(old.id)]});

    const overview = await GlobalAnalyticsService.getOverview(query());
    expect(overview.current.softBounces).toBe(1);
  });

  it('aggregates every project beyond a single batch, 201 and more', async () => {
    const many = Array.from({length: 201}, (_, i) => ({
      id: `bulk-${userId}-${i}`,
      name: `Bulk ${String(i).padStart(3, '0')}`,
      public: `pk_bulk_${userId}_${i}`,
      secret: `sk_bulk_${userId}_${i}`,
    }));
    await prisma.project.createMany({data: many});
    await prisma.membership.createMany({data: many.map(p => ({userId, projectId: p.id, role: 'MEMBER' as const}))});
    // The last project, in the last batch, sends mail
    await sendEmails(many[200]!.id, 4, {delivered: true});

    const overview = await GlobalAnalyticsService.getOverview(query());

    expect(overview.projects).toHaveLength(203);
    expect(overview.projects.find(p => p.id === many[200]!.id)?.current.sent).toBe(4);
    expect(overview.current.sent).toBe(114);

    const series = await GlobalAnalyticsService.getTimeseries(query());
    expect(series.current.reduce((n, point) => n + point.sent, 0)).toBe(114);
  });

  it('never serves one user the cached result of another', async () => {
    const shopOnly = await factories.createUser();
    await prisma.membership.create({data: {userId: shopOnly.id, projectId: shopId, role: 'MEMBER'}});

    // Warm the cache for the owner of both projects first
    expect((await GlobalAnalyticsService.getOverview(query())).current.sent).toBe(110);

    const overview = await GlobalAnalyticsService.getOverview(query({userId: shopOnly.id}));
    expect(overview.projects.map(p => p.id)).toEqual([shopId]);
    expect(overview.current.sent).toBe(100);
  });

  it('computes a result once when the same request arrives twice at the same time', async () => {
    const spy = vi.spyOn(servicePrisma, '$queryRaw');
    try {
      const [a, b] = await Promise.all([
        GlobalAnalyticsService.getOverview(query()),
        GlobalAnalyticsService.getOverview(query()),
      ]);
      expect(a).toEqual(b);
      // One computation: four queries per period, two periods, one batch
      expect(spy).toHaveBeenCalledTimes(8);
    } finally {
      spy.mockRestore();
    }
  });

  it('draws a timeseries summed across projects', async () => {
    const series = await GlobalAnalyticsService.getTimeseries(query());

    expect(series.granularity).toBe('day');
    expect(series.current.reduce((n, point) => n + point.sent, 0)).toBe(110);
  });
});

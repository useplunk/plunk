import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EmailSourceType, EmailStatus, TrackingMode} from '@plunk/db';
import {ActivityType} from '@plunk/types';
import {redis} from '../../database/redis';
import {ActivityService} from '../ActivityService';
import {Keys} from '../keys';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Stats follow the no-tracking configuration set toggle; pin it on so they do not depend
// on the environment the suite runs in
vi.mock('../../app/constants.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../app/constants.js')>()),
  TRACKING_TOGGLE_ENABLED: true,
}));

/**
 * Subscription changes are stored as reserved-name events (`contact.subscribed`,
 * `contact.unsubscribed`) rather than in their own table, so the feed has to
 * promote them out of the generic `event.triggered` bucket.
 */
describe('ActivityService - subscription activities', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let contactId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;

    const contact = await factories.createContact({projectId});
    contactId = contact.id;

    await prisma.event.createMany({
      data: [
        {projectId, contactId, name: 'contact.subscribed'},
        {projectId, contactId, name: 'contact.unsubscribed', data: {reason: 'bounce'}},
        {projectId, contactId, name: 'user.signup'},
      ],
    });
  });

  it('surfaces the email a subscription change came from', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        projectId,
        name: 'August update',
        subject: 'What we shipped',
        body: '<p>news</p>',
        from: 'hello@plunk.test',
        status: 'SENT',
      },
    });
    const email = await prisma.email.create({
      data: {
        projectId,
        contactId,
        campaignId: campaign.id,
        subject: 'What we shipped',
        body: '<p>news</p>',
        from: 'hello@plunk.test',
        sourceType: 'CAMPAIGN',
      },
    });
    await prisma.event.create({
      data: {projectId, contactId, emailId: email.id, name: 'contact.unsubscribed'},
    });

    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [ActivityType.CONTACT_UNSUBSCRIBED]);

    const attributed = data.find(activity => activity.metadata.sourceEmailId === email.id);
    expect(attributed?.metadata.sourceSubject).toBe('What we shipped');
    expect(attributed?.metadata.campaignName).toBe('August update');

    // Events with no source email must not gain empty attribution keys.
    const unattributed = data.filter(activity => activity.metadata.sourceEmailId === undefined);
    expect(unattributed.length).toBeGreaterThan(0);
    for (const activity of unattributed) {
      expect(activity.metadata).not.toHaveProperty('sourceSubject');
    }
  });

  it('types subscription events separately from triggered events', async () => {
    const {data} = await ActivityService.getActivities(projectId);

    const types = data.map(activity => activity.type);
    expect(types).toContain(ActivityType.CONTACT_SUBSCRIBED);
    expect(types).toContain(ActivityType.CONTACT_UNSUBSCRIBED);
    expect(types).toContain(ActivityType.EVENT_TRIGGERED);

    const unsubscribed = data.find(activity => activity.type === ActivityType.CONTACT_UNSUBSCRIBED);
    expect(unsubscribed?.contactId).toBe(contactId);
    expect(unsubscribed?.metadata.eventData).toEqual({reason: 'bounce'});
  });

  it('excludes subscription events when filtering on triggered events', async () => {
    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [ActivityType.EVENT_TRIGGERED]);

    expect(data).toHaveLength(1);
    expect(data[0]?.type).toBe(ActivityType.EVENT_TRIGGERED);
    expect(data[0]?.metadata.eventName).toBe('user.signup');
  });

  it('returns only the requested subscription type when filtering on it', async () => {
    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [ActivityType.CONTACT_UNSUBSCRIBED]);

    expect(data).toHaveLength(1);
    expect(data[0]?.type).toBe(ActivityType.CONTACT_UNSUBSCRIBED);
  });

  it('returns both subscription types together without other events', async () => {
    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [
      ActivityType.CONTACT_SUBSCRIBED,
      ActivityType.CONTACT_UNSUBSCRIBED,
    ]);

    expect(data.map(activity => activity.type).sort()).toEqual([
      ActivityType.CONTACT_SUBSCRIBED,
      ActivityType.CONTACT_UNSUBSCRIBED,
    ]);
  });
});

/**
 * Every open, click, bounce and delivery is written twice: as a timestamp on the email row
 * and as an email.* event. The feed reads email activity from the rows, so the events must
 * stay out of it, and the rows must still say what only the events know.
 */
describe('ActivityService - email activity', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let contactId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    const contact = await factories.createContact({projectId});
    contactId = contact.id;
  });

  async function createEmail(data: {clickedAt?: Date; bouncedAt?: Date}) {
    const now = new Date();
    return prisma.email.create({
      data: {
        projectId,
        contactId,
        subject: 'Your receipt',
        body: '<p>receipt</p>',
        from: 'hello@plunk.test',
        sourceType: 'TRANSACTIONAL',
        sentAt: now,
        deliveredAt: data.bouncedAt ? null : now,
        openedAt: data.clickedAt ?? null,
        ...data,
      },
    });
  }

  it("leaves Plunk's own email events out of the feed", async () => {
    const email = await createEmail({clickedAt: new Date()});
    await prisma.event.createMany({
      data: [
        {projectId, contactId, emailId: email.id, name: 'email.open'},
        {projectId, contactId, emailId: email.id, name: 'email.click', data: {link: 'https://plunk.test'}},
        {projectId, contactId, name: 'user.signup'},
      ],
    });

    const {data} = await ActivityService.getActivities(projectId);

    const eventNames = data.filter(a => a.type === ActivityType.EVENT_TRIGGERED).map(a => a.metadata.eventName);
    expect(eventNames).toEqual(['user.signup']);
    expect(data.map(a => a.type)).toContain(ActivityType.EMAIL_CLICKED);
  });

  it('attaches the first clicked link to a clicked email', async () => {
    const email = await createEmail({clickedAt: new Date()});
    await prisma.event.create({
      data: {projectId, contactId, emailId: email.id, name: 'email.click', data: {link: 'https://plunk.test/first'}},
    });
    await prisma.event.create({
      data: {projectId, contactId, emailId: email.id, name: 'email.click', data: {link: 'https://plunk.test/second'}},
    });

    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [ActivityType.EMAIL_CLICKED]);

    expect(data).toHaveLength(1);
    expect(data[0]?.metadata.link).toBe('https://plunk.test/first');
    expect(data[0]?.metadata.emailId).toBe(email.id);
  });

  it('labels a bounce with the bounce that suppressed the contact, not a retry', async () => {
    const email = await createEmail({bouncedAt: new Date()});
    await prisma.event.create({
      data: {
        projectId,
        contactId,
        emailId: email.id,
        name: 'email.bounce',
        data: {bounceType: 'Transient', transientBounce: true},
      },
    });
    await prisma.event.create({
      data: {projectId, contactId, emailId: email.id, name: 'email.bounce', data: {bounceType: 'Permanent'}},
    });

    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [ActivityType.EMAIL_BOUNCED]);

    expect(data).toHaveLength(1);
    expect(data[0]?.metadata.bounceType).toBe('Permanent');
  });
});

/**
 * Executions carry no projectId: the feed finds a project's through its workflows, taking
 * the newest of each and merging them, so ordering and paging must hold across workflows.
 */
describe('ActivityService - workflow activity', () => {
  const prisma = getPrismaClient();
  const DAY = 24 * 60 * 60 * 1000;
  let projectId: string;
  let contactId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    contactId = (await factories.createContact({projectId})).id;
  });

  async function startExecution(workflowId: string, daysAgo: number) {
    return prisma.workflowExecution.create({
      data: {workflowId, contactId, startedAt: new Date(Date.now() - daysAgo * DAY)},
    });
  }

  it("merges the newest executions of every workflow, without other projects' or older ones", async () => {
    const onboarding = await factories.createWorkflow({projectId});
    const winback = await factories.createWorkflow({projectId});
    const a = await startExecution(onboarding.id, 1);
    const b = await startExecution(winback.id, 2);
    const c = await startExecution(onboarding.id, 3);
    await startExecution(winback.id, 45);

    const other = await factories.createUserWithProject();
    const otherContact = await factories.createContact({projectId: other.project.id});
    const otherWorkflow = await factories.createWorkflow({projectId: other.project.id});
    await prisma.workflowExecution.create({data: {workflowId: otherWorkflow.id, contactId: otherContact.id}});

    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [ActivityType.WORKFLOW_STARTED]);

    expect(data.map(activity => activity.id)).toEqual([`${a.id}_started`, `${b.id}_started`, `${c.id}_started`]);
    expect(data[0]?.metadata.workflowId).toBe(onboarding.id);
  });

  it('pages through executions across workflows in start order', async () => {
    const onboarding = await factories.createWorkflow({projectId});
    const winback = await factories.createWorkflow({projectId});
    const started = [
      await startExecution(onboarding.id, 1),
      await startExecution(onboarding.id, 2),
      await startExecution(winback.id, 3),
      await startExecution(onboarding.id, 4),
      await startExecution(winback.id, 5),
    ];

    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await ActivityService.getActivities(projectId, 2, cursor, [ActivityType.WORKFLOW_STARTED]);
      seen.push(...page.data.map(activity => activity.id));
      cursor = page.cursor;
    } while (cursor);

    expect(seen).toEqual(started.map(execution => `${execution.id}_started`));
  });
});

/**
 * The dashboard measures its open rate the way analytics does: against emails that went
 * out with tracking, under the project's current tracking mode.
 */
describe('ActivityService - stats', () => {
  const prisma = getPrismaClient();

  const setUp = async (tracking: TrackingMode) => {
    const project = await factories.createProject({tracking});
    const contact = await factories.createContact({projectId: project.id});
    const send = (sourceType: EmailSourceType, options: {openedAt?: Date} = {}) =>
      factories.createEmail({
        projectId: project.id,
        contactId: contact.id,
        sourceType,
        status: EmailStatus.SENT,
        sentAt: new Date(),
        ...options,
      });
    return {project, contact, send};
  };

  it('measures the open rate against tracked emails only when transactional mail is not tracked', async () => {
    const {project, send} = await setUp(TrackingMode.MARKETING_ONLY);
    await send(EmailSourceType.TRANSACTIONAL);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});

    const stats = await ActivityService.getStats(project.id);

    expect(stats).toMatchObject({totalEmailsTracked: 1, totalEmailsOpened: 1, openRate: 100});
  });

  it('leaves inbound, simulated and unsent emails out of the open rate', async () => {
    const {project, contact, send} = await setUp(TrackingMode.ENABLED);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});
    const simulated = await send(EmailSourceType.CAMPAIGN);
    await prisma.email.update({where: {id: simulated.id}, data: {simulated: true}});
    await factories.createEmail({
      projectId: project.id,
      contactId: contact.id,
      sourceType: EmailSourceType.INBOUND,
      status: EmailStatus.RECEIVED,
    });
    await factories.createEmail({
      projectId: project.id,
      contactId: contact.id,
      sourceType: EmailSourceType.WORKFLOW,
      status: EmailStatus.FAILED,
    });

    const stats = await ActivityService.getStats(project.id);

    expect(stats.openRate).toBe(100);
  });

  it('counts only emails that went out as emails sent', async () => {
    const {project, contact, send} = await setUp(TrackingMode.ENABLED);
    await send(EmailSourceType.CAMPAIGN);
    const simulated = await send(EmailSourceType.CAMPAIGN);
    await prisma.email.update({where: {id: simulated.id}, data: {simulated: true}});
    for (const [sourceType, status] of [
      [EmailSourceType.INBOUND, EmailStatus.RECEIVED],
      [EmailSourceType.WORKFLOW, EmailStatus.FAILED],
      [EmailSourceType.TRANSACTIONAL, EmailStatus.PENDING],
    ] as const) {
      await factories.createEmail({projectId: project.id, contactId: contact.id, sourceType, status});
    }

    const stats = await ActivityService.getStats(project.id);

    expect(stats.totalEmailsSent).toBe(1);
  });

  it('follows a change of tracking mode instead of serving stats cached under the old one', async () => {
    const {project, send} = await setUp(TrackingMode.ENABLED);
    await send(EmailSourceType.TRANSACTIONAL);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});

    expect((await ActivityService.getStats(project.id)).openRate).toBe(50);

    await prisma.project.update({where: {id: project.id}, data: {tracking: TrackingMode.MARKETING_ONLY}});
    await redis.del(Keys.Project.id(project.id));

    expect((await ActivityService.getStats(project.id)).openRate).toBe(100);
  });

  it('measures nothing when tracking is disabled', async () => {
    const {project, send} = await setUp(TrackingMode.DISABLED);
    await send(EmailSourceType.CAMPAIGN, {openedAt: new Date()});
    await send(EmailSourceType.TRANSACTIONAL);

    const stats = await ActivityService.getStats(project.id);

    expect(stats).toMatchObject({totalEmailsTracked: 0, totalEmailsOpened: 0, openRate: 0, clickRate: 0});
  });
});

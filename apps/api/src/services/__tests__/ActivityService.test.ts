import {beforeEach, describe, expect, it} from 'vitest';
import {ActivityType} from '@plunk/types';
import {ActivityService} from '../ActivityService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

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

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

    const {data} = await ActivityService.getActivities(projectId, 50, undefined, [
      ActivityType.CONTACT_UNSUBSCRIBED,
    ]);

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


describe('ActivityService - suppressed captures', () => {
  const prisma = getPrismaClient();
  it('lists captures once, paginates timestamp ties, filters and isolates projects', async () => {
    const {project} = await factories.createUserWithProject();
    const {project: other} = await factories.createUserWithProject();
    const contact = await factories.createContact({projectId: project.id});
    const otherContact = await factories.createContact({projectId: other.id});
    const timestamp = new Date();
    const captures = [];
    for (let i = 0; i < 3; i++) captures.push(await prisma.email.create({data: {
      projectId: project.id, contactId: contact.id, from: 'sender@example.test',
      subject: 'Original {{code}}', body: '<p>{{code}}</p>', sourceType: 'TRANSACTIONAL',
      status: 'SUPPRESSED', createdAt: timestamp, recipientAddress: 'override@example.com',
      renderedSubject: 'Code 123456', renderedBody: '<p>123456</p>',
      suppression: {kind: 'DOMAIN', pattern: 'example.com'},
    }}));
    await prisma.email.create({data: {
      projectId: other.id, contactId: otherContact.id, from: 'sender@example.test',
      subject: 'Other project secret', body: 'private', sourceType: 'TRANSACTIONAL',
      status: 'SUPPRESSED', createdAt: timestamp,
    }});
    const sent = await prisma.email.create({data: {
      projectId: project.id, contactId: contact.id, from: 'sender@example.test',
      subject: 'Historical sent', body: 'original', sourceType: 'TRANSACTIONAL',
      status: 'SENT', sentAt: new Date(timestamp.getTime() - 1000),
    }});
    const all = await ActivityService.getActivities(project.id);
    expect(all.data.filter(a => a.type === ActivityType.EMAIL_SUPPRESSED)).toHaveLength(3);
    expect(all.data.find(a => a.id === `${sent.id}_sent`)?.type).toBe(ActivityType.EMAIL_SENT);
    expect(all.data.some(a => a.metadata.subject === 'Other project secret')).toBe(false);
    const seen = [];
    let cursor: string | undefined;
    for (let i = 0; i < 3; i++) {
      const page = await ActivityService.getActivities(project.id, 1, cursor, [ActivityType.EMAIL_SUPPRESSED]);
      expect(page.data).toHaveLength(1);
      expect(page.data[0]?.metadata.body).toBe('<p>123456</p>');
      expect(page.data[0]?.contactEmail).toBe('override@example.com');
      expect(page.hasMore).toBe(i < 2);
      seen.push(page.data[0]?.id); cursor = page.cursor;
    }
    expect(new Set(seen).size).toBe(3);
    expect(seen).toEqual(captures.map(e => `${e.id}_suppressed`).sort().reverse());
    const sentOnly = await ActivityService.getActivities(project.id, 50, undefined, [ActivityType.EMAIL_SENT]);
    expect(sentOnly.data.map(a => a.id)).toEqual([`${sent.id}_sent`]);
    expect((await ActivityService.getActivities(project.id, 50, undefined, [ActivityType.EMAIL_SUPPRESSED], otherContact.id)).data).toEqual([]);
    const outsideRange = await prisma.email.create({data: {
      projectId: project.id, contactId: contact.id, from: 'sender@example.test',
      subject: 'Outside selected range', body: 'old', sourceType: 'TRANSACTIONAL',
      status: 'SUPPRESSED', createdAt: new Date(timestamp.getTime() - 86400000 * 2),
    }});
    const ranged = await ActivityService.getActivities(project.id, 50,
      `${timestamp.getTime()}_${seen[2]}`, [ActivityType.EMAIL_SUPPRESSED], undefined,
      new Date(timestamp.getTime() - 86400000));
    expect(ranged.data.some(a => a.id === `${outsideRange.id}_suppressed`)).toBe(false);
    expect((await ActivityService.getStats(project.id)).totalEmailsSent).toBe(1);
  });
});

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

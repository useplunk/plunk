import type {ContactSubscriptionStatus} from '@plunk/types';
import {beforeEach, describe, expect, it} from 'vitest';
import {factories, getPrismaClient} from '../../../../../test/helpers';
import {ContactService} from '../ContactService.js';

/**
 * "Select all matching" bulk actions have to reach exactly the contacts the list shows.
 *
 * The dashboard's Status facet has three buckets, but the selector used to carry only the
 * `subscribed` boolean, so a select-all on Snoozed also hit permanently unsubscribed contacts
 * (and Unsubscribed also hit snoozed ones): bulk-subscribe on Snoozed resubscribed people who
 * had opted out, and bulk-delete on Unsubscribed deleted snoozed contacts.
 */
describe('Bulk contact actions - select all matching', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let otherProjectId: string;

  beforeEach(async () => {
    ({
      project: {id: projectId},
    } = await factories.createUserWithProject());
    ({
      project: {id: otherProjectId},
    } = await factories.createUserWithProject());

    await factories.createContact({projectId, email: 'active@example.com'});
    const sleeping = await factories.createContact({projectId, email: 'sleeping@example.com'});
    await ContactService.snooze(sleeping.id, '1_year');
    const gone = await factories.createContact({projectId, email: 'left@example.com'});
    await ContactService.unsubscribe(gone.id);

    // Same states in another project: none of these may ever be selected.
    await factories.createContact({projectId: otherProjectId, email: 'active@example.com'});
    await factories.createContact({projectId: otherProjectId, email: 'left@example.com', subscribed: false});
  });

  const emailsFor = async (
    filter: {search?: string; status?: ContactSubscriptionStatus; subscribed?: boolean},
    excludeIds?: string[],
  ) => {
    const contacts = await prisma.contact.findMany({
      where: ContactService.buildQueryWhere(projectId, {mode: 'query', filter, excludeIds}),
      select: {email: true},
    });
    return contacts.map(c => c.email).sort();
  };

  it('targets only snoozed contacts when the Snoozed facet is active', async () => {
    expect(await emailsFor({status: 'snoozed'})).toEqual(['sleeping@example.com']);
  });

  it('targets only permanently unsubscribed contacts when the Unsubscribed facet is active', async () => {
    expect(await emailsFor({status: 'unsubscribed'})).toEqual(['left@example.com']);
  });

  it('targets only subscribed contacts when the Subscribed facet is active', async () => {
    expect(await emailsFor({status: 'subscribed'})).toEqual(['active@example.com']);
  });

  it('keeps the legacy subscribed=false filter spanning both opt-out states for API callers', async () => {
    expect(await emailsFor({subscribed: false})).toEqual(['left@example.com', 'sleeping@example.com']);
  });

  it('lets status win over the legacy boolean when both are sent', async () => {
    expect(await emailsFor({status: 'snoozed', subscribed: true})).toEqual(['sleeping@example.com']);
  });

  it('combines the search, the status and the unticked rows', async () => {
    const sleeping = await prisma.contact.findFirstOrThrow({where: {projectId, email: 'sleeping@example.com'}});

    expect(await emailsFor({search: 'LEFT', status: 'unsubscribed'})).toEqual(['left@example.com']);
    expect(await emailsFor({status: 'snoozed'}, [sleeping.id])).toEqual([]);
    expect(await emailsFor({})).toEqual(['active@example.com', 'left@example.com', 'sleeping@example.com']);
  });
});

import {beforeEach, describe, expect, it} from 'vitest';
import {ContactService} from '../ContactService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * Snoozing: a temporary unsubscribe that ends by itself.
 *
 * A snooze is `subscribed = false` plus a `snoozedUntil` date, which is what lets every send
 * path suppress a snoozed contact through the `subscribed` filter it already has. The price of
 * that design is a single invariant -- every other write to `subscribed` must clear
 * `snoozedUntil` -- and most of what is tested here is that invariant holding, because the
 * failure it prevents is mailing someone the system had already been told to stop mailing.
 */
describe('ContactService - snoozing', () => {
  const prisma = getPrismaClient();
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  const createContact = (email: string, subscribed = true) =>
    factories.createContact({projectId, email, subscribed});

  describe('snoozing a contact', () => {
    it('unsubscribes the contact and records when they come back', async () => {
      const contact = await createContact('pause@example.com');

      const snoozed = await ContactService.snooze(contact.id, '1_month');

      // Suppression is carried by `subscribed`, not by the date -- that is the whole design.
      expect(snoozed.subscribed).toBe(false);
      expect(snoozed.snoozedUntil).toBeInstanceOf(Date);
      expect(snoozed.snoozedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('counts calendar units, so a month lands on the same day of the next month', async () => {
      const contact = await createContact('calendar@example.com');

      const before = new Date();
      const snoozed = await ContactService.snooze(contact.id, '1_month');
      const until = snoozed.snoozedUntil!;

      expect(until.getDate()).toBe(before.getDate());
      expect(until.getMonth()).toBe((before.getMonth() + 1) % 12);
    });

    it('offers windows from two weeks to a year, each longer than the last', async () => {
      const durations = ['2_weeks', '1_month', '6_months', '1_year'] as const;
      const ends: number[] = [];

      for (const duration of durations) {
        const contact = await createContact(`${duration}@example.com`);
        const snoozed = await ContactService.snooze(contact.id, duration);
        ends.push(snoozed.snoozedUntil!.getTime());
      }

      expect(ends).toEqual([...ends].sort((a, b) => a - b));
    });

    it('emits contact.unsubscribed carrying the snooze reason and end date', async () => {
      const contact = await createContact('event@example.com');

      const snoozed = await ContactService.snooze(contact.id, '6_months');

      // Reusing the existing event is what makes workflows, WAIT_FOR_EVENT steps and the
      // activity feed pick a snooze up without any of them changing.
      const event = await prisma.event.findFirst({
        where: {contactId: contact.id, name: 'contact.unsubscribed'},
      });

      expect(event).not.toBeNull();
      expect(event!.data).toMatchObject({
        reason: 'snooze',
        duration: '6_months',
        snoozedUntil: snoozed.snoozedUntil!.toISOString(),
      });
    });

    it('rejects an unknown contact rather than silently doing nothing', async () => {
      await expect(
        ContactService.snooze('00000000-0000-0000-0000-000000000000', '1_month'),
      ).rejects.toThrow(/not found/i);
    });

    it('moves the date forward when an already-snoozed contact snoozes again', async () => {
      const contact = await createContact('again@example.com');

      const first = await ContactService.snooze(contact.id, '2_weeks');
      const second = await ContactService.snooze(contact.id, '1_year');

      expect(second.snoozedUntil!.getTime()).toBeGreaterThan(first.snoozedUntil!.getTime());
      expect(second.subscribed).toBe(false);
    });
  });

  /**
   * The invariant. Each of these paths writes `subscribed`, and each one must take the snooze
   * with it -- otherwise the sweep would resubscribe the contact when the stale date passed.
   */
  describe('every write to subscribed clears the snooze', () => {
    it('clears it when the contact resubscribes', async () => {
      const contact = await createContact('resub@example.com');
      await ContactService.snooze(contact.id, '1_year');

      const resubscribed = await ContactService.subscribe(contact.id);

      expect(resubscribed.subscribed).toBe(true);
      expect(resubscribed.snoozedUntil).toBeNull();
    });

    it('clears it when the contact unsubscribes for good', async () => {
      const contact = await createContact('gone@example.com');
      await ContactService.snooze(contact.id, '1_year');

      // A recipient who snoozed and then decided to leave must stay gone. Without this the
      // sweep would bring them back a year later.
      const unsubscribed = await ContactService.unsubscribe(contact.id);

      expect(unsubscribed.subscribed).toBe(false);
      expect(unsubscribed.snoozedUntil).toBeNull();
    });

    it('clears it on a PATCH that sets subscribed', async () => {
      const contact = await createContact('patch@example.com');
      await ContactService.snooze(contact.id, '1_year');

      const updated = await ContactService.update(projectId, contact.id, {subscribed: false});

      expect(updated.snoozedUntil).toBeNull();
    });

    it('clears it on an upsert that sets subscribed', async () => {
      const contact = await createContact('upsert@example.com');
      await ContactService.snooze(contact.id, '1_year');

      const upserted = await ContactService.upsert(projectId, 'upsert@example.com', {}, false);

      expect(upserted.snoozedUntil).toBeNull();
    });

    it('leaves it alone when a write does not touch subscribed', async () => {
      const contact = await createContact('dataonly@example.com');
      const snoozed = await ContactService.snooze(contact.id, '1_year');

      // Editing custom fields is not a subscription decision and must not cancel a snooze.
      const updated = await ContactService.update(projectId, contact.id, {data: {plan: 'pro'}});

      expect(updated.snoozedUntil?.toISOString()).toBe(snoozed.snoozedUntil!.toISOString());
    });

    it('clears it on a bulk subscribe', async () => {
      const contact = await createContact('bulksub@example.com');
      await ContactService.snooze(contact.id, '1_year');

      await ContactService.bulkSubscribe(projectId, [contact.id]);

      const after = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(after!.subscribed).toBe(true);
      expect(after!.snoozedUntil).toBeNull();
    });

    it('clears it on a bulk unsubscribe, even though the contact does not flip', async () => {
      const contact = await createContact('bulkunsub@example.com');
      await ContactService.snooze(contact.id, '1_year');

      // The contact is already `subscribed = false`, so it is reported as unchanged -- but an
      // operator who bulk-unsubscribes has still made a decision the sweep must not undo.
      const result = await ContactService.bulkUnsubscribe(projectId, [contact.id]);

      const after = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(after!.subscribed).toBe(false);
      expect(after!.snoozedUntil).toBeNull();
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(1);
    });
  });

  /**
   * The dashboard's Status facet. Snoozed contacts have to be their own bucket: folded into
   * Unsubscribed they read as churn, and left in Subscribed they would be reported as
   * reachable when nothing will be sent to them.
   */
  describe('filtering by status', () => {
    beforeEach(async () => {
      await createContact('active@example.com');

      const snoozed = await createContact('sleeping@example.com');
      await ContactService.snooze(snoozed.id, '1_year');

      const gone = await createContact('left@example.com');
      await ContactService.unsubscribe(gone.id);
    });

    const emailsFor = async (status: 'subscribed' | 'snoozed' | 'unsubscribed') => {
      const page = await ContactService.list(projectId, 50, undefined, undefined, {status});
      return page.data.map(c => c.email).sort();
    };

    it('puts each contact in exactly one bucket', async () => {
      expect(await emailsFor('subscribed')).toEqual(['active@example.com']);
      expect(await emailsFor('snoozed')).toEqual(['sleeping@example.com']);
      expect(await emailsFor('unsubscribed')).toEqual(['left@example.com']);
    });

    it('builds the same buckets for the shared filter the bulk actions use', async () => {
      const emailsWhere = async (status: 'subscribed' | 'snoozed' | 'unsubscribed') => {
        const contacts = await prisma.contact.findMany({where: ContactService.buildFilterWhere(projectId, {status})});
        return contacts.map(c => c.email).sort();
      };

      expect(await emailsWhere('subscribed')).toEqual(await emailsFor('subscribed'));
      expect(await emailsWhere('snoozed')).toEqual(await emailsFor('snoozed'));
      expect(await emailsWhere('unsubscribed')).toEqual(await emailsFor('unsubscribed'));
    });

    it('still honours the legacy subscribed=false filter, which spans both opt-out states', async () => {
      const page = await ContactService.list(projectId, 50, undefined, undefined, {subscribed: false});

      expect(page.data.map(c => c.email).sort()).toEqual(['left@example.com', 'sleeping@example.com']);
    });
  });

  describe('resuming expired snoozes', () => {
    /** Put a contact's snooze in the past, as if the window had elapsed. */
    const expire = (contactId: string) =>
      prisma.contact.update({
        where: {id: contactId},
        data: {snoozedUntil: new Date(Date.now() - 60_000)},
      });

    it('resubscribes a contact whose window has passed and clears the date', async () => {
      const contact = await createContact('due@example.com');
      await ContactService.snooze(contact.id, '2_weeks');
      await expire(contact.id);

      const resumed = await ContactService.resumeExpiredSnoozes();

      expect(resumed).toBe(1);
      const after = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(after!.subscribed).toBe(true);
      expect(after!.snoozedUntil).toBeNull();
    });

    it('leaves a contact whose window is still running alone', async () => {
      const contact = await createContact('notdue@example.com');
      await ContactService.snooze(contact.id, '1_year');

      const resumed = await ContactService.resumeExpiredSnoozes();

      expect(resumed).toBe(0);
      const after = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(after!.subscribed).toBe(false);
      expect(after!.snoozedUntil).not.toBeNull();
    });

    it('emits contact.subscribed marked as a snooze expiry', async () => {
      const contact = await createContact('wake@example.com');
      await ContactService.snooze(contact.id, '2_weeks');
      await expire(contact.id);

      await ContactService.resumeExpiredSnoozes();

      const event = await prisma.event.findFirst({
        where: {contactId: contact.id, name: 'contact.subscribed'},
      });

      expect(event).not.toBeNull();
      expect(event!.data).toMatchObject({reason: 'snooze_expired'});
    });

    it('is safe to run twice -- the second pass finds nothing to do', async () => {
      const contact = await createContact('twice@example.com');
      await ContactService.snooze(contact.id, '2_weeks');
      await expire(contact.id);

      expect(await ContactService.resumeExpiredSnoozes()).toBe(1);
      expect(await ContactService.resumeExpiredSnoozes()).toBe(0);

      // One wake-up, one event. A repeat run must not tell the contact twice.
      const events = await prisma.event.count({
        where: {contactId: contact.id, name: 'contact.subscribed'},
      });
      expect(events).toBe(1);
    });

    it('stops at maxPerRun and leaves the rest for the next sweep', async () => {
      for (const email of ['a@example.com', 'b@example.com', 'c@example.com']) {
        const contact = await createContact(email);
        await ContactService.snooze(contact.id, '2_weeks');
        await expire(contact.id);
      }

      // The cap exists so a cohort that comes due together does not put thousands of
      // contact.subscribed events through the workflow engine in one burst.
      expect(await ContactService.resumeExpiredSnoozes({batchSize: 2, maxPerRun: 2})).toBe(2);
      expect(await ContactService.resumeExpiredSnoozes({batchSize: 2, maxPerRun: 2})).toBe(1);
    });

    it('never wakes a contact whose snooze was cleared by a suppression', async () => {
      const contact = await createContact('bounced@example.com');
      await ContactService.snooze(contact.id, '2_weeks');

      // What the SES bounce and complaint branches write.
      await prisma.contact.update({
        where: {id: contact.id},
        data: {subscribed: false, snoozedUntil: null},
      });

      const resumed = await ContactService.resumeExpiredSnoozes();

      expect(resumed).toBe(0);
      const after = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(after!.subscribed).toBe(false);
    });
  });
});

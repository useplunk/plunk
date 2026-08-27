import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {prisma as servicePrisma} from '../../database/prisma';
import {ContactService} from '../ContactService';

describe('ContactService - Duplicate Prevention & Data Merging', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  describe('Duplicate Email Prevention', () => {
    it('should REJECT creating duplicate email in same project', async () => {
      const email = 'test@example.com';

      await ContactService.create(projectId, {email});

      await expect(ContactService.create(projectId, {email})).rejects.toThrow(/already exists/i);
    });

    it('should ALLOW same email in different projects (multi-tenancy)', async () => {
      const {project: project1} = await factories.createUserWithProject();
      const {project: project2} = await factories.createUserWithProject();

      const email = 'test@example.com';

      const contact1 = await ContactService.create(project1.id, {email});
      const contact2 = await ContactService.create(project2.id, {email});

      expect(contact1.id).not.toBe(contact2.id);
      expect(contact1.email).toBe(email);
      expect(contact2.email).toBe(email);
    });

    it('should REJECT updating contact to duplicate email in same project', async () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';

      await ContactService.create(projectId, {email: email1});
      const contact2 = await ContactService.create(projectId, {email: email2});

      await expect(ContactService.update(projectId, contact2.id, {email: email1})).rejects.toThrow(/already exists/i);
    });

    it('should ALLOW updating contact to same email (no-op)', async () => {
      const email = 'test@example.com';
      const contact = await ContactService.create(projectId, {email});

      const updated = await ContactService.update(projectId, contact.id, {
        email,
        data: {firstName: 'John'},
      });

      expect(updated.email).toBe(email);
    });

    it('should handle race condition when creating same email simultaneously', async () => {
      const email = 'race@example.com';

      const promises = Array.from({length: 10}, () => ContactService.create(projectId, {email}));

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(1);
      expect(failed).toBe(9);

      const contacts = await prisma.contact.findMany({
        where: {projectId, email},
      });
      expect(contacts).toHaveLength(1);
    });

    it('should return the elected contact to concurrent first-seen upserts without overwriting it', async () => {
      const email = 'first-seen-race@example.com';
      const concurrency = 8;
      const originalFindFirst = servicePrisma.contact.findFirst.bind(servicePrisma.contact);
      const originalCreate = servicePrisma.contact.create.bind(servicePrisma.contact);
      let initialLookups = 0;
      let releaseInitialLookups!: () => void;
      const allInitialLookupsStarted = new Promise<void>(resolve => {
        releaseInitialLookups = resolve;
      });
      let releaseLosingCreates!: () => void;
      const electedContactCreated = new Promise<void>(resolve => {
        releaseLosingCreates = resolve;
      });

      const contactLookup = vi.spyOn(servicePrisma.contact, 'findFirst').mockImplementation(async args => {
        if (args.where?.projectId === projectId && args.where?.email === email) {
          initialLookups += 1;
          if (initialLookups === concurrency) releaseInitialLookups();
          await allInitialLookupsStarted;
          return null;
        }

        return originalFindFirst(args);
      });
      const contactCreate = vi.spyOn(servicePrisma.contact, 'create').mockImplementation(async args => {
        if (args.data.projectId === projectId && args.data.email === email && args.data.subscribed !== false) {
          await electedContactCreated;
        }

        const contact = await originalCreate(args);
        if (args.data.projectId === projectId && args.data.email === email && args.data.subscribed === false) {
          releaseLosingCreates();
        }
        return contact;
      });

      try {
        const contacts = await Promise.all([
          ContactService.upsert(projectId, email, {source: 'unsubscribe'}, false),
          ...Array.from({length: concurrency - 1}, (_, index) =>
            ContactService.upsert(projectId, ` FIRST-SEEN-RACE@EXAMPLE.COM `, {attempt: index}),
          ),
        ]);

        expect(new Set(contacts.map(contact => contact.id))).toEqual(new Set([contacts[0]!.id]));
      } finally {
        contactLookup.mockRestore();
        contactCreate.mockRestore();
      }

      const stored = await prisma.contact.findUniqueOrThrow({
        where: {projectId_email: {projectId, email}},
      });
      expect(stored.subscribed).toBe(false);
      expect(stored.data).toEqual({source: 'unsubscribe'});
      expect(await prisma.contact.count({where: {projectId, email}})).toBe(1);
    });

    it('should honor a losing explicit unsubscribe without overwriting the elected contact data', async () => {
      const email = 'losing-unsubscribe@example.com';
      const concurrency = 8;
      const originalFindFirst = servicePrisma.contact.findFirst.bind(servicePrisma.contact);
      const originalCreate = servicePrisma.contact.create.bind(servicePrisma.contact);
      let initialLookups = 0;
      let releaseInitialLookups!: () => void;
      const allInitialLookupsStarted = new Promise<void>(resolve => {
        releaseInitialLookups = resolve;
      });
      let releaseLosingCreates!: () => void;
      const electedContactCreated = new Promise<void>(resolve => {
        releaseLosingCreates = resolve;
      });

      const contactLookup = vi.spyOn(servicePrisma.contact, 'findFirst').mockImplementation(async args => {
        if (args.where?.projectId === projectId && args.where?.email === email) {
          initialLookups += 1;
          if (initialLookups === concurrency) releaseInitialLookups();
          await allInitialLookupsStarted;
          return null;
        }

        return originalFindFirst(args);
      });
      const contactCreate = vi.spyOn(servicePrisma.contact, 'create').mockImplementation(async args => {
        const contactData = args.data.data;
        const shouldWin =
          contactData !== null &&
          typeof contactData === 'object' &&
          !Array.isArray(contactData) &&
          'source' in contactData &&
          contactData.source === 'winner';

        if (args.data.projectId === projectId && args.data.email === email && !shouldWin) {
          await electedContactCreated;
        }

        const contact = await originalCreate(args);
        if (args.data.projectId === projectId && args.data.email === email && shouldWin) {
          releaseLosingCreates();
        }
        return contact;
      });

      try {
        const contacts = await Promise.all([
          ContactService.upsert(projectId, email, {source: 'winner'}, true),
          ContactService.upsert(projectId, email, {source: 'losing unsubscribe'}, false),
          ...Array.from({length: concurrency - 2}, (_, index) =>
            ContactService.upsert(projectId, ` LOSING-UNSUBSCRIBE@EXAMPLE.COM `, {attempt: index}),
          ),
        ]);

        expect(new Set(contacts.map(contact => contact.id))).toEqual(new Set([contacts[0]!.id]));
      } finally {
        contactLookup.mockRestore();
        contactCreate.mockRestore();
      }

      const stored = await prisma.contact.findUniqueOrThrow({
        where: {projectId_email: {projectId, email}},
      });
      expect(stored.subscribed).toBe(false);
      expect(stored.data).toEqual({source: 'winner'});
      expect(
        await prisma.event.count({
          where: {projectId, contactId: stored.id, name: 'contact.unsubscribed'},
        }),
      ).toBe(1);
    });
  });

  describe('Email Normalization (case-insensitive find-or-create)', () => {
    it('should treat case-variant addresses as the same contact on upsert', async () => {
      const first = await ContactService.upsert(projectId, 'User@Example.com', {firstName: 'John'});
      const second = await ContactService.upsert(projectId, 'user@example.com', {lastName: 'Doe'});

      expect(second.id).toBe(first.id);
      expect(second.email).toBe('user@example.com');
      expect(second.data).toMatchObject({firstName: 'John', lastName: 'Doe'});

      const contacts = await prisma.contact.findMany({where: {projectId}});
      expect(contacts).toHaveLength(1);
    });

    it('should store email lowercased and trimmed on create', async () => {
      const contact = await ContactService.create(projectId, {email: '  MixedCase@Example.COM '});
      expect(contact.email).toBe('mixedcase@example.com');
    });

    it('should reject a case-variant duplicate on create', async () => {
      await ContactService.create(projectId, {email: 'dup@example.com'});
      await expect(ContactService.create(projectId, {email: 'DUP@example.com'})).rejects.toThrow(/already exists/i);
    });

    it('should find a contact regardless of lookup casing', async () => {
      const created = await ContactService.create(projectId, {email: 'find@example.com'});

      const found = await ContactService.findByEmail(projectId, 'FIND@Example.com');
      expect(found?.id).toBe(created.id);
    });

    it('should match case-insensitively in bulk lookup and echo original input', async () => {
      await ContactService.create(projectId, {email: 'known@example.com'});

      const result = await ContactService.lookup(projectId, ['KNOWN@example.com', 'missing@example.com']);
      expect(result.found).toEqual(['KNOWN@example.com']);
      expect(result.notFound).toEqual(['missing@example.com']);
    });
  });

  describe('Upsert Data Merging Logic', () => {
    it('should merge new data with existing data without losing fields', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        firstName: 'John',
        plan: 'free',
        signupDate: '2024-01-01',
      });

      expect(contact.data).toMatchObject({
        firstName: 'John',
        plan: 'free',
        signupDate: '2024-01-01',
      });

      const updated = await ContactService.upsert(projectId, email, {
        lastName: 'Doe',
        company: 'Acme Inc',
      });

      expect(updated.data).toMatchObject({
        firstName: 'John',
        plan: 'free',
        signupDate: '2024-01-01',
        lastName: 'Doe',
        company: 'Acme Inc',
      });
    });

    it('should overwrite existing fields with new values', async () => {
      const email = 'test@example.com';

      await ContactService.upsert(projectId, email, {
        plan: 'free',
        credits: 100,
      });

      const updated = await ContactService.upsert(projectId, email, {
        plan: 'pro',
        credits: 1000,
      });

      expect(updated.data).toMatchObject({
        plan: 'pro',
        credits: 1000,
      });
    });

    it('should NOT persist non-persistent data', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        firstName: 'John',
        tempToken: {value: 'abc123', persistent: false},
        oneTimeCode: {value: '123456', persistent: false},
      });

      expect(contact.data).toHaveProperty('firstName', 'John');
      expect(contact.data).not.toHaveProperty('tempToken');
      expect(contact.data).not.toHaveProperty('oneTimeCode');
    });

    it('should ignore reserved fields (plunk_id, plunk_email)', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        firstName: 'John',
        plunk_id: 'malicious-id',
        plunk_email: 'hacker@evil.com',
      });

      expect(contact.data).toHaveProperty('firstName', 'John');
      expect(contact.data).not.toHaveProperty('plunk_id');
      expect(contact.data).not.toHaveProperty('plunk_email');
    });

    it('should handle null data gracefully', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, undefined);

      expect(contact.email).toBe(email);
    });

    it('should handle empty object data', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {});

      expect(contact.email).toBe(email);
    });

    it('should update subscription status independently of data', async () => {
      const email = 'test@example.com';

      await ContactService.upsert(projectId, email, {firstName: 'John'}, true);

      const subscribed = await prisma.contact.findFirst({
        where: {projectId, email},
      });
      expect(subscribed?.subscribed).toBe(true);

      await ContactService.upsert(projectId, email, {lastName: 'Doe'}, false);

      const unsubscribed = await prisma.contact.findFirst({
        where: {projectId, email},
      });
      expect(unsubscribed?.subscribed).toBe(false);
      expect(unsubscribed?.data).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });

  describe('getMergedData - Template Rendering', () => {
    it('should include reserved plunk_id and plunk_email fields', async () => {
      const contact = await factories.createContact({
        projectId,
        email: 'test@example.com',
      });

      const merged = ContactService.getMergedData(contact);

      expect(merged.plunk_id).toBe(contact.id);
      expect(merged.plunk_email).toBe('test@example.com');
    });

    it('should merge persistent contact data', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {firstName: 'John', plan: 'pro'},
      });

      const merged = ContactService.getMergedData(contact);

      expect(merged.firstName).toBe('John');
      expect(merged.plan).toBe('pro');
    });

    it('should merge temporary (non-persistent) data for rendering', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {firstName: 'John'},
      });

      const temporaryData = {
        resetToken: {value: 'temp123', persistent: false},
        resetUrl: {value: 'https://app.com/reset?token=temp123', persistent: false},
      };

      const merged = ContactService.getMergedData(contact, temporaryData);

      expect(merged.firstName).toBe('John');
      expect(merged.resetToken).toBe('temp123');
      expect(merged.resetUrl).toBe('https://app.com/reset?token=temp123');
    });

    it('should override persistent data with temporary data', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {name: 'Stored Name'},
      });

      const temporaryData = {
        name: 'Override Name',
      };

      const merged = ContactService.getMergedData(contact, temporaryData);

      expect(merged.name).toBe('Override Name');
    });

    it('should not allow overriding reserved fields via temporary data', async () => {
      const contact = await factories.createContact({
        projectId,
        email: 'real@example.com',
      });

      const temporaryData = {
        plunk_id: 'fake-id',
        plunk_email: 'fake@example.com',
      };

      const merged = ContactService.getMergedData(contact, temporaryData);

      expect(merged.plunk_id).toBe(contact.id);
      expect(merged.plunk_email).toBe('real@example.com');
    });
  });

  describe('Data Integrity Edge Cases', () => {
    it('should handle deeply nested object data', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        profile: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001',
          },
        },
      });

      expect(contact.data).toMatchObject({
        profile: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001',
          },
        },
      });
    });

    it('should handle array data', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        tags: ['vip', 'beta-tester', 'early-adopter'],
      });

      expect(contact.data).toMatchObject({
        tags: ['vip', 'beta-tester', 'early-adopter'],
      });
    });

    it('should handle special characters in field names', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        'custom-field': 'value',
        'field.with.dots': 'value2',
        'field with spaces': 'value3',
      });

      expect(contact.data).toHaveProperty('custom-field', 'value');
      expect(contact.data).toHaveProperty('field.with.dots', 'value2');
      expect(contact.data).toHaveProperty('field with spaces', 'value3');
    });

    it('should handle boolean, number, and string values', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        isPremium: true,
        credits: 100,
        name: 'John Doe',
        discount: 0.15,
      });

      expect(contact.data).toMatchObject({
        isPremium: true,
        credits: 100,
        name: 'John Doe',
        discount: 0.15,
      });
    });

    it('should delete keys when null value is passed', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        firstName: 'John',
        middleName: null, // null should delete/not store the key
        lastName: 'Doe',
      });

      expect(contact.data).toHaveProperty('firstName', 'John');
      expect(contact.data).not.toHaveProperty('middleName'); // Key should not exist
      expect(contact.data).toHaveProperty('lastName', 'Doe');
    });

    it('should remove existing fields when null is passed', async () => {
      const email = 'test@example.com';

      // Create contact with data
      await ContactService.upsert(projectId, email, {
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
      });

      // Update with null to remove middleName
      const updated = await ContactService.upsert(projectId, email, {
        middleName: null, // Should delete this field
      });

      expect(updated.data).toHaveProperty('firstName', 'John'); // Preserved
      expect(updated.data).not.toHaveProperty('middleName'); // Removed
      expect(updated.data).toHaveProperty('lastName', 'Doe'); // Preserved
    });

    it('should filter out empty string values from data', async () => {
      const email = 'test@example.com';

      const contact = await ContactService.upsert(projectId, email, {
        firstName: 'John',
        middleName: '', // Empty string should be filtered out
        lastName: 'Doe',
        company: '', // Empty string should be filtered out
      });

      expect(contact.data).toHaveProperty('firstName', 'John');
      expect(contact.data).toHaveProperty('lastName', 'Doe');
      expect(contact.data).not.toHaveProperty('middleName');
      expect(contact.data).not.toHaveProperty('company');
    });

    it('should not overwrite existing data with empty strings', async () => {
      const email = 'test@example.com';

      // Create contact with data
      await ContactService.upsert(projectId, email, {
        firstName: 'John',
        company: 'Acme Inc',
      });

      // Update with empty string - should preserve existing values
      const updated = await ContactService.upsert(projectId, email, {
        firstName: '', // Should be filtered out, preserving "John"
        lastName: 'Doe',
      });

      expect(updated.data).toHaveProperty('firstName', 'John'); // Preserved
      expect(updated.data).toHaveProperty('company', 'Acme Inc'); // Preserved
      expect(updated.data).toHaveProperty('lastName', 'Doe'); // New value
    });
  });

  describe('Contact CRUD Operations', () => {
    it('should find contact by email', async () => {
      const email = 'find@example.com';
      const created = await ContactService.create(projectId, {email});

      const found = await ContactService.findByEmail(projectId, email);

      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(email);
    });

    it('should return null when contact not found by email', async () => {
      const found = await ContactService.findByEmail(projectId, 'nonexistent@example.com');

      expect(found).toBeNull();
    });

    it('should get contact count for project', async () => {
      await factories.createContact({projectId});
      await factories.createContact({projectId});
      await factories.createContact({projectId});

      const count = await ContactService.count(projectId);

      expect(count).toBe(3);
    });

    it('should delete contact', async () => {
      const contact = await factories.createContact({projectId});

      await ContactService.delete(projectId, contact.id);

      const deleted = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(deleted).toBeNull();
    });

    it('should throw 404 when deleting non-existent contact', async () => {
      await expect(ContactService.delete(projectId, 'non-existent')).rejects.toThrow(/not found/i);
    });

    it('should throw 404 when getting non-existent contact', async () => {
      await expect(ContactService.get(projectId, 'non-existent')).rejects.toThrow(/not found/i);
    });
  });

  describe('Public Contact Operations (Unsubscribe)', () => {
    it('should get contact by ID without project authentication', async () => {
      const contact = await factories.createContact({projectId});

      const fetched = await ContactService.getById(contact.id);

      expect(fetched.id).toBe(contact.id);
      expect(fetched.email).toBe(contact.email);
    });

    it('should subscribe contact', async () => {
      const contact = await factories.createContact({
        projectId,
        subscribed: false,
      });

      await ContactService.subscribe(contact.id);

      const subscribed = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(subscribed?.subscribed).toBe(true);
    });

    it('should unsubscribe contact', async () => {
      const contact = await factories.createContact({
        projectId,
        subscribed: true,
      });

      await ContactService.unsubscribe(contact.id);

      const unsubscribed = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(unsubscribed?.subscribed).toBe(false);
    });
  });

  describe('Bulk Contact Operations', () => {
    describe('bulkSubscribe', () => {
      it('should subscribe multiple unsubscribed contacts', async () => {
        const contact1 = await factories.createContact({projectId, subscribed: false});
        const contact2 = await factories.createContact({projectId, subscribed: false});
        const contact3 = await factories.createContact({projectId, subscribed: false});

        const result = await ContactService.bulkSubscribe(projectId, [contact1.id, contact2.id, contact3.id]);

        expect(result.updated).toBe(3);

        const contacts = await prisma.contact.findMany({
          where: {id: {in: [contact1.id, contact2.id, contact3.id]}},
        });

        expect(contacts.every(c => c.subscribed)).toBe(true);
      });

      it('should only update unsubscribed contacts, not already subscribed ones', async () => {
        const unsubscribed1 = await factories.createContact({projectId, subscribed: false});
        const unsubscribed2 = await factories.createContact({projectId, subscribed: false});
        const alreadySubscribed = await factories.createContact({projectId, subscribed: true});

        const result = await ContactService.bulkSubscribe(projectId, [
          unsubscribed1.id,
          unsubscribed2.id,
          alreadySubscribed.id,
        ]);

        expect(result.updated).toBe(2);
      });

      it('should return 0 if no contacts need updating', async () => {
        const contact1 = await factories.createContact({projectId, subscribed: true});
        const contact2 = await factories.createContact({projectId, subscribed: true});

        const result = await ContactService.bulkSubscribe(projectId, [contact1.id, contact2.id]);

        expect(result.updated).toBe(0);
      });

      it('should only update contacts belonging to the specified project', async () => {
        const {project: otherProject} = await factories.createUserWithProject();
        const ownContact = await factories.createContact({projectId, subscribed: false});
        const otherContact = await factories.createContact({projectId: otherProject.id, subscribed: false});

        const result = await ContactService.bulkSubscribe(projectId, [ownContact.id, otherContact.id]);

        expect(result.updated).toBe(1);

        const ownContactAfter = await prisma.contact.findUnique({where: {id: ownContact.id}});
        const otherContactAfter = await prisma.contact.findUnique({where: {id: otherContact.id}});

        expect(ownContactAfter?.subscribed).toBe(true);
        expect(otherContactAfter?.subscribed).toBe(false);
      });

      it('should handle empty contact IDs array', async () => {
        const result = await ContactService.bulkSubscribe(projectId, []);

        expect(result.updated).toBe(0);
      });

      it('should handle non-existent contact IDs gracefully', async () => {
        const result = await ContactService.bulkSubscribe(projectId, ['non-existent-1', 'non-existent-2']);

        expect(result.updated).toBe(0);
      });

      it('should handle large batches efficiently', async () => {
        const contacts = await Promise.all(
          Array.from({length: 150}, () => factories.createContact({projectId, subscribed: false})),
        );
        const contactIds = contacts.map(c => c.id);

        const result = await ContactService.bulkSubscribe(projectId, contactIds);

        expect(result.updated).toBe(150);

        const updatedContacts = await prisma.contact.findMany({
          where: {id: {in: contactIds}},
        });

        expect(updatedContacts.every(c => c.subscribed)).toBe(true);
      });
    });

    describe('bulkUnsubscribe', () => {
      it('should unsubscribe multiple subscribed contacts', async () => {
        const contact1 = await factories.createContact({projectId, subscribed: true});
        const contact2 = await factories.createContact({projectId, subscribed: true});
        const contact3 = await factories.createContact({projectId, subscribed: true});

        const result = await ContactService.bulkUnsubscribe(projectId, [contact1.id, contact2.id, contact3.id]);

        expect(result.updated).toBe(3);

        const contacts = await prisma.contact.findMany({
          where: {id: {in: [contact1.id, contact2.id, contact3.id]}},
        });

        expect(contacts.every(c => !c.subscribed)).toBe(true);
      });

      it('should only update subscribed contacts, not already unsubscribed ones', async () => {
        const subscribed1 = await factories.createContact({projectId, subscribed: true});
        const subscribed2 = await factories.createContact({projectId, subscribed: true});
        const alreadyUnsubscribed = await factories.createContact({projectId, subscribed: false});

        const result = await ContactService.bulkUnsubscribe(projectId, [
          subscribed1.id,
          subscribed2.id,
          alreadyUnsubscribed.id,
        ]);

        expect(result.updated).toBe(2);
      });

      it('should return 0 if no contacts need updating', async () => {
        const contact1 = await factories.createContact({projectId, subscribed: false});
        const contact2 = await factories.createContact({projectId, subscribed: false});

        const result = await ContactService.bulkUnsubscribe(projectId, [contact1.id, contact2.id]);

        expect(result.updated).toBe(0);
      });

      it('should only update contacts belonging to the specified project', async () => {
        const {project: otherProject} = await factories.createUserWithProject();
        const ownContact = await factories.createContact({projectId, subscribed: true});
        const otherContact = await factories.createContact({projectId: otherProject.id, subscribed: true});

        const result = await ContactService.bulkUnsubscribe(projectId, [ownContact.id, otherContact.id]);

        expect(result.updated).toBe(1);

        const ownContactAfter = await prisma.contact.findUnique({where: {id: ownContact.id}});
        const otherContactAfter = await prisma.contact.findUnique({where: {id: otherContact.id}});

        expect(ownContactAfter?.subscribed).toBe(false);
        expect(otherContactAfter?.subscribed).toBe(true);
      });

      it('should handle empty contact IDs array', async () => {
        const result = await ContactService.bulkUnsubscribe(projectId, []);

        expect(result.updated).toBe(0);
      });

      it('should handle non-existent contact IDs gracefully', async () => {
        const result = await ContactService.bulkUnsubscribe(projectId, ['non-existent-1', 'non-existent-2']);

        expect(result.updated).toBe(0);
      });
    });

    describe('bulkDelete', () => {
      it('should delete multiple contacts', async () => {
        const contact1 = await factories.createContact({projectId});
        const contact2 = await factories.createContact({projectId});
        const contact3 = await factories.createContact({projectId});

        const result = await ContactService.bulkDelete(projectId, [contact1.id, contact2.id, contact3.id]);

        expect(result.deleted).toBe(3);

        const contacts = await prisma.contact.findMany({
          where: {id: {in: [contact1.id, contact2.id, contact3.id]}},
        });

        expect(contacts).toHaveLength(0);
      });

      it('should only delete contacts belonging to the specified project', async () => {
        const {project: otherProject} = await factories.createUserWithProject();
        const ownContact = await factories.createContact({projectId});
        const otherContact = await factories.createContact({projectId: otherProject.id});

        const result = await ContactService.bulkDelete(projectId, [ownContact.id, otherContact.id]);

        expect(result.deleted).toBe(1);

        const ownContactAfter = await prisma.contact.findUnique({where: {id: ownContact.id}});
        const otherContactAfter = await prisma.contact.findUnique({where: {id: otherContact.id}});

        expect(ownContactAfter).toBeNull();
        expect(otherContactAfter).not.toBeNull();
      });

      it('should handle empty contact IDs array', async () => {
        const result = await ContactService.bulkDelete(projectId, []);

        expect(result.deleted).toBe(0);
      });

      it('should handle non-existent contact IDs gracefully', async () => {
        const result = await ContactService.bulkDelete(projectId, ['non-existent-1', 'non-existent-2']);

        expect(result.deleted).toBe(0);
      });

      it('should handle large batches efficiently', async () => {
        const contacts = await Promise.all(Array.from({length: 200}, () => factories.createContact({projectId})));
        const contactIds = contacts.map(c => c.id);

        const result = await ContactService.bulkDelete(projectId, contactIds);

        expect(result.deleted).toBe(200);

        const remainingContacts = await prisma.contact.findMany({
          where: {id: {in: contactIds}},
        });

        expect(remainingContacts).toHaveLength(0);
      });

      it('should delete both subscribed and unsubscribed contacts', async () => {
        const subscribed = await factories.createContact({projectId, subscribed: true});
        const unsubscribed = await factories.createContact({projectId, subscribed: false});

        const result = await ContactService.bulkDelete(projectId, [subscribed.id, unsubscribed.id]);

        expect(result.deleted).toBe(2);
      });

      it('should handle partial matches (some exist, some do not)', async () => {
        const existingContact = await factories.createContact({projectId});

        const result = await ContactService.bulkDelete(projectId, [existingContact.id, 'non-existent-id']);

        expect(result.deleted).toBe(1);

        const contact = await prisma.contact.findUnique({where: {id: existingContact.id}});
        expect(contact).toBeNull();
      });
    });

    describe('Bulk Operations - Project Isolation', () => {
      it('should never leak contacts between projects in bulk operations', async () => {
        const {project: project1} = await factories.createUserWithProject();
        const {project: project2} = await factories.createUserWithProject();

        const p1Contact1 = await factories.createContact({projectId: project1.id, subscribed: false});
        const p1Contact2 = await factories.createContact({projectId: project1.id, subscribed: false});
        const p2Contact1 = await factories.createContact({projectId: project2.id, subscribed: false});
        const p2Contact2 = await factories.createContact({projectId: project2.id, subscribed: false});

        await ContactService.bulkSubscribe(project1.id, [p1Contact1.id, p1Contact2.id, p2Contact1.id, p2Contact2.id]);

        const p1ContactsAfter = await prisma.contact.findMany({
          where: {projectId: project1.id},
        });
        const p2ContactsAfter = await prisma.contact.findMany({
          where: {projectId: project2.id},
        });

        expect(p1ContactsAfter.every(c => c.subscribed)).toBe(true);
        expect(p2ContactsAfter.every(c => !c.subscribed)).toBe(true);
      });
    });
  });
});

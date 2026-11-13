import {beforeEach, describe, expect, it} from 'vitest';
import {factories, getPrismaClient} from '../../../../../test/helpers';
import {ContactService} from '../../services/ContactService.js';
import {coerceCustomValue, importCustomData, importFieldKey} from '../import-processor.js';

/**
 * Tests for Contact Import Processor - Subscription Status Preservation
 * Verifies that CSV imports preserve subscription status correctly
 */
describe('Contact Import - Subscription Status Preservation', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  describe('Existing contacts', () => {
    it('should NOT change subscription status when CSV has no subscribed column for subscribed contact', async () => {
      // Create a subscribed contact
      const contact = await factories.createContact({
        projectId,
        subscribed: true,
        email: 'existing-subscribed@example.com',
      });

      // Verify initial state
      expect(contact.subscribed).toBe(true);

      // Simulate import without subscribed column (undefined)
      await ContactService.upsert(projectId, contact.email, {firstName: 'John'}, undefined);

      // Verify subscription status unchanged
      const updated = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(updated?.subscribed).toBe(true);
    });

    it('should NOT re-subscribe unsubscribed contact when CSV has no subscribed column', async () => {
      // Create an unsubscribed contact
      const contact = await factories.createContact({
        projectId,
        subscribed: false,
        email: 'existing-unsubscribed@example.com',
      });

      // Verify initial state
      expect(contact.subscribed).toBe(false);

      // Simulate import without subscribed column (undefined)
      await ContactService.upsert(projectId, contact.email, {firstName: 'Jane'}, undefined);

      // Verify subscription status unchanged (should NOT be re-subscribed)
      const updated = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(updated?.subscribed).toBe(false);
    });

    it('should update subscription status when CSV explicitly has subscribed=true', async () => {
      // Create an unsubscribed contact
      const contact = await factories.createContact({
        projectId,
        subscribed: false,
        email: 'import-resubscribe@example.com',
      });

      // Verify initial state
      expect(contact.subscribed).toBe(false);

      // Simulate import with explicit subscribed=true
      await ContactService.upsert(projectId, contact.email, {firstName: 'John'}, true);

      // Verify subscription status changed
      const updated = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(updated?.subscribed).toBe(true);
    });

    it('should update subscription status when CSV explicitly has subscribed=false', async () => {
      // Create a subscribed contact
      const contact = await factories.createContact({
        projectId,
        subscribed: true,
        email: 'import-unsubscribe@example.com',
      });

      // Verify initial state
      expect(contact.subscribed).toBe(true);

      // Simulate import with explicit subscribed=false
      await ContactService.upsert(projectId, contact.email, {firstName: 'Jane'}, false);

      // Verify subscription status changed
      const updated = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(updated?.subscribed).toBe(false);
    });
  });

  describe('New contacts', () => {
    it('should create new contact as subscribed when CSV has no subscribed column', async () => {
      const newEmail = 'new-import-default@example.com';

      // Simulate import without subscribed column (undefined)
      const contact = await ContactService.upsert(projectId, newEmail, {firstName: 'New'}, undefined);

      // New contacts should default to subscribed=true
      expect(contact.subscribed).toBe(true);
    });

    it('should create new contact as subscribed when CSV explicitly has subscribed=true', async () => {
      const newEmail = 'new-import-explicit-sub@example.com';

      // Simulate import with explicit subscribed=true
      const contact = await ContactService.upsert(projectId, newEmail, {firstName: 'New'}, true);

      expect(contact.subscribed).toBe(true);
    });

    it('should create new contact as unsubscribed when CSV explicitly has subscribed=false', async () => {
      const newEmail = 'new-import-explicit-unsub@example.com';

      // Simulate import with explicit subscribed=false
      const contact = await ContactService.upsert(projectId, newEmail, {firstName: 'New'}, false);

      expect(contact.subscribed).toBe(false);
    });
  });

  describe('CSV parsing logic', () => {
    it('should parse "true" string as boolean true', () => {
      const subscribedValue = 'true';
      const lowerValue = subscribedValue.toLowerCase().trim();
      const subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';

      expect(subscribed).toBe(true);
    });

    it('should parse "1" string as boolean true', () => {
      const subscribedValue = '1';
      const lowerValue = subscribedValue.toLowerCase().trim();
      const subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';

      expect(subscribed).toBe(true);
    });

    it('should parse "yes" string as boolean true', () => {
      const subscribedValue = 'yes';
      const lowerValue = subscribedValue.toLowerCase().trim();
      const subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';

      expect(subscribed).toBe(true);
    });

    it('should parse "false" string as boolean false', () => {
      const subscribedValue = 'false';
      const lowerValue = subscribedValue.toLowerCase().trim();
      const subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';

      expect(subscribed).toBe(false);
    });

    it('should parse "0" string as boolean false', () => {
      const subscribedValue = '0';
      const lowerValue = subscribedValue.toLowerCase().trim();
      const subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';

      expect(subscribed).toBe(false);
    });

    it('should parse "no" string as boolean false', () => {
      const subscribedValue = 'no';
      const lowerValue = subscribedValue.toLowerCase().trim();
      const subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';

      expect(subscribed).toBe(false);
    });

    it('should handle empty string as undefined', () => {
      const subscribedValue = '';
      let subscribed: boolean | undefined;

      if (subscribedValue !== undefined && subscribedValue !== '') {
        const lowerValue = subscribedValue.toLowerCase().trim();
        subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
      }

      expect(subscribed).toBeUndefined();
    });

    it('should handle undefined as undefined', () => {
      const subscribedValue = undefined;
      let subscribed: boolean | undefined;

      if (subscribedValue !== undefined && subscribedValue !== '') {
        const lowerValue = subscribedValue.toLowerCase().trim();
        subscribed = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
      }

      expect(subscribed).toBeUndefined();
    });
  });

  describe('Data preservation', () => {
    it('should preserve existing contact data while updating subscription', async () => {
      // Create contact with existing data
      const contact = await factories.createContact({
        projectId,
        subscribed: false,
        email: 'preserve-data@example.com',
        data: {
          firstName: 'Original',
          lastName: 'Name',
          plan: 'pro',
        },
      });

      // Update only subscription via import
      await ContactService.upsert(projectId, contact.email, {}, true);

      const updated = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      // Subscription should be updated
      expect(updated?.subscribed).toBe(true);

      // Original data should be preserved
      const data = updated?.data as Record<string, unknown>;
      expect(data?.firstName).toBe('Original');
      expect(data?.lastName).toBe('Name');
      expect(data?.plan).toBe('pro');
    });

    it('should merge new data while preserving subscription', async () => {
      // Create contact with existing data
      const contact = await factories.createContact({
        projectId,
        subscribed: false,
        email: 'merge-data@example.com',
        data: {
          firstName: 'John',
          plan: 'pro',
        },
      });

      // Import new data without changing subscription
      await ContactService.upsert(
        projectId,
        contact.email,
        {
          lastName: 'Doe',
          company: 'Acme Inc',
        },
        undefined,
      );

      const updated = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      // Subscription should be unchanged
      expect(updated?.subscribed).toBe(false);

      // Data should be merged
      const data = updated?.data as Record<string, unknown>;
      expect(data?.firstName).toBe('John'); // Preserved
      expect(data?.plan).toBe('pro'); // Preserved
      expect(data?.lastName).toBe('Doe'); // New
      expect(data?.company).toBe('Acme Inc'); // New
    });
  });
});

describe('coerceCustomValue', () => {
  describe('boolean coercion', () => {
    it.each(['true', 'TRUE', 'True', ' true ', 'yes', 'YES', 'Yes'])('coerces %j to true', value => {
      expect(coerceCustomValue(value)).toBe(true);
    });

    it.each(['false', 'FALSE', 'False', ' false ', 'no', 'NO', 'No'])('coerces %j to false', value => {
      expect(coerceCustomValue(value)).toBe(false);
    });
  });

  describe('number coercion', () => {
    it.each([
      ['42', 42],
      ['-7', -7],
      ['3.14', 3.14],
      [' 42 ', 42],
      ['0.5', 0.5],
      ['-0.25', -0.25],
      ['0', 0],
      ['1', 1],
    ])('coerces %j to %j', (value, expected) => {
      expect(coerceCustomValue(value)).toBe(expected);
    });

    it.each(['01234', '+42', '.5', '42.', '1e10', 'NaN', 'Infinity', '1.2.3', '4-2'])(
      'leaves %j as a string (preserves IDs / rejects loose formats)',
      value => {
        expect(coerceCustomValue(value)).toBe(value);
      },
    );

    it('"1.0" is a number (does not match the boolean truthy set)', () => {
      expect(coerceCustomValue('1.0')).toBe(1);
    });
  });

  describe('passthrough', () => {
    it.each(['Alice', 'true!', 'yesno', 'maybe'])('leaves %j as a string', value => {
      expect(coerceCustomValue(value)).toBe(value);
    });

    it('leaves empty string as empty string', () => {
      expect(coerceCustomValue('')).toBe('');
    });
  });
});

describe('importFieldKey', () => {
  it('stores a dot in a column name as an underscore, so filters and templates can reach it', () => {
    expect(importFieldKey('metafields.lastopen')).toBe('metafields_lastopen');
    expect(importFieldKey('a..b')).toBe('a__b');
  });

  it('drops a leading data. prefix', () => {
    expect(importFieldKey('data.plan')).toBe('plan');
    expect(importFieldKey('data.a.b')).toBe('a_b');
    expect(importFieldKey('data.')).toBe('data_');
  });

  it('leaves other names alone', () => {
    expect(importFieldKey('plan')).toBe('plan');
    expect(importFieldKey('first name')).toBe('first name');
    expect(importFieldKey('database')).toBe('database');
  });
});

describe('importCustomData', () => {
  it('fills each field from its column, coercing the values', () => {
    expect(importCustomData({'plan': 'pro', 'metafields.lastopen': '2026-10-24T20:35:24Z', 'age': '42'})).toEqual({
      plan: 'pro',
      metafields_lastopen: '2026-10-24T20:35:24Z',
      age: 42,
    });
    expect(importCustomData({})).toBeUndefined();
  });

  it('never lets an empty cell erase another column filling the same field', () => {
    expect(importCustomData({'plan': 'pro', 'data.plan': ''})).toEqual({plan: 'pro'});
    expect(importCustomData({'plan': '', 'data.plan': 'pro'})).toEqual({plan: 'pro'});
    expect(importCustomData({'a.b': 'one', 'a_b': 'two'})).toEqual({a_b: 'two'});
  });

  it('keeps an unusual field name as its own key', () => {
    const data = importCustomData({'data.__proto__': 'x'});
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(Object.keys(data!)).toEqual(['__proto__']);
  });
});

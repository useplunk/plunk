import {beforeEach, describe, expect, it} from 'vitest';
import {ContactService} from '../ContactService';
import {factories} from '../../../../../test/helpers';

/**
 * Field discovery is a single pass over the project's contacts: one `jsonb_each`
 * expansion per contact yields every key's coverage, type and sample value at once.
 * These pin the result of that pass, which is what the segment builder, the workflow
 * condition editor and the template editor all pick their options from.
 */
describe('ContactService - available fields', () => {
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  const fieldNames = (fields: Array<{field: string}>) => fields.map(f => f.field);
  const find = (fields: Array<{field: string}>, name: string) => fields.find(f => f.field === name);

  describe('discovery', () => {
    it('returns the standard columns even with no contacts', async () => {
      const fields = await ContactService.getAvailableFields(projectId);

      expect(fieldNames(fields)).toEqual(['createdAt', 'email', 'subscribed', 'updatedAt']);
      expect(fields.every(f => f.coverage === 100)).toBe(true);
    });

    it('discovers custom keys from Contact.data and prefixes them with data.', async () => {
      await factories.createContact({projectId, data: {plan: 'pro', country: 'ES'}});

      const fields = await ContactService.getAvailableFields(projectId);

      expect(fieldNames(fields)).toContain('data.plan');
      expect(fieldNames(fields)).toContain('data.country');
    });

    it('does not leak fields across projects', async () => {
      const {project: other} = await factories.createUserWithProject();
      await factories.createContact({projectId: other.id, data: {secretField: 'x'}});
      await factories.createContact({projectId, data: {ownField: 'y'}});

      const fields = await ContactService.getAvailableFields(projectId);

      expect(fieldNames(fields)).toContain('data.ownField');
      expect(fieldNames(fields)).not.toContain('data.secretField');
    });

    it('ignores contacts whose data is null rather than failing', async () => {
      await factories.createContact({projectId, data: {plan: 'pro'}});
      await factories.createContact({projectId, data: undefined});

      const fields = await ContactService.getAvailableFields(projectId);

      // Present on 1 of 2 contacts: the null-data contact still counts in the denominator.
      expect(find(fields, 'data.plan')?.coverage).toBe(50);
    });
  });

  describe('coverage', () => {
    it('reports the share of contacts carrying the field', async () => {
      await factories.createContact({projectId, data: {everyone: 1, some: 1}});
      await factories.createContact({projectId, data: {everyone: 1, some: 1}});
      await factories.createContact({projectId, data: {everyone: 1}});
      await factories.createContact({projectId, data: {everyone: 1}});

      const fields = await ContactService.getAvailableFields(projectId);

      expect(find(fields, 'data.everyone')?.coverage).toBe(100);
      expect(find(fields, 'data.some')?.coverage).toBe(50);
    });

    it('does not count a stored JSON null as covered', async () => {
      // A stored JSON null is not SQL NULL. The query this replaced tested
      // `data->key IS NOT NULL`, which such a value passes, so a field set to null
      // everywhere used to report 100% coverage.
      await factories.createContact({projectId, data: {maybe: 'set'}});
      await factories.createContact({projectId, data: {maybe: null}});

      const fields = await ContactService.getAvailableFields(projectId);

      expect(find(fields, 'data.maybe')?.coverage).toBe(50);
    });

    it('still discovers a field that is null on every contact', async () => {
      await factories.createContact({projectId, data: {alwaysNull: null}});

      const fields = await ContactService.getAvailableFields(projectId);

      // Discovered so it stays selectable, but honestly reported as covering nobody.
      expect(find(fields, 'data.alwaysNull')?.coverage).toBe(0);
    });
  });

  describe('type inference', () => {
    it('infers boolean, number, string and ISO dates', async () => {
      await factories.createContact({
        projectId,
        data: {
          flag: true,
          score: 42,
          name: 'ada',
          joined: '2026-01-15T10:30:00Z',
          birthday: '2026-01-15',
        },
      });

      const fields = await ContactService.getAvailableFields(projectId);

      expect(find(fields, 'data.flag')?.type).toBe('boolean');
      expect(find(fields, 'data.score')?.type).toBe('number');
      expect(find(fields, 'data.name')?.type).toBe('string');
      expect(find(fields, 'data.joined')?.type).toBe('date');
      expect(find(fields, 'data.birthday')?.type).toBe('date');
    });

    it('falls back to string when contacts disagree about a field type', async () => {
      await factories.createContact({projectId, data: {mixed: 42}});
      await factories.createContact({projectId, data: {mixed: 'forty-two'}});

      const fields = await ContactService.getAvailableFields(projectId);

      expect(find(fields, 'data.mixed')?.type).toBe('string');
    });
  });
});

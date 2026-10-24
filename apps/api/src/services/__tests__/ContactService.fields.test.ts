import {beforeEach, describe, expect, it} from 'vitest';
import {ContactService} from '../ContactService';
import {factories} from '../../../../../test/helpers';

/**
 * Field discovery is a single pass over the project's contacts: one `jsonb_each`
 * expansion per contact yields every key's coverage, type and sample value at once.
 * These pin the result of that pass, which is what the segment builder, the workflow
 * condition editor and the template editor all pick their options from, and the caching
 * that keeps the dashboard from paying for the pass on every mount.
 *
 * `factories.createContact` writes through Prisma rather than through ContactService, so
 * it deliberately does not run the invalidation hook -- which is what makes it usable
 * here to prove the cache is being held.
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

  describe('caching', () => {
    it('serves a second call from the cache rather than rescanning', async () => {
      await factories.createContact({projectId, data: {original: 1}});
      await ContactService.getAvailableFields(projectId);

      await factories.createContact({projectId, data: {added: 1}});
      const second = await ContactService.getAvailableFields(projectId);

      expect(fieldNames(second)).not.toContain('data.added');
    });

    it('rescans once the entry is invalidated', async () => {
      await factories.createContact({projectId, data: {original: 1}});
      await ContactService.getAvailableFields(projectId);

      await factories.createContact({projectId, data: {added: 1}});
      await ContactService.invalidateAvailableFields(projectId);

      expect(fieldNames(await ContactService.getAvailableFields(projectId))).toContain('data.added');
    });

    it('caches per project rather than globally', async () => {
      const {project: other} = await factories.createUserWithProject();
      await factories.createContact({projectId, data: {mine: 1}});
      await factories.createContact({projectId: other.id, data: {theirs: 1}});

      await ContactService.getAvailableFields(projectId);
      const fields = await ContactService.getAvailableFields(other.id);

      expect(fieldNames(fields)).toContain('data.theirs');
      expect(fieldNames(fields)).not.toContain('data.mine');
    });

    it('collapses concurrent scans of the same project onto one', async () => {
      await factories.createContact({projectId, data: {plan: 'pro'}});

      const [a, b, c] = await Promise.all([
        ContactService.getAvailableFields(projectId),
        ContactService.getAvailableFields(projectId),
        ContactService.getAvailableFields(projectId),
      ]);

      // Same array instance: all three awaited the one in-flight scan.
      expect(b).toBe(a);
      expect(c).toBe(a);
    });

    it('invalidates the cache when a field is deleted', async () => {
      await factories.createContact({projectId, data: {doomed: 'x', kept: 'y'}});
      await ContactService.getAvailableFields(projectId);

      await ContactService.deleteField(projectId, 'data.doomed');

      const fields = await ContactService.getAvailableFields(projectId);
      expect(fieldNames(fields)).not.toContain('data.doomed');
      expect(fieldNames(fields)).toContain('data.kept');
    });
  });

  /**
   * The cache is only as good as its invalidation. A contact write checks its keys
   * against the ones behind the cached list and drops the entry when it finds one that
   * is not there -- so a genuinely new custom field shows up on the next read rather
   * than waiting out the 4h window, while the millionth contact carrying the same
   * familiar keys costs one Redis call and leaves the entry alone.
   */
  describe('invalidation on contact writes', () => {
    /**
     * Writes a contact behind ContactService's back, so it lands in Postgres without
     * touching the cache. Anything that shows up in a later read therefore proves the
     * entry was actually dropped and rescanned, not just patched.
     */
    const plantUncachedField = (key: string) => factories.createContact({projectId, data: {[key]: 'planted'}});

    it('drops the entry when a created contact carries an unknown field', async () => {
      await factories.createContact({projectId, data: {known: 1}});
      await ContactService.getAvailableFields(projectId);

      await ContactService.create(projectId, {email: `new-${Date.now()}@test.com`, data: {brandNew: 1}});

      expect(fieldNames(await ContactService.getAvailableFields(projectId))).toContain('data.brandNew');
    });

    it('keeps the entry when a created contact only carries known fields', async () => {
      await factories.createContact({projectId, data: {known: 1}});
      await ContactService.getAvailableFields(projectId);
      await plantUncachedField('planted');

      await ContactService.create(projectId, {email: `known-${Date.now()}@test.com`, data: {known: 2}});

      // Still serving the cached list, so the planted field is invisible.
      expect(fieldNames(await ContactService.getAvailableFields(projectId))).not.toContain('data.planted');
    });

    it('drops the entry on the first custom field a project ever sees', async () => {
      // The cached list is correct and has no custom fields at all, so there is no key
      // set to test against -- the guard has to fall back to the list itself.
      await ContactService.getAvailableFields(projectId);

      await ContactService.create(projectId, {email: `first-${Date.now()}@test.com`, data: {theFirstOne: 1}});

      expect(fieldNames(await ContactService.getAvailableFields(projectId))).toContain('data.theFirstOne');
    });

    it('drops the entry when an upsert introduces a field', async () => {
      await factories.createContact({projectId, data: {known: 1}});
      await ContactService.getAvailableFields(projectId);

      await ContactService.upsert(projectId, `upsert-${Date.now()}@test.com`, {fromUpsert: 'x'});

      expect(fieldNames(await ContactService.getAvailableFields(projectId))).toContain('data.fromUpsert');
    });

    it('keeps the entry when an upsert only touches known fields', async () => {
      const contact = await factories.createContact({projectId, data: {known: 1}});
      await ContactService.getAvailableFields(projectId);
      await plantUncachedField('planted');

      await ContactService.upsert(projectId, contact.email, {known: 2});

      expect(fieldNames(await ContactService.getAvailableFields(projectId))).not.toContain('data.planted');
    });

    it('drops the entry when an update introduces a field', async () => {
      const contact = await factories.createContact({projectId, data: {known: 1}});
      await ContactService.getAvailableFields(projectId);

      await ContactService.update(projectId, contact.id, {data: {fromUpdate: 'x'}});

      expect(fieldNames(await ContactService.getAvailableFields(projectId))).toContain('data.fromUpdate');
    });

    it('keeps the entry for a write that carries no contact data', async () => {
      await factories.createContact({projectId, data: {known: 1}});
      await ContactService.getAvailableFields(projectId);
      await plantUncachedField('planted');

      await ContactService.create(projectId, {email: `nodata-${Date.now()}@test.com`});

      expect(fieldNames(await ContactService.getAvailableFields(projectId))).not.toContain('data.planted');
    });

    it('leaves other projects alone', async () => {
      const {project: other} = await factories.createUserWithProject();
      await factories.createContact({projectId: other.id, data: {theirs: 1}});
      await ContactService.getAvailableFields(other.id);
      await factories.createContact({projectId: other.id, data: {plantedOnThem: 1}});

      await ContactService.create(projectId, {email: `mine-${Date.now()}@test.com`, data: {mine: 1}});

      expect(fieldNames(await ContactService.getAvailableFields(other.id))).not.toContain('data.plantedOnThem');
    });
  });
});

import {beforeEach, describe, expect, it} from 'vitest';
import {type SegmentFilter, SegmentService} from '../SegmentService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Type for intentionally invalid filter input (used for testing validation)
type InvalidFilterInput = Partial<SegmentFilter>;

describe('SegmentService', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  describe('Segment Filtering', () => {
    it('should filter contacts by subscribed status', async () => {
      const subscribed = await factories.createContact({
        projectId,
        subscribed: true,
      });
      const _unsubscribed = await factories.createContact({
        projectId,
        subscribed: false,
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Subscribed Users',
        filters: [{field: 'subscribed', operator: 'equals', value: true}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(subscribed.id);
    });

    it('should filter contacts by custom data fields', async () => {
      const proUser = await factories.createContact({
        projectId,
        data: {plan: 'pro', tier: 'premium'},
      });
      const _freeUser = await factories.createContact({
        projectId,
        data: {plan: 'free', tier: 'basic'},
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Pro Users',
        filters: [{field: 'data.plan', operator: 'equals', value: 'pro'}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(proUser.id);
    });

    it('should filter contacts with multiple conditions', async () => {
      const target = await factories.createContact({
        projectId,
        subscribed: true,
        data: {plan: 'pro', active: true},
      });
      const _notSubscribed = await factories.createContact({
        projectId,
        subscribed: false,
        data: {plan: 'pro', active: true},
      });
      const _notPro = await factories.createContact({
        projectId,
        subscribed: true,
        data: {plan: 'free', active: true},
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Active Pro Subscribers',
        filters: [
          {field: 'subscribed', operator: 'equals', value: true},
          {field: 'data.plan', operator: 'equals', value: 'pro'},
          {field: 'data.active', operator: 'equals', value: true},
        ],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(target.id);
    });

    it('should support notEquals operator', async () => {
      const pro = await factories.createContact({
        projectId,
        data: {plan: 'pro'},
      });
      const _free = await factories.createContact({
        projectId,
        data: {plan: 'free'},
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Non-Free Users',
        filters: [{field: 'data.plan', operator: 'notEquals', value: 'free'}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(pro.id);
    });

    it('should support contains operator for strings', async () => {
      const match = await factories.createContact({
        projectId,
        email: 'user@company.com',
      });
      const _noMatch = await factories.createContact({
        projectId,
        email: 'user@example.com',
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Company Emails',
        filters: [{field: 'email', operator: 'contains', value: 'company'}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(match.id);
    });

    it('should support exists operator for custom fields', async () => {
      const withField = await factories.createContact({
        projectId,
        data: {company: 'Acme Inc'},
      });
      await factories.createContact({
        projectId,
        data: {name: 'John'},
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Has Company',
        filters: [{field: 'data.company', operator: 'exists', value: true}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(withField.id);
    });

    it('should handle empty segments', async () => {
      await factories.createContact({
        projectId,
        data: {plan: 'free'},
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Enterprise Users',
        filters: [{field: 'data.plan', operator: 'equals', value: 'enterprise'}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Segment Membership', () => {
    it('should return correct member count', async () => {
      await factories.createContact({
        projectId,
        subscribed: true,
      });
      await factories.createContact({
        projectId,
        subscribed: true,
      });
      await factories.createContact({
        projectId,
        subscribed: false,
      });

      const segment = await factories.createSegment(projectId, {
        filters: [{field: 'subscribed', operator: 'equals', value: true}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should support pagination', async () => {
      // Create 25 contacts
      for (let i = 0; i < 25; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
        });
      }

      const segment = await factories.createSegment(projectId, {
        filters: [{field: 'subscribed', operator: 'equals', value: true}],
      });

      const page1 = await SegmentService.getContacts(projectId, segment.id, 1, 10);
      expect(page1.data).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.totalPages).toBe(3);

      const page2 = await SegmentService.getContacts(projectId, segment.id, 2, 10);
      expect(page2.data).toHaveLength(10);

      const page3 = await SegmentService.getContacts(projectId, segment.id, 3, 10);
      expect(page3.data).toHaveLength(5);
    });
  });

  describe('Segment Management', () => {
    it('should create segment with filters', async () => {
      const segment = await factories.createSegment(projectId, {
        name: 'VIP Customers',
        filters: [
          {field: 'data.vip', operator: 'equals', value: true},
          {field: 'subscribed', operator: 'equals', value: true},
        ],
      });

      expect(segment.name).toBe('VIP Customers');
      expect(segment.projectId).toBe(projectId);
      // Segments now use condition object with groups containing filters
      expect(segment.condition).toBeDefined();
      expect(typeof segment.condition).toBe('object');
    });

    it('should list all segments for a project', async () => {
      await factories.createSegment(projectId, {name: 'Segment 1'});
      await factories.createSegment(projectId, {name: 'Segment 2'});
      await factories.createSegment(projectId, {name: 'Segment 3'});

      const segments = await SegmentService.list(projectId);

      expect(segments).toHaveLength(3);
    });

    it('should get specific segment by id', async () => {
      const segment = await factories.createSegment(projectId, {
        name: 'Test Segment',
      });

      const retrieved = await SegmentService.get(projectId, segment.id);

      expect(retrieved.id).toBe(segment.id);
      expect(retrieved.name).toBe('Test Segment');
    });

    it('should throw error when segment not found', async () => {
      await expect(SegmentService.get(projectId, 'non-existent-id')).rejects.toThrow('Segment not found');
    });
  });

  describe('Dynamic Segment Updates', () => {
    it('should reflect in segment when contact data changes', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {plan: 'free'},
      });

      const proSegment = await factories.createSegment(projectId, {
        name: 'Pro Users',
        filters: [{field: 'data.plan', operator: 'equals', value: 'pro'}],
      });

      // Initially not in segment
      let result = await SegmentService.getContacts(projectId, proSegment.id);
      expect(result.data).toHaveLength(0);

      // Update contact to pro plan
      await prisma.contact.update({
        where: {id: contact.id},
        data: {data: {plan: 'pro'}},
      });

      // Should now be in segment
      result = await SegmentService.getContacts(projectId, proSegment.id);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(contact.id);
    });

    it('should be removed from segment when criteria no longer met', async () => {
      const contact = await factories.createContact({
        projectId,
        subscribed: true,
      });

      const segment = await factories.createSegment(projectId, {
        filters: [{field: 'subscribed', operator: 'equals', value: true}],
      });

      // Initially in segment
      let result = await SegmentService.getContacts(projectId, segment.id);
      expect(result.data).toHaveLength(1);

      // Unsubscribe contact
      await prisma.contact.update({
        where: {id: contact.id},
        data: {subscribed: false},
      });

      // Should no longer be in segment
      result = await SegmentService.getContacts(projectId, segment.id);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Delete Protection for Active Campaigns', () => {
    it('should BLOCK deleting segment used in DRAFT campaigns', async () => {
      const segment = await factories.createSegment(projectId, {
        name: 'VIP Customers',
        filters: [{field: 'subscribed', operator: 'equals', value: true}],
      });

      await factories.createCampaign({
        projectId,
        segmentId: segment.id,
        status: 'DRAFT',
      });

      await expect(SegmentService.delete(projectId, segment.id)).rejects.toThrow(
        /cannot delete segment.*active campaign/i,
      );
    });

    it('should BLOCK deleting segment used in SCHEDULED campaigns', async () => {
      const segment = await factories.createSegment(projectId);

      await factories.createScheduledCampaign({
        projectId,
        segmentId: segment.id,
      });

      await expect(SegmentService.delete(projectId, segment.id)).rejects.toThrow(
        /cannot delete segment.*active campaign/i,
      );
    });

    it('should ALLOW deleting segment if all campaigns are SENT', async () => {
      const segment = await factories.createSegment(projectId);

      await factories.createCampaign({
        projectId,
        segmentId: segment.id,
        status: 'SENT',
      });

      await SegmentService.delete(projectId, segment.id);

      const deleted = await prisma.segment.findUnique({
        where: {id: segment.id},
      });
      expect(deleted).toBeNull();
    });

    it('should show count of blocking campaigns in error message', async () => {
      const segment = await factories.createSegment(projectId);

      await factories.createCampaign({
        projectId,
        segmentId: segment.id,
        status: 'DRAFT',
      });
      await factories.createCampaign({
        projectId,
        segmentId: segment.id,
        status: 'SCHEDULED',
      });

      await expect(SegmentService.delete(projectId, segment.id)).rejects.toThrow(/2.*active campaign/i);
    });
  });

  describe('Filter Validation', () => {
    it('should REJECT empty filters array', async () => {
      await expect(
        SegmentService.create(projectId, {
          name: 'Invalid Segment',
          condition: {
            logic: 'AND',
            groups: [{filters: []}],
          },
        }),
      ).rejects.toThrow(/at least one filter/i);
    });

    it('should REJECT filter without field', async () => {
      await expect(
        SegmentService.create(projectId, {
          name: 'Invalid Segment',
          condition: {
            logic: 'AND',
            groups: [
              {
                filters: [
                  {
                    // Intentionally missing field, cast to bypass compile-time validation
                    operator: 'equals',
                    value: 'test',
                  } as InvalidFilterInput as SegmentFilter,
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow(/field is required/i);
    });

    it('should REJECT invalid operators', async () => {
      await expect(
        SegmentService.create(projectId, {
          name: 'Invalid Segment',
          condition: {
            logic: 'AND',
            groups: [
              {
                filters: [
                  {
                    field: 'email',
                    // Intentionally invalid operator
                    operator: 'DROP TABLE contacts;',
                    value: 'test',
                  } as InvalidFilterInput as SegmentFilter,
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow(/invalid operator/i);
    });

    it('should REJECT operators that need values without values', async () => {
      await expect(
        SegmentService.create(projectId, {
          name: 'Invalid Segment',
          condition: {
            logic: 'AND',
            groups: [
              {
                filters: [
                  {
                    field: 'email',
                    operator: 'equals',
                    // Value intentionally omitted
                  } as InvalidFilterInput as SegmentFilter,
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow(/requires a value/i);
    });

    it('should ACCEPT valid filters', async () => {
      const segment = await SegmentService.create(projectId, {
        name: 'Valid Segment',
        condition: {
          logic: 'AND',
          groups: [
            {
              filters: [
                {
                  field: 'subscribed',
                  operator: 'equals',
                  value: true,
                },
              ],
            },
          ],
        },
      });

      expect(segment.id).toBeDefined();
      expect(segment.name).toBe('Valid Segment');
    });
  });

  describe('Operator behavior and edge cases', () => {
    it('should support notContains operator for email strings', async () => {
      const match = await factories.createContact({
        projectId,
        email: 'user@company.com',
      });
      const other = await factories.createContact({
        projectId,
        email: 'user@example.com',
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Non-company Emails',
        filters: [{field: 'email', operator: 'notContains', value: 'company'}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);

      expect(result.data.map(c => c.id).sort()).toEqual([other.id].sort());
      expect(result.data.map(c => c.id)).not.toContain(match.id);
    });

    it('should support case-insensitive equals/contains for email strings', async () => {
      const lower = await factories.createContact({
        projectId,
        email: 'user@company.com',
      });
      const upper = await factories.createContact({
        projectId,
        email: 'USER@COMPANY.COM',
      });

      const equalsSegment = await factories.createSegment(projectId, {
        name: 'Case-insensitive equals',
        filters: [{field: 'email', operator: 'equals', value: 'USER@COMPANY.COM'}],
      });

      const equalsResult = await SegmentService.getContacts(projectId, equalsSegment.id);
      const equalsIds = equalsResult.data.map(c => c.id);
      expect(equalsIds).toContain(lower.id);
      expect(equalsIds).toContain(upper.id);

      const containsSegment = await factories.createSegment(projectId, {
        name: 'Case-insensitive contains',
        filters: [{field: 'email', operator: 'contains', value: 'COMPANY.COM'}],
      });

      const containsResult = await SegmentService.getContacts(projectId, containsSegment.id);
      const containsIds = containsResult.data.map(c => c.id);
      expect(containsIds).toContain(lower.id);
      expect(containsIds).toContain(upper.id);
    });

    it('should support notEquals for boolean subscribed field', async () => {
      const subscribed = await factories.createContact({
        projectId,
        subscribed: true,
      });
      const unsubscribed = await factories.createContact({
        projectId,
        subscribed: false,
      });

      const segment = await factories.createSegment(projectId, {
        name: 'Not subscribed users',
        filters: [{field: 'subscribed', operator: 'notEquals', value: true}],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);
      const ids = result.data.map(c => c.id);

      expect(ids).toContain(unsubscribed.id);
      expect(ids).not.toContain(subscribed.id);
    });

    it('should support notContains and notEquals for JSON data fields', async () => {
      const acme = await factories.createContact({
        projectId,
        data: {company: 'Acme Inc'},
      });
      const other = await factories.createContact({
        projectId,
        data: {company: 'Other Corp'},
      });

      const notContainsSegment = await factories.createSegment(projectId, {
        name: 'Company not containing "Acme"',
        filters: [{field: 'data.company', operator: 'notContains', value: 'Acme'}],
      });

      const notContainsResult = await SegmentService.getContacts(projectId, notContainsSegment.id);
      const notContainsIds = notContainsResult.data.map(c => c.id);
      expect(notContainsIds).toContain(other.id);
      expect(notContainsIds).not.toContain(acme.id);

      const notEqualsSegment = await factories.createSegment(projectId, {
        name: 'Company not equal to "Acme Inc"',
        filters: [{field: 'data.company', operator: 'notEquals', value: 'Acme Inc'}],
      });

      const notEqualsResult = await SegmentService.getContacts(projectId, notEqualsSegment.id);
      const notEqualsIds = notEqualsResult.data.map(c => c.id);
      expect(notEqualsIds).toContain(other.id);
      expect(notEqualsIds).not.toContain(acme.id);
    });

    it('should support exists and notExists for JSON data fields', async () => {
      const withCompany = await factories.createContact({
        projectId,
        data: {company: 'Acme Inc'},
      });
      const withNullCompany = await factories.createContact({
        projectId,
        data: {company: null},
      });

      const existsSegment = await factories.createSegment(projectId, {
        name: 'Has company (non-null)',
        filters: [{field: 'data.company', operator: 'exists', value: true}],
      });

      const existsResult = await SegmentService.getContacts(projectId, existsSegment.id);
      const existsIds = new Set(existsResult.data.map(c => c.id));
      expect(existsIds.has(withCompany.id)).toBe(true);
      expect(existsIds.has(withNullCompany.id)).toBe(false);

      const notExistsSegment = await factories.createSegment(projectId, {
        name: 'No company (null)',
        filters: [{field: 'data.company', operator: 'notExists', value: true}],
      });

      const notExistsResult = await SegmentService.getContacts(projectId, notExistsSegment.id);
      const notExistsIds = new Set(notExistsResult.data.map(c => c.id));
      expect(notExistsIds.has(withCompany.id)).toBe(false);
      expect(notExistsIds.has(withNullCompany.id)).toBe(true);
    });

    it('should support numeric comparison operators on JSON data fields', async () => {
      const low = await factories.createContact({
        projectId,
        data: {score: 10},
      });
      const mid = await factories.createContact({
        projectId,
        data: {score: 50},
      });
      const high = await factories.createContact({
        projectId,
        data: {score: 100},
      });

      const greaterThanSegment = await factories.createSegment(projectId, {
        name: 'Score > 10',
        filters: [{field: 'data.score', operator: 'greaterThan', value: 10}],
      });

      const greaterThanResult = await SegmentService.getContacts(projectId, greaterThanSegment.id);
      const gtIds = greaterThanResult.data.map(c => c.id);
      expect(gtIds).toContain(mid.id);
      expect(gtIds).toContain(high.id);
      expect(gtIds).not.toContain(low.id);

      const lessThanOrEqualSegment = await factories.createSegment(projectId, {
        name: 'Score <= 50',
        filters: [{field: 'data.score', operator: 'lessThanOrEqual', value: 50}],
      });

      const lteResult = await SegmentService.getContacts(projectId, lessThanOrEqualSegment.id);
      const lteIds = lteResult.data.map(c => c.id);
      expect(lteIds).toContain(low.id);
      expect(lteIds).toContain(mid.id);
      expect(lteIds).not.toContain(high.id);
    });

    it('should support date comparison operators on createdAt field', async () => {
      const older = await factories.createContact({projectId});
      // Ensure a small delay so createdAt differs
      await new Promise(resolve => setTimeout(resolve, 10));
      const newer = await factories.createContact({projectId});

      const gtSegment = await factories.createSegment(projectId, {
        name: 'Created after first',
        filters: [{field: 'createdAt', operator: 'greaterThan', value: older.createdAt.toISOString()}],
      });

      const gtResult = await SegmentService.getContacts(projectId, gtSegment.id);
      const gtIds = gtResult.data.map(c => c.id);
      expect(gtIds).toContain(newer.id);
      expect(gtIds).not.toContain(older.id);

      const lteSegment = await factories.createSegment(projectId, {
        name: 'Created on or before second',
        filters: [{field: 'createdAt', operator: 'lessThanOrEqual', value: newer.createdAt.toISOString()}],
      });

      const lteResult = await SegmentService.getContacts(projectId, lteSegment.id);
      const lteIds = lteResult.data.map(c => c.id);
      expect(lteIds).toContain(older.id);
      expect(lteIds).toContain(newer.id);
    });

    it('should support within operator for recent contacts', async () => {
      const recent = await factories.createContact({projectId});

      const segment = await factories.createSegment(projectId, {
        name: 'Created within last day',
        filters: [
          {
            field: 'createdAt',
            operator: 'within',
            value: 1,
            unit: 'days',
          },
        ],
      });

      const result = await SegmentService.getContacts(projectId, segment.id);
      const ids = result.data.map(c => c.id);
      expect(ids).toContain(recent.id);
    });
  });

  describe('Static Segment addContacts (email normalization)', () => {
    async function createStaticSegment() {
      return prisma.segment.create({data: {projectId, name: `Static ${Date.now()}`, type: 'STATIC'}});
    }

    it('matches an existing contact regardless of input casing', async () => {
      const contact = await factories.createContact({projectId, email: 'member@example.com'});
      const segment = await createStaticSegment();

      const result = await SegmentService.addContacts(projectId, segment.id, ['MEMBER@Example.com']);

      expect(result.added).toBe(1);
      expect(result.notFound).toEqual([]);
      const memberships = await prisma.segmentMembership.findMany({where: {segmentId: segment.id}});
      expect(memberships.map(m => m.contactId)).toEqual([contact.id]);
    });

    it('creates missing contacts with a normalized email', async () => {
      const segment = await createStaticSegment();

      await SegmentService.addContacts(projectId, segment.id, ['New@Example.COM'], true);

      const created = await prisma.contact.findMany({where: {projectId}});
      expect(created).toHaveLength(1);
      expect(created[0]?.email).toBe('new@example.com');
    });

    it('collapses case-variants in the same request into one contact', async () => {
      const segment = await createStaticSegment();

      await SegmentService.addContacts(projectId, segment.id, ['Dup@example.com', 'dup@example.com'], true);

      const created = await prisma.contact.findMany({where: {projectId}});
      expect(created).toHaveLength(1);
    });
  });
});

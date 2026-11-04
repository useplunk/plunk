import {randomUUID} from 'node:crypto';
import {beforeEach, describe, expect, it} from 'vitest';
import {CampaignAudienceType, Prisma} from '@plunk/db';
import type {FilterCondition} from '@plunk/types';
import {CampaignService} from '../CampaignService';
import {type SegmentFilter, SegmentService} from '../SegmentService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * Filters on membership of another segment (`segment.<id>` with memberOfSegment and
 * notMemberOfSegment), for each kind of segment they can point at, and how `data.*` filters read
 * a contact without the field.
 */
describe('SegmentService - segment membership filters', () => {
  const prisma = getPrismaClient();
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  const membershipCondition = (segmentId: string, operator: 'memberOfSegment' | 'notMemberOfSegment') =>
    ({logic: 'AND', groups: [{filters: [{field: `segment.${segmentId}`, operator}]}]}) as FilterCondition;

  /** The ids of the contacts a dynamic segment filtering on `segmentId` matches, sorted */
  async function matches(segmentId: string, operator: 'memberOfSegment' | 'notMemberOfSegment') {
    const segment = await SegmentService.create(projectId, {
      name: `Filter ${operator}`,
      condition: membershipCondition(segmentId, operator),
    });
    const {data, total} = await SegmentService.getContacts(projectId, segment.id);
    expect(total).toBe(data.length);
    expect(segment.memberCount).toBe(total);
    return data.map(contact => contact.id).sort();
  }

  /** Three contacts: one in the segment, one who left it, one never in it */
  async function seedMembership(segmentId: string) {
    const [inside, left, never] = await Promise.all(
      [0, 1, 2].map(() => factories.createContact({projectId, subscribed: true})),
    );
    await prisma.segmentMembership.createMany({
      data: [
        {segmentId, contactId: inside!.id},
        {segmentId, contactId: left!.id, exitedAt: new Date()},
      ],
    });
    return {inside: inside!.id, left: left!.id, never: never!.id};
  }

  describe.each([
    ['a static segment', {type: 'STATIC' as const}],
    ['a dynamic segment that tracks membership', {type: 'DYNAMIC' as const, trackMembership: true}],
  ])('pointing at %s', (_name, kind) => {
    let segmentId: string;
    let contacts: Awaited<ReturnType<typeof seedMembership>>;

    beforeEach(async () => {
      const segment = await prisma.segment.create({
        data: {
          projectId,
          name: 'Referenced',
          ...kind,
          // A tracked dynamic segment is read from its memberships, never from its filter
          condition:
            kind.type === 'DYNAMIC'
              ? {logic: 'AND', groups: [{filters: [{field: 'email', operator: 'exists'}]}]}
              : undefined,
        },
      });
      segmentId = segment.id;
      contacts = await seedMembership(segmentId);
    });

    it('matches the current members only', async () => {
      expect(await matches(segmentId, 'memberOfSegment')).toEqual([contacts.inside]);
    });

    it('matches everyone else, including who left', async () => {
      expect(await matches(segmentId, 'notMemberOfSegment')).toEqual([contacts.left, contacts.never].sort());
    });

    it.each(['memberOfSegment', 'notMemberOfSegment'] as const)(
      'builds a %s filter that does not grow with the segment',
      async operator => {
        const built = JSON.stringify(
          await SegmentService.buildConditionClause(projectId, membershipCondition(segmentId, operator)),
        );

        for (const contactId of Object.values(contacts)) {
          expect(built).not.toContain(contactId);
        }
      },
    );
  });

  describe('pointing at a dynamic segment that does not track membership', () => {
    let contacts: Awaited<ReturnType<typeof seedPlans>>;

    /** Contacts with and without `plan` and `company`, including both ways of having no data at all */
    async function seedPlans() {
      const contact = (data?: Prisma.InputJsonValue | typeof Prisma.JsonNull) =>
        prisma.contact.create({data: {projectId, email: `contact-${randomUUID()}@test.com`, data}});
      const [pro, free, acme, empty, keyNull, jsonNull, dbNull] = await Promise.all([
        contact({plan: 'pro'}),
        contact({plan: 'free'}),
        contact({company: 'Acme Corp'}),
        contact({}),
        contact({plan: null, company: null}),
        // What ContactService.create stores for a contact without data
        contact(Prisma.JsonNull),
        contact(),
      ]);
      return {
        pro: pro.id,
        free: free.id,
        acme: acme.id,
        empty: empty.id,
        keyNull: keyNull.id,
        jsonNull: jsonNull.id,
        dbNull: dbNull.id,
      };
    }

    const all = () => Object.values(contacts).sort();
    const allBut = (...ids: string[]) => all().filter(id => !ids.includes(id));
    const referenced = (filters: SegmentFilter[]) => factories.createSegment(projectId, {filters});

    beforeEach(async () => {
      contacts = await seedPlans();
    });

    it('applies its filter', async () => {
      const segment = await referenced([{field: 'data.plan', operator: 'equals', value: 'pro'}]);

      expect(await matches(segment.id, 'memberOfSegment')).toEqual([contacts.pro]);
      expect(await matches(segment.id, 'notMemberOfSegment')).toEqual(allBut(contacts.pro));
    });

    it.each([
      ['notEquals', {field: 'data.plan', operator: 'notEquals', value: 'pro'}, ['free']],
      ['contains', {field: 'data.company', operator: 'contains', value: 'Acme'}, ['acme']],
      ['notContains', {field: 'data.company', operator: 'notContains', value: 'Acme'}, []],
      ['exists', {field: 'data.plan', operator: 'exists'}, ['pro', 'free']],
    ] as const)('counts contacts without the field as outside a %s segment', async (_name, filter, members) => {
      const segment = await referenced([filter as SegmentFilter]);
      const memberIds = members.map(name => contacts[name]).sort();

      expect(await matches(segment.id, 'memberOfSegment')).toEqual(memberIds);
      expect(await matches(segment.id, 'notMemberOfSegment')).toEqual(allBut(...memberIds));
    });

    it('reads a chain of untracked dynamic segments like the filter it ends in', async () => {
      const inner = await referenced([{field: 'data.plan', operator: 'notEquals', value: 'pro'}]);
      const outer = await referenced([{field: `segment.${inner.id}`, operator: 'notMemberOfSegment'}]);

      expect(await matches(outer.id, 'memberOfSegment')).toEqual(allBut(contacts.free));
      expect(await matches(outer.id, 'notMemberOfSegment')).toEqual([contacts.free]);
    });

    it('keeps a value of another type out of both', async () => {
      // Prisma's NOT on a typed JSON filter also requires the type: a number neither contains
      // nor does not contain a text. Known gap, left on purpose (see the comment in SegmentService).
      const numeric = await prisma.contact.create({
        data: {projectId, email: `contact-${randomUUID()}@test.com`, data: {company: 5}},
      });
      const segment = await referenced([{field: 'data.company', operator: 'contains', value: 'Acme'}]);

      expect(await matches(segment.id, 'memberOfSegment')).not.toContain(numeric.id);
      expect(await matches(segment.id, 'notMemberOfSegment')).not.toContain(numeric.id);
    });

    it.each([
      ['next to another filter', [{field: 'subscribed', operator: 'equals', value: true}], false],
      ['alone in its group', [], true],
    ] as const)(
      'saves and applies what "Include contacts without this field" builds, %s',
      async (_name, others, letsInUnsubscribed) => {
        // The dashboard button's shape: the filter ORed with its field having no value, nested in its group.
        // An unsubscribed contact without a plan shows the OR stays inside the group, ANDed with the rest.
        const unsubscribed = await prisma.contact.create({
          data: {projectId, email: `contact-${randomUUID()}@test.com`, subscribed: false},
        });
        const segment = await SegmentService.create(projectId, {
          name: 'Not pro, or no plan',
          condition: {
            logic: 'AND',
            groups: [
              {
                filters: [...others] as SegmentFilter[],
                conditions: {
                  logic: 'OR',
                  groups: [
                    {filters: [{field: 'data.plan', operator: 'notEquals', value: 'pro'}]},
                    {filters: [{field: 'data.plan', operator: 'notExists'}]},
                  ],
                },
              },
            ],
          },
        });

        const {data} = await SegmentService.getContacts(projectId, segment.id);
        const expected = [...allBut(contacts.pro), ...(letsInUnsubscribed ? [unsubscribed.id] : [])].sort();
        expect(data.map(contact => contact.id).sort()).toEqual(expected);
      },
    );
  });

  describe('a data field set to null', () => {
    it('does not match notEquals, like a workflow condition', async () => {
      const free = await factories.createContact({projectId, data: {plan: 'free'}});
      await factories.createContact({projectId, data: {plan: null}});
      const segment = await SegmentService.create(projectId, {
        name: 'Not pro',
        condition: {logic: 'AND', groups: [{filters: [{field: 'data.plan', operator: 'notEquals', value: 'pro'}]}]},
      });

      const {data} = await SegmentService.getContacts(projectId, segment.id);
      expect(data.map(contact => contact.id)).toEqual([free.id]);
    });

    it('still matches equals null, like a workflow condition', async () => {
      await factories.createContact({projectId, data: {plan: 'free'}});
      const keyNull = await factories.createContact({projectId, data: {plan: null}});
      const segment = await SegmentService.create(projectId, {
        name: 'Plan is null',
        condition: {logic: 'AND', groups: [{filters: [{field: 'data.plan', operator: 'equals', value: null}]}]},
      });

      const {data} = await SegmentService.getContacts(projectId, segment.id);
      expect(data.map(contact => contact.id)).toEqual([keyNull.id]);
    });
  });

  it.each([
    ['exists', false],
    ['notExists', true],
  ] as const)('reads a contact without any data as %s → %s', async (operator, matched) => {
    const ids = await Promise.all(
      [Prisma.JsonNull, Prisma.DbNull].map(
        async data =>
          (await prisma.contact.create({data: {projectId, email: `contact-${randomUUID()}@test.com`, data}})).id,
      ),
    );
    const segment = await SegmentService.create(projectId, {
      name: `Plan ${operator}`,
      condition: {logic: 'AND', groups: [{filters: [{field: 'data.plan', operator}]}]},
    });

    const {data} = await SegmentService.getContacts(projectId, segment.id);
    expect(data.map(contact => contact.id).sort()).toEqual(matched ? ids.sort() : []);
  });

  it('rejects a segment of another project', async () => {
    const {project: other} = await factories.createUserWithProject();
    const foreign = await prisma.segment.create({data: {projectId: other.id, name: 'Foreign', type: 'STATIC'}});

    await expect(
      SegmentService.create(projectId, {name: 'Filter', condition: membershipCondition(foreign.id, 'memberOfSegment')}),
    ).rejects.toThrow(`Referenced segment not found: ${foreign.id}`);
  });

  it('counts the recipients of a filtered campaign', async () => {
    const segment = await prisma.segment.create({data: {projectId, name: 'Referenced', type: 'STATIC'}});
    await seedMembership(segment.id);

    const campaign = await CampaignService.create(projectId, {
      name: 'Members only',
      subject: 'Hello',
      body: '<p>Hello</p>',
      from: 'hello@example.com',
      audienceType: CampaignAudienceType.FILTERED,
      audienceCondition: membershipCondition(segment.id, 'memberOfSegment'),
    });

    expect(campaign.totalRecipients).toBe(1);
  });
});

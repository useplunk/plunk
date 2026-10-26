import {beforeEach, describe, expect, it} from 'vitest';
import {CampaignAudienceType} from '@plunk/db';
import type {FilterCondition} from '@plunk/types';
import {CampaignService} from '../CampaignService';
import {SegmentService} from '../SegmentService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * Filters on membership of another segment (`segment.<id>` with memberOfSegment and
 * notMemberOfSegment), for each kind of segment they can point at.
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
          await SegmentService.buildConditionClause(membershipCondition(segmentId, operator)),
        );

        for (const contactId of Object.values(contacts)) {
          expect(built).not.toContain(contactId);
        }
      },
    );
  });

  describe('pointing at a dynamic segment that does not track membership', () => {
    it('applies its filter', async () => {
      const pro = await factories.createContact({projectId, data: {plan: 'pro'}});
      const free = await factories.createContact({projectId, data: {plan: 'free'}});
      const referenced = await factories.createSegment(projectId, {
        filters: [{field: 'data.plan', operator: 'equals', value: 'pro'}],
      });

      expect(await matches(referenced.id, 'memberOfSegment')).toEqual([pro.id]);
      expect(await matches(referenced.id, 'notMemberOfSegment')).toEqual([free.id]);
    });
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

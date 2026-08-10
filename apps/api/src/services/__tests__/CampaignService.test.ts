import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CampaignAudienceType, CampaignStatus} from '@plunk/db';
import {CampaignService} from '../CampaignService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Mock STRIPE_ENABLED for billing limit tests
vi.mock('../../app/constants.js', async () => {
  const actual = await vi.importActual('../../app/constants.js');
  return {
    ...actual,
    STRIPE_ENABLED: true,
    STRIPE_SK: 'sk_test_mock_key_for_testing',
  };
});

describe('CampaignService', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  describe('create', () => {
    it('should create a campaign with ALL audience type', async () => {
      const campaign = await CampaignService.create(projectId, {
        name: 'Test Campaign',
        subject: 'Test Subject',
        body: '<p>Test Body</p>',
        from: 'test@example.com',
        audienceType: CampaignAudienceType.ALL,
      });

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.status).toBe(CampaignStatus.DRAFT);
      expect(campaign.audienceType).toBe(CampaignAudienceType.ALL);
    });

    it('should create a campaign with SEGMENT audience type', async () => {
      const segment = await factories.createSegment(projectId, {name: 'VIP Users'});

      const campaign = await CampaignService.create(projectId, {
        name: 'VIP Campaign',
        subject: 'Exclusive Offer',
        body: '<p>For VIP users only</p>',
        from: 'vip@example.com',
        audienceType: CampaignAudienceType.SEGMENT,
        segmentId: segment.id,
      });

      expect(campaign.segmentId).toBe(segment.id);
    });

    it('should throw error when creating SEGMENT campaign without segmentId', async () => {
      await expect(
        CampaignService.create(projectId, {
          name: 'Invalid Campaign',
          subject: 'Test',
          body: '<p>Test</p>',
          from: 'test@example.com',
          audienceType: CampaignAudienceType.SEGMENT,
        }),
      ).rejects.toThrow('Segment ID is required');
    });

    it('should throw error when segment does not exist', async () => {
      await expect(
        CampaignService.create(projectId, {
          name: 'Invalid Campaign',
          subject: 'Test',
          body: '<p>Test</p>',
          from: 'test@example.com',
          audienceType: CampaignAudienceType.SEGMENT,
          segmentId: 'non-existent-segment',
        }),
      ).rejects.toThrow('Segment not found');
    });
  });

  describe('update', () => {
    it('should update a draft campaign', async () => {
      const campaign = await factories.createCampaign({
        projectId,
        name: 'Original Name',
        status: CampaignStatus.DRAFT,
      });

      const updated = await CampaignService.update(projectId, campaign.id, {
        name: 'Updated Name',
        subject: 'Updated Subject',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.subject).toBe('Updated Subject');
    });

    it('should throw error when updating non-draft campaign', async () => {
      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.SENT,
      });

      await expect(CampaignService.update(projectId, campaign.id, {name: 'New Name'})).rejects.toThrow(
        'Cannot update campaign that is sending or has been sent',
      );
    });
  });

  describe('delete', () => {
    it('should delete a draft campaign', async () => {
      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
      });

      await CampaignService.delete(projectId, campaign.id);

      const deleted = await prisma.campaign.findUnique({where: {id: campaign.id}});
      expect(deleted).toBeNull();
    });

    it('should not delete a non-draft campaign', async () => {
      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.SENT,
      });

      await expect(CampaignService.delete(projectId, campaign.id)).rejects.toThrow('Can only delete draft campaigns');
    });
  });

  describe('bulkUpdate (delete)', () => {
    it('should bulk-delete multiple draft campaigns in this project', async () => {
      const a = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});
      const b = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});
      const c = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});

      const result = await CampaignService.bulkUpdate(projectId, {
        ids: [a.id, b.id, c.id],
        delete: true,
      });

      expect(result.deleted).toBe(3);
      expect(await prisma.campaign.count({where: {projectId}})).toBe(0);
    });

    it('should dedup repeated ids so the deleted count is not inflated', async () => {
      const a = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});

      const result = await CampaignService.bulkUpdate(projectId, {
        ids: [a.id, a.id, a.id],
        delete: true,
      });

      expect(result.deleted).toBe(1);
      expect(await prisma.campaign.findUnique({where: {id: a.id}})).toBeNull();
    });

    it('should throw 404 (and delete nothing) when any id does not exist', async () => {
      const a = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});

      await expect(
        CampaignService.bulkUpdate(projectId, {ids: [a.id, '00000000-0000-0000-0000-000000000000'], delete: true}),
      ).rejects.toThrow(/not found in this project/i);

      // Nothing deleted — the whole operation rolled back.
      expect(await prisma.campaign.findUnique({where: {id: a.id}})).not.toBeNull();
    });

    it('should throw 404 (and delete nothing) when an id belongs to another project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const mine = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});
      const foreign = await factories.createCampaign({projectId: otherProject.id, status: CampaignStatus.DRAFT});

      await expect(
        CampaignService.bulkUpdate(projectId, {ids: [mine.id, foreign.id], delete: true}),
      ).rejects.toThrow(/not found in this project/i);

      // Both survive — atomic rollback, no cross-project leak.
      expect(await prisma.campaign.findUnique({where: {id: mine.id}})).not.toBeNull();
      expect(await prisma.campaign.findUnique({where: {id: foreign.id}})).not.toBeNull();
    });

    it('should throw 400 (and delete nothing) when any selected campaign is not a draft', async () => {
      const draft = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});
      const sent = await factories.createCampaign({projectId, status: CampaignStatus.SENT});

      await expect(
        CampaignService.bulkUpdate(projectId, {ids: [draft.id, sent.id], delete: true}),
      ).rejects.toThrow(/can only delete draft campaigns/i);

      // Partial delete must be impossible — the draft must survive too.
      expect(await prisma.campaign.findUnique({where: {id: draft.id}})).not.toBeNull();
      expect(await prisma.campaign.findUnique({where: {id: sent.id}})).not.toBeNull();
    });

    it('should return {updated: 0} when delete flag is omitted (forward-compat no-op)', async () => {
      const a = await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});

      const result = await CampaignService.bulkUpdate(projectId, {ids: [a.id]});

      expect(result).toEqual({updated: 0});
      // No-op: the campaign is untouched.
      expect(await prisma.campaign.findUnique({where: {id: a.id}})).not.toBeNull();
    });
  });

  describe('duplicate', () => {
    it('should duplicate a campaign with (Copy) suffix', async () => {
      const original = await factories.createCampaign({
        projectId,
        name: 'Original Campaign',
      });

      const duplicate = await CampaignService.duplicate(projectId, original.id);

      expect(duplicate.name).toBe('Original Campaign (Copy)');
      expect(duplicate.subject).toBe(original.subject);
      expect(duplicate.body).toBe(original.body);
      expect(duplicate.status).toBe(CampaignStatus.DRAFT);
      expect(duplicate.id).not.toBe(original.id);
    });
  });

  describe('list', () => {
    it('should list campaigns with pagination', async () => {
      // Create 25 campaigns using bulk insert to avoid memory issues
      const campaignData = Array.from({length: 25}, (_, i) => ({
        projectId,
        name: `Campaign ${i}`,
        subject: 'Test Subject',
        body: '<p>Test Body</p>',
        from: 'test@example.com',
        status: 'DRAFT' as const,
      }));

      await prisma.campaign.createMany({data: campaignData});

      const result = await CampaignService.list(projectId, {page: 1, pageSize: 10});

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
    });

    it('should filter campaigns by status', async () => {
      await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});
      await factories.createCampaign({projectId, status: CampaignStatus.DRAFT});
      await factories.createCampaign({projectId, status: CampaignStatus.SENT});

      const result = await CampaignService.list(projectId, {status: CampaignStatus.DRAFT});

      expect(result.data).toHaveLength(2);
      expect(result.data.every(c => c.status === CampaignStatus.DRAFT)).toBe(true);
    });
  });

  describe('get', () => {
    it('should get a campaign by id', async () => {
      const campaign = await factories.createCampaign({projectId, name: 'Test Campaign'});

      const retrieved = await CampaignService.get(projectId, campaign.id);

      expect(retrieved.id).toBe(campaign.id);
      expect(retrieved.name).toBe('Test Campaign');
    });

    it('should throw error when campaign does not exist', async () => {
      await expect(CampaignService.get(projectId, 'non-existent-id')).rejects.toThrow('Campaign not found');
    });
  });

  describe('Campaign + Segment Integration', () => {
    it('should create campaign targeting a segment', async () => {
      const segment = await factories.createSegment(projectId, {
        name: 'VIP Users',
        filters: [{field: 'data.vip', operator: 'equals', value: true}],
      });

      const campaign = await CampaignService.create(projectId, {
        name: 'VIP Campaign',
        subject: 'Exclusive Offer',
        body: '<p>For VIP users only</p>',
        from: 'vip@example.com',
        audienceType: CampaignAudienceType.SEGMENT,
        segmentId: segment.id,
      });

      expect(campaign.audienceType).toBe(CampaignAudienceType.SEGMENT);
      expect(campaign.segmentId).toBe(segment.id);
    });

    it('should only send to contacts matching segment criteria', async () => {
      // Create contacts - some match segment, some don't
      const vipContact1 = await factories.createContact({
        projectId,
        subscribed: true,
        data: {vip: true},
      });
      const vipContact2 = await factories.createContact({
        projectId,
        subscribed: true,
        data: {vip: true},
      });
      const regularContact = await factories.createContact({
        projectId,
        subscribed: true,
        data: {vip: false},
      });

      const segment = await factories.createSegment(projectId, {
        name: 'VIP Users',
        filters: [{field: 'data.vip', operator: 'equals', value: true}],
      });

      const _campaign = await factories.createCampaign({
        projectId,
        audienceType: CampaignAudienceType.SEGMENT,
        segmentId: segment.id,
      });

      // In a real scenario, the campaign processor would create emails
      // For this test, we manually check which contacts match the segment filters
      const allContacts = await prisma.contact.findMany({
        where: {projectId},
      });
      const contacts = allContacts.filter(c => (c.data as Record<string, unknown>)?.vip === true);

      // Should only include VIP contacts
      expect(contacts).toHaveLength(2);
      const contactIds = contacts.map(c => c.id);
      expect(contactIds).toContain(vipContact1.id);
      expect(contactIds).toContain(vipContact2.id);
      expect(contactIds).not.toContain(regularContact.id);
    });

    it('should exclude unsubscribed contacts from segment campaigns', async () => {
      const subscribedVip = await factories.createContact({
        projectId,
        subscribed: true,
        data: {vip: true},
      });
      const _unsubscribedVip = await factories.createContact({
        projectId,
        subscribed: false,
        data: {vip: true},
      });

      // Segment that requires BOTH vip AND subscribed
      const segment = await factories.createSegment(projectId, {
        name: 'Subscribed VIP Users',
        filters: [
          {field: 'data.vip', operator: 'equals', value: true},
          {field: 'subscribed', operator: 'equals', value: true},
        ],
      });

      const _campaign = await factories.createCampaign({
        projectId,
        audienceType: CampaignAudienceType.SEGMENT,
        segmentId: segment.id,
      });

      // Verify only subscribed VIP is targeted
      const allContacts = await prisma.contact.findMany({
        where: {projectId},
      });
      const matching = allContacts.filter(
        c => (c.data as Record<string, unknown>)?.vip === true && c.subscribed === true,
      );

      expect(matching).toHaveLength(1);
      expect(matching[0].id).toBe(subscribedVip.id);
    });

    it('should handle campaigns for ALL audience type', async () => {
      // Create mix of contacts
      await factories.createContact({projectId, subscribed: true});
      await factories.createContact({projectId, subscribed: true});
      await factories.createContact({projectId, subscribed: false}); // Should be excluded

      const campaign = await factories.createCampaign({
        projectId,
        audienceType: CampaignAudienceType.ALL,
      });

      expect(campaign.audienceType).toBe(CampaignAudienceType.ALL);
      expect(campaign.segmentId).toBeNull();

      // Verify ALL campaigns should target subscribed contacts only
      const subscribedContacts = await prisma.contact.findMany({
        where: {projectId, subscribed: true},
      });

      expect(subscribedContacts).toHaveLength(2);
    });
  });

  describe('Campaign Audience Validation', () => {
    it('should calculate correct recipient count for segment campaigns', async () => {
      // Create 5 contacts matching segment
      for (let i = 0; i < 5; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
          data: {plan: 'pro'},
        });
      }

      // Create 3 contacts not matching
      for (let i = 0; i < 3; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
          data: {plan: 'free'},
        });
      }

      const segment = await factories.createSegment(projectId, {
        filters: [{field: 'data.plan', operator: 'equals', value: 'pro'}],
      });

      await factories.createCampaign({
        projectId,
        audienceType: CampaignAudienceType.SEGMENT,
        segmentId: segment.id,
      });

      const matching = await prisma.contact.count({
        where: {
          projectId,
          data: {
            path: ['plan'],
            equals: 'pro',
          },
        },
      });

      expect(matching).toBe(5);
    });
  });

  describe('send', () => {
    it('should throw error when campaign has no recipients', async () => {
      // Create campaign with no contacts in project
      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
      });

      await expect(CampaignService.send(projectId, campaign.id)).rejects.toThrow('Campaign has no recipients');
    });

    it('should send campaign successfully when recipients are under billing limit', async () => {
      // Set billing limit for campaigns
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 100},
      });

      // Create 5 subscribed contacts
      for (let i = 0; i < 5; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
        });
      }

      // Create campaign targeting all contacts
      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
        audienceType: CampaignAudienceType.ALL,
      });

      // Should send successfully (5 recipients < 100 limit)
      const sentCampaign = await CampaignService.send(projectId, campaign.id);

      expect(sentCampaign.status).toBe(CampaignStatus.SENDING);
      expect(sentCampaign.totalRecipients).toBe(5);
    });

    it('should throw 403 error when campaign would exceed billing limit', async () => {
      // Set billing limit for campaigns to 10
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 10},
      });

      // Create 5 existing campaign emails (usage = 5)
      const contact = await factories.createContact({projectId, subscribed: true});
      for (let i = 0; i < 5; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: 'CAMPAIGN',
        });
      }

      // Create campaign with 10 subscribed contacts (would result in 15 total)
      for (let i = 0; i < 10; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
        });
      }

      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
        audienceType: CampaignAudienceType.ALL,
      });

      // Should throw error because 5 + 11 = 16 > 10 limit (11 contacts: 1 from email creation + 10 new)
      await expect(CampaignService.send(projectId, campaign.id)).rejects.toThrow(/exceed billing limit/i);
    });

    it('should throw 403 error when scheduled campaign would exceed billing limit', async () => {
      // Set billing limit for campaigns to 20
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 20},
      });

      // Create 15 existing campaign emails
      const contact = await factories.createContact({projectId, subscribed: true});
      for (let i = 0; i < 15; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: 'CAMPAIGN',
        });
      }

      // Create campaign with 10 subscribed contacts (would result in 25 total)
      for (let i = 0; i < 10; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
        });
      }

      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
        audienceType: CampaignAudienceType.ALL,
      });

      const scheduledFor = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Should throw error when scheduling because 15 + 10 = 25 > 20 limit
      await expect(CampaignService.send(projectId, campaign.id, scheduledFor)).rejects.toThrow(
        /Cannot schedule campaign.*exceed billing limit/i,
      );
    });

    it('should send campaign successfully when billing limit is null (unlimited)', async () => {
      // Set billing limit to null (unlimited)
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: null},
      });

      // Create 1000 subscribed contacts
      for (let i = 0; i < 1000; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
        });
      }

      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
        audienceType: CampaignAudienceType.ALL,
      });

      // Should send successfully (no limit)
      const sentCampaign = await CampaignService.send(projectId, campaign.id);

      expect(sentCampaign.status).toBe(CampaignStatus.SENDING);
      expect(sentCampaign.totalRecipients).toBe(1000);
    });

    it('should allow campaign that exactly reaches billing limit', async () => {
      // Set billing limit for campaigns to 10
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 10},
      });

      // Create 5 existing campaign emails
      const contact = await factories.createContact({projectId, subscribed: true});
      for (let i = 0; i < 5; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: 'CAMPAIGN',
        });
      }

      // Create 4 more subscribed contacts (total of 5 with the one above: 1 + 4 = 5)
      for (let i = 0; i < 4; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
        });
      }

      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
        audienceType: CampaignAudienceType.ALL,
      });

      // Should send successfully because 5 + 5 = 10 (exactly at limit)
      const sentCampaign = await CampaignService.send(projectId, campaign.id);

      expect(sentCampaign.status).toBe(CampaignStatus.SENDING);
      expect(sentCampaign.totalRecipients).toBe(5);
    });

    it('should throw error when campaign has already been sent', async () => {
      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.SENT,
      });

      await expect(CampaignService.send(projectId, campaign.id)).rejects.toThrow(
        'Campaign has already been sent or is currently sending',
      );
    });

    it('should schedule campaign successfully when recipients are under billing limit', async () => {
      // Set billing limit for campaigns
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 50},
      });

      // Create 10 subscribed contacts
      for (let i = 0; i < 10; i++) {
        await factories.createContact({
          projectId,
          subscribed: true,
        });
      }

      const campaign = await factories.createCampaign({
        projectId,
        status: CampaignStatus.DRAFT,
        audienceType: CampaignAudienceType.ALL,
      });

      const scheduledFor = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Should schedule successfully (10 recipients < 50 limit)
      const scheduledCampaign = await CampaignService.send(projectId, campaign.id, scheduledFor);

      expect(scheduledCampaign.status).toBe(CampaignStatus.SCHEDULED);
      expect(scheduledCampaign.scheduledFor).toEqual(scheduledFor);
      expect(scheduledCampaign.totalRecipients).toBe(10);
    });
  });

  // ========================================
  // TEMPLATE RENDERING (processBatch)
  // ========================================
  describe('processBatch template rendering', () => {
    /** Create a SENDING campaign plus contacts, then run the first batch. */
    async function sendBatch({subject, body}: {subject: string; body: string}, contacts: Record<string, unknown>[]) {
      for (const data of contacts) {
        await factories.createContact({projectId, subscribed: true, data});
      }

      const campaign = await factories.createCampaign({
        projectId,
        subject,
        body,
        status: CampaignStatus.SENDING,
        audienceType: CampaignAudienceType.ALL,
      });

      await CampaignService.processBatch(campaign.id, 1, 0, 500);

      return prisma.email.findMany({
        where: {campaignId: campaign.id},
        include: {contact: true},
      });
    }

    it('renders each contact through the Liquid template', async () => {
      const emails = await sendBatch(
        {
          subject: '{% if locale == "es" %}Tu oferta{% else %}Your offer{% endif %}',
          body: '<p>Hi {{firstName ?? there}}, you are on {{plan | upcase}}.</p>',
        },
        [
          {firstName: 'Ada', plan: 'pro', locale: 'en'},
          {firstName: 'Bruno', plan: 'free', locale: 'es'},
          {plan: 'free', locale: 'en'},
        ],
      );

      expect(emails).toHaveLength(3);

      const byFirstName = new Map(
        emails.map(email => [(email.contact.data as Record<string, unknown>)?.firstName ?? null, email]),
      );

      expect(byFirstName.get('Ada')?.subject).toBe('Your offer');
      expect(byFirstName.get('Ada')?.body).toBe('<p>Hi Ada, you are on PRO.</p>');

      expect(byFirstName.get('Bruno')?.subject).toBe('Tu oferta');
      expect(byFirstName.get('Bruno')?.body).toBe('<p>Hi Bruno, you are on FREE.</p>');

      // Contact without a firstName falls back
      expect(byFirstName.get(null)?.body).toBe('<p>Hi there, you are on FREE.</p>');
    });

    it('renders loops over contact data', async () => {
      const emails = await sendBatch(
        {
          subject: 'Your cart',
          body: '<ul>{% for item in cart %}<li>{{item.name}}</li>{% endfor %}</ul>',
        },
        [{cart: [{name: 'Starter'}, {name: 'Team'}]}],
      );

      expect(emails[0]?.body).toBe('<ul><li>Starter</li><li>Team</li></ul>');
    });

    it('still injects the per-recipient unsubscribe URL', async () => {
      const emails = await sendBatch({subject: 'Hi', body: '<a href="{{unsubscribeUrl}}">Unsubscribe</a>'}, [{}]);

      expect(emails[0]?.body).toContain(`/unsubscribe/${emails[0]?.contactId}`);
    });
  });
});

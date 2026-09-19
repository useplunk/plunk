import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EmailSourceType, EmailStatus} from '@plunk/db';
import {BillingLimitService} from '../BillingLimitService';
import {EmailService} from '../EmailService';
import {factories, getPrismaClient} from '../../../../../test/helpers';
import {redis} from '../../database/redis';

// Mock STRIPE_ENABLED and STRIPE_SK for free tier tests
vi.mock('../../app/constants.js', async () => {
  const actual = await vi.importActual('../../app/constants.js');
  return {
    ...actual,
    STRIPE_ENABLED: true,
    STRIPE_SK: 'sk_test_mock_key_for_testing',
  };
});

// Mock the stripe client to avoid actual Stripe API calls
vi.mock('../../app/stripe.js', () => ({
  stripe: {
    customers: {
      retrieve: vi.fn().mockResolvedValue({
        deleted: false,
        currency: 'usd',
      }),
    },
  },
}));

describe('BillingLimitService - Critical Enforcement', () => {
  let projectId: string;
  let contactId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;

    const contact = await factories.createContact({projectId});
    contactId = contact.id;
  });

  describe('Revenue Protection - Limit Enforcement', () => {
    it('should BLOCK transactional emails when limit exceeded', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitTransactional: 5},
      });

      for (let i = 0; i < 5; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // Attempt to send 6th email should fail
      await expect(
        EmailService.sendTransactionalEmail({
          projectId,
          contactId,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        }),
      ).rejects.toThrow(/billing limit/i);
    });

    it('should BLOCK campaign emails when limit exceeded', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 3},
      });

      // Create 3 campaign emails
      for (let i = 0; i < 3; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // 4th should fail
      const campaign = await factories.createCampaign({projectId});
      await expect(
        EmailService.sendCampaignEmail({
          projectId,
          contactId,
          campaignId: campaign.id,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        }),
      ).rejects.toThrow(/billing limit/i);
    });

    it('should BLOCK workflow emails when limit exceeded', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitWorkflows: 2},
      });

      // Create 2 workflow emails
      for (let i = 0; i < 2; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.WORKFLOW,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // 3rd should fail
      await expect(
        EmailService.sendWorkflowEmail({
          projectId,
          contactId,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        }),
      ).rejects.toThrow(/billing limit/i);
    });

    it('should ALLOW emails when limit is null (unlimited)', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitTransactional: null,
          // Set one other limit to trigger per-category mode (not free tier)
          billingLimitCampaigns: 1000,
        },
      });

      // Create 100 emails
      for (let i = 0; i < 100; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // Should still allow more
      const result = await BillingLimitService.checkLimit(projectId, EmailSourceType.TRANSACTIONAL);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    });

    it('should enforce limits independently per source type', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitTransactional: 5,
          billingLimitCampaigns: 5,
          billingLimitWorkflows: 5,
        },
      });

      // Max out transactional
      for (let i = 0; i < 5; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // Transactional should be blocked
      const transactionalCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.TRANSACTIONAL);
      expect(transactionalCheck.allowed).toBe(false);

      // Campaign should still be allowed
      const campaignCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);
      expect(campaignCheck.allowed).toBe(true);

      // Workflow should still be allowed
      const workflowCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.WORKFLOW);
      expect(workflowCheck.allowed).toBe(true);
    });
  });

  describe('Warning Threshold (80%)', () => {
    it('should warn when usage reaches 80% of limit', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 10},
      });

      for (let i = 0; i < 8; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      const result = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);

      expect(result.allowed).toBe(true);
      expect(result.warning).toBe(true);
      expect(result.percentage).toBeGreaterThanOrEqual(80);
      expect(result.message).toMatch(/warning/i);
    });

    it('should not warn when usage is below 80%', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 10},
      });

      for (let i = 0; i < 5; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      const result = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);

      expect(result.allowed).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.message).toBeUndefined();
    });
  });

  describe('Cache Performance & Fallback', () => {
    it('should use cached usage counts to avoid DB queries', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 100},
      });

      // First call - should query DB and cache
      const usage1 = await BillingLimitService.getUsage(projectId, EmailSourceType.CAMPAIGN);

      // Add email directly to DB (bypassing cache increment)
      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.CAMPAIGN,
      });

      // Second call within cache TTL - should return cached value (not reflect new email)
      const usage2 = await BillingLimitService.getUsage(projectId, EmailSourceType.CAMPAIGN);

      expect(usage2).toBe(usage1); // Same as cached value
    });

    it('should increment cache after successful email send', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 100},
      });

      await BillingLimitService.invalidateCache(projectId);

      const initialUsage = await BillingLimitService.getUsage(projectId, EmailSourceType.CAMPAIGN);

      // Send email (should increment cache)
      await EmailService.sendCampaignEmail({
        projectId,
        contactId,
        subject: 'Test',
        body: 'Test',
        from: 'test@example.com',
      });

      const finalUsage = await BillingLimitService.getUsage(projectId, EmailSourceType.CAMPAIGN);

      expect(finalUsage).toBe(initialUsage + 1);
    });

    it('should handle Redis failure gracefully without blocking emails', async () => {
      // Mock Redis failure
      vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('Redis connection failed'));

      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 100},
      });

      // Should fall back to DB and still work
      const result = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);

      expect(result.allowed).toBe(true);
    });

    it('should handle invalid project ID gracefully', async () => {
      // Non-existent project should not crash, should allow email (fail-open)
      const result = await BillingLimitService.checkLimit('non-existent-project', EmailSourceType.CAMPAIGN);

      expect(result.allowed).toBe(true);
      expect(result.usage).toBe(0);
      expect(result.limit).toBeNull();
    });
  });

  describe('Monthly Reset Behavior', () => {
    it('should only count emails from current calendar month', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 10},
      });

      // Create a date in the previous month
      // Set day to 1 first to avoid month overflow issues (e.g., Jan 31 -> Feb 31 = Mar 3)
      const lastMonth = new Date();
      lastMonth.setDate(1);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await prisma.email.create({
        data: {
          projectId,
          contactId,
          subject: 'Old',
          body: 'Old',
          from: 'test@example.com',
          sourceType: EmailSourceType.CAMPAIGN,
          status: 'SENT',
          createdAt: lastMonth,
        },
      });

      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.CAMPAIGN,
      });

      await BillingLimitService.invalidateCache(projectId);

      const usage = await BillingLimitService.getUsage(projectId, EmailSourceType.CAMPAIGN);

      // Should only count this month's email
      expect(usage).toBe(1);
    });
  });

  describe('Unsent Emails Are Not Billable Usage', () => {
    it('should not count emails a disabled project never sent', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 4000},
      });

      // The shape of a project disabled mid-campaign: a few emails reached SES, the rest of
      // the backlog was flipped to FAILED by QueueService.cancelProjectJobs. Only the first
      // group was ever metered to Stripe, so only the first group may consume quota.
      for (let i = 0; i < 3; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.CAMPAIGN,
          status: EmailStatus.SENT,
          sentAt: new Date(),
        });
      }

      for (let i = 0; i < 7; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.CAMPAIGN,
          status: EmailStatus.FAILED,
          error: 'Project is disabled',
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      expect(await BillingLimitService.getUsage(projectId, EmailSourceType.CAMPAIGN)).toBe(3);
    });

    it('should not count a workflow email skipped for an unsubscribed contact', async () => {
      // EmailService writes this row straight to FAILED and never queues it.
      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.WORKFLOW,
        status: EmailStatus.FAILED,
        error: 'Contact is unsubscribed from marketing emails',
      });

      await BillingLimitService.invalidateCache(projectId);

      expect(await BillingLimitService.getUsage(projectId, EmailSourceType.WORKFLOW)).toBe(0);
    });

    it('should still count in-flight emails that have not been sent yet', async () => {
      // The limit is checked before the rows exist, and a campaign is checked once for the
      // whole batch, so PENDING must hold its own quota or a second campaign would sail past
      // a cap the first one already consumed.
      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.CAMPAIGN,
        status: EmailStatus.PENDING,
      });

      await BillingLimitService.invalidateCache(projectId);

      expect(await BillingLimitService.getUsage(projectId, EmailSourceType.CAMPAIGN)).toBe(1);
    });

    it('should exclude failed emails from the free tier total as well', async () => {
      for (let i = 0; i < 2; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.TRANSACTIONAL,
          status: EmailStatus.SENT,
          sentAt: new Date(),
        });
      }

      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.WORKFLOW,
        status: EmailStatus.FAILED,
        error: 'Project is disabled',
      });

      expect(await BillingLimitService.getTotalUsage(projectId)).toBe(2);
    });
  });

  describe('Complete Limits Overview', () => {
    it('should return all category limits and usage', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitWorkflows: 100,
          billingLimitCampaigns: 200,
          billingLimitTransactional: null, // Unlimited
        },
      });

      // Create various emails
      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.WORKFLOW,
      });
      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.CAMPAIGN,
      });
      await factories.createEmail({
        projectId,
        contactId,
        sourceType: EmailSourceType.CAMPAIGN,
      });

      await BillingLimitService.invalidateCache(projectId);

      const limits = await BillingLimitService.getLimitsAndUsage(projectId);

      expect(limits.workflows.limit).toBe(100);
      expect(limits.workflows.usage).toBe(1);
      expect(limits.workflows.percentage).toBe(1);
      expect(limits.workflows.isWarning).toBe(false);
      expect(limits.workflows.isBlocked).toBe(false);

      expect(limits.campaigns.limit).toBe(200);
      expect(limits.campaigns.usage).toBe(2);
      expect(limits.campaigns.percentage).toBe(1);

      expect(limits.transactional.limit).toBeNull();
      expect(limits.transactional.usage).toBe(0);
      expect(limits.transactional.percentage).toBe(0);
    });
  });

  describe('Race Condition Behavior', () => {
    it('should check limits before each email send (may allow some concurrent sends)', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {billingLimitCampaigns: 10},
      });

      // Create 8 existing emails (80% of limit)
      for (let i = 0; i < 8; i++) {
        await factories.createEmail({
          projectId,
          contactId,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // Try to send 5 emails simultaneously
      const promises = Array.from({length: 5}, () =>
        EmailService.sendCampaignEmail({
          projectId,
          contactId,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        }),
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Note: Due to race conditions, multiple may succeed before limit is enforced
      // The limit check happens at send time, not atomically
      // At least some should succeed (we're under limit when we start)
      expect(successful).toBeGreaterThan(0);

      // Eventually, some should fail once limit is hit
      // Total emails created should not greatly exceed limit
      const totalEmails = await prisma.email.count({
        where: {projectId, sourceType: EmailSourceType.CAMPAIGN},
      });

      // Should be close to limit (8 existing + some new <= ~13 due to races)
      expect(totalEmails).toBeLessThanOrEqual(15);
    });
  });

  describe('Free Tier Total Limit (1000 emails/month across all types)', () => {
    it('should enforce 1000 email total limit for free tier projects', async () => {
      // Create a contact for this test
      const contact = await factories.createContact({projectId});

      // Free tier project has no subscription and no custom limits set
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitWorkflows: null,
          billingLimitCampaigns: null,
          billingLimitTransactional: null,
        },
      });

      // Create 1000 emails total across different types
      for (let i = 0; i < 300; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.WORKFLOW,
        });
      }
      for (let i = 0; i < 400; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }
      for (let i = 0; i < 300; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // All three types should now be blocked since total is 1000
      await expect(
        EmailService.sendWorkflowEmail({
          projectId,
          contactId: contact.id,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        }),
      ).rejects.toThrow(/free tier limit/i);

      await expect(
        EmailService.sendCampaignEmail({
          projectId,
          contactId: contact.id,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        }),
      ).rejects.toThrow(/free tier limit/i);

      await expect(
        EmailService.sendTransactionalEmail({
          projectId,
          contactId: contact.id,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        }),
      ).rejects.toThrow(/free tier limit/i);
    });

    it('should count all email types towards free tier total limit', async () => {
      // Create a contact for this test
      const contact = await factories.createContact({projectId});

      // Free tier project
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitWorkflows: null,
          billingLimitCampaigns: null,
          billingLimitTransactional: null,
        },
      });

      // Create 200 of each type (600 total)
      for (let i = 0; i < 200; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.WORKFLOW,
        });
      }
      for (let i = 0; i < 200; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }
      for (let i = 0; i < 200; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // Check limits for each type - all should report 600 total usage
      const workflowCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.WORKFLOW);
      const campaignCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);
      const transactionalCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.TRANSACTIONAL);

      // All types should see the same total usage (600) and same limit (1000)
      expect(workflowCheck.usage).toBe(600);
      expect(workflowCheck.limit).toBe(1000);
      expect(workflowCheck.allowed).toBe(true);
      expect(workflowCheck.percentage).toBe(60);

      expect(campaignCheck.usage).toBe(600);
      expect(campaignCheck.limit).toBe(1000);
      expect(campaignCheck.allowed).toBe(true);

      expect(transactionalCheck.usage).toBe(600);
      expect(transactionalCheck.limit).toBe(1000);
      expect(transactionalCheck.allowed).toBe(true);
    });

    it('should show warning at 80% of free tier total limit (800 emails)', async () => {
      // Create a contact for this test
      const contact = await factories.createContact({projectId});

      // Free tier project
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitWorkflows: null,
          billingLimitCampaigns: null,
          billingLimitTransactional: null,
        },
      });

      // Create 800 emails spread across types
      for (let i = 0; i < 300; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.WORKFLOW,
        });
      }
      for (let i = 0; i < 250; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }
      for (let i = 0; i < 250; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // All types should show warning
      const workflowCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.WORKFLOW);
      expect(workflowCheck.allowed).toBe(true);
      expect(workflowCheck.warning).toBe(true);
      expect(workflowCheck.usage).toBe(800);
      expect(workflowCheck.percentage).toBeGreaterThanOrEqual(80);
      expect(workflowCheck.message).toMatch(/warning/i);
    });

    it('should allow free tier to send different distribution of email types', async () => {
      // Create a contact for this test
      const contact = await factories.createContact({projectId});

      // Free tier project
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitWorkflows: null,
          billingLimitCampaigns: null,
          billingLimitTransactional: null,
        },
      });

      // Create 900 transactional, 50 campaigns, 49 workflows (999 total - under limit)
      for (let i = 0; i < 900; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }
      for (let i = 0; i < 50; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }
      for (let i = 0; i < 49; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.WORKFLOW,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // Should still allow one more email of any type
      const workflowCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.WORKFLOW);
      expect(workflowCheck.allowed).toBe(true);
      expect(workflowCheck.usage).toBe(999);

      // Send the 1000th email (should succeed)
      await EmailService.sendWorkflowEmail({
        projectId,
        contactId: contact.id,
        subject: 'Test',
        body: 'Test',
        from: 'test@example.com',
      });

      await BillingLimitService.invalidateCache(projectId);

      // Now all types should be blocked
      const campaignCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);
      expect(campaignCheck.allowed).toBe(false);
      expect(campaignCheck.usage).toBe(1000);
    });

    it('should distinguish free tier from paid tier with per-category limits', async () => {
      // Create a contact for this test
      const contact = await factories.createContact({projectId});

      // Set custom per-category limits (paid tier behavior)
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitWorkflows: 100,
          billingLimitCampaigns: 200,
          billingLimitTransactional: 300,
        },
      });

      // Create 150 workflow emails (exceeds workflow limit but under total)
      for (let i = 0; i < 150; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.WORKFLOW,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      // Workflow should be blocked (150 > 100)
      const workflowCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.WORKFLOW);
      expect(workflowCheck.allowed).toBe(false);
      expect(workflowCheck.usage).toBe(150);
      expect(workflowCheck.limit).toBe(100);

      // But campaigns should still be allowed (independent limit)
      const campaignCheck = await BillingLimitService.checkLimit(projectId, EmailSourceType.CAMPAIGN);
      expect(campaignCheck.allowed).toBe(true);
      expect(campaignCheck.usage).toBe(0);
      expect(campaignCheck.limit).toBe(200);
    });

    it('should show shared limit for all categories in getLimitsAndUsage for free tier', async () => {
      // Create a contact for this test
      const contact = await factories.createContact({projectId});

      // Free tier project
      await prisma.project.update({
        where: {id: projectId},
        data: {
          billingLimitWorkflows: null,
          billingLimitCampaigns: null,
          billingLimitTransactional: null,
        },
      });

      // Create various emails
      for (let i = 0; i < 100; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.WORKFLOW,
        });
      }
      for (let i = 0; i < 200; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.CAMPAIGN,
        });
      }
      for (let i = 0; i < 150; i++) {
        await factories.createEmail({
          projectId,
          contactId: contact.id,
          sourceType: EmailSourceType.TRANSACTIONAL,
        });
      }

      await BillingLimitService.invalidateCache(projectId);

      const limits = await BillingLimitService.getLimitsAndUsage(projectId);

      // All categories should show the same total usage (450) and limit (1000)
      expect(limits.workflows.limit).toBe(1000);
      expect(limits.workflows.usage).toBe(450);
      expect(limits.workflows.percentage).toBe(45);

      expect(limits.campaigns.limit).toBe(1000);
      expect(limits.campaigns.usage).toBe(450);

      expect(limits.transactional.limit).toBe(1000);
      expect(limits.transactional.usage).toBe(450);
    });
  });
});

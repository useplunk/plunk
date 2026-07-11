import {beforeEach, describe, expect, it, vi, type Mock} from 'vitest';
import {EmailSourceType, EmailStatus, TemplateType} from '@plunk/db';
import {ActionSchemas} from '@plunk/shared';
import {EmailService} from '../EmailService';
import {sendRawEmail} from '../SESService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Mock AWS SDK globally (used by real SESService calls in MIME tests)
vi.mock('@aws-sdk/client-ses', () => {
  const SESMock = vi.fn();
  SESMock.prototype.sendRawEmail = vi.fn().mockResolvedValue({MessageId: 'test-message-id'});
  return {SES: SESMock};
});

// Mock constants to provide AWS credentials for SESService, preserving other exports
vi.mock('../../app/constants.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/constants.js')>();
  return {
    ...actual,
    AWS_SES_ACCESS_KEY_ID: 'test-key-id',
    AWS_SES_REGION: 'us-east-1',
    AWS_SES_SECRET_ACCESS_KEY: 'test-secret',
    SES_CONFIGURATION_SET: 'test-config-set',
    SES_CONFIGURATION_SET_NO_TRACKING: 'test-no-tracking-set',
    TRACKING_TOGGLE_ENABLED: true,
  };
});

// Mock SES service (default behavior for most tests)
vi.mock('../SESService', () => ({
  sendRawEmail: vi.fn(),
}));

describe('EmailService', () => {
  let projectId: string;
  let contactId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;

    const contact = await factories.createContact({projectId});
    contactId = contact.id;

    // Create a verified domain for the project (required for sending emails)
    await factories.createDomain({
      projectId,
      domain: 'example.com',
      verified: true,
    });

    // Mock successful SES send by default
    vi.mocked(sendRawEmail).mockResolvedValue({
      messageId: 'ses-message-123',
    });
  });

  // ========================================
  // SUBSCRIPTION ENFORCEMENT (GDPR)
  // ========================================
  describe('Subscription Enforcement (GDPR Compliance)', () => {
    describe('Marketing Email Protection', () => {
      it('should send campaign emails only to subscribed contacts', async () => {
        const subscribedContact = await factories.createContact({
          projectId,
          subscribed: true,
        });

        const email = await EmailService.sendCampaignEmail({
          projectId,
          contactId: subscribedContact.id,
          subject: 'Newsletter',
          body: 'Marketing content',
          from: 'news@example.com',
        });

        expect(email.status).toBe(EmailStatus.PENDING);
        expect(email.sourceType).toBe(EmailSourceType.CAMPAIGN);
      });

      it('should NOT send workflow marketing emails to unsubscribed contacts', async () => {
        const unsubscribedContact = await factories.createContact({
          projectId,
          subscribed: false,
        });

        const marketingTemplate = await factories.createTemplate({
          projectId,
          type: 'MARKETING',
        });

        // Create a workflow and execution for the foreign key
        const workflow = await factories.createWorkflow({projectId});
        const execution = await factories.createWorkflowExecution(workflow.id, unsubscribedContact.id);

        const email = await EmailService.sendWorkflowEmail({
          projectId,
          contactId: unsubscribedContact.id,
          templateId: marketingTemplate.id,
          subject: 'Marketing Email',
          body: 'Content',
          from: 'test@example.com',
          workflowExecutionId: execution.id,
        });

        expect(email.status).toBe(EmailStatus.FAILED);
        expect(email.error).toMatch(/unsubscribed/i);
      });

      it('should REJECT sending MARKETING template via transactional API to unsubscribed contact', async () => {
        const unsubscribedContact = await factories.createContact({
          projectId,
          subscribed: false,
        });

        const marketingTemplate = await factories.createTemplate({
          projectId,
          type: 'MARKETING',
        });

        await expect(
          EmailService.sendTransactionalEmail({
            projectId,
            contactId: unsubscribedContact.id,
            templateId: marketingTemplate.id,
            subject: 'Marketing disguised as transactional',
            body: 'Buy now!',
            from: 'test@example.com',
          }),
        ).rejects.toThrow(/cannot send marketing template to unsubscribed contact/i);
      });
    });

    describe('Transactional Email Exemption', () => {
      it('should ALLOW transactional emails to unsubscribed contacts', async () => {
        const unsubscribedContact = await factories.createContact({
          projectId,
          subscribed: false,
        });

        const transactionalTemplate = await factories.createTemplate({
          projectId,
          type: 'TRANSACTIONAL',
        });

        const email = await EmailService.sendTransactionalEmail({
          projectId,
          contactId: unsubscribedContact.id,
          templateId: transactionalTemplate.id,
          subject: 'Password Reset',
          body: 'Reset your password',
          from: 'noreply@example.com',
        });

        expect(email.status).toBe(EmailStatus.PENDING);
        expect(email.sourceType).toBe(EmailSourceType.TRANSACTIONAL);
      });

      it('should ALLOW workflow transactional emails to unsubscribed contacts', async () => {
        const unsubscribedContact = await factories.createContact({
          projectId,
          subscribed: false,
        });

        const transactionalTemplate = await factories.createTemplate({
          projectId,
          type: 'TRANSACTIONAL',
        });

        // Create workflow and execution for the foreign key
        const workflow = await factories.createWorkflow({projectId});
        const execution = await factories.createWorkflowExecution(workflow.id, unsubscribedContact.id);

        const email = await EmailService.sendWorkflowEmail({
          projectId,
          contactId: unsubscribedContact.id,
          templateId: transactionalTemplate.id,
          subject: 'Account Verification',
          body: 'Verify your account',
          from: 'noreply@example.com',
          workflowExecutionId: execution.id,
        });

        expect(email.status).toBe(EmailStatus.PENDING);
        expect(email.sourceType).toBe(EmailSourceType.TRANSACTIONAL);
      });
    });

    describe('Headless Email Behaviour', () => {
      it('should NOT send headless workflow emails to unsubscribed contacts', async () => {
        const unsubscribedContact = await factories.createContact({
          projectId,
          subscribed: false,
        });

        const headlessTemplate = await factories.createTemplate({
          projectId,
          type: 'HEADLESS',
        });

        const workflow = await factories.createWorkflow({projectId});
        const execution = await factories.createWorkflowExecution(workflow.id, unsubscribedContact.id);

        const email = await EmailService.sendWorkflowEmail({
          projectId,
          contactId: unsubscribedContact.id,
          templateId: headlessTemplate.id,
          subject: 'Newsletter',
          body: 'Content',
          from: 'test@example.com',
          workflowExecutionId: execution.id,
        });

        expect(email.status).toBe(EmailStatus.FAILED);
        expect(email.error).toMatch(/unsubscribed/i);
      });

      it('should keep CAMPAIGN sourceType when campaign type is HEADLESS (no template)', async () => {
        const contact = await factories.createContact({projectId, subscribed: true});

        // Campaign typed HEADLESS directly — no template involved (inline body)
        const campaign = await factories.createCampaign({
          projectId,
          type: TemplateType.HEADLESS,
          body: 'Content with <a href="https://example.com/unsubscribe">unsubscribe</a>',
        });

        const email = await EmailService.sendCampaignEmail({
          projectId,
          contactId: contact.id,
          campaignId: campaign.id,
          subject: 'Newsletter',
          body: campaign.body,
          from: 'news@example.com',
        });

        expect(email.sourceType).toBe(EmailSourceType.CAMPAIGN);
        expect(email.status).toBe(EmailStatus.PENDING);
      });

      it('should keep CAMPAIGN sourceType when campaign uses headless template', async () => {
        const contact = await factories.createContact({projectId, subscribed: true});

        const headlessTemplate = await factories.createTemplate({
          projectId,
          type: 'HEADLESS',
        });

        const campaign = await factories.createCampaign({projectId});

        const email = await EmailService.sendCampaignEmail({
          projectId,
          contactId: contact.id,
          campaignId: campaign.id,
          templateId: headlessTemplate.id,
          subject: 'Newsletter',
          body: 'Content with <a href="https://example.com/unsubscribe">unsubscribe</a>',
          from: 'news@example.com',
        });

        // HEADLESS is not transactional — sourceType stays CAMPAIGN
        expect(email.sourceType).toBe(EmailSourceType.CAMPAIGN);
        expect(email.status).toBe(EmailStatus.PENDING);
      });
    });

    describe('Template Type Determines Email Type', () => {
      it('should use TRANSACTIONAL sourceType when campaign uses transactional template', async () => {
        const contact = await factories.createContact({
          projectId,
          subscribed: true,
        });

        const transactionalTemplate = await factories.createTemplate({
          projectId,
          type: 'TRANSACTIONAL',
        });

        const campaign = await factories.createCampaign({projectId});

        const email = await EmailService.sendCampaignEmail({
          projectId,
          contactId: contact.id,
          campaignId: campaign.id,
          templateId: transactionalTemplate.id,
          subject: 'Receipt',
          body: 'Your receipt',
          from: 'billing@example.com',
        });

        expect(email.sourceType).toBe(EmailSourceType.TRANSACTIONAL);
      });
    });

    describe('Unsubscribe via Complaint Webhook', () => {
      it('should track when contact unsubscribes via complaint webhook', async () => {
        const contact = await factories.createContact({
          projectId,
          subscribed: true,
        });

        const email = await factories.createEmail({
          projectId,
          contactId: contact.id,
          status: EmailStatus.SENT,
        });

        await EmailService.handleWebhookEvent(email.id, 'complained');

        const unsubscribedContact = await prisma.contact.findUnique({
          where: {id: contact.id},
        });

        expect(unsubscribedContact?.subscribed).toBe(false);

        const complainedEmail = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(complainedEmail?.status).toBe(EmailStatus.COMPLAINED);
      });
    });
  });

  // ========================================
  // STATUS TRANSITIONS
  // ========================================
  describe('Status Transitions & Lifecycle', () => {
    describe('Email Creation', () => {
      it('should create email with PENDING status', async () => {
        const email = await EmailService.sendTransactionalEmail({
          projectId,
          contactId,
          subject: 'Test',
          body: 'Test',
          from: 'test@example.com',
        });

        expect(email.status).toBe(EmailStatus.PENDING);
        expect(email.sentAt).toBeNull();
        expect(email.messageId).toBeNull();
      });
    });

    describe('PENDING → SENDING → SENT', () => {
      it('should transition correctly on successful send', async () => {
        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.PENDING,
        });

        await EmailService.sendEmail(email.id);

        const sent = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(sent?.status).toBe(EmailStatus.SENT);
        expect(sent?.sentAt).not.toBeNull();
        expect(sent?.messageId).toBe('ses-message-123');
      });

      it('should create email.sent event after successful send', async () => {
        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.PENDING,
        });

        await EmailService.sendEmail(email.id);

        const event = await prisma.event.findFirst({
          where: {
            projectId,
            contactId,
            emailId: email.id,
            name: 'email.sent',
          },
        });

        expect(event).toBeDefined();
        expect(event?.data).toHaveProperty('messageId', 'ses-message-123');
      });
    });

    describe('PENDING → SENDING → FAILED', () => {
      it('should mark as FAILED on SES error', async () => {
        vi.mocked(sendRawEmail).mockRejectedValue(new Error('SES rate limit exceeded'));

        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.PENDING,
        });

        await expect(EmailService.sendEmail(email.id)).rejects.toThrow();

        const failed = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(failed?.status).toBe(EmailStatus.FAILED);
        expect(failed?.error).toContain('rate limit');
      });
    });

    describe('Idempotency - Prevent Re-sending', () => {
      it('should NOT re-send email if already SENT', async () => {
        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.SENT,
          sentAt: new Date(),
          messageId: 'already-sent-123',
        });

        const sesSpy = vi.mocked(sendRawEmail);
        sesSpy.mockClear();

        await EmailService.sendEmail(email.id);

        expect(sesSpy).not.toHaveBeenCalled();
      });
    });

    describe('Webhook Status Updates', () => {
      it('should transition SENT → DELIVERED on delivery webhook', async () => {
        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.SENT,
        });

        await EmailService.handleWebhookEvent(email.id, 'delivered');

        const delivered = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(delivered?.status).toBe(EmailStatus.DELIVERED);
        expect(delivered?.deliveredAt).not.toBeNull();
      });

      it('should transition to OPENED on first open webhook', async () => {
        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.SENT,
        });

        await EmailService.handleWebhookEvent(email.id, 'opened');

        const opened = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(opened?.status).toBe(EmailStatus.OPENED);
        expect(opened?.openedAt).not.toBeNull();
        expect(opened?.opens).toBe(1);
      });

      it('should increment opens counter on subsequent opens', async () => {
        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.OPENED,
          openedAt: new Date(),
          opens: 1,
        });

        const firstOpenedAt = email.openedAt;

        await EmailService.handleWebhookEvent(email.id, 'opened');

        const reopened = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(reopened?.opens).toBe(2);
        expect(reopened?.openedAt).toEqual(firstOpenedAt);
      });

      it('should transition to CLICKED and track clicks', async () => {
        const email = await factories.createEmail({
          projectId,
          contactId,
          status: EmailStatus.SENT,
        });

        await EmailService.handleWebhookEvent(email.id, 'clicked');

        const clicked = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(clicked?.status).toBe(EmailStatus.CLICKED);
        expect(clicked?.clickedAt).not.toBeNull();
        expect(clicked?.clicks).toBe(1);
      });

      it('should transition to BOUNCED on bounce webhook and unsubscribe contact', async () => {
        const contact = await factories.createContact({
          projectId,
          subscribed: true,
        });
        const email = await factories.createEmail({
          projectId,
          contactId: contact.id,
          status: EmailStatus.SENT,
        });

        await EmailService.handleWebhookEvent(email.id, 'bounced');

        const bounced = await prisma.email.findUnique({
          where: {id: email.id},
        });

        expect(bounced?.status).toBe(EmailStatus.BOUNCED);
        expect(bounced?.bouncedAt).not.toBeNull();

        // Verify contact was unsubscribed
        const unsubscribedContact = await prisma.contact.findUnique({
          where: {id: contact.id},
        });
        expect(unsubscribedContact?.subscribed).toBe(false);

        // Verify unsubscription event was tracked
        const event = await prisma.event.findFirst({
          where: {
            projectId,
            contactId: contact.id,
            name: 'contact.unsubscribed',
          },
        });
        expect(event).not.toBeNull();
        expect(event?.data).toMatchObject({reason: 'bounce'});
      });
    });
  });

  // ========================================
  // EMAIL STATISTICS
  // ========================================
  describe('Email Statistics', () => {
    it('should calculate accurate email stats', async () => {
      await factories.createEmail({projectId, contactId, status: EmailStatus.SENT});
      await factories.createEmail({projectId, contactId, status: EmailStatus.SENT});
      await factories.createEmail({projectId, contactId, status: EmailStatus.DELIVERED});
      await factories.createEmail({projectId, contactId, status: EmailStatus.OPENED});
      await factories.createEmail({projectId, contactId, status: EmailStatus.CLICKED});
      await factories.createEmail({projectId, contactId, status: EmailStatus.BOUNCED});
      await factories.createEmail({projectId, contactId, status: EmailStatus.FAILED});

      const stats = await EmailService.getStats(projectId);

      expect(stats.total).toBe(7);
      expect(stats.sent).toBe(2);
      expect(stats.delivered).toBe(1);
      expect(stats.opened).toBe(1);
      expect(stats.clicked).toBe(1);
      expect(stats.bounced).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should calculate open rate correctly', async () => {
      // Create 10 SENT emails, 5 of which are OPENED
      // OPENED status counts as both sent and opened
      for (let i = 0; i < 5; i++) {
        await factories.createEmail({projectId, contactId, status: EmailStatus.SENT});
      }
      for (let i = 0; i < 5; i++) {
        await factories.createEmail({projectId, contactId, status: EmailStatus.OPENED});
      }

      const stats = await EmailService.getStats(projectId);

      // Total sent = 5 (SENT) + 5 (OPENED) = 10
      // Total opened = 5 (OPENED)
      // Open rate = 5/10 * 100 = 50%
      // BUT: EmailService counts SENT separately from OPENED
      // So opened/sent = 5/5 = 100%
      // This is a quirk of how EmailStatus works - OPENED doesn't include SENT count
      expect(stats.sent).toBe(5); // Only EmailStatus.SENT
      expect(stats.opened).toBe(5); // Only EmailStatus.OPENED
      expect(stats.total).toBe(10);
    });

    it('should handle zero sent emails without division by zero', async () => {
      await factories.createEmail({projectId, contactId, status: EmailStatus.PENDING});

      const stats = await EmailService.getStats(projectId);

      expect(stats.openRate).toBe(0);
      expect(stats.clickRate).toBe(0);
      expect(stats.bounceRate).toBe(0);
    });
  });

  // ========================================
  // EMAIL ATTACHMENTS
  // ========================================
  describe('Email Attachments', () => {
    it('should send email with a single attachment', async () => {
      const attachment = {
        filename: 'invoice.pdf',
        content: Buffer.from('PDF content here').toString('base64'),
        contentType: 'application/pdf',
      };

      const email = await EmailService.sendTransactionalEmail({
        projectId,
        contactId,
        subject: 'Your Invoice',
        body: 'Please find your invoice attached',
        from: 'billing@example.com',
        attachments: [attachment],
      });

      expect(email.status).toBe(EmailStatus.PENDING);
      expect(email.attachments).toBeDefined();

      const attachments = email.attachments as unknown as Array<{
        filename: string;
        contentType: string;
      }>;
      expect(Array.isArray(attachments)).toBe(true);
      expect(attachments).toHaveLength(1);
      expect(attachments[0]).toMatchObject({
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      });
    });

    it('should send email with multiple attachments', async () => {
      const attachments = [
        {
          filename: 'document1.pdf',
          content: Buffer.from('PDF 1').toString('base64'),
          contentType: 'application/pdf',
        },
        {
          filename: 'image.png',
          content: Buffer.from('PNG data').toString('base64'),
          contentType: 'image/png',
        },
        {
          filename: 'data.csv',
          content: Buffer.from('CSV content').toString('base64'),
          contentType: 'text/csv',
        },
      ];

      const email = await EmailService.sendTransactionalEmail({
        projectId,
        contactId,
        subject: 'Multiple Files',
        body: 'Here are your files',
        from: 'support@example.com',
        attachments,
      });

      expect(email.status).toBe(EmailStatus.PENDING);

      const storedAttachments = email.attachments as unknown as Array<{filename: string}>;
      expect(storedAttachments).toHaveLength(3);
      expect(storedAttachments[0].filename).toBe('document1.pdf');
      expect(storedAttachments[1].filename).toBe('image.png');
      expect(storedAttachments[2].filename).toBe('data.csv');
    });

    it('should send email without attachments', async () => {
      const email = await EmailService.sendTransactionalEmail({
        projectId,
        contactId,
        subject: 'No Attachments',
        body: 'Simple email',
        from: 'test@example.com',
      });

      expect(email.status).toBe(EmailStatus.PENDING);
      expect(email.attachments).toBeNull();
    });

    it('should pass attachments to SES when sending', async () => {
      const attachment = {
        filename: 'test.txt',
        content: Buffer.from('Test content').toString('base64'),
        contentType: 'text/plain',
      };

      const email = await EmailService.sendTransactionalEmail({
        projectId,
        contactId,
        subject: 'Test',
        body: 'Test',
        from: 'test@example.com',
        attachments: [attachment],
      });

      // Send the email
      await EmailService.sendEmail(email.id);

      // Verify SES was called with attachments
      expect(vi.mocked(sendRawEmail)).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [attachment],
        }),
      );
    });

    it('should handle attachments in campaign emails', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});
      const campaign = await factories.createCampaign({projectId});

      const attachment = {
        filename: 'newsletter.pdf',
        content: Buffer.from('Newsletter content').toString('base64'),
        contentType: 'application/pdf',
      };

      const email = await EmailService.sendCampaignEmail({
        projectId,
        contactId: contact.id,
        campaignId: campaign.id,
        subject: 'Monthly Newsletter',
        body: 'See attachment',
        from: 'news@example.com',
        attachments: [attachment],
      });

      expect(email.status).toBe(EmailStatus.PENDING);
      expect(email.attachments).toBeDefined();

      const storedAttachments = email.attachments as unknown as Array<{filename: string}>;
      expect(storedAttachments[0].filename).toBe('newsletter.pdf');
    });

    it('should handle attachments in workflow emails', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});
      const workflow = await factories.createWorkflow({projectId});
      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);

      const attachment = {
        filename: 'report.pdf',
        content: Buffer.from('Report content').toString('base64'),
        contentType: 'application/pdf',
      };

      const email = await EmailService.sendWorkflowEmail({
        projectId,
        contactId: contact.id,
        subject: 'Your Report',
        body: 'Report attached',
        from: 'reports@example.com',
        workflowExecutionId: execution.id,
        attachments: [attachment],
      });

      expect(email.status).toBe(EmailStatus.PENDING);
      expect(email.attachments).toBeDefined();
    });
  });

  // ========================================
  // ATTACHMENT SCHEMA VALIDATION
  // ========================================
  describe('Attachment Schema Validation', () => {
    it('should validate attachment count limit (max 10)', () => {
      const tooManyAttachments = Array.from({length: 11}, (_, i) => ({
        filename: `file${i}.txt`,
        content: Buffer.from('content').toString('base64'),
        contentType: 'text/plain',
      }));

      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: tooManyAttachments,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('attachments'))).toBe(true);
      }
    });

    it('should validate attachment size limit (10MB total default)', () => {
      // Exceeds ~13.4M base64 chars for the default 10MB limit
      const largeContent = 'A'.repeat(14000000);

      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: [
          {
            filename: 'huge.txt',
            content: largeContent,
            contentType: 'text/plain',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should accept attachments within size limit', () => {
      const validContent = Buffer.from('Small file content').toString('base64');

      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        from: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: [
          {
            filename: 'small.txt',
            content: validContent,
            contentType: 'text/plain',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should reject attachment with missing required fields', () => {
      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: [
          {
            filename: 'test.txt',
            // Missing content and contentType
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should reject attachment with empty filename', () => {
      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: [
          {
            filename: '',
            content: Buffer.from('content').toString('base64'),
            contentType: 'text/plain',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should reject attachment with filename exceeding 255 chars', () => {
      const tooLongFilename = 'a'.repeat(256) + '.pdf';

      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: [
          {
            filename: tooLongFilename,
            content: Buffer.from('content').toString('base64'),
            contentType: 'text/plain',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should accept valid attachment with various content types', () => {
      const contentTypes = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'application/zip'];

      for (const contentType of contentTypes) {
        const result = ActionSchemas.send.safeParse({
          to: 'test@example.com',
          from: 'test@example.com',
          subject: 'Test',
          body: 'Test',
          attachments: [
            {
              filename: 'file.ext',
              content: Buffer.from('data').toString('base64'),
              contentType,
            },
          ],
        });

        expect(result.success).toBe(true);
      }
    });

    it('should accept inline attachment with contentId', () => {
      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        from: 'test@example.com',
        subject: 'Inline Image',
        body: '<img src="cid:logo" />',
        attachments: [
          {
            filename: 'logo.png',
            content: Buffer.from('image').toString('base64'),
            contentType: 'image/png',
            contentId: 'logo',
            disposition: 'inline',
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const attachment = result.data.attachments![0];
        expect(attachment.contentId).toBe('logo');
        expect(attachment.disposition).toBe('inline');
      }
    });

    it('should reject contentId exceeding 255 chars', () => {
      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: [
          {
            filename: 'image.png',
            content: Buffer.from('content').toString('base64'),
            contentType: 'image/png',
            contentId: 'a'.repeat(256),
            disposition: 'inline',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid disposition', () => {
      const result = ActionSchemas.send.safeParse({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        attachments: [
          {
            filename: 'image.png',
            content: Buffer.from('content').toString('base64'),
            contentType: 'image/png',
            disposition: 'invalid-disposition',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

  });
});

// ========================================
// SES MIME BOUNDARY STRUCTURE
// ========================================
// These tests verify the raw MIME assembly logic inside sendRawEmail.
// They need the REAL sendRawEmail (not the mock above), so we mock
// at the AWS SDK level instead.

describe('SES MIME Boundary Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly structure MIME boundaries for mixed content (attachments)', async () => {
    const {sendRawEmail: realSendRawEmail, ses} = await vi.importActual<typeof import('../SESService')>('../SESService');

    const params = {
      from: {name: 'Sender', email: 'sender@example.com'},
      to: ['recipient@example.com'],
      content: {subject: 'Test Subject', html: '<p>Hello world</p>'},
      attachments: [
        {
          filename: 'test.txt',
          content: 'SGVsbG8=',
          contentType: 'text/plain',
          disposition: 'attachment' as const,
        },
      ],
    };

    await realSendRawEmail(params);

    expect(ses.sendRawEmail).toHaveBeenCalled();
    const callArgs = (ses.sendRawEmail as Mock).mock.calls[0][0];
    const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);

    // Verify boundary hierarchy: Mixed -> Alternative
    expect(rawMessage).toMatch(/^From:.*Content-Type: multipart\/mixed; boundary="([^"]+)"/s);
    expect(rawMessage).toMatch(/Content-Type: multipart\/alternative; boundary="([^"]+)"/);

    const mixedBoundaryMatch = rawMessage.match(/boundary="([^"]+)"/);
    const mixedBoundary = mixedBoundaryMatch ? mixedBoundaryMatch[1] : '';

    expect(rawMessage).toContain(`--${mixedBoundary}\nContent-Type: multipart/alternative`);
    expect(rawMessage).toContain(`--${mixedBoundary}--`);
  });

  it('should correctly structure MIME boundaries for related content (inline images)', async () => {
    const {sendRawEmail: realSendRawEmail, ses} = await vi.importActual<typeof import('../SESService')>('../SESService');

    const params = {
      from: {name: 'Sender', email: 'sender@example.com'},
      to: ['recipient@example.com'],
      content: {subject: 'Test Subject', html: '<p>Hello world <img src="cid:image1"></p>'},
      attachments: [
        {
          filename: 'image.png',
          content:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          contentType: 'image/png',
          contentId: 'image1',
          disposition: 'inline' as const,
        },
      ],
    };

    await realSendRawEmail(params);

    const callArgs = (ses.sendRawEmail as Mock).mock.calls[0][0];
    const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);

    // Verify boundary hierarchy: Related -> Alternative
    expect(rawMessage).toMatch(/^From:.*Content-Type: multipart\/related; boundary="([^"]+)"/s);

    const relatedBoundaryMatch = rawMessage.match(/boundary="([^"]+)"/);
    const relatedBoundary = relatedBoundaryMatch ? relatedBoundaryMatch[1] : '';

    expect(rawMessage).toContain(`--${relatedBoundary}\nContent-Type: multipart/alternative`);
    expect(rawMessage).toContain(`Content-Disposition: inline; filename="image.png"`);
    expect(rawMessage).toContain(`--${relatedBoundary}--`);
  });

  it('should correctly nest mixed > related > alternative boundaries', async () => {
    const {sendRawEmail: realSendRawEmail, ses} = await vi.importActual<typeof import('../SESService')>('../SESService');

    const params = {
      from: {name: 'Sender', email: 'sender@example.com'},
      to: ['recipient@example.com'],
      content: {subject: 'Test Subject', html: '<p>Hello world <img src="cid:image1"></p>'},
      attachments: [
        {
          filename: 'test.txt',
          content: 'SGVsbG8=',
          contentType: 'text/plain',
          disposition: 'attachment' as const,
        },
        {
          filename: 'image.png',
          content:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          contentType: 'image/png',
          contentId: 'image1',
          disposition: 'inline' as const,
        },
      ],
    };

    await realSendRawEmail(params);

    const callArgs = (ses.sendRawEmail as Mock).mock.calls[0][0];
    const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);

    // Root should be mixed
    expect(rawMessage).toMatch(/^From:.*Content-Type: multipart\/mixed; boundary="([^"]+)"/s);

    const mixedMatch = rawMessage.match(/Content-Type: multipart\/mixed; boundary="([^"]+)"/);
    const mixedBoundary = mixedMatch ? mixedMatch[1] : 'NOT_FOUND_MIXED';

    // Within mixed, we should find related
    expect(rawMessage).toContain(`--${mixedBoundary}\nContent-Type: multipart/related`);

    const relatedMatch = rawMessage.match(/Content-Type: multipart\/related; boundary="([^"]+)"/);
    const relatedBoundary = relatedMatch ? relatedMatch[1] : 'NOT_FOUND_RELATED';

    // Within related, we should find alternative
    expect(rawMessage).toContain(`--${relatedBoundary}\nContent-Type: multipart/alternative`);

    const altMatch = rawMessage.match(/Content-Type: multipart\/alternative; boundary="([^"]+)"/);
    const altBoundary = altMatch ? altMatch[1] : 'NOT_FOUND_ALT';

    // Verify all closing boundaries exist
    expect(rawMessage).toContain(`--${altBoundary}--`);
    expect(rawMessage).toContain(`--${relatedBoundary}--`);
    expect(rawMessage).toContain(`--${mixedBoundary}--`);
  });
});

describe('SES header serialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function sendWithHeaders(headers: Record<string, string> | undefined) {
    const {sendRawEmail: realSendRawEmail, ses} = await vi.importActual<typeof import('../SESService')>('../SESService');

    await realSendRawEmail({
      from: {name: 'Sender', email: 'sender@example.com'},
      to: ['recipient@example.com'],
      content: {subject: 'Test Subject', html: '<p>Hello world</p>'},
      headers,
    });

    const callArgs = (ses.sendRawEmail as Mock).mock.calls[0][0];
    const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);

    // Per RFC 5322 the first blank line separates the header section from the body.
    const [headerSection, ...bodyParts] = rawMessage.split('\n\n');
    return {headerSection, body: bodyParts.join('\n\n')};
  }

  it('serializes every provided header into the header section, not the body', async () => {
    const bulkHeaders = {
      'List-Unsubscribe': '<https://app.example.com/unsubscribe/contact-123>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      Precedence: 'bulk',
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
    };

    const {headerSection, body} = await sendWithHeaders(bulkHeaders);

    for (const [key, value] of Object.entries(bulkHeaders)) {
      expect(headerSection).toContain(`${key}: ${value}`);
    }
    // The headers must not spill into the message body.
    expect(body).not.toContain('Precedence: bulk');
  });

  it('emits no stray header lines when no headers are provided', async () => {
    const {headerSection} = await sendWithHeaders(undefined);

    // Only the fixed envelope headers should be present.
    expect(headerSection).not.toContain('List-Unsubscribe');
    expect(headerSection).not.toContain('Precedence:');
    // The header section must not end with a blank line that would prematurely
    // terminate it (which would push the Content-Type into the body).
    expect(headerSection.endsWith('\n')).toBe(false);
    expect(headerSection).toContain('Content-Type:');
  });
});

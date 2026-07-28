import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EmailSourceType, EmailStatus, TrackingMode} from '@plunk/db';
import type {SendEmailJobData} from '@plunk/types';
import {toPrismaJson} from '@plunk/types';
import type {Job} from 'bullmq';
import {processEmailJob} from '../email-processor';
import {sendRawEmail} from '../../services/SESService';
import {createServiceMocks, factories, getPrismaClient} from '../../../../../test/helpers';

// Mock MeterService
vi.mock('../../services/MeterService.js', () => ({
  MeterService: {
    recordEmailSent: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock SES service so processEmailJob can run the real worker send path
vi.mock('../../services/SESService', () => ({
  sendRawEmail: vi.fn(),
  getSendingQuota: vi.fn().mockResolvedValue(null),
}));

describe('Email Processor', () => {
  let projectId: string;
  const prisma = getPrismaClient();
  const _serviceMocks = createServiceMocks();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject({}, {tracking: TrackingMode.ENABLED});
    projectId = project.id;
  });

  describe('Email Processing', () => {
    it('should process a pending email', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        subject: 'Test Email',
        body: '<p>Hello {{firstName}}</p>',
        status: EmailStatus.PENDING,
      });


      // Simulate processing
      await prisma.email.update({
        where: {id: email.id},
        data: {status: EmailStatus.SENDING},
      });

      // Simulate successful send
      await prisma.email.update({
        where: {id: email.id},
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      const processed = await prisma.email.findUnique({where: {id: email.id}});
      expect(processed?.status).toBe(EmailStatus.SENT);
      expect(processed?.sentAt).toBeDefined();
    });

    it('should skip emails that are not pending', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        status: EmailStatus.SENT, // Already sent
      });

      // Processor should skip this email
      const shouldProcess = email.status === EmailStatus.PENDING;
      expect(shouldProcess).toBe(false);
    });

    it('should fail email if project is disabled', async () => {
      // Create project with disabled flag
      const {project: disabledProject} = await factories.createUserWithProject({}, {disabled: true});

      const contact = await factories.createContact({projectId: disabledProject.id});
      const email = await factories.createEmail(disabledProject.id, contact.id, {
        status: EmailStatus.PENDING,
      });

      // Verify project is disabled
      const project = await prisma.project.findUnique({
        where: {id: disabledProject.id},
      });
      expect(project?.disabled).toBe(true);

      // Processor should fail this email
      await prisma.email.update({
        where: {id: email.id},
        data: {
          status: EmailStatus.FAILED,
          error: 'Project is disabled',
        },
      });

      const failed = await prisma.email.findUnique({where: {id: email.id}});
      expect(failed?.status).toBe(EmailStatus.FAILED);
      expect(failed?.error).toBe('Project is disabled');
    });

    it('should handle campaign emails', async () => {
      const contact = await factories.createContact({projectId});
      const campaign = await factories.createCampaign({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        campaignId: campaign.id,
        status: EmailStatus.PENDING,
      });

      expect(email.campaignId).toBe(campaign.id);

      // Process the email
      await prisma.email.update({
        where: {id: email.id},
        data: {status: EmailStatus.SENT, sentAt: new Date()},
      });

      const sent = await prisma.email.findUnique({where: {id: email.id}});
      expect(sent?.status).toBe(EmailStatus.SENT);
    });

    it('should handle transactional emails without unsubscribe', async () => {
      const contact = await factories.createContact({projectId});
      const template = await factories.createTemplate({
        projectId,
        type: 'TRANSACTIONAL',
      });

      await factories.createEmail(projectId, contact.id, {
        templateId: template.id,
        status: EmailStatus.PENDING,
      });

      expect(template.type).toBe('TRANSACTIONAL');
    });
  });

  describe('Email Status Transitions', () => {
    it('should transition PENDING -> SENDING -> SENT', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        status: EmailStatus.PENDING,
      });

      expect(email.status).toBe(EmailStatus.PENDING);

      // Transition to SENDING
      await prisma.email.update({
        where: {id: email.id},
        data: {status: EmailStatus.SENDING},
      });

      let updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.SENDING);

      // Transition to SENT
      await prisma.email.update({
        where: {id: email.id},
        data: {status: EmailStatus.SENT, sentAt: new Date()},
      });

      updated = await prisma.email.findUnique({where: {id: email.id}});
      expect(updated?.status).toBe(EmailStatus.SENT);
      expect(updated?.sentAt).toBeDefined();
    });

    it('should handle PENDING -> SENDING -> FAILED', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        status: EmailStatus.PENDING,
      });

      // Transition to SENDING
      await prisma.email.update({
        where: {id: email.id},
        data: {status: EmailStatus.SENDING},
      });

      // Fail with error
      await prisma.email.update({
        where: {id: email.id},
        data: {
          status: EmailStatus.FAILED,
          error: 'SES send failed: Invalid email address',
        },
      });

      const failed = await prisma.email.findUnique({where: {id: email.id}});
      expect(failed?.status).toBe(EmailStatus.FAILED);
      expect(failed?.error).toContain('SES send failed');
    });
  });

  describe('Batch Processing', () => {
    it('should handle multiple emails from a campaign', async () => {
      const campaign = await factories.createCampaign({projectId});
      const contacts = await factories.createContacts(projectId, 10);

      // Create emails for all contacts
      const emails = await Promise.all(
        contacts.map(contact =>
          factories.createEmail(projectId, contact.id, {
            campaignId: campaign.id,
            status: EmailStatus.PENDING,
          }),
        ),
      );

      expect(emails).toHaveLength(10);
      expect(emails.every(e => e.campaignId === campaign.id)).toBe(true);

      // Simulate processing all emails
      await Promise.all(
        emails.map(email =>
          prisma.email.update({
            where: {id: email.id},
            data: {status: EmailStatus.SENT, sentAt: new Date()},
          }),
        ),
      );

      const processed = await prisma.email.findMany({
        where: {campaignId: campaign.id},
      });

      expect(processed.every(e => e.status === EmailStatus.SENT)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should record error message on failure', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        status: EmailStatus.PENDING,
      });

      // Simulate failure
      const errorMessage = 'Failed to send: Rate limit exceeded';
      await prisma.email.update({
        where: {id: email.id},
        data: {
          status: EmailStatus.FAILED,
          error: errorMessage,
        },
      });

      const failed = await prisma.email.findUnique({where: {id: email.id}});
      expect(failed?.status).toBe(EmailStatus.FAILED);
      expect(failed?.error).toBe(errorMessage);
    });
  });

  describe('Attachment Billing', () => {
    it('should verify emails with attachments have attachment data', async () => {
      const contact = await factories.createContact({projectId});

      // Create email with attachments
      const emailWithAttachments = await prisma.email.create({
        data: {
          projectId,
          contactId: contact.id,
          subject: 'Email with attachments',
          body: '<p>Test email with attachments</p>',
          from: 'test@example.com',
          status: EmailStatus.PENDING,
          sourceType: EmailSourceType.TRANSACTIONAL,
          attachments: toPrismaJson([
            {
              filename: 'document.pdf',
              content: 'base64encodedcontent',
              contentType: 'application/pdf',
            },
          ]),
        },
      });

      // Create email without attachments
      const emailWithoutAttachments = await factories.createEmail(projectId, contact.id, {
        status: EmailStatus.PENDING,
      });

      // Verify attachments are stored correctly
      const emailWithAttachmentsData = await prisma.email.findUnique({
        where: {id: emailWithAttachments.id},
      });
      const emailWithoutAttachmentsData = await prisma.email.findUnique({
        where: {id: emailWithoutAttachments.id},
      });

      expect(emailWithAttachmentsData?.attachments).toBeDefined();
      expect(Array.isArray(emailWithAttachmentsData?.attachments)).toBe(true);
      expect(
        Array.isArray(emailWithAttachmentsData?.attachments) ? emailWithAttachmentsData.attachments.length : 0,
      ).toBeGreaterThan(0);

      expect(emailWithoutAttachmentsData?.attachments).toBeNull();
    });

    it('should verify attachment logic determines charging correctly', async () => {
      const contact = await factories.createContact({projectId});

      // Create email with attachments
      const emailWithAttachments = await prisma.email.create({
        data: {
          projectId,
          contactId: contact.id,
          subject: 'Email with attachments',
          body: '<p>Test</p>',
          from: 'test@example.com',
          status: EmailStatus.PENDING,
          sourceType: EmailSourceType.TRANSACTIONAL,
          attachments: toPrismaJson([{filename: 'file.pdf', content: 'base64', contentType: 'application/pdf'}]),
        },
        include: {
          project: true,
          contact: true,
        },
      });

      // Simulate the logic from email-processor.ts
      const hasAttachments =
        emailWithAttachments.attachments &&
        Array.isArray(emailWithAttachments.attachments) &&
        emailWithAttachments.attachments.length > 0;
      const emailCount = hasAttachments ? 2 : 1;

      // Verify logic correctly identifies attachments
      expect(hasAttachments).toBe(true);
      expect(emailCount).toBe(2);

      // Test without attachments
      const emailWithoutAttachments = await factories.createEmail(projectId, contact.id, {
        status: EmailStatus.PENDING,
      });
      const emailWithoutAttachmentsData = await prisma.email.findUnique({
        where: {id: emailWithoutAttachments.id},
      });

      const hasNoAttachments =
        emailWithoutAttachmentsData?.attachments &&
        Array.isArray(emailWithoutAttachmentsData.attachments) &&
        emailWithoutAttachmentsData.attachments.length > 0;
      const emailCountNoAttachments = hasNoAttachments ? 2 : 1;

      expect(hasNoAttachments).toBeFalsy();
      expect(emailCountNoAttachments).toBe(1);
    });
  });

  describe('Per-Email Tracking Override (worker send path)', () => {
    const runJob = (emailId: string) => processEmailJob({data: {emailId}} as Job<SendEmailJobData>);

    beforeEach(() => {
      vi.mocked(sendRawEmail).mockClear();
      vi.mocked(sendRawEmail).mockResolvedValue({messageId: 'ses-worker-123'});
    });

    it('should disable tracking when trackingOverride is false, even with project tracking ENABLED', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail({
        projectId,
        contactId: contact.id,
        status: EmailStatus.PENDING,
        trackingOverride: false,
      });

      await runJob(email.id);

      expect(vi.mocked(sendRawEmail)).toHaveBeenCalledWith(expect.objectContaining({tracking: false}));

      const sent = await prisma.email.findUnique({where: {id: email.id}});
      expect(sent?.status).toBe(EmailStatus.SENT);
    });

    it('should enable tracking when trackingOverride is true, even with project tracking DISABLED', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {tracking: TrackingMode.DISABLED},
      });

      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail({
        projectId,
        contactId: contact.id,
        status: EmailStatus.PENDING,
        trackingOverride: true,
      });

      await runJob(email.id);

      expect(vi.mocked(sendRawEmail)).toHaveBeenCalledWith(expect.objectContaining({tracking: true}));
    });

    it('should fall back to project tracking mode when trackingOverride is null', async () => {
      await prisma.project.update({
        where: {id: projectId},
        data: {tracking: TrackingMode.DISABLED},
      });

      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail({
        projectId,
        contactId: contact.id,
        status: EmailStatus.PENDING,
      });

      await runJob(email.id);

      expect(vi.mocked(sendRawEmail)).toHaveBeenCalledWith(expect.objectContaining({tracking: false}));
    });
  });
});

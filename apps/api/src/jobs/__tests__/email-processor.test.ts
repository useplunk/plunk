import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EmailSourceType, EmailStatus, TrackingMode} from '@plunk/db';
import {toPrismaJson} from '@plunk/types';
import {Job} from 'bullmq';
import {createServiceMocks, factories, getPrismaClient} from '../../../../../test/helpers';
import {prisma as runtimePrisma} from '../../database/prisma.js';
import {EventService} from '../../services/EventService.js';
import {emailQueue} from '../../services/QueueService.js';
import {createEmailWorker} from '../email-processor';

const sesMocks = vi.hoisted(() => ({
  getSendingQuota: vi.fn(),
  sendRawEmail: vi.fn(),
}));

vi.mock('../../services/SESService.js', () => sesMocks);

// Mock MeterService
vi.mock('../../services/MeterService.js', () => ({
  MeterService: {
    recordEmailSent: vi.fn().mockResolvedValue(undefined),
  },
}));

async function waitForEmailStatus(emailId: string, status: EmailStatus) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const email = await getPrismaClient().email.findUniqueOrThrow({where: {id: emailId}});
    if (email.status === status) return email;
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  throw new Error(`Email ${emailId} did not reach ${status}`);
}

async function waitForJobState(job: {getState(): Promise<string>}, state: string) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if ((await job.getState()) === state) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }

  throw new Error(`Job did not reach ${state}`);
}

describe('Email Processor', () => {
  let projectId: string;
  const prisma = getPrismaClient();
  const _serviceMocks = createServiceMocks();

  beforeEach(async () => {
    sesMocks.getSendingQuota.mockReset().mockResolvedValue({
      maxSendRate: 14,
      sentLast24Hours: 0,
      max24HourSend: 200,
    });
    sesMocks.sendRawEmail.mockReset().mockResolvedValue({messageId: 'mock-message-id'});
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

    it('should retry SES after the first failure and succeed on the second attempt', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        sourceType: EmailSourceType.TRANSACTIONAL,
        status: EmailStatus.PENDING,
      });
      const retryableSesError = Object.assign(new Error('transient SES failure'), {
        $metadata: {httpStatusCode: 503},
      });
      sesMocks.sendRawEmail
        .mockRejectedValueOnce(retryableSesError)
        .mockResolvedValueOnce({messageId: 'ses-retry-success'});
      const worker = await createEmailWorker();

      try {
        await emailQueue.add(
          'send-email',
          {emailId: email.id},
          {
            jobId: `retry-success-${email.id}`,
            attempts: 2,
            backoff: {type: 'fixed', delay: 10},
          },
        );

        await expect(waitForEmailStatus(email.id, EmailStatus.SENT)).resolves.toMatchObject({
          status: EmailStatus.SENT,
          messageId: 'ses-retry-success',
          error: null,
        });
      } finally {
        await worker.close();
      }

      expect(sesMocks.sendRawEmail).toHaveBeenCalledTimes(2);
    });

    it('should record FAILED only when SES attempts are exhausted', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        sourceType: EmailSourceType.TRANSACTIONAL,
        status: EmailStatus.PENDING,
      });
      sesMocks.sendRawEmail.mockRejectedValue(
        Object.assign(new Error('terminal SES failure'), {$metadata: {httpStatusCode: 503}}),
      );
      const worker = await createEmailWorker();

      try {
        await emailQueue.add(
          'send-email',
          {emailId: email.id},
          {
            jobId: `retry-exhausted-${email.id}`,
            attempts: 2,
            backoff: {type: 'fixed', delay: 10},
          },
        );

        await waitForEmailStatus(email.id, EmailStatus.FAILED);
      } finally {
        await worker.close();
      }

      expect(sesMocks.sendRawEmail).toHaveBeenCalledTimes(2);
      await expect(prisma.email.findUniqueOrThrow({where: {id: email.id}})).resolves.toMatchObject({
        status: EmailStatus.FAILED,
        error: 'terminal SES failure',
      });
    });

    it('should finalize a checkpointed SES acceptance after the database recovers', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        sourceType: EmailSourceType.TRANSACTIONAL,
        status: EmailStatus.PENDING,
      });
      sesMocks.sendRawEmail.mockImplementationOnce(async () => {
        // The SENDING write already succeeded. Fail both attempts to persist the
        // accepted message so the BullMQ retry must recover it from job data.
        vi.spyOn(runtimePrisma.email, 'updateMany').mockRejectedValueOnce(new Error('database unavailable'));
        vi.spyOn(runtimePrisma.email, 'update').mockRejectedValueOnce(new Error('database still unavailable'));
        return {messageId: 'ses-checkpointed'};
      });
      const worker = await createEmailWorker();

      try {
        await emailQueue.add(
          'send-email',
          {emailId: email.id},
          {
            jobId: `accepted-checkpoint-${email.id}`,
            attempts: 2,
            backoff: {type: 'fixed', delay: 10},
          },
        );

        await expect(waitForEmailStatus(email.id, EmailStatus.SENT)).resolves.toMatchObject({
          status: EmailStatus.SENT,
          messageId: 'ses-checkpointed',
        });
      } finally {
        await worker.close();
      }

      expect(sesMocks.sendRawEmail).toHaveBeenCalledOnce();
    });

    it('should fail visibly when neither the acceptance checkpoint nor database writes succeed', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        sourceType: EmailSourceType.TRANSACTIONAL,
        status: EmailStatus.PENDING,
      });
      vi.spyOn(Job.prototype, 'updateData')
        .mockRejectedValueOnce(new Error('redis unavailable'))
        .mockRejectedValueOnce(new Error('redis still unavailable'));
      sesMocks.sendRawEmail.mockImplementationOnce(async () => {
        vi.spyOn(runtimePrisma.email, 'updateMany').mockRejectedValueOnce(new Error('database unavailable'));
        vi.spyOn(runtimePrisma.email, 'update').mockRejectedValueOnce(new Error('database still unavailable'));
        return {messageId: 'ses-uncheckpointed'};
      });
      const worker = await createEmailWorker();

      try {
        await emailQueue.add(
          'send-email',
          {emailId: email.id},
          {
            jobId: `uncheckpointed-acceptance-${email.id}`,
            attempts: 2,
            backoff: {type: 'fixed', delay: 10},
          },
        );

        await waitForEmailStatus(email.id, EmailStatus.FAILED);
      } finally {
        await worker.close();
      }

      expect(sesMocks.sendRawEmail).toHaveBeenCalledOnce();
      await expect(prisma.email.findUniqueOrThrow({where: {id: email.id}})).resolves.toMatchObject({
        status: EmailStatus.FAILED,
        error: 'Previous attempt ended without an SES acceptance checkpoint; not retried to avoid a duplicate',
      });
    });

    it('should not retry an ambiguous SES transport failure', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        sourceType: EmailSourceType.TRANSACTIONAL,
        status: EmailStatus.PENDING,
      });
      sesMocks.sendRawEmail.mockRejectedValue(new Error('socket closed before the response'));
      const worker = await createEmailWorker();

      try {
        const job = await emailQueue.add(
          'send-email',
          {emailId: email.id},
          {
            jobId: `ambiguous-ses-${email.id}`,
            attempts: 2,
            backoff: {type: 'fixed', delay: 10},
          },
        );

        await waitForJobState(job, 'failed');
      } finally {
        await worker.close();
      }

      expect(sesMocks.sendRawEmail).toHaveBeenCalledOnce();
      await expect(prisma.email.findUniqueOrThrow({where: {id: email.id}})).resolves.toMatchObject({
        status: EmailStatus.FAILED,
        error: 'SES outcome is unknown; not retried to avoid a duplicate: socket closed before the response',
      });
    });

    it('should not resubmit an email when post-send processing fails', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id, {
        sourceType: EmailSourceType.TRANSACTIONAL,
        status: EmailStatus.PENDING,
      });
      sesMocks.sendRawEmail.mockResolvedValue({messageId: 'ses-already-accepted'});
      vi.spyOn(EventService, 'trackEvent').mockRejectedValueOnce(new Error('event persistence failed'));
      const worker = await createEmailWorker();

      try {
        const job = await emailQueue.add(
          'send-email',
          {emailId: email.id},
          {
            jobId: `post-send-failure-${email.id}`,
            attempts: 2,
            backoff: {type: 'fixed', delay: 10},
          },
        );

        await waitForJobState(job, 'failed');
      } finally {
        await worker.close();
      }

      expect(sesMocks.sendRawEmail).toHaveBeenCalledOnce();
      await expect(prisma.email.findUniqueOrThrow({where: {id: email.id}})).resolves.toMatchObject({
        status: EmailStatus.SENT,
        messageId: 'ses-already-accepted',
        error: 'Post-send processing failed: event persistence failed',
      });
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
});

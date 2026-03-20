/**
 * Background Job: Email Processor
 * Processes individual emails from the queue (for all sources: transactional, campaign, workflow)
 */

import {CampaignStatus, EmailSourceType, EmailStatus} from '@plunk/db';
import type {SendEmailJobData} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {DASHBOARD_URI, EMAIL_RATE_LIMIT_PER_SECOND} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {EmailService} from '../services/EmailService.js';
import {EventService} from '../services/EventService.js';
import {emailQueue} from '../services/QueueService.js';
import {sendRawEmail} from '../services/SESService.js';

/**
 * Determine the email sending rate limit (emails per second)
 * Uses ENV variable or a safe default (14)
 */
async function getEmailRateLimit(): Promise<number> {
  const DEFAULT_RATE_LIMIT = 14; // Safe default

  if (EMAIL_RATE_LIMIT_PER_SECOND !== undefined) {
    signale.info(`[EMAIL-PROCESSOR] Using rate limit from environment: ${EMAIL_RATE_LIMIT_PER_SECOND} emails/second`);
    return EMAIL_RATE_LIMIT_PER_SECOND;
  }

  signale.info(`[EMAIL-PROCESSOR] Using default rate limit: ${DEFAULT_RATE_LIMIT} emails/second`);
  return DEFAULT_RATE_LIMIT;
}

export async function createEmailWorker() {
  // Fetch the rate limit (from env, AWS, or default)
  const rateLimit = await getEmailRateLimit();
  const worker = new Worker<SendEmailJobData>(
    emailQueue.name,
    async (job: Job<SendEmailJobData>) => {
      const {emailId} = job.data;

      const email = await prisma.email.findUnique({
        where: {id: emailId},
        include: {
          contact: true,
          project: true,
        },
      });

      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      if (email.status !== EmailStatus.PENDING) {
        return;
      }

      // Check if project is disabled
      if (email.project.disabled) {
        signale.warn(`[EMAIL-PROCESSOR] Project ${email.projectId} is disabled, cancelling email ${emailId}`);
        await prisma.email.update({
          where: {id: emailId},
          data: {
            status: EmailStatus.FAILED,
            error: 'Project is disabled',
          },
        });
        return;
      }

      try {
        // Update status to sending
        await prisma.email.update({
          where: {id: emailId},
          data: {status: EmailStatus.SENDING},
        });

        // Format template variables in subject and body
        const contactData = (email.contact.data as Record<string, unknown>) || {};
        const formattedEmail = EmailService.format({
          subject: email.subject,
          body: email.body,
          data: {
            email: email.contact.email,
            ...contactData,
            data: contactData,
            unsubscribeUrl: `${DASHBOARD_URI}/unsubscribe/${email.contact.id}`,
            subscribeUrl: `${DASHBOARD_URI}/subscribe/${email.contact.id}`,
            manageUrl: `${DASHBOARD_URI}/manage/${email.contact.id}`,
          },
        });

        // Compile HTML with unsubscribe footer and badge
        const compiledHtml = EmailService.compile({
          content: formattedEmail.body,
          contact: email.contact,
          project: email.project,
          includeUnsubscribe: email.sourceType !== EmailSourceType.TRANSACTIONAL, // Don't add unsubscribe to transactional emails
        });

        // Use fromName from database if available, otherwise fall back to project name
        // The 'from' field in the database is just the email address
        const fromName = email.fromName || email.project.name;
        const fromEmail = email.from;

        // Parse custom headers from JSON
        const customHeaders =
          email.headers && typeof email.headers === 'object' && !Array.isArray(email.headers)
            ? (email.headers as Record<string, string>)
            : undefined;

        // Check for custom recipient override in headers
        const recipientEmail = customHeaders?.['X-Plunk-Recipient-Override'] || email.contact.email;

        // Remove internal headers before sending
        const publicHeaders = customHeaders ? {...customHeaders} : undefined;
        if (publicHeaders && 'X-Plunk-Recipient-Override' in publicHeaders) {
          delete publicHeaders['X-Plunk-Recipient-Override'];
        }

        // Build recipient with name if available
        const recipient: {name?: string; email: string} | string = email.toName
          ? {name: email.toName, email: recipientEmail}
          : recipientEmail;

        // Determine tracking based on project settings and email type
        const shouldTrack = EmailService.shouldTrackEmail(email.project.tracking, email.sourceType);

        // Send via AWS SES
        const result = await sendRawEmail({
          from: {
            name: fromName,
            email: fromEmail,
          },
          to: typeof recipient === 'string' ? [recipient] : [{name: recipient.name, email: recipient.email}],
          content: {
            subject: formattedEmail.subject,
            html: compiledHtml,
          },
          reply: email.replyTo || undefined,
          headers: publicHeaders,
          tracking: shouldTrack,
          attachments: email.attachments as {filename: string; content: string; contentType: string}[] | null,
        });

        // Mark as sent with SES message ID
        await prisma.email.update({
          where: {id: emailId},
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            messageId: result.messageId,
          },
        });

        // Track event (this will trigger workflows)
        await EventService.trackEvent(email.projectId, 'email.sent', email.contactId, email.id, {
          subject: formattedEmail.subject,
          from: email.from,
          fromName: email.fromName,
          messageId: result.messageId,
          templateId: email.templateId,
          campaignId: email.campaignId,
          sourceType: email.sourceType,
          sentAt: new Date().toISOString(),
        });

        // If this email belongs to a campaign, check if all campaign emails have been sent
        if (email.campaignId) {
          const campaign = await prisma.campaign.findUnique({
            where: {id: email.campaignId},
            select: {
              id: true,
              name: true,
              status: true,
              totalRecipients: true,
              projectId: true,
              project: {
                select: {name: true},
              },
            },
          });

          // Only check if campaign is still in SENDING status
          if (campaign && campaign.status === CampaignStatus.SENDING) {
            // Count how many emails have been sent for this campaign
            const sentCount = await prisma.email.count({
              where: {
                campaignId: email.campaignId,
                sentAt: {not: null},
              },
            });

            // If all emails have been sent, mark campaign as SENT
            if (sentCount >= campaign.totalRecipients) {
              await prisma.campaign.update({
                where: {id: email.campaignId},
                data: {
                  status: CampaignStatus.SENT,
                  sentCount,
                },
              });

              signale.success(
                `[EMAIL-PROCESSOR] Campaign ${campaign.name} completed: ${sentCount}/${campaign.totalRecipients} emails sent`,
              );

              // Send notification about campaign send completed
              const {NtfyService} = await import('../services/NtfyService.js');
              await NtfyService.notifyCampaignSendCompleted(
                campaign.name,
                campaign.project.name,
                campaign.projectId,
                campaign.totalRecipients,
              );
            }
          }
        }
      } catch (error) {
        signale.error(`[EMAIL-PROCESSOR] Failed to send email ${emailId}:`, error);

        // Mark as failed
        await prisma.email.update({
          where: {id: emailId},
          data: {
            status: EmailStatus.FAILED,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection: emailQueue.opts.connection,
      concurrency: 10, // Process up to 10 emails concurrently
      limiter: {
        max: rateLimit, // Max emails per second (from env, AWS SES quota, or default)
        duration: 1000,
      },
    },
  );

  worker.on('completed', job => {
    signale.info(`[EMAIL-PROCESSOR] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[EMAIL-PROCESSOR] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', err => {
    signale.error('[EMAIL-PROCESSOR] Worker error:', err);
  });

  return worker;
}

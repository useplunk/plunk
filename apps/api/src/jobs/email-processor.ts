/**
 * Background Job: Email Processor
 * Processes individual emails from the queue (for all sources: transactional, campaign, workflow)
 *
 * This is the only send path. `EmailService.sendEmail` used to hold a second copy of it, tested
 * while this one was not, and the two had drifted; it has been removed. The behaviour those tests
 * claimed to cover -- PENDING → SENDING → SENT, the failure transition, send idempotency, and
 * attachments reaching SES -- is implemented here and is currently untested, because the job body
 * is inline in `createEmailWorker` and cannot be called without a queue. Extracting it is worth
 * doing before this logic is next changed.
 */

import {CampaignStatus, EmailSourceType, EmailStatus, type TemplateType} from '@plunk/db';
import type {SendEmailJobData} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {
  DASHBOARD_URI,
  EMAIL_RATE_LIMIT_PER_SECOND,
  EMAIL_WORKER_CONCURRENCY,
  EMAIL_WORKER_MAX_CONCURRENCY,
} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {CampaignService} from '../services/CampaignService.js';
import {
  bodyHasListManagementLink,
  buildEmailHeaders,
  classifyEmail,
  withSourceEmail,
} from '../services/EmailHeaderService.js';
import {EmailService} from '../services/EmailService.js';
import {EventService} from '../services/EventService.js';
import {MeterService} from '../services/MeterService.js';
import {emailQueue} from '../services/QueueService.js';
import {SecurityService} from '../services/SecurityService.js';
import {getSendingQuota, sendRawEmail} from '../services/SESService.js';

/**
 * Determine the email sending rate limit (emails per second)
 * Priority: ENV variable > AWS SES quota > Safe default (14)
 */
async function getEmailRateLimit(): Promise<number> {
  const DEFAULT_RATE_LIMIT = 14; // AWS SES sandbox limit - safe default

  // If env variable is set, use it (override)
  if (EMAIL_RATE_LIMIT_PER_SECOND !== undefined) {
    signale.info(`[EMAIL-PROCESSOR] Using rate limit from environment: ${EMAIL_RATE_LIMIT_PER_SECOND} emails/second`);
    return EMAIL_RATE_LIMIT_PER_SECOND;
  }

  // Try to fetch from AWS SES
  signale.info('[EMAIL-PROCESSOR] Fetching rate limit from AWS SES...');
  const quota = await getSendingQuota();

  if (quota) {
    signale.info(
      `[EMAIL-PROCESSOR] AWS SES quota: ${quota.maxSendRate} emails/second (${quota.sentLast24Hours}/${quota.max24HourSend} emails sent today)`,
    );
    return quota.maxSendRate;
  }

  // Fallback to safe default
  signale.warn(`[EMAIL-PROCESSOR] Failed to fetch AWS quota, using safe default: ${DEFAULT_RATE_LIMIT} emails/second`);
  return DEFAULT_RATE_LIMIT;
}

/**
 * Derive worker concurrency from the rate limit so a higher SES quota actually
 * translates into higher throughput. The mean job duration is ~0.5s (Prisma
 * reads + HTML compile + SES call + writes), so `rate * 0.5` gives ~2× headroom
 * over the per-second cap. Clamped to keep sandbox accounts useful and to
 * protect the Prisma pool on very large quotas.
 */
function deriveWorkerConcurrency(rateLimit: number): number {
  if (EMAIL_WORKER_CONCURRENCY !== undefined) {
    return EMAIL_WORKER_CONCURRENCY;
  }

  const TARGET_JOB_SECONDS = 0.5;
  const MIN_CONCURRENCY = 5;
  const derived = Math.ceil(rateLimit * TARGET_JOB_SECONDS);
  return Math.max(MIN_CONCURRENCY, Math.min(derived, EMAIL_WORKER_MAX_CONCURRENCY));
}

const UNSUBSCRIBED_ERROR = 'Contact is unsubscribed from marketing emails';

/**
 * Re-read subscription state at the last possible point before handing a
 * marketing email to SES. The email may have waited in Redis after the earlier
 * enqueue-time check, so the contact bundled into the initial worker query can
 * already be stale.
 */
export async function submitEmailWithSubscriptionCheck<T>(
  params: {
    emailId: string;
    sourceType: EmailSourceType;
    templateType?: TemplateType | null;
    hasRecipientOverride: boolean;
  },
  submit: () => Promise<T>,
): Promise<{submitted: false} | {submitted: true; result: T}> {
  // Source type carries the transactional exemption. A MARKETING template is
  // the one deliberate override: the transactional API rejects that template
  // for an unsubscribed contact, so the backlog check must preserve the same
  // policy if the contact unsubscribes after enqueueing.
  const requiresSubscription =
    !params.hasRecipientOverride &&
    (params.sourceType !== EmailSourceType.TRANSACTIONAL || params.templateType === 'MARKETING');

  if (requiresSubscription) {
    const latestEmail = await prisma.email.findUnique({
      where: {id: params.emailId},
      select: {
        contact: {
          select: {
            email: true,
            subscribed: true,
          },
        },
      },
    });

    if (!latestEmail) {
      throw new Error(`Email ${params.emailId} not found during subscription check`);
    }

    if (!latestEmail.contact.subscribed) {
      signale.warn(
        `[EMAIL-PROCESSOR] Skipping marketing email ${params.emailId} to unsubscribed contact ${latestEmail.contact.email}`,
      );
      await prisma.email.update({
        where: {id: params.emailId},
        data: {
          status: EmailStatus.FAILED,
          error: UNSUBSCRIBED_ERROR,
        },
      });
      return {submitted: false};
    }
  }

  return {submitted: true, result: await submit()};
}

export async function createEmailWorker() {
  // Fetch the rate limit (from env, AWS, or default)
  const rateLimit = await getEmailRateLimit();
  const concurrency = deriveWorkerConcurrency(rateLimit);
  signale.info(
    `[EMAIL-PROCESSOR] Worker concurrency: ${concurrency} (rate limit: ${rateLimit}/s)`,
  );
  const worker = new Worker<SendEmailJobData>(
    emailQueue.name,
    async (job: Job<SendEmailJobData>) => {
      const {emailId} = job.data;

      const email = await prisma.email.findUnique({
        where: {id: emailId},
        include: {
          contact: true,
          project: true,
          template: {select: {type: true}},
          campaign: {select: {type: true, status: true}},
        },
      });

      // A missing row is now an expected outcome rather than an error: cancelling a
      // campaign before it sent anything deletes its unsent emails in the background,
      // and every job already queued for them arrives here to find nothing. Throwing
      // would put each one through three retries and into the failed set -- millions
      // of executions for a large campaign, burying real failures. There is nothing to
      // send and nothing to record, so the job is simply done.
      if (!email) {
        signale.warn(`[EMAIL-PROCESSOR] Email ${emailId} no longer exists, skipping`);
        return;
      }

      if (email.status !== EmailStatus.PENDING) {
        return;
      }

      // A campaign that was cancelled (or reverted to draft) after this job was
      // queued must not keep sending. `CampaignService.processBatch` stops the batch
      // chain on its own status check, but the per-email jobs it already created are
      // in this queue and would otherwise ship regardless -- which is what made a
      // cancel of a SENDING campaign a relabel rather than a stop. Marking the email
      // FAILED rather than deleting it keeps the row that `cancel` counts when it
      // decides whether the campaign is still reversible.
      if (email.campaign && email.campaign.status !== CampaignStatus.SENDING) {
        signale.warn(
          `[EMAIL-PROCESSOR] Campaign ${email.campaignId} is ${email.campaign.status}, skipping email ${emailId}`,
        );
        await prisma.email.update({
          where: {id: emailId},
          data: {
            status: EmailStatus.FAILED,
            error: `Campaign ${email.campaign.status.toLowerCase()}`,
          },
        });

        // No `finalizeIfDone` here: it only advances a campaign that is still
        // SENDING, and this branch runs precisely when it is not.
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

        // Cancelled emails are terminal for the campaign — finalize so it doesn't
        // stay stuck in SENDING forever waiting on emails that will never be sent.
        if (email.campaignId) {
          await CampaignService.finalizeIfDone(email.campaignId);
        }
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
            unsubscribeUrl: withSourceEmail(`${DASHBOARD_URI}/unsubscribe/${email.contact.id}`, emailId),
            subscribeUrl: withSourceEmail(`${DASHBOARD_URI}/subscribe/${email.contact.id}`, emailId),
            manageUrl: withSourceEmail(`${DASHBOARD_URI}/manage/${email.contact.id}`, emailId),
          },
        });

        // Classify the email once: it decides both the unsubscribe footer and the
        // standards-based headers below.
        const emailClass = classifyEmail({
          sourceType: email.sourceType,
          templateType: email.template?.type,
          campaignType: email.campaign?.type,
        });

        // Compile HTML with unsubscribe footer and badge.
        // Only marketing emails get the Plunk unsubscribe footer.
        const compiledHtml = EmailService.compile({
          content: formattedEmail.body,
          contact: email.contact,
          project: email.project,
          includeUnsubscribe: emailClass === 'marketing',
          sourceEmailId: emailId,
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

        // Build the outbound headers: standards-based defaults for the email class
        // plus any caller-supplied headers (which override the defaults).
        const outboundHeaders = buildEmailHeaders({
          emailClass,
          isCampaign: email.campaignId != null,
          hasListManagementLink: bodyHasListManagementLink(compiledHtml, email.contact.id),
          unsubscribeId: email.contact.id,
          sourceEmailId: emailId,
          customHeaders: publicHeaders,
        });

        // Build recipient with name if available
        const recipient: {name?: string; email: string} | string = email.toName
          ? {name: email.toName, email: recipientEmail}
          : recipientEmail;

        // Determine tracking based on project settings and email type
        const shouldTrack = EmailService.shouldTrackEmail(email.project.tracking, email.sourceType);

        // Check for phishing/dangerous content before sending
        const phishingCheck = await SecurityService.checkPhishingContent(
          email.projectId,
          email.project.name,
          email.from,
          formattedEmail.subject,
          compiledHtml,
        );

        if (phishingCheck.shouldDisable) {
          // Disable project immediately
          await SecurityService.disableProjectForPhishing(
            email.projectId,
            formattedEmail.subject,
            phishingCheck.confidence,
            'Phishing content detected',
          );

          // Mark email as failed
          await prisma.email.update({
            where: {id: emailId},
            data: {
              status: EmailStatus.FAILED,
              error: 'This email could not be sent. The project has been disabled. Please contact support.',
            },
          });

          throw new Error(`Project ${email.projectId} has been disabled due to a policy violation`);
        }

        // The contact may have unsubscribed while this job was waiting in Redis.
        // Wrap the actual SES call so that the fresh subscription read and submit
        // cannot accidentally drift apart later.
        const submission = await submitEmailWithSubscriptionCheck(
          {
            emailId,
            sourceType: email.sourceType,
            templateType: email.template?.type,
            hasRecipientOverride: Boolean(customHeaders?.['X-Plunk-Recipient-Override']),
          },
          () =>
            sendRawEmail({
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
              headers: outboundHeaders,
              tracking: shouldTrack,
              attachments: email.attachments as {filename: string; content: string; contentType: string}[] | null,
            }),
        );

        if (!submission.submitted) {
          if (email.campaignId) {
            await CampaignService.finalizeIfDone(email.campaignId);
          }
          return;
        }

        const {result} = submission;

        // Mark as sent with SES message ID.
        //
        // Guarded on `sentAt` still being null so the campaign counter below is only
        // incremented by the run that actually stamped it. A job retried after SES
        // accepted the message would otherwise count the same email twice.
        const marked = await prisma.email.updateMany({
          where: {id: emailId, sentAt: null},
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            messageId: result.messageId,
          },
        });

        // Zero rows means another run already stamped this email -- SES accepted the
        // message, then the job was retried. Everything below sends a second signal
        // for one delivery (a duplicate `email.sent` re-triggers workflows), so stop
        // here rather than replaying it. Finalization still runs: this email is
        // terminal either way, and the campaign must not be left stuck in SENDING.
        if (marked.count === 0) {
          signale.warn(`[EMAIL-PROCESSOR] Email ${emailId} was already marked sent, skipping duplicate side effects`);

          if (email.campaignId) {
            await CampaignService.finalizeIfDone(email.campaignId);
          }

          return;
        }

        if (email.campaignId) {
          await CampaignService.countCampaignSent(email.campaignId);
        }

        // Record usage for billing (pay-per-email)
        // Uses email ID as idempotency key to prevent double-charging on retries
        // Charge 2 emails if attachments are present
        if (email.project.customer) {
          const hasAttachments = email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0;
          const emailCount = hasAttachments ? 2 : 1;
          await MeterService.recordEmailSent(email.project.customer, emailCount, `email_${emailId}`);
        }

        // Track event (this will trigger workflows)
        await EventService.trackEvent(email.projectId, 'email.sent', email.contactId, email.id, {
          subject: formattedEmail.subject,
          from: email.from,
          fromName: email.fromName,
          messageId: result.messageId,
          emailId: email.id,
          templateId: email.templateId,
          campaignId: email.campaignId,
          sourceType: email.sourceType,
          sentAt: new Date().toISOString(),
        });

        if (email.campaignId) {
          await CampaignService.finalizeIfDone(email.campaignId);
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
      concurrency,
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

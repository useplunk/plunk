/**
 * Background Job: Email Processor
 * Processes individual emails from the queue (for all sources: transactional, campaign, workflow)
 *
 * This is the only send path. `EmailService.sendEmail` used to hold a second copy of it, tested
 * while this one was not, and the two had drifted; it has been removed. The behaviour those tests
 * claimed to cover -- PENDING → SENDING → SENT, the failure transition, send idempotency, and
 * attachments reaching SES -- is implemented here. Integration tests exercise it through real
 * queue jobs; keep new assertions on this path rather than reviving a second send implementation.
 */

import {EmailStatus} from '@plunk/db';
import type {SendEmailJobData} from '@plunk/types';
import {type Job, UnrecoverableError, Worker} from 'bullmq';
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

function isExplicitlyRetryableSesFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const {name, $metadata} = error as {
    name?: string;
    $metadata?: {httpStatusCode?: number};
  };
  const status = $metadata?.httpStatusCode;

  // A signed SES error response establishes that SES rejected this attempt.
  // Transport errors without a response are ambiguous and must not be retried,
  // because SES may have accepted the message before the connection failed.
  return (
    status === 429 ||
    (status !== undefined && status >= 500) ||
    name === 'Throttling' ||
    name === 'ThrottlingException' ||
    name === 'TooManyRequestsException'
  );
}

type SesAcceptance = {messageId: string; sentAt: Date};

async function checkpointSesAcceptance(job: Job<SendEmailJobData>, accepted: SesAcceptance): Promise<boolean> {
  try {
    await job.updateData({
      ...job.data,
      acceptedBySes: {
        messageId: accepted.messageId,
        sentAt: accepted.sentAt.toISOString(),
      },
    });
    return true;
  } catch (error) {
    signale.error(`[EMAIL-PROCESSOR] Failed to checkpoint SES acceptance for ${job.data.emailId}:`, error);
    return false;
  }
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
          campaign: {select: {type: true}},
        },
      });

      if (!email) {
        throw new Error(`Email ${emailId} not found`);
      }

      const recoveredAcceptance = job.data.acceptedBySes
        ? {
            messageId: job.data.acceptedBySes.messageId,
            sentAt: new Date(job.data.acceptedBySes.sentAt),
          }
        : undefined;

      if (email.status === EmailStatus.SENDING && !recoveredAcceptance) {
        const message = 'Previous attempt ended without an SES acceptance checkpoint; not retried to avoid a duplicate';
        await prisma.email.update({
          where: {id: emailId},
          data: {status: EmailStatus.FAILED, error: message},
        });
        throw new UnrecoverableError(message);
      }

      if (email.status !== EmailStatus.PENDING && !(email.status === EmailStatus.SENDING && recoveredAcceptance)) {
        return;
      }

      // Check if project is disabled
      if (email.project.disabled && !recoveredAcceptance) {
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

      let acceptedBySes: SesAcceptance | undefined = recoveredAcceptance;
      let acceptedPersisted = email.sentAt !== null;
      let acceptanceCheckpointed = recoveredAcceptance !== undefined;
      let sesSubmissionStarted = false;

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

        if (!acceptedBySes) {
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

            throw new UnrecoverableError(`Project ${email.projectId} has been disabled due to a policy violation`);
          }

          // Send via AWS SES, then checkpoint acceptance in Redis before any
          // database work. If Postgres is unavailable, the retry can finalize
          // this exact message without submitting it again.
          sesSubmissionStarted = true;
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
            headers: outboundHeaders,
            tracking: shouldTrack,
            attachments: email.attachments as {filename: string; content: string; contentType: string}[] | null,
          });
          acceptedBySes = {messageId: result.messageId, sentAt: new Date()};
          acceptanceCheckpointed = await checkpointSesAcceptance(job, acceptedBySes);
        }

        // Mark as sent with SES message ID.
        //
        // Guarded on `sentAt` still being null so the campaign counter below is only
        // incremented by the run that actually stamped it. A job retried after SES
        // accepted the message would otherwise count the same email twice.
        const marked = await prisma.email.updateMany({
          where: {id: emailId, sentAt: null},
          data: {
            status: EmailStatus.SENT,
            sentAt: acceptedBySes.sentAt,
            messageId: acceptedBySes.messageId,
            error: null,
          },
        });
        acceptedPersisted = true;

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
          messageId: acceptedBySes.messageId,
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

        if (acceptedBySes) {
          const message = error instanceof Error ? error.message : 'Unknown error';

          // SES accepted the message, so another attempt must never submit it
          // again. Best-effort persistence keeps the delivery truthful even when
          // a later billing/event/finalization step failed.
          try {
            await prisma.email.update({
              where: {id: emailId},
              data: {
                status: EmailStatus.SENT,
                sentAt: acceptedBySes.sentAt,
                messageId: acceptedBySes.messageId,
                error: `Post-send processing failed: ${message}`,
              },
            });
            acceptedPersisted = true;

            if (email.campaignId) {
              await CampaignService.finalizeIfDone(email.campaignId);
            }
          } catch (persistenceError) {
            signale.error(`[EMAIL-PROCESSOR] Failed to persist accepted SES message ${emailId}:`, persistenceError);
          }

          if (!acceptedPersisted && !acceptanceCheckpointed) {
            acceptanceCheckpointed = await checkpointSesAcceptance(job, acceptedBySes);
          }

          if (!acceptedPersisted) {
            // A checkpointed retry finalizes the known SES message. Without one,
            // the retry turns the stranded SENDING row into an explicit FAILED
            // state rather than silently completing or risking a second send.
            throw error;
          }

          throw new UnrecoverableError(`SES accepted email ${emailId}, but post-send processing failed: ${message}`);
        }

        const configuredAttempts = Math.max(1, job.opts.attempts ?? 1);
        const attemptsExhausted = job.attemptsMade + 1 >= configuredAttempts;
        const hasAmbiguousSesOutcome =
          sesSubmissionStarted && !acceptedBySes && !isExplicitlyRetryableSesFailure(error);
        const isTerminal = error instanceof UnrecoverableError || attemptsExhausted || hasAmbiguousSesOutcome;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const persistedError = hasAmbiguousSesOutcome
          ? `SES outcome is unknown; not retried to avoid a duplicate: ${errorMessage}`
          : errorMessage;

        // Keep retryable failures eligible for the next BullMQ attempt. The
        // worker's entry guard only processes PENDING rows, so writing FAILED
        // before attempts are exhausted silently turns the retry into a no-op.
        await prisma.email.update({
          where: {id: emailId},
          data: {
            status: isTerminal ? EmailStatus.FAILED : EmailStatus.PENDING,
            error: persistedError,
          },
        });

        if (hasAmbiguousSesOutcome) {
          throw new UnrecoverableError(persistedError);
        }

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

import {randomUUID} from 'node:crypto';

import {Controller, Post} from '@overnightjs/core';
import type {Prisma} from '@plunk/db';
import {EmailSourceType, EmailStatus} from '@plunk/db';
import {toPrismaJson} from '@plunk/types';
import type {Request, Response} from 'express';
import {simpleParser} from 'mailparser';
import sanitizeHtml from 'sanitize-html';
import signale from 'signale';
import type Stripe from 'stripe';

import {ProjectDisabledPaymentEmail, sendPlatformEmail} from '@plunk/email';
import React from 'react';

import {DASHBOARD_URI, LANDING_URI, STRIPE_ENABLED, STRIPE_WEBHOOK_SECRET} from '../app/constants.js';
import {stripe} from '../app/stripe.js';
import {prisma} from '../database/prisma.js';
import {BillingLimitService} from '../services/BillingLimitService.js';
import {CampaignService} from '../services/CampaignService.js';
import {ContactService} from '../services/ContactService.js';
import {EventService} from '../services/EventService.js';
import {MembershipService} from '../services/MembershipService.js';
import {MeterService} from '../services/MeterService.js';
import {NtfyService} from '../services/NtfyService.js';
import {QueueService} from '../services/QueueService.js';
import {SecurityService} from '../services/SecurityService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

const SNS_CLAIM_LEASE_MS = 5 * 60 * 1000;
const SNS_CLAIM_HEARTBEAT_MS = 60 * 1000;
const SNS_CLAIM_ATTEMPTS = 3;
const SNS_RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ActiveSnsClaim = {
  messageId: string;
  processingToken: string;
};

type SnsReceiptClient = Pick<Prisma.TransactionClient, 'snsWebhookReceipt'>;

type SnsClaimResult =
  | {outcome: 'claimed'; claim: ActiveSnsClaim}
  | {outcome: 'completed'}
  | {outcome: 'in-flight'};

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2002';
}

/**
 * Claim a signed SNS MessageId before applying its side effects.
 *
 * The unique index decides concurrent races. Completed deliveries are safe to
 * acknowledge, active deliveries receive a retryable response, and failed or
 * abandoned deliveries are reclaimed with a compare-and-swap update.
 */
async function claimSnsNotification(messageId: string): Promise<SnsClaimResult> {
  for (let attempt = 0; attempt < SNS_CLAIM_ATTEMPTS; attempt++) {
    const processingToken = randomUUID();
    const processingStartedAt = new Date();

    try {
      await prisma.snsWebhookReceipt.create({
        data: {
          messageId,
          processingToken,
          processingStartedAt,
          expiresAt: new Date(processingStartedAt.getTime() + SNS_RECEIPT_TTL_MS),
        },
      });
      return {outcome: 'claimed', claim: {messageId, processingToken}};
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const existing = await prisma.snsWebhookReceipt.findUnique({
      where: {messageId},
      select: {status: true, processingToken: true, processingStartedAt: true},
    });

    // The prior row may have been released between the unique conflict and read.
    if (!existing) {
      continue;
    }

    if (existing.status === 'COMPLETED') {
      return {outcome: 'completed'};
    }

    const leaseCutoff = Date.now() - SNS_CLAIM_LEASE_MS;
    if (existing.status === 'PROCESSING' && existing.processingStartedAt.getTime() > leaseCutoff) {
      return {outcome: 'in-flight'};
    }

    const reclaimed = await prisma.snsWebhookReceipt.updateMany({
      where: {
        messageId,
        status: existing.status,
        processingToken: existing.processingToken,
        processingStartedAt: existing.processingStartedAt,
      },
      data: {
        status: 'PROCESSING',
        processingToken,
        processingStartedAt,
        completedAt: null,
      },
    });

    if (reclaimed.count === 1) {
      return {outcome: 'claimed', claim: {messageId, processingToken}};
    }
  }

  // Repeated claim races are transient. Do not acknowledge until one delivery
  // has durably recorded completion.
  return {outcome: 'in-flight'};
}

async function completeSnsNotification(
  claim: ActiveSnsClaim,
  client: SnsReceiptClient = prisma,
): Promise<void> {
  const completed = await client.snsWebhookReceipt.updateMany({
    where: {
      messageId: claim.messageId,
      processingToken: claim.processingToken,
      status: 'PROCESSING',
    },
    data: {status: 'COMPLETED', completedAt: new Date()},
  });

  if (completed.count !== 1) {
    throw new Error(`SNS claim ${claim.messageId} could not be completed`);
  }
}

async function failSnsNotification(claim: ActiveSnsClaim): Promise<void> {
  const failed = await prisma.snsWebhookReceipt.updateMany({
    where: {
      messageId: claim.messageId,
      processingToken: claim.processingToken,
      status: 'PROCESSING',
    },
    data: {status: 'FAILED'},
  });

  if (failed.count !== 1) {
    signale.warn(`[WEBHOOK] SNS claim ${claim.messageId} was no longer active while recording failure`);
  }
}

function startSnsClaimHeartbeat(claim: ActiveSnsClaim): () => void {
  const timer = setInterval(() => {
    void prisma.snsWebhookReceipt
      .updateMany({
        where: {
          messageId: claim.messageId,
          processingToken: claim.processingToken,
          status: 'PROCESSING',
        },
        data: {processingStartedAt: new Date()},
      })
      .then(renewed => {
        if (renewed.count !== 1) {
          signale.warn(`[WEBHOOK] SNS claim ${claim.messageId} was no longer active during heartbeat`);
        }
      })
      .catch(error => {
        signale.error(`[WEBHOOK] Failed to renew SNS claim ${claim.messageId}:`, error);
      });
  }, SNS_CLAIM_HEARTBEAT_MS);

  timer.unref();
  return () => clearInterval(timer);
}

/**
 * Webhooks Controller
 * Handles incoming webhooks from external services (AWS SNS/SES)
 */
@Controller('webhooks')
export class Webhooks {
  /**
   * Receive SNS webhook notifications from AWS SES
   * Handles outbound email events: delivery, open, click, bounce, complaint
   * Handles inbound email notifications: received emails via SES receiving
   */
  @Post('sns')
  @CatchAsync
  public async receiveSNSWebhook(req: Request, res: Response) {
    let activeSnsClaim: ActiveSnsClaim | undefined;
    let stopSnsClaimHeartbeat: (() => void) | undefined;

    const completeActiveClaim = async () => {
      if (!activeSnsClaim) return;

      await completeSnsNotification(activeSnsClaim);
      activeSnsClaim = undefined;
    };

    try {
      // Verify SNS message signature before processing anything
      const signatureValid = await SecurityService.verifySnsSignature(req.body as Record<string, string>);
      if (!signatureValid) {
        // Error level, not warn: this is indistinguishable from a working install right up
        // until someone notices that no engagement has been recorded for days. Every event
        // for every project drops here, and nothing else in the system counts the misses.
        signale.error('[WEBHOOK] SNS signature verification failed — request rejected. All SES events are being dropped.');
        return res.status(403).json({success: false, message: 'Invalid SNS signature'});
      }

      // Handle SNS subscription confirmation FIRST (before parsing Message field)
      if (req.body.Type === 'SubscriptionConfirmation') {
        signale.info('SNS Subscription Confirmation received');

        // Validate SubscribeURL to prevent SSRF: must be HTTPS and from an official AWS SNS host.
        // Legitimate URLs look like:
        //   https://sns.<region>.amazonaws.com/?Action=ConfirmSubscription&...
        const subscribeURL: unknown = req.body.SubscribeURL;
        if (typeof subscribeURL !== 'string') {
          signale.warn('SNS SubscriptionConfirmation missing SubscribeURL');
          return res.status(400).json({success: false, message: 'Invalid SubscribeURL'});
        }

        let parsedURL: URL;
        try {
          parsedURL = new URL(subscribeURL);
        } catch {
          signale.warn('SNS SubscriptionConfirmation has unparseable SubscribeURL');
          return res.status(400).json({success: false, message: 'Invalid SubscribeURL'});
        }

        // Only allow HTTPS requests to official AWS SNS endpoints.
        // The hostname must be exactly sns.<region>.amazonaws.com or sns.<region>.amazonaws.eu
        const SNS_HOST_RE = /^sns\.[a-z0-9-]+\.amazonaws\.(com|eu)$/;
        if (parsedURL.protocol !== 'https:' || !SNS_HOST_RE.test(parsedURL.hostname)) {
          signale.warn(`SNS SubscriptionConfirmation rejected — disallowed SubscribeURL host: ${parsedURL.hostname}`);
          return res.status(400).json({success: false, message: 'Invalid SubscribeURL'});
        }

        // Automatically confirm the subscription
        try {
          const confirmResponse = await fetch(subscribeURL);
          if (confirmResponse.ok) {
            signale.success('SNS subscription confirmed successfully');
            return res.status(200).json({
              success: true,
              message: 'Subscription confirmed',
            });
          } else {
            signale.error('Failed to confirm SNS subscription:', confirmResponse.statusText);
            return res.status(502).json({
              success: false,
              message: 'Failed to confirm subscription',
            });
          }
        } catch (confirmError) {
          signale.error('Error confirming SNS subscription:', confirmError);
          return res.status(502).json({
            success: false,
            message: 'Error confirming subscription',
          });
        }
      }

      // Handle SNS notification messages - parse the Message field
      if (req.body.Type !== 'Notification') {
        signale.warn('[WEBHOOK] Unknown SNS message type:', req.body.Type);
        return res.status(200).json({success: false, message: 'Unknown message type'});
      }

      const snsMessageId: unknown = req.body.MessageId;
      if (typeof snsMessageId !== 'string' || snsMessageId.length === 0) {
        signale.warn('[WEBHOOK] SNS notification missing MessageId');
        return res.status(400).json({success: false, message: 'Missing SNS MessageId'});
      }

      // Parse the nested SES event from the Message field
      const body = JSON.parse(req.body.Message);

      const claimResult = await claimSnsNotification(snsMessageId);
      if (claimResult.outcome === 'completed') {
        return res.status(200).json({success: true, duplicate: true});
      }
      if (claimResult.outcome === 'in-flight') {
        return res.status(503).json({success: false, message: 'SNS notification is already being processed'});
      }
      activeSnsClaim = claimResult.claim;
      stopSnsClaimHeartbeat = startSnsClaimHeartbeat(activeSnsClaim);

      // Check if this is an inbound email notification (SES Receiving)
      if (body.notificationType === 'Received') {
        signale.info('[WEBHOOK] Received inbound email notification from SES');

        try {
          const recipients = body.receipt?.recipients || [];

          if (recipients.length === 0) {
            signale.warn('[WEBHOOK] No recipients found in inbound email');
            await completeActiveClaim();
            return res.status(200).json({success: true, message: 'No recipients found'});
          }

          const senderEmail = body.mail?.source;
          if (typeof senderEmail !== 'string' || senderEmail.length === 0) {
            throw new Error('Inbound SNS notification is missing mail.source');
          }
          const normalizedSender = ContactService.normalizeEmail(senderEmail);
          const senderFromHeader = body.mail?.commonHeaders?.from?.[0] || senderEmail;
          let htmlBody: string | undefined;

          if (body.content && typeof body.content === 'string') {
            try {
              const isBase64 = body.receipt?.action?.encoding === 'BASE64';
              const emailBuffer = isBase64 ? Buffer.from(body.content, 'base64') : Buffer.from(body.content);
              const parsed = await simpleParser(emailBuffer);
              const raw =
                (parsed.html ? String(parsed.html) : undefined) ?? parsed.textAsHtml ?? parsed.text ?? undefined;

              if (raw) {
                htmlBody = sanitizeHtml(raw, {
                  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
                  allowedAttributes: {
                    ...sanitizeHtml.defaults.allowedAttributes,
                    img: ['src', 'alt', 'width', 'height'],
                    '*': ['style'],
                  },
                  allowedSchemes: ['http', 'https', 'mailto'],
                });
              }
            } catch (parseError) {
              signale.error('[WEBHOOK] Failed to parse email content:', parseError);
            }
          }

          const targets: Array<{
            recipientEmail: string;
            project: {id: string; name: string; customer: string | null};
          }> = [];

          for (const recipient of recipients) {
            const recipientEmail = recipient as string;
            const domain = recipientEmail.split('@')[1];

            if (!domain) {
              signale.warn('[WEBHOOK] Invalid recipient email format:', recipientEmail);
              continue;
            }

            // Find ALL projects that have this domain verified
            // A domain can be shared across multiple projects if users are members of both
            const domainRecords = await prisma.domain.findMany({
              where: {
                domain,
                verified: true, // Only process emails for verified domains
              },
              include: {
                project: true,
              },
            });

            if (domainRecords.length === 0) {
              signale.info(`[WEBHOOK] No verified domain found for: ${domain}`);
              continue;
            }

            for (const domainRecord of domainRecords) {
              signale.info(`[WEBHOOK] Processing inbound email for project: ${domainRecord.project.name}`);
              const limitCheck = await BillingLimitService.checkLimit(domainRecord.projectId, EmailSourceType.INBOUND);

              if (!limitCheck.allowed) {
                signale.warn(
                  `[WEBHOOK] Inbound email blocked for project ${domainRecord.project.name}: ${limitCheck.message}`,
                );
                continue;
              }

              targets.push({recipientEmail, project: domainRecord.project});
            }
          }

          const claim = activeSnsClaim;
          if (!claim) {
            throw new Error(`SNS notification ${snsMessageId} lost its processing claim`);
          }

          const committed = await prisma.$transaction(async tx => {
            const effects: Array<{
              emailId: string;
              eventIds: string[];
              project: {id: string; name: string; customer: string | null};
              recipientEmail: string;
            }> = [];

            for (const target of targets) {
              const existingContact = await tx.contact.findUnique({
                where: {projectId_email: {projectId: target.project.id, email: normalizedSender}},
              });
              const contact = existingContact
                ? await tx.contact.update({
                    where: {id: existingContact.id},
                    data: {subscribed: true},
                  })
                : await tx.contact.create({
                    data: {projectId: target.project.id, email: normalizedSender, subscribed: true},
                  });
              const eventIds: string[] = [];

              if (existingContact && !existingContact.subscribed) {
                const subscribedEvent = await tx.event.create({
                  data: {
                    projectId: target.project.id,
                    contactId: contact.id,
                    name: 'contact.subscribed',
                  },
                });
                eventIds.push(subscribedEvent.id);
              }

              const inboundEmail = await tx.email.create({
                data: {
                  projectId: target.project.id,
                  contactId: contact.id,
                  subject: body.mail?.commonHeaders?.subject || '(No subject)',
                  body: htmlBody || '',
                  from: target.recipientEmail,
                  sourceType: EmailSourceType.INBOUND,
                  status: EmailStatus.RECEIVED,
                  deliveredAt: new Date(body.mail?.timestamp || new Date()),
                },
              });
              const eventData = {
                messageId: body.mail?.messageId,
                from: senderEmail,
                fromHeader: senderFromHeader,
                to: target.recipientEmail,
                subject: body.mail?.commonHeaders?.subject,
                timestamp: body.mail?.timestamp,
                recipients: body.receipt?.recipients,
                hasContent: !!body.content,
                body: htmlBody,
                spamVerdict: body.receipt?.spamVerdict?.status,
                virusVerdict: body.receipt?.virusVerdict?.status,
                spfVerdict: body.receipt?.spfVerdict?.status,
                dkimVerdict: body.receipt?.dkimVerdict?.status,
                dmarcVerdict: body.receipt?.dmarcVerdict?.status,
                processingTimeMillis: body.receipt?.processingTimeMillis,
              };
              const receivedEvent = await tx.event.create({
                data: {
                  projectId: target.project.id,
                  contactId: contact.id,
                  emailId: inboundEmail.id,
                  name: 'email.received',
                  data: toPrismaJson(eventData),
                },
              });
              eventIds.push(receivedEvent.id);
              effects.push({
                emailId: inboundEmail.id,
                eventIds,
                project: target.project,
                recipientEmail: target.recipientEmail,
              });
            }

            await completeSnsNotification(claim, tx);
            return effects;
          });
          activeSnsClaim = undefined;

          for (const effect of committed) {
            await BillingLimitService.incrementUsage(effect.project.id, EmailSourceType.INBOUND);
            if (effect.project.customer) {
              await MeterService.recordEmailSent(effect.project.customer, 1, `email_${effect.emailId}`);
            }
            for (const eventId of effect.eventIds) {
              try {
                await EventService.dispatchStoredEvent(eventId);
              } catch (dispatchError) {
                signale.error(`[WEBHOOK] Deferred workflow dispatch for event ${eventId}:`, dispatchError);
              }
            }
            signale.success(
              `[WEBHOOK] Created email.received event for ${senderEmail} → ${effect.recipientEmail} (project: ${effect.project.name})`,
            );
          }

          return res.status(200).json({success: true, message: 'Inbound email processed'});
        } catch (inboundError) {
          signale.error('[WEBHOOK] Error processing inbound email:', inboundError);
          throw inboundError;
        }
      }

      // Handle outbound email event notifications (existing logic)
      const eventType = body.eventType as 'Bounce' | 'Delivery' | 'Open' | 'Complaint' | 'Click';
      const messageId = body.mail?.messageId;

      if (!messageId) {
        signale.warn('[WEBHOOK] No messageId found in SNS notification');
        await completeActiveClaim();
        return res.status(400).json({success: false, error: 'No messageId found'});
      }

      // Look up email by SES messageId
      const email = await prisma.email.findUnique({
        where: {messageId},
        include: {
          contact: true,
          project: true,
        },
      });

      if (!email) {
        // Error level for the same reason as a signature failure: an event that matches no
        // email row is silently lost. A run of these means the send path is not stamping
        // `messageId`, which is invisible from outside.
        signale.error(`[WEBHOOK] ${eventType} event has no email for messageId: ${messageId}`);
        // SES can publish before the sender has persisted its returned messageId.
        // Keep the receipt retryable so that race cannot permanently lose the event.
        throw new Error(`Email not found for messageId: ${messageId}`);
      }

      const now = new Date();
      const updateData: Prisma.EmailUpdateInput = {};
      const eventName = `email.${eventType.toLowerCase()}`;
      let unsubscribeContact = false;
      let bounceNotification = false;
      let bounceNotificationType: string | undefined;
      let complaintNotification = false;
      let enforceSecurityLimits = false;

      // Base event data with email metadata
      const baseEventData = {
        subject: email.subject,
        from: email.from,
        fromName: email.fromName,
        messageId: email.messageId,
        emailId: email.id,
        templateId: email.templateId,
        campaignId: email.campaignId,
        sourceType: email.sourceType,
      };
      let eventData: Record<string, unknown> = baseEventData;

      // Process event based on type
      switch (eventType) {
        case 'Delivery':
          signale.success(`[WEBHOOK] Delivery confirmed for ${email.contact.email} from ${email.project.name}`);
          updateData.status = EmailStatus.DELIVERED;
          updateData.deliveredAt = now;
          eventData = {
            ...baseEventData,
            deliveredAt: now.toISOString(),
          };
          break;

        case 'Open':
          signale.success(`[WEBHOOK] Open received for ${email.contact.email} from ${email.project.name}`);
          // Only set openedAt on first open
          if (!email.openedAt) {
            updateData.openedAt = now;
          }
          updateData.opens = {increment: 1};
          updateData.status = EmailStatus.OPENED;
          break;

        case 'Click': {
          signale.success(`[WEBHOOK] Click received for ${email.contact.email} from ${email.project.name}`);
          const clickedLink = body.click?.link;
          // Only set clickedAt on first click
          if (!email.clickedAt) {
            updateData.clickedAt = now;
          }
          updateData.clicks = {increment: 1};
          updateData.status = EmailStatus.CLICKED;
          eventData = {
            ...baseEventData,
            link: clickedLink,
          };
          break;
        }

        case 'Bounce': {
          const bounceType = body.bounce?.bounceType;
          const isPermanentBounce = bounceType === 'Permanent';
          const isTransientBounce = bounceType === 'Transient';

          if (isPermanentBounce) {
            // Hard bounce - counts toward bounce rate and unsubscribes contact
            signale.warn(`[WEBHOOK] Permanent bounce received for ${email.contact.email} from ${email.project.name}`);
            updateData.status = EmailStatus.BOUNCED;
            updateData.bouncedAt = now;
            unsubscribeContact = true;
            bounceNotification = true;
            bounceNotificationType = bounceType;
            enforceSecurityLimits = true;
            eventData = {
              ...baseEventData,
              bounceType,
              bouncedAt: now.toISOString(),
            };
          } else if (isTransientBounce) {
            // Soft bounce (e.g., out-of-office, mailbox full) - don't count toward bounce rate
            signale.info(
              `[WEBHOOK] Transient bounce received for ${email.contact.email} from ${email.project.name} (not counted toward bounce rate)`,
            );
            // Don't update email status or unsubscribe contact
            // Just track the event for visibility
            eventData = {
              ...baseEventData,
              bounceType,
              transientBounce: true,
            };
          } else {
            // Unknown bounce type - treat as permanent to be safe
            signale.warn(
              `[WEBHOOK] Unknown bounce type (${bounceType}) received for ${email.contact.email} from ${email.project.name} - treating as permanent`,
            );
            updateData.status = EmailStatus.BOUNCED;
            updateData.bouncedAt = now;
            unsubscribeContact = true;
            bounceNotification = true;
            bounceNotificationType = bounceType;
            eventData = {
              ...baseEventData,
              bounceType,
              bouncedAt: now.toISOString(),
            };
          }
          break;
        }

        case 'Complaint':
          signale.warn(`[WEBHOOK] Complaint received for ${email.contact.email} from ${email.project.name}`);
          updateData.status = EmailStatus.COMPLAINED;
          updateData.complainedAt = now;
          unsubscribeContact = true;
          complaintNotification = true;
          enforceSecurityLimits = true;
          eventData = {
            ...baseEventData,
            complainedAt: now.toISOString(),
          };
          break;

        default:
          signale.warn(`[WEBHOOK] Unknown event type: ${eventType}`);
          await completeActiveClaim();
          return res.status(200).json({success: true});
      }

      const claim = activeSnsClaim;
      if (!claim) {
        throw new Error(`SNS notification ${snsMessageId} lost its processing claim`);
      }

      // The business mutation, durable event, and receipt completion share one
      // commit. A database failure therefore leaves no partial effects for the
      // SNS retry to duplicate.
      const storedEvent = await prisma.$transaction(async tx => {
        if (unsubscribeContact) {
          await tx.contact.update({
            where: {id: email.contactId},
            data: {subscribed: false},
          });
        }

        const updatedEmail = await tx.email.update({
          where: {id: email.id},
          data: updateData,
        });

        if (eventType === 'Open') {
          eventData = {
            ...baseEventData,
            openedAt: updatedEmail.openedAt?.toISOString(),
            opens: updatedEmail.opens,
            isFirstOpen: !email.openedAt,
          };
        } else if (eventType === 'Click') {
          eventData = {
            ...eventData,
            clickedAt: updatedEmail.clickedAt?.toISOString(),
            clicks: updatedEmail.clicks,
            isFirstClick: !email.clickedAt,
          };
        }

        const event = await tx.event.create({
          data: {
            projectId: email.projectId,
            contactId: email.contactId,
            emailId: email.id,
            name: eventName,
            data: toPrismaJson(eventData),
          },
        });
        await completeSnsNotification(claim, tx);
        return event;
      });
      activeSnsClaim = undefined;

      // The campaign counters the stats endpoint reads live on the campaign row, and this
      // event has just moved one of them. They are not incremented from here: this handler
      // runs once per recipient per event, so a write per event would serialize thousands of
      // updates on a single row -- the same reason `sentCount` is not incremented in the send
      // path either. Marking the campaign costs one Redis SADD, and the sweep recounts it.
      if (email.campaignId) {
        await CampaignService.markStatsDirty(email.campaignId);
      }

      if (bounceNotification) {
        try {
          await NtfyService.notifyEmailBounce(
            email.project.name,
            email.projectId,
            email.contact.email,
            bounceNotificationType,
          );
        } catch (notificationError) {
          signale.error('[WEBHOOK] Failed to notify about email bounce:', notificationError);
        }
      } else if (complaintNotification) {
        await NtfyService.notifyEmailComplaint(email.project.name, email.projectId, email.contact.email);
      }

      try {
        await EventService.dispatchStoredEvent(storedEvent.id);
      } catch (dispatchError) {
        // The event row is the outbox. The maintenance worker can retry a null
        // processedAt without asking SNS to replay committed email effects.
        signale.error(`[WEBHOOK] Deferred workflow dispatch for event ${storedEvent.id}:`, dispatchError);
      }

      if (enforceSecurityLimits) {
        await SecurityService.checkAndEnforceSecurityLimits(email.projectId);
      }

      signale.success(`[WEBHOOK] Processed ${eventType} event for email ${email.id}`);
      return res.status(200).json({success: true});
    } catch (error) {
      signale.error('[WEBHOOK] Error processing SNS webhook:', error);
      if (activeSnsClaim) {
        try {
          await failSnsNotification(activeSnsClaim);
        } catch (settleError) {
          // The processing lease is the fallback if the database is unavailable
          // while recording failure. The delivery still receives 5xx and retries.
          signale.error(`[WEBHOOK] Failed to release SNS claim ${activeSnsClaim.messageId}:`, settleError);
        }
      }
      return res.status(500).json({success: false, message: 'Failed to process SNS notification'});
    } finally {
      stopSnsClaimHeartbeat?.();
    }
  }

  /**
   * Receive Stripe webhook notifications
   * Handles subscription and payment events: checkout.session.completed, invoice.paid, etc.
   */
  @Post('incoming/stripe')
  @CatchAsync
  public async receiveStripeWebhook(req: Request, res: Response) {
    // Return 404 if billing is disabled
    if (!STRIPE_ENABLED || !stripe) {
      signale.warn('[WEBHOOK] Stripe webhook received but billing is disabled');
      return res.status(404).json({success: false, error: 'Billing is disabled'});
    }

    try {
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        signale.warn('[WEBHOOK] Missing Stripe signature header');
        return res.status(400).json({success: false, error: 'Missing signature'});
      }

      // Verify webhook signature using raw body
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        signale.error('[WEBHOOK] Stripe signature verification failed:', err);
        return res.status(400).json({success: false, error: 'Invalid signature'});
      }

      signale.info(`[WEBHOOK] Received Stripe event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          const projectId = session.client_reference_id; // Assuming project ID is passed as reference

          if (!projectId) {
            signale.warn('[WEBHOOK] No client_reference_id in checkout session');
            break;
          }

          // Update project with customer and subscription IDs. PENDING until the off-session
          // charge returns a verdict; the project is usable in the meantime, which is a few
          // seconds of exposure against a signal that otherwise takes a month to arrive.
          const updatedProject = await prisma.project.update({
            where: {id: projectId},
            data: {
              customer: customerId,
              subscription: subscriptionId,
              cardVerification: 'PENDING',
              cardVerificationAt: new Date(),
              cardVerificationSession: session.id,
            },
          });

          await stripe.customers.update(customerId, {name: updatedProject.name});

          const promoField = session.custom_fields?.find((f) => f.key === 'promo_code');
          const promoCode = promoField?.text?.value?.trim().toUpperCase();
          if (promoCode && promoCode !== 'SWITCH') {
            signale.info(`[WEBHOOK] Unknown promo code "${promoCode}" entered for project ${projectId}`);
          }

          // Verify the card accepts a merchant-initiated charge before trusting it with a
          // month of usage. Queued rather than inline: confirming a PaymentIntent can outlast
          // Stripe's webhook timeout, and a timeout means a redelivery — and a second charge.
          // Credit for the onboarding fee is applied by the job, once the outcome is known.
          await QueueService.queueCardVerification({
            projectId,
            customerId,
            currency: session.currency ?? 'eur',
            sessionId: session.id,
            ...(promoCode && {promoCode}),
          });

          signale.success(`[WEBHOOK] Checkout completed for project ${projectId}, card verification queued`);

          // Send notification about subscription started
          await NtfyService.notifySubscriptionStarted(updatedProject.name, projectId, subscriptionId);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object;
          const customerId = invoice.customer as string;

          // Find project by customer ID
          const project = await prisma.project.findUnique({
            where: {customer: customerId},
          });

          if (!project) {
            signale.warn(`[WEBHOOK] No project found for customer ${customerId}`);
            break;
          }

          signale.success(`[WEBHOOK] Invoice paid for project ${project.name} (${project.id})`);

          // Re-enable the project only if it was previously disabled for a failed payment.
          // Projects disabled for other reasons (reputation, phishing, manual) must stay disabled.
          if (project.disabled && project.disabledReason === 'PAYMENT_FAILED') {
            await prisma.project.update({
              where: {id: project.id},
              data: {disabled: false, disabledReason: null},
            });
            signale.success(`[WEBHOOK] Project ${project.name} (${project.id}) re-enabled after payment`);
          }

          // Send notification about invoice payment
          await NtfyService.notifyInvoicePaid(project.name, project.id);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer as string;

          // Only disable projects that are already consuming (recurring billing).
          // If billing_reason is 'subscription_create', this is a first-time payment
          // attempt and the project has never had an active subscription — don't disable.
          if (invoice.billing_reason === 'subscription_create') {
            signale.info(
              `[WEBHOOK] Payment failed on initial subscription attempt for customer ${customerId}, skipping disable`,
            );
            break;
          }

          // Find project by customer ID
          const project = await prisma.project.findUnique({
            where: {customer: customerId},
          });

          if (!project) {
            signale.warn(`[WEBHOOK] No project found for customer ${customerId}`);
            break;
          }

          signale.warn(`[WEBHOOK] Payment failed for project ${project.name} (${project.id}), disabling project`);

          await prisma.project.update({
            where: {id: project.id},
            data: {disabled: true, disabledReason: 'PAYMENT_FAILED'},
          });

          await NtfyService.notifyProjectDisabledForPayment(project.name, project.id);

          // Send email notification to project members
          try {
            const members = await MembershipService.getMembers(project.id);
            const emails = members.map(m => m.email);
            if (emails.length > 0) {
              const template = React.createElement(ProjectDisabledPaymentEmail, {
                projectName: project.name,
                projectId: project.id,
                dashboardUrl: DASHBOARD_URI,
                landingUrl: LANDING_URI,
              });
              await Promise.all(
                emails.map(email => sendPlatformEmail(email, 'Project Disabled - Payment Failed', template)),
              );
            }
          } catch (emailError) {
            signale.error(`[WEBHOOK] Failed to send project disabled email:`, emailError);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const subscriptionId = subscription.id;

          // Find project by subscription ID
          const project = await prisma.project.findUnique({
            where: {subscription: subscriptionId},
          });

          if (!project) {
            signale.warn(`[WEBHOOK] No project found for subscription ${subscriptionId}`);
            break;
          }

          // Clear subscription from project
          await prisma.project.update({
            where: {id: project.id},
            data: {
              subscription: null,
            },
          });

          signale.warn(`[WEBHOOK] Subscription deleted for project ${project.name} (${project.id})`);

          // Send notification about subscription cancellation
          await NtfyService.notifySubscriptionCancelled(project.name, project.id, subscriptionId);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const subscriptionId = subscription.id;

          // Find project by subscription ID
          const project = await prisma.project.findUnique({
            where: {subscription: subscriptionId},
          });

          if (!project) {
            signale.warn(`[WEBHOOK] No project found for subscription ${subscriptionId}`);
            break;
          }

          signale.info(`[WEBHOOK] Subscription updated for project ${project.name} (${project.id})`);
          signale.info(
            `[WEBHOOK] Status: ${subscription.status}, Cancel at period end: ${subscription.cancel_at_period_end}`,
          );

          // Send notification about subscription update
          await NtfyService.notifySubscriptionUpdated(project.name, project.id);
          break;
        }

        case 'radar.early_fraud_warning.created': {
          const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;
          const chargeId = typeof warning.charge === 'string' ? warning.charge : warning.charge?.id;

          if (!chargeId) {
            signale.warn('[WEBHOOK] radar.early_fraud_warning.created missing charge ID');
            break;
          }

          signale.warn(`[WEBHOOK] Early fraud warning received for charge ${chargeId} (${warning.fraud_type})`);

          // Retrieve the charge to get card fingerprint and customer email
          const charge = await stripe.charges.retrieve(chargeId, {
            expand: ['payment_method_details', 'billing_details'],
          });

          const cardFingerprint = charge.payment_method_details?.card?.fingerprint ?? null;
          const customerEmail = charge.billing_details?.email ?? null;

          // Refund the charge
          try {
            await stripe.refunds.create({charge: chargeId});
            signale.success(`[WEBHOOK] Refunded charge ${chargeId} due to early fraud warning`);
          } catch (refundError) {
            signale.error(`[WEBHOOK] Failed to refund charge ${chargeId}:`, refundError);
          }

          // Add card fingerprint and email to Stripe Radar blocklist value lists
          if (cardFingerprint) {
            try {
              const lists = await stripe.radar.valueLists.list({alias: 'blocked_card_fingerprints'});
              let listId: string;

              const existingList = lists.data[0];
              if (existingList) {
                listId = existingList.id;
              } else {
                const newList = await stripe.radar.valueLists.create({
                  alias: 'blocked_card_fingerprints',
                  name: 'Blocked Card Fingerprints',
                  item_type: 'card_fingerprint',
                });
                listId = newList.id;
              }

              await stripe.radar.valueListItems.create({value_list: listId, value: cardFingerprint});
              signale.success(`[WEBHOOK] Added card fingerprint ${cardFingerprint} to Radar blocklist`);
            } catch (blocklistError) {
              signale.error(`[WEBHOOK] Failed to add card fingerprint to Radar blocklist:`, blocklistError);
            }
          }

          if (customerEmail) {
            try {
              const emailLists = await stripe.radar.valueLists.list({alias: 'blocked_emails'});
              let emailListId: string;

              const existingEmailList = emailLists.data[0];
              if (existingEmailList) {
                emailListId = existingEmailList.id;
              } else {
                const newList = await stripe.radar.valueLists.create({
                  alias: 'blocked_emails',
                  name: 'Blocked Emails',
                  item_type: 'email',
                });
                emailListId = newList.id;
              }

              await stripe.radar.valueListItems.create({value_list: emailListId, value: customerEmail});
              signale.success(`[WEBHOOK] Added email ${customerEmail} to Radar blocklist`);
            } catch (blocklistError) {
              signale.error(`[WEBHOOK] Failed to add email to Radar blocklist:`, blocklistError);
            }
          }

          await NtfyService.notifyEarlyFraudWarning(chargeId, warning.fraud_type, cardFingerprint, customerEmail);
          break;
        }

        // Unhandled events
        default:
          signale.info(`[WEBHOOK] Unhandled Stripe event type: ${event.type}`);
          break;
      }

      return res.status(200).json({success: true, received: true});
    } catch (error) {
      signale.error('[WEBHOOK] Error processing Stripe webhook:', error);
      return res.status(400).json({success: false, error: 'Webhook processing failed'});
    }
  }
}

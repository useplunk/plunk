import {Controller, Post} from '@overnightjs/core';
import type {Prisma} from '@plunk/db';
import {EmailSourceType, EmailStatus} from '@plunk/db';
import type {Request, Response} from 'express';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {ContactService} from '../services/ContactService.js';
import {EventService} from '../services/EventService.js';
import {NtfyService} from '../services/NtfyService.js';
import {SecurityService} from '../services/SecurityService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

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
    try {
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
        // The hostname must be exactly sns.<region>.amazonaws.com.
        const SNS_HOST_RE = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;
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
            return res.status(200).json({
              success: false,
              message: 'Failed to confirm subscription',
            });
          }
        } catch (confirmError) {
          signale.error('Error confirming SNS subscription:', confirmError);
          return res.status(200).json({
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

      // Parse the nested SES event from the Message field
      const body = JSON.parse(req.body.Message);

      // Check if this is an inbound email notification (SES Receiving)
      if (body.notificationType === 'Received') {
        signale.info('[WEBHOOK] Received inbound email notification from SES');

        try {
          // Extract recipient addresses from the inbound email
          const recipients = body.receipt?.recipients || [];

          if (recipients.length === 0) {
            signale.warn('[WEBHOOK] No recipients found in inbound email');
            return res.status(200).json({success: true, message: 'No recipients found'});
          }

          // For each recipient, identify the domain and create events
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

            signale.info(
              `[WEBHOOK] Found ${domainRecords.length} project(s) with verified domain ${domain}. Processing inbound email for all.`,
            );

            // Extract sender information (same for all projects)
            const senderEmail = body.mail?.source;
            const senderFromHeader = body.mail?.commonHeaders?.from?.[0] || senderEmail;

            // Process inbound email for each project that has this domain verified
            for (const domainRecord of domainRecords) {
              signale.info(`[WEBHOOK] Processing inbound email for project: ${domainRecord.project.name}`);

              // Find or create a contact for the sender in this project
              let contact;
              if (senderEmail) {
                contact = await ContactService.upsert(
                  domainRecord.projectId,
                  senderEmail,
                  undefined, // No additional data
                  true, // Subscribe by default for inbound email senders
                );
              }

              // Create an Email record for tracking (no actual email content since it's inbound)
              const inboundEmail = await prisma.email.create({
                data: {
                  projectId: domainRecord.projectId,
                  contactId: contact!.id,
                  subject: body.mail?.commonHeaders?.subject || '(No subject)',
                  body: '', // Inbound emails don't have body content in our system
                  from: recipientEmail, // The recipient address that received the email
                  sourceType: EmailSourceType.INBOUND,
                  status: EmailStatus.RECEIVED, // Inbound emails use RECEIVED status
                  deliveredAt: new Date(body.mail?.timestamp || new Date()),
                },
              });

              // Prepare event data with all inbound email details
              const eventData = {
                messageId: body.mail?.messageId,
                from: senderEmail,
                fromHeader: senderFromHeader,
                to: recipientEmail,
                subject: body.mail?.commonHeaders?.subject,
                timestamp: body.mail?.timestamp,
                recipients: body.receipt?.recipients,
                hasContent: !!body.content,
                // Security verdicts
                spamVerdict: body.receipt?.spamVerdict?.status,
                virusVerdict: body.receipt?.virusVerdict?.status,
                spfVerdict: body.receipt?.spfVerdict?.status,
                dkimVerdict: body.receipt?.dkimVerdict?.status,
                dmarcVerdict: body.receipt?.dmarcVerdict?.status,
                // Processing metadata
                processingTimeMillis: body.receipt?.processingTimeMillis,
              };

              // Create the email.received event (this will trigger workflows)
              await EventService.trackEvent(
                domainRecord.projectId,
                'email.received',
                contact?.id,
                inboundEmail.id, // Link the event to the inbound email record
                eventData,
              );

              signale.success(
                `[WEBHOOK] Created email.received event for ${senderEmail} → ${recipientEmail} (project: ${domainRecord.project.name})`,
              );
            }
          }

          return res.status(200).json({success: true, message: 'Inbound email processed'});
        } catch (inboundError) {
          signale.error('[WEBHOOK] Error processing inbound email:', inboundError);
          // Return 200 to acknowledge receipt even if processing failed
          return res.status(200).json({success: true, message: 'Error processing inbound email'});
        }
      }

      // Handle outbound email event notifications (existing logic)
      const eventType = body.eventType as 'Bounce' | 'Delivery' | 'Open' | 'Complaint' | 'Click';
      const messageId = body.mail?.messageId;

      if (!messageId) {
        signale.warn('[WEBHOOK] No messageId found in SNS notification');
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
        signale.warn(`[WEBHOOK] Email not found for messageId: ${messageId}`);
        return res.status(404).json({success: false, error: 'Email not found'});
      }

      const now = new Date();
      const updateData: Prisma.EmailUpdateInput = {};
      const eventName = `email.${eventType.toLowerCase()}`;

      // Base event data with email metadata
      const baseEventData = {
        subject: email.subject,
        from: email.from,
        fromName: email.fromName,
        messageId: email.messageId,
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
          updateData.opens = (email.opens || 0) + 1;
          updateData.status = EmailStatus.OPENED;
          eventData = {
            ...baseEventData,
            openedAt: email.openedAt?.toISOString() || now.toISOString(),
            opens: (email.opens || 0) + 1,
            isFirstOpen: !email.openedAt,
          };
          break;

        case 'Click': {
          signale.success(`[WEBHOOK] Click received for ${email.contact.email} from ${email.project.name}`);
          const clickedLink = body.click?.link;
          // Only set clickedAt on first click
          if (!email.clickedAt) {
            updateData.clickedAt = now;
          }
          updateData.clicks = (email.clicks || 0) + 1;
          updateData.status = EmailStatus.CLICKED;
          eventData = {
            ...baseEventData,
            link: clickedLink,
            clickedAt: email.clickedAt?.toISOString() || now.toISOString(),
            clicks: (email.clicks || 0) + 1,
            isFirstClick: !email.clickedAt,
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
            // Unsubscribe contact on permanent bounce
            await prisma.contact.update({
              where: {id: email.contactId},
              data: {subscribed: false},
            });
            eventData = {
              ...baseEventData,
              bounceType,
              bouncedAt: now.toISOString(),
            };

            // Send notification about permanent bounce
            await NtfyService.notifyEmailBounce(email.project.name, email.projectId, email.contact.email, bounceType);
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
            await prisma.contact.update({
              where: {id: email.contactId},
              data: {subscribed: false},
            });
            eventData = {
              ...baseEventData,
              bounceType,
              bouncedAt: now.toISOString(),
            };

            await NtfyService.notifyEmailBounce(email.project.name, email.projectId, email.contact.email, bounceType);
          }
          break;
        }

        case 'Complaint':
          signale.warn(`[WEBHOOK] Complaint received for ${email.contact.email} from ${email.project.name}`);
          updateData.status = EmailStatus.COMPLAINED;
          updateData.complainedAt = now;
          // Unsubscribe contact on complaint
          await prisma.contact.update({
            where: {id: email.contactId},
            data: {subscribed: false},
          });
          eventData = {
            ...baseEventData,
            complainedAt: now.toISOString(),
          };

          // Send notification about complaint
          await NtfyService.notifyEmailComplaint(email.project.name, email.projectId, email.contact.email);
          break;

        default:
          signale.warn(`[WEBHOOK] Unknown event type: ${eventType}`);
          return res.status(200).json({success: true});
      }

      // Update email with new status and timestamps
      await prisma.email.update({
        where: {id: email.id},
        data: updateData,
      });

      // Track event (this will trigger workflows)
      await EventService.trackEvent(email.projectId, eventName, email.contactId, email.id, eventData);

      // Check security limits only for permanent bounces and complaints
      // Transient bounces (soft bounces) don't count toward bounce rate
      const isPermanentBounce = eventType === 'Bounce' && body.bounce?.bounceType === 'Permanent';
      if (isPermanentBounce || eventType === 'Complaint') {
        await SecurityService.checkAndEnforceSecurityLimits(email.projectId);
      }

      signale.success(`[WEBHOOK] Processed ${eventType} event for email ${email.id}`);
      return res.status(200).json({success: true});
    } catch (error) {
      signale.error('[WEBHOOK] Error processing SNS webhook:', error);
      // Always return 200 to prevent SNS from retrying
      return res.status(200).json({success: true});
    }
  }

}

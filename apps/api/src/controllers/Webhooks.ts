import {Controller, Post} from '@overnightjs/core';
import type {Prisma} from '@plunk/db';
import {EmailSourceType, EmailStatus} from '@plunk/db';
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
import {ContactService} from '../services/ContactService.js';
import {EventService} from '../services/EventService.js';
import {MembershipService} from '../services/MembershipService.js';
import {MeterService} from '../services/MeterService.js';
import {NtfyService} from '../services/NtfyService.js';
import {ProjectService} from '../services/ProjectService.js';
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
      // Verify SNS message signature before processing anything
      const signatureValid = await SecurityService.verifySnsSignature(req.body as Record<string, string>);
      if (!signatureValid) {
        signale.warn('[WEBHOOK] SNS signature verification failed — request rejected');
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

            // Parse email content if available
            let htmlBody: string | undefined;

            if (body.content && typeof body.content === 'string') {
              try {
                const isBase64 = body.receipt?.action?.encoding === 'BASE64';
                const emailBuffer = isBase64
                  ? Buffer.from(body.content, 'base64')
                  : Buffer.from(body.content);

                const parsed = await simpleParser(emailBuffer);
                const raw =
                  (parsed.html ? String(parsed.html) : undefined) ??
                  parsed.textAsHtml ??
                  parsed.text ??
                  undefined;

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

            // Process inbound email for each project that has this domain verified
            for (const domainRecord of domainRecords) {
              signale.info(`[WEBHOOK] Processing inbound email for project: ${domainRecord.project.name}`);

              // Check billing limits before processing inbound email
              const limitCheck = await BillingLimitService.checkLimit(domainRecord.projectId, EmailSourceType.INBOUND);

              if (!limitCheck.allowed) {
                signale.warn(
                  `[WEBHOOK] Inbound email blocked for project ${domainRecord.project.name}: ${limitCheck.message}`,
                );
                continue; // Skip this project but continue processing for other projects
              }

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

              // Create an Email record for tracking with parsed content
              const inboundEmail = await prisma.email.create({
                data: {
                  projectId: domainRecord.projectId,
                  contactId: contact!.id,
                  subject: body.mail?.commonHeaders?.subject || '(No subject)',
                  body: htmlBody || '', // Store HTML body in the body field
                  from: recipientEmail, // The recipient address that received the email
                  sourceType: EmailSourceType.INBOUND,
                  status: EmailStatus.RECEIVED, // Inbound emails use RECEIVED status
                  deliveredAt: new Date(body.mail?.timestamp || new Date()),
                },
              });

              // Increment usage counter in cache
              await BillingLimitService.incrementUsage(domainRecord.projectId, EmailSourceType.INBOUND);

              // Record Stripe metering if project has customer
              if (domainRecord.project.customer) {
                await MeterService.recordEmailSent(
                  domainRecord.project.customer,
                  1, // Inbound emails count as 1 credit
                  `email_${inboundEmail.id}`,
                );
              }

              // Prepare event data with all inbound email details including body content
              const eventData = {
                messageId: body.mail?.messageId,
                from: senderEmail,
                fromHeader: senderFromHeader,
                to: recipientEmail,
                subject: body.mail?.commonHeaders?.subject,
                timestamp: body.mail?.timestamp,
                recipients: body.receipt?.recipients,
                hasContent: !!body.content,
                // Email body content
                body: htmlBody,
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

          // Update project with customer and subscription IDs
          const updatedProject = await prisma.project.update({
            where: {id: projectId},
            data: {
              customer: customerId,
              subscription: subscriptionId,
            },
          });

          await ProjectService.invalidate(projectId, [
            {public: updatedProject.public, secret: updatedProject.secret},
          ]);

          // Base onboarding credit: refund the 1-unit card-verification charge
          let creditBalance = -100;

          // Switching-offer promo: 2 extra units of credit if the customer typed SWITCH
          // into the Promo code custom field on Stripe Checkout.
          const promoField = session.custom_fields?.find((f) => f.key === 'promo_code');
          const promoCode = promoField?.text?.value?.trim().toUpperCase();
          if (promoCode === 'SWITCH') {
            creditBalance -= 200;
            signale.success(`[WEBHOOK] SWITCH promo applied for project ${projectId}`);
          } else if (promoCode) {
            signale.info(`[WEBHOOK] Unknown promo code "${promoCode}" entered for project ${projectId}`);
          }

          // Update Stripe customer name to match project name and add credit for onboarding fee
          await stripe.customers.update(customerId, {
            name: updatedProject.name,
            balance: creditBalance,
          });

          signale.success(`[WEBHOOK] Checkout completed for project ${projectId}`);

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
            data: {disabled: true},
          });

          await ProjectService.invalidate(project.id, [{public: project.public, secret: project.secret}]);

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

          await ProjectService.invalidate(project.id, [{public: project.public, secret: project.secret}]);

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

import type {Contact, Email, Prisma, Project} from '@plunk/db';
import {EmailSourceType, EmailStatus, TrackingMode} from '@plunk/db';
import {toPrismaJson} from '@plunk/types';
import signale from 'signale';

import {DASHBOARD_URI, LANDING_URI, STRIPE_ENABLED} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import {createTranslatorSync, renderTemplate} from '@plunk/shared';

import {BillingLimitService} from './BillingLimitService.js';
import {DomainService} from './DomainService.js';
import {bodyHasListManagementLink, buildEmailHeaders, classifyEmail} from './EmailHeaderService.js';
import {EventService} from './EventService.js';
import {QueueService} from './QueueService.js';
import {sendRawEmail} from './SESService.js';

interface Attachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
  contentId?: string;
  disposition?: 'attachment' | 'inline';
}

interface SendEmailParams {
  projectId: string;
  contactId: string;
  subject: string;
  body: string;
  from: string;
  fromName?: string;
  toName?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: Attachment[];
  templateId?: string;
  campaignId?: string;
  workflowExecutionId?: string;
  workflowStepExecutionId?: string;
  recipientEmail?: string; // Optional custom recipient email (overrides contact.email)
  isTransactional?: boolean; // Override source type to TRANSACTIONAL (e.g. for transactional campaigns)
}

/**
 * Email Service
 * Handles sending emails and tracking delivery
 */
export class EmailService {
  /**
   * Send a transactional email via API
   */
  public static async sendTransactionalEmail(params: SendEmailParams): Promise<Email> {
    // Check if a template is used and if it's a marketing template
    // Marketing templates should not be sent to unsubscribed contacts even via the transactional API
    if (params.templateId) {
      const template = await prisma.template.findUnique({
        where: {id: params.templateId},
        select: {type: true},
      });

      // If using a marketing template, check subscription status
      if (template?.type === 'MARKETING') {
        const contact = await prisma.contact.findUnique({
          where: {id: params.contactId},
          select: {subscribed: true, email: true},
        });

        if (!contact?.subscribed) {
          throw new HttpException(
            400,
            `Cannot send marketing template to unsubscribed contact ${contact?.email || params.contactId}. Use a transactional template or send without a template.`,
          );
        }
      }
    }

    // Check billing limit before sending
    const limitCheck = await BillingLimitService.checkLimit(params.projectId, EmailSourceType.TRANSACTIONAL);

    if (!limitCheck.allowed) {
      throw new HttpException(429, limitCheck.message || 'Billing limit exceeded for transactional emails');
    }

    // Log warning if approaching limit (80%)
    if (limitCheck.warning) {
      signale.warn(`[BILLING_LIMIT] ${limitCheck.message}`);
    }

    const email = await prisma.email.create({
      data: {
        projectId: params.projectId,
        contactId: params.contactId,
        subject: params.subject,
        body: params.body,
        from: params.from,
        fromName: params.fromName,
        toName: params.toName,
        replyTo: params.replyTo,
        headers: params.headers ? toPrismaJson(params.headers) : undefined,
        attachments: params.attachments ? toPrismaJson(params.attachments) : undefined,
        sourceType: EmailSourceType.TRANSACTIONAL,
        templateId: params.templateId,
        status: EmailStatus.PENDING,
      },
    });

    // Increment usage counter in cache
    await BillingLimitService.incrementUsage(params.projectId, EmailSourceType.TRANSACTIONAL);

    // Queue email for sending
    await this.queueEmail(email.id, EmailSourceType.TRANSACTIONAL);

    return email;
  }

  /**
   * Send a campaign email
   */
  public static async sendCampaignEmail(params: SendEmailParams): Promise<Email> {
    // Check if campaign or template is transactional to determine source type
    let sourceType: EmailSourceType = EmailSourceType.CAMPAIGN;

    if (params.isTransactional) {
      sourceType = EmailSourceType.TRANSACTIONAL;
    } else if (params.templateId) {
      const template = await prisma.template.findUnique({
        where: {id: params.templateId},
        select: {type: true},
      });

      // If template is marked as TRANSACTIONAL, use TRANSACTIONAL sourceType
      // This ensures unsubscribe footer is not added to transactional emails
      if (template?.type === 'TRANSACTIONAL') {
        sourceType = EmailSourceType.TRANSACTIONAL;
      }
    }

    // Check billing limit before sending
    const limitCheck = await BillingLimitService.checkLimit(params.projectId, sourceType);

    if (!limitCheck.allowed) {
      throw new HttpException(
        429,
        limitCheck.message || `Billing limit exceeded for ${sourceType.toLowerCase()} emails`,
      );
    }

    // Log warning if approaching limit (80%)
    if (limitCheck.warning) {
      signale.warn(`[BILLING_LIMIT] ${limitCheck.message}`);
    }

    const email = await prisma.email.create({
      data: {
        projectId: params.projectId,
        contactId: params.contactId,
        subject: params.subject,
        body: params.body,
        from: params.from,
        fromName: params.fromName,
        replyTo: params.replyTo,
        headers: params.headers ? toPrismaJson(params.headers) : undefined,
        attachments: params.attachments ? toPrismaJson(params.attachments) : undefined,
        sourceType,
        templateId: params.templateId,
        campaignId: params.campaignId,
        status: EmailStatus.PENDING,
      },
    });

    // Increment usage counter in cache
    await BillingLimitService.incrementUsage(params.projectId, sourceType);

    // Queue email for sending
    await this.queueEmail(email.id, sourceType);

    return email;
  }

  /**
   * Send a workflow email
   */
  public static async sendWorkflowEmail(params: SendEmailParams): Promise<Email> {
    // Check if template is transactional to determine source type
    let sourceType: EmailSourceType = EmailSourceType.WORKFLOW;

    if (params.templateId) {
      const template = await prisma.template.findUnique({
        where: {id: params.templateId},
        select: {type: true},
      });

      // If template is marked as TRANSACTIONAL, use TRANSACTIONAL sourceType
      // This ensures unsubscribe footer is not added to transactional emails
      if (template?.type === 'TRANSACTIONAL') {
        sourceType = EmailSourceType.TRANSACTIONAL;
      }
    }

    // Check subscription status for marketing emails
    // Transactional emails should always be sent regardless of subscription status
    // Custom recipient emails also bypass subscription checks (they're not in the contact list)
    if (sourceType !== EmailSourceType.TRANSACTIONAL && !params.recipientEmail) {
      const contact = await prisma.contact.findUnique({
        where: {id: params.contactId},
        select: {subscribed: true},
      });

      if (!contact?.subscribed) {
        signale.info(
          `[WORKFLOW] Skipping marketing email to unsubscribed contact ${params.contactId} in workflow execution ${params.workflowExecutionId}`,
        );
        // For workflows, we silently skip sending to unsubscribed contacts for marketing emails
        // Return a placeholder email record that won't be sent
        return await prisma.email.create({
          data: {
            projectId: params.projectId,
            contactId: params.contactId,
            subject: params.subject,
            body: params.body,
            from: params.from,
            fromName: params.fromName,
            replyTo: params.replyTo,
            headers: params.headers ? toPrismaJson(params.headers) : undefined,
            attachments: params.attachments ? toPrismaJson(params.attachments) : undefined,
            sourceType,
            templateId: params.templateId,
            workflowExecutionId: params.workflowExecutionId,
            workflowStepExecutionId: params.workflowStepExecutionId,
            status: EmailStatus.FAILED,
            error: 'Contact is unsubscribed from marketing emails',
          },
        });
      }
    }

    // Check billing limit before sending
    const limitCheck = await BillingLimitService.checkLimit(params.projectId, sourceType);

    if (!limitCheck.allowed) {
      throw new HttpException(
        429,
        limitCheck.message || `Billing limit exceeded for ${sourceType.toLowerCase()} emails`,
      );
    }

    // Log warning if approaching limit (80%)
    if (limitCheck.warning) {
      signale.warn(`[BILLING_LIMIT] ${limitCheck.message}`);
    }

    // If custom recipient email is provided, store it in headers for later use
    const emailHeaders = params.headers ? {...params.headers} : {};
    if (params.recipientEmail) {
      emailHeaders['X-Plunk-Recipient-Override'] = params.recipientEmail;
    }

    const email = await prisma.email.create({
      data: {
        projectId: params.projectId,
        contactId: params.contactId,
        subject: params.subject,
        body: params.body,
        from: params.from,
        fromName: params.fromName,
        replyTo: params.replyTo,
        headers: Object.keys(emailHeaders).length > 0 ? toPrismaJson(emailHeaders) : undefined,
        attachments: params.attachments ? toPrismaJson(params.attachments) : undefined,
        sourceType,
        templateId: params.templateId,
        workflowExecutionId: params.workflowExecutionId,
        workflowStepExecutionId: params.workflowStepExecutionId,
        status: EmailStatus.PENDING,
      },
    });

    // Increment usage counter in cache
    await BillingLimitService.incrementUsage(params.projectId, sourceType);

    // Queue email for sending
    await this.queueEmail(email.id, sourceType);

    return email;
  }

  /**
   * Actually send the email via AWS SES
   * This is called by the email processor worker
   */
  public static async sendEmail(emailId: string): Promise<void> {
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
      throw new HttpException(404, 'Email not found');
    }

    if (email.status !== EmailStatus.PENDING) {
      return; // Already processed
    }

    // Final validation: Check subscription status before sending
    // Only transactional emails should be sent to unsubscribed contacts
    if (!email.contact.subscribed) {
      const isTransactional =
        email.sourceType === EmailSourceType.TRANSACTIONAL || email.template?.type === 'TRANSACTIONAL';

      if (!isTransactional) {
        signale.warn(`[EMAIL] Skipping marketing email ${emailId} to unsubscribed contact ${email.contact.email}`);
        await prisma.email.update({
          where: {id: emailId},
          data: {
            status: EmailStatus.FAILED,
            error: 'Contact is unsubscribed from marketing emails',
          },
        });
        return;
      }
    }

    try {
      // Verify domain is registered and verified before sending
      // This ensures all emails (transactional, campaign, workflow) use verified domains
      await DomainService.verifyEmailDomain(email.from, email.projectId);

      // Update status to sending
      await prisma.email.update({
        where: {id: emailId},
        data: {status: EmailStatus.SENDING},
      });

      // Format template variables in subject and body
      const contactData =
        email.contact.data && typeof email.contact.data === 'object' && !Array.isArray(email.contact.data)
          ? email.contact.data
          : {};
      const formattedEmail = this.format({
        subject: email.subject,
        body: email.body,
        data: {
          id: email.contact.id,
          email: email.contact.email,
          ...contactData,
          data: contactData,
          unsubscribeUrl: `${DASHBOARD_URI}/unsubscribe/${email.contact.id}`,
          subscribeUrl: `${DASHBOARD_URI}/subscribe/${email.contact.id}`,
          manageUrl: `${DASHBOARD_URI}/manage/${email.contact.id}`,
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
      const compiledHtml = this.compile({
        content: formattedEmail.body,
        contact: email.contact,
        project: email.project,
        includeUnsubscribe: emailClass === 'marketing',
      });

      // Use explicit fromName if provided, otherwise fall back to project name
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
        customHeaders: publicHeaders,
      });

      // Parse attachments from JSON
      const attachments =
        email.attachments && Array.isArray(email.attachments)
          ? (email.attachments as Array<{
              filename: string;
              content: string;
              contentType: string;
              contentId?: string;
              disposition?: 'attachment' | 'inline';
            }>)
          : undefined;

      // Determine tracking based on project settings and email type
      const shouldTrack = this.shouldTrackEmail(email.project.tracking, email.sourceType);

      // Send via AWS SES
      const result = await sendRawEmail({
        from: {
          name: fromName,
          email: fromEmail,
        },
        to: [recipientEmail],
        content: {
          subject: formattedEmail.subject,
          html: compiledHtml,
          text: this.htmlToText(compiledHtml),
        },
        reply: email.replyTo || undefined,
        headers: outboundHeaders,
        attachments: attachments,
        tracking: shouldTrack,
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
    } catch (error) {
      signale.error(`[EMAIL] Failed to send email ${emailId}:`, error);

      // Mark as failed
      await prisma.email.update({
        where: {id: emailId},
        data: {
          status: EmailStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Process email webhook events (opens, clicks, bounces, etc.)
   * This would be called by webhook endpoints from your email provider
   */
  public static async handleWebhookEvent(
    emailId: string,
    eventType: 'opened' | 'clicked' | 'bounced' | 'complained' | 'delivered',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const email = await prisma.email.findUnique({
      where: {id: emailId},
    });

    if (!email) {
      throw new HttpException(404, 'Email not found');
    }

    const now = new Date();
    const updateData: Prisma.EmailUpdateInput = {};

    switch (eventType) {
      case 'delivered':
        updateData.status = EmailStatus.DELIVERED;
        updateData.deliveredAt = now;
        break;

      case 'opened':
        if (!email.openedAt) {
          updateData.openedAt = now;
        }
        updateData.opens = (email.opens || 0) + 1;
        updateData.status = EmailStatus.OPENED;
        break;

      case 'clicked':
        if (!email.clickedAt) {
          updateData.clickedAt = now;
        }
        updateData.clicks = (email.clicks || 0) + 1;
        updateData.status = EmailStatus.CLICKED;
        break;

      case 'bounced':
        updateData.status = EmailStatus.BOUNCED;
        updateData.bouncedAt = now;
        // Unsubscribe contact on bounce and track event
        if (email.contactId) {
          await prisma.contact.update({
            where: {id: email.contactId},
            data: {subscribed: false},
          });
          // Track unsubscription event
          await EventService.trackEvent(email.projectId, 'contact.unsubscribed', email.contactId, email.id, {
            reason: 'bounce',
          });
        }
        break;

      case 'complained':
        updateData.status = EmailStatus.COMPLAINED;
        updateData.complainedAt = now;
        // Unsubscribe contact and track event
        if (email.contactId) {
          await prisma.contact.update({
            where: {id: email.contactId},
            data: {subscribed: false},
          });
          // Track unsubscription event
          await EventService.trackEvent(email.projectId, 'contact.unsubscribed', email.contactId, email.id, {
            reason: 'complaint',
          });
        }
        break;
    }

    await prisma.email.update({
      where: {id: emailId},
      data: updateData,
    });

    // Update campaign stats if applicable
    if (email.campaignId) {
      const campaignUpdate: Prisma.CampaignUpdateInput = {};

      switch (eventType) {
        case 'delivered':
          campaignUpdate.deliveredCount = {increment: 1};
          break;

        case 'opened':
          // Only increment unique opens to match getStats logic
          if (!email.openedAt) {
            campaignUpdate.openedCount = {increment: 1};
          }
          break;

        case 'clicked':
          // Only increment unique clicks to match getStats logic
          if (!email.clickedAt) {
            campaignUpdate.clickedCount = {increment: 1};
          }
          break;

        case 'bounced':
          campaignUpdate.bouncedCount = {increment: 1};
          break;
      }

      if (Object.keys(campaignUpdate).length > 0) {
        await prisma.campaign.update({
          where: {id: email.campaignId},
          data: campaignUpdate,
        });
      }
    }

    // Track event
    await prisma.event.create({
      data: {
        projectId: email.projectId,
        contactId: email.contactId,
        emailId: email.id,
        name: `email.${eventType}`,
        data: metadata ? toPrismaJson(metadata) : undefined,
      },
    });
  }

  /**
   * Get email statistics for a project
   */
  public static async getStats(projectId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.EmailWhereInput = {
      projectId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? {gte: startDate} : {}),
              ...(endDate ? {lte: endDate} : {}),
            },
          }
        : {}),
    };

    const [total, sent, delivered, received, opened, clicked, bounced, failed] = await Promise.all([
      prisma.email.count({where}),
      prisma.email.count({where: {...where, status: EmailStatus.SENT}}),
      prisma.email.count({where: {...where, status: EmailStatus.DELIVERED}}),
      prisma.email.count({where: {...where, status: EmailStatus.RECEIVED}}),
      prisma.email.count({where: {...where, status: EmailStatus.OPENED}}),
      prisma.email.count({where: {...where, status: EmailStatus.CLICKED}}),
      prisma.email.count({where: {...where, status: EmailStatus.BOUNCED}}),
      prisma.email.count({where: {...where, status: EmailStatus.FAILED}}),
    ]);

    return {
      total,
      sent,
      delivered,
      received,
      opened,
      clicked,
      bounced,
      failed,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
    };
  }

  /**
   * Render a single email's subject and body.
   *
   * Uses the shared Liquid renderer from @plunk/shared, which caches parsed templates,
   * so the per-email call sites here don't re-parse the same body for every recipient.
   * When rendering a known template for many contacts in one pass, prefer
   * `compileTemplate` to hoist the parse out of the loop entirely (see CampaignService).
   */
  public static format({subject, body, data}: {subject: string; body: string; data: Record<string, unknown>}): {
    subject: string;
    body: string;
  } {
    return {
      subject: renderTemplate(subject, data),
      body: renderTemplate(body, data),
    };
  }

  /**
   * Determine if an email should be tracked based on project tracking mode and email source type
   */
  public static shouldTrackEmail(trackingMode: TrackingMode, sourceType: EmailSourceType): boolean {
    switch (trackingMode) {
      case TrackingMode.ENABLED:
        return true;
      case TrackingMode.DISABLED:
        return false;
      case TrackingMode.MARKETING_ONLY:
        // Track only campaigns and workflows (marketing), not transactional emails
        return sourceType !== EmailSourceType.TRANSACTIONAL;
      default:
        return true;
    }
  }

  /**
   * Convert compiled email HTML into a plaintext alternative part.
   *
   * Plunk compiles emails into full HTML documents (prose wrapper, unsubscribe
   * footer, badge), so the plaintext is derived from the *compiled* HTML rather
   * than the raw body — the text/plain part then carries the same unsubscribe
   * link the HTML part does, keeping marketing sends compliant in text-only
   * clients. Dependency-free by design: the markup Plunk emits is small and
   * known, so a hand-rolled pass is more predictable than a full html-to-text
   * dependency.
   */
  public static htmlToText(html: string): string {
    if (!html) return '';

    let text = html;

    // Drop style/script blocks entirely (CSS and JS are noise in plaintext).
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Keep link destinations next to their anchor text so URLs (unsubscribe
    // links, article links) survive the conversion. Skip mailto: and fragment
    // links, which read as noise in a text client.
    text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href: string, inner: string) => {
      return /^https?:/i.test(href) ? `${inner} (${href})` : inner;
    });

    // Block-level elements become line breaks.
    text = text.replace(/<\/(?:p|div|h[1-6]|li|tr|table|ul|ol|blockquote|pre|section|article|header|footer)>/gi, '\n');
    text = text.replace(/<(?:br|hr)\s*\/?>/gi, '\n');
    text = text.replace(/<\/(?:td|th)>/gi, '\t');

    // Strip any remaining tags.
    text = text.replace(/<[^>]+>/g, '');

    // Decode common HTML entities.
    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'");

    // Normalize whitespace: collapse runs of spaces/tabs and keep single blank lines.
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/[ \t]*\n[ \t]*/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    return text;
  }

  /**
   * Detect if HTML contains custom patterns that indicate it was written in the HTML editor
   * rather than the visual editor. Mirrors the same logic in apps/web/src/lib/emailStyles.ts.
   *
   * The TipTap editor loads StarterKit + TextAlign + Color + TextStyle + Link +
   * ResizableImage + VariableMention. TextStyle/Color/Link round-trip <span style="..."> and
   * <a style="..."> markup. This detection therefore PERMITS span + inline styles and only
   * REJECTS markup TipTap cannot represent (tables, divs, forms, embeds, custom attrs,
   * <style> blocks, etc).
   */
  private static detectCustomHtmlPatterns(html: string): boolean {
    if (!html || html.trim() === '') return false;

    const classMatches = html.matchAll(/class\s*=\s*["']([^"']*)["']/gi);
    let hasCustomClasses = false;
    for (const match of classMatches) {
      const classValue = match[1];
      if (!classValue) continue;
      const classes = classValue.split(/\s+/).filter((c: string) => c.length > 0);
      const allowedPrefixes = ['prose', 'variable-', 'email-image', 'ProseMirror', 'resizable-image', 'selected', 'resize-handle'];
      const hasDisallowedClass = classes.some((cls: string) => !allowedPrefixes.some((prefix: string) => cls.startsWith(prefix)));
      if (hasDisallowedClass) {
        hasCustomClasses = true;
        break;
      }
    }

    // Element-attribute-scoped regex; the leading [\s"'] guard prevents `id=` inside
    // href URLs (e.g. `?id=...`) from false-matching as an HTML id attribute.
    const hasCustomAttributes = /<[a-z][^>]*?[\s"'](?:data-|aria-|role=|id=)/i.test(html);

    // Elements TipTap cannot round-trip with the currently-loaded extension set.
    // <span> is intentionally excluded -- TipTap's TextStyle extension handles it.
    const hasCustomElements =
      /<(?:div|section|article|header|footer|nav|aside|main|table|tr|td|th|tbody|thead|tfoot|colgroup|col|form|input|button|select|textarea|iframe|video|audio|svg|object|embed|details|summary|dialog)\b/i.test(
        html,
      );

    const hasMediaQueries = /@media/i.test(html);
    const hasStyleTags = /<style[^>]*>/i.test(html);

    return hasCustomClasses || hasCustomAttributes || hasCustomElements || hasMediaQueries || hasStyleTags;
  }

  /**
   * Wraps visual editor content with a full HTML document and prose styles.
   * Mirrors wrapEmailWithStyles() in apps/web/src/lib/emailStyles.ts so sent emails
   * match the preview modal exactly.
   */
  private static wrapWithEmailStyles(htmlBody: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* Base reset */
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      color: #111827;
    }

    /* Tailwind Typography (prose) base styles */
    .prose {
      color: #374151;
      max-width: 600px;
    }
    .prose [class~="lead"] {
      color: #4b5563;
      font-size: 1.25em;
      line-height: 1.6;
      margin-top: 1.2em;
      margin-bottom: 1.2em;
    }
    .prose a {
      color: #3b82f6;
      text-decoration: underline;
      font-weight: 500;
    }
    .prose strong {
      color: #111827;
      font-weight: 600;
    }
    .prose ol, .prose ul {
      margin-top: 1.25em;
      margin-bottom: 1.25em;
      padding-left: 1.625em;
    }
    .prose li {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
    .prose ol > li {
      padding-left: 0.375em;
    }
    .prose ul > li {
      padding-left: 0.375em;
    }
    .prose > ul > li p {
      margin-top: 0.75em;
      margin-bottom: 0.75em;
    }
    .prose > ul > li > *:first-child {
      margin-top: 1.25em;
    }
    .prose > ul > li > *:last-child {
      margin-bottom: 1.25em;
    }
    .prose > ol > li > *:first-child {
      margin-top: 1.25em;
    }
    .prose > ol > li > *:last-child {
      margin-bottom: 1.25em;
    }
    .prose ul ul, .prose ul ol, .prose ol ul, .prose ol ol {
      margin-top: 0.75em;
      margin-bottom: 0.75em;
    }
    .prose hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin-top: 3em;
      margin-bottom: 3em;
    }
    .prose blockquote {
      font-weight: 500;
      font-style: italic;
      color: #111827;
      border-left-width: 0.25rem;
      border-left-color: #e5e7eb;
      quotes: "\\201C""\\201D""\\2018""\\2019";
      margin-top: 1.6em;
      margin-bottom: 1.6em;
      padding-left: 1em;
    }
    .prose h1 {
      color: #111827;
      font-weight: 800;
      font-size: 2.25em;
      margin-top: 0;
      margin-bottom: 0.8888889em;
      line-height: 1.1111111;
    }
    .prose h2 {
      color: #111827;
      font-weight: 700;
      font-size: 1.5em;
      margin-top: 2em;
      margin-bottom: 1em;
      line-height: 1.3333333;
    }
    .prose h3 {
      color: #111827;
      font-weight: 600;
      font-size: 1.25em;
      margin-top: 1.6em;
      margin-bottom: 0.6em;
      line-height: 1.6;
    }
    .prose h4 {
      color: #111827;
      font-weight: 600;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.5;
    }
    .prose img {
      margin-top: 2em;
      margin-bottom: 2em;
    }
    .prose figure {
      margin-top: 2em;
      margin-bottom: 2em;
    }
    .prose figure > * {
      margin-top: 0;
      margin-bottom: 0;
    }
    .prose code {
      color: #111827;
      font-weight: 600;
      font-size: 0.875em;
    }
    .prose code::before {
      content: "\`";
    }
    .prose code::after {
      content: "\`";
    }
    .prose pre {
      color: #e5e7eb;
      background-color: #1f2937;
      overflow-x: auto;
      font-size: 0.875em;
      line-height: 1.7142857;
      margin-top: 1.7142857em;
      margin-bottom: 1.7142857em;
      border-radius: 0.375rem;
      padding-top: 0.8571429em;
      padding-right: 1.1428571em;
      padding-bottom: 0.8571429em;
      padding-left: 1.1428571em;
    }
    .prose pre code {
      background-color: transparent;
      border-width: 0;
      border-radius: 0;
      padding: 0;
      font-weight: 400;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      line-height: inherit;
    }
    .prose pre code::before {
      content: none;
    }
    .prose pre code::after {
      content: none;
    }
    .prose table {
      width: 100%;
      table-layout: auto;
      text-align: left;
      margin-top: 2em;
      margin-bottom: 2em;
      font-size: 0.875em;
      line-height: 1.7142857;
      border-collapse: collapse;
    }
    .prose thead {
      border-bottom-width: 1px;
      border-bottom-color: #d1d5db;
    }
    .prose thead th {
      color: #111827;
      font-weight: 600;
      vertical-align: bottom;
      padding-right: 0.5714286em;
      padding-bottom: 0.5714286em;
      padding-left: 0.5714286em;
    }
    .prose tbody tr {
      border-bottom-width: 1px;
      border-bottom-color: #e5e7eb;
    }
    .prose tbody tr:last-child {
      border-bottom-width: 0;
    }
    .prose tbody td {
      vertical-align: top;
      padding-top: 0.5714286em;
      padding-right: 0.5714286em;
      padding-bottom: 0.5714286em;
      padding-left: 0.5714286em;
    }
    .prose p {
      margin-top: 1.25em;
      margin-bottom: 1.25em;
    }

    /* prose-sm modifier */
    .prose-sm {
      font-size: 0.875rem;
      line-height: 1.7142857;
    }
    .prose-sm p {
      margin-top: 1.1428571em;
      margin-bottom: 1.1428571em;
    }
    .prose-sm h1 {
      font-size: 2.1428571em;
      margin-top: 0;
      margin-bottom: 0.8em;
      line-height: 1.2;
    }
    .prose-sm h2 {
      font-size: 1.4285714em;
      margin-top: 1.6em;
      margin-bottom: 0.8em;
      line-height: 1.4;
    }
    .prose-sm h3 {
      font-size: 1.2857143em;
      margin-top: 1.5555556em;
      margin-bottom: 0.4444444em;
      line-height: 1.5555556;
    }
    .prose-sm h4 {
      margin-top: 1.4285714em;
      margin-bottom: 0.5714286em;
      line-height: 1.4285714;
    }
    .prose-sm img {
      margin-top: 1.7142857em;
      margin-bottom: 1.7142857em;
    }
    .prose-sm ol, .prose-sm ul {
      margin-top: 1.1428571em;
      margin-bottom: 1.1428571em;
      padding-left: 1.5714286em;
    }
    .prose-sm li {
      margin-top: 0.2857143em;
      margin-bottom: 0.2857143em;
    }

    /* max-w-none utility */
    .max-w-none {
      max-width: none;
    }

    /* Custom editor styles */
    .variable-highlight, .variable-placeholder, .variable-mention {
      background-color: #dbeafe;
      color: #1e40af;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      display: inline;
    }

    .prose table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }

    .prose th, .prose td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
      min-width: 100px;
    }

    .prose th {
      background-color: #f3f4f6;
      font-weight: 600;
    }

    .prose img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 16px 0;
    }

    .prose .resizable-image-wrapper {
      display: block;
      margin: 16px 0;
    }

    .prose .resizable-image-container {
      display: inline-block;
      position: relative;
      max-width: 100%;
    }

    .prose .resizable-image-container img {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="prose prose-sm max-w-none">
    ${htmlBody}
  </div>
</body>
</html>`;
  }

  /**
   * Compile HTML email with optional unsubscribe footer and badge
   * Adds unsubscribe link and Plunk badge for free tier users (only when billing is enabled)
   */
  public static compile({
    content,
    contact,
    project,
    includeUnsubscribe = true,
  }: {
    content: string;
    contact: Contact;
    project: Project;
    includeUnsubscribe?: boolean;
  }): string {
    // Wrap visual editor content with prose styles so the sent email matches the preview modal.
    // Custom HTML (from the HTML editor) already carries its own styles and is used as-is.
    let html = this.detectCustomHtmlPatterns(content) ? content : this.wrapWithEmailStyles(content);

    const unsubscribeHtml = includeUnsubscribe
      ? (() => {
          // Get contact-level locale (overrides project language)
          const contactLocale =
            contact.data &&
            typeof contact.data === 'object' &&
            !Array.isArray(contact.data) &&
            'locale' in contact.data &&
            typeof contact.data.locale === 'string'
              ? contact.data.locale
              : null;

          // Get translator for contact's locale or project's language
          const translator = createTranslatorSync(contactLocale || project.language || 'en');
          const unsubscribeText = translator.t('email.footer.unsubscribeText', {
            projectName: project.name,
          });
          const updatePreferencesText = translator.t('email.footer.updatePreferences');

          return `<table align="center" width="100%" style="max-width: 480px; width: 100%; margin-left: auto; margin-right: auto; font-family: Inter, ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; border: 0; cellpadding: 0; cellspacing: 0;" role="presentation">
          <tbody>
            <tr>
              <td>
                <hr style="border: none; border-top: 1px solid #eaeaea; width: 100%; margin-top: 12px; margin-bottom: 12px;">
                <p style="font-size: 12px; line-height: 24px; margin: 16px 0; text-align: center; color: rgb(64, 64, 64);">
                  ${unsubscribeText}
                  <a href="${DASHBOARD_URI}/unsubscribe/${contact.id}">${updatePreferencesText}</a>.
                </p>
              </td>
            </tr>
          </tbody>
        </table>`;
        })()
      : '';

    // Add Plunk badge if billing is enabled and project has no subscription (free tier)
    const badgeHtml =
      STRIPE_ENABLED && project.subscription === null
        ? `<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
          <tbody>
            <tr>
              <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                    <tbody>
                      <tr>
                        <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                            <tbody>
                              <tr>
                                <td style="width:180px;">
                                  <a href="${LANDING_URI}?ref=badge" target="_blank">
                                    <img alt="Powered by Plunk" height="auto" src="https://cdn.useplunk.com/badge.png" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="180" />
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>`
        : '';

    // Combine footer and badge
    const footerHtml = `${unsubscribeHtml}${badgeHtml}`;

    // Insert before closing body tag if it exists, otherwise append
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${footerHtml}</body>`);
    } else {
      html = `${html}${footerHtml}`;
    }

    return html;
  }

  /**
   * Queue an email for sending
   * Adds email to the BullMQ queue for processing by workers
   */
  private static async queueEmail(emailId: string, sourceType: EmailSourceType, delay?: number): Promise<void> {
    await QueueService.queueEmail(emailId, sourceType, delay);
  }
}

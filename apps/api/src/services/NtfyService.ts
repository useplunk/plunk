import {type NtfyNotification, NtfyPriority, NtfyTag} from '@plunk/types';
import signale from 'signale';

/**
 * Service for sending notifications via ntfy.sh
 * Supports configurable ntfy server URL via NTFY_URL environment variable
 */
export class NtfyService {
  private static ntfyUrl: string | null = null;
  private static isConfigured = false;

  /**
   * Send a notification to ntfy
   * @param notification - The notification details
   * @returns Promise<void>
   */
  public static async send(notification: NtfyNotification): Promise<void> {
    this.initialize();

    if (!this.ntfyUrl) {
      // Silently skip if not configured
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'text/plain',
        'Title': notification.title,
      };

      if (notification.priority) {
        headers.Priority = notification.priority.toString();
      }

      if (notification.tags && notification.tags.length > 0) {
        headers.Tags = notification.tags.join(',');
      }

      const response = await fetch(this.ntfyUrl, {
        method: 'POST',
        headers,
        body: notification.message,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      signale.success(`[NTFY] Sent notification: ${notification.title}`);
    } catch (error) {
      signale.error('[NTFY] Failed to send notification:', error);
      // Don't throw - notifications should not break the main flow
    }
  }

  /**
   * Send a high-priority notification
   */
  public static async sendHigh(title: string, message: string, tags?: NtfyTag[]): Promise<void> {
    await this.send({
      title,
      message,
      priority: NtfyPriority.HIGH,
      tags,
    });
  }

  /**
   * Send a max-priority urgent notification
   */
  public static async sendUrgent(title: string, message: string, tags?: NtfyTag[]): Promise<void> {
    await this.send({
      title,
      message,
      priority: NtfyPriority.MAX,
      tags,
    });
  }

  /**
   * Send a low-priority informational notification
   */
  public static async sendInfo(title: string, message: string, tags?: NtfyTag[]): Promise<void> {
    await this.send({
      title,
      message,
      priority: NtfyPriority.LOW,
      tags,
    });
  }

  /**
   * Send a default priority notification
   */
  public static async sendDefault(title: string, message: string, tags?: NtfyTag[]): Promise<void> {
    await this.send({
      title,
      message,
      priority: NtfyPriority.DEFAULT,
      tags,
    });
  }

  /**
   * Notify about a new project creation
   */
  public static async notifyProjectCreated(projectName: string, projectId: string, userId: string): Promise<void> {
    await this.sendDefault(
      'New Project Created',
      `Project "${projectName}" (${projectId}) was created by user ${userId}`,
      [NtfyTag.ROCKET, NtfyTag.SUCCESS],
    );
  }

  // ===== Event-specific notification helpers =====

  /**
   * Notify about project disabled due to security risk
   */
  public static async notifyProjectDisabledForSecurity(
    projectName: string,
    projectId: string,
    violations: string[],
  ): Promise<void> {
    const violationText = violations.join(', ');
    await this.sendUrgent(
      'Project Disabled - Security Risk',
      `Project "${projectName}" (${projectId}) was automatically disabled due to: ${violationText}`,
      [NtfyTag.SHIELD, NtfyTag.ERROR, NtfyTag.SKULL],
    );
  }

  /**
   * Notify about project deletion - DEFAULT priority
   */
  public static async notifyProjectDeleted(projectName: string, projectId: string, userId: string): Promise<void> {
    await this.sendDefault('Project Deleted', `Project "${projectName}" (${projectId}) was deleted by user ${userId}`, [
      NtfyTag.WARNING,
    ]);
  }

  /**
   * Notify about security warning (non-critical)
   */
  public static async notifySecurityWarning(projectName: string, projectId: string, warnings: string[]): Promise<void> {
    // Import redis at runtime to avoid circular dependencies
    const {redis} = await import('../database/redis.js');

    const cacheKey = `ntfy:security:warning:${projectId}`;
    const ttl = 3600; // 1 hour

    // Use SETNX to atomically check and set the flag (prevents race conditions)
    const wasSet = await redis.set(cacheKey, '1', 'EX', ttl, 'NX');
    if (!wasSet) {
      return;
    }

    const warningText = warnings.join(', ');
    await this.sendDefault(
      'Security Warning',
      `Project "${projectName}" (${projectId}) has security warnings: ${warningText}`,
      [NtfyTag.WARNING, NtfyTag.SHIELD],
    );
  }

  /**
   * Notify about email bounce - LOW priority (high volume)
   * Rate-limited to only send notification every 20 bounces with latest 20 bounce details
   */
  public static async notifyEmailBounce(
    projectName: string,
    projectId: string,
    recipientEmail: string,
    bounceType?: string,
  ): Promise<void> {
    // Import redis at runtime to avoid circular dependencies
    const {redis} = await import('../database/redis.js');

    // Use Redis counters to track bounce count globally
    const globalCountKey = `ntfy:bounce:count`;
    const bounceListKey = `ntfy:bounce:latest`;

    // Increment global counter
    const globalCount = await redis.incr(globalCountKey);

    // Store this bounce event in a list (keep latest 20)
    const bounceEvent = JSON.stringify({
      projectName,
      projectId,
      recipientEmail,
      bounceType: bounceType || 'Unknown',
      timestamp: new Date().toISOString(),
    });
    await redis.lpush(bounceListKey, bounceEvent);
    await redis.ltrim(bounceListKey, 0, 19); // Keep only latest 20

    // Set expiry on first increment (24 hour rolling window)
    if (globalCount === 1) {
      await redis.expire(globalCountKey, 86400);
      await redis.expire(bounceListKey, 86400);
    }

    // Only send notification every 20 bounces
    if (globalCount % 20 === 0) {
      // Get the latest 20 bounces
      const latestBounces = await redis.lrange(bounceListKey, 0, 19);

      // Parse and format the bounce events
      const bounceDetails = latestBounces
        .map(bounce => {
          try {
            const parsed = JSON.parse(bounce);
            return `  • ${parsed.recipientEmail} (${parsed.bounceType}) - ${parsed.projectName}`;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .join('\n');

      await this.send({
        title: 'Email Bounces',
        message: `20 email bounces detected (total: ${globalCount})\n\nLatest 20 bounces:\n${bounceDetails}`,
        priority: NtfyPriority.LOW,
        tags: [NtfyTag.WARNING],
      });
    }
  }

  /**
   * Notify about email complaint - HIGH priority (reputation risk)
   */
  public static async notifyEmailComplaint(
    projectName: string,
    projectId: string,
    recipientEmail: string,
  ): Promise<void> {
    await this.sendHigh(
      'Email Complaint',
      `Email complaint received from ${recipientEmail} in project "${projectName}" (${projectId})`,
      [NtfyTag.WARNING, NtfyTag.ERROR],
    );
  }

  /**
   * Notify about new user account created via signup - LOW priority
   */
  public static async notifyUserSignup(userEmail: string, userId: string): Promise<void> {
    await this.send({
      title: 'New User Signup',
      message: `New user registered: ${userEmail} (${userId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.ROCKET, NtfyTag.SUCCESS],
    });
  }

  /**
   * Notify about failed signup attempt with invalid email - LOW priority
   */
  public static async notifyFailedSignupAttempt(email: string, reasons: string[]): Promise<void> {
    const reasonText = reasons.join(', ');
    await this.send({
      title: 'Failed Signup - Invalid Email',
      message: `Signup attempt blocked for email: ${email}\nReasons: ${reasonText}`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.WARNING, NtfyTag.SHIELD],
    });
  }

  /**
   * Notify about new user account created via OAuth - LOW priority
   */
  public static async notifyUserOAuthSignup(
    userEmail: string,
    userId: string,
    provider: 'GitHub' | 'Google',
  ): Promise<void> {
    await this.send({
      title: `New User - ${provider} OAuth`,
      message: `New user registered via ${provider}: ${userEmail} (${userId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.ROCKET, NtfyTag.SUCCESS],
    });
  }

  /**
   * Notify about campaign created (draft) - LOW priority
   */
  public static async notifyCampaignCreated(
    campaignName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.send({
      title: 'Campaign Created',
      message: `Campaign "${campaignName}" created in project "${projectName}" (${projectId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.ROCKET],
    });
  }

  // ===== Campaign event notifications =====

  /**
   * Notify about campaign scheduled - DEFAULT priority
   */
  public static async notifyCampaignScheduled(
    campaignName: string,
    projectName: string,
    projectId: string,
    scheduledFor: Date,
    recipientCount: number,
  ): Promise<void> {
    await this.sendDefault(
      'Campaign Scheduled',
      `Campaign "${campaignName}" scheduled to send to ${recipientCount} recipients at ${scheduledFor.toISOString()} in project "${projectName}" (${projectId})`,
      [NtfyTag.ROCKET, NtfyTag.INFO],
    );
  }

  /**
   * Notify about campaign sending started - LOW priority (informational)
   */
  public static async notifyCampaignSendingStarted(
    campaignName: string,
    projectName: string,
    projectId: string,
    recipientCount: number,
  ): Promise<void> {
    await this.send({
      title: 'Campaign Sending Started',
      message: `Campaign "${campaignName}" started sending to ${recipientCount} recipients in project "${projectName}" (${projectId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.ROCKET, NtfyTag.CHART],
    });
  }

  /**
   * Notify about campaign send completed - DEFAULT priority
   */
  public static async notifyCampaignSendCompleted(
    campaignName: string,
    projectName: string,
    projectId: string,
    recipientCount: number,
  ): Promise<void> {
    await this.sendDefault(
      'Campaign Send Completed',
      `Campaign "${campaignName}" successfully sent to ${recipientCount} recipients in project "${projectName}" (${projectId})`,
      [NtfyTag.ROCKET, NtfyTag.SUCCESS],
    );
  }

  /**
   * Notify about campaign cancelled - LOW priority
   */
  public static async notifyCampaignCancelled(
    campaignName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.send({
      title: 'Campaign Cancelled',
      message: `Campaign "${campaignName}" was cancelled in project "${projectName}" (${projectId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.WARNING],
    });
  }

  /**
   * Notify about campaign deleted - LOW priority
   */
  public static async notifyCampaignDeleted(
    campaignName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.send({
      title: 'Campaign Deleted',
      message: `Campaign "${campaignName}" was deleted from project "${projectName}" (${projectId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.INFO],
    });
  }

  /**
   * Notify about workflow created - LOW priority
   */
  public static async notifyWorkflowCreated(
    workflowName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.send({
      title: 'Workflow Created',
      message: `Workflow "${workflowName}" created in project "${projectName}" (${projectId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.ROCKET],
    });
  }

  // ===== Workflow event notifications =====

  /**
   * Notify about workflow enabled
   */
  public static async notifyWorkflowEnabled(
    workflowName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.sendDefault(
      'Workflow Enabled',
      `Workflow "${workflowName}" is now active in project "${projectName}" (${projectId})`,
      [NtfyTag.SUCCESS],
    );
  }

  /**
   * Notify about workflow disabled
   */
  public static async notifyWorkflowDisabled(
    workflowName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.sendDefault(
      'Workflow Disabled',
      `Workflow "${workflowName}" has been disabled in project "${projectName}" (${projectId})`,
      [NtfyTag.WARNING],
    );
  }

  /**
   * Notify about workflow deleted - LOW priority
   */
  public static async notifyWorkflowDeleted(
    workflowName: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.send({
      title: 'Workflow Deleted',
      message: `Workflow "${workflowName}" was deleted from project "${projectName}" (${projectId})`,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.INFO],
    });
  }

  /**
   * Notify about workflow execution failed
   */
  public static async notifyWorkflowExecutionFailed(
    workflowName: string,
    projectName: string,
    projectId: string,
    contactEmail: string,
    error: string,
  ): Promise<void> {
    await this.sendHigh(
      'Workflow Execution Failed',
      `Workflow "${workflowName}" failed for contact ${contactEmail} in project "${projectName}" (${projectId}). Error: ${error}`,
      [NtfyTag.ERROR, NtfyTag.WARNING],
    );
  }

  /**
   * Notify about domain added
   */
  public static async notifyDomainAdded(domain: string, projectName: string, projectId: string): Promise<void> {
    await this.sendDefault(
      'Domain Added',
      `Domain "${domain}" added for verification in project "${projectName}" (${projectId})`,
      [NtfyTag.INFO],
    );
  }

  // ===== Domain verification notifications =====

  /**
   * Notify about domain verified
   */
  public static async notifyDomainVerified(domain: string, projectName: string, projectId: string): Promise<void> {
    await this.sendDefault(
      'Domain Verified',
      `Domain "${domain}" is now verified and ready for use in project "${projectName}" (${projectId})`,
      [NtfyTag.SUCCESS, NtfyTag.SHIELD],
    );
  }

  /**
   * Notify about domain verification failed
   */
  public static async notifyDomainVerificationFailed(
    domain: string,
    projectName: string,
    projectId: string,
  ): Promise<void> {
    await this.sendHigh(
      'Domain Verification Failed',
      `Domain "${domain}" failed verification in project "${projectName}" (${projectId}). Email sending may be affected.`,
      [NtfyTag.WARNING, NtfyTag.SHIELD],
    );
  }

  /**
   * Notify about domain removed
   */
  public static async notifyDomainRemoved(domain: string, projectName: string, projectId: string): Promise<void> {
    await this.sendInfo(
      'Domain Removed',
      `Domain "${domain}" was removed from project "${projectName}" (${projectId})`,
      [NtfyTag.INFO],
    );
  }

  /**
   * Notify about API keys regenerated
   */
  public static async notifyApiKeysRegenerated(projectName: string, projectId: string, userId: string): Promise<void> {
    await this.sendHigh(
      'API Keys Regenerated',
      `API keys for project "${projectName}" (${projectId}) were regenerated by user ${userId}`,
      [NtfyTag.SHIELD, NtfyTag.WARNING],
    );
  }

  // ===== API key notifications =====

  /**
   * Notify about contact import started - MIN priority (routine, high volume)
   */
  public static async notifyContactImportStarted(
    projectName: string,
    projectId: string,
    filename: string,
    totalRows: number,
  ): Promise<void> {
    await this.send({
      title: 'Contact Import Started',
      message: `Importing ${totalRows} contacts from "${filename}" into project "${projectName}" (${projectId})`,
      priority: NtfyPriority.MIN,
      tags: [NtfyTag.ROCKET],
    });
  }

  // ===== Contact import notifications =====

  /**
   * Notify about contact import completed
   */
  public static async notifyContactImportCompleted(
    projectName: string,
    projectId: string,
    filename: string,
    successCount: number,
    createdCount: number,
    updatedCount: number,
    failureCount: number,
  ): Promise<void> {
    await this.sendDefault(
      'Contact Import Completed',
      `Import "${filename}" completed for project "${projectName}" (${projectId}). Success: ${successCount} (${createdCount} new, ${updatedCount} updated), Errors: ${failureCount}`,
      [NtfyTag.SUCCESS, NtfyTag.CHART],
    );
  }

  /**
   * Notify about contact import failed
   */
  public static async notifyContactImportFailed(
    projectName: string,
    projectId: string,
    filename: string,
    error: string,
  ): Promise<void> {
    await this.sendHigh(
      'Contact Import Failed',
      `Contact import "${filename}" failed for project "${projectName}" (${projectId}). Error: ${error}`,
      [NtfyTag.ERROR],
    );
  }

  /**
   * Notify about segment created - MIN priority
   */
  public static async notifySegmentCreated(segmentName: string, projectName: string, projectId: string): Promise<void> {
    await this.send({
      title: 'Segment Created',
      message: `Segment "${segmentName}" created in project "${projectName}" (${projectId})`,
      priority: NtfyPriority.MIN,
      tags: [NtfyTag.INFO],
    });
  }

  // ===== Segment notifications =====

  /**
   * Notify about segment membership computed - LOW priority
   */
  public static async notifySegmentMembershipComputed(
    segmentName: string,
    projectName: string,
    projectId: string,
    memberCount: number,
    added?: number,
    removed?: number,
  ): Promise<void> {
    let message = `Segment "${segmentName}" in project "${projectName}" (${projectId}) now has ${memberCount} members`;

    if (added !== undefined && removed !== undefined) {
      const changes: string[] = [];
      if (added > 0) changes.push(`+${added} added`);
      if (removed > 0) changes.push(`-${removed} removed`);
      if (changes.length > 0) {
        message += ` (${changes.join(', ')})`;
      }
    }

    await this.send({
      title: 'Segment Membership Updated',
      message,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.CHART],
    });
  }

  /**
   * Notify about bundled segment membership updates - LOW priority
   * Used when multiple segments are updated in a single processing cycle
   */
  public static async notifySegmentMembershipBundled(
    projectName: string,
    projectId: string,
    segmentCount: number,
    totalAdded: number,
    totalRemoved: number,
  ): Promise<void> {
    const changes: string[] = [];
    if (totalAdded > 0) changes.push(`+${totalAdded} added`);
    if (totalRemoved > 0) changes.push(`-${totalRemoved} removed`);

    const changesText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
    const message = `${segmentCount} segment${segmentCount > 1 ? 's' : ''} updated in project "${projectName}" (${projectId})${changesText}`;

    await this.send({
      title: 'Segment Memberships Updated',
      message,
      priority: NtfyPriority.LOW,
      tags: [NtfyTag.CHART],
    });
  }

  /**
   * Notify about segment deleted - MIN priority
   */
  public static async notifySegmentDeleted(segmentName: string, projectName: string, projectId: string): Promise<void> {
    await this.send({
      title: 'Segment Deleted',
      message: `Segment "${segmentName}" was deleted from project "${projectName}" (${projectId})`,
      priority: NtfyPriority.MIN,
      tags: [NtfyTag.INFO],
    });
  }

  /**
   * Initialize the ntfy service with the configured URL
   */
  private static initialize(): void {
    if (this.isConfigured) {
      return;
    }

    this.ntfyUrl = process.env.NTFY_URL || null;
    this.isConfigured = true;

    if (!this.ntfyUrl) {
      signale.warn('[NTFY] NTFY_URL not configured - notifications will be skipped');
    } else {
      signale.info(`[NTFY] Initialized with URL: ${this.ntfyUrl}`);
    }
  }
}

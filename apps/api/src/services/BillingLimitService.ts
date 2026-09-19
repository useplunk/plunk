import {EmailSourceType, EmailStatus} from '@plunk/db';
import type {BillingLimitsResponse, CategoryUsage, LimitCheckResult} from '@plunk/types';
import {BillingLimitExceededEmail, BillingLimitWarningEmail, sendPlatformEmail} from '@plunk/email';
import React from 'react';
import signale from 'signale';

import {DASHBOARD_URI, LANDING_URI, STRIPE_ENABLED} from '../app/constants.js';
import {stripe} from '../app/stripe.js';
import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';
import {MembershipService} from './MembershipService.js';
import {NtfyService} from './NtfyService.js';

/**
 * Billing Limit Service
 * Handles usage tracking and enforcement of billing limits per email category
 *
 * FREE TIER LIMITS:
 * - Free tier projects (billing enabled, no subscription) have a total limit of 1000 emails/month
 * - This limit is shared across all email types (workflows + campaigns + transactional)
 * - Paid tier projects (with subscription) can have custom per-category limits or unlimited
 *
 * WHAT COUNTS AS USAGE:
 * - Usage mirrors what Stripe is actually metered for, so the limit a customer sees can never
 *   exceed the invoice they get. Stripe is metered in exactly two places: the send path, after
 *   SES accepted the message (`email-processor.ts`), and inbound receipt (`Webhooks.ts`).
 * - FAILED is therefore excluded: it is the one terminal state an email reaches without ever
 *   being metered -- a disabled project flipping its PENDING backlog, a workflow email to an
 *   unsubscribed contact, or SES rejecting the send. Counting those billed customers for mail
 *   that never left the building.
 * - PENDING and SENDING still count. The limit is checked before the rows exist, and a campaign
 *   is checked once for the whole batch, so in-flight mail must hold its own quota or a second
 *   campaign would sail past a cap the first one already consumed.
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Operates at scale with 1M+ contacts/month (potentially millions of emails)
 * - Uses Redis caching (5-min TTL) to avoid expensive DB queries on every email send
 * - Composite index on (projectId, sourceType, createdAt) enables fast filtered counts. The
 *   FAILED exclusion below is not in that index, so it costs a heap fetch per row in the
 *   range; the 5-minute cache keeps that to roughly one query per project per category per
 *   five minutes rather than one per send. Revisit if that count ever leaves the cache.
 * - Graceful degradation: cache misses fall back to DB without blocking
 * - Non-blocking: errors are logged but don't prevent email sending
 */
export class BillingLimitService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly WARNING_THRESHOLD = 0.8; // 80%
  private static readonly FREE_TIER_TOTAL_LIMIT = 1000; // Total emails per month for free tier projects

  /**
   * Get total usage count across all email categories
   * Used for free tier total limit enforcement
   *
   * @param projectId - Project ID
   * @returns Total email count for the calendar month (all types combined)
   */
  public static async getTotalUsage(projectId: string): Promise<number> {
    const {start, end} = this.getCurrentMonthRange();

    try {
      const count = await prisma.email.count({
        where: {
          projectId,
          // Never metered, so never counted -- see WHAT COUNTS AS USAGE above.
          status: {not: EmailStatus.FAILED},
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      });

      return count;
    } catch (error) {
      signale.error(`[BILLING_LIMIT] Failed to query total usage for ${projectId}:`, error);
      return 0; // Return 0 on error to avoid blocking
    }
  }

  /**
   * Get current usage count for a specific email category
   * Uses Redis cache with 5-minute TTL to minimize DB queries
   *
   * @param projectId - Project ID
   * @param sourceType - Email category (TRANSACTIONAL, CAMPAIGN, WORKFLOW)
   * @returns Current usage count for the calendar month
   */
  public static async getUsage(projectId: string, sourceType: EmailSourceType): Promise<number> {
    const cacheKey = this.getCacheKey(projectId, sourceType);

    try {
      // Try to get from cache first
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return parseInt(cached, 10);
      }
    } catch (error) {
      signale.warn(`[BILLING_LIMIT] Cache read failed for ${cacheKey}:`, error);
      // Continue to DB query on cache failure
    }

    // Cache miss - query database
    const {start, end} = this.getCurrentMonthRange();

    try {
      const count = await prisma.email.count({
        where: {
          projectId,
          sourceType,
          // Never metered, so never counted -- see WHAT COUNTS AS USAGE above.
          status: {not: EmailStatus.FAILED},
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      });

      // Cache the result
      try {
        await redis.setex(cacheKey, this.CACHE_TTL, count.toString());
      } catch (error) {
        signale.warn(`[BILLING_LIMIT] Failed to cache usage for ${cacheKey}:`, error);
      }

      return count;
    } catch (error) {
      signale.error(`[BILLING_LIMIT] Failed to query usage for ${projectId}/${sourceType}:`, error);
      return 0; // Return 0 on error to avoid blocking
    }
  }

  /**
   * Increment usage counter in cache (called after successful email send)
   * This keeps the cache accurate without requiring frequent DB queries
   *
   * @param projectId - Project ID
   * @param sourceType - Email category
   */
  public static async incrementUsage(projectId: string, sourceType: EmailSourceType): Promise<void> {
    const cacheKey = this.getCacheKey(projectId, sourceType);

    try {
      const exists = await redis.exists(cacheKey);
      if (exists) {
        // Only increment if key exists (was previously cached)
        await redis.incr(cacheKey);
      }
      // If not cached, next getUsage call will fetch from DB
    } catch (error) {
      signale.warn(`[BILLING_LIMIT] Failed to increment usage cache for ${cacheKey}:`, error);
      // Non-blocking: continue even if cache increment fails
    }
  }

  /**
   * Check if sending an email would exceed the billing limit
   * Returns detailed result including warning status
   *
   * For free tier projects (no subscription): checks total usage across all categories against 1000/month limit
   * For paid tier projects (with subscription): checks per-category limits if set
   *
   * @param projectId - Project ID
   * @param sourceType - Email category
   * @returns LimitCheckResult with allowed/warning status
   */
  public static async checkLimit(projectId: string, sourceType: EmailSourceType): Promise<LimitCheckResult> {
    try {
      // Get project billing info
      const project = await prisma.project.findUnique({
        where: {id: projectId},
        select: {
          name: true,
          subscription: true,
          billingLimitWorkflows: true,
          billingLimitCampaigns: true,
          billingLimitTransactional: true,
          billingLimitInbound: true,
        },
      });

      if (!project) {
        signale.warn(`[BILLING_LIMIT] Project ${projectId} not found`);
        return {
          allowed: true,
          warning: false,
          usage: 0,
          limit: null,
          percentage: 0,
        };
      }

      // Determine which limit to use based on source type
      let limit: number | null;
      switch (sourceType) {
        case EmailSourceType.WORKFLOW:
          limit = project.billingLimitWorkflows;
          break;
        case EmailSourceType.CAMPAIGN:
          limit = project.billingLimitCampaigns;
          break;
        case EmailSourceType.TRANSACTIONAL:
          limit = project.billingLimitTransactional;
          break;
        case EmailSourceType.INBOUND:
          limit = project.billingLimitInbound;
          break;
        default:
          limit = null;
      }

      // Check if any custom per-category limits are set
      const hasCustomLimits =
        project.billingLimitWorkflows !== null ||
        project.billingLimitCampaigns !== null ||
        project.billingLimitTransactional !== null ||
        project.billingLimitInbound !== null;

      // Free tier projects (no subscription and no custom limits): enforce total 1000 email/month limit
      // Only enforce free tier limits if billing is enabled
      if (STRIPE_ENABLED && !project.subscription && !hasCustomLimits) {
        const totalUsage = await this.getTotalUsage(projectId);
        const freeLimit = this.FREE_TIER_TOTAL_LIMIT;
        const percentage = (totalUsage / freeLimit) * 100;

        // Check if blocked (at or over limit)
        if (totalUsage >= freeLimit) {
          await NtfyService.notifyBillingLimitExceeded(
            project.name,
            projectId,
            totalUsage,
            freeLimit,
            EmailSourceType.TRANSACTIONAL, // Use generic type for notification
          );

          // Send email notification
          await this.sendLimitExceededEmail(projectId, project.name, totalUsage, freeLimit, 'Free Tier (All Types)');

          return {
            allowed: false,
            warning: false,
            usage: totalUsage,
            limit: freeLimit,
            percentage,
            message: `Free tier limit reached. You've sent ${totalUsage}/${freeLimit} emails this month. Upgrade to continue sending.`,
          };
        }

        // Check if warning (80% or more)
        const isWarning = percentage >= this.WARNING_THRESHOLD * 100;
        if (isWarning) {
          await NtfyService.notifyBillingLimitApproaching(
            project.name,
            projectId,
            totalUsage,
            freeLimit,
            percentage,
            EmailSourceType.TRANSACTIONAL, // Use generic type for notification
          );

          // Send email notification (only once per month)
          await this.sendWarningEmail(
            projectId,
            project.name,
            totalUsage,
            freeLimit,
            percentage,
            'Free Tier (All Types)',
          );
        }

        return {
          allowed: true,
          warning: isWarning,
          usage: totalUsage,
          limit: freeLimit,
          percentage,
          message: isWarning
            ? `Warning: You've used ${Math.round(percentage)}% of your free tier limit (${totalUsage}/${freeLimit} emails)`
            : undefined,
        };
      }

      // If no limit set for paid tier, allow unlimited
      if (limit === null) {
        return {
          allowed: true,
          warning: false,
          usage: 0,
          limit: null,
          percentage: 0,
        };
      }

      // Get current usage
      const usage = await this.getUsage(projectId, sourceType);
      const percentage = limit > 0 ? (usage / limit) * 100 : 0;

      // Check if blocked (at or over limit)
      if (usage >= limit) {
        // Get project name for notification
        const project = await prisma.project.findUnique({
          where: {id: projectId},
          select: {name: true},
        });

        if (project) {
          // Send notification about limit exceeded
          await NtfyService.notifyBillingLimitExceeded(project.name, projectId, usage, limit, sourceType);

          // Send email notification
          await this.sendLimitExceededEmail(projectId, project.name, usage, limit, sourceType);
        }

        return {
          allowed: false,
          warning: false,
          usage,
          limit,
          percentage,
          message: `Billing limit reached for ${sourceType.toLowerCase()} emails. Current usage: ${usage}/${limit} (${Math.round(percentage)}%)`,
        };
      }

      // Check if warning (80% or more)
      const isWarning = percentage >= this.WARNING_THRESHOLD * 100;

      // Send notification for warning threshold
      if (isWarning) {
        const project = await prisma.project.findUnique({
          where: {id: projectId},
          select: {name: true},
        });

        if (project) {
          await NtfyService.notifyBillingLimitApproaching(
            project.name,
            projectId,
            usage,
            limit,
            percentage,
            sourceType,
          );

          // Send email notification (only once per month)
          await this.sendWarningEmail(projectId, project.name, usage, limit, percentage, sourceType);
        }
      }

      return {
        allowed: true,
        warning: isWarning,
        usage,
        limit,
        percentage,
        message: isWarning
          ? `Warning: ${sourceType.toLowerCase()} emails at ${Math.round(percentage)}% of limit (${usage}/${limit})`
          : undefined,
      };
    } catch (error) {
      signale.error(`[BILLING_LIMIT] Error checking limit for ${projectId}/${sourceType}:`, error);
      // On error, allow the email to prevent service disruption
      return {
        allowed: true,
        warning: false,
        usage: 0,
        limit: null,
        percentage: 0,
      };
    }
  }

  /**
   * Get complete billing limits and usage for all categories
   * Used for displaying limits in UI
   *
   * For free tier projects: shows total usage across all categories with 1000/month limit
   * For paid tier projects: shows per-category usage with custom limits
   *
   * @param projectId - Project ID
   * @returns Complete billing limits and usage information
   */
  public static async getLimitsAndUsage(projectId: string): Promise<BillingLimitsResponse> {
    try {
      // Get project info
      const project = await prisma.project.findUnique({
        where: {id: projectId},
        select: {
          customer: true,
          subscription: true,
          billingLimitWorkflows: true,
          billingLimitCampaigns: true,
          billingLimitTransactional: true,
          billingLimitInbound: true,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Get currency from Stripe customer if available
      let currency: string | null = null;
      if (stripe && project.customer) {
        try {
          const customer = await stripe.customers.retrieve(project.customer);
          if (!customer.deleted) {
            currency = customer.currency || 'usd';
          }
        } catch (error) {
          signale.warn(`[BILLING_LIMIT] Failed to fetch currency for customer ${project.customer}:`, error);
          // Continue without currency - will be null in response
        }
      }

      // Get usage for all categories in parallel
      const [workflowUsage, campaignUsage, transactionalUsage, inboundUsage] = await Promise.all([
        this.getUsage(projectId, EmailSourceType.WORKFLOW),
        this.getUsage(projectId, EmailSourceType.CAMPAIGN),
        this.getUsage(projectId, EmailSourceType.TRANSACTIONAL),
        this.getUsage(projectId, EmailSourceType.INBOUND),
      ]);

      // Helper to calculate category usage
      const calculateCategoryUsage = (usage: number, limit: number | null): CategoryUsage => {
        const percentage = limit !== null && limit > 0 ? (usage / limit) * 100 : 0;
        return {
          limit,
          usage,
          percentage,
          isWarning: limit !== null && percentage >= this.WARNING_THRESHOLD * 100,
          isBlocked: limit !== null && usage >= limit,
        };
      };

      // Check if any custom per-category limits are set
      const hasCustomLimits =
        project.billingLimitWorkflows !== null ||
        project.billingLimitCampaigns !== null ||
        project.billingLimitTransactional !== null ||
        project.billingLimitInbound !== null;

      // Free tier projects (no subscription and no custom limits): show total usage with shared limit
      // Only show free tier limits if billing is enabled
      if (STRIPE_ENABLED && !project.subscription && !hasCustomLimits) {
        const totalUsage = workflowUsage + campaignUsage + transactionalUsage + inboundUsage;
        const limit = this.FREE_TIER_TOTAL_LIMIT;
        const percentage = (totalUsage / limit) * 100;
        const isWarning = percentage >= this.WARNING_THRESHOLD * 100;
        const isBlocked = totalUsage >= limit;

        // For free tier, show the same limit and total usage for all four categories
        // This makes it clear in the UI that it's a shared limit
        const sharedUsageInfo: CategoryUsage = {
          limit,
          usage: totalUsage,
          percentage,
          isWarning,
          isBlocked,
        };

        return {
          workflows: sharedUsageInfo,
          campaigns: sharedUsageInfo,
          transactional: sharedUsageInfo,
          inbound: sharedUsageInfo,
          currency,
        };
      }

      // Projects with subscription or custom limits: show per-category limits
      return {
        workflows: calculateCategoryUsage(workflowUsage, project.billingLimitWorkflows),
        campaigns: calculateCategoryUsage(campaignUsage, project.billingLimitCampaigns),
        transactional: calculateCategoryUsage(transactionalUsage, project.billingLimitTransactional),
        inbound: calculateCategoryUsage(inboundUsage, project.billingLimitInbound),
        currency,
      };
    } catch (error) {
      signale.error(`[BILLING_LIMIT] Error getting limits and usage for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate usage cache for a project
   * Primarily used in tests to reset cache state between scenarios.
   * In production, the cache naturally expires after 5 minutes.
   *
   * NOTE: Updating billing limits does NOT require clearing usage cache
   * (use clearNotificationCacheForChangedLimits instead)
   *
   * @param projectId - Project ID
   */
  public static async invalidateCache(projectId: string): Promise<void> {
    try {
      const keys = [
        this.getCacheKey(projectId, EmailSourceType.WORKFLOW),
        this.getCacheKey(projectId, EmailSourceType.CAMPAIGN),
        this.getCacheKey(projectId, EmailSourceType.TRANSACTIONAL),
        this.getCacheKey(projectId, EmailSourceType.INBOUND),
      ];

      await Promise.all(keys.map(key => redis.del(key)));
      signale.debug(`[BILLING_LIMIT] Invalidated cache for project ${projectId}`);
    } catch (error) {
      signale.warn(`[BILLING_LIMIT] Failed to invalidate cache for ${projectId}:`, error);
    }
  }

  /**
   * Clear notification cache keys for billing limits that have changed
   * This allows new warning/limit emails to be sent when updated limits are reached
   *
   * @param projectId - Project ID
   * @param oldLimits - Previous billing limits
   * @param newLimits - New billing limits
   */
  public static async clearNotificationCacheForChangedLimits(
    projectId: string,
    oldLimits: {
      workflows: number | null;
      campaigns: number | null;
      transactional: number | null;
      inbound: number | null;
    },
    newLimits: {
      workflows: number | null;
      campaigns: number | null;
      transactional: number | null;
      inbound: number | null;
    },
  ): Promise<void> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      const keysToDelete: string[] = [];

      // Check workflows limit
      if (oldLimits.workflows !== newLimits.workflows) {
        keysToDelete.push(
          Keys.Billing.warningEmail(projectId, EmailSourceType.WORKFLOW, year, month),
          Keys.Billing.limitEmail(projectId, EmailSourceType.WORKFLOW, year, month),
        );
      }

      // Check campaigns limit
      if (oldLimits.campaigns !== newLimits.campaigns) {
        keysToDelete.push(
          Keys.Billing.warningEmail(projectId, EmailSourceType.CAMPAIGN, year, month),
          Keys.Billing.limitEmail(projectId, EmailSourceType.CAMPAIGN, year, month),
        );
      }

      // Check transactional limit
      if (oldLimits.transactional !== newLimits.transactional) {
        keysToDelete.push(
          Keys.Billing.warningEmail(projectId, EmailSourceType.TRANSACTIONAL, year, month),
          Keys.Billing.limitEmail(projectId, EmailSourceType.TRANSACTIONAL, year, month),
        );
      }

      // Check inbound limit
      if (oldLimits.inbound !== newLimits.inbound) {
        keysToDelete.push(
          Keys.Billing.warningEmail(projectId, EmailSourceType.INBOUND, year, month),
          Keys.Billing.limitEmail(projectId, EmailSourceType.INBOUND, year, month),
        );
      }

      if (keysToDelete.length > 0) {
        await Promise.all(keysToDelete.map(key => redis.del(key)));
        signale.debug(
          `[BILLING_LIMIT] Cleared notification cache for changed limits in project ${projectId} (${keysToDelete.length} keys)`,
        );
      }
    } catch (error) {
      signale.warn(`[BILLING_LIMIT] Failed to clear notification cache for ${projectId}:`, error);
    }
  }

  /**
   * Get Redis cache key for usage count
   */
  private static getCacheKey(projectId: string, sourceType: EmailSourceType): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return Keys.Billing.usage(projectId, sourceType, year, month);
  }

  /**
   * Get start and end dates for current calendar month
   */
  private static getCurrentMonthRange(): {start: Date; end: Date} {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {start, end};
  }

  /**
   * Send billing limit warning email to project members
   */
  private static async sendWarningEmail(
    projectId: string,
    projectName: string,
    usage: number,
    limit: number,
    percentage: number,
    sourceType: string,
  ): Promise<void> {
    try {
      // Check if we've already sent this warning email this month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const cacheKey = Keys.Billing.warningEmail(projectId, sourceType, year, month);

      // Use SETNX (SET if Not eXists) to atomically check and set the flag
      // This prevents race conditions where multiple concurrent requests could all pass the check
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const ttl = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);

      // SETNX returns 1 if key was set (didn't exist), 0 if key already existed
      const wasSet = await redis.set(cacheKey, '1', 'EX', ttl, 'NX');
      if (!wasSet) {
        // Email was already sent this month
        return;
      }

      const members = await MembershipService.getMembers(projectId);
      const emails = members.map(m => m.email);
      if (emails.length === 0) {
        return;
      }

      const template = React.createElement(BillingLimitWarningEmail, {
        projectName,
        projectId,
        usage,
        limit,
        percentage,
        sourceType,
        dashboardUrl: DASHBOARD_URI,
        landingUrl: LANDING_URI,
      });

      await Promise.all(emails.map(email => sendPlatformEmail(email, 'Billing Limit Warning', template)));
    } catch (error) {
      signale.error(`[BILLING_LIMIT] Failed to send warning email:`, error);
    }
  }

  /**
   * Send billing limit exceeded email to project members
   */
  private static async sendLimitExceededEmail(
    projectId: string,
    projectName: string,
    usage: number,
    limit: number,
    sourceType: string,
  ): Promise<void> {
    try {
      // Check if we've already sent this warning email this month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const cacheKey = Keys.Billing.limitEmail(projectId, sourceType, year, month);

      // Use SETNX (SET if Not eXists) to atomically check and set the flag
      // This prevents race conditions where multiple concurrent requests could all pass the check
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const ttl = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);

      // SETNX returns 1 if key was set (didn't exist), 0 if key already existed
      const wasSet = await redis.set(cacheKey, '1', 'EX', ttl, 'NX');
      if (!wasSet) {
        // Email was already sent this month
        return;
      }

      const members = await MembershipService.getMembers(projectId);
      const emails = members.map(m => m.email);
      if (emails.length === 0) {
        return;
      }

      const template = React.createElement(BillingLimitExceededEmail, {
        projectName,
        projectId,
        usage,
        limit,
        sourceType,
        dashboardUrl: DASHBOARD_URI,
        landingUrl: LANDING_URI,
      });

      await Promise.all(emails.map(email => sendPlatformEmail(email, 'Billing Limit Exceeded', template)));
    } catch (error) {
      signale.error(`[BILLING_LIMIT] Failed to send limit exceeded email:`, error);
    }
  }
}

import crypto from 'crypto';

import {ProjectDisabledEmail, sendPlatformEmail} from '@plunk/email';
import React from 'react';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {redis} from '../database/redis.js';
import {Keys} from './keys.js';
import {MembershipService} from './MembershipService.js';
import {NtfyService} from './NtfyService.js';
import {ProjectService} from './ProjectService.js';
import {QueueService} from './QueueService.js';
import {
  AUTO_PROJECT_DISABLE,
  DASHBOARD_URI,
  LANDING_URI,
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  PHISHING_CONFIDENCE_THRESHOLD,
  PHISHING_CUMULATIVE_THRESHOLD,
  PHISHING_CUMULATIVE_WINDOW_MS,
  PHISHING_DETECTION_ENABLED,
  PHISHING_DETECTION_SAMPLE_RATE,
} from '../app/constants.js';

/**
 * Security thresholds for bounce and complaint rates
 * These limits protect AWS SES reputation and prevent account suspension
 */
const SECURITY_THRESHOLDS = {
  // Minimum emails required before enforcing rate-based limits (prevents false positives)
  MIN_EMAILS_FOR_ENFORCEMENT: 100,

  // Bounce rate thresholds (hard bounces only)
  BOUNCE_7DAY_WARNING: 5,
  BOUNCE_7DAY_CRITICAL: 10,
  BOUNCE_ALLTIME_WARNING: 4,
  BOUNCE_ALLTIME_CRITICAL: 8,

  // Complaint rate thresholds (spam reports)
  COMPLAINT_7DAY_WARNING: 0.075,
  COMPLAINT_7DAY_CRITICAL: 0.15,
  COMPLAINT_ALLTIME_WARNING: 0.03,
  COMPLAINT_ALLTIME_CRITICAL: 0.12,

  // Minimum absolute counts (prevents small sample size false positives)
  // Both percentage AND absolute count must be exceeded to trigger rate-based checks
  MIN_BOUNCES_FOR_CRITICAL: 10,
  MIN_BOUNCES_FOR_WARNING: 5,
  MIN_COMPLAINTS_FOR_CRITICAL: 5,
  MIN_COMPLAINTS_FOR_WARNING: 3,

  // === Absolute count ceilings ===
  // These trigger regardless of rate — catches high-volume spammers who dilute their bounce rate
  // 24-hour absolute ceilings
  BOUNCE_24H_CEILING_WARNING: 50,
  BOUNCE_24H_CEILING_CRITICAL: 100,
  COMPLAINT_24H_CEILING_WARNING: 10,
  COMPLAINT_24H_CEILING_CRITICAL: 25,

  // 7-day absolute ceilings
  BOUNCE_7DAY_CEILING_WARNING: 200,
  BOUNCE_7DAY_CEILING_CRITICAL: 500,
  COMPLAINT_7DAY_CEILING_WARNING: 30,
  COMPLAINT_7DAY_CEILING_CRITICAL: 75,

  // === New project thresholds (projects < 30 days old) ===
  // Legitimate senders ramp up gradually; spammers blast immediately
  NEW_PROJECT_AGE_DAYS: 30,
  NEW_PROJECT_BOUNCE_24H_CEILING_WARNING: 10,
  NEW_PROJECT_BOUNCE_24H_CEILING_CRITICAL: 25,
  NEW_PROJECT_BOUNCE_7DAY_CEILING_WARNING: 25,
  NEW_PROJECT_BOUNCE_7DAY_CEILING_CRITICAL: 50,
  NEW_PROJECT_COMPLAINT_24H_CEILING_WARNING: 3,
  NEW_PROJECT_COMPLAINT_24H_CEILING_CRITICAL: 7,
  NEW_PROJECT_COMPLAINT_7DAY_CEILING_WARNING: 10,
  NEW_PROJECT_COMPLAINT_7DAY_CEILING_CRITICAL: 20,
} as const;

/**
 * Redis-based tracking for phishing detections per project
 * Tracks timestamp and confidence of recent phishing detections
 * Uses sorted sets for efficient time-based filtering
 */
interface PhishingDetection {
  timestamp: number;
  confidence: number;
  subject: string;
}

/**
 * Track a phishing detection for cumulative analysis using Redis
 */
async function trackPhishingDetection(projectId: string, confidence: number, subject: string): Promise<void> {
  const now = Date.now();
  const key = `phishing:detections:${projectId}`;

  // Store detection as sorted set member (score = timestamp)
  // Value is JSON with confidence and subject
  const detection: PhishingDetection = {timestamp: now, confidence, subject};
  await redis.zadd(key, now, JSON.stringify(detection));

  // Remove detections outside the time window
  const cutoff = now - PHISHING_CUMULATIVE_WINDOW_MS;
  await redis.zremrangebyscore(key, '-inf', cutoff);

  // Set TTL to window duration to auto-cleanup old keys
  await redis.expire(key, Math.ceil(PHISHING_CUMULATIVE_WINDOW_MS / 1000));
}

/**
 * Get count of recent phishing detections for a project from Redis
 */
async function getRecentPhishingCount(projectId: string): Promise<number> {
  const now = Date.now();
  const cutoff = now - PHISHING_CUMULATIVE_WINDOW_MS;
  const key = `phishing:detections:${projectId}`;

  // Count detections within the time window
  const count = await redis.zcount(key, cutoff, '+inf');
  return count;
}

/**
 * Clear phishing detection history for a project (e.g., after disable)
 */
async function clearPhishingHistory(projectId: string): Promise<void> {
  const key = `phishing:detections:${projectId}`;
  await redis.del(key);
}

interface RateData {
  total: number;
  bounces: number;
  complaints: number;
  bounceRate: number;
  complaintRate: number;
}

interface SecurityStatus {
  projectId: string;
  isHealthy: boolean;
  shouldDisable: boolean;
  twentyFourHour: RateData;
  sevenDay: RateData;
  allTime: RateData;
  isNewProject: boolean;
  violations: string[];
  warnings: string[];
}

const SNS_CERT_HOST_RE = /^sns\.[a-z0-9-]+\.amazonaws\.(com|cn)$/;
const snsSigningCertCache = new Map<string, string>();

async function fetchSigningCert(certUrl: string): Promise<string> {
  const cached = snsSigningCertCache.get(certUrl);
  if (cached) return cached;

  const response = await fetch(certUrl);
  if (!response.ok) throw new Error(`Failed to fetch SNS signing cert: ${response.statusText}`);

  const pem = await response.text();
  snsSigningCertCache.set(certUrl, pem);
  return pem;
}

function buildSnsStringToSign(message: Record<string, string>): string {
  const fields =
    message['Type'] === 'Notification'
      ? ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
      : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];

  return fields
    .filter(key => message[key] !== undefined)
    .map(key => `${key}\n${message[key]}\n`)
    .join('');
}

export class SecurityService {
  private static readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Verify an AWS SNS message signature. Returns false if the cert URL is
   * untrusted, or the signature doesn't match.
   */
  public static async verifySnsSignature(body: Record<string, string>): Promise<boolean> {
    try {
      const certUrl = body['SigningCertURL'];
      const signature = body['Signature'];

      if (!certUrl || !signature) {
        signale.warn('[SNS] Missing SigningCertURL or Signature');
        return false;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(certUrl);
      } catch {
        signale.warn('[SNS] Unparseable SigningCertURL');
        return false;
      }

      if (parsedUrl.protocol !== 'https:' || !SNS_CERT_HOST_RE.test(parsedUrl.hostname)) {
        signale.warn(`[SNS] Untrusted SigningCertURL host: ${parsedUrl.hostname}`);
        return false;
      }

      const pem = await fetchSigningCert(certUrl);
      const stringToSign = buildSnsStringToSign(body);
      const algorithm = body['SignatureVersion'] === '2' ? 'RSA-SHA256' : 'RSA-SHA1';

      const verifier = crypto.createVerify(algorithm);
      verifier.update(stringToSign, 'utf8');
      return verifier.verify(pem, signature, 'base64');
    } catch (err) {
      signale.error('[SNS] Signature verification error:', err);
      return false;
    }
  }

  /**
   * Get security status for a project (with caching)
   */
  public static async getSecurityStatus(projectId: string): Promise<SecurityStatus> {
    try {
      // Try to get from cache first
      const cacheKey = Keys.Security.rates(projectId);
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate fresh data
      const status = await this.calculateSecurityStatus(projectId);

      // Cache the result
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(status));

      return status;
    } catch (error) {
      signale.error('[SECURITY] Failed to get security status:', error);
      // Return safe defaults on error
      return {
        projectId,
        isHealthy: true,
        shouldDisable: false,
        twentyFourHour: {
          total: 0,
          bounces: 0,
          complaints: 0,
          bounceRate: 0,
          complaintRate: 0,
        },
        sevenDay: {
          total: 0,
          bounces: 0,
          complaints: 0,
          bounceRate: 0,
          complaintRate: 0,
        },
        allTime: {
          total: 0,
          bounces: 0,
          complaints: 0,
          bounceRate: 0,
          complaintRate: 0,
        },
        isNewProject: false,
        violations: [],
        warnings: [],
      };
    }
  }

  /**
   * Check security status and auto-disable project if thresholds are exceeded
   * This should be called after bounce/complaint events are processed
   */
  public static async checkAndEnforceSecurityLimits(projectId: string): Promise<void> {
    try {
      // Invalidate cache to get fresh data
      await this.invalidateCache(projectId);

      // Get current security status
      const status = await this.getSecurityStatus(projectId);

      // If project should be disabled, disable it (only if auto-disable is enabled)
      if (status.shouldDisable && AUTO_PROJECT_DISABLE) {
        await this.disableProject(projectId, status);
      } else if (status.shouldDisable && !AUTO_PROJECT_DISABLE) {
        // Log critical violations but don't auto-disable (self-hosted mode)
        const project = await prisma.project.findUnique({
          where: {id: projectId},
          select: {name: true},
        });

        if (project) {
          signale.error(
            `[SECURITY] Project ${projectId} (${project.name}) has CRITICAL security violations but auto-disable is turned off:`,
            status.violations,
          );
          signale.info(
            `[SECURITY] 24-hour stats: ${status.twentyFourHour.bounces} bounces, ${status.twentyFourHour.complaints} complaints out of ${status.twentyFourHour.total} emails`,
          );
          signale.info(
            `[SECURITY] 7-day stats: ${status.sevenDay.bounces} bounces, ${status.sevenDay.complaints} complaints out of ${status.sevenDay.total} emails`,
          );
          signale.info(
            `[SECURITY] All-time stats: ${status.allTime.bounces} bounces, ${status.allTime.complaints} complaints out of ${status.allTime.total} emails`,
          );
          if (status.isNewProject) {
            signale.info(
              `[SECURITY] Project is under ${SECURITY_THRESHOLDS.NEW_PROJECT_AGE_DAYS} days old — stricter ceilings apply`,
            );
          }

          // Send notification about critical security violations
          await NtfyService.notifySecurityWarning(project.name, projectId, status.violations);
        }
      } else if (status.warnings.length > 0) {
        // Log warnings for monitoring
        signale.warn(`[SECURITY] Project ${projectId} has security warnings:`, status.warnings);

        // Get project name for notification
        const project = await prisma.project.findUnique({
          where: {id: projectId},
          select: {name: true},
        });

        if (project) {
          // Send notification about security warning
          await NtfyService.notifySecurityWarning(project.name, projectId, status.warnings);
        }
      }
    } catch (error) {
      // Log error but don't throw - we don't want security checks to break the webhook
      signale.error(`[SECURITY] Failed to check security limits for project ${projectId}:`, error);
    }
  }

  /**
   * Invalidate cached security data for a project
   * Should be called after bounce/complaint events
   */
  public static async invalidateCache(projectId: string): Promise<void> {
    try {
      const cacheKey = Keys.Security.rates(projectId);
      await redis.del(cacheKey);
    } catch (error) {
      signale.error(`[SECURITY] Failed to invalidate cache for project ${projectId}:`, error);
    }
  }

  /**
   * Check if a user is a member of any disabled project
   * Users with disabled projects cannot create new projects
   */
  public static async userHasDisabledProject(userId: string): Promise<{
    hasDisabledProject: boolean;
    disabledProjectNames: string[];
  }> {
    return MembershipService.userHasDisabledProject(userId);
  }

  /**
   * Check if a specific project is disabled
   */
  public static async isProjectDisabled(projectId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: {id: projectId},
      select: {disabled: true},
    });

    return project?.disabled ?? false;
  }

  /**
   * Get a project's security metrics (for dashboard display)
   * Does NOT expose internal thresholds — only computed health levels
   */
  public static async getProjectSecurityMetrics(projectId: string): Promise<{
    status: SecurityStatus;
    levels: {
      bounce7Day: 'healthy' | 'warning' | 'critical';
      bounceAllTime: 'healthy' | 'warning' | 'critical';
      complaint7Day: 'healthy' | 'warning' | 'critical';
      complaintAllTime: 'healthy' | 'warning' | 'critical';
    };
    isDisabled: boolean;
  }> {
    const [status, project] = await Promise.all([
      this.getSecurityStatus(projectId),
      prisma.project.findUnique({
        where: {id: projectId},
        select: {disabled: true},
      }),
    ]);

    // Strip internal details from the client-facing response:
    // - Replace detailed violation/warning messages (they contain exact thresholds)
    // - Remove 24-hour data and new project flag (reveals enforcement windows)
    const sanitizedStatus: SecurityStatus = {
      ...status,
      twentyFourHour: {total: 0, bounces: 0, complaints: 0, bounceRate: 0, complaintRate: 0},
      isNewProject: false,
      violations: status.violations.map(() => 'Security threshold exceeded'),
      warnings: status.warnings.map(() => 'Approaching security threshold'),
    };

    return {
      status: sanitizedStatus,
      levels: {
        bounce7Day: this.computeLevel(
          status.sevenDay.bounceRate,
          SECURITY_THRESHOLDS.BOUNCE_7DAY_WARNING,
          SECURITY_THRESHOLDS.BOUNCE_7DAY_CRITICAL,
        ),
        bounceAllTime: this.computeLevel(
          status.allTime.bounceRate,
          SECURITY_THRESHOLDS.BOUNCE_ALLTIME_WARNING,
          SECURITY_THRESHOLDS.BOUNCE_ALLTIME_CRITICAL,
        ),
        complaint7Day: this.computeLevel(
          status.sevenDay.complaintRate,
          SECURITY_THRESHOLDS.COMPLAINT_7DAY_WARNING,
          SECURITY_THRESHOLDS.COMPLAINT_7DAY_CRITICAL,
        ),
        complaintAllTime: this.computeLevel(
          status.allTime.complaintRate,
          SECURITY_THRESHOLDS.COMPLAINT_ALLTIME_WARNING,
          SECURITY_THRESHOLDS.COMPLAINT_ALLTIME_CRITICAL,
        ),
      },
      isDisabled: project?.disabled ?? false,
    };
  }

  private static computeLevel(
    value: number,
    warningThreshold: number,
    criticalThreshold: number,
  ): 'healthy' | 'warning' | 'critical' {
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'healthy';
  }

  /**
   * Calculate bounce and complaint rates for a project
   */
  private static async calculateRates(projectId: string, startDate?: Date): Promise<RateData> {
    const where = {
      projectId,
      ...(startDate && {
        createdAt: {
          gte: startDate,
        },
      }),
    };

    // Get counts in parallel for performance
    const [total, bounces, complaints] = await Promise.all([
      prisma.email.count({where}),
      prisma.email.count({
        where: {
          ...where,
          bouncedAt: {not: null},
        },
      }),
      prisma.email.count({
        where: {
          ...where,
          complainedAt: {not: null},
        },
      }),
    ]);

    const bounceRate = total > 0 ? (bounces / total) * 100 : 0;
    const complaintRate = total > 0 ? (complaints / total) * 100 : 0;

    return {
      total,
      bounces,
      complaints,
      bounceRate,
      complaintRate,
    };
  }

  /**
   * Calculate security status without caching
   */
  private static async calculateSecurityStatus(projectId: string): Promise<SecurityStatus> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get project age to determine if stricter new-project thresholds apply
    const project = await prisma.project.findUnique({
      where: {id: projectId},
      select: {createdAt: true},
    });

    const projectAgeDays = project ? (now.getTime() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
    const isNewProject = projectAgeDays < SECURITY_THRESHOLDS.NEW_PROJECT_AGE_DAYS;

    // Get 24-hour, 7-day and all-time rates in parallel
    const [twentyFourHour, sevenDay, allTime] = await Promise.all([
      this.calculateRates(projectId, oneDayAgo),
      this.calculateRates(projectId, sevenDaysAgo),
      this.calculateRates(projectId),
    ]);

    const violations: string[] = [];
    const warnings: string[] = [];

    // Pick absolute count ceilings based on project age
    const bounceCeilings = isNewProject
      ? {
          ceiling24hWarning: SECURITY_THRESHOLDS.NEW_PROJECT_BOUNCE_24H_CEILING_WARNING,
          ceiling24hCritical: SECURITY_THRESHOLDS.NEW_PROJECT_BOUNCE_24H_CEILING_CRITICAL,
          ceiling7dWarning: SECURITY_THRESHOLDS.NEW_PROJECT_BOUNCE_7DAY_CEILING_WARNING,
          ceiling7dCritical: SECURITY_THRESHOLDS.NEW_PROJECT_BOUNCE_7DAY_CEILING_CRITICAL,
        }
      : {
          ceiling24hWarning: SECURITY_THRESHOLDS.BOUNCE_24H_CEILING_WARNING,
          ceiling24hCritical: SECURITY_THRESHOLDS.BOUNCE_24H_CEILING_CRITICAL,
          ceiling7dWarning: SECURITY_THRESHOLDS.BOUNCE_7DAY_CEILING_WARNING,
          ceiling7dCritical: SECURITY_THRESHOLDS.BOUNCE_7DAY_CEILING_CRITICAL,
        };

    const complaintCeilings = isNewProject
      ? {
          ceiling24hWarning: SECURITY_THRESHOLDS.NEW_PROJECT_COMPLAINT_24H_CEILING_WARNING,
          ceiling24hCritical: SECURITY_THRESHOLDS.NEW_PROJECT_COMPLAINT_24H_CEILING_CRITICAL,
          ceiling7dWarning: SECURITY_THRESHOLDS.NEW_PROJECT_COMPLAINT_7DAY_CEILING_WARNING,
          ceiling7dCritical: SECURITY_THRESHOLDS.NEW_PROJECT_COMPLAINT_7DAY_CEILING_CRITICAL,
        }
      : {
          ceiling24hWarning: SECURITY_THRESHOLDS.COMPLAINT_24H_CEILING_WARNING,
          ceiling24hCritical: SECURITY_THRESHOLDS.COMPLAINT_24H_CEILING_CRITICAL,
          ceiling7dWarning: SECURITY_THRESHOLDS.COMPLAINT_7DAY_CEILING_WARNING,
          ceiling7dCritical: SECURITY_THRESHOLDS.COMPLAINT_7DAY_CEILING_CRITICAL,
        };

    const projectLabel = isNewProject ? ' (new project)' : '';

    // === Absolute count ceiling checks (rate-independent) ===
    // These catch high-volume spammers who dilute their bounce rate by blasting emails

    // 24-hour bounce ceilings
    if (twentyFourHour.bounces >= bounceCeilings.ceiling24hCritical) {
      violations.push(
        `24-hour bounce count${projectLabel} (${twentyFourHour.bounces} bounces) exceeds critical ceiling (${bounceCeilings.ceiling24hCritical})`,
      );
    } else if (twentyFourHour.bounces >= bounceCeilings.ceiling24hWarning) {
      warnings.push(
        `24-hour bounce count${projectLabel} (${twentyFourHour.bounces} bounces) exceeds warning ceiling (${bounceCeilings.ceiling24hWarning})`,
      );
    }

    // 7-day bounce ceilings
    if (sevenDay.bounces >= bounceCeilings.ceiling7dCritical) {
      violations.push(
        `7-day bounce count${projectLabel} (${sevenDay.bounces} bounces) exceeds critical ceiling (${bounceCeilings.ceiling7dCritical})`,
      );
    } else if (sevenDay.bounces >= bounceCeilings.ceiling7dWarning) {
      warnings.push(
        `7-day bounce count${projectLabel} (${sevenDay.bounces} bounces) exceeds warning ceiling (${bounceCeilings.ceiling7dWarning})`,
      );
    }

    // 24-hour complaint ceilings
    if (twentyFourHour.complaints >= complaintCeilings.ceiling24hCritical) {
      violations.push(
        `24-hour complaint count${projectLabel} (${twentyFourHour.complaints} complaints) exceeds critical ceiling (${complaintCeilings.ceiling24hCritical})`,
      );
    } else if (twentyFourHour.complaints >= complaintCeilings.ceiling24hWarning) {
      warnings.push(
        `24-hour complaint count${projectLabel} (${twentyFourHour.complaints} complaints) exceeds warning ceiling (${complaintCeilings.ceiling24hWarning})`,
      );
    }

    // 7-day complaint ceilings
    if (sevenDay.complaints >= complaintCeilings.ceiling7dCritical) {
      violations.push(
        `7-day complaint count${projectLabel} (${sevenDay.complaints} complaints) exceeds critical ceiling (${complaintCeilings.ceiling7dCritical})`,
      );
    } else if (sevenDay.complaints >= complaintCeilings.ceiling7dWarning) {
      warnings.push(
        `7-day complaint count${projectLabel} (${sevenDay.complaints} complaints) exceeds warning ceiling (${complaintCeilings.ceiling7dWarning})`,
      );
    }

    // === Rate-based checks (existing logic) ===
    // Only enforce if minimum emails threshold is met
    const hasMinimumVolumeAllTime = allTime.total >= SECURITY_THRESHOLDS.MIN_EMAILS_FOR_ENFORCEMENT;
    const hasMinimumVolume7Day = sevenDay.total >= SECURITY_THRESHOLDS.MIN_EMAILS_FOR_ENFORCEMENT;

    // Check 7-day bounce rate (only if 7-day volume is sufficient)
    if (hasMinimumVolume7Day) {
      if (
        sevenDay.bounceRate >= SECURITY_THRESHOLDS.BOUNCE_7DAY_CRITICAL &&
        sevenDay.bounces >= SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_CRITICAL
      ) {
        violations.push(
          `7-day bounce rate (${sevenDay.bounceRate.toFixed(2)}%, ${sevenDay.bounces} bounces) exceeds critical threshold (${SECURITY_THRESHOLDS.BOUNCE_7DAY_CRITICAL}%, ${SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_CRITICAL} minimum)`,
        );
      } else if (
        sevenDay.bounceRate >= SECURITY_THRESHOLDS.BOUNCE_7DAY_WARNING &&
        sevenDay.bounces >= SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_WARNING
      ) {
        warnings.push(
          `7-day bounce rate (${sevenDay.bounceRate.toFixed(2)}%, ${sevenDay.bounces} bounces) exceeds warning threshold (${SECURITY_THRESHOLDS.BOUNCE_7DAY_WARNING}%, ${SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_WARNING} minimum)`,
        );
      }
    }

    // Check 7-day complaint rate (only if 7-day volume is sufficient)
    if (hasMinimumVolume7Day) {
      if (
        sevenDay.complaintRate >= SECURITY_THRESHOLDS.COMPLAINT_7DAY_CRITICAL &&
        sevenDay.complaints >= SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_CRITICAL
      ) {
        violations.push(
          `7-day complaint rate (${sevenDay.complaintRate.toFixed(3)}%, ${sevenDay.complaints} complaints) exceeds critical threshold (${SECURITY_THRESHOLDS.COMPLAINT_7DAY_CRITICAL}%, ${SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_CRITICAL} minimum)`,
        );
      } else if (
        sevenDay.complaintRate >= SECURITY_THRESHOLDS.COMPLAINT_7DAY_WARNING &&
        sevenDay.complaints >= SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_WARNING
      ) {
        warnings.push(
          `7-day complaint rate (${sevenDay.complaintRate.toFixed(3)}%, ${sevenDay.complaints} complaints) exceeds warning threshold (${SECURITY_THRESHOLDS.COMPLAINT_7DAY_WARNING}%, ${SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_WARNING} minimum)`,
        );
      }
    }

    // Check all-time rates (only if all-time volume is sufficient)
    if (hasMinimumVolumeAllTime) {
      if (
        allTime.bounceRate >= SECURITY_THRESHOLDS.BOUNCE_ALLTIME_CRITICAL &&
        allTime.bounces >= SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_CRITICAL
      ) {
        violations.push(
          `All-time bounce rate (${allTime.bounceRate.toFixed(2)}%, ${allTime.bounces} bounces) exceeds critical threshold (${SECURITY_THRESHOLDS.BOUNCE_ALLTIME_CRITICAL}%, ${SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_CRITICAL} minimum)`,
        );
      } else if (
        allTime.bounceRate >= SECURITY_THRESHOLDS.BOUNCE_ALLTIME_WARNING &&
        allTime.bounces >= SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_WARNING
      ) {
        warnings.push(
          `All-time bounce rate (${allTime.bounceRate.toFixed(2)}%, ${allTime.bounces} bounces) exceeds warning threshold (${SECURITY_THRESHOLDS.BOUNCE_ALLTIME_WARNING}%, ${SECURITY_THRESHOLDS.MIN_BOUNCES_FOR_WARNING} minimum)`,
        );
      }

      if (
        allTime.complaintRate >= SECURITY_THRESHOLDS.COMPLAINT_ALLTIME_CRITICAL &&
        allTime.complaints >= SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_CRITICAL
      ) {
        violations.push(
          `All-time complaint rate (${allTime.complaintRate.toFixed(3)}%, ${allTime.complaints} complaints) exceeds critical threshold (${SECURITY_THRESHOLDS.COMPLAINT_ALLTIME_CRITICAL}%, ${SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_CRITICAL} minimum)`,
        );
      } else if (
        allTime.complaintRate >= SECURITY_THRESHOLDS.COMPLAINT_ALLTIME_WARNING &&
        allTime.complaints >= SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_WARNING
      ) {
        warnings.push(
          `All-time complaint rate (${allTime.complaintRate.toFixed(3)}%, ${allTime.complaints} complaints) exceeds warning threshold (${SECURITY_THRESHOLDS.COMPLAINT_ALLTIME_WARNING}%, ${SECURITY_THRESHOLDS.MIN_COMPLAINTS_FOR_WARNING} minimum)`,
        );
      }
    }

    return {
      projectId,
      isHealthy: violations.length === 0,
      shouldDisable: violations.length > 0,
      twentyFourHour,
      sevenDay,
      allTime,
      isNewProject,
      violations,
      warnings,
    };
  }

  /**
   * Disable a project due to security violations
   */
  private static async disableProject(projectId: string, status: SecurityStatus): Promise<void> {
    try {
      // Check if already disabled to avoid duplicate logs
      const project = await prisma.project.findUnique({
        where: {id: projectId},
        select: {id: true, disabled: true, name: true},
      });

      if (!project) {
        signale.error(`[SECURITY] Project ${projectId} not found`);
        return;
      }

      if (project.disabled) {
        // Already disabled, just log the current violations
        signale.warn(
          `[SECURITY] Project ${projectId} (${project.name}) already disabled. Current violations:`,
          status.violations,
        );
        return;
      }

      // Disable the project
      const disabled = await prisma.project.update({
        where: {id: projectId},
        data: {disabled: true},
        select: {public: true, secret: true},
      });

      await ProjectService.invalidate(projectId, [{public: disabled.public, secret: disabled.secret}]);

      // Log critical security event
      signale.error(
        `[SECURITY] Project ${projectId} (${project.name}) has been automatically disabled due to security violations:`,
        status.violations,
      );
      signale.info(
        `[SECURITY] 7-day stats: ${status.sevenDay.bounces} bounces, ${status.sevenDay.complaints} complaints out of ${status.sevenDay.total} emails`,
      );
      signale.info(
        `[SECURITY] All-time stats: ${status.allTime.bounces} bounces, ${status.allTime.complaints} complaints out of ${status.allTime.total} emails`,
      );

      // Cancel all pending jobs for this project
      try {
        await QueueService.cancelAllProjectJobs(projectId);
        signale.info(`[SECURITY] Cancelled all pending jobs for project ${projectId}`);
      } catch (error) {
        signale.error(`[SECURITY] Failed to cancel pending jobs for project ${projectId}:`, error);
      }

      // Send urgent notification about project suspension
      await NtfyService.notifyProjectDisabledForSecurity(project.name, projectId, status.violations);

      // Send email notification to project members
      try {
        const members = await MembershipService.getMembers(projectId);
        const emails = members.map(m => m.email);
        if (emails.length > 0) {
          const template = React.createElement(ProjectDisabledEmail, {
            projectName: project.name,
            projectId,
            violations: status.violations,
            dashboardUrl: DASHBOARD_URI,
            landingUrl: LANDING_URI,
          });
          await Promise.all(
            emails.map(email => sendPlatformEmail(email, 'Project Disabled', template)),
          );
        }
      } catch (emailError) {
        signale.error(`[SECURITY] Failed to send project disabled email:`, emailError);
      }
    } catch (error) {
      signale.error(`[SECURITY] Failed to disable project ${projectId}:`, error);
    }
  }

  /**
   * Check email content for phishing or dangerous content using LLM
   * Uses sampling to reduce costs - only checks a percentage of emails
   * @returns { isPhishing: boolean, confidence: number, shouldDisable: boolean }
   */
  public static async checkPhishingContent(
    projectId: string,
    projectName: string,
    fromEmail: string,
    subject: string,
    body: string,
  ): Promise<{isPhishing: boolean; confidence: number; shouldDisable: boolean}> {
    // Default safe response
    const safeResponse = {isPhishing: false, confidence: 0, shouldDisable: false};

    try {
      // Check if phishing detection is enabled
      if (!PHISHING_DETECTION_ENABLED) {
        return safeResponse;
      }

      // Sample-based checking - only check a percentage of emails
      if (Math.random() > PHISHING_DETECTION_SAMPLE_RATE) {
        return safeResponse;
      }

      signale.info(`[PHISHING] Checking email for project ${projectId} (sampled)`);

      // Strip HTML tags for content analysis (basic HTML removal)
      const strippedBody = body
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract URLs from the original HTML body for domain analysis
      const urlMatches = body.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
      const uniqueUrls = [...new Set(urlMatches.map(u => u.replace(/[.,;)]+$/, '')))].slice(0, 20);

      // Extract sender domain for context
      const senderDomain = fromEmail.includes('@') ? fromEmail.split('@')[1] : fromEmail;

      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://useplunk.com',
          'X-Title': 'Plunk Email Platform',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a security expert analyzing emails for phishing, scams, and dangerous content. Analyze the email subject and body and respond with a JSON object in this exact format:
{
  "is_phishing": true/false,
  "confidence": 0-100,
  "reason": "brief explanation"
}

Criteria for phishing/dangerous content:
- Credential theft attempts (fake login pages, password requests)
- Financial scams (fake invoices, lottery scams, advance-fee fraud)
- Malicious links or attachments references
- Impersonation of banks, government, or well-known companies
- Urgent threats or fear-based manipulation
- Suspicious cryptocurrency or investment schemes
- Requests for sensitive personal information

IMPORTANT - Use sender and project context when evaluating:
- The sender project name and domain are provided. Links to the sender's own domain(s) are expected and NOT suspicious.
- URLs that match or are clearly related to the project name or sender domain add credibility.
- Only flag a URL as suspicious if it is unrelated to or impersonates a different known brand.
- Lack of recognizable brand does NOT make an email phishing — many legitimate businesses are not famous.

Be strict but fair. Marketing emails and legitimate transactional emails are NOT phishing.
Only flag content that is CLEARLY attempting to deceive or harm recipients.
Set confidence to 100 only if you are absolutely certain it's phishing.`,
            },
            {
              role: 'user',
              content: `Sender project name: ${projectName}
Sender domain: ${senderDomain}
${uniqueUrls.length > 0 ? `URLs found in email: ${uniqueUrls.join(', ')}` : ''}

Subject: ${subject}

Body:
${strippedBody.substring(0, 2000)}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 200,
          response_format: {type: 'json_object'},
        }),
      });

      if (!response.ok) {
        signale.error(`[PHISHING] OpenRouter API error: ${response.status} ${response.statusText}`);
        return safeResponse;
      }

      const data = (await response.json()) as {
        choices?: Array<{message?: {content?: string}}>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        signale.error('[PHISHING] No content in OpenRouter response');
        return safeResponse;
      }

      // Parse the JSON response (response_format ensures clean JSON)
      const result = JSON.parse(content) as {
        is_phishing: boolean;
        confidence: number;
        reason: string;
      };

      const isPhishing = result.is_phishing === true;
      const confidence = Math.min(100, Math.max(0, result.confidence || 0));

      if (isPhishing) {
        signale.warn(
          `[PHISHING] Detected phishing content for project ${projectId} - Confidence: ${confidence}% - Reason: ${result.reason}`,
        );

        // Track this detection for cumulative analysis
        await trackPhishingDetection(projectId, confidence, subject);

        // Get count of recent detections
        const recentCount = await getRecentPhishingCount(projectId);
        signale.info(
          `[PHISHING] Project ${projectId} has ${recentCount} phishing detection(s) in the last ${PHISHING_CUMULATIVE_WINDOW_MS / 1000 / 60} minutes`,
        );
      } else {
        signale.success(`[PHISHING] Passed phishing check for project: ${projectId}`);
      }

      // Determine if project should be disabled
      // Disable if EITHER:
      // 1. Single detection with high confidence (>= threshold)
      // 2. Multiple detections within time window (>= cumulative threshold)
      const meetsConfidenceThreshold = isPhishing && confidence >= PHISHING_CONFIDENCE_THRESHOLD;
      const recentCount = await getRecentPhishingCount(projectId);
      const meetsCumulativeThreshold = isPhishing && recentCount >= PHISHING_CUMULATIVE_THRESHOLD;
      const shouldDisable = meetsConfidenceThreshold || meetsCumulativeThreshold;

      if (shouldDisable) {
        if (meetsConfidenceThreshold) {
          signale.error(
            `[PHISHING] High confidence phishing detected (${confidence}% >= ${PHISHING_CONFIDENCE_THRESHOLD}%) - will disable project ${projectId}`,
          );
        }
        if (meetsCumulativeThreshold) {
          signale.error(
            `[PHISHING] Cumulative threshold reached (${recentCount} >= ${PHISHING_CUMULATIVE_THRESHOLD} detections) - will disable project ${projectId}`,
          );
        }

        // Clear history after disabling
        await clearPhishingHistory(projectId);
      }

      return {
        isPhishing,
        confidence,
        shouldDisable,
      };
    } catch (error) {
      // Log error but don't throw - we don't want phishing checks to break email sending
      // Better to let a phishing email through than to break legitimate emails
      signale.error(`[PHISHING] Failed to check content for project ${projectId}:`, error);
      return safeResponse;
    }
  }

  /**
   * Disable a project due to phishing detection
   */
  public static async disableProjectForPhishing(
    projectId: string,
    subject: string,
    confidence: number,
    reason?: string,
  ): Promise<void> {
    try {
      // Check if already disabled to avoid duplicate logs
      const project = await prisma.project.findUnique({
        where: {id: projectId},
        select: {id: true, disabled: true, name: true},
      });

      if (!project) {
        signale.error(`[PHISHING] Project ${projectId} not found`);
        return;
      }

      if (project.disabled) {
        signale.warn(`[PHISHING] Project ${projectId} (${project.name}) already disabled`);
        return;
      }

      // Disable the project
      const disabled = await prisma.project.update({
        where: {id: projectId},
        data: {disabled: true},
        select: {public: true, secret: true},
      });

      await ProjectService.invalidate(projectId, [{public: disabled.public, secret: disabled.secret}]);

      const violation = `A policy violation was detected. Please contact support for more details.`;

      // Log critical security event
      signale.error(
        `[PHISHING] Project ${projectId} (${project.name}) has been automatically disabled due to phishing detection:`,
        violation,
      );

      // Cancel all pending jobs for this project
      try {
        await QueueService.cancelAllProjectJobs(projectId);
        signale.info(`[PHISHING] Cancelled all pending jobs for project ${projectId}`);
      } catch (error) {
        signale.error(`[PHISHING] Failed to cancel pending jobs for project ${projectId}:`, error);
      }

      // Send urgent notification about project suspension
      await NtfyService.notifyProjectDisabledForSecurity(project.name, projectId, [violation]);

      // Send email notification to project members
      try {
        const members = await MembershipService.getMembers(projectId);
        const emails = members.map(m => m.email);
        if (emails.length > 0) {
          const template = React.createElement(ProjectDisabledEmail, {
            projectName: project.name,
            projectId,
            violations: [violation],
            dashboardUrl: DASHBOARD_URI,
            landingUrl: LANDING_URI,
          });
          await Promise.all(
            emails.map(email => sendPlatformEmail(email, 'Project Disabled', template)),
          );
        }
      } catch (emailError) {
        signale.error(`[PHISHING] Failed to send project disabled email:`, emailError);
      }
    } catch (error) {
      signale.error(`[PHISHING] Failed to disable project ${projectId}:`, error);
    }
  }
}

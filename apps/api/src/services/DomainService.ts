import React from 'react';
import signale from 'signale';
import {getDomain as getRegistrableDomain} from 'tldts';
import {DomainUnverifiedEmail, DomainVerifiedEmail, sendPlatformEmail} from '@plunk/email';
import {DASHBOARD_URI, LANDING_URI} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {redis, wrapRedis} from '../database/redis.js';
import {HttpException} from '../exceptions/index.js';
import {Keys} from './keys.js';
import {MembershipService} from './MembershipService.js';
import {NtfyService} from './NtfyService.js';
import {
  deleteIdentity,
  disableFeedbackForwarding,
  getDomainVerificationAttributes,
  verifyDomain,
} from './SESService.js';

export class DomainService {
  /**
   * Canonicalize a domain name for storage and comparison.
   * DNS is case-insensitive and a trailing dot represents the same name.
   */
  public static canonicalize(domain: string): string {
    return domain.trim().toLowerCase().replace(/\.$/, '');
  }

  /**
   * Get a domain by ID
   */
  public static async id(id: string) {
    return wrapRedis(Keys.Domain.id(id), async () => {
      return prisma.domain.findUnique({where: {id}});
    });
  }

  /**
   * Get all domains for a project
   */
  public static async getProjectDomains(projectId: string) {
    return wrapRedis(Keys.Domain.project(projectId), async () => {
      return prisma.domain.findMany({
        where: {projectId},
        orderBy: {createdAt: 'desc'},
      });
    });
  }

  /**
   * Add a new domain to a project and start verification
   */
  public static async addDomain(projectId: string, domain: string) {
    const canonical = this.canonicalize(domain);

    // Start verification process with AWS SES
    const dkimTokens = await verifyDomain(canonical);

    // Create domain record
    const newDomain = await prisma.domain.create({
      data: {
        projectId,
        domain: canonical,
        verified: false,
        dkimTokens,
      },
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    // Send notification about domain added
    await NtfyService.notifyDomainAdded(canonical, newDomain.project.name, projectId);

    return newDomain;
  }

  /**
   * Check verification status for a domain
   */
  public static async checkVerification(domainId: string) {
    const domain = await prisma.domain.findUnique({where: {id: domainId}});

    if (!domain) {
      throw new Error('Domain not found');
    }

    const attributes = await getDomainVerificationAttributes(domain.domain);

    // If domain failed verification, retry
    if (attributes.status === 'Failed') {
      signale.warn(`[DOMAIN-SERVICE] Restarting verification for ${domain.domain}`);

      let attempt = 0;
      const maxAttempts = 5;
      let success = false;
      let delay = 5000;

      while (attempt < maxAttempts && !success) {
        try {
          await verifyDomain(domain.domain);
          success = true;
          signale.success(`[DOMAIN-SERVICE] Restarted verification for ${domain.domain}`);
        } catch (e: unknown) {
          const error = e as {Code?: string; name?: string; message?: string};
          if (error?.Code === 'Throttling' || error?.name === 'Throttling' || error?.message?.includes('Throttling')) {
            signale.warn(
              `[DOMAIN-SERVICE] Throttling detected, waiting ${delay / 1000} seconds (attempt ${attempt + 1})`,
            );
            await new Promise(r => setTimeout(r, delay));
            delay *= 2; // Exponential backoff
            attempt++;
          } else {
            signale.error(`[DOMAIN-SERVICE] Error restarting verification: ${error?.message || 'Unknown error'}`);
            throw e;
          }
        }
      }

      if (!success) {
        signale.error(
          `[DOMAIN-SERVICE] Failed to verify ${domain.domain} after ${maxAttempts} attempts due to throttling`,
        );
      }
    }

    // Update domain if verification status changed
    if (attributes.status === 'Success' && !domain.verified) {
      const updatedDomain = await prisma.domain.update({
        where: {id: domainId},
        data: {verified: true},
        include: {
          project: {
            select: {name: true, id: true},
          },
        },
      });

      // Disable feedback forwarding for verified domain
      try {
        await disableFeedbackForwarding(domain.domain);
        signale.info(`[DOMAIN-SERVICE] Disabled feedback forwarding for ${domain.domain}`);
      } catch (error) {
        signale.error(`[DOMAIN-SERVICE] Error disabling feedback forwarding for ${domain.domain}:`, error);
      }

      // Send notification about domain verified
      await NtfyService.notifyDomainVerified(domain.domain, updatedDomain.project.name, updatedDomain.project.id);

      // Send email notification about domain verified
      try {
        // Use SETNX to atomically check and set the flag (prevents race conditions)
        const cacheKey = Keys.Domain.verifiedEmail(domainId);
        const ttl = 604800; // 7 days

        // SETNX returns 1 if key was set (didn't exist), 0 if key already existed
        const wasSet = await redis.set(cacheKey, '1', 'EX', ttl, 'NX');
        if (wasSet) {
          const members = await MembershipService.getMembers(updatedDomain.project.id);
          const emails = members.map(m => m.email);
          if (emails.length > 0) {
            const template = React.createElement(DomainVerifiedEmail, {
              projectName: updatedDomain.project.name,
              projectId: updatedDomain.project.id,
              domain: domain.domain,
              dashboardUrl: DASHBOARD_URI,
              landingUrl: LANDING_URI,
            });
            await Promise.all(emails.map(email => sendPlatformEmail(email, 'Domain Verified Successfully', template)));
          }
        }
      } catch (emailError) {
        signale.error('[DOMAIN-EMAIL] Failed to send domain verified email:', emailError);
      }
    } else if (attributes.status !== 'Success' && domain.verified) {
      const updatedDomain = await prisma.domain.update({
        where: {id: domainId},
        data: {verified: false},
        include: {
          project: {
            select: {name: true, id: true},
          },
        },
      });

      // Send notification about domain verification failed
      await NtfyService.notifyDomainVerificationFailed(
        domain.domain,
        updatedDomain.project.name,
        updatedDomain.project.id,
      );

      // Send email notification about domain verification failed
      try {
        // Use SETNX to atomically check and set the flag (prevents race conditions)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const cacheKey = Keys.Domain.unverifiedEmail(domainId, year, month);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const ttl = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);

        // SETNX returns 1 if key was set (didn't exist), 0 if key already existed
        const wasSet = await redis.set(cacheKey, '1', 'EX', ttl, 'NX');
        if (wasSet) {
          const members = await MembershipService.getMembers(updatedDomain.project.id);
          const emails = members.map(m => m.email);
          if (emails.length > 0) {
            const template = React.createElement(DomainUnverifiedEmail, {
              projectName: updatedDomain.project.name,
              projectId: updatedDomain.project.id,
              domain: domain.domain,
              dashboardUrl: DASHBOARD_URI,
              landingUrl: LANDING_URI,
            });
            await Promise.all(emails.map(email => sendPlatformEmail(email, 'Domain Verification Failed', template)));
          }
        }
      } catch (emailError) {
        signale.error('[DOMAIN-EMAIL] Failed to send domain unverified email:', emailError);
      }
    }

    return {
      domain: domain.domain,
      tokens: attributes.tokens,
      status: attributes.status,
      verified: attributes.status === 'Success',
    };
  }

  /**
   * Remove a domain from a project
   */
  public static async removeDomain(domainId: string) {
    const domain = await prisma.domain.findUnique({
      where: {id: domainId},
      include: {
        project: {
          select: {name: true, id: true},
        },
      },
    });

    if (!domain) {
      throw new Error('Domain not found');
    }

    // Extract domain name for checking usage
    const domainName = domain.domain;

    // Check if domain is used in any templates
    const templatesUsingDomain = await prisma.template.count({
      where: {
        projectId: domain.projectId,
        from: {
          contains: `@${domainName}`,
        },
      },
    });

    if (templatesUsingDomain > 0) {
      throw new HttpException(
        409,
        `Cannot delete domain: it is currently used in ${templatesUsingDomain} template(s). Update the templates first.`,
      );
    }

    // Check if domain is used in any workflow steps (via templates)
    const workflowStepsUsingDomain = await prisma.workflowStep.count({
      where: {
        workflow: {
          projectId: domain.projectId,
        },
        template: {
          from: {
            contains: `@${domainName}`,
          },
        },
      },
    });

    if (workflowStepsUsingDomain > 0) {
      throw new HttpException(
        409,
        `Cannot delete domain: it is currently used in ${workflowStepsUsingDomain} workflow step(s). Update the workflow templates first.`,
      );
    }

    // Check if domain is used in any active campaigns
    const campaignsUsingDomain = await prisma.campaign.count({
      where: {
        projectId: domain.projectId,
        from: {
          contains: `@${domainName}`,
        },
        status: {
          in: ['DRAFT', 'SCHEDULED', 'SENDING'],
        },
      },
    });

    if (campaignsUsingDomain > 0) {
      throw new HttpException(
        409,
        `Cannot delete domain: it is currently used in ${campaignsUsingDomain} active campaign(s). Update or complete the campaigns first.`,
      );
    }

    await prisma.domain.delete({where: {id: domainId}});

    // Check if this domain is still attached to another project
    const domainExistsElsewhere = await prisma.domain.findFirst({
      where: {
        domain: domainName,
      },
    });

    // If domain is not used by any other project, remove it from AWS SES
    if (!domainExistsElsewhere) {
      try {
        await deleteIdentity(domainName);
        signale.info(`[DOMAIN] Removed AWS SES identity for ${domainName} (no longer used by any project)`);
      } catch (error) {
        // Log error but don't fail the domain removal if AWS cleanup fails
        signale.error(`[DOMAIN] Failed to remove AWS SES identity for ${domainName}:`, error);
      }
    } else {
      signale.info(
        `[DOMAIN] Keeping AWS SES identity for ${domainName} (still used by project ${domainExistsElsewhere.projectId})`,
      );
    }

    // Send notification about domain removal
    await NtfyService.notifyDomainRemoved(domainName, domain.project.name, domain.project.id);

    return true;
  }

  /**
   * Get verified domains for a project
   */
  public static async getVerifiedDomains(projectId: string) {
    return prisma.domain.findMany({
      where: {
        projectId,
        verified: true,
      },
    });
  }

  /**
   * Verify that an email domain belongs to the specified project and is verified
   * @param email Full email address (e.g., "hello@example.com")
   * @param projectId Project ID to verify ownership
   * @returns The verified domain object
   * @throws HttpException if domain not found, not owned by project, or not verified
   */
  public static async verifyEmailDomain(email: string, projectId: string) {
    // Extract domain from email
    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      throw new HttpException(400, 'Invalid email format');
    }

    const domainName = this.canonicalize(emailParts[1] ?? '');

    // Find domain in database
    const domain = await prisma.domain.findFirst({
      where: {
        domain: domainName,
      },
    });

    if (!domain) {
      throw new HttpException(
        403,
        `Domain "${domainName}" is not registered. Please add and verify this domain in your project settings.`,
      );
    }

    // Verify domain belongs to the project
    if (domain.projectId !== projectId) {
      throw new HttpException(
        403,
        `Domain "${domainName}" belongs to a different project. You cannot use this domain.`,
      );
    }

    // Verify domain is verified
    if (!domain.verified) {
      throw new HttpException(
        403,
        `Domain "${domainName}" is not verified. Please complete the DNS verification process in your domain settings.`,
      );
    }

    return domain;
  }

  /**
   * Extract the registrable root domain from a domain name using the Public Suffix List.
   * e.g. "mail.example.com" → "example.com", "mail.example.co.uk" → "example.co.uk"
   */
  private static rootDomain(domain: string): string {
    return getRegistrableDomain(domain) ?? domain;
  }

  /**
   * Check whether the root domain of `domain` is owned by a disabled project.
   * Prevents subdomains from being added when the parent domain is flagged.
   */
  public static async checkSubdomainOfDisabledRoot(
    domain: string,
  ): Promise<{blocked: boolean; projectName?: string; projectId?: string}> {
    const canonical = this.canonicalize(domain);
    const root = this.rootDomain(canonical);

    // Only relevant when the submitted domain is actually a subdomain
    if (root === canonical) {
      return {blocked: false};
    }

    const rootDomainRecord = await prisma.domain.findFirst({
      where: {domain: root},
      include: {
        project: {
          select: {id: true, name: true, disabled: true},
        },
      },
    });

    if (rootDomainRecord?.project.disabled) {
      return {
        blocked: true,
        projectName: rootDomainRecord.project.name,
        projectId: rootDomainRecord.project.id,
      };
    }

    return {blocked: false};
  }

  /**
   * Check if a domain is already linked to another project
   * Used when adding a new domain to verify if the user has access to the existing project
   * @param domain Domain name to check
   * @param userId User ID to check membership
   * @returns Object with exists flag and membership info
   */
  public static async checkDomainOwnership(domain: string, userId: string) {
    const canonical = this.canonicalize(domain);
    const existingDomain = await prisma.domain.findFirst({
      where: {domain: canonical},
      include: {
        project: {
          include: {
            members: {
              where: {userId},
            },
          },
        },
      },
    });

    if (!existingDomain) {
      return {exists: false};
    }

    // Check if user is a member of the project that owns this domain
    const isMember = existingDomain.project.members.length > 0;

    return {
      exists: true,
      projectId: existingDomain.project.id,
      projectName: existingDomain.project.name,
      isMember,
    };
  }
}

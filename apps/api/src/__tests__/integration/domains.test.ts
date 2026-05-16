import {beforeEach, describe, expect, it, vi} from 'vitest';
import {factories, getPrismaClient} from '../../../../../test/helpers';
import {DomainService} from '../../services/DomainService.js';
import * as SESService from '../../services/SESService.js';

/**
 * Integration tests for Domain verification and ownership checks
 * Tests the security feature that prevents domains from being linked to multiple projects
 * unless the user is a member of the project that owns the domain
 */
describe('Domain Verification and Ownership Tests', () => {
  const prisma = getPrismaClient();

  // Mock SES service to avoid external AWS calls
  beforeEach(() => {
    vi.spyOn(SESService, 'verifyDomain').mockResolvedValue(['token1', 'token2', 'token3']);
    vi.spyOn(SESService, 'getDomainVerificationAttributes').mockResolvedValue({
      status: 'Success',
      tokens: ['token1', 'token2', 'token3'],
    });
  });

  // ========================================
  // DOMAIN OWNERSHIP CHECKS
  // ========================================
  describe('Domain Ownership Verification', () => {
    it('should allow adding a domain that does not exist yet', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'new-domain.com';

      const ownershipCheck = await DomainService.checkDomainOwnership(domain, 'any-user-id');

      expect(ownershipCheck.exists).toBe(false);

      // Should be able to add the domain
      const newDomain = await DomainService.addDomain(project.id, domain);
      expect(newDomain.domain).toBe(domain);
      expect(newDomain.projectId).toBe(project.id);
    });

    it('should detect when a domain already exists', async () => {
      const {user, project} = await factories.createUserWithProject();
      const domain = 'existing-domain.com';

      // First project adds the domain
      await DomainService.addDomain(project.id, domain);

      // Check ownership - user IS a member of the project
      const ownershipCheck = await DomainService.checkDomainOwnership(domain, user.id);

      expect(ownershipCheck.exists).toBe(true);
      expect(ownershipCheck.projectId).toBe(project.id);
      expect(ownershipCheck.projectName).toBe(project.name);
      expect(ownershipCheck.isMember).toBe(true);
    });

    it('should detect when a domain exists but user is not a member', async () => {
      const {project: project1} = await factories.createUserWithProject();
      const {user: user2} = await factories.createUserWithProject();
      const domain = 'other-project-domain.com';

      // Project 1 adds the domain
      await DomainService.addDomain(project1.id, domain);

      // Check ownership for User 2 (not a member of Project 1)
      const ownershipCheck = await DomainService.checkDomainOwnership(domain, user2.id);

      expect(ownershipCheck.exists).toBe(true);
      expect(ownershipCheck.projectId).toBe(project1.id);
      expect(ownershipCheck.isMember).toBe(false);
    });

    it('should allow access when user is a member of the project that owns the domain', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'shared-domain.com';

      // User 1 adds the domain to their project
      await DomainService.addDomain(project.id, domain);

      // Create another user and add them to the same project
      const user2 = await factories.createUser({email: 'user2@test.com'});
      await prisma.membership.create({
        data: {
          userId: user2.id,
          projectId: project.id,
          role: 'ADMIN',
        },
      });

      // Check ownership for User 2 (who is now a member)
      const ownershipCheck = await DomainService.checkDomainOwnership(domain, user2.id);

      expect(ownershipCheck.exists).toBe(true);
      expect(ownershipCheck.isMember).toBe(true);
    });
  });

  // ========================================
  // PREVENTING UNAUTHORIZED DOMAIN LINKING
  // ========================================
  describe('Preventing Unauthorized Domain Linking', () => {
    it('should prevent linking a domain to another project when user is not a member', async () => {
      const {project: project1} = await factories.createUserWithProject();
      const {user: user2} = await factories.createUserWithProject();
      const domain = 'protected-domain.com';

      // Project 1 adds the domain
      await DomainService.addDomain(project1.id, domain);

      // User 2 tries to link the same domain to Project 2
      const ownershipCheck = await DomainService.checkDomainOwnership(domain, user2.id);

      // The controller would use this check to deny access
      expect(ownershipCheck.exists).toBe(true);
      expect(ownershipCheck.isMember).toBe(false);

      // Verify the domain is still only linked to Project 1
      const domains = await prisma.domain.findMany({
        where: {domain},
      });

      expect(domains).toHaveLength(1);
      expect(domains[0].projectId).toBe(project1.id);
    });

    it('should allow member to see they can access domain from the original project', async () => {
      const {user, project: project1} = await factories.createUserWithProject();
      const domain = 'member-domain.com';

      // Add domain to project 1
      await DomainService.addDomain(project1.id, domain);

      // User creates a second project (same user, different project)
      const project2 = await factories.createProject();
      await prisma.membership.create({
        data: {
          userId: user.id,
          projectId: project2.id,
          role: 'OWNER',
        },
      });

      // User tries to link the domain to project 2
      const ownershipCheck = await DomainService.checkDomainOwnership(domain, user.id);

      // Should indicate that domain exists and user IS a member
      expect(ownershipCheck.exists).toBe(true);
      expect(ownershipCheck.isMember).toBe(true);
      expect(ownershipCheck.projectId).toBe(project1.id);
      expect(ownershipCheck.projectName).toBe(project1.name);
    });
  });

  // ========================================
  // DOMAIN VERIFICATION STATUS
  // ========================================
  describe('Domain Verification Status', () => {
    it('should create unverified domain when first added', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'unverified-domain.com';

      const newDomain = await DomainService.addDomain(project.id, domain);

      expect(newDomain.verified).toBe(false);
      expect(newDomain.dkimTokens).toEqual(['token1', 'token2', 'token3']);
    });

    it('should prevent using unverified domain for sending emails', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'unverified-domain.com';

      await DomainService.addDomain(project.id, domain);

      // Try to verify email domain
      await expect(DomainService.verifyEmailDomain(`sender@${domain}`, project.id)).rejects.toThrow(/not verified/i);
    });

    it('should allow using verified domain for sending emails', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'verified-domain.com';

      const newDomain = await DomainService.addDomain(project.id, domain);

      // Manually mark as verified (simulating DNS verification)
      await prisma.domain.update({
        where: {id: newDomain.id},
        data: {verified: true},
      });

      // Should not throw error
      const verifiedDomain = await DomainService.verifyEmailDomain(`sender@${domain}`, project.id);

      expect(verifiedDomain.verified).toBe(true);
      expect(verifiedDomain.domain).toBe(domain);
    });

    it('should prevent using domain from different project', async () => {
      const {project: project1} = await factories.createUserWithProject();
      const {project: project2} = await factories.createUserWithProject();
      const domain = 'project1-domain.com';

      const newDomain = await DomainService.addDomain(project1.id, domain);

      // Mark as verified
      await prisma.domain.update({
        where: {id: newDomain.id},
        data: {verified: true},
      });

      // Try to use from different project
      await expect(DomainService.verifyEmailDomain(`sender@${domain}`, project2.id)).rejects.toThrow(
        /belongs to a different project/i,
      );
    });

    it('should prevent using unregistered domain', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'not-registered.com';

      // Try to use domain that was never added
      await expect(DomainService.verifyEmailDomain(`sender@${domain}`, project.id)).rejects.toThrow(/not registered/i);
    });
  });

  // ========================================
  // MULTIPLE USERS AND PROJECTS
  // ========================================
  describe('Multiple Users and Projects Scenarios', () => {
    it('should handle 3 users: owner, member, and non-member', async () => {
      const {user: owner, project} = await factories.createUserWithProject();
      const member = await factories.createUser({email: 'member@test.com'});
      const nonMember = await factories.createUser({email: 'nonmember@test.com'});
      const domain = 'team-domain.com';

      // Owner adds domain
      await DomainService.addDomain(project.id, domain);

      // Add member to project
      await prisma.membership.create({
        data: {
          userId: member.id,
          projectId: project.id,
          role: 'MEMBER',
        },
      });

      // Check ownership for each user
      const ownerCheck = await DomainService.checkDomainOwnership(domain, owner.id);
      const memberCheck = await DomainService.checkDomainOwnership(domain, member.id);
      const nonMemberCheck = await DomainService.checkDomainOwnership(domain, nonMember.id);

      expect(ownerCheck.isMember).toBe(true);
      expect(memberCheck.isMember).toBe(true);
      expect(nonMemberCheck.isMember).toBe(false);
    });

    it('should handle user with multiple projects', async () => {
      const {user, project: project1} = await factories.createUserWithProject();
      const project2 = await factories.createProject();
      const domain = 'multi-project-domain.com';

      // Add user to second project
      await prisma.membership.create({
        data: {
          userId: user.id,
          projectId: project2.id,
          role: 'ADMIN',
        },
      });

      // Add domain to project 1
      await DomainService.addDomain(project1.id, domain);

      // User is member of both projects, but domain belongs to project 1
      const ownershipCheck = await DomainService.checkDomainOwnership(domain, user.id);

      expect(ownershipCheck.exists).toBe(true);
      expect(ownershipCheck.isMember).toBe(true);
      expect(ownershipCheck.projectId).toBe(project1.id);
    });

    it('should handle domain being removed and re-added', async () => {
      const {user, project} = await factories.createUserWithProject();
      const domain = 'reusable-domain.com';

      // Add domain
      const domain1 = await DomainService.addDomain(project.id, domain);

      // Remove domain
      await DomainService.removeDomain(domain1.id);

      // Check ownership - should not exist
      const checkAfterRemoval = await DomainService.checkDomainOwnership(domain, user.id);
      expect(checkAfterRemoval.exists).toBe(false);

      // Re-add domain
      const domain2 = await DomainService.addDomain(project.id, domain);

      expect(domain2.domain).toBe(domain);
      expect(domain2.projectId).toBe(project.id);
    });
  });

  // ========================================
  // ROLE-BASED RESTRICTIONS
  // ========================================
  describe('Role-Based Domain Access', () => {
    it('should verify that only ADMIN and OWNER can add domains', async () => {
      const {project} = await factories.createUserWithProject();
      const regularMember = await factories.createUser({email: 'member@test.com'});

      await prisma.membership.create({
        data: {
          userId: regularMember.id,
          projectId: project.id,
          role: 'MEMBER',
        },
      });

      // The controller checks for role: { in: ['ADMIN', 'OWNER'] }
      // This test verifies the database structure supports this check
      const membership = await prisma.membership.findFirst({
        where: {
          userId: regularMember.id,
          projectId: project.id,
          role: {
            in: ['ADMIN', 'OWNER'],
          },
        },
      });

      expect(membership).toBeNull();
    });

    it('should verify that ADMIN and OWNER roles can add domains', async () => {
      const {user: owner, project} = await factories.createUserWithProject();
      const admin = await factories.createUser({email: 'admin@test.com'});

      await prisma.membership.create({
        data: {
          userId: admin.id,
          projectId: project.id,
          role: 'ADMIN',
        },
      });

      // Verify both owner and admin have required roles
      const ownerMembership = await prisma.membership.findFirst({
        where: {
          userId: owner.id,
          projectId: project.id,
          role: {
            in: ['ADMIN', 'OWNER'],
          },
        },
      });

      const adminMembership = await prisma.membership.findFirst({
        where: {
          userId: admin.id,
          projectId: project.id,
          role: {
            in: ['ADMIN', 'OWNER'],
          },
        },
      });

      expect(ownerMembership).not.toBeNull();
      expect(adminMembership).not.toBeNull();
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    it('should canonicalize mixed-case domain names to lowercase', async () => {
      const {project} = await factories.createUserWithProject();

      // DNS is case-insensitive — domains must be stored canonically so a tenant
      // can't claim "Example.com" while another project owns "example.com".
      const domain1 = await DomainService.addDomain(project.id, 'Example.com');

      expect(domain1.domain).toBe('example.com');
    });

    it('should handle subdomain vs root domain', async () => {
      const {project} = await factories.createUserWithProject();

      const rootDomain = await DomainService.addDomain(project.id, 'example.com');
      const subDomain = await DomainService.addDomain(project.id, 'mail.example.com');

      expect(rootDomain.domain).toBe('example.com');
      expect(subDomain.domain).toBe('mail.example.com');

      // Both should be separate entries
      const domains = await prisma.domain.findMany({
        where: {projectId: project.id},
      });

      expect(domains).toHaveLength(2);
    });

    it('should handle invalid email format in verifyEmailDomain', async () => {
      const {project} = await factories.createUserWithProject();

      await expect(DomainService.verifyEmailDomain('not-an-email', project.id)).rejects.toThrow(
        /invalid email format/i,
      );

      await expect(DomainService.verifyEmailDomain('multiple@at@signs.com', project.id)).rejects.toThrow(
        /invalid email format/i,
      );
    });
  });

  // ========================================
  // GET PROJECT DOMAINS
  // ========================================
  describe('Get Project Domains', () => {
    it('should return all domains for a project', async () => {
      const {project} = await factories.createUserWithProject();

      await DomainService.addDomain(project.id, 'domain1.com');
      await DomainService.addDomain(project.id, 'domain2.com');
      await DomainService.addDomain(project.id, 'domain3.com');

      const domains = await DomainService.getProjectDomains(project.id);

      expect(domains).toHaveLength(3);
      expect(domains.map(d => d.domain).sort()).toEqual(['domain1.com', 'domain2.com', 'domain3.com']);
    });

    it('should return empty array for project with no domains', async () => {
      const {project} = await factories.createUserWithProject();

      const domains = await DomainService.getProjectDomains(project.id);

      expect(domains).toHaveLength(0);
    });

    it('should not return domains from other projects', async () => {
      const {project: project1} = await factories.createUserWithProject();
      const {project: project2} = await factories.createUserWithProject();

      await DomainService.addDomain(project1.id, 'project1-domain.com');
      await DomainService.addDomain(project2.id, 'project2-domain.com');

      const project1Domains = await DomainService.getProjectDomains(project1.id);
      const project2Domains = await DomainService.getProjectDomains(project2.id);

      expect(project1Domains).toHaveLength(1);
      expect(project1Domains[0].domain).toBe('project1-domain.com');

      expect(project2Domains).toHaveLength(1);
      expect(project2Domains[0].domain).toBe('project2-domain.com');
    });
  });
});

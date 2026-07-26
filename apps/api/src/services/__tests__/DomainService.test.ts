import {beforeEach, describe, expect, it, vi} from 'vitest';
import {factories, getPrismaClient} from '../../../../../test/helpers';
import {DomainService} from '../DomainService.js';
import {HttpException} from '../../exceptions/index.js';
import * as SESService from '../SESService.js';

/**
 * Unit tests for DomainService
 * Focuses on business logic, validation, and edge cases
 */
describe('DomainService', () => {
  const prisma = getPrismaClient();

  beforeEach(() => {
    // Mock SES service calls to avoid AWS API calls
    vi.spyOn(SESService, 'verifyDomain').mockResolvedValue(['token1', 'token2', 'token3']);
    vi.spyOn(SESService, 'getDomainVerificationAttributes').mockResolvedValue({
      status: 'Success',
      tokens: ['token1', 'token2', 'token3'],
    });
    // DomainService swallows failures from these two, so an unmocked call is invisible
    // in the results while still hitting AWS on every run — and for anyone whose .env
    // holds real credentials it would mutate a live SES account.
    vi.spyOn(SESService, 'deleteIdentity').mockResolvedValue(undefined);
    vi.spyOn(SESService, 'disableFeedbackForwarding').mockResolvedValue(undefined);
  });

  // ========================================
  // ADD DOMAIN
  // ========================================
  describe('addDomain', () => {
    it('should add a domain and initiate verification', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'example.com';

      const result = await DomainService.addDomain(project.id, domain);

      expect(result.domain).toBe(domain);
      expect(result.projectId).toBe(project.id);
      expect(result.verified).toBe(false);
      expect(result.dkimTokens).toEqual(['token1', 'token2', 'token3']);
      expect(SESService.verifyDomain).toHaveBeenCalledWith(domain);
    });

    it('should call AWS SES to initiate verification', async () => {
      const {project} = await factories.createUserWithProject();
      const domain = 'test-domain.com';

      await DomainService.addDomain(project.id, domain);

      expect(SESService.verifyDomain).toHaveBeenCalledWith(domain);
    });
  });

  // ========================================
  // CHECK DOMAIN OWNERSHIP
  // ========================================
  describe('checkDomainOwnership', () => {
    it('should return exists: false for non-existent domain', async () => {
      const result = await DomainService.checkDomainOwnership('non-existent.com', 'user-id');

      expect(result).toEqual({exists: false});
    });

    it('should return project info when domain exists', async () => {
      const {user, project} = await factories.createUserWithProject();

      await DomainService.addDomain(project.id, 'existing.com');

      const result = await DomainService.checkDomainOwnership('existing.com', user.id);

      expect(result.exists).toBe(true);
      expect(result.projectId).toBe(project.id);
      expect(result.projectName).toBe(project.name);
      expect(result.isMember).toBe(true);
    });

    it('should indicate isMember: false when user is not a member', async () => {
      const {project: project1} = await factories.createUserWithProject();
      const {user: user2} = await factories.createUserWithProject();

      await DomainService.addDomain(project1.id, 'restricted.com');

      const result = await DomainService.checkDomainOwnership('restricted.com', user2.id);

      expect(result.exists).toBe(true);
      expect(result.isMember).toBe(false);
    });

    it('should indicate isMember: true when user is a member', async () => {
      const {project} = await factories.createUserWithProject();
      const user2 = await factories.createUser();

      await prisma.membership.create({
        data: {
          userId: user2.id,
          projectId: project.id,
          role: 'MEMBER',
        },
      });

      await DomainService.addDomain(project.id, 'team-domain.com');

      const result = await DomainService.checkDomainOwnership('team-domain.com', user2.id);

      expect(result.exists).toBe(true);
      expect(result.isMember).toBe(true);
    });
  });

  // ========================================
  // VERIFY EMAIL DOMAIN
  // ========================================
  describe('verifyEmailDomain', () => {
    it('should throw error for invalid email format', async () => {
      const {project} = await factories.createUserWithProject();

      await expect(DomainService.verifyEmailDomain('invalid-email', project.id)).rejects.toThrow(HttpException);

      await expect(DomainService.verifyEmailDomain('invalid-email', project.id)).rejects.toThrow(
        /invalid email format/i,
      );
    });

    it('should throw error when domain is not registered', async () => {
      const {project} = await factories.createUserWithProject();

      await expect(DomainService.verifyEmailDomain('sender@unregistered.com', project.id)).rejects.toThrow(
        HttpException,
      );

      await expect(DomainService.verifyEmailDomain('sender@unregistered.com', project.id)).rejects.toThrow(
        /not registered/i,
      );
    });

    it('should throw error when domain belongs to different project', async () => {
      const {project: project1} = await factories.createUserWithProject();
      const {project: project2} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project1.id, 'project1.com');
      await prisma.domain.update({
        where: {id: domain.id},
        data: {verified: true},
      });

      await expect(DomainService.verifyEmailDomain('sender@project1.com', project2.id)).rejects.toThrow(HttpException);

      await expect(DomainService.verifyEmailDomain('sender@project1.com', project2.id)).rejects.toThrow(
        /belongs to a different project/i,
      );
    });

    it('should throw error when domain is not verified', async () => {
      const {project} = await factories.createUserWithProject();

      await DomainService.addDomain(project.id, 'unverified.com');

      await expect(DomainService.verifyEmailDomain('sender@unverified.com', project.id)).rejects.toThrow(HttpException);

      await expect(DomainService.verifyEmailDomain('sender@unverified.com', project.id)).rejects.toThrow(
        /not verified/i,
      );
    });

    it('should return domain when all checks pass', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'verified.com');
      await prisma.domain.update({
        where: {id: domain.id},
        data: {verified: true},
      });

      const result = await DomainService.verifyEmailDomain('sender@verified.com', project.id);

      expect(result.domain).toBe('verified.com');
      expect(result.verified).toBe(true);
      expect(result.projectId).toBe(project.id);
    });

    it('should extract domain correctly from various email formats', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'example.com');
      await prisma.domain.update({
        where: {id: domain.id},
        data: {verified: true},
      });

      // Test various email formats
      const result1 = await DomainService.verifyEmailDomain('user@example.com', project.id);
      const result2 = await DomainService.verifyEmailDomain('admin@example.com', project.id);
      const result3 = await DomainService.verifyEmailDomain('support+tag@example.com', project.id);

      expect(result1.domain).toBe('example.com');
      expect(result2.domain).toBe('example.com');
      expect(result3.domain).toBe('example.com');
    });
  });

  // ========================================
  // GET DOMAIN BY ID
  // ========================================
  describe('id', () => {
    it('should return domain by id', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'test.com');
      const result = await DomainService.id(domain.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(domain.id);
      expect(result?.domain).toBe('test.com');
    });

    it('should return null for non-existent id', async () => {
      const result = await DomainService.id('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  // ========================================
  // GET PROJECT DOMAINS
  // ========================================
  describe('getProjectDomains', () => {
    it('should return all domains for a project', async () => {
      const {project} = await factories.createUserWithProject();

      await DomainService.addDomain(project.id, 'domain1.com');
      await DomainService.addDomain(project.id, 'domain2.com');

      const domains = await DomainService.getProjectDomains(project.id);

      expect(domains).toHaveLength(2);
      expect(domains.map(d => d.domain).sort()).toEqual(['domain1.com', 'domain2.com']);
    });

    it('should return domains ordered by creation date (newest first)', async () => {
      const {project} = await factories.createUserWithProject();

      // Add domains with slight delay to ensure different timestamps
      const domain1 = await DomainService.addDomain(project.id, 'first.com');
      await new Promise(resolve => setTimeout(resolve, 10));
      const domain2 = await DomainService.addDomain(project.id, 'second.com');
      await new Promise(resolve => setTimeout(resolve, 10));
      const domain3 = await DomainService.addDomain(project.id, 'third.com');

      const domains = await DomainService.getProjectDomains(project.id);

      expect(domains[0].id).toBe(domain3.id); // Newest first
      expect(domains[1].id).toBe(domain2.id);
      expect(domains[2].id).toBe(domain1.id);
    });

    it('should return empty array for project with no domains', async () => {
      const {project} = await factories.createUserWithProject();

      const domains = await DomainService.getProjectDomains(project.id);

      expect(domains).toEqual([]);
    });
  });

  // ========================================
  // GET VERIFIED DOMAINS
  // ========================================
  describe('getVerifiedDomains', () => {
    it('should return only verified domains', async () => {
      const {project} = await factories.createUserWithProject();

      const domain1 = await DomainService.addDomain(project.id, 'verified1.com');
      await DomainService.addDomain(project.id, 'unverified.com');
      const domain3 = await DomainService.addDomain(project.id, 'verified2.com');

      // Mark two as verified
      await prisma.domain.update({
        where: {id: domain1.id},
        data: {verified: true},
      });
      await prisma.domain.update({
        where: {id: domain3.id},
        data: {verified: true},
      });

      const verifiedDomains = await DomainService.getVerifiedDomains(project.id);

      expect(verifiedDomains).toHaveLength(2);
      expect(verifiedDomains.map(d => d.domain).sort()).toEqual(['verified1.com', 'verified2.com']);
    });

    it('should return empty array when no domains are verified', async () => {
      const {project} = await factories.createUserWithProject();

      await DomainService.addDomain(project.id, 'unverified1.com');
      await DomainService.addDomain(project.id, 'unverified2.com');

      const verifiedDomains = await DomainService.getVerifiedDomains(project.id);

      expect(verifiedDomains).toEqual([]);
    });
  });

  // ========================================
  // CHECK VERIFICATION
  // ========================================
  describe('checkVerification', () => {
    it('should check verification status with AWS SES', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'check-verification.com');

      const result = await DomainService.checkVerification(domain.id);

      expect(result.domain).toBe('check-verification.com');
      expect(result.tokens).toEqual(['token1', 'token2', 'token3']);
      expect(result.status).toBe('Success');
      expect(result.verified).toBe(true);

      expect(SESService.getDomainVerificationAttributes).toHaveBeenCalledWith('check-verification.com');
    });

    it('should update domain to verified when SES returns Success', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'newly-verified.com');
      expect(domain.verified).toBe(false);

      await DomainService.checkVerification(domain.id);

      const updated = await prisma.domain.findUnique({where: {id: domain.id}});
      expect(updated?.verified).toBe(true);
    });

    it('should update domain to unverified when SES returns Pending', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'pending-domain.com');

      // Manually mark as verified
      await prisma.domain.update({
        where: {id: domain.id},
        data: {verified: true},
      });

      // Mock SES to return Pending
      vi.spyOn(SESService, 'getDomainVerificationAttributes').mockResolvedValueOnce({
        status: 'Pending',
        tokens: ['token1', 'token2', 'token3'],
      });

      await DomainService.checkVerification(domain.id);

      const updated = await prisma.domain.findUnique({where: {id: domain.id}});
      expect(updated?.verified).toBe(false);
    });

    it('should throw error for non-existent domain', async () => {
      await expect(DomainService.checkVerification('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        /domain not found/i,
      );
    });
  });

  // ========================================
  // REMOVE DOMAIN
  // ========================================
  describe('removeDomain', () => {
    it('should remove domain when not in use', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'remove-me.com');

      await DomainService.removeDomain(domain.id);

      const deleted = await prisma.domain.findUnique({where: {id: domain.id}});
      expect(deleted).toBeNull();
    });

    it('should throw error when domain is used in templates', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'used-in-template.com');

      await factories.createTemplate({
        projectId: project.id,
        from: 'sender@used-in-template.com',
      });

      await expect(DomainService.removeDomain(domain.id)).rejects.toThrow(HttpException);

      await expect(DomainService.removeDomain(domain.id)).rejects.toThrow(/used in.*template/i);
    });

    it('should throw error when domain is used in active campaigns', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'used-in-campaign.com');

      await factories.createCampaign({
        projectId: project.id,
        from: 'campaign@used-in-campaign.com',
        status: 'DRAFT',
      });

      await expect(DomainService.removeDomain(domain.id)).rejects.toThrow(HttpException);

      await expect(DomainService.removeDomain(domain.id)).rejects.toThrow(/used in.*campaign/i);
    });

    it('should allow removal when campaign is SENT (completed)', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'completed-campaign.com');

      await factories.createCampaign({
        projectId: project.id,
        from: 'campaign@completed-campaign.com',
        status: 'SENT',
      });

      // Should not throw
      await DomainService.removeDomain(domain.id);

      const deleted = await prisma.domain.findUnique({where: {id: domain.id}});
      expect(deleted).toBeNull();
    });

    it('should throw error for non-existent domain', async () => {
      await expect(DomainService.removeDomain('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        /domain not found/i,
      );
    });

    it('should check usage in multiple templates', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'multi-use.com');

      await factories.createTemplate({
        projectId: project.id,
        from: 'sender1@multi-use.com',
      });
      await factories.createTemplate({
        projectId: project.id,
        from: 'sender2@multi-use.com',
      });
      await factories.createTemplate({
        projectId: project.id,
        from: 'sender3@multi-use.com',
      });

      await expect(DomainService.removeDomain(domain.id)).rejects.toThrow(/3 template/i);
    });
  });

  // ========================================
  // EDGE CASES AND ERROR HANDLING
  // ========================================
  describe('Edge Cases', () => {
    it('should handle emails with plus addressing', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'example.com');
      await prisma.domain.update({
        where: {id: domain.id},
        data: {verified: true},
      });

      const result = await DomainService.verifyEmailDomain('user+tag@example.com', project.id);

      expect(result.domain).toBe('example.com');
    });

    it('should handle subdomain correctly', async () => {
      const {project} = await factories.createUserWithProject();

      const domain = await DomainService.addDomain(project.id, 'mail.example.com');
      await prisma.domain.update({
        where: {id: domain.id},
        data: {verified: true},
      });

      const result = await DomainService.verifyEmailDomain('sender@mail.example.com', project.id);

      expect(result.domain).toBe('mail.example.com');

      // Different subdomain should fail
      await expect(DomainService.verifyEmailDomain('sender@other.example.com', project.id)).rejects.toThrow(
        /not registered/i,
      );
    });

    it('should handle email with no @ sign', async () => {
      const {project} = await factories.createUserWithProject();

      await expect(DomainService.verifyEmailDomain('nodomain', project.id)).rejects.toThrow(/invalid email format/i);
    });

    it('should handle email with multiple @ signs', async () => {
      const {project} = await factories.createUserWithProject();

      await expect(DomainService.verifyEmailDomain('user@@example.com', project.id)).rejects.toThrow(
        /invalid email format/i,
      );
    });

    it('should handle empty email string', async () => {
      const {project} = await factories.createUserWithProject();

      await expect(DomainService.verifyEmailDomain('', project.id)).rejects.toThrow(/invalid email format/i);
    });
  });

  // ========================================
  // CONCURRENCY AND RACE CONDITIONS
  // ========================================
  describe('Concurrency', () => {
    it('should handle concurrent domain additions to same project', async () => {
      const {project} = await factories.createUserWithProject();

      // Add multiple domains concurrently
      const results = await Promise.all([
        DomainService.addDomain(project.id, 'concurrent1.com'),
        DomainService.addDomain(project.id, 'concurrent2.com'),
        DomainService.addDomain(project.id, 'concurrent3.com'),
      ]);

      expect(results).toHaveLength(3);
      expect(results.map(d => d.domain).sort()).toEqual(['concurrent1.com', 'concurrent2.com', 'concurrent3.com']);
    });

    it('should handle concurrent ownership checks', async () => {
      const {user, project} = await factories.createUserWithProject();

      await DomainService.addDomain(project.id, 'concurrent-check.com');

      // Multiple concurrent ownership checks
      const results = await Promise.all([
        DomainService.checkDomainOwnership('concurrent-check.com', user.id),
        DomainService.checkDomainOwnership('concurrent-check.com', user.id),
        DomainService.checkDomainOwnership('concurrent-check.com', user.id),
      ]);

      // All should return consistent results
      expect(results.every(r => r.exists)).toBe(true);
      expect(results.every(r => r.isMember)).toBe(true);
    });
  });
});

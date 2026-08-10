import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EmailStatus, EmailSourceType} from '@plunk/db';
import {SecurityService} from '../SecurityService';
import {factories, getPrismaClient} from '../../../../../test/helpers';
import {redis} from '../../database/redis';

vi.mock('../../app/constants.js', async () => {
  const actual = await vi.importActual('../../app/constants.js');
  return {
    ...actual,
    AUTO_PROJECT_DISABLE: true,
  };
});

// Mock NtfyService to prevent actual notifications
vi.mock('../NtfyService.js', () => ({
  NtfyService: {
    notifySecurityWarning: vi.fn(),
    notifyProjectDisabledForSecurity: vi.fn(),
  },
}));

// Mock email sending for project disabled notifications
vi.mock('@plunk/email', () => ({
  ProjectDisabledEmail: vi.fn(),
  sendPlatformEmail: vi.fn(),
}));

describe('SecurityService', () => {
  let projectId: string;
  let contactId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;

    const contact = await factories.createContact({projectId});
    contactId = contact.id;

    // Clear redis cache
    await redis.flushdb();
  });

  /**
   * Helper to create N emails, some of which are bounced
   */
  async function createEmails(count: number, opts?: {bouncedCount?: number; complainedCount?: number; createdAt?: Date}) {
    const bouncedCount = opts?.bouncedCount ?? 0;
    const complainedCount = opts?.complainedCount ?? 0;
    const createdAt = opts?.createdAt ?? new Date();

    const data = Array.from({length: count}, (_, i) => ({
      projectId,
      contactId,
      subject: `Test ${i}`,
      body: '<p>test</p>',
      from: 'test@example.com',
      status: EmailStatus.SENT,
      sourceType: EmailSourceType.TRANSACTIONAL,
      sentAt: createdAt,
      createdAt,
      bouncedAt: i < bouncedCount ? createdAt : null,
      complainedAt: i >= bouncedCount && i < bouncedCount + complainedCount ? createdAt : null,
    }));
    await prisma.email.createMany({data});
  }

  describe('Rate-based checks (existing behavior)', () => {
    it('should report healthy when bounce rate is below warning', async () => {
      // 200 emails, 5 bounces = 2.5% (below 5% warning)
      await createEmails(200, {bouncedCount: 5});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.isHealthy).toBe(true);
      expect(status.shouldDisable).toBe(false);
      expect(status.violations).toHaveLength(0);
      expect(status.warnings).toHaveLength(0);
    });

    it('should trigger warning when 7-day bounce rate exceeds warning threshold', async () => {
      // 100 emails, 6 bounces = 6% (above 5% warning, below 10% critical)
      await createEmails(100, {bouncedCount: 6});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.isHealthy).toBe(true);
      expect(status.warnings.length).toBeGreaterThan(0);
    });

    it('should trigger violation when 7-day bounce rate exceeds critical threshold', async () => {
      // 100 emails, 11 bounces = 11% (above 10% critical)
      await createEmails(100, {bouncedCount: 11});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.isHealthy).toBe(false);
      expect(status.shouldDisable).toBe(true);
      expect(status.violations.length).toBeGreaterThan(0);
    });

    it('should not enforce rate checks when below minimum volume', async () => {
      // 50 emails (below 100 minimum), 10 bounces = 20% (would exceed critical)
      await createEmails(50, {bouncedCount: 10});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.violations).toHaveLength(0);
    });
  });

  describe('Established projects skip absolute ceilings', () => {
    // Age the project past the new-project window
    beforeEach(async () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await prisma.project.update({
        where: {id: projectId},
        data: {createdAt: oldDate},
      });
    });

    it('should NOT trigger on high absolute bounce count when rate is healthy', async () => {
      // 20,000 emails, 200 bounces = 1% rate (well below rate threshold)
      // Established projects rely solely on rates — high absolute counts at
      // high volume don't indicate abuse.
      await createEmails(20000, {bouncedCount: 200});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.isHealthy).toBe(true);
      expect(status.shouldDisable).toBe(false);
      expect(status.violations).toHaveLength(0);
      expect(status.warnings).toHaveLength(0);
    });

    it('should NOT trigger on high absolute complaint count when rate is healthy', async () => {
      // 40,000 emails, 30 complaints = 0.075% (below critical: 0.15% 7-day, 0.12% all-time)
      // Old absolute ceiling (25 complaints in 7d critical) would have tripped.
      await createEmails(40000, {complainedCount: 30});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.shouldDisable).toBe(false);
    });
  });

  describe('New project stricter thresholds', () => {
    it('should apply stricter ceilings for projects under 30 days old', async () => {
      // Default project is created "now", so it's a new project
      // 10,000 emails, 26 bounces (above 25 new project 24h critical ceiling)
      await createEmails(10000, {bouncedCount: 26});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.isNewProject).toBe(true);
      expect(status.shouldDisable).toBe(true);
      expect(status.violations.some(v => v.includes('new project'))).toBe(true);
    });

    it('should NOT apply absolute ceilings for projects over 30 days old', async () => {
      // Age the project to 31 days
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await prisma.project.update({
        where: {id: projectId},
        data: {createdAt: oldDate},
      });

      // 10,000 emails, 26 bounces — would trip new-project ceiling, but
      // established projects skip ceilings entirely (rate is 0.26%, healthy).
      await createEmails(10000, {bouncedCount: 26});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.isNewProject).toBe(false);
      expect(status.warnings.some(w => w.includes('bounce count'))).toBe(false);
      expect(status.violations.some(v => v.includes('bounce count'))).toBe(false);
    });

    it('should catch new project blasting emails with delayed bounces', async () => {
      // Simulate the spammer scenario: new project sends 20K emails,
      // only 30 bounces have come back so far (rate is tiny: 0.15%)
      await createEmails(20000, {bouncedCount: 30});

      const status = await SecurityService.getSecurityStatus(projectId);
      expect(status.isNewProject).toBe(true);
      expect(status.shouldDisable).toBe(true);
      // 30 > 25 new project 24h critical ceiling
      expect(status.violations.some(v => v.includes('24-hour bounce count'))).toBe(true);
    });
  });

  describe('checkAndEnforceSecurityLimits', () => {
    it('should disable project when critical thresholds are exceeded', async () => {
      // New project, 20K emails with 30 bounces — exceeds new project 24h critical ceiling
      await createEmails(20000, {bouncedCount: 30});

      await SecurityService.checkAndEnforceSecurityLimits(projectId);

      const project = await prisma.project.findUnique({
        where: {id: projectId},
        select: {disabled: true},
      });
      expect(project?.disabled).toBe(true);
    });

    it('should NOT disable project when only warnings exist', async () => {
      // Established project, 200 emails, 12 bounces = 6% (above 5% warning, below 10% critical)
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await prisma.project.update({
        where: {id: projectId},
        data: {createdAt: oldDate},
      });
      await createEmails(200, {bouncedCount: 12});

      await SecurityService.checkAndEnforceSecurityLimits(projectId);

      const project = await prisma.project.findUnique({
        where: {id: projectId},
        select: {disabled: true},
      });
      expect(project?.disabled).toBe(false);
    });
  });

  describe('getProjectSecurityMetrics (client-facing)', () => {
    it('should NOT expose internal thresholds or detailed violation messages', async () => {
      // Create a violation scenario
      await createEmails(100, {bouncedCount: 15});

      const metrics = await SecurityService.getProjectSecurityMetrics(projectId);

      // Should have levels, not thresholds
      expect(metrics.levels).toBeDefined();
      expect((metrics as Record<string, unknown>).thresholds).toBeUndefined();

      // Violation messages should be generic
      if (metrics.status.violations.length > 0) {
        for (const v of metrics.status.violations) {
          expect(v).toBe('Security threshold exceeded');
          expect(v).not.toMatch(/\d+%/); // No percentages
          expect(v).not.toMatch(/\d+ minimum/); // No absolute numbers
        }
      }

      // 24-hour data should be zeroed out
      expect(metrics.status.twentyFourHour.total).toBe(0);
      expect(metrics.status.twentyFourHour.bounces).toBe(0);

      // New project flag should be hidden
      expect(metrics.status.isNewProject).toBe(false);
    });
  });
});

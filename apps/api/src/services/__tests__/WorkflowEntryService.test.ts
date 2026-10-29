import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WorkflowExecutionStatus} from '@plunk/db';
import {WorkflowThrottleSchemas} from '@plunk/shared';
import {WorkflowEntryService} from '../WorkflowEntryService';
import {WorkflowService} from '../WorkflowService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Mock Redis for caching tests - must be inline to avoid hoisting issues
vi.mock('../../database/redis', () => {
  const store = new Map<string, {value: string; expiry?: number}>();
  return {
    redis: {
      // ContactFieldService registers its Lua scripts at import
      defineCommand: vi.fn(),
      get: vi.fn(async (key: string) => {
        const item = store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
          store.delete(key);
          return null;
        }
        return item.value;
      }),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, {value});
        return 'OK';
      }),
      setex: vi.fn(async (key: string, seconds: number, value: string) => {
        store.set(key, {value, expiry: Date.now() + seconds * 1000});
        return 'OK';
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
        return 1;
      }),
      incr: vi.fn(async (key: string) => {
        const current = store.get(key);
        const newValue = current ? parseInt(current.value) + 1 : 1;
        store.set(key, {value: String(newValue)});
        return newValue;
      }),
      expire: vi.fn(async (key: string, seconds: number) => {
        const item = store.get(key);
        if (!item) return 0;
        store.set(key, {...item, expiry: Date.now() + seconds * 1000});
        return 1;
      }),
      clear: () => store.clear(),
    },
  };
});

describe('Workflow entry throttle', () => {
  const prisma = getPrismaClient();
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  afterEach(async () => {
    const {redis} = await import('../../database/redis');
    if ('clear' in redis) {
      (redis as unknown as {clear: () => void}).clear();
    }
  });

  async function throttledWorkflow(throttle: {windowSeconds: number | null; key: string | null}) {
    const workflow = await factories.createWorkflow({projectId, enabled: true, allowReentry: true});
    const updated = await prisma.workflow.update({
      where: {id: workflow.id},
      data: {throttleWindowSeconds: throttle.windowSeconds, throttleKey: throttle.key},
    });
    const trigger = await prisma.workflowStep.findFirstOrThrow({where: {workflowId: workflow.id, type: 'TRIGGER'}});
    return {workflow: updated, triggerId: trigger.id};
  }

  async function finishRuns(workflowId: string) {
    await prisma.workflowExecution.updateMany({
      where: {workflowId},
      data: {status: WorkflowExecutionStatus.COMPLETED},
    });
  }

  async function expireClaims(workflowId: string) {
    await prisma.throttleClaim.updateMany({
      where: {key: {startsWith: `wf:${workflowId}:`}},
      data: {expiresAt: new Date(Date.now() - 1000)},
    });
  }

  describe('enter', () => {
    it('starts one run when the same event arrives five times at once', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 86400, key: null});
      const contact = await factories.createContact({projectId});

      const results = await Promise.all(
        Array.from({length: 5}, () => WorkflowEntryService.enter(workflow, contact.id, triggerId, {})),
      );

      expect(results.filter(r => r.entered)).toHaveLength(1);
      expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id}})).toBe(1);
    });

    it('refuses within the window and writes nothing', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 86400, key: null});
      const contact = await factories.createContact({projectId});

      await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});
      await finishRuns(workflow.id);
      const claimsBefore = await prisma.throttleClaim.findMany({where: {projectId}});

      const second = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});

      expect(second.entered).toBe(false);
      if (!second.entered && second.refusal.reason === 'throttled') {
        expect(second.refusal.nextAllowedAt!.getTime()).toBeGreaterThan(Date.now() + 86000 * 1000);
      } else {
        throw new Error('expected a throttled refusal');
      }
      expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id}})).toBe(1);
      expect(await prisma.throttleClaim.findMany({where: {projectId}})).toEqual(claimsBefore);
    });

    it('lets the contact in again once the window has passed', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 3600, key: null});
      const contact = await factories.createContact({projectId});

      await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});
      await finishRuns(workflow.id);
      await expireClaims(workflow.id);

      const again = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});

      expect(again.entered).toBe(true);
    });

    it('keeps a contact out while an earlier run is waiting, even after the window', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 3600, key: null});
      const contact = await factories.createContact({projectId});

      await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});
      await prisma.workflowExecution.updateMany({
        where: {workflowId: workflow.id},
        data: {status: WorkflowExecutionStatus.WAITING},
      });
      await expireClaims(workflow.id);

      const again = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});

      expect(again).toEqual({entered: false, refusal: {reason: 'in-progress'}});
    });

    it('counts each value of the key field separately', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 86400, key: 'event.orgId'});
      const contact = await factories.createContact({projectId});

      const acme = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {orgId: 'acme'});
      await finishRuns(workflow.id);
      const globex = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {orgId: 'globex'});
      await finishRuns(workflow.id);
      const acmeAgain = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {orgId: 'acme'});

      expect([acme.entered, globex.entered, acmeAgain.entered]).toEqual([true, true, false]);
    });

    it('counts a non-persistent tracked field by its value', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 86400, key: 'event.orgId'});
      const contact = await factories.createContact({projectId});

      await WorkflowEntryService.enter(workflow, contact.id, triggerId, {orgId: {value: 'acme', persistent: false}});

      const claim = await prisma.throttleClaim.findFirstOrThrow({where: {projectId}});
      expect(claim.key).toBe(`wf:${workflow.id}:acme`);
    });

    it('reads the key from contact data', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 86400, key: 'data.plan'});
      const contact = await factories.createContact({projectId, data: {plan: 'pro'}});

      await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});

      const claim = await prisma.throttleClaim.findFirstOrThrow({where: {projectId}});
      expect(claim.key).toBe(`wf:${workflow.id}:pro`);
    });

    it('counts per contact when the key field is missing', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: 86400, key: 'event.orgId'});
      const contact = await factories.createContact({projectId});

      const first = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {});
      await finishRuns(workflow.id);
      const second = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {other: 1});

      expect([first.entered, second.entered]).toEqual([true, false]);
    });

    it('enters once per key value when there is no window', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: null, key: 'event.period'});
      const contact = await factories.createContact({projectId});

      const october = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {period: '2026-10'});
      await finishRuns(workflow.id);
      const octoberAgain = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {period: '2026-10'});
      const november = await WorkflowEntryService.enter(workflow, contact.id, triggerId, {period: '2026-11'});

      expect([october.entered, octoberAgain.entered, november.entered]).toEqual([true, false, true]);
      if (!octoberAgain.entered && octoberAgain.refusal.reason === 'throttled') {
        expect(octoberAgain.refusal.nextAllowedAt).toBeNull();
      }
    });

    it('keeps "every time" letting a contact in while an earlier run waits', async () => {
      const workflow = await factories.createWorkflow({projectId, enabled: true, allowReentry: true});
      const trigger = await prisma.workflowStep.findFirstOrThrow({where: {workflowId: workflow.id, type: 'TRIGGER'}});
      const contact = await factories.createContact({projectId});

      await WorkflowEntryService.enter(workflow, contact.id, trigger.id, {});
      await prisma.workflowExecution.updateMany({
        where: {workflowId: workflow.id},
        data: {status: WorkflowExecutionStatus.WAITING},
      });
      const again = await WorkflowEntryService.enter(workflow, contact.id, trigger.id, {});

      expect(again.entered).toBe(true);
      expect(await prisma.throttleClaim.count({where: {projectId}})).toBe(0);
    });
  });

  describe('WorkflowService', () => {
    it('answers a throttled manual start with 409 and when it may run again', async () => {
      const {workflow} = await throttledWorkflow({windowSeconds: 86400, key: null});
      const contact = await factories.createContact({projectId});

      await WorkflowService.startExecution(projectId, workflow.id, contact.id);
      await finishRuns(workflow.id);

      await expect(WorkflowService.startExecution(projectId, workflow.id, contact.id)).rejects.toThrow(
        /throttled for this contact until/,
      );
    });

    it('turns re-entry on when a throttle is set, and returns it in the same shape', async () => {
      const workflow = await WorkflowService.create(projectId, {
        name: 'Usage warning',
        eventName: 'usage.high',
        throttle: WorkflowThrottleSchemas.throttle.parse({window: '24h', key: 'event.orgId'}),
      });

      expect(workflow.allowReentry).toBe(true);
      expect(WorkflowService.throttleOf(workflow)).toEqual({window: '1d', key: 'event.orgId'});
    });

    it('refuses a throttle together with allowReentry: false', async () => {
      await expect(
        WorkflowService.create(projectId, {
          name: 'Conflicting',
          eventName: 'usage.high',
          allowReentry: false,
          throttle: WorkflowThrottleSchemas.throttle.parse('24h'),
        }),
      ).rejects.toThrow(/needs re-entry/);
    });

    it('clears the throttle when re-entry is turned off or the throttle is set to null', async () => {
      const {workflow} = await throttledWorkflow({windowSeconds: 3600, key: null});

      const off = await WorkflowService.update(projectId, workflow.id, {allowReentry: false});
      expect([off.throttleWindowSeconds, off.throttleKey]).toEqual([null, null]);

      await WorkflowService.update(projectId, workflow.id, {throttle: WorkflowThrottleSchemas.throttle.parse('1h')});
      const cleared = await WorkflowService.update(projectId, workflow.id, {throttle: null});
      expect(cleared.allowReentry).toBe(true);
      expect(WorkflowService.throttleOf(cleared)).toBeNull();
    });

    it('keeps the throttle when only the name changes', async () => {
      const {workflow} = await throttledWorkflow({windowSeconds: 3600, key: 'event.orgId'});

      const renamed = await WorkflowService.update(projectId, workflow.id, {name: 'Renamed'});

      expect(WorkflowService.throttleOf(renamed)).toEqual({window: '1h', key: 'event.orgId'});
    });

    it('copies the throttle when duplicating', async () => {
      const {workflow} = await throttledWorkflow({windowSeconds: 600, key: null});

      const copy = await WorkflowService.duplicate(projectId, workflow.id);

      expect(WorkflowService.throttleOf(copy)).toEqual({window: '10m', key: null});
    });

    it('releases its claims when the workflow is deleted', async () => {
      const {workflow, triggerId} = await throttledWorkflow({windowSeconds: null, key: 'event.period'});
      const contact = await factories.createContact({projectId});
      await WorkflowEntryService.enter(workflow, contact.id, triggerId, {period: '2026-10'});
      await finishRuns(workflow.id);

      await WorkflowService.delete(projectId, workflow.id);

      expect(await prisma.throttleClaim.count({where: {projectId}})).toBe(0);
    });
  });
});

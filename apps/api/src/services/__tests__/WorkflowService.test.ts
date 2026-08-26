import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WorkflowExecutionStatus, WorkflowStepType, WorkflowTriggerType} from '@plunk/db';
import {WorkflowService} from '../WorkflowService';
import {Keys} from '../keys';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Mock Redis for caching tests - must be inline to avoid hoisting issues
vi.mock('../../database/redis', () => {
  const store = new Map<string, {value: string; expiry?: number}>();
  return {
    redis: {
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

describe('WorkflowService', () => {
  let projectId: string;
  const prisma = getPrismaClient();

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

  // ========================================
  // WORKFLOW CRUD
  // ========================================
  describe('create', () => {
    it('should create a workflow with event trigger', async () => {
      const workflow = await WorkflowService.create(projectId, {
        name: 'Welcome Workflow',
        description: 'Send welcome emails to new users',
        eventName: 'user.signup',
        enabled: true,
        allowReentry: false,
      });

      expect(workflow.name).toBe('Welcome Workflow');
      expect(workflow.description).toBe('Send welcome emails to new users');
      expect(workflow.triggerType).toBe(WorkflowTriggerType.EVENT);
      expect(workflow.triggerConfig).toEqual({eventName: 'user.signup'});
      expect(workflow.enabled).toBe(true);
      expect(workflow.allowReentry).toBe(false);
      expect(workflow.projectId).toBe(projectId);
    });

    it('should create trigger step automatically', async () => {
      const workflow = await WorkflowService.create(projectId, {
        name: 'Test Workflow',
        eventName: 'test.event',
      });

      const steps = await prisma.workflowStep.findMany({
        where: {workflowId: workflow.id},
      });

      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe(WorkflowStepType.TRIGGER);
      expect(steps[0].name).toBe('Trigger: test.event');
      expect(steps[0].config).toEqual({eventName: 'test.event'});
    });

    it('should default to disabled and no re-entry', async () => {
      const workflow = await WorkflowService.create(projectId, {
        name: 'Default Settings',
        eventName: 'test.event',
      });

      expect(workflow.enabled).toBe(false);
      expect(workflow.allowReentry).toBe(false);
    });

    it('should trim event name', async () => {
      const workflow = await WorkflowService.create(projectId, {
        name: 'Test',
        eventName: '  user.signup  ',
      });

      expect(workflow.triggerConfig).toEqual({eventName: 'user.signup'});
    });

    it('should throw error when event name is empty', async () => {
      await expect(
        WorkflowService.create(projectId, {
          name: 'Invalid',
          eventName: '   ',
        }),
      ).rejects.toThrow('Event name is required');
    });

    it('should invalidate cache when creating enabled workflow', async () => {
      const {redis} = await import('../../database/redis');
      const cacheKey = Keys.Workflow.enabled(projectId);

      // Set cache
      await redis.set(cacheKey, JSON.stringify([{id: 'old'}]));

      // Create enabled workflow
      await WorkflowService.create(projectId, {
        name: 'Test',
        eventName: 'test.event',
        enabled: true,
      });

      // Cache should be invalidated
      const cached = await redis.get(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('get', () => {
    it('should get workflow with steps and transitions', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const template = await factories.createTemplate({projectId});

      const step1 = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.SEND_EMAIL,
        templateId: template.id,
      });

      const step2 = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.DELAY,
      });

      // Create transition
      await prisma.workflowTransition.create({
        data: {
          fromStepId: step1.id,
          toStepId: step2.id,
        },
      });

      const retrieved = await WorkflowService.get(projectId, workflow.id);

      expect(retrieved.id).toBe(workflow.id);
      expect(retrieved.steps).toHaveLength(3); // TRIGGER + 2 created
      expect(retrieved.steps.some(s => s.type === WorkflowStepType.SEND_EMAIL)).toBe(true);
      expect(retrieved.steps.some(s => s.type === WorkflowStepType.DELAY)).toBe(true);

      const emailStep = retrieved.steps.find(s => s.id === step1.id);
      expect(emailStep?.outgoingTransitions).toHaveLength(1);
      expect(emailStep?.template?.id).toBe(template.id);
    });

    it('should throw 404 when workflow not found', async () => {
      await expect(WorkflowService.get(projectId, 'non-existent')).rejects.toThrow('Workflow not found');
    });

    it('should throw 404 when workflow belongs to different project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const workflow = await factories.createWorkflow({projectId: otherProject.id});

      await expect(WorkflowService.get(projectId, workflow.id)).rejects.toThrow('Workflow not found');
    });
  });

  describe('list', () => {
    it('should list workflows with pagination', async () => {
      for (let i = 0; i < 25; i++) {
        await factories.createWorkflow({projectId, name: `Workflow ${i}`});
      }

      const page1 = await WorkflowService.list(projectId, 1, 10);

      expect(page1.data).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.totalPages).toBe(3);
    });

    it('should filter by search query', async () => {
      await factories.createWorkflow({projectId, name: 'Welcome Sequence'});
      await factories.createWorkflow({projectId, name: 'Onboarding Flow'});
      await factories.createWorkflow({projectId, name: 'Welcome Email'});

      const result = await WorkflowService.list(projectId, 1, 20, 'welcome');

      expect(result.total).toBe(2);
      expect(result.data.every(w => w.name.toLowerCase().includes('welcome'))).toBe(true);
    });

    it('should include step and execution counts', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const contact = await factories.createContact({projectId});

      // Add steps
      await factories.createWorkflowStep({workflowId: workflow.id});
      await factories.createWorkflowStep({workflowId: workflow.id});

      // Add executions
      await factories.createWorkflowExecution(workflow.id, contact.id);

      const result = await WorkflowService.list(projectId);

      const found = result.data.find(w => w.id === workflow.id) as
        | ((typeof result.data)[number] & {_count: {steps: number; executions: number}})
        | undefined;
      expect(found?._count.steps).toBe(3); // TRIGGER + 2 added
      expect(found?._count.executions).toBe(1);
    });

    it('should filter by enabled status', async () => {
      await factories.createWorkflow({projectId, name: 'Active A', enabled: true});
      await factories.createWorkflow({projectId, name: 'Active B', enabled: true});
      await factories.createWorkflow({projectId, name: 'Disabled', enabled: false});

      const active = await WorkflowService.list(projectId, 1, 20, undefined, undefined, true);
      expect(active.total).toBe(2);
      expect(active.data.every(w => w.enabled)).toBe(true);

      const disabled = await WorkflowService.list(projectId, 1, 20, undefined, undefined, false);
      expect(disabled.total).toBe(1);
      expect(disabled.data.every(w => !w.enabled)).toBe(true);

      // Omitting the filter returns both.
      const all = await WorkflowService.list(projectId, 1, 20, undefined, undefined, undefined);
      expect(all.total).toBe(3);
    });

    it('should sort by step count ascending and descending', async () => {
      // `few` keeps just its TRIGGER step (count 1); `many` gets two more (count 3).
      const few = await factories.createWorkflow({projectId, name: 'Few Steps'});
      const many = await factories.createWorkflow({projectId, name: 'Many Steps'});
      await factories.createWorkflowStep({workflowId: many.id});
      await factories.createWorkflowStep({workflowId: many.id});

      const asc = await WorkflowService.list(projectId, 1, 20, undefined, {
        field: 'steps',
        direction: 'asc',
      });
      expect(asc.data.map(w => w.id)).toEqual([few.id, many.id]);

      const desc = await WorkflowService.list(projectId, 1, 20, undefined, {
        field: 'steps',
        direction: 'desc',
      });
      expect(desc.data.map(w => w.id)).toEqual([many.id, few.id]);
    });
  });

  describe('update', () => {
    it('should update workflow name and description', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        name: 'Old Name',
        description: 'Old description',
      });

      const updated = await WorkflowService.update(projectId, workflow.id, {
        name: 'New Name',
        description: 'New description',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('New description');
    });

    it('should update enabled status', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: false,
      });

      const updated = await WorkflowService.update(projectId, workflow.id, {
        enabled: true,
      });

      expect(updated.enabled).toBe(true);
    });

    it('should update allowReentry setting', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        allowReentry: false,
      });

      const updated = await WorkflowService.update(projectId, workflow.id, {
        allowReentry: true,
      });

      expect(updated.allowReentry).toBe(true);
    });

    it('should invalidate cache when enabling workflow', async () => {
      const {redis} = await import('../../database/redis');
      const cacheKey = Keys.Workflow.enabled(projectId);

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: false,
      });

      // Set cache
      await redis.set(cacheKey, JSON.stringify([]));

      await WorkflowService.update(projectId, workflow.id, {enabled: true});

      const cached = await redis.get(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a workflow and its steps', async () => {
      const workflow = await factories.createWorkflow({projectId});
      await factories.createWorkflowStep({workflowId: workflow.id});

      await WorkflowService.delete(projectId, workflow.id);

      const deleted = await prisma.workflow.findUnique({
        where: {id: workflow.id},
      });

      expect(deleted).toBeNull();

      // Steps should be deleted too (cascade)
      const steps = await prisma.workflowStep.findMany({
        where: {workflowId: workflow.id},
      });

      expect(steps).toHaveLength(0);
    });

    it('should invalidate cache when deleting enabled workflow', async () => {
      const {redis} = await import('../../database/redis');
      const cacheKey = Keys.Workflow.enabled(projectId);

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
      });

      await redis.set(cacheKey, JSON.stringify([{id: workflow.id}]));

      await WorkflowService.delete(projectId, workflow.id);

      const cached = await redis.get(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('bulkUpdate (delete)', () => {
    it('should bulk-delete multiple workflows (and their steps) in this project', async () => {
      const a = await factories.createWorkflow({projectId});
      const b = await factories.createWorkflow({projectId});
      const c = await factories.createWorkflow({projectId});

      const result = await WorkflowService.bulkUpdate(projectId, {
        ids: [a.id, b.id, c.id],
        delete: true,
      });

      expect(result.deleted).toBe(3);
      expect(await prisma.workflow.count({where: {projectId}})).toBe(0);
      // Steps cascade-delete with their workflows.
      expect(await prisma.workflowStep.count({where: {workflowId: {in: [a.id, b.id, c.id]}}})).toBe(0);
    });

    it('should dedup repeated ids so the deleted count is not inflated', async () => {
      const a = await factories.createWorkflow({projectId});

      const result = await WorkflowService.bulkUpdate(projectId, {
        ids: [a.id, a.id, a.id],
        delete: true,
      });

      expect(result.deleted).toBe(1);
      expect(await prisma.workflow.findUnique({where: {id: a.id}})).toBeNull();
    });

    it('should throw 404 (and delete nothing) when any id does not exist', async () => {
      const a = await factories.createWorkflow({projectId});

      await expect(
        WorkflowService.bulkUpdate(projectId, {ids: [a.id, '00000000-0000-0000-0000-000000000000'], delete: true}),
      ).rejects.toThrow(/not found in this project/i);

      // Nothing deleted — the whole operation rolled back.
      expect(await prisma.workflow.findUnique({where: {id: a.id}})).not.toBeNull();
    });

    it('should throw 404 (and delete nothing) when an id belongs to another project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const mine = await factories.createWorkflow({projectId});
      const foreign = await factories.createWorkflow({projectId: otherProject.id});

      await expect(
        WorkflowService.bulkUpdate(projectId, {ids: [mine.id, foreign.id], delete: true}),
      ).rejects.toThrow(/not found in this project/i);

      // Both survive — atomic rollback, no cross-project leak.
      expect(await prisma.workflow.findUnique({where: {id: mine.id}})).not.toBeNull();
      expect(await prisma.workflow.findUnique({where: {id: foreign.id}})).not.toBeNull();
    });

    it('should throw 409 (and delete nothing) when any selected workflow has active executions', async () => {
      const busy = await factories.createWorkflow({projectId, enabled: true});
      const idle = await factories.createWorkflow({projectId});
      const contact = await factories.createContact({projectId});
      await factories.createWorkflowExecution(busy.id, contact.id, {
        status: WorkflowExecutionStatus.RUNNING,
      });

      await expect(
        WorkflowService.bulkUpdate(projectId, {ids: [busy.id, idle.id], delete: true}),
      ).rejects.toThrow(/active execution/i);

      // Partial delete must be impossible — the idle workflow must survive too.
      expect(await prisma.workflow.findUnique({where: {id: busy.id}})).not.toBeNull();
      expect(await prisma.workflow.findUnique({where: {id: idle.id}})).not.toBeNull();
    });

    it('should return {updated: 0} when delete flag is omitted (forward-compat no-op)', async () => {
      const a = await factories.createWorkflow({projectId});

      const result = await WorkflowService.bulkUpdate(projectId, {ids: [a.id]});

      expect(result).toEqual({updated: 0});
      // No-op: the workflow is untouched.
      expect(await prisma.workflow.findUnique({where: {id: a.id}})).not.toBeNull();
    });
  });

  // ========================================
  // WORKFLOW STEPS
  // ========================================
  describe('addStep', () => {
    it('should add a step to workflow', async () => {
      const workflow = await factories.createWorkflow({projectId});

      const step = await WorkflowService.addStep(projectId, workflow.id, {
        type: WorkflowStepType.DELAY,
        name: 'Wait 1 hour',
        position: {x: 200, y: 100},
        config: {delay: 3600},
      });

      expect(step.workflowId).toBe(workflow.id);
      expect(step.type).toBe(WorkflowStepType.DELAY);
      expect(step.name).toBe('Wait 1 hour');
      expect(step.config).toEqual({delay: 3600});
    });

    it('should add SEND_EMAIL step with template reference', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const template = await factories.createTemplate({projectId});

      const step = await WorkflowService.addStep(projectId, workflow.id, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Send welcome email',
        position: {x: 200, y: 100},
        config: {},
        templateId: template.id,
      });

      expect(step.templateId).toBe(template.id);
    });

    it('should reject foreign and missing templates without revealing which exists', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const {project: otherProject} = await factories.createUserWithProject();
      const foreignTemplate = await factories.createTemplate({projectId: otherProject.id});
      const missingTemplateId = '00000000-0000-0000-0000-000000000000';

      const addEmailStep = (templateId: string) =>
        WorkflowService.addStep(projectId, workflow.id, {
          type: WorkflowStepType.SEND_EMAIL,
          name: 'Send welcome email',
          position: {x: 200, y: 100},
          config: {},
          templateId,
        });

      await expect(addEmailStep(foreignTemplate.id)).rejects.toMatchObject({
        code: 404,
        message: 'Template not found',
      });
      await expect(addEmailStep(missingTemplateId)).rejects.toMatchObject({
        code: 404,
        message: 'Template not found',
      });
      await expect(
        WorkflowService.addStep(projectId, workflow.id, {
          type: WorkflowStepType.DELAY,
          name: 'Wait 1 hour',
          position: {x: 200, y: 100},
          config: {delay: 3600},
          templateId: foreignTemplate.id,
        }),
      ).rejects.toMatchObject({code: 404, message: 'Template not found'});

      const addedSteps = await prisma.workflowStep.findMany({where: {workflowId: workflow.id}});
      expect(addedSteps).toHaveLength(1);
      expect(addedSteps[0]?.type).toBe(WorkflowStepType.TRIGGER);
    });

    it('should auto-connect to previous step by default', async () => {
      const workflow = await factories.createWorkflow({projectId});

      // Workflow starts with a TRIGGER step
      const triggerStep = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      const step1 = await WorkflowService.addStep(projectId, workflow.id, {
        type: WorkflowStepType.DELAY,
        name: 'Step 1',
        position: {x: 100, y: 100},
        config: {},
      });

      // Verify transition created from TRIGGER to step1
      const transitions1 = await prisma.workflowTransition.findMany({
        where: {fromStepId: triggerStep!.id, toStepId: step1.id},
      });
      expect(transitions1).toHaveLength(1);

      const step2 = await WorkflowService.addStep(projectId, workflow.id, {
        type: WorkflowStepType.DELAY,
        name: 'Step 2',
        position: {x: 200, y: 100},
        config: {},
      });

      // Verify transition created from step1 to step2
      const transitions2 = await prisma.workflowTransition.findMany({
        where: {fromStepId: step1.id, toStepId: step2.id},
      });
      expect(transitions2).toHaveLength(1);
    });

    it('should NOT auto-connect when autoConnect is false', async () => {
      const workflow = await factories.createWorkflow({projectId});

      const step = await WorkflowService.addStep(projectId, workflow.id, {
        type: WorkflowStepType.DELAY,
        name: 'Isolated Step',
        position: {x: 100, y: 100},
        config: {},
        autoConnect: false,
      });

      const transitions = await prisma.workflowTransition.findMany({
        where: {toStepId: step.id},
      });

      expect(transitions).toHaveLength(0);
    });

    it('should prevent adding duplicate TRIGGER steps', async () => {
      const workflow = await factories.createWorkflow({projectId});

      await expect(
        WorkflowService.addStep(projectId, workflow.id, {
          type: WorkflowStepType.TRIGGER,
          name: 'Second Trigger',
          position: {x: 100, y: 100},
          config: {},
        }),
      ).rejects.toThrow(/already has a trigger step/i);
    });
  });

  describe('updateStep', () => {
    it('should update step name and config', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step = await factories.createWorkflowStep({
        workflowId: workflow.id,
        name: 'Old Name',
        config: {delay: 60},
      });

      const updated = await WorkflowService.updateStep(projectId, workflow.id, step.id, {
        name: 'New Name',
        config: {delay: 120},
      });

      expect(updated.name).toBe('New Name');
      expect(updated.config).toEqual({delay: 120});
    });

    it('should update step position', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step = await factories.createWorkflowStep({
        workflowId: workflow.id,
      });

      const updated = await WorkflowService.updateStep(projectId, workflow.id, step.id, {
        position: {x: 500, y: 300},
      });

      expect(updated.position).toEqual({x: 500, y: 300});
    });

    it('should update template reference', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const template1 = await factories.createTemplate({projectId});
      const template2 = await factories.createTemplate({projectId});

      const step = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.SEND_EMAIL,
        templateId: template1.id,
      });

      const updated = await WorkflowService.updateStep(projectId, workflow.id, step.id, {
        templateId: template2.id,
      });

      expect(updated.templateId).toBe(template2.id);
    });

    it('should reject updating an email step to foreign and missing templates', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const template = await factories.createTemplate({projectId});
      const {project: otherProject} = await factories.createUserWithProject();
      const foreignTemplate = await factories.createTemplate({projectId: otherProject.id});
      const missingTemplateId = '00000000-0000-0000-0000-000000000000';
      const step = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.SEND_EMAIL,
        templateId: template.id,
      });

      await expect(
        WorkflowService.updateStep(projectId, workflow.id, step.id, {
          templateId: foreignTemplate.id,
        }),
      ).rejects.toMatchObject({code: 404, message: 'Template not found'});
      await expect(
        WorkflowService.updateStep(projectId, workflow.id, step.id, {
          templateId: missingTemplateId,
        }),
      ).rejects.toMatchObject({code: 404, message: 'Template not found'});

      const unchanged = await prisma.workflowStep.findUnique({where: {id: step.id}});
      expect(unchanged?.templateId).toBe(template.id);
    });

    it('should remove template reference when set to null', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const template = await factories.createTemplate({projectId});

      const step = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.SEND_EMAIL,
        templateId: template.id,
      });

      const updated = await WorkflowService.updateStep(projectId, workflow.id, step.id, {
        templateId: null,
      });

      expect(updated.templateId).toBeNull();
    });

    it('should throw 404 when step not found', async () => {
      const workflow = await factories.createWorkflow({projectId});

      await expect(WorkflowService.updateStep(projectId, workflow.id, 'non-existent', {name: 'New'})).rejects.toThrow(
        'Workflow step not found',
      );
    });
  });

  describe('deleteStep', () => {
    it('should delete a workflow step', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step = await factories.createWorkflowStep({workflowId: workflow.id});

      await WorkflowService.deleteStep(projectId, workflow.id, step.id);

      const deleted = await prisma.workflowStep.findUnique({
        where: {id: step.id},
      });

      expect(deleted).toBeNull();
    });

    it('should prevent deleting TRIGGER steps', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const trigger = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      await expect(WorkflowService.deleteStep(projectId, workflow.id, trigger!.id)).rejects.toThrow(
        /Cannot delete the trigger step/i,
      );
    });
  });

  // ========================================
  // WORKFLOW TRANSITIONS
  // ========================================
  describe('createTransition', () => {
    it('should create a transition between steps', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step1 = await factories.createWorkflowStep({workflowId: workflow.id});
      const step2 = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await WorkflowService.createTransition(projectId, workflow.id, {
        fromStepId: step1.id,
        toStepId: step2.id,
      });

      expect(transition.fromStepId).toBe(step1.id);
      expect(transition.toStepId).toBe(step2.id);
    });

    it('should create transition with condition', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step1 = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.CONDITION,
      });
      const step2 = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await WorkflowService.createTransition(projectId, workflow.id, {
        fromStepId: step1.id,
        toStepId: step2.id,
        condition: {branch: 'yes'},
        priority: 1,
      });

      expect(transition.condition).toEqual({branch: 'yes'});
      expect(transition.priority).toBe(1);
    });

    it('should prevent duplicate branch transitions from CONDITION steps', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const conditionStep = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.CONDITION,
      });
      const step2 = await factories.createWorkflowStep({workflowId: workflow.id});
      const step3 = await factories.createWorkflowStep({workflowId: workflow.id});

      // Create first 'yes' branch
      await WorkflowService.createTransition(projectId, workflow.id, {
        fromStepId: conditionStep.id,
        toStepId: step2.id,
        condition: {branch: 'yes'},
      });

      // Try to create second 'yes' branch - should fail
      await expect(
        WorkflowService.createTransition(projectId, workflow.id, {
          fromStepId: conditionStep.id,
          toStepId: step3.id,
          condition: {branch: 'yes'},
        }),
      ).rejects.toThrow(/already exists/i);
    });

    it('should allow different branches from CONDITION steps', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const conditionStep = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.CONDITION,
      });
      const yesStep = await factories.createWorkflowStep({workflowId: workflow.id});
      const noStep = await factories.createWorkflowStep({workflowId: workflow.id});

      const yesTransition = await WorkflowService.createTransition(projectId, workflow.id, {
        fromStepId: conditionStep.id,
        toStepId: yesStep.id,
        condition: {branch: 'yes'},
      });

      const noTransition = await WorkflowService.createTransition(projectId, workflow.id, {
        fromStepId: conditionStep.id,
        toStepId: noStep.id,
        condition: {branch: 'no'},
      });

      expect(yesTransition.condition).toEqual({branch: 'yes'});
      expect(noTransition.condition).toEqual({branch: 'no'});
    });

    it('should reject a second outgoing transition from a non-condition step', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step1 = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.DELAY});
      const step2 = await factories.createWorkflowStep({workflowId: workflow.id});
      const step3 = await factories.createWorkflowStep({workflowId: workflow.id});

      await WorkflowService.createTransition(projectId, workflow.id, {
        fromStepId: step1.id,
        toStepId: step2.id,
      });

      await expect(
        WorkflowService.createTransition(projectId, workflow.id, {
          fromStepId: step1.id,
          toStepId: step3.id,
        }),
      ).rejects.toThrow(/already leads to another step/i);
    });

    it('should reject connecting a step to itself', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step = await factories.createWorkflowStep({workflowId: workflow.id});

      await expect(
        WorkflowService.createTransition(projectId, workflow.id, {
          fromStepId: step.id,
          toStepId: step.id,
        }),
      ).rejects.toThrow(/cannot be connected to itself/i);
    });

    it('should reject an outgoing transition from an EXIT step', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const exitStep = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.EXIT});
      const step2 = await factories.createWorkflowStep({workflowId: workflow.id});

      await expect(
        WorkflowService.createTransition(projectId, workflow.id, {
          fromStepId: exitStep.id,
          toStepId: step2.id,
        }),
      ).rejects.toThrow(/exit step ends the flow/i);
    });

    it('should reject a transition that would close a loop', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const stepA = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.DELAY});
      const stepB = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.DELAY});
      const stepC = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.DELAY});

      await prisma.workflowTransition.create({data: {fromStepId: stepA.id, toStepId: stepB.id}});
      await prisma.workflowTransition.create({data: {fromStepId: stepB.id, toStepId: stepC.id}});

      await expect(
        WorkflowService.createTransition(projectId, workflow.id, {
          fromStepId: stepC.id,
          toStepId: stepA.id,
        }),
      ).rejects.toThrow(/loop/i);
    });

    it('should throw 404 when steps not found', async () => {
      const workflow = await factories.createWorkflow({projectId});

      await expect(
        WorkflowService.createTransition(projectId, workflow.id, {
          fromStepId: 'non-existent',
          toStepId: 'non-existent-2',
        }),
      ).rejects.toThrow('One or both steps not found');
    });
  });

  describe('insertStepOnTransition', () => {
    it('should split a transition into two around the new step', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const stepA = await factories.createWorkflowStep({workflowId: workflow.id});
      const stepB = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await prisma.workflowTransition.create({
        data: {fromStepId: stepA.id, toStepId: stepB.id},
      });

      const newStep = await WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
        type: WorkflowStepType.DELAY,
        name: 'Inserted delay',
        config: {},
      });

      const original = await prisma.workflowTransition.findUnique({where: {id: transition.id}});
      expect(original?.toStepId).toBe(newStep.id);

      const outgoing = await prisma.workflowTransition.findMany({where: {fromStepId: newStep.id}});
      expect(outgoing).toHaveLength(1);
      expect(outgoing[0]?.toStepId).toBe(stepB.id);
    });

    it('should preserve the branch condition on the upstream transition', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const conditionStep = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.CONDITION,
      });
      const stepB = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await prisma.workflowTransition.create({
        data: {fromStepId: conditionStep.id, toStepId: stepB.id, condition: {branch: 'yes'}, priority: 3},
      });

      const newStep = await WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Inserted email',
        config: {},
      });

      const original = await prisma.workflowTransition.findUnique({where: {id: transition.id}});
      expect(original?.condition).toEqual({branch: 'yes'});
      expect(original?.priority).toBe(3);

      // The transition carrying the flow onwards is unconditional
      const outgoing = await prisma.workflowTransition.findMany({where: {fromStepId: newStep.id}});
      expect(outgoing[0]?.condition).toBeNull();
    });

    it('should reject inserting an email step with a foreign template', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const stepA = await factories.createWorkflowStep({workflowId: workflow.id});
      const stepB = await factories.createWorkflowStep({workflowId: workflow.id});
      const transition = await prisma.workflowTransition.create({
        data: {fromStepId: stepA.id, toStepId: stepB.id},
      });
      const {project: otherProject} = await factories.createUserWithProject();
      const foreignTemplate = await factories.createTemplate({projectId: otherProject.id});
      const stepCount = await prisma.workflowStep.count({where: {workflowId: workflow.id}});

      await expect(
        WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
          type: WorkflowStepType.SEND_EMAIL,
          name: 'Inserted email',
          config: {},
          templateId: foreignTemplate.id,
        }),
      ).rejects.toMatchObject({code: 404, message: 'Template not found'});

      const original = await prisma.workflowTransition.findUnique({where: {id: transition.id}});
      expect(original?.toStepId).toBe(stepB.id);
      expect(await prisma.workflowStep.count({where: {workflowId: workflow.id}})).toBe(stepCount);
    });

    it('should attach the downstream step to the first branch when inserting a CONDITION', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const stepA = await factories.createWorkflowStep({workflowId: workflow.id});
      const stepB = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await prisma.workflowTransition.create({
        data: {fromStepId: stepA.id, toStepId: stepB.id},
      });

      const conditionStep = await WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
        type: WorkflowStepType.CONDITION,
        name: 'Inserted condition',
        config: {},
      });

      // A condition routes only by branch, so B has to hang off one of them
      const outgoing = await prisma.workflowTransition.findMany({where: {fromStepId: conditionStep.id}});
      expect(outgoing).toHaveLength(1);
      expect(outgoing[0]?.toStepId).toBe(stepB.id);
      expect(outgoing[0]?.condition).toEqual({branch: 'yes'});
    });

    it('should reject inserting an EXIT step', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const stepA = await factories.createWorkflowStep({workflowId: workflow.id});
      const stepB = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await prisma.workflowTransition.create({
        data: {fromStepId: stepA.id, toStepId: stepB.id},
      });

      await expect(
        WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
          type: WorkflowStepType.EXIT,
          name: 'Exit',
          config: {},
        }),
      ).rejects.toThrow(/exit step ends the flow/i);

      // Nothing was created and the original wiring is untouched
      const original = await prisma.workflowTransition.findUnique({where: {id: transition.id}});
      expect(original?.toStepId).toBe(stepB.id);
    });

    it('should reject inserting a TRIGGER step', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const stepA = await factories.createWorkflowStep({workflowId: workflow.id});
      const stepB = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await prisma.workflowTransition.create({
        data: {fromStepId: stepA.id, toStepId: stepB.id},
      });

      await expect(
        WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
          type: WorkflowStepType.TRIGGER,
          name: 'Trigger',
          config: {},
        }),
      ).rejects.toThrow(/trigger step cannot be inserted/i);
    });

    it('should throw 404 for a transition from another project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const otherWorkflow = await factories.createWorkflow({projectId: otherProject.id});
      const stepA = await factories.createWorkflowStep({workflowId: otherWorkflow.id});
      const stepB = await factories.createWorkflowStep({workflowId: otherWorkflow.id});

      const transition = await prisma.workflowTransition.create({
        data: {fromStepId: stepA.id, toStepId: stepB.id},
      });

      const workflow = await factories.createWorkflow({projectId});

      await expect(
        WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
          type: WorkflowStepType.DELAY,
          name: 'Inserted delay',
          config: {},
        }),
      ).rejects.toThrow('Transition not found');
    });
  });

  describe('deleteTransition', () => {
    it('should delete a transition', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const step1 = await factories.createWorkflowStep({workflowId: workflow.id});
      const step2 = await factories.createWorkflowStep({workflowId: workflow.id});

      const transition = await prisma.workflowTransition.create({
        data: {
          fromStepId: step1.id,
          toStepId: step2.id,
        },
      });

      await WorkflowService.deleteTransition(projectId, workflow.id, transition.id);

      const deleted = await prisma.workflowTransition.findUnique({
        where: {id: transition.id},
      });

      expect(deleted).toBeNull();
    });
  });

  // ========================================
  // WORKFLOW EXECUTION
  // ========================================
  describe('startExecution', () => {
    it('should start workflow execution for a contact', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
      });
      const contact = await factories.createContact({projectId});

      const execution = await WorkflowService.startExecution(projectId, workflow.id, contact.id);

      expect(execution.workflowId).toBe(workflow.id);
      expect(execution.contactId).toBe(contact.id);
      expect(execution.status).toBe(WorkflowExecutionStatus.RUNNING);
    });

    it('should throw error when workflow is disabled', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: false,
      });
      const contact = await factories.createContact({projectId});

      await expect(WorkflowService.startExecution(projectId, workflow.id, contact.id)).rejects.toThrow(
        'Workflow is not enabled',
      );
    });

    it('should throw error when contact not found', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
      });

      await expect(WorkflowService.startExecution(projectId, workflow.id, 'non-existent')).rejects.toThrow(
        'Contact not found',
      );
    });

    it('should prevent re-entry when allowReentry is false', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: false,
      });
      const contact = await factories.createContact({projectId});

      // First execution
      await WorkflowService.startExecution(projectId, workflow.id, contact.id);

      // Second execution should fail
      await expect(WorkflowService.startExecution(projectId, workflow.id, contact.id)).rejects.toThrow(
        /does not allow re-entry/i,
      );
    });

    it('should allow re-entry when allowReentry is true and previous execution completed', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: true,
      });
      const contact = await factories.createContact({projectId});

      // First execution
      const exec1 = await WorkflowService.startExecution(projectId, workflow.id, contact.id);

      // Complete it
      await prisma.workflowExecution.update({
        where: {id: exec1.id},
        data: {status: WorkflowExecutionStatus.COMPLETED},
      });

      // Second execution should succeed
      const exec2 = await WorkflowService.startExecution(projectId, workflow.id, contact.id);

      expect(exec2.id).not.toBe(exec1.id);
    });

    it('should prevent concurrent executions even with allowReentry=true', async () => {
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: true,
      });
      const contact = await factories.createContact({projectId});

      // Insert a RUNNING execution directly to avoid racing with the background
      // step processor that startExecution kicks off (a trigger-only workflow can
      // transition to COMPLETED before the second call observes it as RUNNING).
      const triggerStep = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });
      await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep?.id,
        },
      });

      // Second execution should fail (first still running)
      await expect(WorkflowService.startExecution(projectId, workflow.id, contact.id)).rejects.toThrow(
        /already running/i,
      );
    });
  });

  describe('listExecutions', () => {
    it('should list workflow executions with pagination', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const contacts = await factories.createContacts(projectId, 25);

      for (const contact of contacts) {
        await factories.createWorkflowExecution(workflow.id, contact.id);
      }

      const result = await WorkflowService.listExecutions(projectId, workflow.id, 1, 10);

      expect(result.executions).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('should filter executions by status', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const contact1 = await factories.createContact({projectId});
      const contact2 = await factories.createContact({projectId});
      const contact3 = await factories.createContact({projectId});

      await factories.createWorkflowExecution(workflow.id, contact1.id, {
        status: WorkflowExecutionStatus.RUNNING,
      });
      await factories.createWorkflowExecution(workflow.id, contact2.id, {
        status: WorkflowExecutionStatus.COMPLETED,
      });
      await factories.createWorkflowExecution(workflow.id, contact3.id, {
        status: WorkflowExecutionStatus.FAILED,
      });

      const running = await WorkflowService.listExecutions(
        projectId,
        workflow.id,
        1,
        20,
        WorkflowExecutionStatus.RUNNING,
      );

      expect(running.total).toBe(1);
      expect(running.executions[0].status).toBe(WorkflowExecutionStatus.RUNNING);
    });

    it('should include contact email in results', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const contact = await factories.createContact({
        projectId,
        email: 'test@example.com',
      });

      await factories.createWorkflowExecution(workflow.id, contact.id);

      const result = await WorkflowService.listExecutions(projectId, workflow.id);

      expect(result.executions[0].contact.email).toBe('test@example.com');
    });
  });

  describe('getExecution', () => {
    it('should get execution with full details', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const contact = await factories.createContact({projectId});
      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);

      const retrieved = await WorkflowService.getExecution(projectId, workflow.id, execution.id);

      expect(retrieved.id).toBe(execution.id);
      expect(retrieved.workflow.id).toBe(workflow.id);
      expect(retrieved.contact.id).toBe(contact.id);
    });

    it('should throw 404 when execution not found', async () => {
      const workflow = await factories.createWorkflow({projectId});

      await expect(WorkflowService.getExecution(projectId, workflow.id, 'non-existent')).rejects.toThrow(
        'Workflow execution not found',
      );
    });
  });

  describe('cancelExecution', () => {
    it('should cancel a running execution', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const contact = await factories.createContact({projectId});
      const execution = await factories.createWorkflowExecution(workflow.id, contact.id, {
        status: WorkflowExecutionStatus.RUNNING,
      });

      const cancelled = await WorkflowService.cancelExecution(projectId, workflow.id, execution.id);

      expect(cancelled.status).toBe(WorkflowExecutionStatus.CANCELLED);
      expect(cancelled.completedAt).toBeDefined();
    });
  });
});

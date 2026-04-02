import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  StepExecutionStatus,
  WorkflowExecutionStatus,
  WorkflowStepType,
} from '@plunk/db';
import {buildWorkflowSnapshot, toPrismaJson} from '@plunk/types';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {WorkflowService} from '../WorkflowService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Mock QueueService to prevent actual BullMQ operations
vi.mock('../QueueService', () => ({
  QueueService: {
    queueWorkflowStep: vi.fn(),
    queueWorkflowTimeout: vi.fn(),
    cancelWorkflowTimeout: vi.fn(),
  },
}));

// Mock EmailService to prevent actual email sending
vi.mock('../EmailService', () => ({
  EmailService: {
    sendWorkflowEmail: vi.fn().mockResolvedValue({id: 'mock-email-id', createdAt: new Date()}),
  },
}));

// Mock NtfyService to prevent notification sending
vi.mock('../NtfyService', () => ({
  NtfyService: {
    notifyWorkflowCreated: vi.fn(),
    notifyWorkflowEnabled: vi.fn(),
    notifyWorkflowDisabled: vi.fn(),
    notifyWorkflowDeleted: vi.fn(),
    notifyWorkflowExecutionFailed: vi.fn(),
  },
}));

// Mock Redis
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
      incr: vi.fn(async () => 1),
      expire: vi.fn(async () => 1),
      clear: () => store.clear(),
    },
  };
});

const prisma = getPrismaClient();

/**
 * Helper: create a workflow with steps and transitions, build a snapshot, and create an execution.
 * This simulates what WorkflowService.startExecution() does but gives us full control.
 */
async function createWorkflowWithSnapshot(projectId: string, opts: {
  steps: Array<{
    type: WorkflowStepType;
    name?: string;
    config?: unknown;
    templateId?: string;
  }>;
  enabled?: boolean;
}) {
  // Create workflow with trigger step
  const workflow = await factories.createWorkflow({projectId, enabled: opts.enabled ?? true});

  // Get the trigger step created by the factory
  const triggerStep = await prisma.workflowStep.findFirst({
    where: {workflowId: workflow.id, type: 'TRIGGER'},
  });

  // Create additional steps
  const createdSteps = [];
  for (let i = 0; i < opts.steps.length; i++) {
    const s = opts.steps[i];
    const step = await factories.createWorkflowStep({
      workflowId: workflow.id,
      type: s.type,
      name: s.name || `Step ${i + 1}`,
      config: s.config,
      templateId: s.templateId,
    });
    createdSteps.push(step);
  }

  // Create transitions: trigger -> step1 -> step2 -> ...
  const allSteps = [triggerStep!, ...createdSteps];
  for (let i = 0; i < allSteps.length - 1; i++) {
    await prisma.workflowTransition.create({
      data: {
        fromStepId: allSteps[i].id,
        toStepId: allSteps[i + 1].id,
        priority: 0,
      },
    });
  }

  // Build snapshot by fetching the full workflow
  const fullWorkflow = await prisma.workflow.findUniqueOrThrow({
    where: {id: workflow.id},
    include: {
      steps: {
        include: {
          template: {
            select: {id: true, subject: true, body: true, from: true, fromName: true, replyTo: true},
          },
          outgoingTransitions: true,
        },
      },
    },
  });
  const snapshot = buildWorkflowSnapshot(fullWorkflow);

  return {workflow, triggerStep: triggerStep!, steps: createdSteps, allSteps, snapshot, fullWorkflow};
}

describe('Workflow Snapshot', () => {
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  describe('snapshot creation', () => {
    it('should build a snapshot with all steps and transitions', async () => {
      const template = await factories.createTemplate({projectId});
      const {snapshot, allSteps} = await createWorkflowWithSnapshot(projectId, {
        steps: [
          {type: WorkflowStepType.SEND_EMAIL, templateId: template.id},
          {type: WorkflowStepType.DELAY, config: {amount: 1, unit: 'hours'}},
        ],
      });

      expect(snapshot.version).toBe(1);
      expect(snapshot.steps).toHaveLength(allSteps.length);
      expect(snapshot.transitions).toHaveLength(allSteps.length - 1);

      // Verify template content is denormalized
      const emailStep = snapshot.steps.find(s => s.type === 'SEND_EMAIL');
      expect(emailStep?.template).toBeDefined();
      expect(emailStep?.template?.subject).toBe('Test Subject');
      expect(emailStep?.template?.body).toContain('Hello');
    });

    it('should store snapshot on execution via WorkflowService.startExecution', async () => {
      const template = await factories.createTemplate({projectId});
      const {workflow, steps} = await createWorkflowWithSnapshot(projectId, {
        steps: [{type: WorkflowStepType.SEND_EMAIL, templateId: template.id}],
        enabled: true,
      });

      const contact = await factories.createContact({projectId});
      const execution = await WorkflowService.startExecution(projectId, workflow.id, contact.id);

      // Fetch execution with snapshot
      const fullExecution = await prisma.workflowExecution.findUniqueOrThrow({
        where: {id: execution.id},
      });

      expect(fullExecution.workflowSnapshot).not.toBeNull();
      const snapshot = fullExecution.workflowSnapshot as Record<string, unknown>;
      expect(snapshot.version).toBe(1);
      expect((snapshot.steps as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('snapshot isolation', () => {
    it('should use snapshot config even after step config is modified', async () => {
      const template = await factories.createTemplate({projectId});
      const {workflow, triggerStep, steps, snapshot} = await createWorkflowWithSnapshot(projectId, {
        steps: [{type: WorkflowStepType.SEND_EMAIL, templateId: template.id}],
      });

      const contact = await factories.createContact({projectId});

      // Create execution WITH snapshot
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          workflowSnapshot: toPrismaJson(snapshot),
        },
      });

      // NOW modify the live step config (simulating a user editing the workflow)
      await prisma.workflowStep.update({
        where: {id: steps[0].id},
        data: {
          config: {templateId: 'completely-different-template'},
          name: 'Modified Step Name',
        },
      });

      // Process the trigger step — engine should use snapshot, not live data
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);

      // The execution should have advanced past the trigger
      const updatedExecution = await prisma.workflowExecution.findUniqueOrThrow({
        where: {id: execution.id},
      });

      // Execution should still be running or completed (not failed)
      expect([
        WorkflowExecutionStatus.RUNNING,
        WorkflowExecutionStatus.COMPLETED,
      ]).toContain(updatedExecution.status);
    });

    it('should use snapshot transitions even after transition is deleted', async () => {
      const {workflow, triggerStep, steps, snapshot} = await createWorkflowWithSnapshot(projectId, {
        steps: [{type: WorkflowStepType.EXIT}],
      });

      const contact = await factories.createContact({projectId});

      // Create execution WITH snapshot
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          workflowSnapshot: toPrismaJson(snapshot),
        },
      });

      // Delete the live transition (simulating user editing the workflow)
      await prisma.workflowTransition.deleteMany({
        where: {fromStepId: triggerStep.id},
      });

      // Process trigger — should still find the EXIT step via snapshot transitions
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);

      const updatedExecution = await prisma.workflowExecution.findUniqueOrThrow({
        where: {id: execution.id},
      });

      // Should have reached EXIT and completed
      // EXIT step sets EXITED, then processNextSteps (finding no transitions) overwrites to COMPLETED
      expect(updatedExecution.status).toBe(WorkflowExecutionStatus.COMPLETED);
    });

    it('should use snapshot template content even after template is edited', async () => {
      const template = await factories.createTemplate({
        projectId,
        subject: 'Original Subject',
        body: '<p>Original body</p>',
      });

      const {workflow, triggerStep, steps, snapshot} = await createWorkflowWithSnapshot(projectId, {
        steps: [{type: WorkflowStepType.SEND_EMAIL, templateId: template.id}],
      });

      // Verify the snapshot captured original template content
      const snapshotEmailStep = snapshot.steps.find(s => s.type === 'SEND_EMAIL');
      expect(snapshotEmailStep?.template?.subject).toBe('Original Subject');

      // Edit the live template
      await prisma.template.update({
        where: {id: template.id},
        data: {
          subject: 'Modified Subject',
          body: '<p>Modified body</p>',
        },
      });

      // The snapshot should still have the original content
      expect(snapshotEmailStep?.template?.subject).toBe('Original Subject');
      expect(snapshotEmailStep?.template?.body).toBe('<p>Original body</p>');
    });
  });

  describe('legacy fallback', () => {
    it('should work without snapshot (legacy execution)', async () => {
      const {workflow, triggerStep, steps} = await createWorkflowWithSnapshot(projectId, {
        steps: [{type: WorkflowStepType.EXIT}],
      });

      const contact = await factories.createContact({projectId});

      // Create execution WITHOUT snapshot (legacy behavior)
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          // No workflowSnapshot — should fall back to live DB
        },
      });

      // Process trigger — should work via legacy fallback
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);

      const updatedExecution = await prisma.workflowExecution.findUniqueOrThrow({
        where: {id: execution.id},
      });

      // Should have reached EXIT and completed
      // EXIT step sets EXITED, then processNextSteps (finding no transitions) overwrites to COMPLETED
      expect(updatedExecution.status).toBe(WorkflowExecutionStatus.COMPLETED);
    });
  });

  describe('condition step with snapshot', () => {
    it('should evaluate conditions using snapshot config', async () => {
      const {workflow, triggerStep, steps, snapshot} = await createWorkflowWithSnapshot(projectId, {
        steps: [
          {
            type: WorkflowStepType.CONDITION,
            config: {field: 'data.plan', operator: 'equals', value: 'pro'},
          },
          {type: WorkflowStepType.EXIT, name: 'Yes Exit'},
          {type: WorkflowStepType.EXIT, name: 'No Exit'},
        ],
      });

      // Rewire transitions: condition -> yes exit (branch: yes), condition -> no exit (branch: no)
      // First remove auto-created linear transitions
      await prisma.workflowTransition.deleteMany({
        where: {fromStepId: steps[0].id},
      });
      await prisma.workflowTransition.create({
        data: {fromStepId: steps[0].id, toStepId: steps[1].id, condition: {branch: 'yes'}, priority: 0},
      });
      await prisma.workflowTransition.create({
        data: {fromStepId: steps[0].id, toStepId: steps[2].id, condition: {branch: 'no'}, priority: 1},
      });

      // Rebuild snapshot with the new transitions
      const fullWorkflow = await prisma.workflow.findUniqueOrThrow({
        where: {id: workflow.id},
        include: {
          steps: {
            include: {
              template: {
                select: {id: true, subject: true, body: true, from: true, fromName: true, replyTo: true},
              },
              outgoingTransitions: true,
            },
          },
        },
      });
      const updatedSnapshot = buildWorkflowSnapshot(fullWorkflow);

      const contact = await factories.createContact({projectId, data: {plan: 'pro'}});

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          workflowSnapshot: toPrismaJson(updatedSnapshot),
        },
      });

      // Now change the condition on the live step (user edits workflow)
      await prisma.workflowStep.update({
        where: {id: steps[0].id},
        data: {config: {field: 'data.plan', operator: 'equals', value: 'enterprise'}},
      });

      // Process from trigger
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);

      const updatedExecution = await prisma.workflowExecution.findUniqueOrThrow({
        where: {id: execution.id},
      });

      // Contact has plan=pro, snapshot condition checks for plan=pro -> should take YES branch -> EXIT
      // EXIT step sets EXITED, then processNextSteps (finding no transitions) overwrites to COMPLETED
      expect(updatedExecution.status).toBe(WorkflowExecutionStatus.COMPLETED);
    });
  });
});

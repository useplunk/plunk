import {beforeEach, describe, expect, it, vi} from 'vitest';
import {StepExecutionStatus, WorkflowExecutionStatus, WorkflowStepType, WorkflowWaitOutcome} from '@plunk/db';
import {toPrismaJson} from '@plunk/types';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

vi.mock('node:dns/promises', () => ({
  default: {
    lookup: vi.fn(async () => ({address: '1.2.3.4', family: 4})),
  },
}));

/**
 * Integration Tests: Workflow Execution Engine
 *
 * These tests verify the actual execution logic of workflows,
 * testing real step processing, conditional branching, event handling,
 * and complex multi-step scenarios.
 */

// Mock QueueService to prevent actual job queueing
vi.mock('../QueueService', () => ({
  QueueService: {
    queueWorkflowStep: vi.fn(async () => ({id: 'mock-job-id'})),
    queueEmail: vi.fn(async () => ({id: 'mock-email-job-id'})),
    queueWorkflowTimeout: vi.fn(async () => ({id: 'mock-timeout-job-id'})),
    cancelWorkflowTimeout: vi.fn(async () => true),
  },
}));

// Mock SES for email sending
vi.mock('../../services/ses', () => ({
  ses: {
    sendEmail: vi.fn(async () => ({MessageId: 'mock-message-id'})),
  },
}));

describe('WorkflowExecutionService - Integration Tests', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  // ========================================
  // CONDITIONAL BRANCHING (CONDITION STEPS)
  // ========================================
  describe('Conditional Branching', () => {
    it('should follow YES branch when condition evaluates to true', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {isPremium: true},
      });

      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      // Create condition step
      const conditionStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check Premium Status',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            field: 'data.isPremium',
            operator: 'equals',
            value: true,
          }),
        },
      });

      // Create YES and NO branches
      const yesStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Premium Path',
          position: {x: 200, y: -50},
          config: toPrismaJson({reason: 'Premium customer'}),
        },
      });

      const noStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Standard Path',
          position: {x: 200, y: 50},
          config: toPrismaJson({reason: 'Standard customer'}),
        },
      });

      // Create transitions
      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: conditionStep.id},
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: conditionStep.id,
          toStepId: yesStep.id,
          condition: toPrismaJson({branch: 'yes'}),
          priority: 1,
        },
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: conditionStep.id,
          toStepId: noStep.id,
          condition: toPrismaJson({branch: 'no'}),
          priority: 2,
        },
      });

      // Create execution
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      // Process trigger step
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);

      // Process condition step
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      // Verify YES branch was taken
      const stepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
        include: {step: true},
        orderBy: {createdAt: 'asc'},
      });

      // Should have: TRIGGER, CONDITION, and YES step
      expect(stepExecutions.length).toBeGreaterThanOrEqual(2);
      const conditionExec = stepExecutions.find(se => se.step.type === WorkflowStepType.CONDITION);
      expect(conditionExec).toBeDefined();
      expect(conditionExec?.status).toBe(StepExecutionStatus.COMPLETED);
      expect((conditionExec?.output as {branch?: string} | null)?.branch).toBe('yes');
    });

    it('should follow NO branch when condition evaluates to false', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {isPremium: false},
      });

      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      const conditionStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check Premium',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            field: 'data.isPremium',
            operator: 'equals',
            value: true,
          }),
        },
      });

      const yesStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Premium',
          position: {x: 200, y: -50},
          config: toPrismaJson({}),
        },
      });

      const noStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Standard',
          position: {x: 200, y: 50},
          config: toPrismaJson({}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: conditionStep.id},
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: conditionStep.id,
          toStepId: yesStep.id,
          condition: toPrismaJson({branch: 'yes'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: conditionStep.id,
          toStepId: noStep.id,
          condition: toPrismaJson({branch: 'no'}),
        },
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const stepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
        include: {step: true},
        orderBy: {createdAt: 'asc'},
      });

      const conditionExec = stepExecutions.find(se => se.step.type === WorkflowStepType.CONDITION);
      expect(conditionExec).toBeDefined();
      expect((conditionExec?.output as {branch?: string} | null)?.branch).toBe('no');
    });

    it('should handle complex nested conditions', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {country: 'US', isPremium: true},
      });

      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      // First condition: Check country
      const condition1 = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check Country',
          position: {x: 100, y: 0},
          config: toPrismaJson({field: 'data.country', operator: 'equals', value: 'US'}),
        },
      });

      // Second condition (nested): Check premium status (only for US)
      const condition2 = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check Premium (US)',
          position: {x: 200, y: -50},
          config: toPrismaJson({field: 'data.isPremium', operator: 'equals', value: true}),
        },
      });

      const usPremiumExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'US Premium',
          position: {x: 300, y: -75},
          config: toPrismaJson({}),
        },
      });

      const usStandardExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'US Standard',
          position: {x: 300, y: -25},
          config: toPrismaJson({}),
        },
      });

      const nonUsExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Non-US',
          position: {x: 200, y: 50},
          config: toPrismaJson({}),
        },
      });

      // Create transitions
      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: condition1.id},
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition1.id,
          toStepId: condition2.id,
          condition: toPrismaJson({branch: 'yes'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition1.id,
          toStepId: nonUsExit.id,
          condition: toPrismaJson({branch: 'no'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition2.id,
          toStepId: usPremiumExit.id,
          condition: toPrismaJson({branch: 'yes'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition2.id,
          toStepId: usStandardExit.id,
          condition: toPrismaJson({branch: 'no'}),
        },
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, condition1.id);
      await WorkflowExecutionService.processStepExecution(execution.id, condition2.id);

      const stepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
        include: {step: true},
        orderBy: {createdAt: 'asc'},
      });

      // Should have executed: TRIGGER → CONDITION (US) → CONDITION (Premium) → EXIT (US Premium)
      expect(stepExecutions.length).toBeGreaterThanOrEqual(3);
      const conditions = stepExecutions.filter(se => se.step.type === WorkflowStepType.CONDITION);
      expect(conditions).toHaveLength(2);
      expect((conditions[0].output as {branch?: string} | null)?.branch).toBe('yes'); // US = yes
      expect((conditions[1].output as {branch?: string} | null)?.branch).toBe('yes'); // Premium = yes
    });
  });

  // ========================================
  // WAIT_FOR_EVENT STEPS
  // ========================================
  describe('Wait for Event', () => {
    it('should pause workflow execution when waiting for event', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      const waitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.WAIT_FOR_EVENT,
          name: 'Wait for Purchase',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            eventName: 'purchase.completed',
            timeout: 3600, // 1 hour
          }),
        },
      });

      const exitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Complete',
          position: {x: 200, y: 0},
          config: toPrismaJson({}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: waitStep.id},
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: waitStep.id, toStepId: exitStep.id},
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, waitStep.id);

      // Verify step is in WAITING status
      const waitStepExecution = await prisma.workflowStepExecution.findFirst({
        where: {
          executionId: execution.id,
          stepId: waitStep.id,
        },
      });

      expect(waitStepExecution?.status).toBe(StepExecutionStatus.WAITING);

      // Verify workflow execution is in WAITING status
      const updatedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(updatedExecution?.status).toBe(WorkflowExecutionStatus.WAITING);
    });

    it('should resume workflow when expected event arrives', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      const waitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.WAIT_FOR_EVENT,
          name: 'Wait for Event',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            eventName: 'user.verified',
            timeout: 3600,
          }),
        },
      });

      const exitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Done',
          position: {x: 200, y: 0},
          config: toPrismaJson({}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: waitStep.id},
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: waitStep.id, toStepId: exitStep.id},
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, waitStep.id);

      // Verify waiting state
      const waitingExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });
      expect(waitingExecution?.status).toBe(WorkflowExecutionStatus.WAITING);

      // Simulate event arrival by calling handleEvent
      await WorkflowExecutionService.handleEvent(projectId, 'user.verified', contact.id, {verified: true});

      // Verify step execution was resumed
      const waitStepExecution = await prisma.workflowStepExecution.findFirst({
        where: {
          executionId: execution.id,
          stepId: waitStep.id,
        },
      });

      // Step should be completed after event arrives
      expect(waitStepExecution?.status).toBe(StepExecutionStatus.COMPLETED);
    });

    it('should resume a persisted wait on the event route with merged event context', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});
      const waitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.WAIT_FOR_EVENT,
          name: 'Wait for Purchase',
          position: {x: 100, y: 0},
          config: toPrismaJson({eventName: 'purchase.completed', timeout: 3600}),
        },
      });
      const eventCondition = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Inspect resumed plan',
          position: {x: 200, y: -50},
          config: toPrismaJson({field: 'event.plan', operator: 'equals', value: 'pro'}),
        },
      });
      const eventExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Event path',
          position: {x: 300, y: -75},
          config: toPrismaJson({}),
        },
      });
      const wrongPlanExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Wrong plan path',
          position: {x: 300, y: -25},
          config: toPrismaJson({}),
        },
      });
      const timeoutExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Timeout path',
          position: {x: 200, y: 50},
          config: toPrismaJson({}),
        },
      });

      await prisma.workflowTransition.createMany({
        data: [
          {fromStepId: waitStep.id, toStepId: eventCondition.id, waitOutcome: WorkflowWaitOutcome.EVENT},
          {fromStepId: waitStep.id, toStepId: timeoutExit.id, waitOutcome: WorkflowWaitOutcome.TIMEOUT},
          {fromStepId: eventCondition.id, toStepId: eventExit.id, condition: toPrismaJson({branch: 'yes'})},
          {fromStepId: eventCondition.id, toStepId: wrongPlanExit.id, condition: toPrismaJson({branch: 'no'})},
        ],
      });

      // These durable rows are all a new worker needs after a restart mid-wait.
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.WAITING,
          currentStepId: waitStep.id,
          context: toPrismaJson({source: 'signup', plan: 'free'}),
        },
      });
      const waitExecution = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: waitStep.id,
          status: StepExecutionStatus.WAITING,
          startedAt: new Date(),
        },
      });

      await WorkflowExecutionService.handleEvent(projectId, 'purchase.completed', contact.id, {
        plan: 'pro',
        orderId: 'order-123',
      });

      const resumed = await prisma.workflowExecution.findUniqueOrThrow({where: {id: execution.id}});
      expect(resumed.context).toEqual({source: 'signup', plan: 'pro', orderId: 'order-123'});

      const stepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
        include: {step: true},
      });
      expect(stepExecutions.some(item => item.step.id === eventExit.id)).toBe(true);
      expect(stepExecutions.some(item => item.step.id === timeoutExit.id)).toBe(false);
      expect(stepExecutions.some(item => item.step.id === wrongPlanExit.id)).toBe(false);
      expect(
        (stepExecutions.find(item => item.step.id === eventCondition.id)?.output as {branch?: string} | null)?.branch,
      ).toBe('yes');
      expect(
        (await prisma.workflowStepExecution.findUniqueOrThrow({where: {id: waitExecution.id}})).output,
      ).toMatchObject({waitOutcome: WorkflowWaitOutcome.EVENT, eventData: {plan: 'pro', orderId: 'order-123'}});
    });

    it('should follow only the timeout route when a persisted wait expires', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});
      const waitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.WAIT_FOR_EVENT,
          name: 'Wait for Purchase',
          position: {x: 100, y: 0},
          config: toPrismaJson({eventName: 'purchase.completed', timeout: 3600}),
        },
      });
      const eventExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Event path',
          position: {x: 200, y: -50},
          config: toPrismaJson({}),
        },
      });
      const timeoutExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Timeout path',
          position: {x: 200, y: 50},
          config: toPrismaJson({}),
        },
      });
      await prisma.workflowTransition.createMany({
        data: [
          {fromStepId: waitStep.id, toStepId: eventExit.id, waitOutcome: WorkflowWaitOutcome.EVENT},
          {fromStepId: waitStep.id, toStepId: timeoutExit.id, waitOutcome: WorkflowWaitOutcome.TIMEOUT},
        ],
      });
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.WAITING,
          currentStepId: waitStep.id,
          context: toPrismaJson({source: 'signup'}),
        },
      });
      const waitExecution = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: waitStep.id,
          status: StepExecutionStatus.WAITING,
          startedAt: new Date(),
        },
      });

      await WorkflowExecutionService.processTimeout(execution.id, waitStep.id, waitExecution.id);

      const stepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
        select: {stepId: true},
      });
      expect(stepExecutions.some(item => item.stepId === timeoutExit.id)).toBe(true);
      expect(stepExecutions.some(item => item.stepId === eventExit.id)).toBe(false);
      expect(
        (await prisma.workflowStepExecution.findUniqueOrThrow({where: {id: waitExecution.id}})).output,
      ).toMatchObject({waitOutcome: WorkflowWaitOutcome.TIMEOUT, timedOut: true});
    });
  });

  // ========================================
  // COMPLEX MULTI-STEP WORKFLOWS
  // ========================================
  describe('Complex Multi-Step Workflows', () => {
    it('should execute linear workflow end-to-end', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      // Build: TRIGGER → DELAY → CONDITION → EXIT
      const delay = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.DELAY,
          name: 'Wait 1 day',
          position: {x: 100, y: 0},
          config: toPrismaJson({amount: 1, unit: 'days'}),
        },
      });

      const condition = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check Status',
          position: {x: 200, y: 0},
          config: toPrismaJson({field: 'contact.subscribed', operator: 'equals', value: true}),
        },
      });

      const exit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Complete',
          position: {x: 300, y: 0},
          config: toPrismaJson({}),
        },
      });

      // Create transitions
      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: delay.id},
      });
      await prisma.workflowTransition.create({
        data: {fromStepId: delay.id, toStepId: condition.id},
      });
      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition.id,
          toStepId: exit.id,
          condition: toPrismaJson({branch: 'yes'}),
        },
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      // Execute through workflow
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);

      // Verify step executions were created
      const stepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
        include: {step: true},
        orderBy: {createdAt: 'asc'},
      });

      // Should have at least TRIGGER step
      expect(stepExecutions.length).toBeGreaterThanOrEqual(1);

      // Verify trigger step completed
      const triggerExec = stepExecutions.find(se => se.step.type === WorkflowStepType.TRIGGER);
      expect(triggerExec?.status).toBe(StepExecutionStatus.COMPLETED);
    });

    it('should handle workflows with multiple branches that converge', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {segment: 'A'},
      });

      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      // Split into A/B paths, then merge
      const condition = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'A/B Split',
          position: {x: 100, y: 0},
          config: toPrismaJson({field: 'data.segment', operator: 'equals', value: 'A'}),
        },
      });

      const pathA = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.DELAY,
          name: 'Path A Delay',
          position: {x: 200, y: -50},
          config: toPrismaJson({amount: 1, unit: 'hours'}),
        },
      });

      const pathB = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.DELAY,
          name: 'Path B Delay',
          position: {x: 200, y: 50},
          config: toPrismaJson({amount: 2, unit: 'hours'}),
        },
      });

      const merge = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Merge Point',
          position: {x: 300, y: 0},
          config: toPrismaJson({}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: condition.id},
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition.id,
          toStepId: pathA.id,
          condition: toPrismaJson({branch: 'yes'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition.id,
          toStepId: pathB.id,
          condition: toPrismaJson({branch: 'no'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: pathA.id, toStepId: merge.id},
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: pathB.id, toStepId: merge.id},
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, condition.id);

      const stepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
        include: {step: true},
        orderBy: {createdAt: 'asc'},
      });

      // Should have: TRIGGER, CONDITION, and Path A (since segment = 'A')
      expect(stepExecutions.length).toBeGreaterThanOrEqual(2);
      const conditionExec = stepExecutions.find(se => se.step.type === WorkflowStepType.CONDITION);
      expect((conditionExec?.output as {branch?: string} | null)?.branch).toBe('yes');
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================
  describe('Error Handling', () => {
    it('should mark workflow as FAILED when step execution fails', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      // Create a CONDITION step with invalid config (will fail)
      const badStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Bad Condition',
          position: {x: 100, y: 0},
          config: toPrismaJson({}), // Invalid - missing required fields
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: badStep.id},
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      // Processing the trigger step will automatically try to process the bad step
      // due to the transition, which will throw an error
      await expect(WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id)).rejects.toThrow();

      // Verify workflow execution is marked as FAILED
      const failedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(failedExecution?.status).toBe(WorkflowExecutionStatus.FAILED);
    });

    it('should handle missing contact data gracefully in CONDITION steps', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {}, // No fields
      });

      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      const condition = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check Missing Field',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            field: 'data.nonExistentField',
            operator: 'equals',
            value: 'something',
          }),
        },
      });

      const noStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Exit',
          position: {x: 200, y: 0},
          config: toPrismaJson({}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: condition.id},
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: condition.id,
          toStepId: noStep.id,
          condition: toPrismaJson({branch: 'no'}),
        },
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, condition.id);

      // Verify condition evaluated to 'no' when field doesn't exist
      const conditionExec = await prisma.workflowStepExecution.findFirst({
        where: {executionId: execution.id, stepId: condition.id},
      });

      expect(conditionExec?.status).toBe(StepExecutionStatus.COMPLETED);
      expect((conditionExec?.output as {branch?: string} | null)?.branch).toBe('no');
    });
  });

  // ========================================
  // EXIT STEPS
  // ========================================
  describe('Exit Steps', () => {
    it('should complete workflow when EXIT step is reached', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      const exitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Early Exit',
          position: {x: 100, y: 0},
          config: toPrismaJson({reason: 'User already converted'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: exitStep.id},
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson({}),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, exitStep.id);

      // Verify workflow completed
      const completedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(completedExecution?.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(completedExecution?.completedAt).toBeDefined();
    });
  });

  describe('Non-Persistent Data in Workflow Context', () => {
    it('should make non-persistent event data available throughout entire workflow execution', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {
          firstName: 'Alice',
          plan: 'enterprise',
        },
      });

      const workflow = await factories.createWorkflow({projectId});

      const triggerStep = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.TRIGGER,
        name: 'Start',
        position: {x: 0, y: 0},
        config: toPrismaJson({}),
      });

      const exitStep = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.EXIT,
        name: 'End',
        position: {x: 100, y: 0},
        config: toPrismaJson({}),
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: exitStep.id},
      });

      // Create execution with context containing both persistent and non-persistent data
      const contextData = {
        totalSpent: 999.99, // Persistent
        orderId: {value: 'ORD-789', persistent: false}, // Non-persistent
        trackingUrl: {value: 'https://track.example.com/ORD-789', persistent: false}, // Non-persistent
      };

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: toPrismaJson(contextData),
        },
      });

      // Verify context persists in execution record
      const savedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(savedExecution?.context).toMatchObject({
        totalSpent: 999.99,
        orderId: {value: 'ORD-789', persistent: false},
        trackingUrl: {value: 'https://track.example.com/ORD-789', persistent: false},
      });

      // Process workflow steps
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, exitStep.id);

      // Verify context still available after workflow completes
      const completedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(completedExecution?.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(completedExecution?.context).toMatchObject({
        totalSpent: 999.99,
        orderId: {value: 'ORD-789', persistent: false},
        trackingUrl: {value: 'https://track.example.com/ORD-789', persistent: false},
      });

      // Verify contact data was NOT polluted with non-persistent data
      const savedContact = await prisma.contact.findUnique({
        where: {id: contact.id},
      });

      expect(savedContact?.data).toMatchObject({
        firstName: 'Alice',
        plan: 'enterprise',
      });
      expect(savedContact?.data).not.toHaveProperty('orderId');
      expect(savedContact?.data).not.toHaveProperty('trackingUrl');
    });
  });

  // ========================================
  // EVENT DATA IN WORKFLOW CONDITIONS
  // ========================================
  describe('Event Data in Workflow Conditions', () => {
    it('should evaluate conditions using event.* fields', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});

      const triggerStep = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: 'TRIGGER'},
      });

      // Create condition step that checks event data
      const conditionStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check if first open',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            field: 'event.isFirstOpen',
            operator: 'equals',
            value: true, // Use boolean, not string
          }),
        },
      });

      const yesStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'First Open',
          position: {x: 200, y: 0},
          config: toPrismaJson({reason: 'first_open'}),
        },
      });

      const noStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Not First Open',
          position: {x: 200, y: 100},
          config: toPrismaJson({reason: 'not_first_open'}),
        },
      });

      // Connect steps
      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep!.id, toStepId: conditionStep.id},
      });
      await prisma.workflowTransition.create({
        data: {fromStepId: conditionStep.id, toStepId: yesStep.id, condition: toPrismaJson({branch: 'yes'})},
      });
      await prisma.workflowTransition.create({
        data: {fromStepId: conditionStep.id, toStepId: noStep.id, condition: toPrismaJson({branch: 'no'})},
      });

      // Create execution with event data
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep!.id,
          context: toPrismaJson({
            subject: 'Welcome Email',
            from: 'hello@example.com',
            isFirstOpen: true,
            openedAt: new Date().toISOString(),
          }),
        },
      });

      // Process the workflow
      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep!.id);

      // Verify it followed YES branch (first open)
      const completedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
        include: {stepExecutions: true},
      });

      expect(completedExecution?.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(completedExecution?.exitReason).toBe('first_open');
    });

    it('should evaluate conditions using event.subject field', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});

      const triggerStep = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: 'TRIGGER'},
      });

      const conditionStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check subject',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            field: 'event.subject',
            operator: 'contains',
            value: 'Welcome',
          }),
        },
      });

      const exitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Done',
          position: {x: 200, y: 0},
          config: toPrismaJson({reason: 'matched'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep!.id, toStepId: conditionStep.id},
      });
      await prisma.workflowTransition.create({
        data: {
          fromStepId: conditionStep.id,
          toStepId: exitStep.id,
          condition: toPrismaJson({branch: 'yes'}),
        },
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep!.id,
          context: toPrismaJson({
            subject: 'Welcome to Plunk!',
            from: 'team@plunk.com',
          }),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep!.id);

      const completedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(completedExecution?.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(completedExecution?.exitReason).toBe('matched');
    });

    it('should handle numeric event fields in conditions', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({projectId});

      const triggerStep = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: 'TRIGGER'},
      });

      const conditionStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Check opens count',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            field: 'event.opens',
            operator: 'greaterThan',
            value: '3',
          }),
        },
      });

      const exitStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Done',
          position: {x: 200, y: 0},
          config: toPrismaJson({reason: 'engaged'}),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep!.id, toStepId: conditionStep.id},
      });
      await prisma.workflowTransition.create({
        data: {
          fromStepId: conditionStep.id,
          toStepId: exitStep.id,
          condition: toPrismaJson({branch: 'yes'}),
        },
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep!.id,
          context: toPrismaJson({
            subject: 'Newsletter',
            opens: 5,
          }),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep!.id);

      const completedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(completedExecution?.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(completedExecution?.exitReason).toBe('engaged');
    });
  });

  // ========================================
  // EVENT DATA IN WEBHOOK CALLS
  // ========================================
  describe('Event Data in Webhook Calls', () => {
    it('should include event data in webhook payload', async () => {
      // Mock fetch to capture webhook calls
      const mockFetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({success: true}),
      }));
      global.fetch = mockFetch as unknown as typeof fetch;

      const contact = await factories.createContact({
        projectId,
        email: 'test@example.com',
      });
      const workflow = await factories.createWorkflow({projectId});

      const triggerStep = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: 'TRIGGER'},
      });

      const webhookStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.WEBHOOK,
          name: 'Send Webhook',
          position: {x: 100, y: 0},
          config: toPrismaJson({
            url: 'https://webhook.example.com/test',
            method: 'POST',
          }),
        },
      });

      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep!.id, toStepId: webhookStep.id},
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep!.id,
          context: toPrismaJson({
            subject: 'Welcome Email',
            from: 'hello@example.com',
            messageId: 'msg-123',
            isFirstOpen: true,
            openedAt: '2024-01-15T10:00:00Z',
          }),
        },
      });

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep!.id);

      // Verify webhook was called with event data
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webhook.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"event"'),
        }),
      );

      // Parse the body to verify event data structure
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.event).toMatchObject({
        subject: 'Welcome Email',
        from: 'hello@example.com',
        messageId: 'msg-123',
        isFirstOpen: true,
        openedAt: '2024-01-15T10:00:00Z',
      });

      expect(body.contact.email).toBe('test@example.com');
    });
  });
});

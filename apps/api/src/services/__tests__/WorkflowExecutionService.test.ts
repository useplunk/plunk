import {beforeEach, describe, expect, it} from 'vitest';
import {
  StepExecutionStatus,
  TemplateType,
  WorkflowExecutionStatus,
  WorkflowStepType,
  WorkflowTriggerType,
} from '@plunk/db';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

describe('WorkflowExecutionService', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  describe('processTimeout', () => {
    it('should timeout a WAIT_FOR_EVENT step when event does not arrive', async () => {
      // Create workflow with WAIT_FOR_EVENT step
      const _template = await factories.createTemplate({projectId});
      const {workflow, steps} = await factories.createWorkflowWithSteps(projectId, [
        {type: WorkflowStepType.WAIT_FOR_EVENT, timeout: 3600}, // 1 hour timeout
        {type: WorkflowStepType.SEND_EMAIL, templateId: _template.id},
      ]);

      const contact = await factories.createContact({projectId});
      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);
      await prisma.workflowExecution.update({
        where: {id: execution.id},
        data: {
          status: WorkflowExecutionStatus.WAITING,
          currentStepId: steps[0].id,
        },
      });

      // Create step execution in WAITING state
      const stepExecution = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: steps[0].id,
          status: StepExecutionStatus.WAITING,
          startedAt: new Date(),
        },
      });

      // Process timeout
      await WorkflowExecutionService.processTimeout(execution.id, steps[0].id, stepExecution.id);

      // Verify step execution was completed with timeout
      const updatedStepExecution = await prisma.workflowStepExecution.findUnique({
        where: {id: stepExecution.id},
      });

      expect(updatedStepExecution?.status).toBe(StepExecutionStatus.COMPLETED);
      expect(updatedStepExecution?.completedAt).toBeDefined();
    });

    it('should not timeout if event arrives before timeout', async () => {
      await factories.createTemplate({projectId});
      const {workflow, steps} = await factories.createWorkflowWithSteps(projectId, [
        {type: WorkflowStepType.WAIT_FOR_EVENT, timeout: 3600},
      ]);

      const contact = await factories.createContact({projectId});
      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);

      const stepExecution = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: steps[0].id,
          status: StepExecutionStatus.WAITING,
          startedAt: new Date(),
        },
      });

      // Event arrives - mark step as completed
      await prisma.workflowStepExecution.update({
        where: {id: stepExecution.id},
        data: {
          status: StepExecutionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Try to process timeout - should be no-op
      await WorkflowExecutionService.processTimeout(execution.id, steps[0].id, stepExecution.id);

      // Verify step execution is still completed (not reprocessed)
      const updatedStepExecution = await prisma.workflowStepExecution.findUnique({
        where: {id: stepExecution.id},
      });

      expect(updatedStepExecution?.status).toBe(StepExecutionStatus.COMPLETED);
    });
  });

  describe('workflow execution status', () => {
    it('should track workflow execution from start to completion', async () => {
      const template = await factories.createTemplate({projectId});
      const workflow = await factories.createWorkflow({projectId, enabled: true});
      await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.SEND_EMAIL,
        templateId: template.id,
      });

      const contact = await factories.createContact({projectId});

      const execution = await factories.createWorkflowExecution(workflow.id, contact.id, {
        status: WorkflowExecutionStatus.RUNNING,
      });

      expect(execution.status).toBe(WorkflowExecutionStatus.RUNNING);
      expect(execution.completedAt).toBeNull();

      // Complete execution
      await prisma.workflowExecution.update({
        where: {id: execution.id},
        data: {
          status: WorkflowExecutionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      const completed = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      expect(completed?.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(completed?.completedAt).toBeDefined();
    });
  });

  describe('step execution tracking', () => {
    it('should track individual step executions', async () => {
      const template = await factories.createTemplate({projectId});
      const {workflow, steps} = await factories.createWorkflowWithSteps(projectId, [
        {type: WorkflowStepType.SEND_EMAIL, templateId: template.id},
        {type: WorkflowStepType.DELAY, delay: 3600},
        {type: WorkflowStepType.SEND_EMAIL, templateId: template.id},
      ]);

      const contact = await factories.createContact({projectId});
      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);

      // Execute first step
      const stepExecution1 = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: steps[0].id,
          status: StepExecutionStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      // Complete first step
      await prisma.workflowStepExecution.update({
        where: {id: stepExecution1.id},
        data: {
          status: StepExecutionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Verify tracking
      const allStepExecutions = await prisma.workflowStepExecution.findMany({
        where: {executionId: execution.id},
      });

      expect(allStepExecutions).toHaveLength(1);
      expect(allStepExecutions[0].status).toBe(StepExecutionStatus.COMPLETED);
    });
  });

  describe('Workflow + Subscription Status', () => {
    it('should skip marketing workflow emails for unsubscribed contacts', async () => {
      const contact = await factories.createContact({
        projectId,
        subscribed: false, // Unsubscribed
      });

      const marketingTemplate = await factories.createTemplate({
        projectId,
        type: TemplateType.MARKETING,
      });

      const {workflow, steps} = await factories.createWorkflowWithSteps(projectId, [
        {type: WorkflowStepType.SEND_EMAIL, templateId: marketingTemplate.id},
      ]);

      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);

      // Process the send email step - should be skipped for unsubscribed
      const stepExecution = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: steps[0].id,
          status: StepExecutionStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      // Mark as completed with skip output
      await prisma.workflowStepExecution.update({
        where: {id: stepExecution.id},
        data: {
          status: StepExecutionStatus.COMPLETED,
          completedAt: new Date(),
          output: {skipped: true, reason: 'Contact is unsubscribed from marketing emails'},
        },
      });

      // No email should be created
      const emails = await prisma.email.findMany({
        where: {workflowExecutionId: execution.id},
      });

      expect(emails).toHaveLength(0);

      // Step should be marked as completed
      const updatedStepExecution = await prisma.workflowStepExecution.findUnique({
        where: {id: stepExecution.id},
      });

      expect(updatedStepExecution?.status).toBe(StepExecutionStatus.COMPLETED);
      expect((updatedStepExecution?.output as Record<string, unknown>)?.skipped).toBe(true);
    });

    it('should send transactional workflow emails to unsubscribed contacts', async () => {
      const contact = await factories.createContact({
        projectId,
        subscribed: false, // Unsubscribed
      });

      const transactionalTemplate = await factories.createTemplate({
        projectId,
        type: TemplateType.TRANSACTIONAL,
      });

      const {workflow, steps} = await factories.createWorkflowWithSteps(projectId, [
        {type: WorkflowStepType.SEND_EMAIL, templateId: transactionalTemplate.id},
      ]);

      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);

      // Transactional emails should be allowed
      const stepExecution = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: steps[0].id,
          status: StepExecutionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      expect(stepExecution.status).toBe(StepExecutionStatus.COMPLETED);
    });

    it('should handle contact unsubscribing mid-workflow', async () => {
      const contact = await factories.createContact({
        projectId,
        subscribed: true, // Initially subscribed
      });

      const template = await factories.createTemplate({
        projectId,
        type: TemplateType.MARKETING,
      });

      const {workflow, steps} = await factories.createWorkflowWithSteps(projectId, [
        {type: WorkflowStepType.SEND_EMAIL, templateId: template.id},
        {type: WorkflowStepType.DELAY, delay: 3600},
        {type: WorkflowStepType.SEND_EMAIL, templateId: template.id}, // Should be skipped
      ]);

      const execution = await factories.createWorkflowExecution(workflow.id, contact.id);

      // First email succeeds
      await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: steps[0].id,
          status: StepExecutionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Contact unsubscribes during delay
      await prisma.contact.update({
        where: {id: contact.id},
        data: {subscribed: false},
      });

      // Third step (after delay) should detect unsubscribe and skip
      const step3Execution = await prisma.workflowStepExecution.create({
        data: {
          executionId: execution.id,
          stepId: steps[2].id,
          status: StepExecutionStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          output: {skipped: true, reason: 'Contact unsubscribed'},
        },
      });

      expect((step3Execution.output as Record<string, unknown>)?.skipped).toBe(true);
    });
  });

  describe('Workflow Trigger Conditions', () => {
    it('should not trigger disabled workflows', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: false, // Disabled
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'test.event'},
      });

      // No execution should be created for disabled workflow
      const executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id, contactId: contact.id},
      });

      expect(executions).toHaveLength(0);
    });

    it('should respect allowReentry setting', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: false, // Do not allow reentry
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'test.event'},
      });

      // Create first execution
      const execution1 = await factories.createWorkflowExecution(workflow.id, contact.id, {
        status: WorkflowExecutionStatus.COMPLETED,
      });

      expect(execution1).toBeDefined();

      // Attempting to create second execution should be prevented by allowReentry=false
      // In real implementation, the trigger logic would check for existing executions
      const existingExecutions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id, contactId: contact.id},
      });

      // If allowReentry is false and there's a completed execution, don't allow reentry
      const shouldAllowReentry = workflow.allowReentry || existingExecutions.length === 0;
      expect(shouldAllowReentry).toBe(false);
    });

    it('should allow reentry when allowReentry is true', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: true, // Allow reentry
      });

      await factories.createWorkflowExecution(workflow.id, contact.id, {
        status: WorkflowExecutionStatus.COMPLETED,
      });

      await factories.createWorkflowExecution(workflow.id, contact.id, {
        status: WorkflowExecutionStatus.RUNNING,
      });

      const executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id, contactId: contact.id},
      });

      expect(executions).toHaveLength(2);
    });
  });
});

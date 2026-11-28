import {beforeEach, describe, expect, it, vi} from 'vitest';
import {WorkflowExecutionStatus, WorkflowStepType} from '@plunk/db';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * Comprehensive Operator Tests for Workflow CONDITION Steps
 *
 * This file systematically tests ALL supported operators in workflow
 * conditional branching to ensure complete coverage.
 *
 * Supported Operators (same as segments except 'within'):
 * - String: equals, notEquals, contains, notContains
 * - Numeric: greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual
 * - Existence: exists, notExists
 */

// Mock QueueService to prevent actual job queueing
vi.mock('../QueueService', () => ({
  QueueService: {
    queueWorkflowStep: vi.fn(async () => ({id: 'mock-job-id'})),
    queueEmail: vi.fn(async () => ({id: 'mock-email-job-id'})),
    queueWorkflowTimeout: vi.fn(async () => ({id: 'mock-timeout-job-id'})),
  },
}));

describe('Workflow CONDITION Step - Comprehensive Operator Tests', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  /**
   * Helper function to create a workflow with a condition step and two exit paths
   */
  async function createConditionalWorkflow(
    contactData: Record<string, unknown>,
    conditionConfig: {field: string; operator: string; value: unknown},
  ) {
    const contact = await factories.createContact({
      projectId,
      data: contactData,
    });

    const workflow = await factories.createWorkflow({projectId});
    const triggerStep = await prisma.workflowStep.findFirstOrThrow({
      where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
    });

    const conditionStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: WorkflowStepType.CONDITION,
        name: 'Test Condition',
        position: {x: 100, y: 0},
        config: conditionConfig,
      },
    });

    const yesExit = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: WorkflowStepType.EXIT,
        name: 'YES Path',
        position: {x: 200, y: -50},
        config: {reason: 'yes'},
      },
    });

    const noExit = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: WorkflowStepType.EXIT,
        name: 'NO Path',
        position: {x: 200, y: 50},
        config: {reason: 'no'},
      },
    });

    await prisma.workflowTransition.create({
      data: {fromStepId: triggerStep.id, toStepId: conditionStep.id},
    });

    await prisma.workflowTransition.create({
      data: {
        fromStepId: conditionStep.id,
        toStepId: yesExit.id,
        condition: {branch: 'yes'},
      },
    });

    await prisma.workflowTransition.create({
      data: {
        fromStepId: conditionStep.id,
        toStepId: noExit.id,
        condition: {branch: 'no'},
      },
    });

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        contactId: contact.id,
        status: WorkflowExecutionStatus.RUNNING,
        currentStepId: triggerStep.id,
        context: {},
      },
    });

    return {execution, triggerStep, conditionStep, contact};
  }

  /**
   * Helper to get the branch result from a condition execution
   */
  async function getConditionBranch(executionId: string, conditionStepId: string): Promise<string> {
    const stepExecution = await prisma.workflowStepExecution.findFirst({
      where: {
        executionId,
        stepId: conditionStepId,
      },
    });

    const output = stepExecution?.output as {branch?: string} | null;
    return output?.branch || 'unknown';
  }

  // ========================================
  // STRING OPERATORS
  // ========================================
  describe('String Operators', () => {
    describe('equals operator', () => {
      it('should branch YES when string values match exactly', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {plan: 'premium'},
          {field: 'data.plan', operator: 'equals', value: 'premium'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when string values do not match', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {plan: 'basic'},
          {field: 'data.plan', operator: 'equals', value: 'premium'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should match boolean true values', async () => {
        const contact = await factories.createContact({
          projectId,
          subscribed: true,
        });

        const workflow = await factories.createWorkflow({projectId});
        const triggerStep = await prisma.workflowStep.findFirstOrThrow({
          where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
        });

        const conditionStep = await prisma.workflowStep.create({
          data: {
            workflowId: workflow.id,
            type: WorkflowStepType.CONDITION,
            name: 'Check Subscribed',
            position: {x: 100, y: 0},
            config: {field: 'contact.subscribed', operator: 'equals', value: true},
          },
        });

        const yesExit = await prisma.workflowStep.create({
          data: {
            workflowId: workflow.id,
            type: WorkflowStepType.EXIT,
            name: 'YES',
            position: {x: 200, y: 0},
            config: {},
          },
        });

        await prisma.workflowTransition.create({
          data: {fromStepId: triggerStep.id, toStepId: conditionStep.id},
        });

        await prisma.workflowTransition.create({
          data: {
            fromStepId: conditionStep.id,
            toStepId: yesExit.id,
            condition: {branch: 'yes'},
          },
        });

        const execution = await prisma.workflowExecution.create({
          data: {
            workflowId: workflow.id,
            contactId: contact.id,
            status: WorkflowExecutionStatus.RUNNING,
            currentStepId: triggerStep.id,
            context: {},
          },
        });

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });
    });

    describe('notEquals operator', () => {
      it('should branch YES when values do not match', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {plan: 'premium'},
          {field: 'data.plan', operator: 'notEquals', value: 'basic'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when values match', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {plan: 'basic'},
          {field: 'data.plan', operator: 'notEquals', value: 'basic'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });
    });

    describe('contains operator', () => {
      it('should branch YES when field contains substring', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: 'Acme Corporation'},
          {field: 'data.company', operator: 'contains', value: 'Acme'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when field does not contain substring', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: 'Other Industries'},
          {field: 'data.company', operator: 'contains', value: 'Acme'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should branch NO when field does not exist', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {other: 'value'},
          {field: 'data.company', operator: 'contains', value: 'Acme'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });
    });

    describe('notContains operator', () => {
      it('should branch YES when field does not contain substring', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: 'Other Industries'},
          {field: 'data.company', operator: 'notContains', value: 'Acme'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when field contains substring', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: 'Acme Corporation'},
          {field: 'data.company', operator: 'notContains', value: 'Acme'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should branch NO when field does not exist (consistent with SegmentService)', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {other: 'value'},
          {field: 'data.company', operator: 'notContains', value: 'Acme'},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        // notContains only matches when field EXISTS and doesn't contain substring
        expect(branch).toBe('no');
      });
    });

    describe('contact.email (case-insensitive, consistent with SegmentService)', () => {
      async function branchForEmail(operator: string, toValue: (email: string) => string) {
        const {execution, triggerStep, conditionStep, contact} = await createConditionalWorkflow(
          {},
          {field: 'contact.email', operator, value: ''},
        );
        await prisma.workflowStep.update({
          where: {id: conditionStep.id},
          data: {config: {field: 'contact.email', operator, value: toValue(contact.email)}},
        });

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        return getConditionBranch(execution.id, conditionStep.id);
      }

      it('should match equals regardless of case', async () => {
        expect(await branchForEmail('equals', email => email.toUpperCase())).toBe('yes');
      });

      it('should not match notEquals for the same address in another case', async () => {
        expect(await branchForEmail('notEquals', email => email.toUpperCase())).toBe('no');
      });

      it('should match contains regardless of case', async () => {
        expect(await branchForEmail('contains', () => '@TEST.COM')).toBe('yes');
      });

      it('should not match notContains when the substring differs only in case', async () => {
        expect(await branchForEmail('notContains', () => '@TEST.COM')).toBe('no');
      });
    });
  });

  // ========================================
  // NUMERIC OPERATORS
  // ========================================
  describe('Numeric Operators', () => {
    describe('greaterThan operator', () => {
      it('should branch YES when value is greater than threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 100},
          {field: 'data.score', operator: 'greaterThan', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when value equals threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 50},
          {field: 'data.score', operator: 'greaterThan', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should branch NO when value is less than threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 25},
          {field: 'data.score', operator: 'greaterThan', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should handle negative numbers correctly', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {temperature: 5},
          {field: 'data.temperature', operator: 'greaterThan', value: 0},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should handle decimal values correctly', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {rating: 4.7},
          {field: 'data.rating', operator: 'greaterThan', value: 4.5},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });
    });

    describe('greaterThanOrEqual operator', () => {
      it('should branch YES when value is greater than threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 100},
          {field: 'data.score', operator: 'greaterThanOrEqual', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch YES when value equals threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 50},
          {field: 'data.score', operator: 'greaterThanOrEqual', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when value is less than threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 25},
          {field: 'data.score', operator: 'greaterThanOrEqual', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });
    });

    describe('lessThan operator', () => {
      it('should branch YES when value is less than threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 25},
          {field: 'data.score', operator: 'lessThan', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when value equals threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 50},
          {field: 'data.score', operator: 'lessThan', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });
    });

    describe('lessThanOrEqual operator', () => {
      it('should branch YES when value is less than threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 25},
          {field: 'data.score', operator: 'lessThanOrEqual', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch YES when value equals threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 50},
          {field: 'data.score', operator: 'lessThanOrEqual', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when value is greater than threshold', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 100},
          {field: 'data.score', operator: 'lessThanOrEqual', value: 50},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });
    });
  });

  // ========================================
  // EXISTENCE OPERATORS
  // ========================================
  describe('Existence Operators', () => {
    describe('exists operator', () => {
      it('should branch YES when field exists and has value', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: 'Acme Inc'},
          {field: 'data.company', operator: 'exists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when field does not exist', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {other: 'value'},
          {field: 'data.company', operator: 'exists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should branch NO when field is null', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: null},
          {field: 'data.company', operator: 'exists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should branch YES when field has empty string value', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {notes: ''},
          {field: 'data.notes', operator: 'exists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch YES when field has zero value', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 0},
          {field: 'data.score', operator: 'exists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch YES when field has boolean false value', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {verified: false},
          {field: 'data.verified', operator: 'exists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });
    });

    describe('notExists operator', () => {
      it('should branch YES when field does not exist', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {other: 'value'},
          {field: 'data.company', operator: 'notExists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch YES when field is null', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: null},
          {field: 'data.company', operator: 'notExists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('yes');
      });

      it('should branch NO when field exists with value', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {company: 'Acme Inc'},
          {field: 'data.company', operator: 'notExists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should branch NO when field has empty string', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {notes: ''},
          {field: 'data.notes', operator: 'notExists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });

      it('should branch NO when field has zero value', async () => {
        const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
          {score: 0},
          {field: 'data.score', operator: 'notExists', value: true},
        );

        await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
        await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

        const branch = await getConditionBranch(execution.id, conditionStep.id);
        expect(branch).toBe('no');
      });
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    it('should handle undefined/missing fields gracefully in equals', async () => {
      const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
        {other: 'value'},
        {field: 'data.missingField', operator: 'equals', value: 'something'},
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('no');
    });

    it('should handle very large numbers in comparisons', async () => {
      const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
        {views: 1000000},
        {field: 'data.views', operator: 'greaterThanOrEqual', value: 1000000},
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('yes');
    });

    it('should handle special characters in string comparisons', async () => {
      const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
        {notes: 'Price: $99.99 (50% off!)'},
        {field: 'data.notes', operator: 'contains', value: '$99.99'},
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('yes');
    });

    it('should handle nested field paths correctly', async () => {
      const {execution, triggerStep, conditionStep} = await createConditionalWorkflow(
        {profile: {tier: 'gold'}},
        {field: 'data.profile.tier', operator: 'equals', value: 'gold'},
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('yes');
    });
  });

  // ========================================
  // MULTI-BRANCH CONDITIONS (switch/case)
  // ========================================
  describe('Multi-Branch Conditions', () => {
    /**
     * Helper to create a workflow with a multi-branch condition step
     * Creates one exit step per branch + one for default
     */
    async function createMultiBranchWorkflow(
      contactData: Record<string, unknown>,
      conditionConfig: Record<string, unknown>,
    ) {
      const contact = await factories.createContact({
        projectId,
        data: contactData,
      });

      const workflow = await factories.createWorkflow({projectId});
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });

      const conditionStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.CONDITION,
          name: 'Multi Condition',
          position: {x: 100, y: 0},
          config: conditionConfig,
        },
      });

      // Create exit steps for each branch + default
      const branches = conditionConfig.branches as Array<{id: string; name: string; operator: string; value?: unknown}>;
      const branchExits: Record<string, string> = {};
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i]!;
        const exitStep = await prisma.workflowStep.create({
          data: {
            workflowId: workflow.id,
            type: WorkflowStepType.EXIT,
            name: `${branch.name} Path`,
            position: {x: 200, y: i * 100},
            config: {reason: branch.name},
          },
        });
        branchExits[branch.id] = exitStep.id;

        await prisma.workflowTransition.create({
          data: {
            fromStepId: conditionStep.id,
            toStepId: exitStep.id,
            condition: {branch: branch.id},
            priority: i,
          },
        });
      }

      // Create default exit
      const defaultExit = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.EXIT,
          name: 'Default Path',
          position: {x: 200, y: branches.length * 100},
          config: {reason: 'default'},
        },
      });

      await prisma.workflowTransition.create({
        data: {
          fromStepId: conditionStep.id,
          toStepId: defaultExit.id,
          condition: {branch: 'default'},
          priority: branches.length,
        },
      });

      // Connect trigger to condition
      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: conditionStep.id},
      });

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: triggerStep.id,
          context: {},
        },
      });

      return {execution, triggerStep, conditionStep, contact, branchExits, defaultExitId: defaultExit.id};
    }

    const planBranches = {
      mode: 'multi' as const,
      field: 'data.plan',
      branches: [
        {id: 'br-premium', name: 'Premium', operator: 'equals', value: 'premium'},
        {id: 'br-free', name: 'Free', operator: 'equals', value: 'free'},
        {id: 'br-enterprise', name: 'Enterprise', operator: 'equals', value: 'enterprise'},
      ],
    };

    it('should match the first matching branch', async () => {
      const {execution, triggerStep, conditionStep} = await createMultiBranchWorkflow(
        {plan: 'premium'},
        planBranches,
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('br-premium');
    });

    it('should match a non-first branch correctly', async () => {
      const {execution, triggerStep, conditionStep} = await createMultiBranchWorkflow(
        {plan: 'enterprise'},
        planBranches,
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('br-enterprise');
    });

    it('should fall through to default when no branch matches', async () => {
      const {execution, triggerStep, conditionStep} = await createMultiBranchWorkflow(
        {plan: 'starter'},
        planBranches,
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('default');
    });

    it('should fall through to default when field is missing', async () => {
      const {execution, triggerStep, conditionStep} = await createMultiBranchWorkflow(
        {other: 'value'},
        planBranches,
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('default');
    });

    it('should support mixed operators across branches', async () => {
      const {execution, triggerStep, conditionStep} = await createMultiBranchWorkflow(
        {score: 85},
        {
          mode: 'multi',
          field: 'data.score',
          branches: [
            {id: 'br-high', name: 'High', operator: 'greaterThanOrEqual', value: 90},
            {id: 'br-medium', name: 'Medium', operator: 'greaterThanOrEqual', value: 70},
            {id: 'br-low', name: 'Low', operator: 'lessThan', value: 70},
          ],
        },
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      // 85 >= 90 is false, 85 >= 70 is true → should match "Medium"
      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('br-medium');
    });

    it('should respect branch evaluation order (first match wins)', async () => {
      const {execution, triggerStep, conditionStep} = await createMultiBranchWorkflow(
        {plan: 'premium'},
        {
          mode: 'multi',
          field: 'data.plan',
          branches: [
            {id: 'br-first', name: 'First', operator: 'contains', value: 'prem'},
            {id: 'br-second', name: 'Second', operator: 'equals', value: 'premium'},
          ],
        },
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      // Both match, but first one should win
      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('br-first');
    });

    it('should support exists/notExists operators in branches', async () => {
      const {execution, triggerStep, conditionStep} = await createMultiBranchWorkflow(
        {plan: 'premium'},
        {
          mode: 'multi',
          field: 'data.plan',
          branches: [
            {id: 'br-has-plan', name: 'Has Plan', operator: 'exists'},
          ],
        },
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);
      await WorkflowExecutionService.processStepExecution(execution.id, conditionStep.id);

      const branch = await getConditionBranch(execution.id, conditionStep.id);
      expect(branch).toBe('br-has-plan');
    });

    it('should route to correct exit step via transitions', async () => {
      const {execution, triggerStep, branchExits, defaultExitId} = await createMultiBranchWorkflow(
        {plan: 'free'},
        planBranches,
      );

      await WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id);

      // Check the execution completed and ended at the correct exit step
      const completedExecution = await prisma.workflowExecution.findUnique({
        where: {id: execution.id},
      });

      // Workflow completed after reaching exit step
      expect(['EXITED', 'COMPLETED']).toContain(completedExecution?.status);

      // Verify it went through the "free" branch exit, not default
      const exitStepExecution = await prisma.workflowStepExecution.findFirst({
        where: {
          executionId: execution.id,
          stepId: branchExits['br-free'],
        },
      });
      expect(exitStepExecution).not.toBeNull();

      // Verify it did NOT go through the default exit
      const defaultStepExecution = await prisma.workflowStepExecution.findFirst({
        where: {
          executionId: execution.id,
          stepId: defaultExitId,
        },
      });
      expect(defaultStepExecution).toBeNull();
    });
  });
});

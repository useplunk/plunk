/**
 * Extended Prisma types
 * Types that extend Prisma models with additional relations or computed fields
 */

import type {
  Workflow,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStepExecution,
  WorkflowTransition,
  Template,
  Contact,
  Prisma,
} from '@plunk/db';

/**
 * Workflow with all steps, transitions, and template details
 * Used for workflow editor and detailed workflow views
 */
export interface WorkflowWithDetails extends Workflow {
  steps: Array<
    WorkflowStep & {
      template?: {id: string; name: string} | null;
      outgoingTransitions: WorkflowTransition[];
      incomingTransitions: WorkflowTransition[];
    }
  >;
}

/**
 * Workflow execution with full context
 * Used for execution details and monitoring
 */
export interface WorkflowExecutionWithDetails extends WorkflowExecution {
  workflow: Workflow;
  contact: {id: string; email: string};
  currentStep?: WorkflowStep | null;
  stepExecutions: WorkflowStepExecution[];
}

/**
 * Workflow execution with all relations loaded
 * Used internally by workflow execution engine
 */
export type WorkflowExecutionWithRelations = WorkflowExecution & {
  contact: Contact;
  workflow: Workflow;
};

/**
 * Workflow step with optional template
 * Used by step execution logic
 */
export type WorkflowStepWithTemplate = WorkflowStep & {
  template?: Template | null;
};

/**
 * Workflow step with outgoing transitions loaded
 * Used for flow control and navigation
 */
export type WorkflowStepWithTransitions = WorkflowStep & {
  outgoingTransitions?: Array<{
    id: string;
    condition: Prisma.JsonValue;
    waitOutcome: WorkflowTransition['waitOutcome'];
    priority: number;
    toStep: WorkflowStep;
  }>;
};

/**
 * Step configuration (JSON value)
 * Type-safe alias for workflow step config
 */
export type StepConfig = Prisma.JsonValue;

/**
 * Step execution result
 * Generic key-value result from step execution
 */
export type StepResult = Record<string, unknown>;

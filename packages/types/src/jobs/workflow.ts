/**
 * Workflow queue job data types
 */

/**
 * Job data for executing a workflow step
 * Used by: workflowQueue worker
 *
 * The HOLD jobs belong to a workflow rather than an execution:
 * - `hold-release`: move the executions parked on its HOLD steps into the steps inserted above
 *   them since they arrived.
 * - `hold-remove`: complete every execution parked on the HOLD `stepId`, then delete the step.
 */
export type WorkflowStepJobData =
  | {
      executionId: string;
      stepId: string;
      type?: 'process-step' | 'timeout' | 'delay-end'; // Job type for different handling
      stepExecutionId?: string; // For timeout jobs, reference to the step execution
    }
  | {type: 'hold-release'; workflowId: string}
  | {type: 'hold-remove'; workflowId: string; stepId: string};

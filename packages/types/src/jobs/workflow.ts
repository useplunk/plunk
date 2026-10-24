/**
 * Workflow queue job data types
 */

/**
 * Job data for executing a workflow step
 * Used by: workflowQueue worker
 */
export interface WorkflowStepJobData {
  executionId: string;
  stepId: string;
  type?: 'process-step' | 'timeout' | 'delay-end'; // Job type for different handling
  stepExecutionId?: string; // For timeout jobs, reference to the step execution
}

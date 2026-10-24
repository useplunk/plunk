/**
 * Background Job: Workflow Queue Processor
 * Processes workflow steps from the queue (for delayed steps)
 */

import type {WorkflowStepJobData} from '@plunk/types';
import {type Job, Worker} from 'bullmq';
import signale from 'signale';

import {workflowQueue} from '../services/QueueService.js';
import {WorkflowExecutionService} from '../services/WorkflowExecutionService.js';

export function createWorkflowWorker() {
  const worker = new Worker<WorkflowStepJobData>(
    workflowQueue.name,
    async (job: Job<WorkflowStepJobData>) => {
      const {executionId, stepId, type, stepExecutionId} = job.data;

      if (type === 'timeout') {
        // Handle timeout for WAIT_FOR_EVENT steps
        if (!stepExecutionId) {
          throw new Error('stepExecutionId is required for timeout jobs');
        }

        await WorkflowExecutionService.processTimeout(executionId, stepId, stepExecutionId);
      } else if (type === 'delay-end') {
        // Complete an execution whose DELAY step was the last step
        await WorkflowExecutionService.processDelayEnd(executionId, stepId);
      } else {
        // Handle regular step execution
        await WorkflowExecutionService.processStepExecution(executionId, stepId);
      }
    },
    {
      connection: workflowQueue.opts.connection,
      concurrency: 10, // Process up to 10 workflow steps concurrently
    },
  );

  worker.on('completed', job => {
    signale.info(`[WORKFLOW-PROCESSOR] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    signale.error(`[WORKFLOW-PROCESSOR] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', err => {
    signale.error('[WORKFLOW-PROCESSOR] Worker error:', err);
  });

  return worker;
}

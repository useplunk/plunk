import {CampaignStatus, EmailSourceType, EmailStatus} from '@plunk/db';
import {type Job, Queue} from 'bullmq';
import type {RedisOptions} from 'ioredis';
import signale from 'signale';
import type {
  ApiRequestCleanupJobData,
  IdempotencyKeyCleanupJobData,
  BulkContactActionJobData,
  BulkContactActionSelector,
  CampaignBatchJobData,
  CardVerificationJobData,
  CardVerificationSweepJobData,
  ContactImportJobData,
  DomainVerificationJobData,
  EmailBodyCleanupJobData,
  MeterEventJobData,
  ScheduledCampaignJobData,
  SegmentCountJobData,
  SendEmailJobData,
  WorkflowStepJobData,
} from '@plunk/types';

import {REDIS_URL} from '../app/constants.js';
import {prisma} from '../database/prisma.js';

/**
 * Queue Configuration
 */

const redisConnection: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Parse Redis URL
  ...parseRedisUrl(REDIS_URL),
};

function parseRedisUrl(url: string): {host: string; port: number; password?: string; db?: number} {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port || '6379', 10),
    password: urlObj.password || undefined,
    db: parseInt(urlObj.pathname.slice(1) || '0', 10),
  };
}

/**
 * Queue Instances
 */

export const emailQueue = new Queue<SendEmailJobData>('email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 1000, // Keep last 1000 completed jobs
    removeOnFail: 5000, // Keep last 5000 failed jobs
  },
});

export const campaignQueue = new Queue<CampaignBatchJobData>('campaign', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const workflowQueue = new Queue<WorkflowStepJobData>('workflow', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const scheduledQueue = new Queue<ScheduledCampaignJobData>('scheduled', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const importQueue = new Queue<ContactImportJobData>('import', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // Limited retries for imports
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 50, // Keep last 50 completed imports
    removeOnFail: 100, // Keep last 100 failed imports
  },
});

export const segmentCountQueue = new Queue<SegmentCountJobData>('segment-count', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});

export const domainVerificationQueue = new Queue<DomainVerificationJobData>('domain-verification', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});

export const apiRequestCleanupQueue = new Queue<ApiRequestCleanupJobData>('api-request-cleanup', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: 5, // Keep last 5 completed jobs
    removeOnFail: 20, // Keep last 20 failed jobs
  },
});

export const idempotencyKeyCleanupQueue = new Queue<IdempotencyKeyCleanupJobData>('idempotency-key-cleanup', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: 5, // Keep last 5 completed jobs
    removeOnFail: 20, // Keep last 20 failed jobs
  },
});

export const emailBodyCleanupQueue = new Queue<EmailBodyCleanupJobData>('email-body-cleanup', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: 5, // Keep last 5 completed jobs
    removeOnFail: 20, // Keep last 20 failed jobs
  },
});

export const bulkContactQueue = new Queue<BulkContactActionJobData>('bulk-contact-actions', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // Limited retries for bulk operations
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 50, // Keep last 50 completed bulk operations
    removeOnFail: 100, // Keep last 100 failed bulk operations
  },
});

export const meterQueue = new Queue<MeterEventJobData>('meter', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 5000,
    removeOnFail: 10000,
  },
});

// Retries here only cover soft failures (network, Stripe 5xx, issuer timeouts). A hard
// decline is a verdict, not a failure, so the processor resolves it without throwing.
export const cardVerificationQueue = new Queue<CardVerificationJobData>('card-verification', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

export const cardVerificationSweepQueue = new Queue<CardVerificationSweepJobData>('card-verification-sweep', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: 20,
    removeOnFail: 50,
  },
});

function emailPriorityFor(sourceType: EmailSourceType): number {
  switch (sourceType) {
    case EmailSourceType.TRANSACTIONAL:
      return 1;
    case EmailSourceType.WORKFLOW:
      return 5;
    case EmailSourceType.CAMPAIGN:
      return 10;
    default:
      return 5;
  }
}

/**
 * Queue Service - Centralized queue management
 */
export class QueueService {
  /**
   * Add email to queue for sending.
   *
   * Transactional emails jump the queue ahead of workflow and campaign sends
   * via BullMQ's priority (lower number = higher precedence). This prevents
   * latency-sensitive sends (login codes, password resets) from queuing behind
   * large campaign bursts on the shared `email` queue.
   */
  public static async queueEmail(
    emailId: string,
    sourceType: EmailSourceType,
    delay?: number,
  ): Promise<Job<SendEmailJobData>> {
    return emailQueue.add(
      'send-email',
      {emailId},
      {
        delay,
        jobId: `email-${emailId}`,
        priority: emailPriorityFor(sourceType),
      },
    );
  }

  /**
   * Add campaign batch to queue for processing
   */
  public static async queueCampaignBatch(data: CampaignBatchJobData): Promise<Job<CampaignBatchJobData>> {
    return campaignQueue.add('process-batch', data, {
      jobId: `campaign-${data.campaignId}-batch-${data.batchNumber}`,
    });
  }

  /**
   * Add workflow step to queue for execution
   */
  public static async queueWorkflowStep(
    executionId: string,
    stepId: string,
    delay?: number,
  ): Promise<Job<WorkflowStepJobData>> {
    return workflowQueue.add(
      'process-step',
      {executionId, stepId, type: 'process-step'},
      {
        delay,
        jobId: `workflow-${executionId}-${stepId}`,
      },
    );
  }

  /**
   * Queue a timeout handler for WAIT_FOR_EVENT steps
   */
  public static async queueWorkflowTimeout(
    executionId: string,
    stepId: string,
    stepExecutionId: string,
    timeoutMs: number,
  ): Promise<Job<WorkflowStepJobData>> {
    return workflowQueue.add(
      'timeout',
      {executionId, stepId, stepExecutionId, type: 'timeout'},
      {
        delay: timeoutMs,
        jobId: `workflow-timeout-${stepExecutionId}`,
      },
    );
  }

  /**
   * Cancel a queued timeout job
   */
  public static async cancelWorkflowTimeout(stepExecutionId: string): Promise<void> {
    const jobId = `workflow-timeout-${stepExecutionId}`;
    const job = await workflowQueue.getJob(jobId);

    if (job) {
      await job.remove();
      signale.info(`[QUEUE] Cancelled timeout job ${jobId}`);
    }
  }

  /**
   * Schedule campaign for future sending
   */
  public static async scheduleCampaign(campaignId: string, scheduledFor: Date): Promise<Job<ScheduledCampaignJobData>> {
    const delay = scheduledFor.getTime() - Date.now();

    return scheduledQueue.add(
      'send-scheduled-campaign',
      {campaignId},
      {
        delay: Math.max(0, delay),
        jobId: `scheduled-campaign-${campaignId}`,
      },
    );
  }

  /**
   * Cancel scheduled campaign
   */
  public static async cancelScheduledCampaign(campaignId: string): Promise<void> {
    const jobId = `scheduled-campaign-${campaignId}`;
    const job = await scheduledQueue.getJob(jobId);

    if (job) {
      await job.remove();
    }
  }

  /**
   * Queue contact import job
   */
  public static async queueImport(
    projectId: string,
    csvData: string,
    filename: string,
  ): Promise<Job<ContactImportJobData>> {
    return importQueue.add(
      'import-contacts',
      {projectId, csvData, filename},
      {
        jobId: `import-${projectId}-${Date.now()}`,
      },
    );
  }

  /**
   * Get import job status and progress
   * @param jobId - The job ID
   * @param projectId - The project ID to verify authorization
   * @returns Job status or null if not found or unauthorized
   */
  public static async getImportJobStatus(jobId: string, projectId: string) {
    const job = await importQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    // Security: Verify that the job belongs to the requesting project
    if (job.data.projectId !== projectId) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result: returnValue,
      data: job.data,
      failedReason,
    };
  }

  /**
   * Queue a Stripe meter event for reliable delivery with retries
   */
  public static async queueMeterEvent(
    customerId: string,
    value: number,
    idempotencyKey?: string,
  ): Promise<Job<MeterEventJobData>> {
    return meterQueue.add(
      'record-meter-event',
      {customerId, value, idempotencyKey},
      {
        jobId: idempotencyKey ? `meter-${idempotencyKey}` : undefined,
      },
    );
  }

  /**
   * Queue an off-session card verification charge for a freshly onboarded project.
   *
   * jobId is derived from the checkout session so a redelivered webhook cannot enqueue a
   * second charge, backing up the Stripe-side idempotency key in the processor.
   */
  public static async queueCardVerification(
    data: CardVerificationJobData,
    jobId?: string,
  ): Promise<Job<CardVerificationJobData>> {
    return cardVerificationQueue.add('verify-card', data, {
      jobId: jobId ?? `card-verification-${data.sessionId}`,
    });
  }

  /**
   * Queue bulk contact action job
   */
  public static async queueBulkContactAction(
    projectId: string,
    selector: BulkContactActionSelector,
    operation: 'subscribe' | 'unsubscribe' | 'delete',
  ): Promise<Job<BulkContactActionJobData>> {
    return bulkContactQueue.add(
      'bulk-contact-action',
      {projectId, operation, selector},
      {
        jobId: `bulk-${operation}-${projectId}-${Date.now()}`,
      },
    );
  }

  /**
   * Get bulk action job status and progress
   * @param jobId - The job ID
   * @param projectId - The project ID to verify authorization
   * @returns Job status or null if not found or unauthorized
   */
  public static async getBulkActionJobStatus(jobId: string, projectId: string) {
    const job = await bulkContactQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    // Security: Verify that the job belongs to the requesting project
    if (job.data.projectId !== projectId) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result: returnValue,
      data: job.data,
      failedReason,
    };
  }

  /**
   * Queue segment count update job
   */
  public static async queueSegmentCountUpdate(projectId?: string): Promise<Job<SegmentCountJobData>> {
    return segmentCountQueue.add(
      'update-segment-counts',
      {projectId},
      {
        jobId: projectId ? `segment-count-${projectId}-${Date.now()}` : `segment-count-all-${Date.now()}`,
      },
    );
  }

  /**
   * Get queue statistics
   */
  public static async getStats() {
    const [
      emailCounts,
      campaignCounts,
      workflowCounts,
      scheduledCounts,
      importCounts,
      segmentCountCounts,
      domainVerificationCounts,
      apiRequestCleanupCounts,
      idempotencyKeyCleanupCounts,
      bulkContactCounts,
      meterCounts,
    ] = await Promise.all([
      emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      campaignQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      workflowQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      scheduledQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      importQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      segmentCountQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      domainVerificationQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      apiRequestCleanupQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      idempotencyKeyCleanupQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      bulkContactQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      meterQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ]);

    return {
      email: emailCounts,
      campaign: campaignCounts,
      workflow: workflowCounts,
      scheduled: scheduledCounts,
      import: importCounts,
      segmentCount: segmentCountCounts,
      domainVerification: domainVerificationCounts,
      apiRequestCleanup: apiRequestCleanupCounts,
      idempotencyKeyCleanup: idempotencyKeyCleanupCounts,
      bulkContact: bulkContactCounts,
      meter: meterCounts,
    };
  }

  /**
   * Pause all queues (for maintenance)
   */
  public static async pauseAll(): Promise<void> {
    await Promise.all([
      emailQueue.pause(),
      campaignQueue.pause(),
      workflowQueue.pause(),
      scheduledQueue.pause(),
      importQueue.pause(),
      segmentCountQueue.pause(),
      domainVerificationQueue.pause(),
      apiRequestCleanupQueue.pause(),
      bulkContactQueue.pause(),
      meterQueue.pause(),
    ]);
  }

  /**
   * Resume all queues
   */
  public static async resumeAll(): Promise<void> {
    await Promise.all([
      emailQueue.resume(),
      campaignQueue.resume(),
      workflowQueue.resume(),
      scheduledQueue.resume(),
      importQueue.resume(),
      segmentCountQueue.resume(),
      domainVerificationQueue.resume(),
      apiRequestCleanupQueue.resume(),
      bulkContactQueue.resume(),
      meterQueue.resume(),
    ]);
  }

  /**
   * Clean old jobs (should be run periodically)
   */
  public static async cleanOldJobs(): Promise<void> {
    const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours

    await Promise.all([
      emailQueue.clean(gracePeriod, 1000, 'completed'),
      emailQueue.clean(gracePeriod * 7, 1000, 'failed'), // Keep failed jobs for 7 days
      campaignQueue.clean(gracePeriod, 100, 'completed'),
      campaignQueue.clean(gracePeriod * 7, 500, 'failed'),
      workflowQueue.clean(gracePeriod, 1000, 'completed'),
      workflowQueue.clean(gracePeriod * 7, 1000, 'failed'),
      scheduledQueue.clean(gracePeriod, 100, 'completed'),
      scheduledQueue.clean(gracePeriod * 7, 500, 'failed'),
      importQueue.clean(gracePeriod, 50, 'completed'),
      importQueue.clean(gracePeriod * 7, 100, 'failed'),
      segmentCountQueue.clean(gracePeriod, 10, 'completed'),
      segmentCountQueue.clean(gracePeriod * 7, 50, 'failed'),
      domainVerificationQueue.clean(gracePeriod, 10, 'completed'),
      domainVerificationQueue.clean(gracePeriod * 7, 50, 'failed'),
      bulkContactQueue.clean(gracePeriod, 50, 'completed'),
      bulkContactQueue.clean(gracePeriod * 7, 100, 'failed'),
      meterQueue.clean(gracePeriod * 30, 5000, 'completed'), // Keep 30 days for billing audit
      meterQueue.clean(gracePeriod * 30, 10000, 'failed'),
    ]);
  }

  /**
   * Cancel all pending jobs for a specific project
   * This should be called when a project is disabled
   */
  public static async cancelAllProjectJobs(projectId: string): Promise<void> {
    signale.info(`[QUEUE] Cancelling all pending jobs for project ${projectId}`);

    // Cancel all scheduled campaigns for this project
    const scheduledCampaigns = await scheduledQueue.getJobs(['waiting', 'delayed']);
    for (const job of scheduledCampaigns) {
      // We need to check if the campaign belongs to this project
      // by looking up the campaign in the database
      const campaign = await prisma.campaign.findUnique({
        where: {id: job.data.campaignId},
        select: {projectId: true},
      });

      if (campaign?.projectId === projectId) {
        await job.remove();
        signale.info(`[QUEUE] Removed scheduled campaign job ${job.id}`);
      }
    }

    // Cancel all pending emails for this project
    const pendingEmails = await emailQueue.getJobs(['waiting', 'delayed']);
    for (const job of pendingEmails) {
      const email = await prisma.email.findUnique({
        where: {id: job.data.emailId},
        select: {projectId: true},
      });

      if (email?.projectId === projectId) {
        await job.remove();
        signale.info(`[QUEUE] Removed email job ${job.id}`);
      }
    }

    // Cancel all pending campaign batches for this project
    const campaignBatches = await campaignQueue.getJobs(['waiting', 'delayed']);
    for (const job of campaignBatches) {
      const campaign = await prisma.campaign.findUnique({
        where: {id: job.data.campaignId},
        select: {projectId: true},
      });

      if (campaign?.projectId === projectId) {
        await job.remove();
        signale.info(`[QUEUE] Removed campaign batch job ${job.id}`);
      }
    }

    // Cancel all pending workflow steps for this project
    const workflowSteps = await workflowQueue.getJobs(['waiting', 'delayed']);
    for (const job of workflowSteps) {
      const execution = await prisma.workflowExecution.findUnique({
        where: {id: job.data.executionId},
        select: {workflow: {select: {projectId: true}}},
      });

      if (execution?.workflow.projectId === projectId) {
        await job.remove();
        signale.info(`[QUEUE] Removed workflow step job ${job.id}`);
      }
    }

    // Mark every still-PENDING email for this project as FAILED. We just stripped
    // their queue jobs, so without this they'd sit as PENDING forever and any
    // campaign waiting on them would stay stuck in SENDING.
    const failed = await prisma.email.updateMany({
      where: {projectId, status: EmailStatus.PENDING},
      data: {status: EmailStatus.FAILED, error: 'Project is disabled'},
    });

    if (failed.count > 0) {
      signale.info(`[QUEUE] Marked ${failed.count} pending emails as failed for project ${projectId}`);
    }

    // Finalize any in-flight campaigns. With the orphaned PENDING emails now FAILED
    // (terminal), the campaign can move to SENT with a partial sentCount instead of
    // staying stuck in SENDING. Reconcile totalRecipients first since the batch
    // chain may have been cut short.
    const sendingCampaigns = await prisma.campaign.findMany({
      where: {projectId, status: CampaignStatus.SENDING},
      select: {id: true},
    });

    if (sendingCampaigns.length > 0) {
      const {CampaignService} = await import('./CampaignService.js');
      for (const campaign of sendingCampaigns) {
        const actualEmailCount = await prisma.email.count({where: {campaignId: campaign.id}});
        await prisma.campaign.update({
          where: {id: campaign.id},
          data: {totalRecipients: actualEmailCount},
        });
        await CampaignService.finalizeIfDone(campaign.id);
      }
    }

    signale.info(`[QUEUE] Finished cancelling jobs for project ${projectId}`);
  }

  /**
   * Close all queue connections
   */
  public static async closeAll(): Promise<void> {
    await Promise.all([
      emailQueue.close(),
      campaignQueue.close(),
      workflowQueue.close(),
      scheduledQueue.close(),
      importQueue.close(),
      segmentCountQueue.close(),
      domainVerificationQueue.close(),
      apiRequestCleanupQueue.close(),
      bulkContactQueue.close(),
      meterQueue.close(),
    ]);
  }
}

import { vi } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';

/**
 * Job testing helper
 * Provides utilities to test BullMQ job processors without Redis
 */

export interface MockJob<T = any> {
  id: string;
  data: T;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  returnvalue?: any;
  failedReason?: string;
}

/**
 * Create a mock BullMQ job
 */
export function createMockJob<T>(data: T, options: Partial<MockJob<T>> = {}): Job<T> {
  const mockJob = {
    id: options.id || `job-${Date.now()}`,
    data,
    attemptsMade: options.attemptsMade || 0,
    processedOn: options.processedOn,
    finishedOn: options.finishedOn,
    returnvalue: options.returnvalue,
    failedReason: options.failedReason,
    // Mock methods
    updateProgress: vi.fn(),
    log: vi.fn(),
    moveToCompleted: vi.fn(),
    moveToFailed: vi.fn(),
    remove: vi.fn(),
    retry: vi.fn(),
  } as unknown as Job<T>;

  return mockJob;
}

/**
 * Mock queue for testing job creation
 */
export class MockQueue<T = any> {
  private jobs: Array<{ name?: string; data: T; opts?: any }> = [];

  async add(name: string | T, data?: T | any, opts?: any) {
    // Handle both queue.add(data) and queue.add(name, data) patterns
    const jobName = typeof name === 'string' ? name : undefined;
    const jobData = typeof name === 'string' ? data : name;
    const jobOpts = typeof name === 'string' ? opts : data;

    this.jobs.push({
      name: jobName,
      data: jobData,
      opts: jobOpts,
    });

    return createMockJob(jobData, { id: `mock-${this.jobs.length}` });
  }

  getJobs() {
    return this.jobs;
  }

  getJobsByName(name: string) {
    return this.jobs.filter((job) => job.name === name);
  }

  clear() {
    this.jobs = [];
  }

  async close() {
    // No-op for mock
  }
}

/**
 * Create mock queues for testing
 */
export function createMockQueues() {
  return {
    email: new MockQueue(),
    campaign: new MockQueue(),
    scheduledCampaign: new MockQueue(),
    workflow: new MockQueue(),
    import: new MockQueue(),
    segmentCount: new MockQueue(),
    domainVerification: new MockQueue(),
  };
}

/**
 * Job processor test helper
 * Allows testing job processors in isolation
 */
export class JobProcessorTester<T = any> {
  private processor: (job: Job<T>) => Promise<any>;

  constructor(processor: (job: Job<T>) => Promise<any>) {
    this.processor = processor;
  }

  /**
   * Process a job with test data
   */
  async process(data: T, options: Partial<MockJob<T>> = {}) {
    const job = createMockJob(data, options);
    return this.processor(job);
  }

  /**
   * Process multiple jobs
   */
  async processMany(dataArray: T[], options: Partial<MockJob<T>> = {}) {
    const results = [];
    for (const data of dataArray) {
      const result = await this.process(data, options);
      results.push(result);
    }
    return results;
  }
}

/**
 * Create a job processor tester
 */
export function createJobTester<T = any>(processor: (job: Job<T>) => Promise<any>) {
  return new JobProcessorTester<T>(processor);
}

/**
 * Mock external services for job testing
 */
export function createServiceMocks() {
  return {
    // Mock SES (email sending)
    ses: {
      sendEmail: vi.fn().mockResolvedValue({ MessageId: 'mock-message-id' }),
      sendRawEmail: vi.fn().mockResolvedValue({ MessageId: 'mock-message-id' }),
    },

    // Mock Azure Blob Storage (file storage)
    azureBlob: {
      uploadFile: vi.fn().mockResolvedValue({ url: 'https://mock-storage.blob.core.windows.net/uploads/file.jpg', key: 'file.jpg' }),
      isStorageEnabled: vi.fn().mockReturnValue(true),
    },

    // Mock Redis
    redis: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
    },
  };
}

/**
 * Wait for jobs to complete (useful in integration tests with real queues)
 */
export async function waitForJobs(queue: Queue, timeout = 5000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
    const pending = counts.waiting + counts.active + counts.delayed;

    if (pending === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Jobs did not complete within ${timeout}ms`);
}

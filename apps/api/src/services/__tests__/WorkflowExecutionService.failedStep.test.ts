import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {StepExecutionStatus, WorkflowExecutionStatus, WorkflowStepType} from '@plunk/db';
import {NtfyService} from '../NtfyService';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

vi.mock('../QueueService', () => ({
  QueueService: {
    queueEmail: vi.fn(async () => ({id: 'mock-email-job-id'})),
    queueWorkflowTimeout: vi.fn(async () => ({id: 'mock-timeout-job-id'})),
    cancelWorkflowTimeout: vi.fn(async () => true),
  },
}));

// The engine refuses to call a private address, so this webhook step always fails
const FAILING_WEBHOOK = {url: 'http://127.0.0.1/hook', method: 'POST'};

let projectId: string;
let contactId: string;
const prisma = getPrismaClient();

/** A workflow made of `steps` in a line after its trigger, with a RUNNING execution for the contact */
async function createRun(steps: Array<{type: WorkflowStepType; config: Record<string, unknown>}>) {
  const workflow = await factories.createWorkflow({projectId});
  const trigger = await prisma.workflowStep.findFirstOrThrow({
    where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
  });
  const stepIds = [trigger.id];
  for (const step of steps) {
    const created = await factories.createWorkflowStep({workflowId: workflow.id, type: step.type, config: step.config});
    await prisma.workflowTransition.create({data: {fromStepId: stepIds.at(-1)!, toStepId: created.id}});
    stepIds.push(created.id);
  }
  const execution = await prisma.workflowExecution.create({
    data: {workflowId: workflow.id, contactId, status: WorkflowExecutionStatus.RUNNING, currentStepId: trigger.id},
  });

  return {
    executionId: execution.id,
    start: () => WorkflowExecutionService.processStepExecution(execution.id, trigger.id),
    /** Each step's execution, in the order of the workflow */
    steps: async () => {
      const rows = await prisma.workflowStepExecution.findMany({where: {executionId: execution.id}});
      return stepIds.map(id => rows.find(row => row.stepId === id));
    },
    status: async () => (await prisma.workflowExecution.findUniqueOrThrow({where: {id: execution.id}})).status,
  };
}

/**
 * A failing step is the only one marked failed: the error is rethrown through the catch of every
 * step before it in the same run, which completed and keep their result.
 */
describe('WorkflowExecutionService - the step that failed', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    contactId = (await factories.createContact({projectId, subscribed: true})).id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks only the failing step of a run, and the execution once', async () => {
    const ntfy = vi.spyOn(NtfyService, 'notifyWorkflowExecutionFailed');
    const run = await createRun([
      {type: WorkflowStepType.UPDATE_CONTACT, config: {updates: {stage: 'welcomed'}}},
      {type: WorkflowStepType.WEBHOOK, config: FAILING_WEBHOOK},
    ]);

    await expect(run.start()).rejects.toThrow(/private/i);

    const [trigger, update, webhook] = await run.steps();
    expect(trigger).toMatchObject({status: StepExecutionStatus.COMPLETED, error: null});
    expect(update).toMatchObject({status: StepExecutionStatus.COMPLETED, error: null});
    expect(update!.output).toMatchObject({updated: true});
    expect(webhook).toMatchObject({status: StepExecutionStatus.FAILED});
    expect(webhook!.error).toMatch(/private/i);
    expect(await run.status()).toBe(WorkflowExecutionStatus.FAILED);
    expect(ntfy).toHaveBeenCalledTimes(1);
  });

  it('keeps a completed step completed, with the error, when moving on from it fails', async () => {
    const ntfy = vi.spyOn(NtfyService, 'notifyWorkflowExecutionFailed');
    const run = await createRun([{type: WorkflowStepType.UPDATE_CONTACT, config: {updates: {stage: 'welcomed'}}}]);
    vi.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      WorkflowExecutionService as any,
      'processNextSteps',
    ).mockRejectedValueOnce(new Error('transition failed'));

    await expect(run.start()).rejects.toThrow('transition failed');

    const [trigger] = await run.steps();
    expect(trigger).toMatchObject({status: StepExecutionStatus.COMPLETED, error: 'transition failed'});
    expect(await run.status()).toBe(WorkflowExecutionStatus.FAILED);
    expect(ntfy).toHaveBeenCalledTimes(1);
  });

  it('fails both executions when a step fails in another execution it resumed through an event', async () => {
    const ntfy = vi.spyOn(NtfyService, 'notifyWorkflowExecutionFailed');
    // B waits for the contact to unsubscribe, then calls a webhook that fails
    const waiting = await createRun([
      {type: WorkflowStepType.WAIT_FOR_EVENT, config: {eventName: 'contact.unsubscribed', timeout: 3600}},
      {type: WorkflowStepType.WEBHOOK, config: FAILING_WEBHOOK},
    ]);
    await waiting.start();
    expect(await waiting.status()).toBe(WorkflowExecutionStatus.WAITING);

    // A unsubscribes the contact, which resumes B inside A's step
    const unsubscribing = await createRun([
      {type: WorkflowStepType.UPDATE_CONTACT, config: {subscriptionAction: 'unsubscribe'}},
    ]);
    await expect(unsubscribing.start()).rejects.toThrow(/private/i);

    // Each execution has its own failed step, and the steps before it stay completed
    const [, wait, webhook] = await waiting.steps();
    expect(wait).toMatchObject({status: StepExecutionStatus.COMPLETED});
    expect(webhook).toMatchObject({status: StepExecutionStatus.FAILED});
    expect(await waiting.status()).toBe(WorkflowExecutionStatus.FAILED);

    const [trigger, update] = await unsubscribing.steps();
    expect(trigger).toMatchObject({status: StepExecutionStatus.COMPLETED});
    expect(update).toMatchObject({status: StepExecutionStatus.FAILED});
    expect(update!.error).toMatch(/private/i);
    expect(await unsubscribing.status()).toBe(WorkflowExecutionStatus.FAILED);
    expect(ntfy).toHaveBeenCalledTimes(2);
  });

  it('keeps the trigger completed when the only step after it fails', async () => {
    const run = await createRun([{type: WorkflowStepType.WEBHOOK, config: FAILING_WEBHOOK}]);

    await expect(run.start()).rejects.toThrow(/private/i);

    const [trigger, webhook] = await run.steps();
    expect(trigger).toMatchObject({status: StepExecutionStatus.COMPLETED});
    expect(webhook).toMatchObject({status: StepExecutionStatus.FAILED});
    expect(await run.status()).toBe(WorkflowExecutionStatus.FAILED);
  });
});

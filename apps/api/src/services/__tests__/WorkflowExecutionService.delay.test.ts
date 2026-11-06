import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WorkflowExecutionStatus, WorkflowStepType} from '@plunk/db';
import {QueueService} from '../QueueService';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {WorkflowService} from '../WorkflowService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

vi.mock('../QueueService', () => ({
  QueueService: {
    queueWorkflowDelayEnd: vi.fn(async () => ({id: 'mock-delay-end-job-id'})),
    queueEmail: vi.fn(async () => ({id: 'mock-email-job-id'})),
    queueWorkflowTimeout: vi.fn(async () => ({id: 'mock-timeout-job-id'})),
    cancelWorkflowTimeout: vi.fn(async () => true),
    queueWorkflowHoldRelease: vi.fn(async () => undefined),
  },
}));

const DELAY = {type: WorkflowStepType.DELAY, config: {amount: 1, unit: 'hours'}};

let projectId: string;
let contactId: string;
const prisma = getPrismaClient();

/** TRIGGER → DELAY, with nothing after the delay and a RUNNING execution. */
async function createRun() {
  const workflow = await factories.createWorkflow({projectId});
  const trigger = await prisma.workflowStep.findFirstOrThrow({
    where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
  });
  const delay = await factories.createWorkflowStep({workflowId: workflow.id, type: DELAY.type, config: DELAY.config});
  await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: delay.id}});

  const execution = await prisma.workflowExecution.create({
    data: {workflowId: workflow.id, contactId, status: WorkflowExecutionStatus.RUNNING, currentStepId: trigger.id},
  });

  return {
    workflowId: workflow.id,
    executionId: execution.id,
    delayStepId: delay.id,
    start: () => WorkflowExecutionService.processStepExecution(execution.id, trigger.id),
    endDelay: () => WorkflowExecutionService.processDelayEnd(execution.id, delay.id),
  };
}

type Run = Awaited<ReturnType<typeof createRun>>;

/** Where the run ended up, and how many emails it sent. */
async function outcome(run: Run) {
  const {status} = await prisma.workflowExecution.findUniqueOrThrow({where: {id: run.executionId}});
  const emails = await prisma.email.count({where: {workflowExecutionId: run.executionId}});
  return {status, emails};
}

/**
 * A delay that is the last step used to queue nothing, leaving the execution WAITING forever.
 * It now schedules its own end, which completes the run (or follows a step connected in the meantime).
 */
describe('WorkflowExecutionService - a delay with no step after it', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    contactId = (await factories.createContact({projectId, subscribed: true})).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('schedules the end of the delay', async () => {
    const run = await createRun();

    await run.start();

    expect(await outcome(run)).toEqual({status: WorkflowExecutionStatus.WAITING, emails: 0});
    expect(QueueService.queueWorkflowDelayEnd).toHaveBeenCalledWith(
      run.executionId,
      run.delayStepId,
      expect.any(String),
      60 * 60 * 1000,
    );
  });

  it('completes the run when the delay ends', async () => {
    const run = await createRun();
    await run.start();

    await run.endDelay();

    expect(await outcome(run)).toEqual({status: WorkflowExecutionStatus.COMPLETED, emails: 0});
    const execution = await prisma.workflowExecution.findUniqueOrThrow({where: {id: run.executionId}});
    expect(execution.currentStepId).toBeNull();
    expect(execution.completedAt).not.toBeNull();
  });

  it('runs a step connected after the delay while the contact was waiting', async () => {
    const run = await createRun();
    await run.start();

    const template = await factories.createTemplate({projectId});
    const send = await factories.createWorkflowStep({
      workflowId: run.workflowId,
      type: WorkflowStepType.SEND_EMAIL,
      templateId: template.id,
    });
    await prisma.workflowTransition.create({data: {fromStepId: run.delayStepId, toStepId: send.id}});

    await run.endDelay();

    expect(await outcome(run)).toEqual({status: WorkflowExecutionStatus.COMPLETED, emails: 1});
  });

  it('leaves a cancelled run cancelled when the delay ends', async () => {
    const run = await createRun();
    await run.start();
    await WorkflowService.cancelExecution(projectId, run.workflowId, run.executionId);

    await run.endDelay();

    expect(await outcome(run)).toEqual({status: WorkflowExecutionStatus.CANCELLED, emails: 0});
  });

  it('does nothing when the run no longer exists', async () => {
    const run = await createRun();
    await run.start();
    await prisma.workflowExecution.delete({where: {id: run.executionId}});

    await expect(run.endDelay()).resolves.toBeUndefined();
  });
});

/**
 * A delay used to pick the step after it when it started, so a step inserted after the delay while
 * the contact waited was skipped. It now looks the step up when the delay ends.
 */
describe('WorkflowExecutionService - a step inserted after a delay while the contact waits', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    contactId = (await factories.createContact({projectId, subscribed: true})).id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /** TRIGGER → DELAY → SEND_EMAIL, with the run waiting in the delay */
  async function waitingRun() {
    const run = await createRun();
    const template = await factories.createTemplate({projectId});
    const send = await factories.createWorkflowStep({
      workflowId: run.workflowId,
      type: WorkflowStepType.SEND_EMAIL,
      templateId: template.id,
    });
    const afterDelay = await prisma.workflowTransition.create({data: {fromStepId: run.delayStepId, toStepId: send.id}});
    await run.start();
    return {...run, afterDelay};
  }

  it('runs the inserted step when the delay ends', async () => {
    const run = await waitingRun();
    const template = await factories.createTemplate({projectId});
    await WorkflowService.insertStepOnTransition(projectId, run.workflowId, run.afterDelay.id, {
      type: WorkflowStepType.SEND_EMAIL,
      name: 'Inserted',
      config: {templateId: template.id},
      templateId: template.id,
    });

    // The delay queued its own end, not the step that followed it when it started
    expect(QueueService.queueWorkflowDelayEnd).toHaveBeenCalledWith(
      run.executionId,
      run.delayStepId,
      expect.any(String),
      60 * 60 * 1000,
    );

    await run.endDelay();

    expect(await outcome(run)).toEqual({status: WorkflowExecutionStatus.COMPLETED, emails: 2});
  });

  it('ignores the end of a delay the run has already left', async () => {
    const run = await createRun();
    const second = await factories.createWorkflowStep({workflowId: run.workflowId, ...DELAY});
    await prisma.workflowTransition.create({data: {fromStepId: run.delayStepId, toStepId: second.id}});
    await run.start();
    await run.endDelay();

    // Now waiting in the second delay; a late run of the first one's job must not move it on
    await run.endDelay();

    const execution = await prisma.workflowExecution.findUniqueOrThrow({where: {id: run.executionId}});
    expect(execution).toMatchObject({status: WorkflowExecutionStatus.WAITING, currentStepId: second.id});
    expect(await prisma.workflowStepExecution.count({where: {executionId: run.executionId, stepId: second.id}})).toBe(
      1,
    );
  });
});

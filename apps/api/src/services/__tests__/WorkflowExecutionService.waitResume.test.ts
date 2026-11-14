import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {StepExecutionStatus, WorkflowExecutionStatus, WorkflowStepType} from '@plunk/db';
import {prisma as servicePrisma} from '../../database/prisma';
import {QueueService} from '../QueueService';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

vi.mock('../QueueService', () => ({
  QueueService: {
    queueWorkflowStep: vi.fn(async () => ({id: 'mock-job-id'})),
    queueEmail: vi.fn(async () => ({id: 'mock-email-job-id'})),
    queueWorkflowTimeout: vi.fn(async () => ({id: 'mock-timeout-job-id'})),
    cancelWorkflowTimeout: vi.fn(async () => true),
  },
}));

const EVENT = 'order.shipped';

type Run = Awaited<ReturnType<typeof createRun>>;

let projectId: string;
let contactId: string;
const prisma = getPrismaClient();

/** TRIGGER → WAIT_FOR_EVENT → SEND_EMAIL, started and parked on the wait. */
async function createRun() {
  const workflow = await factories.createWorkflow({projectId});
  const trigger = await prisma.workflowStep.findFirstOrThrow({
    where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
  });
  const wait = await factories.createWorkflowStep({
    workflowId: workflow.id,
    type: WorkflowStepType.WAIT_FOR_EVENT,
    config: {eventName: EVENT, timeout: 3600},
  });
  const template = await factories.createTemplate({projectId});
  const send = await factories.createWorkflowStep({
    workflowId: workflow.id,
    type: WorkflowStepType.SEND_EMAIL,
    templateId: template.id,
  });
  await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: wait.id}});
  await prisma.workflowTransition.create({data: {fromStepId: wait.id, toStepId: send.id}});

  const execution = await prisma.workflowExecution.create({
    data: {workflowId: workflow.id, contactId, status: WorkflowExecutionStatus.RUNNING, currentStepId: trigger.id},
  });
  await WorkflowExecutionService.processStepExecution(execution.id, trigger.id);

  const waitExecution = () =>
    prisma.workflowStepExecution.findFirstOrThrow({where: {executionId: execution.id, stepId: wait.id}});
  expect((await waitExecution()).status).toBe(StepExecutionStatus.WAITING);

  return {
    executionId: execution.id,
    sendStepId: send.id,
    waitExecution,
    timeOut: async () => WorkflowExecutionService.processTimeout(execution.id, wait.id, (await waitExecution()).id),
  };
}

/** How many times the step after the wait ran, and how many emails the run sent. */
async function outcome(run: Run) {
  const sends = await prisma.workflowStepExecution.count({
    where: {executionId: run.executionId, stepId: run.sendStepId},
  });
  const emails = await prisma.email.count({where: {workflowExecutionId: run.executionId}});
  return {sends, emails};
}

const once = {sends: 1, emails: 1};

const ship = () => WorkflowExecutionService.handleEvent(projectId, EVENT, contactId);

/**
 * A wait is resumed once, however many deliveries of its event reach it: the list of waits an
 * event reads can be stale by the time it gets to each of them.
 */
describe('WorkflowExecutionService - resuming a wait once', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    contactId = (await factories.createContact({projectId, subscribed: true})).id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('moves on once when the same event arrives twice at the same time', async () => {
    for (let round = 0; round < 5; round++) {
      const run = await createRun();

      await Promise.all([ship(), ship()]);

      expect(await outcome(run)).toEqual(once);
    }
  });

  it('moves on once when a resumed execution delivers the event again', async () => {
    const first = await createRun();
    const second = await createRun();

    // While the first execution is being resumed, the same event is tracked again (as a step of
    // the resumed execution can do) and resumes the second one.
    vi.spyOn(QueueService, 'cancelWorkflowTimeout').mockImplementationOnce(async () => {
      await ship();
    });

    await ship();

    expect(await outcome(first)).toEqual(once);
    expect(await outcome(second)).toEqual(once);
  });

  it('takes one way out when the event and the timeout arrive at the same time', async () => {
    const run = await createRun();

    await Promise.all([ship(), run.timeOut()]);

    expect(await outcome(run)).toEqual(once);
  });

  it('leaves a wait alone when its timeout read it before the event claimed it', async () => {
    const run = await createRun();
    const waiting = await servicePrisma.workflowStepExecution.findUniqueOrThrow({
      where: {id: (await run.waitExecution()).id},
      include: {execution: true, step: {include: {outgoingTransitions: {include: {toStep: true}}}}},
    });

    await ship();
    // The timeout job read the wait while it was still WAITING
    vi.spyOn(servicePrisma.workflowStepExecution, 'findUnique').mockResolvedValueOnce(waiting);
    await run.timeOut();

    expect(await outcome(run)).toEqual(once);
    expect((await run.waitExecution()).output).toMatchObject({eventName: EVENT, receivedAt: expect.any(String)});
  });

  it('moves on when the timeout job cannot be cancelled', async () => {
    const run = await createRun();

    // BullMQ refuses to remove a job another worker is running.
    vi.spyOn(QueueService, 'cancelWorkflowTimeout').mockRejectedValueOnce(
      new Error('Job could not be removed because it is locked by another worker'),
    );

    await ship();

    expect(await outcome(run)).toEqual(once);
    const {status} = await prisma.workflowExecution.findUniqueOrThrow({where: {id: run.executionId}});
    expect(status).toBe(WorkflowExecutionStatus.COMPLETED);
  });
});

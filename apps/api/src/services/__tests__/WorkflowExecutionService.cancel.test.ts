import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {StepExecutionStatus, WorkflowExecutionStatus, WorkflowStepType} from '@plunk/db';
import {EventService} from '../EventService';
import {QueueService} from '../QueueService';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {WorkflowService} from '../WorkflowService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

vi.mock('../QueueService', () => ({
  QueueService: {
    queueWorkflowStep: vi.fn(async () => ({id: 'mock-job-id'})),
    queueEmail: vi.fn(async () => ({id: 'mock-email-job-id'})),
    queueWorkflowTimeout: vi.fn(async () => ({id: 'mock-timeout-job-id'})),
    cancelWorkflowTimeout: vi.fn(async () => true),
  },
}));

const WAIT = {type: WorkflowStepType.WAIT_FOR_EVENT, config: {eventName: 'order.shipped', timeout: 3600}};
const DELAY = {type: WorkflowStepType.DELAY, config: {amount: 1, unit: 'hours'}};
const EXIT = {type: WorkflowStepType.EXIT, config: {reason: 'done'}};

type Run = Awaited<ReturnType<typeof createRun>>;

let projectId: string;
let contactId: string;
const prisma = getPrismaClient();

/**
 * TRIGGER → <step> → SEND_EMAIL (or TRIGGER → <step> when `last`), with a RUNNING execution.
 * `exitCondition` tags the transition out of <step>, e.g. `{branch: 'timeout'}` after a wait.
 */
async function createRun(
  step: {type: WorkflowStepType; config: Record<string, unknown>},
  {last = false, exitCondition}: {last?: boolean; exitCondition?: Record<string, unknown>} = {},
) {
  const workflow = await factories.createWorkflow({projectId});
  const trigger = await prisma.workflowStep.findFirstOrThrow({
    where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
  });
  const middle = await factories.createWorkflowStep({workflowId: workflow.id, type: step.type, config: step.config});
  await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: middle.id}});

  let sendStepId: string | undefined;
  if (!last) {
    const template = await factories.createTemplate({projectId});
    const send = await factories.createWorkflowStep({
      workflowId: workflow.id,
      type: WorkflowStepType.SEND_EMAIL,
      templateId: template.id,
    });
    sendStepId = send.id;
    await prisma.workflowTransition.create({
      data: {fromStepId: middle.id, toStepId: send.id, condition: exitCondition},
    });
  }

  const execution = await prisma.workflowExecution.create({
    data: {workflowId: workflow.id, contactId, status: WorkflowExecutionStatus.RUNNING, currentStepId: trigger.id},
  });
  const stepExecution = () =>
    prisma.workflowStepExecution.findFirstOrThrow({where: {executionId: execution.id, stepId: middle.id}});

  return {
    workflowId: workflow.id,
    executionId: execution.id,
    sendStepId,
    stepExecution,
    start: () => WorkflowExecutionService.processStepExecution(execution.id, trigger.id),
    cancel: () => WorkflowService.cancelExecution(projectId, workflow.id, execution.id),
    timeOut: async () => WorkflowExecutionService.processTimeout(execution.id, middle.id, (await stepExecution()).id),
  };
}

/** Where the run ended up, and how many emails it sent. */
async function outcome(run: Run) {
  const {status} = await prisma.workflowExecution.findUniqueOrThrow({where: {id: run.executionId}});
  const emails = await prisma.email.count({where: {workflowExecutionId: run.executionId}});
  return {status, emails};
}

const cancelled = {status: WorkflowExecutionStatus.CANCELLED, emails: 0};

const ship = () => EventService.trackEvent(projectId, 'order.shipped', contactId);

/**
 * Cancelling an execution stops it where it is: the engine never moves a cancelled execution on,
 * whether it is parked on a wait or a delay, or a step is still running when the cancel lands.
 */
describe('WorkflowExecutionService - cancelled executions', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    contactId = (await factories.createContact({projectId, subscribed: true})).id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('a run parked on a wait', () => {
    it.each([
      ['cancelExecution', (run: Run) => run.cancel()],
      ['cancelAllExecutions', (run: Run) => WorkflowService.cancelAllExecutions(projectId, run.workflowId)],
    ])('stays cancelled when the event arrives after %s', async (_name, cancel) => {
      const run = await createRun(WAIT);
      await run.start();
      await cancel(run);

      await ship();

      expect(await outcome(run)).toEqual(cancelled);
      expect((await run.stepExecution()).status).toBe(StepExecutionStatus.WAITING);
    });

    it('stays cancelled when the timeout fires', async () => {
      const run = await createRun(WAIT);
      await run.start();
      await run.cancel();

      await run.timeOut();

      expect(await outcome(run)).toEqual(cancelled);
      expect((await run.stepExecution()).status).toBe(StepExecutionStatus.WAITING);
    });

    it.each(['event', 'timeout'])(
      'stays cancelled when the %s arrives and the wait is the last step',
      async arrival => {
        const run = await createRun(WAIT, {last: true});
        await run.start();
        await run.cancel();

        await (arrival === 'event' ? ship() : run.timeOut());

        expect(await outcome(run)).toEqual(cancelled);
      },
    );
  });

  describe('a cancel that lands while the run is moving on', () => {
    it('stops the run when it lands while the event is being handled', async () => {
      const run = await createRun(WAIT);
      await run.start();
      // handleEvent drops the timeout job after completing the wait and before moving on
      vi.spyOn(QueueService, 'cancelWorkflowTimeout').mockImplementationOnce(async () => {
        await run.cancel();
      });

      await ship();

      expect(await outcome(run)).toEqual(cancelled);
    });

    it('stops the run before its next step when it lands while a webhook step runs', async () => {
      const run = await createRun({
        type: WorkflowStepType.WEBHOOK,
        config: {url: 'https://hooks.example.com/order', method: 'POST'},
      });
      vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(WorkflowExecutionService as any, 'safeFetch')
        .mockImplementation(async () => {
          await run.cancel();
          return new Response('{"ok":true}', {status: 200, headers: {'Content-Type': 'application/json'}});
        });

      await run.start();

      expect(await outcome(run)).toEqual(cancelled);
    });

    // The transition out of the EXIT step is one addStep's auto-connect can create
    it.each([
      ['a wait', WAIT, 'executeWaitForEvent', () => ship()],
      [
        'a delay',
        DELAY,
        'executeDelay',
        (run: Run) => WorkflowExecutionService.processStepExecution(run.executionId, run.sendStepId!),
      ],
      ['an exit step with a way out', EXIT, 'executeExit', null],
    ] as const)('stays cancelled when it lands while the run enters %s', async (_kind, step, method, resume) => {
      const run = await createRun(step);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = WorkflowExecutionService as any;
      const enter = engine[method];
      vi.spyOn(engine, method).mockImplementationOnce(async (...args: unknown[]) => {
        await run.cancel();
        return enter.apply(engine, args);
      });

      await run.start();
      expect(await outcome(run)).toEqual(cancelled);

      // What would resume it next: the awaited event, or the delayed job for the following step
      if (resume) {
        await resume(run);
        expect(await outcome(run)).toEqual(cancelled);
      }
    });
  });

  it('a run parked on a delay stays cancelled when its next step comes due', async () => {
    const run = await createRun(DELAY);
    await run.start();
    await run.cancel();

    await WorkflowExecutionService.processStepExecution(run.executionId, run.sendStepId!);

    expect(await outcome(run)).toEqual(cancelled);
  });

  describe('a run that is not cancelled', () => {
    const sentAndCompleted = {status: WorkflowExecutionStatus.COMPLETED, emails: 1};

    it('resumes from a wait when the event arrives and runs the next step', async () => {
      const run = await createRun(WAIT);
      await run.start();

      await ship();

      expect(await outcome(run)).toEqual(sentAndCompleted);
    });

    it.each([
      ['a plain transition', undefined],
      ['a timeout-tagged transition', {branch: 'timeout'}],
    ])('moves on from a wait through %s when the timeout fires', async (_kind, exitCondition) => {
      const run = await createRun(WAIT, {exitCondition});
      await run.start();

      await run.timeOut();

      expect(await outcome(run)).toEqual(sentAndCompleted);
    });
  });
});

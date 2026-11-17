import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {StepExecutionStatus, WorkflowExecutionStatus, WorkflowStepType} from '@plunk/db';
import {QueueService} from '../QueueService';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {WorkflowService} from '../WorkflowService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

vi.mock('../QueueService', () => ({
  QueueService: {
    queueWorkflowSteps: vi.fn(async () => undefined),
    queueWorkflowDelayEnd: vi.fn(async () => ({id: 'mock-delay-end-job-id'})),
    queueEmail: vi.fn(async () => ({id: 'mock-email-job-id'})),
    queueWorkflowTimeout: vi.fn(async () => ({id: 'mock-timeout-job-id'})),
    cancelWorkflowTimeout: vi.fn(async () => true),
    queueWorkflowHoldRelease: vi.fn(async () => undefined),
    queueWorkflowHoldRemove: vi.fn(async () => undefined),
  },
}));

let projectId: string;
const prisma = getPrismaClient();

/** TRIGGER → SEND_EMAIL → HOLD, enabled */
async function createHoldWorkflow({allowReentry = false} = {}) {
  const workflow = await factories.createWorkflow({projectId, enabled: true, allowReentry});
  const trigger = await prisma.workflowStep.findFirstOrThrow({
    where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
  });
  const send = await createSend(workflow.id);
  const hold = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.HOLD, config: {}});
  await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: send.id}});
  const arrival = await prisma.workflowTransition.create({data: {fromStepId: send.id, toStepId: hold.id}});

  return {workflowId: workflow.id, triggerId: trigger.id, sendId: send.id, holdId: hold.id, arrivalId: arrival.id};
}

type HoldWorkflow = Awaited<ReturnType<typeof createHoldWorkflow>>;

async function createSend(workflowId: string) {
  const template = await factories.createTemplate({projectId});
  return factories.createWorkflowStep({
    workflowId,
    type: WorkflowStepType.SEND_EMAIL,
    templateId: template.id,
    config: {templateId: template.id},
  });
}

/** Run a contact through the workflow until it parks on the HOLD */
async function enter(flow: HoldWorkflow) {
  const contact = await factories.createContact({projectId, subscribed: true});
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: flow.workflowId,
      contactId: contact.id,
      status: WorkflowExecutionStatus.RUNNING,
      currentStepId: flow.triggerId,
    },
  });
  await WorkflowExecutionService.processStepExecution(execution.id, flow.triggerId);
  return execution.id;
}

/** Run a given contact into the workflow as a run started at `startedAt` */
async function enterAs(flow: HoldWorkflow, contactId: string, startedAt: Date) {
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: flow.workflowId,
      contactId,
      status: WorkflowExecutionStatus.RUNNING,
      currentStepId: flow.triggerId,
      startedAt,
    },
  });
  await WorkflowExecutionService.processStepExecution(execution.id, flow.triggerId);
  return execution.id;
}

/** Insert a configured email on a transition, as the builder's + does */
async function insertEmail(workflowId: string, transitionId: string, name: string) {
  const template = await factories.createTemplate({projectId});
  return WorkflowService.insertStepOnTransition(projectId, workflowId, transitionId, {
    type: WorkflowStepType.SEND_EMAIL,
    name,
    config: {templateId: template.id},
    templateId: template.id,
  });
}

/** Run the jobs a release queued, as the workflow worker would */
async function runQueuedSteps() {
  const calls = vi.mocked(QueueService.queueWorkflowSteps).mock.calls;
  vi.mocked(QueueService.queueWorkflowSteps).mockClear();
  for (const [executionIds, stepId] of calls) {
    for (const executionId of executionIds) {
      await WorkflowExecutionService.processStepExecution(executionId, stepId);
    }
  }
}

const state = (executionId: string) =>
  prisma.workflowExecution.findUniqueOrThrow({
    where: {id: executionId},
    select: {status: true, currentStepId: true, holdTransitionId: true},
  });

const emailsOf = (executionId: string) => prisma.email.count({where: {workflowExecutionId: executionId}});

describe('HOLD steps', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('reaching a HOLD', () => {
    it('parks the run as HELD with the transition it arrived through', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);

      expect(await state(executionId)).toEqual({
        status: WorkflowExecutionStatus.HELD,
        currentStepId: flow.holdId,
        holdTransitionId: flow.arrivalId,
      });
      expect(await emailsOf(executionId)).toBe(1);

      const holdExecution = await prisma.workflowStepExecution.findFirstOrThrow({
        where: {executionId, stepId: flow.holdId},
      });
      expect(holdExecution.status).toBe(StepExecutionStatus.WAITING);
      expect(QueueService.queueWorkflowDelayEnd).not.toHaveBeenCalled();
    });

    it('records the branch a condition took when several lead to the same HOLD', async () => {
      const workflow = await factories.createWorkflow({projectId, enabled: true});
      const trigger = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });
      const condition = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.CONDITION,
        config: {field: 'contact.subscribed', operator: 'equals', value: true},
      });
      const hold = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.HOLD,
        config: {},
      });
      await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: condition.id}});
      await prisma.workflowTransition.create({
        data: {fromStepId: condition.id, toStepId: hold.id, condition: {branch: 'no'}},
      });
      const yes = await prisma.workflowTransition.create({
        data: {fromStepId: condition.id, toStepId: hold.id, condition: {branch: 'yes'}, priority: 1},
      });

      const contact = await factories.createContact({projectId, subscribed: true});
      const execution = await prisma.workflowExecution.create({
        data: {workflowId: workflow.id, contactId: contact.id, status: WorkflowExecutionStatus.RUNNING},
      });
      await WorkflowExecutionService.processStepExecution(execution.id, trigger.id);

      expect((await state(execution.id)).holdTransitionId).toBe(yes.id);
    });
  });

  describe('releasing a HOLD', () => {
    it('runs the step inserted above the HOLD, then parks the run again', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);
      const template = await factories.createTemplate({projectId});

      const inserted = await WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Email 2',
        config: {templateId: template.id},
        templateId: template.id,
      });
      expect(QueueService.queueWorkflowHoldRelease).toHaveBeenCalledWith(flow.workflowId);

      expect(await WorkflowExecutionService.processHoldRelease(flow.workflowId)).toEqual({released: 1, skipped: []});
      await runQueuedSteps();

      const after = await state(executionId);
      expect(after.status).toBe(WorkflowExecutionStatus.HELD);
      expect(after.currentStepId).toBe(flow.holdId);
      expect(after.holdTransitionId).not.toBe(flow.arrivalId);
      expect(await emailsOf(executionId)).toBe(2);

      // Nothing new above it: a second release moves nobody
      expect(await WorkflowExecutionService.processHoldRelease(flow.workflowId)).toEqual({released: 0, skipped: []});
      expect(inserted.type).toBe(WorkflowStepType.SEND_EMAIL);
    });

    it('releases only the runs that arrived through the edited transition', async () => {
      const flow = await createHoldWorkflow();
      const first = await enter(flow);

      // A second path into the same HOLD
      const other = await createSend(flow.workflowId);
      const otherArrival = await prisma.workflowTransition.create({
        data: {fromStepId: other.id, toStepId: flow.holdId},
      });
      const second = await enter(flow);
      await prisma.workflowExecution.update({where: {id: second}, data: {holdTransitionId: otherArrival.id}});

      const template = await factories.createTemplate({projectId});
      await WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Email 2',
        config: {templateId: template.id},
        templateId: template.id,
      });

      expect((await WorkflowExecutionService.processHoldRelease(flow.workflowId)).released).toBe(1);
      await runQueuedSteps();

      expect(await emailsOf(first)).toBe(2);
      expect(await emailsOf(second)).toBe(1);
    });

    it('does not release a disabled workflow', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);
      await prisma.workflow.update({where: {id: flow.workflowId}, data: {enabled: false}});
      const template = await factories.createTemplate({projectId});
      await WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Email 2',
        config: {templateId: template.id},
        templateId: template.id,
      });

      expect(await WorkflowExecutionService.processHoldRelease(flow.workflowId)).toEqual({released: 0, skipped: []});
      expect((await state(executionId)).status).toBe(WorkflowExecutionStatus.HELD);
    });

    it('skips a step that is not configured yet', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);
      const inserted = await WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Email 2',
        config: {},
      });

      expect(await WorkflowExecutionService.processHoldRelease(flow.workflowId)).toEqual({
        released: 0,
        skipped: [inserted.id],
      });
      expect((await state(executionId)).status).toBe(WorkflowExecutionStatus.HELD);
    });

    it('never releases the same run twice', async () => {
      const flow = await createHoldWorkflow();
      await enter(flow);
      const template = await factories.createTemplate({projectId});
      await WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Email 2',
        config: {templateId: template.id},
        templateId: template.id,
      });

      const [a, b] = await Promise.all([
        WorkflowExecutionService.processHoldRelease(flow.workflowId),
        WorkflowExecutionService.processHoldRelease(flow.workflowId),
      ]);
      expect(a.released + b.released).toBe(1);
    });
  });

  describe('releasing runs that raced an edit', () => {
    it('releases a run that had already passed the edited transition on its way to the HOLD', async () => {
      const flow = await createHoldWorkflow();
      // The insert lands after the run left the email step but before it parks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = WorkflowExecutionService as any;
      const park = engine.executeHold;
      vi.spyOn(engine, 'executeHold').mockImplementationOnce(async (...args: unknown[]) => {
        await insertEmail(flow.workflowId, flow.arrivalId, 'Email 2');
        return park.apply(engine, args);
      });

      const executionId = await enter(flow);

      expect(await state(executionId)).toMatchObject({
        status: WorkflowExecutionStatus.HELD,
        holdTransitionId: flow.arrivalId,
      });
      expect(QueueService.queueWorkflowHoldRelease).toHaveBeenCalledWith(flow.workflowId);

      expect((await WorkflowExecutionService.processHoldRelease(flow.workflowId)).released).toBe(1);
      await runQueuedSteps();
      expect(await emailsOf(executionId)).toBe(2);
    });

    it('never releases a cancelled run', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);
      await WorkflowService.cancelExecution(projectId, flow.workflowId, executionId);
      await insertEmail(flow.workflowId, flow.arrivalId, 'Email 2');

      expect((await WorkflowExecutionService.processHoldRelease(flow.workflowId)).released).toBe(0);
      expect((await state(executionId)).status).toBe(WorkflowExecutionStatus.CANCELLED);
    });

    it('leaves held runs alone when all active executions are cancelled', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);

      expect(await WorkflowService.cancelAllExecutions(projectId, flow.workflowId)).toEqual({cancelled: 0});
      expect((await state(executionId)).status).toBe(WorkflowExecutionStatus.HELD);
    });

    it('waits for a step further down the released path to be configured', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);
      const condition = await WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
        type: WorkflowStepType.CONDITION,
        name: 'Is subscribed',
        config: {field: 'contact.subscribed', operator: 'equals', value: true},
      });
      // The "no" branch is connected, but to an email with no template yet
      const empty = await WorkflowService.addStep(projectId, flow.workflowId, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Not configured',
        position: {x: 0, y: 0},
        config: {},
        autoConnect: false,
      });
      await WorkflowService.createTransition(projectId, flow.workflowId, {
        fromStepId: condition.id,
        toStepId: empty.id,
        condition: {branch: 'no'},
        priority: 1,
      });

      expect(await WorkflowExecutionService.processHoldRelease(flow.workflowId)).toEqual({
        released: 0,
        skipped: [empty.id],
      });
      expect((await state(executionId)).status).toBe(WorkflowExecutionStatus.HELD);
    });

    it('waits for every branch of a condition inserted above the HOLD to be connected', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);
      const condition = await WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
        type: WorkflowStepType.CONDITION,
        name: 'Is subscribed',
        config: {field: 'contact.subscribed', operator: 'equals', value: true},
      });

      // Only the "yes" branch leads back to the HOLD, so "no" would drop the contact out
      expect(await WorkflowExecutionService.processHoldRelease(flow.workflowId)).toEqual({
        released: 0,
        skipped: [condition.id],
      });
      expect((await state(executionId)).status).toBe(WorkflowExecutionStatus.HELD);

      await WorkflowService.createTransition(projectId, flow.workflowId, {
        fromStepId: condition.id,
        toStepId: flow.holdId,
        condition: {branch: 'no'},
        priority: 1,
      });
      expect(QueueService.queueWorkflowHoldRelease).toHaveBeenCalledWith(flow.workflowId);

      expect((await WorkflowExecutionService.processHoldRelease(flow.workflowId)).released).toBe(1);
      await runQueuedSteps();
      expect(await state(executionId)).toMatchObject({
        status: WorkflowExecutionStatus.HELD,
        currentStepId: flow.holdId,
      });
    });
  });

  describe('a step inserted after a delay while the run waits', () => {
    it('is run when the delay ends', async () => {
      const workflow = await factories.createWorkflow({projectId, enabled: true});
      const trigger = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });
      const delay = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.DELAY,
        config: {amount: 1, unit: 'hours'},
      });
      const hold = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.HOLD,
        config: {},
      });
      await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: delay.id}});
      const afterDelay = await prisma.workflowTransition.create({data: {fromStepId: delay.id, toStepId: hold.id}});

      const contact = await factories.createContact({projectId, subscribed: true});
      const execution = await prisma.workflowExecution.create({
        data: {workflowId: workflow.id, contactId: contact.id, status: WorkflowExecutionStatus.RUNNING},
      });
      await WorkflowExecutionService.processStepExecution(execution.id, trigger.id);
      expect((await state(execution.id)).status).toBe(WorkflowExecutionStatus.WAITING);

      const template = await factories.createTemplate({projectId});
      await WorkflowService.insertStepOnTransition(projectId, workflow.id, afterDelay.id, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Email',
        config: {templateId: template.id},
        templateId: template.id,
      });

      await WorkflowExecutionService.processDelayEnd(execution.id, delay.id);

      expect(await emailsOf(execution.id)).toBe(1);
      expect((await state(execution.id)).status).toBe(WorkflowExecutionStatus.HELD);

      // A second delay-end job for the same delay finds the run gone from it and does nothing
      await WorkflowExecutionService.processDelayEnd(execution.id, delay.id);
      expect(await emailsOf(execution.id)).toBe(1);
    });
  });

  describe('editing around a HOLD', () => {
    it('allows several HOLDs and nothing connected after one', async () => {
      const flow = await createHoldWorkflow();
      const second = await WorkflowService.addStep(projectId, flow.workflowId, {
        type: WorkflowStepType.HOLD,
        name: 'End 2',
        position: {x: 0, y: 0},
        config: {},
      });
      expect(second.type).toBe(WorkflowStepType.HOLD);

      // Auto-connect never hangs a step off a HOLD
      const next = await WorkflowService.addStep(projectId, flow.workflowId, {
        type: WorkflowStepType.DELAY,
        name: 'Delay',
        position: {x: 0, y: 0},
        config: {amount: 1, unit: 'days'},
      });
      expect(await prisma.workflowTransition.count({where: {toStepId: next.id}})).toBe(0);

      await expect(
        WorkflowService.createTransition(projectId, flow.workflowId, {fromStepId: flow.holdId, toStepId: next.id}),
      ).rejects.toThrow(/hold step ends the flow/);
      await expect(
        WorkflowService.insertStepOnTransition(projectId, flow.workflowId, flow.arrivalId, {
          type: WorkflowStepType.HOLD,
          name: 'End 3',
          config: {},
        }),
      ).rejects.toThrow(/hold step ends the flow/);
    });

    it('refuses to delete the transition parked runs arrived through', async () => {
      const flow = await createHoldWorkflow();
      await enter(flow);

      await expect(WorkflowService.deleteTransition(projectId, flow.workflowId, flow.arrivalId)).rejects.toThrow(
        /1 contact\(s\) parked/,
      );
    });

    it('deletes an empty HOLD right away', async () => {
      const flow = await createHoldWorkflow();

      expect(await WorkflowService.deleteStep(projectId, flow.workflowId, flow.holdId)).toEqual({completing: 0});
      expect(await prisma.workflowStep.count({where: {id: flow.holdId}})).toBe(0);
    });

    it('completes the parked runs before deleting a HOLD that has some', async () => {
      const flow = await createHoldWorkflow();
      const executionId = await enter(flow);

      expect(await WorkflowService.spliceStep(projectId, flow.workflowId, flow.holdId)).toEqual({completing: 1});
      expect(QueueService.queueWorkflowHoldRemove).toHaveBeenCalledWith(flow.workflowId, flow.holdId);
      // Nobody else arrives in the meantime, and the step waits for the job
      expect(await prisma.workflowTransition.count({where: {toStepId: flow.holdId}})).toBe(0);
      expect(await prisma.workflowStep.count({where: {id: flow.holdId}})).toBe(1);

      expect(await WorkflowExecutionService.processHoldRemove(flow.workflowId, flow.holdId)).toEqual({completed: 1});

      const execution = await prisma.workflowExecution.findUniqueOrThrow({where: {id: executionId}});
      expect(execution.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(execution.exitReason).toBe('Hold step removed');
      expect(await prisma.workflowStep.count({where: {id: flow.holdId}})).toBe(0);
    });

    it('lets a step inserted above a HOLD be configured while another run waits in a delay', async () => {
      const workflow = await factories.createWorkflow({projectId, enabled: true});
      const trigger = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });
      const delay = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.DELAY,
        config: {amount: 1, unit: 'days'},
      });
      const hold = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.HOLD,
        config: {},
      });
      await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: delay.id}});
      const afterDelay = await prisma.workflowTransition.create({data: {fromStepId: delay.id, toStepId: hold.id}});
      const contact = await factories.createContact({projectId, subscribed: true});
      const execution = await prisma.workflowExecution.create({
        data: {workflowId: workflow.id, contactId: contact.id, status: WorkflowExecutionStatus.RUNNING},
      });
      await WorkflowExecutionService.processStepExecution(execution.id, trigger.id);
      expect((await state(execution.id)).status).toBe(WorkflowExecutionStatus.WAITING);

      // Inserted unconfigured, as the builder does, then configured
      const inserted = await WorkflowService.insertStepOnTransition(projectId, workflow.id, afterDelay.id, {
        type: WorkflowStepType.SEND_EMAIL,
        name: 'Email',
        config: {},
      });
      const template = await factories.createTemplate({projectId});
      await expect(
        WorkflowService.updateStep(projectId, workflow.id, inserted.id, {
          config: {templateId: template.id},
          templateId: template.id,
        }),
      ).resolves.toMatchObject({templateId: template.id});

      // The step the run is on stays locked
      await expect(
        WorkflowService.updateStep(projectId, workflow.id, delay.id, {config: {amount: 2, unit: 'days'}}),
      ).rejects.toThrow(/1 execution\(s\) are on this step/);
    });

    it('completes the parked runs of a HOLD deleted with a step above it', async () => {
      const flow = await createHoldWorkflow();
      await enter(flow);
      await enter(flow);

      expect(await WorkflowService.deleteStep(projectId, flow.workflowId, flow.sendId)).toEqual({completing: 2});
      expect(QueueService.queueWorkflowHoldRemove).toHaveBeenCalledWith(flow.workflowId, flow.holdId);
      expect(await prisma.workflowStep.count({where: {id: flow.sendId}})).toBe(0);
      expect(await prisma.workflowStep.count({where: {id: flow.holdId}})).toBe(1);
    });

    it('queues a release when the workflow is enabled', async () => {
      const flow = await createHoldWorkflow();
      await prisma.workflow.update({where: {id: flow.workflowId}, data: {enabled: false}});

      await WorkflowService.update(projectId, flow.workflowId, {enabled: true});

      expect(QueueService.queueWorkflowHoldRelease).toHaveBeenCalledWith(flow.workflowId);
    });

    it('counts the runs parked on each HOLD', async () => {
      const flow = await createHoldWorkflow();
      await enter(flow);
      await enter(flow);

      expect(await WorkflowService.heldCounts(flow.workflowId)).toEqual({[flow.holdId]: 2});
    });
  });

  describe('re-entry', () => {
    it.each([
      ['the older run parks first', [0, 1]],
      ['the newer run parks first', [1, 0]],
    ])('keeps only the newest run parked when %s', async (_order, order) => {
      const flow = await createHoldWorkflow({allowReentry: true});
      const contact = await factories.createContact({projectId, subscribed: true});
      const startedAt = [new Date(Date.now() - 60_000), new Date()];

      const ids: string[] = [];
      for (const index of order) {
        ids[index] = await enterAs(flow, contact.id, startedAt[index]!);
      }

      expect((await state(ids[1]!)).status).toBe(WorkflowExecutionStatus.HELD);
      const older = await prisma.workflowExecution.findUniqueOrThrow({where: {id: ids[0]!}});
      expect(older.status).toBe(WorkflowExecutionStatus.COMPLETED);
      expect(older.exitReason).toBe('Superseded by a newer run');
    });
  });
});

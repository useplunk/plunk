import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EmailSourceType, EmailStatus, StepExecutionStatus, WorkflowExecutionStatus, WorkflowStepType} from '@plunk/db';
import {prisma as servicePrisma} from '../../database/prisma';
import {EventService} from '../EventService';
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

/**
 * By default a WAIT_FOR_EVENT step resumes on the event from any email of the contact.
 * `scope: "execution"` limits email events to the emails the waiting execution sent the contact.
 */
describe('WorkflowExecutionService - WAIT_FOR_EVENT scope', () => {
  const prisma = getPrismaClient();
  let projectId: string;
  let contactId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
    contactId = (await factories.createContact({projectId, subscribed: true})).id;
  });

  /** TRIGGER → SEND_EMAIL → WAIT_FOR_EVENT → EXIT, run until it waits. */
  async function runUntilWaiting(waitConfig: Record<string, unknown>, sendConfig: Record<string, unknown> = {}) {
    const template = await factories.createTemplate({projectId});
    const workflow = await factories.createWorkflow({projectId});
    const trigger = await prisma.workflowStep.findFirstOrThrow({
      where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
    });
    const send = await factories.createWorkflowStep({
      workflowId: workflow.id,
      type: WorkflowStepType.SEND_EMAIL,
      templateId: template.id,
      config: {templateId: template.id, ...sendConfig},
    });
    const wait = await factories.createWorkflowStep({
      workflowId: workflow.id,
      type: WorkflowStepType.WAIT_FOR_EVENT,
      config: {timeout: 3600, ...waitConfig},
    });
    const exit = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.EXIT});
    await prisma.workflowTransition.createMany({
      data: [
        {fromStepId: trigger.id, toStepId: send.id},
        {fromStepId: send.id, toStepId: wait.id},
        {fromStepId: wait.id, toStepId: exit.id},
      ],
    });

    const execution = await prisma.workflowExecution.create({
      data: {workflowId: workflow.id, contactId, status: WorkflowExecutionStatus.RUNNING, currentStepId: trigger.id},
    });
    await WorkflowExecutionService.processStepExecution(execution.id, trigger.id);

    const sent = await prisma.email.findFirstOrThrow({where: {workflowExecutionId: execution.id}});
    const waitStatus = async () =>
      (await prisma.workflowStepExecution.findFirstOrThrow({where: {executionId: execution.id, stepId: wait.id}}))
        .status;
    expect(await waitStatus()).toBe(StepExecutionStatus.WAITING);

    return {sent, waitStatus};
  }

  const newsletter = () =>
    factories.createEmail({
      projectId,
      contactId,
      sourceType: EmailSourceType.CAMPAIGN,
      status: EmailStatus.SENT,
      sentAt: new Date(),
    });

  /** The call the SES webhook makes for an open (Webhooks.receiveSNSWebhook). */
  const open = (emailId: string) => EventService.trackEvent(projectId, 'email.open', contactId, emailId, {emailId});

  it('without a scope, resumes on an open of any email of the contact, and looks no email up', async () => {
    const run = await runUntilWaiting({eventName: 'email.open'});
    const emailLookup = vi.spyOn(servicePrisma.email, 'findUnique');

    await open((await newsletter()).id);

    expect(await run.waitStatus()).toBe(StepExecutionStatus.COMPLETED);
    expect(emailLookup).not.toHaveBeenCalled();
  });

  it("with scope execution, ignores other emails and resumes on the execution's own email", async () => {
    const run = await runUntilWaiting({eventName: 'email.open', scope: 'execution'});
    const emailLookup = vi.spyOn(servicePrisma.email, 'findUnique');

    await open((await newsletter()).id);
    expect(await run.waitStatus()).toBe(StepExecutionStatus.WAITING);
    expect(emailLookup).toHaveBeenCalledTimes(1);

    await open(run.sent.id);
    expect(await run.waitStatus()).toBe(StepExecutionStatus.COMPLETED);
  });

  it('with scope execution, ignores an email the execution sent to a custom recipient', async () => {
    const run = await runUntilWaiting(
      {eventName: 'email.open', scope: 'execution'},
      {recipient: {type: 'CUSTOM', customEmail: 'team@plunk.test'}},
    );

    await open(run.sent.id);

    expect(await run.waitStatus()).toBe(StepExecutionStatus.WAITING);
  });

  it('with scope execution, ignores an email event that names no email', async () => {
    const run = await runUntilWaiting({eventName: 'email.open', scope: 'execution'});

    await EventService.trackEvent(projectId, 'email.open', contactId);

    expect(await run.waitStatus()).toBe(StepExecutionStatus.WAITING);
  });

  it('with scope execution, resumes only the execution that sent the email', async () => {
    const first = await runUntilWaiting({eventName: 'email.click', scope: 'execution'});
    const second = await runUntilWaiting({eventName: 'email.click', scope: 'execution'});

    await EventService.trackEvent(projectId, 'email.click', contactId, second.sent.id, {emailId: second.sent.id});

    expect(await first.waitStatus()).toBe(StepExecutionStatus.WAITING);
    expect(await second.waitStatus()).toBe(StepExecutionStatus.COMPLETED);
  });

  it('applies no scope to events an execution cannot have produced', async () => {
    const run = await runUntilWaiting({eventName: 'order.shipped', scope: 'execution'});

    await EventService.trackEvent(projectId, 'order.shipped', contactId);

    expect(await run.waitStatus()).toBe(StepExecutionStatus.COMPLETED);
  });
});

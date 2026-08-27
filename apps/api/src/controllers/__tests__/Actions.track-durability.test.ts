import type {NextFunction, Request, Response} from 'express';
import express from 'express';
import type {IdempotencyKeyCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import request from 'supertest';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {prisma as servicePrisma} from '../../database/prisma.js';
import {processCleanup} from '../../jobs/idempotency-key-cleanup-processor.js';
import {EventService} from '../../services/EventService.js';
import {QueueService} from '../../services/QueueService.js';
import {Actions} from '../Actions.js';

function createTrackApp(projectId: string) {
  const app = express();
  const actions = new Actions();

  app.use(express.json());
  app.post('/v1/track', (req, res, next) => {
    res.locals.auth = {projectId};
    void actions.track(req, res, next);
  });
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({success: false, error: error.message});
  });

  return app;
}

describe('POST /v1/track durability', () => {
  const prisma = getPrismaClient();
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  it('returns the stored event after synchronous dispatch succeeds', async () => {
    const response = await request(createTrackApp(projectId))
      .post('/v1/track')
      .send({
        event: 'checkout.completed',
        email: 'success@example.com',
        data: {orderId: 'order-123'},
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        contact: expect.any(String),
        event: expect.any(String),
        timestamp: expect.any(String),
      },
    });
    expect((await prisma.event.findUniqueOrThrow({where: {id: response.body.data.event}})).processedAt).not.toBeNull();
  });

  it('acknowledges a stored event when dispatch fails, then reconciles it once', async () => {
    const workflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      allowReentry: false,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'invoice.paid'},
    });
    const workflowLookup = vi
      .spyOn(servicePrisma.workflow, 'findUnique')
      .mockRejectedValueOnce(new Error('injected workflow start failure'));

    const response = await request(createTrackApp(projectId))
      .post('/v1/track')
      .send({
        event: 'invoice.paid',
        email: 'recovery@example.com',
        data: {invoiceId: 'invoice-123'},
      });

    expect(response.status).toBe(200);
    expect(response.body.data.event).toEqual(expect.any(String));
    const pendingEvent = await prisma.event.findFirstOrThrow({
      where: {projectId, name: 'invoice.paid'},
    });
    expect(pendingEvent.processedAt).toBeNull();
    expect(pendingEvent.dispatchAttempts).toBe(1);
    expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id}})).toBe(0);

    workflowLookup.mockRestore();
    await prisma.event.update({
      where: {id: pendingEvent.id},
      data: {
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
        nextDispatchAt: new Date(Date.now() - 1000),
      },
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const job = {updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>;

    await processCleanup(job);
    await processCleanup(job);

    expect((await prisma.event.findUniqueOrThrow({where: {id: pendingEvent.id}})).processedAt).not.toBeNull();
    expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id}})).toBe(1);
    expect(updateProgress).toHaveBeenCalledWith(100);
  });

  it('does not replay a failed step after the event enrolled its execution', async () => {
    const workflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      allowReentry: false,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'shipment.created'},
    });
    const completeStep = vi
      .spyOn(servicePrisma.workflowStepExecution, 'updateMany')
      .mockRejectedValueOnce(new Error('injected failure after workflow enrollment'));

    const response = await request(createTrackApp(projectId))
      .post('/v1/track')
      .send({
        event: 'shipment.created',
        email: 'resume@example.com',
        data: {shipmentId: 'shipment-123'},
      });

    expect(response.status).toBe(200);
    const event = await prisma.event.findUniqueOrThrow({where: {id: response.body.data.event}});
    const failedExecution = await prisma.workflowExecution.findFirstOrThrow({
      where: {workflowId: workflow.id, sourceEventId: event.id},
    });
    expect(event.processedAt).toBeNull();
    expect(failedExecution.status).toBe('FAILED');

    completeStep.mockRestore();
    await prisma.event.update({
      where: {id: event.id},
      data: {
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
        nextDispatchAt: new Date(Date.now() - 1000),
      },
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const job = {updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>;

    await processCleanup(job);
    await processCleanup(job);

    expect((await prisma.event.findUniqueOrThrow({where: {id: event.id}})).processedAt).not.toBeNull();
    expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id}})).toBe(1);
    expect(
      await prisma.workflowStepExecution.count({
        where: {executionId: failedExecution.id},
      }),
    ).toBe(1);
    expect((await prisma.workflowExecution.findUniqueOrThrow({where: {id: failedExecution.id}})).status).toBe('FAILED');
  });

  it('resumes an event execution that failed before its first step began', async () => {
    const workflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      allowReentry: false,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'execution.created'},
    });
    const executionLookup = vi
      .spyOn(servicePrisma.workflowExecution, 'findUnique')
      .mockRejectedValueOnce(new Error('injected failure before trigger step'));

    const response = await request(createTrackApp(projectId))
      .post('/v1/track')
      .send({event: 'execution.created', email: 'unstarted@example.com'});

    expect(response.status).toBe(200);
    const event = await prisma.event.findUniqueOrThrow({where: {id: response.body.data.event}});
    const unstartedExecution = await prisma.workflowExecution.findFirstOrThrow({
      where: {workflowId: workflow.id, sourceEventId: event.id},
    });
    expect(event.processedAt).toBeNull();
    expect(unstartedExecution.status).toBe('RUNNING');
    expect(await prisma.workflowStepExecution.count({where: {executionId: unstartedExecution.id}})).toBe(0);

    executionLookup.mockRestore();
    await prisma.event.update({
      where: {id: event.id},
      data: {
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
        nextDispatchAt: new Date(Date.now() - 1000),
      },
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);

    await processCleanup({updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>);

    expect((await prisma.event.findUniqueOrThrow({where: {id: event.id}})).processedAt).not.toBeNull();
    expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id, sourceEventId: event.id}})).toBe(1);
    expect(await prisma.workflowStepExecution.count({where: {executionId: unstartedExecution.id}})).toBe(1);
    expect((await prisma.workflowExecution.findUniqueOrThrow({where: {id: unstartedExecution.id}})).status).toBe(
      'COMPLETED',
    );
  });

  it('retries a wait continuation claimed before a transient queue failure', async () => {
    const workflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'unrelated.event'},
    });
    const waitStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: 'WAIT_FOR_EVENT',
        name: 'Wait for payment',
        position: {x: 100, y: 0},
        config: {eventName: 'payment.settled', timeout: 3600},
      },
    });
    const exitStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: 'EXIT',
        name: 'Paid',
        position: {x: 200, y: 0},
        config: {},
      },
    });
    await prisma.workflowTransition.create({
      data: {fromStepId: waitStep.id, toStepId: exitStep.id, waitOutcome: 'EVENT'},
    });
    const contact = await factories.createContact({projectId});
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        contactId: contact.id,
        status: 'WAITING',
        currentStepId: waitStep.id,
        context: {source: 'signup'},
      },
    });
    const waitExecution = await prisma.workflowStepExecution.create({
      data: {
        executionId: execution.id,
        stepId: waitStep.id,
        status: 'WAITING',
        startedAt: new Date(),
      },
    });
    const cancelTimeout = vi
      .spyOn(QueueService, 'cancelWorkflowTimeout')
      .mockRejectedValueOnce(new Error('injected Redis failure'));

    const response = await request(createTrackApp(projectId))
      .post('/v1/track')
      .send({event: 'payment.settled', email: contact.email, data: {invoiceId: 'invoice-456'}});

    expect(response.status).toBe(200);
    const event = await prisma.event.findUniqueOrThrow({where: {id: response.body.data.event}});
    expect(event.processedAt).toBeNull();
    expect(
      await prisma.workflowStepExecution.findUniqueOrThrow({
        where: {id: waitExecution.id},
        select: {status: true, resumeEventId: true, output: true},
      }),
    ).toMatchObject({
      status: 'RUNNING',
      resumeEventId: event.id,
      output: {eventData: {invoiceId: 'invoice-456'}},
    });

    cancelTimeout.mockRestore();
    await prisma.event.update({
      where: {id: event.id},
      data: {
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
        nextDispatchAt: new Date(Date.now() - 1000),
      },
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const job = {updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>;

    await processCleanup(job);
    await processCleanup(job);

    expect((await prisma.event.findUniqueOrThrow({where: {id: event.id}})).processedAt).not.toBeNull();
    expect(
      await prisma.workflowStepExecution.findUniqueOrThrow({
        where: {id: waitExecution.id},
        select: {status: true, resumeEventId: true},
      }),
    ).toEqual({status: 'COMPLETED', resumeEventId: event.id});
    expect(await prisma.workflowStepExecution.count({where: {executionId: execution.id, stepId: exitStep.id}})).toBe(1);
  });

  it('does not replay a delivered wait continuation when its acknowledgement fails', async () => {
    const workflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'unrelated.event'},
    });
    const waitStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: 'WAIT_FOR_EVENT',
        name: 'Wait for capture',
        position: {x: 100, y: 0},
        config: {eventName: 'payment.captured', timeout: 3600},
      },
    });
    const exitStep = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: 'EXIT',
        name: 'Captured',
        position: {x: 200, y: 0},
        config: {},
      },
    });
    await prisma.workflowTransition.create({
      data: {fromStepId: waitStep.id, toStepId: exitStep.id, waitOutcome: 'EVENT'},
    });
    const contact = await factories.createContact({projectId});
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        contactId: contact.id,
        status: 'WAITING',
        currentStepId: waitStep.id,
      },
    });
    const waitExecution = await prisma.workflowStepExecution.create({
      data: {
        executionId: execution.id,
        stepId: waitStep.id,
        status: 'WAITING',
        startedAt: new Date(),
      },
    });
    const updateWait = servicePrisma.workflowStepExecution.updateMany.bind(servicePrisma.workflowStepExecution);
    let failAcknowledgement = true;
    const waitUpdate = vi.spyOn(servicePrisma.workflowStepExecution, 'updateMany').mockImplementation(async args => {
      if (failAcknowledgement && args.where?.id === waitExecution.id && args.data.status === 'COMPLETED') {
        failAcknowledgement = false;
        throw new Error('injected acknowledgement failure');
      }
      return updateWait(args);
    });

    const response = await request(createTrackApp(projectId))
      .post('/v1/track')
      .send({event: 'payment.captured', email: contact.email});

    expect(response.status).toBe(200);
    const event = await prisma.event.findUniqueOrThrow({where: {id: response.body.data.event}});
    expect(event.processedAt).toBeNull();
    expect(await prisma.workflowStepExecution.count({where: {executionId: execution.id, stepId: exitStep.id}})).toBe(1);
    expect((await prisma.workflowStepExecution.findUniqueOrThrow({where: {id: waitExecution.id}})).status).toBe(
      'RUNNING',
    );

    waitUpdate.mockRestore();
    await prisma.event.update({
      where: {id: event.id},
      data: {
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
        nextDispatchAt: new Date(Date.now() - 1000),
      },
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const job = {updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>;

    await processCleanup(job);
    await processCleanup(job);

    expect((await prisma.event.findUniqueOrThrow({where: {id: event.id}})).processedAt).not.toBeNull();
    expect((await prisma.workflowStepExecution.findUniqueOrThrow({where: {id: waitExecution.id}})).status).toBe(
      'COMPLETED',
    );
    expect(await prisma.workflowStepExecution.count({where: {executionId: execution.id, stepId: exitStep.id}})).toBe(1);
  });

  it('continues enrolling independent workflows when one target fails', async () => {
    const firstWorkflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      allowReentry: true,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'account.ready'},
    });
    const secondWorkflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      allowReentry: true,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'account.ready'},
    });
    const workflowLookup = vi
      .spyOn(servicePrisma.workflow, 'findUnique')
      .mockRejectedValueOnce(new Error('injected failure for one workflow'));

    const response = await request(createTrackApp(projectId))
      .post('/v1/track')
      .send({event: 'account.ready', email: 'fanout@example.com'});

    expect(response.status).toBe(200);
    expect(
      await prisma.workflowExecution.count({
        where: {workflowId: {in: [firstWorkflow.id, secondWorkflow.id]}},
      }),
    ).toBe(1);
    expect(
      await prisma.event.findUniqueOrThrow({
        where: {id: response.body.data.event},
        select: {processedAt: true, dispatchAttempts: true},
      }),
    ).toEqual({processedAt: null, dispatchAttempts: 1});

    workflowLookup.mockRestore();
  });

  it('enrolls an event in a workflow once under concurrent dispatch', async () => {
    const workflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      allowReentry: true,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'concurrent.event'},
    });
    const contact = await factories.createContact({projectId});
    const event = await prisma.event.create({
      data: {
        projectId,
        contactId: contact.id,
        name: 'concurrent.event',
      },
    });

    const originalFindFirst = servicePrisma.workflowExecution.findFirst.bind(servicePrisma.workflowExecution);
    let sourceLookups = 0;
    let releaseSourceLookups!: () => void;
    const bothAtSourceLookup = new Promise<void>(resolve => {
      releaseSourceLookups = resolve;
    });
    const executionLookup = vi.spyOn(servicePrisma.workflowExecution, 'findFirst').mockImplementation(async args => {
      if (args.where?.workflowId === workflow.id && args.where?.sourceEventId === event.id) {
        sourceLookups += 1;
        if (sourceLookups === 2) releaseSourceLookups();
        await bothAtSourceLookup;
        return null;
      }

      if (
        args.where?.workflowId === workflow.id &&
        args.where?.contactId === contact.id &&
        args.where?.status &&
        typeof args.where.status === 'object' &&
        'in' in args.where.status
      ) {
        return null;
      }

      return originalFindFirst(args);
    });
    const startWorkflowForContact = (
      EventService as unknown as {
        startWorkflowForContact(
          workflowId: string,
          contactId: string,
          sourceEventId: string,
          context?: Record<string, unknown>,
        ): Promise<void>;
      }
    ).startWorkflowForContact.bind(EventService);

    await Promise.all([
      startWorkflowForContact(workflow.id, contact.id, event.id),
      startWorkflowForContact(workflow.id, contact.id, event.id),
    ]);

    executionLookup.mockRestore();
    expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id, sourceEventId: event.id}})).toBe(1);
  });

  it('does not let reconciliation overlap an active event dispatch lease', async () => {
    const event = await prisma.event.create({
      data: {
        projectId,
        name: 'slow.dispatch',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      },
    });
    let releaseDispatch!: () => void;
    const dispatchReleased = new Promise<void>(resolve => {
      releaseDispatch = resolve;
    });
    let markDispatchStarted!: () => void;
    const dispatchStarted = new Promise<void>(resolve => {
      markDispatchStarted = resolve;
    });
    const eventService = EventService as unknown as {
      triggerWorkflows(...args: unknown[]): Promise<unknown[]>;
    };
    const triggerWorkflows = vi.spyOn(eventService, 'triggerWorkflows').mockImplementation(async () => {
      markDispatchStarted();
      await dispatchReleased;
      return [];
    });

    const initialDispatch = EventService.dispatchStoredEvent(event.id);
    await dispatchStarted;
    expect(
      await prisma.event.findUniqueOrThrow({
        where: {id: event.id},
        select: {dispatchLeaseId: true, dispatchLeaseExpiresAt: true},
      }),
    ).toMatchObject({
      dispatchLeaseId: expect.any(String),
      dispatchLeaseExpiresAt: expect.any(Date),
    });

    const updateProgress = vi.fn().mockResolvedValue(undefined);
    await processCleanup({updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>);

    expect(triggerWorkflows).toHaveBeenCalledTimes(1);
    expect((await prisma.event.findUniqueOrThrow({where: {id: event.id}})).processedAt).toBeNull();

    releaseDispatch();
    await initialDispatch;
    triggerWorkflows.mockRestore();

    expect(
      await prisma.event.findUniqueOrThrow({
        where: {id: event.id},
        select: {processedAt: true, dispatchLeaseId: true, dispatchLeaseExpiresAt: true},
      }),
    ).toMatchObject({
      processedAt: expect.any(Date),
      dispatchLeaseId: null,
      dispatchLeaseExpiresAt: null,
    });
  });

  it('renews an active dispatch lease while a long workflow target is running', async () => {
    const event = await prisma.event.create({
      data: {
        projectId,
        name: 'slow.heartbeat',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      },
    });
    const eventService = EventService as unknown as {
      startDispatchLeaseHeartbeat(
        eventId: string,
        leaseId: string,
        intervalMs?: number,
      ): {assertOwnership: () => Promise<void>; stop: () => void};
      triggerWorkflows(...args: unknown[]): Promise<unknown[]>;
    };
    const originalHeartbeat = eventService.startDispatchLeaseHeartbeat.bind(EventService);
    const heartbeat = vi
      .spyOn(eventService, 'startDispatchLeaseHeartbeat')
      .mockImplementation((eventId, leaseId) => originalHeartbeat(eventId, leaseId, 20));
    let releaseDispatch!: () => void;
    const dispatchReleased = new Promise<void>(resolve => {
      releaseDispatch = resolve;
    });
    let markDispatchStarted!: () => void;
    const dispatchStarted = new Promise<void>(resolve => {
      markDispatchStarted = resolve;
    });
    const triggerWorkflows = vi.spyOn(eventService, 'triggerWorkflows').mockImplementation(async () => {
      markDispatchStarted();
      await dispatchReleased;
      return [];
    });

    const initialDispatch = EventService.dispatchStoredEvent(event.id);
    await dispatchStarted;
    const activeLease = await prisma.event.findUniqueOrThrow({where: {id: event.id}});
    await prisma.event.update({
      where: {id: event.id},
      data: {dispatchLeaseExpiresAt: new Date(Date.now() + 5)},
    });
    await new Promise(resolve => setTimeout(resolve, 60));

    const renewedLease = await prisma.event.findUniqueOrThrow({where: {id: event.id}});
    expect(renewedLease.dispatchLeaseId).toBe(activeLease.dispatchLeaseId);
    expect(renewedLease.dispatchLeaseExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    const updateProgress = vi.fn().mockResolvedValue(undefined);
    await processCleanup({updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>);
    expect(triggerWorkflows).toHaveBeenCalledTimes(1);

    releaseDispatch();
    await initialDispatch;
    triggerWorkflows.mockRestore();
    heartbeat.mockRestore();
  });

  it('reclaims an expired event dispatch lease', async () => {
    const event = await prisma.event.create({
      data: {
        projectId,
        name: 'crashed.dispatch',
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
        dispatchLeaseId: 'expired-lease',
        dispatchLeaseExpiresAt: new Date(Date.now() - 60 * 1000),
      },
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);

    await processCleanup({updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>);

    expect(
      await prisma.event.findUniqueOrThrow({
        where: {id: event.id},
        select: {processedAt: true, dispatchLeaseId: true, dispatchLeaseExpiresAt: true},
      }),
    ).toMatchObject({
      processedAt: expect.any(Date),
      dispatchLeaseId: null,
      dispatchLeaseExpiresAt: null,
    });
  });

  it('dead-letters a poison event without starving newer work', async () => {
    await factories.createWorkflow({
      projectId,
      enabled: true,
      triggerType: 'EVENT',
      triggerConfig: {eventName: 'poison.event'},
    });
    const contact = await factories.createContact({projectId});
    const poisonEvent = await prisma.event.create({
      data: {
        projectId,
        contactId: contact.id,
        name: 'poison.event',
        dispatchAttempts: 7,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });
    const workflowLookup = vi
      .spyOn(servicePrisma.workflow, 'findUnique')
      .mockRejectedValue(new Error('permanently invalid workflow'));

    await expect(EventService.dispatchStoredEvent(poisonEvent.id)).rejects.toThrow('failed 1 dispatch target');

    expect(
      await prisma.event.findUniqueOrThrow({
        where: {id: poisonEvent.id},
        select: {processedAt: true, dispatchAttempts: true, dispatchFailedAt: true, nextDispatchAt: true},
      }),
    ).toMatchObject({
      processedAt: null,
      dispatchAttempts: 8,
      dispatchFailedAt: expect.any(Date),
      nextDispatchAt: null,
    });

    workflowLookup.mockRestore();
    const healthyEvent = await prisma.event.create({
      data: {
        projectId,
        contactId: contact.id,
        name: 'healthy.event',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      },
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);

    await processCleanup({updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>);

    expect((await prisma.event.findUniqueOrThrow({where: {id: healthyEvent.id}})).processedAt).not.toBeNull();
    expect((await prisma.event.findUniqueOrThrow({where: {id: poisonEvent.id}})).processedAt).toBeNull();
  });
});

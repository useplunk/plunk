import type {NextFunction, Request, Response} from 'express';
import express from 'express';
import type {IdempotencyKeyCleanupJobData} from '@plunk/types';
import type {Job} from 'bullmq';
import request from 'supertest';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {prisma as servicePrisma} from '../../database/prisma.js';
import {processCleanup} from '../../jobs/idempotency-key-cleanup-processor.js';
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

  it('returns the stored event only after synchronous dispatch succeeds', async () => {
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

  it('returns 5xx after a stored event fails dispatch, then reconciles it once', async () => {
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

    expect(response.status).toBe(500);
    const pendingEvent = await prisma.event.findFirstOrThrow({
      where: {projectId, name: 'invoice.paid'},
    });
    expect(pendingEvent.processedAt).toBeNull();
    expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id}})).toBe(0);

    workflowLookup.mockRestore();
    await prisma.event.update({
      where: {id: pendingEvent.id},
      data: {createdAt: new Date(Date.now() - 6 * 60 * 1000)},
    });
    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const job = {updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>;

    await processCleanup(job);
    await processCleanup(job);

    expect((await prisma.event.findUniqueOrThrow({where: {id: pendingEvent.id}})).processedAt).not.toBeNull();
    expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id}})).toBe(1);
    expect(updateProgress).toHaveBeenCalledWith(100);
  });
});

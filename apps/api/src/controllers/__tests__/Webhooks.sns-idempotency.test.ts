import type {Request, Response} from 'express';
import type {Job} from 'bullmq';
import type {Prisma} from '@plunk/db';
import type {IdempotencyKeyCleanupJobData} from '@plunk/types';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {prisma as controllerPrisma} from '../../database/prisma.js';
import {processCleanup} from '../../jobs/idempotency-key-cleanup-processor.js';
import {EventService} from '../../services/EventService.js';
import {SecurityService} from '../../services/SecurityService.js';
import {Webhooks} from '../Webhooks.js';

const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:plunk-ses-events';

function mockResponse() {
  const captured = {status: 200, body: undefined as unknown};

  let markSent: () => void;
  const sent = new Promise<void>(resolve => {
    markSent = resolve;
  });

  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      markSent();
      return this;
    },
  } as unknown as Response;

  return {res, captured, sent};
}

function notification(
  snsMessageId: string,
  sesMessageId: string,
  eventType: 'Bounce' | 'Delivery' | 'Open' | 'Complaint' | 'Click' = 'Delivery',
): Request {
  return {
    body: {
      Type: 'Notification',
      MessageId: snsMessageId,
      TopicArn: SNS_TOPIC_ARN,
      Message: JSON.stringify({
        eventType,
        mail: {messageId: sesMessageId},
      }),
    },
  } as Request;
}

function subscriptionConfirmation(): Request {
  return {
    body: {
      Type: 'SubscriptionConfirmation',
      MessageId: 'sns-subscription-confirmation',
      TopicArn: SNS_TOPIC_ARN,
      SubscribeURL: 'https://sns.eu-west-1.amazonaws.com/?Action=ConfirmSubscription',
    },
  } as Request;
}

function inboundNotification(snsMessageId: string, recipient: string): Request {
  return {
    body: {
      Type: 'Notification',
      MessageId: snsMessageId,
      TopicArn: SNS_TOPIC_ARN,
      Message: JSON.stringify({
        notificationType: 'Received',
        mail: {
          messageId: `ses-${snsMessageId}`,
          source: 'Sender@external.example',
          timestamp: new Date().toISOString(),
          commonHeaders: {from: ['Sender <Sender@external.example>'], subject: 'Inbound test'},
        },
        receipt: {recipients: [recipient]},
      }),
    },
  } as Request;
}

describe('SNS webhook delivery receipts', () => {
  const prisma = getPrismaClient();
  const controller = new Webhooks();
  const next = vi.fn();

  let projectId: string;
  let contactId: string;
  let sesMessageId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    const contact = await factories.createContact({projectId: project.id});
    projectId = project.id;
    contactId = contact.id;
    sesMessageId = `ses-${project.id}`;
    await factories.createEmail({projectId: project.id, contactId: contact.id, messageId: sesMessageId});

    vi.spyOn(SecurityService, 'verifySnsSignature').mockResolvedValue(true);
    vi.spyOn(EventService, 'dispatchStoredEvent').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await prisma.snsWebhookReceipt.deleteMany();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function invoke(req: Request) {
    const {res, captured, sent} = mockResponse();
    const handler = controller.receiveSNSWebhook as unknown as (
      req: Request,
      res: Response,
      next: (error?: unknown) => void,
    ) => void;
    handler(req, res, next);
    await sent;
    expect(next).not.toHaveBeenCalled();
    return captured;
  }

  function deliver(
    snsMessageId: string,
    innerMessageId = sesMessageId,
    eventType: 'Bounce' | 'Delivery' | 'Open' | 'Complaint' | 'Click' = 'Delivery',
  ) {
    return invoke(notification(snsMessageId, innerMessageId, eventType));
  }

  function failNextTransactionAfterEventInsert() {
    const transaction = controllerPrisma.$transaction.bind(controllerPrisma);
    vi.spyOn(controllerPrisma, '$transaction').mockImplementationOnce(
      (async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        transaction(async tx => {
          const createEvent = tx.event.create.bind(tx.event);
          vi.spyOn(tx.event, 'create').mockImplementationOnce(async args => {
            await createEvent(args);
            throw new Error('injected database failure after event insert');
          });
          return callback(tx);
        })) as typeof controllerPrisma.$transaction,
    );
  }

  it('acknowledges a completed replay without applying its effects twice', async () => {
    const first = await deliver('sns-sequential-replay');
    const replay = await deliver('sns-sequential-replay');

    expect(first.status).toBe(200);
    expect(replay).toMatchObject({status: 200, body: {success: true, duplicate: true}});
    expect(SecurityService.verifySnsSignature).toHaveBeenCalledTimes(2);
    expect(EventService.dispatchStoredEvent).toHaveBeenCalledTimes(1);
    const email = await prisma.email.findUniqueOrThrow({where: {messageId: sesMessageId}});
    expect(await prisma.event.count({where: {emailId: email.id}})).toBe(1);
    expect(await prisma.email.findUniqueOrThrow({where: {messageId: sesMessageId}})).toMatchObject({
      status: 'DELIVERED',
    });

    const receipt = await prisma.snsWebhookReceipt.findUniqueOrThrow({
      where: {messageId: 'sns-sequential-replay'},
    });
    expect(receipt.status).toBe('COMPLETED');
    expect(receipt.completedAt).not.toBeNull();
    expect(receipt.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
  });

  it('rejects an untrusted topic before parsing its nested message or claiming a receipt', async () => {
    vi.mocked(SecurityService.verifySnsSignature).mockRestore();

    const response = await invoke({
      body: {
        Type: 'Notification',
        MessageId: 'sns-untrusted-topic',
        TopicArn: 'arn:aws:sns:us-east-1:999999999999:plunk-ses-events',
        Message: '{not-valid-json',
      },
    } as Request);

    expect(response).toMatchObject({status: 403, body: {success: false}});
    expect(EventService.dispatchStoredEvent).not.toHaveBeenCalled();
    expect(await prisma.snsWebhookReceipt.count()).toBe(0);
  });

  it('rejects an untrusted subscription before following its confirmation URL', async () => {
    vi.mocked(SecurityService.verifySnsSignature).mockRestore();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke({
      body: {
        Type: 'SubscriptionConfirmation',
        MessageId: 'sns-untrusted-subscription',
        TopicArn: 'arn:aws:sns:us-east-1:999999999999:plunk-ses-events',
        SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
      },
    } as Request);

    expect(response).toMatchObject({status: 403, body: {success: false}});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await prisma.snsWebhookReceipt.count()).toBe(0);
  });

  it('rolls back partial email and event effects when the database fails, then retries once', async () => {
    failNextTransactionAfterEventInsert();

    const failed = await deliver('sns-db-failure', sesMessageId, 'Open');

    expect(failed.status).toBe(500);
    expect(EventService.dispatchStoredEvent).not.toHaveBeenCalled();
    expect(await prisma.email.findUniqueOrThrow({where: {messageId: sesMessageId}})).toMatchObject({
      status: 'PENDING',
      opens: 0,
      openedAt: null,
    });
    expect(await prisma.event.count({where: {projectId, name: 'email.open'}})).toBe(0);
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-db-failure'}}),
    ).toMatchObject({status: 'FAILED', completedAt: null});

    const retry = await deliver('sns-db-failure', sesMessageId, 'Open');

    expect(retry.status).toBe(200);
    expect(EventService.dispatchStoredEvent).toHaveBeenCalledTimes(1);
    expect(await prisma.email.findUniqueOrThrow({where: {messageId: sesMessageId}})).toMatchObject({
      status: 'OPENED',
      opens: 1,
    });
    expect(await prisma.event.count({where: {projectId, name: 'email.open'}})).toBe(1);
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-db-failure'}}),
    ).toMatchObject({status: 'COMPLETED'});
  });

  it('acknowledges after commit when workflow dispatch fails and leaves the event recoverable', async () => {
    vi.mocked(EventService.dispatchStoredEvent).mockRejectedValueOnce(new Error('injected workflow failure'));

    const first = await deliver('sns-dispatch-failure');
    const replay = await deliver('sns-dispatch-failure');

    expect(first.status).toBe(200);
    expect(replay).toMatchObject({status: 200, body: {success: true, duplicate: true}});
    const event = await prisma.event.findFirstOrThrow({where: {projectId, name: 'email.delivery'}});
    expect(event.processedAt).toBeNull();
    expect(await prisma.event.count({where: {projectId, name: 'email.delivery'}})).toBe(1);
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-dispatch-failure'}}),
    ).toMatchObject({status: 'COMPLETED'});

    vi.mocked(EventService.dispatchStoredEvent).mockRestore();
    await EventService.dispatchStoredEvent(event.id);
    expect((await prisma.event.findUniqueOrThrow({where: {id: event.id}})).processedAt).not.toBeNull();
  });

  it('rolls back inbound contact, email, and event effects before retrying once', async () => {
    await factories.createDomain({projectId, domain: 'inbound.example', verified: true});
    failNextTransactionAfterEventInsert();

    const failed = await invoke(inboundNotification('sns-inbound-db-failure', 'reply@inbound.example'));

    expect(failed.status).toBe(500);
    expect(
      await prisma.contact.findUnique({
        where: {projectId_email: {projectId, email: 'sender@external.example'}},
      }),
    ).toBeNull();
    expect(await prisma.email.count({where: {projectId, sourceType: 'INBOUND'}})).toBe(0);
    expect(await prisma.event.count({where: {projectId, name: 'email.received'}})).toBe(0);
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-inbound-db-failure'}}),
    ).toMatchObject({status: 'FAILED'});

    const retry = await invoke(inboundNotification('sns-inbound-db-failure', 'reply@inbound.example'));

    expect(retry.status).toBe(200);
    expect(
      await prisma.contact.findUnique({
        where: {projectId_email: {projectId, email: 'sender@external.example'}},
      }),
    ).not.toBeNull();
    expect(await prisma.email.count({where: {projectId, sourceType: 'INBOUND'}})).toBe(1);
    expect(await prisma.event.count({where: {projectId, name: 'email.received'}})).toBe(1);
  });

  it('retries an event that arrives before its SES messageId is persisted', async () => {
    const early = await deliver('sns-send-persist-race', 'ses-not-persisted-yet');

    expect(early.status).toBe(500);
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-send-persist-race'}}),
    ).toMatchObject({status: 'FAILED'});

    await factories.createEmail({projectId, contactId, messageId: 'ses-not-persisted-yet'});
    const retry = await deliver('sns-send-persist-race', 'ses-not-persisted-yet');

    expect(retry.status).toBe(200);
    expect(EventService.dispatchStoredEvent).toHaveBeenCalledTimes(1);
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-send-persist-race'}}),
    ).toMatchObject({status: 'COMPLETED'});
  });

  it('reclaims an abandoned processing receipt instead of losing the delivery', async () => {
    await prisma.snsWebhookReceipt.create({
      data: {
        messageId: 'sns-abandoned-claim',
        processingToken: 'abandoned-worker',
        processingStartedAt: new Date(Date.now() - 10 * 60 * 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const retry = await deliver('sns-abandoned-claim');

    expect(retry.status).toBe(200);
    expect(EventService.dispatchStoredEvent).toHaveBeenCalledTimes(1);
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-abandoned-claim'}}),
    ).toMatchObject({status: 'COMPLETED'});
  });

  it('does not reclaim a receipt after its owner renews the observed lease', async () => {
    const originalToken = 'active-worker';
    await prisma.snsWebhookReceipt.create({
      data: {
        messageId: 'sns-renewed-claim',
        processingToken: originalToken,
        processingStartedAt: new Date(Date.now() - 10 * 60 * 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const findReceipt = controllerPrisma.snsWebhookReceipt.findUnique.bind(controllerPrisma.snsWebhookReceipt);
    vi.spyOn(controllerPrisma.snsWebhookReceipt, 'findUnique').mockImplementationOnce(async args => {
      const observed = await findReceipt(args);
      await prisma.snsWebhookReceipt.update({
        where: {messageId: 'sns-renewed-claim'},
        data: {processingStartedAt: new Date()},
      });
      return observed;
    });

    const response = await deliver('sns-renewed-claim');

    expect(response.status).toBe(503);
    expect(EventService.dispatchStoredEvent).not.toHaveBeenCalled();
    expect(
      await prisma.snsWebhookReceipt.findUniqueOrThrow({where: {messageId: 'sns-renewed-claim'}}),
    ).toMatchObject({status: 'PROCESSING', processingToken: originalToken});
  });

  it('returns a retryable response to a concurrent duplicate', async () => {
    let releaseUpdate!: () => void;
    const updateGate = new Promise<void>(resolve => {
      releaseUpdate = resolve;
    });
    let markUpdateStarted!: () => void;
    const updateStarted = new Promise<void>(resolve => {
      markUpdateStarted = resolve;
    });

    const transaction = controllerPrisma.$transaction.bind(controllerPrisma);
    vi.spyOn(controllerPrisma, '$transaction').mockImplementationOnce(
      (async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        transaction(async tx => {
          const updateEmail = tx.email.update.bind(tx.email);
          vi.spyOn(tx.email, 'update').mockImplementationOnce(async args => {
            markUpdateStarted();
            await updateGate;
            return updateEmail(args);
          });
          return callback(tx);
        })) as typeof controllerPrisma.$transaction,
    );

    const firstDelivery = deliver('sns-concurrent-replay');
    await updateStarted;

    const concurrentReplay = await deliver('sns-concurrent-replay');
    expect(concurrentReplay.status).toBe(503);
    expect(EventService.dispatchStoredEvent).not.toHaveBeenCalled();

    releaseUpdate();
    expect((await firstDelivery).status).toBe(200);
    expect(EventService.dispatchStoredEvent).toHaveBeenCalledTimes(1);
  });

  it('keeps successful subscription confirmation behavior', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ok: true});
    vi.stubGlobal('fetch', fetchMock);

    const response = await invoke(subscriptionConfirmation());

    expect(response).toMatchObject({status: 200, body: {success: true, message: 'Subscription confirmed'}});
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sns.eu-west-1.amazonaws.com/?Action=ConfirmSubscription',
    );
    expect(await prisma.snsWebhookReceipt.count()).toBe(0);
  });

  it('returns 5xx when subscription confirmation fails so SNS can retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, statusText: 'upstream failed'}));

    const response = await invoke(subscriptionConfirmation());

    expect(response).toMatchObject({status: 502, body: {success: false}});
    expect(await prisma.snsWebhookReceipt.count()).toBe(0);
  });

  it('removes expired delivery receipts while retaining the replay window', async () => {
    const now = Date.now();
    const pendingEvent = await prisma.event.create({
      data: {
        projectId,
        contactId,
        name: 'outbox.recovery',
        createdAt: new Date(now - 10 * 60 * 1000),
      },
    });
    await prisma.snsWebhookReceipt.createMany({
      data: [
        {
          messageId: 'sns-expired',
          processingToken: 'expired',
          status: 'COMPLETED',
          completedAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(now - 1_000),
        },
        {
          messageId: 'sns-retained',
          processingToken: 'retained',
          status: 'COMPLETED',
          completedAt: new Date(now),
          expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    vi.mocked(EventService.dispatchStoredEvent).mockRestore();
    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const result = await processCleanup({updateProgress} as unknown as Job<IdempotencyKeyCleanupJobData>);

    expect(result.deleted).toBe(1);
    expect(updateProgress).toHaveBeenCalledWith(100);
    expect((await prisma.event.findUniqueOrThrow({where: {id: pendingEvent.id}})).processedAt).not.toBeNull();
    await expect(
      prisma.snsWebhookReceipt.findUnique({where: {messageId: 'sns-expired'}}),
    ).resolves.toBeNull();
    await expect(
      prisma.snsWebhookReceipt.findUnique({where: {messageId: 'sns-retained'}}),
    ).resolves.not.toBeNull();
  });
});

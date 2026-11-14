import {EmailStatus, EmailSourceType, TemplateType} from '@plunk/db';
import type {SendEmailResult} from '@plunk/types';
import type {NextFunction, Request, Response} from 'express';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {Actions} from '../../controllers/Actions.js';
import {ErrorCode, HttpException} from '../../exceptions/index.js';
import {processEmailJob} from '../../jobs/email-processor.js';
import {requeueOverdueScheduledEmails} from '../../jobs/scheduled-email-sweep-processor.js';
import {BillingLimitService} from '../../services/BillingLimitService.js';
import {EmailService} from '../../services/EmailService.js';
import {QueueService, emailQueue} from '../../services/QueueService.js';
import {SecurityService} from '../../services/SecurityService.js';

vi.mock('../../services/SESService.js', () => ({
  sendRawEmail: vi.fn(async () => ({messageId: `ses-${Math.random()}`})),
  getSendingQuota: vi.fn(async () => null),
}));

const prisma = getPrismaClient();
const HOUR = 60 * 60 * 1000;

let projectId: string;
let from: string;
let templateId: string;

/** Call POST /v1/send's handler the way Express would, resolving with its body or its error */
function send(body: Record<string, unknown>): Promise<{emails: SendEmailResult[]}> {
  return new Promise((resolve, reject) => {
    const res = {
      locals: {auth: {type: 'secret', projectId}},
      status: () => res,
      json: (payload: {data: {emails: SendEmailResult[]}}) => resolve(payload.data),
    } as unknown as Response;
    const next = ((error?: unknown) => reject(error)) as NextFunction;

    void new Actions().send({body} as Request, res, next);
  });
}

const sendTemplate = (to: string, delivery?: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  send({to, template: templateId, from, ...extra, ...(delivery ? {delivery} : {})});

const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

const emailsTo = (address: string) => prisma.email.findMany({where: {projectId, contact: {email: address}}});

/**
 * `delivery` on POST /v1/send, end to end: the handler, the claim table, the email processor
 * and the scheduled-email sweep, against a real database and queue. Only SES is mocked.
 */
describe('Transactional delivery', () => {
  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;

    const domain = `p${project.id.slice(0, 8)}.plunk.test`;
    await factories.createDomain({projectId, domain});
    from = `hello@${domain}`;

    const template = await factories.createTemplate({projectId, from, type: TemplateType.TRANSACTIONAL});
    templateId = template.id;
  });

  describe('throttle', () => {
    it('sends the first time and throttles the next send of the same notification', async () => {
      const first = await sendTemplate('ana@acme.test', {throttle: '24h'});
      const second = await sendTemplate('ana@acme.test', {throttle: '24h'});

      expect(first.emails[0]).toMatchObject({status: 'queued', email: expect.any(String)});
      expect(second.emails[0]).toMatchObject({status: 'throttled', email: null});

      const nextAllowedAt = new Date(second.emails[0]!.nextAllowedAt!).getTime();
      expect(nextAllowedAt).toBeGreaterThan(Date.now() + 23 * HOUR);
      expect(await emailsTo('ana@acme.test')).toHaveLength(1);
    });

    it('writes nothing for a throttled recipient, not even the contact data', async () => {
      await sendTemplate('ana@acme.test', {throttle: '24h'}, {data: {plan: 'free'}});
      const before = await prisma.contact.findFirstOrThrow({where: {projectId, email: 'ana@acme.test'}});

      await sendTemplate('ana@acme.test', {throttle: '24h'}, {data: {plan: 'pro'}});

      const after = await prisma.contact.findFirstOrThrow({where: {projectId, email: 'ana@acme.test'}});
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(after.data).toEqual(before.data);
    });

    it('sends again once the window has run out', async () => {
      await sendTemplate('ana@acme.test', {throttle: '24h'});
      await prisma.throttleClaim.updateMany({where: {projectId}, data: {expiresAt: new Date(Date.now() - 1000)}});

      const again = await sendTemplate('ana@acme.test', {throttle: '24h'});

      expect(again.emails[0]!.status).toBe('queued');
      expect(await emailsTo('ana@acme.test')).toHaveLength(2);
    });

    it('holds a notification without a window forever', async () => {
      await sendTemplate('ana@acme.test', {throttle: {}});
      const again = await sendTemplate('ana@acme.test', {throttle: {}});

      expect(again.emails[0]).toMatchObject({status: 'throttled', nextAllowedAt: null});
    });

    it('tells notifications apart by key', async () => {
      const orgA = await sendTemplate('ana@acme.test', {throttle: {window: '24h', key: 'org_a'}});
      const orgB = await sendTemplate('ana@acme.test', {throttle: {window: '24h', key: 'org_b'}});

      expect([orgA.emails[0]!.status, orgB.emails[0]!.status]).toEqual(['queued', 'queued']);
    });

    it('holds a project-scoped notification for every recipient', async () => {
      const result = await sendTemplate('ana@acme.test', {throttle: {window: '24h', scope: 'project'}}, {
        to: ['ana@acme.test', 'tom@acme.test'],
      });

      expect(result.emails.map(e => e.status)).toEqual(['queued', 'throttled']);
    });

    it('lets exactly one of several concurrent sends through', async () => {
      await factories.createContact({projectId, email: 'ana@acme.test', subscribed: true});

      const results = await Promise.all(Array.from({length: 5}, () => sendTemplate('ana@acme.test', {throttle: '24h'})));

      const statuses = results.map(r => r.emails[0]!.status);
      expect(statuses.filter(s => s === 'queued')).toHaveLength(1);
      expect(statuses.filter(s => s === 'throttled')).toHaveLength(4);
    });

    it('releases the claim when the send is refused', async () => {
      const marketing = await factories.createTemplate({projectId, from, type: TemplateType.MARKETING});
      await factories.createContact({projectId, email: 'ana@acme.test', subscribed: false});

      await expect(
        send({to: 'ana@acme.test', template: marketing.id, from, delivery: {throttle: '24h'}}),
      ).rejects.toBeInstanceOf(HttpException);

      expect(await prisma.throttleClaim.count({where: {projectId}})).toBe(0);
    });

    it('measures the window from the actual send', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {throttle: '1h'});
      // Pretend the email sat in the queue for a while before going out
      await prisma.throttleClaim.updateMany({where: {projectId}, data: {expiresAt: new Date(Date.now() + 60 * 1000)}});

      await processEmailJob(emails[0]!.email!);

      const claim = await prisma.throttleClaim.findFirstOrThrow({where: {projectId}});
      expect(claim.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000);
    });

    it('releases the claim when the email fails before sending', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {throttle: '24h'});
      await prisma.project.update({where: {id: projectId}, data: {disabled: true}});

      await processEmailJob(emails[0]!.email!);

      expect(await prisma.throttleClaim.count({where: {projectId}})).toBe(0);
    });
  });

  describe('scheduling', () => {
    it('stores the email as scheduled behind a delayed job', async () => {
      const at = inHours(2);
      const {emails} = await sendTemplate('ana@acme.test', {at});

      expect(emails[0]).toMatchObject({status: 'scheduled', scheduledFor: at});

      const email = await prisma.email.findUniqueOrThrow({where: {id: emails[0]!.email!}});
      expect(email.status).toBe(EmailStatus.SCHEDULED);
      expect(email.scheduledFor?.toISOString()).toBe(at);

      const job = await emailQueue.getJob(`email-${email.id}`);
      expect(await job?.isDelayed()).toBe(true);
    });

    it('sends nothing before its time and sends it when it is due', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {at: inHours(2)});
      const id = emails[0]!.email!;

      await processEmailJob(id);
      expect((await prisma.email.findUniqueOrThrow({where: {id}})).status).toBe(EmailStatus.SCHEDULED);

      await prisma.email.update({where: {id}, data: {scheduledFor: new Date(Date.now() - 1000)}});
      await processEmailJob(id);
      expect((await prisma.email.findUniqueOrThrow({where: {id}})).status).toBe(EmailStatus.SENT);
    });

    it('cancels a scheduled email, which then never sends', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {at: inHours(2)});
      const id = emails[0]!.email!;

      const cancelled = await EmailService.cancelScheduled(projectId, id);
      expect(cancelled.status).toBe(EmailStatus.CANCELLED);
      expect(await emailQueue.getJob(`email-${id}`)).toBeUndefined();

      await prisma.email.update({where: {id}, data: {scheduledFor: new Date(Date.now() - 1000)}});
      await processEmailJob(id);
      expect((await prisma.email.findUniqueOrThrow({where: {id}})).status).toBe(EmailStatus.CANCELLED);
    });

    it('refuses to cancel or move an email that is no longer scheduled', async () => {
      const {emails} = await sendTemplate('ana@acme.test');
      const id = emails[0]!.email!;

      await expect(EmailService.cancelScheduled(projectId, id)).rejects.toMatchObject({
        code: 409,
        errorCode: ErrorCode.EMAIL_NOT_SCHEDULED,
      });
      await expect(EmailService.reschedule(projectId, id, new Date(Date.now() + HOUR))).rejects.toMatchObject({
        code: 409,
      });
    });

    it('moves a scheduled email and its job', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {at: inHours(2)});
      const id = emails[0]!.email!;
      const later = new Date(Date.now() + 5 * HOUR);

      const moved = await EmailService.reschedule(projectId, id, later);

      expect(moved.scheduledFor?.getTime()).toBe(later.getTime());
      const job = await emailQueue.getJob(`email-${id}`);
      expect(job!.delay).toBeGreaterThan(4 * HOUR);
    });

    it('cancels an email whose marketing template the contact unsubscribed from while it waited', async () => {
      const marketing = await factories.createTemplate({projectId, from, type: TemplateType.MARKETING});
      await factories.createContact({projectId, email: 'ana@acme.test', subscribed: true});
      const {emails} = await send({to: 'ana@acme.test', template: marketing.id, from, delivery: {at: inHours(1)}});
      const id = emails[0]!.email!;

      await prisma.contact.updateMany({where: {projectId}, data: {subscribed: false}});
      await prisma.email.update({where: {id}, data: {scheduledFor: new Date(Date.now() - 1000)}});
      await processEmailJob(id);

      expect((await prisma.email.findUniqueOrThrow({where: {id}})).status).toBe(EmailStatus.CANCELLED);
    });

    it('re-queues an overdue scheduled email whose job was lost', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {at: inHours(1)});
      const id = emails[0]!.email!;
      await (await emailQueue.getJob(`email-${id}`))!.remove();
      await prisma.email.update({where: {id}, data: {scheduledFor: new Date(Date.now() - 10 * 60 * 1000)}});

      const requeued = await requeueOverdueScheduledEmails();

      expect(requeued).toBeGreaterThanOrEqual(1);
      expect(await emailQueue.getJob(`email-sweep-${id}`)).toBeDefined();
    });

    it('is cancelled, with its claim released, when the project is disabled', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {at: inHours(2), throttle: '24h'});

      await QueueService.cancelAllProjectJobs(projectId);

      const email = await prisma.email.findUniqueOrThrow({where: {id: emails[0]!.email!}});
      expect(email.status).toBe(EmailStatus.CANCELLED);
      expect(await prisma.throttleClaim.count({where: {projectId}})).toBe(0);
    });

    it('does not count a cancelled email towards usage', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {at: inHours(2)});
      await BillingLimitService.invalidateCache(projectId);
      const before = await BillingLimitService.getUsage(projectId, EmailSourceType.TRANSACTIONAL);

      await EmailService.cancelScheduled(projectId, emails[0]!.email!);
      await BillingLimitService.invalidateCache(projectId);

      expect(await BillingLimitService.getUsage(projectId, EmailSourceType.TRANSACTIONAL)).toBe(before - 1);
    });
  });

  it('keeps scheduled and cancelled emails out of the bounce rate', async () => {
    const {emails} = await sendTemplate('ana@acme.test');
    await prisma.email.update({where: {id: emails[0]!.email!}, data: {status: EmailStatus.BOUNCED, bouncedAt: new Date()}});
    for (let i = 0; i < 3; i++) {
      const scheduled = await sendTemplate(`queue${i}@acme.test`, {at: inHours(2)});
      if (i === 0) {
        await EmailService.cancelScheduled(projectId, scheduled.emails[0]!.email!);
      }
    }

    const status = await SecurityService.getSecurityStatus(projectId);

    expect(status.sevenDay.total).toBe(1);
    expect(status.sevenDay.bounces).toBe(1);
  });

  describe('scheduling with a throttle', () => {
    it('holds the notification from the moment it is scheduled, until it is cancelled', async () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await sendTemplate('ana@acme.test', {at: inHours(3), throttle: '24h'}));
      }

      const statuses = results.map(r => r.emails[0]!.status);
      expect(statuses).toEqual(['scheduled', 'throttled', 'throttled', 'throttled', 'throttled']);

      await EmailService.cancelScheduled(projectId, results[0]!.emails[0]!.email!);

      const afterCancel = await sendTemplate('ana@acme.test', {throttle: '24h'});
      expect(afterCancel.emails[0]!.status).toBe('queued');
    });

    it('moves the throttle window with the email when it is rescheduled', async () => {
      const {emails} = await sendTemplate('ana@acme.test', {at: inHours(1), throttle: '1h'});
      const later = new Date(Date.now() + 10 * HOUR);

      await EmailService.reschedule(projectId, emails[0]!.email!, later);

      const claim = await prisma.throttleClaim.findFirstOrThrow({where: {projectId}});
      expect(claim.expiresAt!.getTime()).toBe(later.getTime() + HOUR);
    });
  });
});

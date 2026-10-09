import {Server} from '@overnightjs/core';
import {EmailSourceType, EmailStatus} from '@plunk/db';
import cookies from 'cookie-parser';
import {json, type NextFunction, type Request, type Response} from 'express';
import request from 'supertest';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ZodError} from 'zod';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {Actions} from '../../controllers/Actions';
import {Suppressions} from '../../controllers/Suppressions';
import {jwt} from '../../middleware/auth';
import {processEmail} from '../../jobs/email-processor';
import {CampaignService} from '../CampaignService';
import {EmailService} from '../EmailService';
import {matchesRecipient, RecipientSuppressionService, suppressionRuleSchema} from '../RecipientSuppressionService';
import {sendRawEmail} from '../SESService';

vi.mock('../SESService', () => ({
  sendRawEmail: vi.fn().mockResolvedValue({messageId: 'stub-provider-id'}),
  getSendingQuota: vi.fn(),
}));
vi.mock('../MeterService', () => ({MeterService: {recordEmailSent: vi.fn()}}));
vi.mock('../SecurityService', () => ({
  SecurityService: {checkPhishingContent: vi.fn().mockResolvedValue({shouldDisable: false})},
}));
vi.mock('../EventService', () => ({EventService: {trackEvent: vi.fn()}}));
vi.mock('../QueueService', () => ({QueueService: {queueEmail: vi.fn()}, emailQueue: {}}));
vi.mock('../BillingLimitService', () => ({
  BillingLimitService: {
    checkLimit: vi.fn().mockResolvedValue({allowed: true}),
    incrementUsage: vi.fn(),
    invalidateCache: vi.fn(),
  },
}));

class TestServer extends Server {
  constructor() {
    super();
    this.app.use(json());
    this.app.use(cookies());
    this.addControllers([new Suppressions(), new Actions()]);
    this.app.use((err: {code?: number; message: string}, _req: Request, res: Response, _next: NextFunction) => {
      res
        .status(err instanceof ZodError ? 400 : typeof err.code === 'number' ? err.code : 500)
        .json({error: err.message});
    });
  }
}
const app = new TestServer().app;
const prisma = getPrismaClient();
const definition = {name: 'Test domain', kind: 'DOMAIN', pattern: 'example.com', enabled: true};

describe('recipient suppression', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    ['ADDRESS', 'one@example.com', 'ONE@EXAMPLE.COM', true],
    ['DOMAIN', 'example.com', 'one@sub.example.com', false],
    ['DOMAIN', 'example.com', 'one@example.com.evil.test', false],
    ['PREFIX', 'qa+', 'qa+123@example.com', true],
    ['PREFIX', 'qa', 'someone@qa.test', false],
    ['SUFFIX', '+test', 'one+test@example.com', true],
    ['WILDCARD', 'qa-?*@example.com', 'qa-12@example.com', true],
    ['WILDCARD', '*@example.com', 'one@elsewhere.test', false],
  ])('matches %s safely', (kind, pattern, recipient, expected) => {
    expect(matchesRecipient({id: 'rule', name: 'rule', enabled: true, kind, pattern}, recipient)).toBe(expected);
  });
  it('rejects regex, empty and malformed patterns; ignores disabled rules', () => {
    for (const pattern of ['', '(.+)+@example.com', 'bad domain'])
      expect(suppressionRuleSchema.safeParse({...definition, kind: 'WILDCARD', pattern}).success).toBe(false);
    expect(matchesRecipient({...definition, id: 'rule', enabled: false}, 'one@example.com')).toBe(false);
  });
  it('captures rendered content and attachments without SES calls, including retries after rule disable', async () => {
    const {project} = await factories.createUserWithProject();
    const contact = await factories.createContact({
      projectId: project.id,
      email: 'qa@example.com',
      data: {firstName: 'Ada'},
    });
    const rule = await prisma.recipientSuppressionRule.create({data: {...definition, projectId: project.id}});
    const email = await EmailService.sendTransactionalEmail({
      projectId: project.id,
      contactId: contact.id,
      subject: 'Hello {{firstName}}',
      body: '<p>{{firstName}}</p>',
      from: 'sender@example.test',
      attachments: [{filename: 'a.txt', content: 'aGVsbG8=', contentType: 'text/plain'}],
    });
    await prisma.recipientSuppressionRule.update({where: {id: rule.id}, data: {enabled: false}});
    await processEmail({data: {emailId: email.id, sourceType: EmailSourceType.TRANSACTIONAL}});
    await processEmail({data: {emailId: email.id, sourceType: EmailSourceType.TRANSACTIONAL}});
    const captured = await prisma.email.findUniqueOrThrow({where: {id: email.id}});
    expect(captured.status).toBe(EmailStatus.SUPPRESSED);
    expect(captured.renderedBody).toContain('Ada');
    expect(captured.renderedSubject).toBe('Hello Ada');
    expect(captured.body).toBe('<p>{{firstName}}</p>');
    expect(captured.attachments).toEqual([{filename: 'a.txt', content: 'aGVsbG8=', contentType: 'text/plain'}]);
    expect(captured.suppression).toMatchObject({ruleId: rule.id, recipient: 'qa@example.com'});
    expect(captured.sentAt).toBeNull();
    expect(captured.messageId).toBeNull();
    expect(sendRawEmail).not.toHaveBeenCalled();
  });
  it('rechecks newly enabled rules at the worker and honors actual recipient overrides', async () => {
    const {project} = await factories.createUserWithProject();
    const contact = await factories.createContact({projectId: project.id, email: 'real@elsewhere.test'});
    const email = await EmailService.sendWorkflowEmail({
      projectId: project.id,
      contactId: contact.id,
      recipientEmail: 'qa@example.com',
      subject: 'Test',
      body: 'Test',
      from: 'sender@example.test',
    });
    await prisma.recipientSuppressionRule.create({data: {...definition, projectId: project.id}});
    await processEmail({data: {emailId: email.id, sourceType: EmailSourceType.WORKFLOW}});
    expect((await prisma.email.findUniqueOrThrow({where: {id: email.id}})).status).toBe(EmailStatus.SUPPRESSED);
    expect(sendRawEmail).not.toHaveBeenCalled();
  });
  it('keeps mixed API recipients independent, preserving request-only rendered data', async () => {
    const {project} = await factories.createUserWithProject();
    await factories.createDomain({projectId: project.id, domain: 'sender.test'});
    await prisma.recipientSuppressionRule.create({data: {...definition, projectId: project.id}});
    const result = await request(app)
      .post('/v1/send')
      .set('Authorization', `Bearer ${project.secret}`)
      .send({
        to: ['qa@example.com', 'real@elsewhere.test'],
        from: 'hello@sender.test',
        subject: 'Code {{code}}',
        body: '<p>{{code}}</p>',
        data: {code: {value: 'ABC123', persistent: false}},
      });
    expect(result.status, JSON.stringify(result.body)).toBe(200);
    const emails = await prisma.email.findMany({where: {projectId: project.id}, orderBy: {recipientAddress: 'asc'}});
    expect(emails).toHaveLength(2);
    for (const email of emails)
      await processEmail({data: {emailId: email.id, sourceType: EmailSourceType.TRANSACTIONAL}});
    expect(sendRawEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendRawEmail).mock.calls[0]?.[0].to).toEqual(['real@elsewhere.test']);
    const captured = await prisma.email.findFirstOrThrow({
      where: {projectId: project.id, status: EmailStatus.SUPPRESSED},
    });
    expect(captured.renderedBody).toContain('ABC123');
  });
  it('scopes rules and captures to authenticated projects and denies public/absent keys', async () => {
    const {project} = await factories.createUserWithProject();
    const {project: other} = await factories.createUserWithProject();
    const created = await request(app)
      .post('/suppressions')
      .set('Authorization', `Bearer ${project.secret}`)
      .send(definition);
    expect(created.status).toBe(201);
    expect(
      (
        await request(app)
          .put(`/suppressions/${created.body.id}`)
          .set('Authorization', `Bearer ${other.secret}`)
          .send({...definition, enabled: false})
      ).status,
    ).toBe(404);
    expect((await request(app).get('/suppressions').set('Authorization', `Bearer ${other.secret}`)).body).toEqual([]);
    expect(await RecipientSuppressionService.match(other.id, 'qa@example.com')).toBeUndefined();
    const contact = await factories.createContact({projectId: project.id, email: 'qa@example.com'});
    const email = await factories.createEmail(project.id, contact.id, {status: EmailStatus.SUPPRESSED});
    expect(
      (await request(app).get(`/suppressions/emails/${email.id}`).set('Authorization', `Bearer ${other.secret}`))
        .status,
    ).toBe(404);
    expect(
      (await request(app).get(`/suppressions/emails/${email.id}`).set('Authorization', `Bearer ${project.secret}`))
        .status,
    ).toBe(200);
    expect((await request(app).get('/suppressions').set('Authorization', `Bearer ${project.public}`)).status).toBe(401);
    expect((await request(app).get('/suppressions')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/suppressions')
          .set('Authorization', `Bearer ${project.secret}`)
          .send({...definition, projectId: other.id})
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/suppressions/preview')
          .set('Authorization', `Bearer ${project.secret}`)
          .send({address: 'QA@example.com'})
      ).body.suppressed,
    ).toBe(true);
  });
  it('does not bypass disabled projects', async () => {
    const {project} = await factories.createUserWithProject({}, {disabled: true});
    expect(
      (await request(app).post('/suppressions').set('Authorization', `Bearer ${project.secret}`).send(definition))
        .status,
    ).toBe(403);
    const contact = await factories.createContact({projectId: project.id});
    const email = await factories.createEmail(project.id, contact.id, {status: EmailStatus.PENDING});
    await processEmail({data: {emailId: email.id, sourceType: EmailSourceType.TRANSACTIONAL}});
    expect(sendRawEmail).not.toHaveBeenCalled();
    expect((await prisma.project.findUniqueOrThrow({where: {id: project.id}})).disabled).toBe(true);
  });
  it('captures campaign previews without reaching the direct provider path', async () => {
    const {project, user} = await factories.createUserWithProject({email: 'qa@example.com'});
    await factories.createDomain({projectId: project.id, domain: 'sender.test'});
    const campaign = await factories.createCampaign({
      projectId: project.id,
      from: 'hello@sender.test',
      subject: 'Preview',
      body: '<p>Original preview</p>',
    });
    await prisma.recipientSuppressionRule.create({data: {...definition, projectId: project.id}});
    await CampaignService.sendTest(project.id, campaign.id, user.email);
    const email = await prisma.email.findFirstOrThrow({where: {projectId: project.id}});
    expect(email.status).toBe(EmailStatus.SUPPRESSED);
    expect(email.renderedBody).toBe('<p>Original preview</p>');
    expect(sendRawEmail).not.toHaveBeenCalled();
  });
  it('atomically claims a captured email across concurrent workers', async () => {
    const {project} = await factories.createUserWithProject();
    const contact = await factories.createContact({projectId: project.id, email: 'qa@example.com'});
    await prisma.recipientSuppressionRule.create({data: {...definition, projectId: project.id}});
    const email = await EmailService.sendTransactionalEmail({
      projectId: project.id,
      contactId: contact.id,
      from: 'sender@sender.test',
      subject: 'Concurrent',
      body: 'Body',
    });
    await Promise.all(
      Array.from({length: 4}, () =>
        processEmail({data: {emailId: email.id, sourceType: EmailSourceType.TRANSACTIONAL}}),
      ),
    );
    expect((await prisma.email.findUniqueOrThrow({where: {id: email.id}})).status).toBe(EmailStatus.SUPPRESSED);
    expect(sendRawEmail).not.toHaveBeenCalled();
  });
  it('authorizes dashboard members and rejects another project header', async () => {
    const {project, user} = await factories.createUserWithProject();
    const {project: other} = await factories.createUserWithProject();
    const cookie = `next_token=${jwt.sign(user.id)}`;
    expect((await request(app).get('/suppressions').set('Cookie', cookie).set('X-Project-Id', project.id)).status).toBe(
      200,
    );
    expect((await request(app).get('/suppressions').set('Cookie', cookie).set('X-Project-Id', other.id)).status).toBe(
      403,
    );
    expect((await request(app).get('/suppressions').set('Cookie', cookie)).status).toBe(400);
  });
  it('pages captures chronologically without accepting foreign cursors', async () => {
    const {project} = await factories.createUserWithProject();
    const {project: other} = await factories.createUserWithProject();
    const contact = await factories.createContact({projectId: project.id});
    const first = await factories.createEmail(project.id, contact.id, {status: EmailStatus.SUPPRESSED});
    const second = await factories.createEmail(project.id, contact.id, {status: EmailStatus.SUPPRESSED});
    await prisma.email.update({where: {id: first.id}, data: {createdAt: new Date('2026-01-01')}});
    const page = await request(app)
      .get('/suppressions/emails?limit=1')
      .set('Authorization', `Bearer ${project.secret}`);
    expect(page.body.emails.map((e: {id: string}) => e.id)).toEqual([second.id]);
    const next = await request(app)
      .get(`/suppressions/emails?limit=1&cursor=${page.body.nextCursor}`)
      .set('Authorization', `Bearer ${project.secret}`);
    expect(next.body.emails.map((e: {id: string}) => e.id)).toEqual([first.id]);
    expect(next.body.nextCursor).toBeNull();
    expect(
      (
        await request(app)
          .get(`/suppressions/emails?cursor=${second.id}`)
          .set('Authorization', `Bearer ${other.secret}`)
      ).status,
    ).toBe(400);
  });
});

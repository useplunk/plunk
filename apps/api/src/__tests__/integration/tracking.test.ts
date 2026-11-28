import {CampaignStatus, EmailSourceType, TemplateType, TrackingMode} from '@plunk/db';
import {ActionSchemas, CampaignSchemas, TemplateSchemas} from '@plunk/shared';
import type {SendEmailResult} from '@plunk/types';
import type {NextFunction, Request, Response} from 'express';
import {beforeEach, describe, expect, it, vi, type Mock} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {Actions} from '../../controllers/Actions.js';
import {processEmailJob} from '../../jobs/email-processor.js';
import {EmailService} from '../../services/EmailService.js';
import {sendRawEmail} from '../../services/SESService.js';

vi.mock('../../services/SESService.js', () => ({
  sendRawEmail: vi.fn(async () => ({messageId: `ses-${Math.random()}`})),
  getSendingQuota: vi.fn(async () => null),
}));

const prisma = getPrismaClient();

let projectId: string;
let from: string;

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

/** The `tracking` flag the processor handed to SES for the last email it sent */
function sentWithTracking(): boolean | undefined {
  const calls = (sendRawEmail as Mock).mock.calls;
  return (calls.at(-1)?.[0] as {tracking?: boolean} | undefined)?.tracking;
}

async function useProject(tracking: TrackingMode) {
  const {project} = await factories.createUserWithProject({}, {tracking});
  projectId = project.id;

  const domain = `p${project.id.slice(0, 8)}.plunk.test`;
  await factories.createDomain({projectId, domain});
  from = `hello@${domain}`;
}

/**
 * Per-template, per-campaign and per-send tracking overrides, end to end: POST /v1/send and the
 * email processor against a real database. Only SES is mocked, so the assertions read the
 * `tracking` flag the processor would have handed it.
 */
describe('Tracking overrides', () => {
  beforeEach(() => {
    (sendRawEmail as Mock).mockClear();
  });

  describe('templates', () => {
    it('sends without tracking when the template turns it off, on a tracked project', async () => {
      await useProject(TrackingMode.ENABLED);
      const template = await factories.createTemplate({
        projectId,
        from,
        type: TemplateType.TRANSACTIONAL,
        tracking: false,
      });

      const {emails} = await send({to: 'ana@acme.test', template: template.id});
      await processEmailJob(emails[0]!.email!);

      expect(sentWithTracking()).toBe(false);
    });

    it('tracks when the template turns it on, on an untracked project', async () => {
      await useProject(TrackingMode.DISABLED);
      const template = await factories.createTemplate({
        projectId,
        from,
        type: TemplateType.TRANSACTIONAL,
        tracking: true,
      });

      const {emails} = await send({to: 'ana@acme.test', template: template.id});
      await processEmailJob(emails[0]!.email!);

      expect(sentWithTracking()).toBe(true);
    });

    it("follows the project's mode when the template has no setting", async () => {
      await useProject(TrackingMode.MARKETING_ONLY);
      const template = await factories.createTemplate({projectId, from, type: TemplateType.TRANSACTIONAL});

      const {emails} = await send({to: 'ana@acme.test', template: template.id});
      await processEmailJob(emails[0]!.email!);

      // Marketing only leaves transactional sends untracked
      expect(sentWithTracking()).toBe(false);
    });

    it('applies to workflow emails sent with the template', async () => {
      await useProject(TrackingMode.ENABLED);
      const template = await factories.createTemplate({projectId, from, tracking: false});
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail({
        projectId,
        contactId: contact.id,
        from,
        templateId: template.id,
        sourceType: EmailSourceType.WORKFLOW,
      });

      await processEmailJob(email.id);

      expect(sentWithTracking()).toBe(false);
    });
  });

  describe('POST /v1/send', () => {
    it("stores the send's tracking field on the email", async () => {
      await useProject(TrackingMode.ENABLED);

      const {emails} = await send({to: 'ana@acme.test', subject: 'Invoice', body: '<p>Hi</p>', from, tracking: false});

      const email = await prisma.email.findUniqueOrThrow({where: {id: emails[0]!.email!}});
      expect(email.trackingOverride).toBe(false);
    });

    it("beats the template's setting", async () => {
      await useProject(TrackingMode.ENABLED);
      const template = await factories.createTemplate({
        projectId,
        from,
        type: TemplateType.TRANSACTIONAL,
        tracking: false,
      });

      const {emails} = await send({to: 'ana@acme.test', template: template.id, tracking: true});
      await processEmailJob(emails[0]!.email!);

      expect(sentWithTracking()).toBe(true);
    });

    it("beats the project's mode on an inline send", async () => {
      await useProject(TrackingMode.ENABLED);

      const {emails} = await send({to: 'ana@acme.test', subject: 'Invoice', body: '<p>Hi</p>', from, tracking: false});
      await processEmailJob(emails[0]!.email!);

      expect(sentWithTracking()).toBe(false);
    });

    it('leaves the email without an override when the field is omitted', async () => {
      await useProject(TrackingMode.ENABLED);

      const {emails} = await send({to: 'ana@acme.test', subject: 'Invoice', body: '<p>Hi</p>', from});

      const email = await prisma.email.findUniqueOrThrow({where: {id: emails[0]!.email!}});
      expect(email.trackingOverride).toBeNull();
    });
  });

  describe('campaigns', () => {
    async function sendCampaignEmail(tracking: boolean | null) {
      const campaign = await factories.createCampaign({projectId, from, status: CampaignStatus.SENDING, tracking});
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail({projectId, contactId: contact.id, from, campaignId: campaign.id});

      await processEmailJob(email.id);
    }

    it('sends without tracking when the campaign turns it off', async () => {
      await useProject(TrackingMode.ENABLED);
      await sendCampaignEmail(false);

      expect(sentWithTracking()).toBe(false);
    });

    it('tracks when the campaign turns it on, on an untracked project', async () => {
      await useProject(TrackingMode.DISABLED);
      await sendCampaignEmail(true);

      expect(sentWithTracking()).toBe(true);
    });

    it("follows the project's mode when the campaign has no setting", async () => {
      await useProject(TrackingMode.DISABLED);
      await sendCampaignEmail(null);

      expect(sentWithTracking()).toBe(false);
    });
  });

  describe('resolveTracking', () => {
    const base = {trackingMode: TrackingMode.ENABLED, sourceType: EmailSourceType.TRANSACTIONAL};

    it('lets the most specific setting win', () => {
      expect(EmailService.resolveTracking({...base, emailOverride: true, templateTracking: false})).toBe(true);
      expect(EmailService.resolveTracking({...base, emailOverride: null, templateTracking: false})).toBe(false);
      expect(EmailService.resolveTracking({...base, campaignTracking: false})).toBe(false);
    });

    it("falls back to the project's mode when nothing overrides it", () => {
      expect(EmailService.resolveTracking({...base, emailOverride: null, templateTracking: null})).toBe(true);
      expect(EmailService.resolveTracking({...base, trackingMode: TrackingMode.MARKETING_ONLY})).toBe(false);
      expect(
        EmailService.resolveTracking({
          trackingMode: TrackingMode.MARKETING_ONLY,
          sourceType: EmailSourceType.CAMPAIGN,
        }),
      ).toBe(true);
    });
  });

  describe('validation', () => {
    it('accepts a boolean tracking field on POST /v1/send and rejects anything else', () => {
      const body = {to: 'ana@acme.test', subject: 'Hi', body: '<p>Hi</p>'};

      expect(ActionSchemas.send.parse({...body, tracking: false}).tracking).toBe(false);
      expect(ActionSchemas.send.parse(body).tracking).toBeUndefined();
      expect(ActionSchemas.send.safeParse({...body, tracking: 'false'}).success).toBe(false);
    });

    it('accepts true, false and null on templates and campaigns', () => {
      for (const schema of [TemplateSchemas.update, CampaignSchemas.update]) {
        expect(schema.parse({tracking: null}).tracking).toBeNull();
        expect(schema.parse({tracking: true}).tracking).toBe(true);
        expect(schema.parse({}).tracking).toBeUndefined();
        expect(schema.safeParse({tracking: 'off'}).success).toBe(false);
      }
    });
  });
});

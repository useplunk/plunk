import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {StepExecutionStatus, WorkflowExecutionStatus, WorkflowStepType, WorkflowTriggerType} from '@plunk/db';
import {WorkflowExecutionService} from '../WorkflowExecutionService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * Tests for WEBHOOK step config templating.
 *
 * `executeWebhook` is a private static method but is invokable at runtime
 * through a `as any` cast. We mock `safeFetch` (also private) via the
 * same mechanism so we can capture the rendered request without making a
 * real network call.
 */
describe('WorkflowExecutionService.executeWebhook templating', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  // Capture (url, options) passed to safeFetch
  let safeFetchSpy: ReturnType<typeof vi.spyOn>;
  let captured: {url: string; options: RequestInit} | null = null;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;

    captured = null;
    safeFetchSpy = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(WorkflowExecutionService as any, 'safeFetch')
      .mockImplementation(async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit];
        captured = {url, options};
        return new Response('{"ok":true}', {
          status: 200,
          headers: {'Content-Type': 'application/json'},
        });
      });
  });

  afterEach(() => {
    safeFetchSpy.mockRestore();
  });

  /**
   * Helper: build a workflow with a single WEBHOOK step using the given
   * config, plus a contact and a RUNNING execution. Returns the args
   * shape `executeWebhook` expects.
   */
  async function setup(
    webhookConfig: Record<string, unknown>,
    contactOverrides: {data?: Record<string, unknown>} = {},
    executionContext: Record<string, unknown> = {},
  ) {
    const contact = await factories.createContact({
      projectId,
      data: contactOverrides.data,
    });

    const workflow = await factories.createWorkflow({
      projectId,
      enabled: true,
      triggerType: WorkflowTriggerType.EVENT,
      triggerConfig: {eventName: 'test.event'},
    });

    const step = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        type: WorkflowStepType.WEBHOOK,
        name: 'Webhook',
        position: {x: 0, y: 0},
        config: webhookConfig,
      },
    });

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        contactId: contact.id,
        status: WorkflowExecutionStatus.RUNNING,
        context: executionContext,
      },
      include: {contact: true, workflow: true},
    });

    const stepExecution = await prisma.workflowStepExecution.create({
      data: {
        executionId: execution.id,
        stepId: step.id,
        status: StepExecutionStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    return {step, execution, stepExecution};
  }

  async function invokeWebhook(
    step: unknown,
    execution: unknown,
    stepExecution: unknown,
    config: unknown,
  ) {
    // Call through `as any` because executeWebhook is private at the
    // TypeScript level. JS has no actual access control.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (WorkflowExecutionService as any).executeWebhook(step, execution, stepExecution, config);
  }

  it('renders {{vars}} in the URL from contact.data', async () => {
    const {step, execution, stepExecution} = await setup(
      {
        url: 'https://example.com/api/users/{{userId}}',
        method: 'GET',
      },
      {data: {userId: 'abc-123'}},
    );

    await invokeWebhook(step, execution, stepExecution, step.config);

    expect(captured).not.toBeNull();
    expect(captured!.url).toBe('https://example.com/api/users/abc-123');
  });

  it('renders {{vars}} in header values', async () => {
    const {step, execution, stepExecution} = await setup(
      {
        url: 'https://example.com/hook',
        method: 'POST',
        headers: {
          Authorization: 'Bearer {{apiToken}}',
          'X-Static': 'literal',
        },
      },
      {data: {apiToken: 'secret-token-xyz'}},
    );

    await invokeWebhook(step, execution, stepExecution, step.config);

    expect(captured).not.toBeNull();
    const headers = captured!.options.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-token-xyz');
    expect(headers['X-Static']).toBe('literal');
  });

  it('renders {{vars}} in nested object body leaves and JSON-encodes', async () => {
    const {step, execution, stepExecution} = await setup(
      {
        url: 'https://example.com/hook',
        method: 'POST',
        body: {
          user: {
            email: '{{email}}',
            name: '{{firstName}}',
          },
          ref: 'literal-ref',
          tags: ['plan:{{plan}}', 'static'],
        },
      },
      {data: {firstName: 'Ada', plan: 'gold'}},
      {campaignId: 'camp-9'},
    );

    await invokeWebhook(step, execution, stepExecution, step.config);

    expect(captured).not.toBeNull();
    const body = JSON.parse(captured!.options.body as string);
    expect(body.user.email).toBe(execution.contact.email);
    expect(body.user.name).toBe('Ada');
    expect(body.ref).toBe('literal-ref');
    expect(body.tags).toEqual(['plan:gold', 'static']);
  });

  it('leaves non-string body leaves untouched', async () => {
    const {step, execution, stepExecution} = await setup({
      url: 'https://example.com/hook',
      method: 'POST',
      body: {
        score: 42,
        active: true,
        deleted: null,
        meta: {
          count: 7,
          enabled: false,
        },
        tags: ['{{plan ?? free}}', 100, false],
      },
    });

    await invokeWebhook(step, execution, stepExecution, step.config);

    expect(captured).not.toBeNull();
    const body = JSON.parse(captured!.options.body as string);
    expect(body.score).toBe(42);
    expect(body.active).toBe(true);
    expect(body.deleted).toBe(null);
    expect(body.meta).toEqual({count: 7, enabled: false});
    // String leaf rendered (with default), non-string leaves preserved.
    expect(body.tags).toEqual(['free', 100, false]);
  });

  it('renders {{event.*}} variables from the trigger payload', async () => {
    const {step, execution, stepExecution} = await setup(
      {
        url: 'https://example.com/hooks/{{event.referrer}}',
        method: 'POST',
        headers: {
          'X-Email-Id': '{{event.emailId}}',
        },
        body: {
          referrer: '{{event.referrer}}',
          subject: '{{event.subject}}',
        },
      },
      {},
      {referrer: 'newsletter-may', emailId: 'eml_abc123', subject: 'Welcome'},
    );

    await invokeWebhook(step, execution, stepExecution, step.config);

    expect(captured).not.toBeNull();
    expect(captured!.url).toBe('https://example.com/hooks/newsletter-may');
    const headers = captured!.options.headers as Record<string, string>;
    expect(headers['X-Email-Id']).toBe('eml_abc123');
    const body = JSON.parse(captured!.options.body as string);
    expect(body.referrer).toBe('newsletter-may');
    expect(body.subject).toBe('Welcome');
  });

  describe('saveResponseAs', () => {
    it('stores the JSON response in the execution context', async () => {
      safeFetchSpy.mockImplementation(
        async () => new Response('{"code":"WELCOME-7Q2K","validUntil":"2026-12-01"}', {status: 200}),
      );
      const {step, execution, stepExecution} = await setup(
        {url: 'https://example.com/coupon', method: 'POST', saveResponseAs: 'coupon'},
        {},
        {referrer: 'newsletter-may'},
      );

      const result = await invokeWebhook(step, execution, stepExecution, step.config);

      expect(result.savedAs).toBe('coupon');
      const stored = await prisma.workflowExecution.findUnique({where: {id: execution.id}});
      expect(stored!.context).toEqual({
        referrer: 'newsletter-may',
        coupon: {code: 'WELCOME-7Q2K', validUntil: '2026-12-01'},
      });
      expect((execution.context as Record<string, unknown>).coupon).toEqual({
        code: 'WELCOME-7Q2K',
        validUntil: '2026-12-01',
      });
    });

    it('makes the saved response available to a later webhook step', async () => {
      safeFetchSpy.mockImplementationOnce(async () => new Response('{"code":"WELCOME-7Q2K"}', {status: 200}));
      const {step, execution, stepExecution} = await setup({
        url: 'https://example.com/coupon',
        saveResponseAs: 'coupon',
      });
      await invokeWebhook(step, execution, stepExecution, step.config);

      await invokeWebhook(step, execution, stepExecution, {
        url: 'https://example.com/use/{{event.coupon.code}}',
        method: 'GET',
      });

      expect(captured!.url).toBe('https://example.com/use/WELCOME-7Q2K');
    });

    it('does not store the response of a failed request', async () => {
      safeFetchSpy.mockImplementation(async () => new Response('{"error":"nope"}', {status: 500}));
      const {step, execution, stepExecution} = await setup(
        {url: 'https://example.com/coupon', saveResponseAs: 'coupon'},
        {},
        {referrer: 'newsletter-may'},
      );

      const result = await invokeWebhook(step, execution, stepExecution, step.config);

      expect(result.savedAs).toBeNull();
      const stored = await prisma.workflowExecution.findUnique({where: {id: execution.id}});
      expect(stored!.context).toEqual({referrer: 'newsletter-may'});
    });

    it('leaves the context untouched without saveResponseAs', async () => {
      const {step, execution, stepExecution} = await setup({url: 'https://example.com/hook'}, {}, {referrer: 'x'});

      const result = await invokeWebhook(step, execution, stepExecution, step.config);

      expect(result).not.toHaveProperty('savedAs');
      const stored = await prisma.workflowExecution.findUnique({where: {id: execution.id}});
      expect(stored!.context).toEqual({referrer: 'x'});
    });

    it('rejects reserved and invalid names', async () => {
      const {step, execution, stepExecution} = await setup({url: 'https://example.com/hook'});
      await expect(
        invokeWebhook(step, execution, stepExecution, {url: 'https://example.com/hook', saveResponseAs: 'email'}),
      ).rejects.toThrow();
      await expect(
        invokeWebhook(step, execution, stepExecution, {url: 'https://example.com/hook', saveResponseAs: '1abc'}),
      ).rejects.toThrow();
    });
  });
});

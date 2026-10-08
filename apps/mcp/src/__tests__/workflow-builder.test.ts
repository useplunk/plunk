/**
 * Building workflow graphs through the MCP tools, against an in-memory fake of
 * the `/workflows` API that keeps steps and transitions like the real one.
 */

import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {PlunkMcpConfig} from '../config.js';
import {buildServer} from '../server.js';
import {normaliseBranches, reviewWorkflow} from '../tools/workflow-graph.js';

const config: PlunkMcpConfig = {
  apiKey: 'sk_test',
  apiUrl: 'https://api.example.com',
  readOnly: false,
};

async function connect() {
  const handler = createMcpHandler(() => buildServer(config));

  const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
    fetch: (url: string | URL | Request, init?: RequestInit) => handler.fetch(new Request(url, init)),
  });

  const client = new Client({name: 'test-harness', version: '1.0.0'});
  await client.connect(transport);

  return {
    client,
    async close() {
      await client.close();
      await handler.close();
    },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

interface FakeStep {
  id: string;
  type: string;
  name: string;
  config: unknown;
  templateId?: string;
}

interface FakeTransition {
  id: string;
  fromStepId: string;
  toStepId: string;
  condition: unknown;
}

interface Call {
  method: string;
  path: string;
  body?: unknown;
}

/**
 * A stateful stand-in for the workflow endpoints. Transitions follow the rules of
 * `WorkflowService.createTransition` and a plain step DELETE cascades like
 * `deleteStep`, so tests see the API's real behaviour. `fail` lets a test make
 * one route return an error.
 */
function apiError(message: string, status = 400) {
  return json({success: false, error: {code: 'BAD_REQUEST', message, statusCode: status}}, status);
}

function remove<T>(list: T[], doomed: (item: T) => boolean): void {
  for (let i = list.length - 1; i >= 0; i--) {
    if (doomed(list[i]!)) {
      list.splice(i, 1);
    }
  }
}

function fakeApi(
  options: {
    enabled?: boolean;
    executions?: Record<string, {id: string; status: string}>;
    fail?: (call: Call) => Response | undefined;
  } = {},
) {
  const executions = options.executions ?? {};
  const steps: FakeStep[] = [
    {id: 'trigger', type: 'TRIGGER', name: 'Trigger: user.signup', config: {eventName: 'user.signup'}},
  ];
  const transitions: FakeTransition[] = [];
  const calls: Call[] = [];
  let next = 1;

  const view = () => ({
    id: 'wf-1',
    name: 'Welcome',
    enabled: options.enabled ?? false,
    triggerConfig: {eventName: 'user.signup'},
    steps: steps.map((step) => ({
      ...step,
      template: step.templateId ? {id: step.templateId, name: `Template ${step.templateId}`} : null,
      outgoingTransitions: transitions.filter((t) => t.fromStepId === step.id),
      incomingTransitions: transitions.filter((t) => t.toStepId === step.id),
    })),
  });

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = new URL(String(url instanceof Request ? url.url : url));
    const request = init as RequestInit | undefined;
    const call: Call = {
      method: request?.method ?? 'GET',
      path: `${target.pathname}${target.search}`,
      body: request?.body ? JSON.parse(request.body as string) : undefined,
    };
    calls.push(call);

    const failure = options.fail?.(call);
    if (failure) {
      return failure;
    }

    const parts = target.pathname.split('/').filter(Boolean); // workflows, wf-1, ...
    const body = (call.body ?? {}) as Record<string, unknown>;

    if (call.method === 'GET' && parts.length === 2) {
      return json(view());
    }

    if (call.method === 'POST' && parts[2] === 'steps') {
      const step: FakeStep = {
        id: `s${next++}`,
        type: String(body.type),
        name: String(body.name),
        config: body.config,
        templateId: body.templateId as string | undefined,
      };
      steps.push(step);
      return json(step, 201);
    }

    if (call.method === 'PATCH' && parts[2] === 'steps') {
      const step = steps.find((s) => s.id === parts[3])!;
      if (body.name !== undefined) {
        step.name = String(body.name);
      }
      if (body.config !== undefined) {
        step.config = body.config;
      }
      if (body.templateId !== undefined) {
        step.templateId = body.templateId as string;
      }
      return json(step);
    }

    if (call.method === 'DELETE' && parts[2] === 'steps') {
      const id = parts[3]!;
      let doomed = new Set([id]);

      if (target.searchParams.get('splice') === 'true') {
        if (steps.find((step) => step.id === id)?.type === 'CONDITION') {
          return apiError('Cannot splice a condition step out of the flow.');
        }

        const child = transitions.find((t) => t.fromStepId === id);

        for (const incoming of transitions.filter((t) => t.toStepId === id)) {
          if (child) {
            incoming.toStepId = child.toStepId;
          }
        }
      } else {
        doomed = reachableFrom(id);
      }

      remove(steps, (step) => doomed.has(step.id));
      remove(transitions, (t) => doomed.has(t.fromStepId) || doomed.has(t.toStepId));
      return new Response(null, {status: 204});
    }

    if (call.method === 'POST' && parts[2] === 'transitions' && parts[4] === 'insert-step') {
      const original = transitions.find((t) => t.id === parts[3])!;
      const step: FakeStep = {
        id: `s${next++}`,
        type: String(body.type),
        name: String(body.name),
        config: body.config,
        templateId: body.templateId as string | undefined,
      };
      steps.push(step);
      const downstream = original.toStepId;
      original.toStepId = step.id;
      transitions.push({
        id: `t${next++}`,
        fromStepId: step.id,
        toStepId: downstream,
        condition: step.type === 'CONDITION' ? {branch: 'yes'} : null,
      });
      return json(step, 201);
    }

    if (call.method === 'POST' && parts[2] === 'transitions') {
      const from = steps.find((step) => step.id === body.fromStepId)!;
      const branch = (body.condition as {branch?: string} | undefined)?.branch;
      const outgoing = transitions.filter((t) => t.fromStepId === from.id);

      if (from.type === 'EXIT') {
        return apiError('An exit step ends the flow and cannot be connected to another step');
      }

      if (from.type === 'CONDITION' && branch !== undefined) {
        if (outgoing.some((t) => (t.condition as {branch?: string} | null)?.branch === branch)) {
          return apiError(`A transition for the "${branch}" branch already exists from this step`);
        }
      } else if (from.type !== 'CONDITION' && outgoing.length > 0) {
        return apiError(`"${from.name}" already leads to another step.`);
      }

      if (reachableFrom(String(body.toStepId)).has(from.id)) {
        return apiError('This connection would create a loop in the workflow');
      }

      const transition: FakeTransition = {
        id: `t${next++}`,
        fromStepId: from.id,
        toStepId: String(body.toStepId),
        condition: body.condition ?? null,
      };
      transitions.push(transition);
      return json(transition, 201);
    }

    if (call.method === 'DELETE' && parts[2] === 'transitions') {
      transitions.splice(
        transitions.findIndex((t) => t.id === parts[3]),
        1,
      );
      return new Response(null, {status: 204});
    }

    if (call.method === 'PATCH' && parts.length === 2) {
      return json({...view(), ...body});
    }

    if (parts[2] === 'executions' && parts[3]) {
      const execution = executions[parts[3]];

      if (call.method === 'DELETE') {
        return json({...execution, status: 'CANCELLED'});
      }

      return json(execution);
    }

    throw new Error(`fake API has no route for ${call.method} ${call.path}`);
  });

  function reachableFrom(stepId: string): Set<string> {
    const seen = new Set([stepId]);
    const queue = [stepId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const t of transitions.filter((candidate) => candidate.fromStepId === current)) {
        if (!seen.has(t.toStepId)) {
          seen.add(t.toStepId);
          queue.push(t.toStepId);
        }
      }
    }

    return seen;
  }

  return {
    calls,
    writes: () => calls.filter((c) => c.method !== 'GET'),
    view,
    stepNamed: (name: string) => steps.find((s) => s.name === name)!,
    edges: () =>
      transitions.map((t) => {
        const from = steps.find((s) => s.id === t.fromStepId)!.name;
        const to = steps.find((s) => s.id === t.toStepId)!.name;
        const branch = (t.condition as {branch?: string} | null)?.branch;
        return `${from}${branch ? ` [${branch}]` : ''} -> ${to}`;
      }),
  };
}

/**
 * A tools/call from a client that supports elicitation, returning the raw
 * response so a test can see the confirmation request the server sends back.
 */
async function rawToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  const handler = createMcpHandler(() => buildServer(config));

  const response = await handler.fetch(
    new Request('http://test.local/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2026-07-28',
        'Mcp-Method': 'tools/call',
        'Mcp-Name': name,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name,
          arguments: args,
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {elicitation: {}},
          },
        },
      }),
    }),
  );

  const text = await response.text();
  await handler.close();
  return text;
}

async function call(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({name, arguments: args});
  return {...result, text: JSON.stringify(result.content)};
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PLUNK_ALLOW_UNCONFIRMED_SENDS;
});

describe('plunk_add_workflow_step', () => {
  it('appends after the open end and connects explicitly instead of via autoConnect', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'SEND_EMAIL',
      templateId: 'tpl-1',
    });

    expect(result.isError).toBeFalsy();
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/workflows/wf-1/steps',
        body: {
          type: 'SEND_EMAIL',
          name: 'Send email',
          config: {templateId: 'tpl-1'},
          templateId: 'tpl-1',
          position: {x: 0, y: 0},
          autoConnect: false,
        },
      },
      {method: 'POST', path: '/workflows/wf-1/transitions', body: {fromStepId: 'trigger', toStepId: 's1'}},
    ]);

    await close();
  });

  it('adds an unconnected step when autoConnect is false', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'DELAY',
      amount: 2,
      unit: 'days',
      autoConnect: false,
    });

    expect(api.writes()).toHaveLength(1);
    expect(api.writes()[0]?.body).toMatchObject({type: 'DELAY', name: 'Wait 2 days', autoConnect: false});
    expect(api.edges()).toEqual([]);

    await close();
  });

  it('requires a branch to continue after a condition, and wires it when given', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    const condition = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'CONDITION',
      name: 'Has plan?',
      field: 'data.plan',
      operator: 'exists',
    });
    expect(condition.text).toContain('branch=\\"yes\\" / \\"no\\"');

    const ambiguous = await call(client, 'plunk_add_workflow_step', {workflowId: 'wf-1', type: 'EXIT'});
    expect(ambiguous.isError).toBe(true);
    expect(ambiguous.text).toContain('needs a branch');

    const wired = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'EXIT',
      name: 'No plan',
      after: api.stepNamed('Has plan?').id,
      branch: 'no',
    });

    expect(wired.isError).toBeFalsy();
    expect(api.edges()).toEqual(['Trigger: user.signup -> Has plan?', 'Has plan? [no] -> No plan']);

    await close();
  });

  it('rejects a branch the condition does not have', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'CONDITION',
      name: 'Check',
      field: 'contact.subscribed',
      operator: 'equals',
      value: true,
    });
    const writes = api.writes().length;

    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'DELAY',
      amount: 1,
      unit: 'days',
      after: api.stepNamed('Check').id,
      branch: 'maybe',
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('has no branch \\"maybe\\"');
    expect(api.writes()).toHaveLength(writes);

    await close();
  });

  it('inserts between two steps when the position is already taken', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'SEND_EMAIL',
      name: 'Welcome',
      templateId: 'tpl-1',
    });
    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'DELAY',
      name: 'Wait',
      amount: 1,
      unit: 'hours',
      after: 'trigger',
    });

    expect(result.isError).toBeFalsy();
    expect(api.writes().at(-1)?.path).toMatch(/^\/workflows\/wf-1\/transitions\/t\d+\/insert-step$/);
    expect(api.edges()).toEqual(['Trigger: user.signup -> Wait', 'Wait -> Welcome']);

    await close();
  });

  it('keeps the downstream path on the default branch when inserting a multi-branch condition', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'SEND_EMAIL',
      name: 'Welcome',
      templateId: 'tpl-1',
    });
    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'CONDITION',
      name: 'Locale',
      field: 'data.locale',
      branches: [
        {name: 'Português', operator: 'equals', value: 'pt'},
        {name: 'Español', operator: 'equals', value: 'es'},
      ],
      after: 'trigger',
    });

    expect(result.isError).toBeFalsy();
    expect(api.stepNamed('Locale').config).toMatchObject({
      mode: 'multi',
      branches: [{id: 'portugues'}, {id: 'espanol'}],
    });
    expect(api.edges()).toEqual(['Trigger: user.signup -> Locale', 'Locale [default] -> Welcome']);

    await close();
  });

  it('refuses to put an EXIT step in front of existing steps', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {workflowId: 'wf-1', type: 'SEND_EMAIL', templateId: 'tpl-1'});
    const writes = api.writes().length;

    const result = await call(client, 'plunk_add_workflow_step', {workflowId: 'wf-1', type: 'EXIT', after: 'trigger'});

    expect(result.isError).toBe(true);
    expect(api.writes()).toHaveLength(writes);

    await close();
  });

  it('removes the new step again when connecting it fails', async () => {
    const api = fakeApi({
      fail: (c) =>
        c.method === 'POST' && c.path === '/workflows/wf-1/transitions'
          ? json({success: false, error: {code: 'BAD_REQUEST', message: 'This connection would create a loop'}}, 400)
          : undefined,
    });
    const {client, close} = await connect();

    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'DELAY',
      amount: 1,
      unit: 'days',
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('loop');
    expect(api.writes().map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /workflows/wf-1/steps',
      'POST /workflows/wf-1/transitions',
      'DELETE /workflows/wf-1/steps/s1',
    ]);

    await close();
  });

  it('rejects a condition field the executor cannot resolve, before calling the API', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'CONDITION',
      field: 'plan',
      operator: 'equals',
      value: 'pro',
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('never resolves');
    expect(api.calls).toHaveLength(0);

    await close();
  });

  it('requires a value for comparison operators, as the dashboard does', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'CONDITION',
      field: 'data.plan',
      operator: 'equals',
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('A value is required');
    expect(api.calls).toHaveLength(0);

    await close();
  });

  it('will not rewire a live workflow to insert a multi-branch condition', async () => {
    const api = fakeApi({enabled: true});
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {workflowId: 'wf-1', type: 'DELAY', amount: 1, unit: 'days'});
    const writes = api.writes().length;

    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'CONDITION',
      field: 'data.locale',
      branches: [{name: 'pt', operator: 'equals', value: 'pt'}],
      after: 'trigger',
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('Disable the workflow first');
    expect(api.writes()).toHaveLength(writes);

    await close();
  });

  it('rejects arguments that belong to another step type', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    const result = await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'DELAY',
      amount: 1,
      unit: 'days',
      templateId: 'tpl-1',
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('does not apply to a DELAY step');
    expect(api.calls).toHaveLength(0);

    await close();
  });
});

describe('plunk_add_workflow_steps', () => {
  it('builds a branching sequence in one call', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    const result = await call(client, 'plunk_add_workflow_steps', {
      workflowId: 'wf-1',
      steps: [
        {key: 'check', type: 'CONDITION', name: 'First time?', field: 'data.sb_nurture', operator: 'notExists'},
        {type: 'UPDATE_CONTACT', name: 'Mark started', branch: 'yes', updates: {sb_nurture: 'started'}},
        {type: 'DELAY', name: 'Wait 1 day', amount: 1, unit: 'days'},
        {type: 'SEND_EMAIL', name: 'Day 1', templateId: 'tpl-d01'},
        {type: 'WEBHOOK', name: 'Notify', url: 'https://hooks.example.com/{{email}}'},
        {type: 'EXIT', name: 'Already in', after: 'check', branch: 'no', reason: 'already_nurtured'},
      ],
    });

    expect(result.isError).toBeFalsy();
    expect(api.edges()).toEqual([
      'Trigger: user.signup -> First time?',
      'First time? [yes] -> Mark started',
      'Mark started -> Wait 1 day',
      'Wait 1 day -> Day 1',
      'Day 1 -> Notify',
      'First time? [no] -> Already in',
    ]);
    expect(api.stepNamed('Notify').config).toEqual({url: 'https://hooks.example.com/{{email}}', method: 'POST'});
    expect(reviewWorkflow(api.view()).issues).toEqual([]);

    await close();
  });

  it('stops at the first failing item and reports what was kept', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    const result = await call(client, 'plunk_add_workflow_steps', {
      workflowId: 'wf-1',
      steps: [
        {key: 'wait', type: 'DELAY', amount: 1, unit: 'days'},
        {type: 'CONDITION', name: 'Check', field: 'data.plan', operator: 'exists'},
        {type: 'SEND_EMAIL', templateId: 'tpl-1'},
        {type: 'DELAY', amount: 2, unit: 'days'},
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('Item 3');
    expect(result.text).toContain('wait (s1)');
    expect(api.view().steps).toHaveLength(3);

    await close();
  });
});

describe('editing the graph', () => {
  async function linear() {
    const api = fakeApi();
    const session = await connect();
    await call(session.client, 'plunk_add_workflow_steps', {
      workflowId: 'wf-1',
      steps: [
        {type: 'SEND_EMAIL', name: 'Welcome', templateId: 'tpl-1'},
        {type: 'DELAY', name: 'Wait', amount: 2, unit: 'days'},
        {type: 'SEND_EMAIL', name: 'Follow-up', templateId: 'tpl-2'},
      ],
    });
    return {api, ...session};
  }

  it('updates only the settings passed', async () => {
    const {api, client, close} = await linear();

    const result = await call(client, 'plunk_update_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Wait').id,
      amount: 3,
    });

    expect(result.isError).toBeFalsy();
    expect(api.stepNamed('Wait').config).toEqual({amount: 3, unit: 'days'});

    await close();
  });

  it('keeps a generated step name in step with its settings', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {workflowId: 'wf-1', type: 'DELAY', amount: 1, unit: 'days'});
    expect(api.stepNamed('Wait 1 day')).toBeDefined();

    await call(client, 'plunk_update_workflow_step', {workflowId: 'wf-1', stepId: 's1', amount: 3});

    expect(api.stepNamed('Wait 3 days').config).toEqual({amount: 3, unit: 'days'});

    await close();
  });

  it('does not silently ignore a value given to a multi-branch condition', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {
      workflowId: 'wf-1',
      type: 'CONDITION',
      name: 'Plan',
      field: 'data.plan',
      branches: [{name: 'Pro', operator: 'equals', value: 'pro'}],
    });

    const result = await call(client, 'plunk_update_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Plan').id,
      value: 'team',
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('multi-branch');

    await close();
  });

  it('swaps the template on the step relation and in its config', async () => {
    const {api, client, close} = await linear();

    await call(client, 'plunk_update_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Welcome').id,
      templateId: 'tpl-9',
    });

    expect(api.writes().at(-1)?.body).toEqual({config: {templateId: 'tpl-9'}, templateId: 'tpl-9'});

    await close();
  });

  it('will not drop a condition branch that still leads somewhere', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_steps', {
      workflowId: 'wf-1',
      steps: [
        {key: 'c', type: 'CONDITION', name: 'Check', field: 'data.plan', operator: 'exists'},
        {type: 'EXIT', branch: 'no'},
      ],
    });

    const result = await call(client, 'plunk_update_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Check').id,
      branches: [{name: 'Pro', operator: 'equals', value: 'pro'}],
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('\\"no\\"');

    await close();
  });

  it('reconnects around a deleted step', async () => {
    const {api, client, close} = await linear();

    const result = await call(client, 'plunk_delete_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Wait').id,
    });

    expect(result.isError).toBeFalsy();
    expect(api.writes().at(-1)?.path).toContain('?splice=true');
    expect(api.edges()).toEqual(['Trigger: user.signup -> Welcome', 'Welcome -> Follow-up']);

    await close();
  });

  async function conditionWithBranch() {
    const api = fakeApi();
    const session = await connect();
    await call(session.client, 'plunk_add_workflow_steps', {
      workflowId: 'wf-1',
      steps: [
        {type: 'CONDITION', name: 'Check', field: 'data.plan', operator: 'exists'},
        {type: 'SEND_EMAIL', name: 'Pro mail', branch: 'yes', templateId: 'tpl-1'},
        {type: 'DELAY', name: 'Then wait', amount: 1, unit: 'days'},
      ],
    });
    return {api, ...session};
  }

  it('asks what to do with the steps below a condition before deleting it', async () => {
    const {api, client, close} = await conditionWithBranch();
    const writes = api.writes().length;

    const result = await call(client, 'plunk_delete_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Check').id,
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('downstream=');
    expect(api.writes()).toHaveLength(writes);

    await close();
  });

  it('detaches a condition without deleting the steps below it', async () => {
    const {api, client, close} = await conditionWithBranch();

    const result = await call(client, 'plunk_delete_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Check').id,
      downstream: 'detach',
    });

    expect(result.isError).toBeFalsy();
    expect(api.view().steps.map((step) => step.name)).toEqual(['Trigger: user.signup', 'Pro mail', 'Then wait']);
    expect(api.edges()).toEqual(['Pro mail -> Then wait']);
    expect(result.text).toContain('\\"Pro mail\\" is not connected');

    await close();
  });

  it('deletes everything below a step only when asked, and says what went', async () => {
    const {api, client, close} = await conditionWithBranch();

    const result = await call(client, 'plunk_delete_workflow_step', {
      workflowId: 'wf-1',
      stepId: api.stepNamed('Check').id,
      downstream: 'delete',
    });

    expect(result.isError).toBeFalsy();
    expect(result.text).toContain('Deleted \\"Check\\", \\"Pro mail\\", \\"Then wait\\"');
    expect(api.view().steps.map((step) => step.name)).toEqual(['Trigger: user.signup']);

    await close();
  });

  it('refuses to connect a step that already leads somewhere', async () => {
    const {api, client, close} = await linear();

    const result = await call(client, 'plunk_connect_workflow_steps', {
      workflowId: 'wf-1',
      fromStepId: api.stepNamed('Welcome').id,
      toStepId: api.stepNamed('Follow-up').id,
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('already leads to');

    await close();
  });

  it('disconnects one branch of a condition', async () => {
    const api = fakeApi();
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_steps', {
      workflowId: 'wf-1',
      steps: [
        {key: 'c', type: 'CONDITION', name: 'Check', field: 'data.plan', operator: 'exists'},
        {type: 'EXIT', name: 'Yes exit', branch: 'yes'},
        {type: 'EXIT', name: 'No exit', after: 'c', branch: 'no'},
      ],
    });

    const result = await call(client, 'plunk_disconnect_workflow_steps', {
      workflowId: 'wf-1',
      fromStepId: api.stepNamed('Check').id,
      branch: 'no',
    });

    expect(result.isError).toBeFalsy();
    expect(api.edges()).toEqual(['Trigger: user.signup -> Check', 'Check [yes] -> Yes exit']);

    await close();
  });
});

describe('workflow lifecycle', () => {
  it('will not delete an enabled workflow', async () => {
    const api = fakeApi({enabled: true});
    const {client, close} = await connect();

    const result = await call(client, 'plunk_delete_workflow', {id: 'wf-1'});

    expect(result.isError).toBe(true);
    expect(api.writes()).toHaveLength(0);

    await close();
  });

  it('asks before retargeting an enabled workflow that sends email', async () => {
    const api = fakeApi({enabled: true});
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {workflowId: 'wf-1', type: 'SEND_EMAIL', templateId: 'tpl-1'});

    const prompt = await rawToolCall('plunk_update_workflow', {id: 'wf-1', eventName: 'user.upgraded'});

    expect(prompt).toContain('confirm_workflow_update');
    expect(prompt).toContain('user.upgraded');
    expect(api.calls.filter((c) => c.method === 'PATCH' && c.path === '/workflows/wf-1')).toHaveLength(0);

    await close();
  });

  it('renames an enabled workflow without asking', async () => {
    const api = fakeApi({enabled: true});
    const {client, close} = await connect();

    await call(client, 'plunk_add_workflow_step', {workflowId: 'wf-1', type: 'SEND_EMAIL', templateId: 'tpl-1'});
    const result = await call(client, 'plunk_update_workflow', {id: 'wf-1', name: 'Welcome v2'});

    expect(result.isError).toBeFalsy();
    expect(api.writes().at(-1)).toEqual({method: 'PATCH', path: '/workflows/wf-1', body: {name: 'Welcome v2'}});

    await close();
  });

  it('only cancels executions that are still running or waiting', async () => {
    const api = fakeApi({
      executions: {done: {id: 'done', status: 'COMPLETED'}, live: {id: 'live', status: 'WAITING'}},
    });
    const {client, close} = await connect();

    const finished = await call(client, 'plunk_cancel_workflow_executions', {id: 'wf-1', executionId: 'done'});
    const waiting = await call(client, 'plunk_cancel_workflow_executions', {id: 'wf-1', executionId: 'live'});

    expect(finished.isError).toBe(true);
    expect(finished.text).toContain('COMPLETED');
    expect(waiting.isError).toBeFalsy();
    expect(api.writes().map((c) => `${c.method} ${c.path}`)).toEqual(['DELETE /workflows/wf-1/executions/live']);

    await close();
  });

  it('asks before starting a workflow that sends email for a contact', async () => {
    const paths: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = new URL(String(url)).pathname;
      paths.push(`${(init as RequestInit | undefined)?.method ?? 'GET'} ${path}`);
      if (path === '/contacts') {
        return json({data: [{id: 'c-1', email: 'me@example.com'}], hasMore: false});
      }
      if (path === '/workflows/wf-1') {
        return json({
          id: 'wf-1',
          name: 'Welcome',
          enabled: true,
          steps: [{id: 'e', type: 'SEND_EMAIL', config: {templateId: 't'}}],
        });
      }
      throw new Error(`unexpected ${path}`);
    });

    const prompt = await rawToolCall('plunk_start_workflow_execution', {id: 'wf-1', email: 'me@example.com'});

    expect(prompt).toContain('confirm_workflow_start');
    expect(prompt).toContain('me@example.com');
    expect(paths).toEqual(['GET /contacts', 'GET /workflows/wf-1']);
  });

  it('starts without asking when confirmation is waived', async () => {
    process.env.PLUNK_ALLOW_UNCONFIRMED_SENDS = 'true';
    const bodies: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === '/workflows/wf-1') {
        return json({
          id: 'wf-1',
          name: 'Welcome',
          enabled: true,
          steps: [{id: 'e', type: 'SEND_EMAIL', config: {templateId: 't'}}],
        });
      }
      if (path === '/workflows/wf-1/executions') {
        bodies.push(JSON.parse(String((init as RequestInit).body)));
        return json({id: 'ex-1', status: 'RUNNING'}, 201);
      }
      throw new Error(`unexpected ${path}`);
    });
    const {client, close} = await connect();

    const result = await call(client, 'plunk_start_workflow_execution', {
      id: 'wf-1',
      contactId: 'c-1',
      context: {plan: 'pro'},
    });

    expect(result.isError).toBeFalsy();
    expect(bodies).toEqual([{contactId: 'c-1', context: {plan: 'pro'}}]);

    await close();
  });

  it('checks a workflow and reports branches that no longer exist', () => {
    const review = reviewWorkflow({
      id: 'wf-1',
      steps: [
        {
          id: 'trigger',
          type: 'TRIGGER',
          config: {eventName: 'x'},
          outgoingTransitions: [{id: 't1', fromStepId: 'trigger', toStepId: 'c'}],
        },
        {
          id: 'c',
          type: 'CONDITION',
          name: 'Plan',
          config: {
            mode: 'multi',
            field: 'data.plan',
            branches: [{id: 'pro', name: 'Pro', operator: 'equals', value: 'pro'}],
          },
          outgoingTransitions: [{id: 't2', fromStepId: 'c', toStepId: 'e', condition: {branch: 'yes'}}],
        },
        {id: 'e', type: 'EXIT', config: {}, outgoingTransitions: []},
        {id: 'lost', type: 'DELAY', name: 'Lost', config: {amount: 1, unit: 'days'}, outgoingTransitions: []},
      ],
    });

    expect(review.outline.split('\n')[1]).toContain('pro (Pro) → end, default → end');
    expect(review.issues.map((issue) => `${issue.severity}:${issue.code}`)).toEqual([
      'warning:unreachable',
      'error:bad_connection',
    ]);
    expect(review.issues[0]?.message).toContain('"Lost" is not connected');
    expect(review.issues[1]?.message).toContain('branch "yes"');
  });

  it('gives generated branch ids readable, unique slugs', () => {
    const result = normaliseBranches([
      {name: 'Default', operator: 'exists'},
      {name: 'São Paulo', operator: 'equals', value: 'sp'},
      {name: 'São Paulo', operator: 'equals', value: 'SP'},
      {id: 'custom', name: 'X', operator: 'notExists'},
    ]);

    expect('branches' in result && result.branches.map((branch) => branch.id)).toEqual([
      'default-2',
      'sao-paulo',
      'sao-paulo-2',
      'custom',
    ]);
  });

  it('rejects branch ids that would collide with the no-match path or each other', () => {
    expect(normaliseBranches([{id: 'default', name: 'A', operator: 'exists'}])).toMatchObject({
      error: expect.stringContaining('reserved'),
    });
    expect(
      normaliseBranches([
        {id: 'a', name: 'A', operator: 'exists'},
        {id: 'a', name: 'B', operator: 'exists'},
      ]),
    ).toMatchObject({error: expect.stringContaining('used twice')});
  });
});

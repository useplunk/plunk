/**
 * Workflow tools, driven through a real MCP client against the real server
 * with only the Plunk API mocked.
 */

import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {PlunkMcpConfig} from '../config.js';
import {buildServer} from '../server.js';

const config: PlunkMcpConfig = {
  apiKey: 'sk_test',
  apiUrl: 'https://api.example.com',
  readOnly: false,
};

const READ_TOOLS = ['plunk_list_workflows', 'plunk_get_workflow', 'plunk_list_workflow_executions'];
const WRITE_TOOLS = ['plunk_create_workflow', 'plunk_add_workflow_step', 'plunk_set_workflow_enabled'];

async function connect(cfg: PlunkMcpConfig = config) {
  const handler = createMcpHandler(() => buildServer(cfg));

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

interface Call {
  url: string;
  method: string;
  body?: unknown;
}

/** Records every Plunk call; `respond` decides what each one returns. */
function mockApi(respond: (call: Call) => Response) {
  const calls: Call[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = String(url instanceof Request ? url.url : url);

    if (!target.startsWith('https://api.example.com')) {
      throw new Error(`unexpected fetch to ${target}`);
    }

    const request = init as RequestInit | undefined;
    const call: Call = {
      url: target,
      method: request?.method ?? 'GET',
      body: request?.body ? JSON.parse(request.body as string) : undefined,
    };

    calls.push(call);
    return respond(call);
  });

  return calls;
}

const workflowWithEmail = {
  id: 'wf-1',
  name: 'Welcome',
  enabled: false,
  triggerConfig: {eventName: 'user.signup'},
  steps: [
    {id: 'step-trigger', type: 'TRIGGER', name: 'Trigger: user.signup'},
    {id: 'step-email', type: 'SEND_EMAIL', name: 'Send email'},
    {id: 'step-delay', type: 'DELAY', name: 'Wait 2 days'},
    {id: 'step-email-2', type: 'SEND_EMAIL', name: 'Send email'},
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PLUNK_ALLOW_UNCONFIRMED_SENDS;
});

describe('workflow tool registration', () => {
  it('registers all workflow tools by default', async () => {
    const {client, close} = await connect();

    const names = (await client.listTools()).tools.map((t) => t.name);

    for (const name of [...READ_TOOLS, ...WRITE_TOOLS]) {
      expect(names).toContain(name);
    }

    await close();
  });

  it('registers only the read tools in read-only mode', async () => {
    const {client, close} = await connect({...config, readOnly: true});

    const names = (await client.listTools()).tools.map((t) => t.name);

    for (const name of READ_TOOLS) {
      expect(names).toContain(name);
    }

    for (const name of WRITE_TOOLS) {
      expect(names).not.toContain(name);
    }

    await close();
  });
});

describe('workflow reads', () => {
  it('lists workflows with page-based pagination', async () => {
    const calls = mockApi(() => json({data: [{id: 'wf-1'}], total: 45, page: 2, pageSize: 20, totalPages: 3}));
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_list_workflows',
      arguments: {status: 'active', page: 2},
    });

    expect(result.isError).toBeFalsy();
    expect(calls[0]?.url).toBe('https://api.example.com/workflows?status=active&page=2&pageSize=20');
    expect(JSON.stringify(result.content)).toContain('page=3');

    await close();
  });

  it('lists executions for one workflow', async () => {
    const calls = mockApi(() => json({executions: [], total: 0, page: 1, pageSize: 20, totalPages: 0}));
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_list_workflow_executions',
      arguments: {id: 'wf-1', status: 'FAILED'},
    });

    expect(result.isError).toBeFalsy();
    expect(calls[0]?.url).toBe('https://api.example.com/workflows/wf-1/executions?status=FAILED&page=1&pageSize=20');

    await close();
  });

  it('turns a missing workflow into a readable tool error', async () => {
    mockApi(() => json({error: {code: 'NOT_FOUND', message: 'Workflow not found'}}, 404));
    const {client, close} = await connect();

    const result = await client.callTool({name: 'plunk_get_workflow', arguments: {id: 'missing'}});

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('Workflow not found');

    await close();
  });
});

describe('plunk_create_workflow', () => {
  it('creates the workflow disabled and returns its trigger step', async () => {
    const calls = mockApi((call) =>
      call.method === 'POST'
        ? json({id: 'wf-1', name: 'Welcome', enabled: false}, 201)
        : json({...workflowWithEmail, steps: [workflowWithEmail.steps[0]]}),
    );
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_create_workflow',
      arguments: {name: 'Welcome', eventName: 'user.signup'},
    });

    expect(result.isError).toBeFalsy();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST https://api.example.com/workflows',
      'GET https://api.example.com/workflows/wf-1',
    ]);
    expect(calls[0]?.body).toEqual({name: 'Welcome', eventName: 'user.signup', enabled: false});
    expect(result.structuredContent).toMatchObject({triggerStep: {id: 'step-trigger', type: 'TRIGGER'}});

    await close();
  });

  it('does not accept an enabled flag that would skip the enable confirmation', async () => {
    const {client, close} = await connect();

    const tool = (await client.listTools()).tools.find((t) => t.name === 'plunk_create_workflow');
    const properties = (tool?.inputSchema as {properties?: Record<string, unknown>})?.properties ?? {};

    expect(Object.keys(properties)).not.toContain('enabled');

    await close();
  });
});

describe('plunk_add_workflow_step', () => {
  it('adds a SEND_EMAIL step with the template on the step and in its config', async () => {
    const calls = mockApi(() => json({id: 'step-new', type: 'SEND_EMAIL'}, 201));
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_add_workflow_step',
      arguments: {workflowId: 'wf-1', type: 'SEND_EMAIL', templateId: 'tpl-1'},
    });

    expect(result.isError).toBeFalsy();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe('https://api.example.com/workflows/wf-1/steps');
    expect(calls[0]?.body).toEqual({
      type: 'SEND_EMAIL',
      name: 'Send email',
      position: {x: 0, y: 0},
      config: {templateId: 'tpl-1'},
      templateId: 'tpl-1',
      autoConnect: true,
    });

    await close();
  });

  it('adds a DELAY step and passes autoConnect through', async () => {
    const calls = mockApi(() => json({id: 'step-new', type: 'DELAY'}, 201));
    const {client, close} = await connect();

    await client.callTool({
      name: 'plunk_add_workflow_step',
      arguments: {workflowId: 'wf-1', type: 'DELAY', amount: 2, unit: 'days', autoConnect: false},
    });

    expect(calls[0]?.body).toEqual({
      type: 'DELAY',
      name: 'Wait 2 days',
      position: {x: 0, y: 0},
      config: {amount: 2, unit: 'days'},
      autoConnect: false,
    });

    await close();
  });

  it('rejects a SEND_EMAIL step without a template before calling the API', async () => {
    const calls = mockApi(() => json({}));
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_add_workflow_step',
      arguments: {workflowId: 'wf-1', type: 'SEND_EMAIL'},
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('plunk_list_templates');
    expect(calls).toHaveLength(0);

    await close();
  });

  it('rejects a delay longer than the API allows before calling the API', async () => {
    const calls = mockApi(() => json({}));
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_add_workflow_step',
      arguments: {workflowId: 'wf-1', type: 'DELAY', amount: 400, unit: 'days'},
    });

    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);

    await close();
  });

  it('surfaces an API rejection as a tool error', async () => {
    mockApi(() => json({error: {code: 'NOT_FOUND', message: 'Template not found'}}, 404));
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_add_workflow_step',
      arguments: {workflowId: 'wf-1', type: 'SEND_EMAIL', templateId: 'missing'},
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('Template not found');

    await close();
  });
});

describe('plunk_set_workflow_enabled', () => {
  it('disables without reading the workflow or asking for confirmation', async () => {
    const calls = mockApi(() => json({id: 'wf-1', enabled: false}));
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_set_workflow_enabled',
      arguments: {id: 'wf-1', enabled: false},
    });

    expect(result.isError).toBeFalsy();
    expect(calls).toEqual([{url: 'https://api.example.com/workflows/wf-1', method: 'PATCH', body: {enabled: false}}]);

    await close();
  });

  it('does not enable a workflow with email steps before confirmation', async () => {
    const calls = mockApi(() => json(workflowWithEmail));
    const {client, close} = await connect();

    await client
      .callTool({name: 'plunk_set_workflow_enabled', arguments: {id: 'wf-1', enabled: true}})
      .catch(() => undefined);

    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);

    await close();
  });

  it('names the trigger event and email count in the confirmation prompt', async () => {
    mockApi(() => json(workflowWithEmail));
    const handler = createMcpHandler(() => buildServer(config));

    const response = await handler.fetch(
      new Request('http://test.local/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/call',
          'Mcp-Name': 'plunk_set_workflow_enabled',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'plunk_set_workflow_enabled',
            arguments: {id: 'wf-1', enabled: true},
            _meta: {
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
              'io.modelcontextprotocol/clientCapabilities': {elicitation: {}},
            },
          },
        }),
      }),
    );

    const text = await response.text();

    expect(text).toContain('confirm_workflow_enable');
    expect(text).toContain('user.signup');
    expect(text).toContain('up to 2 email(s)');

    await handler.close();
  });

  it('enables after confirmation is waived by the documented escape hatch', async () => {
    process.env.PLUNK_ALLOW_UNCONFIRMED_SENDS = 'true';

    const calls = mockApi((call) =>
      call.method === 'PATCH' ? json({id: 'wf-1', enabled: true}) : json(workflowWithEmail),
    );
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_set_workflow_enabled',
      arguments: {id: 'wf-1', enabled: true},
    });

    expect(result.isError).toBeFalsy();
    expect(calls.filter((c) => c.method === 'PATCH')).toEqual([
      {url: 'https://api.example.com/workflows/wf-1', method: 'PATCH', body: {enabled: true}},
    ]);

    await close();
  });

  it('enables a workflow with no email steps without prompting', async () => {
    const calls = mockApi((call) =>
      call.method === 'PATCH'
        ? json({id: 'wf-1', enabled: true})
        : json({...workflowWithEmail, steps: [workflowWithEmail.steps[0]]}),
    );
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_set_workflow_enabled',
      arguments: {id: 'wf-1', enabled: true},
    });

    expect(result.isError).toBeFalsy();
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1);

    await close();
  });
});

/**
 * Multi-project mode: one server, several projects, a required `project`
 * argument on every tool. The failure that matters here is acting on the wrong
 * project, so these assert which key each request actually carried.
 */

import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {PlunkMcpConfig} from '../config.js';
import {buildServer} from '../server.js';

const multiConfig: PlunkMcpConfig = {
  apiUrl: 'https://api.example.com',
  readOnly: false,
  projects: {
    acme: {apiKey: 'sk_acme'},
    beta: {apiKey: 'sk_beta', publicKey: 'pk_beta'},
  },
};

async function connect(config: PlunkMcpConfig = multiConfig) {
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

interface RecordedCall {
  url: string;
  method: string;
  key: string | undefined;
  body: unknown;
}

function mockApi(respond: (url: string) => Response = () => json({data: [], cursor: null, hasMore: false, total: 0})) {
  const calls: RecordedCall[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = String(url instanceof Request ? url.url : url);

    if (!target.startsWith('https://api.example.com')) {
      throw new Error(`unexpected fetch to ${target}`);
    }

    const request = init as RequestInit | undefined;
    const auth = (request?.headers as Record<string, string> | undefined)?.Authorization;

    calls.push({
      url: target,
      method: request?.method ?? 'GET',
      key: auth?.replace('Bearer ', ''),
      body: request?.body ? JSON.parse(String(request.body)) : undefined,
    });

    return respond(target);
  });

  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tool schemas', () => {
  it('adds a required project argument naming the configured projects to every tool', async () => {
    const {client, close} = await connect();

    const {tools} = await client.listTools();

    expect(tools).toHaveLength(42);

    for (const tool of tools) {
      const schema = tool.inputSchema as {properties?: Record<string, {enum?: string[]}>; required?: string[]};

      expect(schema.properties?.project?.enum, tool.name).toEqual(['acme', 'beta']);
      expect(schema.required, tool.name).toContain('project');
    }

    await close();
  });

  it('leaves the schemas untouched with a single project', async () => {
    const {client, close} = await connect({apiUrl: 'https://api.example.com', readOnly: false, apiKey: 'sk_only'});

    const {tools} = await client.listTools();

    for (const tool of tools) {
      const properties = (tool.inputSchema as {properties?: Record<string, unknown>}).properties ?? {};
      expect(Object.keys(properties), tool.name).not.toContain('project');
    }

    await close();
  });

  it('treats a single named project as single-project mode', async () => {
    const calls = mockApi();
    const {client, close} = await connect({
      apiUrl: 'https://api.example.com',
      readOnly: false,
      projects: {acme: {apiKey: 'sk_acme'}},
    });

    const {tools} = await client.listTools();
    const listCampaigns = tools.find((t) => t.name === 'plunk_list_campaigns');
    const properties = (listCampaigns?.inputSchema as {properties?: Record<string, unknown>}).properties ?? {};

    expect(Object.keys(properties)).not.toContain('project');

    await client.callTool({name: 'plunk_list_campaigns', arguments: {}});
    expect(calls[0]?.key).toBe('sk_acme');

    await close();
  });

  it('tells the agent which projects exist and to ask when unsure', async () => {
    const {client, close} = await connect();

    const instructions = client.getInstructions() ?? '';

    expect(instructions).toContain('`acme`, `beta`');
    expect(instructions).toMatch(/ask/i);

    await close();
  });
});

describe('routing', () => {
  it("sends each call with the chosen project's key", async () => {
    const calls = mockApi();
    const {client, close} = await connect();

    await client.callTool({name: 'plunk_list_campaigns', arguments: {project: 'beta'}});
    await client.callTool({name: 'plunk_list_campaigns', arguments: {project: 'acme'}});

    expect(calls.map((c) => c.key)).toEqual(['sk_beta', 'sk_acme']);

    await close();
  });

  it('keeps project selection independent across concurrent calls', async () => {
    const calls = mockApi();
    const {client, close} = await connect();

    await Promise.all([
      client.callTool({name: 'plunk_list_campaigns', arguments: {project: 'acme', search: 'a'}}),
      client.callTool({name: 'plunk_list_campaigns', arguments: {project: 'beta', search: 'b'}}),
      client.callTool({name: 'plunk_list_campaigns', arguments: {project: 'acme', search: 'c'}}),
    ]);

    for (const call of calls) {
      const search = new URL(call.url).searchParams.get('search');
      expect(call.key).toBe(search === 'b' ? 'sk_beta' : 'sk_acme');
    }

    await close();
  });

  it('does not forward the project argument to the API', async () => {
    // plunk_create_segment posts its whole input as the request body.
    const calls = mockApi(() => json({id: 'seg-1'}));
    const {client, close} = await connect();

    await client.callTool({
      name: 'plunk_create_segment',
      arguments: {project: 'acme', name: 'VIPs', type: 'STATIC'},
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).not.toHaveProperty('project');

    await close();
  });

  it('routes tools that take no other arguments', async () => {
    const calls = mockApi(() => json([{id: 'd-1', domain: 'example.com', verified: true}]));
    const {client, close} = await connect();

    const result = await client.callTool({name: 'plunk_list_domains', arguments: {project: 'beta'}});

    expect(result.isError).toBeFalsy();
    expect(calls[0]?.key).toBe('sk_beta');

    await close();
  });

  it("uses the chosen project's public key for tracking", async () => {
    const calls = mockApi(() => json({success: true}));
    const {client, close} = await connect();

    await client.callTool({
      name: 'plunk_track_event',
      arguments: {project: 'beta', email: 'ada@example.com', event: 'signed-up'},
    });

    expect(calls[0]?.url).toContain('/v1/track');
    expect(calls[0]?.key).toBe('pk_beta');

    await close();
  });

  it('rejects a call without a project, or with an unknown one, before reaching the API', async () => {
    const calls = mockApi();
    const {client, close} = await connect();

    const missing = await client
      .callTool({name: 'plunk_list_campaigns', arguments: {}})
      .catch((error: unknown) => ({isError: true, error}));
    const unknown = await client
      .callTool({name: 'plunk_list_campaigns', arguments: {project: 'gamma'}})
      .catch((error: unknown) => ({isError: true, error}));

    expect(missing.isError).toBe(true);
    expect(unknown.isError).toBe(true);
    expect(calls).toHaveLength(0);

    await close();
  });

  it('names the project in a 401 so the user knows which key to fix', async () => {
    mockApi(() => json({success: false, error: {code: 'INVALID_API_KEY', message: 'Invalid key'}}, 401));
    const {client, close} = await connect();

    const result = await client.callTool({name: 'plunk_list_campaigns', arguments: {project: 'acme'}});
    const text = (result.content as {text: string}[])[0]?.text ?? '';

    expect(result.isError).toBe(true);
    expect(text).toContain('PLUNK_API_KEY_ACME');

    await close();
  });
});

describe('confirmation', () => {
  it('names the project in the send prompt', async () => {
    mockApi(() =>
      json({success: true, data: {id: 'camp-1', name: 'March newsletter', subject: 'Hello', totalRecipients: 43812}}),
    );
    const handler = createMcpHandler(() => buildServer(multiConfig));

    const response = await handler.fetch(
      new Request('http://test.local/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/call',
          'Mcp-Name': 'plunk_send_campaign',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'plunk_send_campaign',
            arguments: {project: 'beta', id: 'camp-1'},
            _meta: {
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
              'io.modelcontextprotocol/clientCapabilities': {elicitation: {}},
            },
          },
        }),
      }),
    );

    const text = await response.text();

    expect(text).toContain('In project \\"beta\\"');
    expect(text).toContain('43,812 recipients');

    await handler.close();
  });
});

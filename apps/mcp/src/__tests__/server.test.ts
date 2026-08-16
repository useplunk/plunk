/**
 * Protocol-level tests: a real MCP client driven against the real server over
 * the SDK's in-process handler, with only the Plunk API mocked. This is what
 * catches registration and guardrail regressions that unit tests would miss.
 */

import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {PlunkMcpConfig} from '../config.js';
import {buildServer} from '../server.js';

const baseConfig: PlunkMcpConfig = {
  apiKey: 'sk_test',
  apiUrl: 'https://api.example.com',
  readOnly: false,
};

async function connect(config: PlunkMcpConfig) {
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

function mockApi(handler: (url: string, init?: RequestInit) => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = String(url instanceof Request ? url.url : url);

    // Let the in-process MCP transport through untouched; only intercept Plunk.
    if (!target.startsWith('https://api.example.com')) {
      throw new Error(`unexpected fetch to ${target}`);
    }

    return handler(target, init as RequestInit | undefined);
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

let realFetch: typeof globalThis.fetch;

beforeEach(() => {
  realFetch = globalThis.fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = realFetch;
});

describe('tool registration', () => {
  it('exposes the full public-API surface by default', async () => {
    const {client, close} = await connect(baseConfig);

    const {tools} = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('plunk_send_email');
    expect(names).toContain('plunk_send_campaign');
    expect(names).toContain('plunk_delete_contact');
    expect(tools).toHaveLength(15);

    await close();
  });

  it('annotates every tool with a title and a read-only hint', async () => {
    // Both are hard requirements for the Claude Connectors Directory.
    const {client, close} = await connect(baseConfig);

    const {tools} = await client.listTools();

    for (const tool of tools) {
      expect(tool.title, `${tool.name} is missing a title`).toBeTruthy();
      expect(tool.annotations?.readOnlyHint, `${tool.name} is missing readOnlyHint`).toBeTypeOf('boolean');
    }

    await close();
  });

  it('marks the irreversible tools destructive', async () => {
    const {client, close} = await connect(baseConfig);

    const {tools} = await client.listTools();
    const destructive = tools.filter((t) => t.annotations?.destructiveHint).map((t) => t.name);

    expect(destructive.sort()).toEqual(['plunk_delete_contact', 'plunk_send_campaign']);

    await close();
  });

  it('returns tools in a stable order across builds', async () => {
    const first = await connect(baseConfig);
    const a = (await first.client.listTools()).tools.map((t) => t.name);
    await first.close();

    const second = await connect(baseConfig);
    const b = (await second.client.listTools()).tools.map((t) => t.name);
    await second.close();

    expect(a).toEqual(b);
  });
});

describe('read-only mode', () => {
  it('hides every mutating tool from tools/list', async () => {
    const {client, close} = await connect({...baseConfig, readOnly: true});

    const {tools} = await client.listTools();

    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.map((t) => t.name)).not.toContain('plunk_send_campaign');

    await close();
  });

  it('makes a hidden tool uncallable, not merely invisible', async () => {
    const {client, close} = await connect({...baseConfig, readOnly: true});

    // An unregistered tool is a protocol error, so the model cannot reach it by
    // guessing the name after seeing it in a previous non-read-only session.
    await expect(
      client.callTool({name: 'plunk_send_campaign', arguments: {id: 'abc'}}),
    ).rejects.toThrow();

    await close();
  });
});

describe('tool behaviour', () => {
  it('lists contacts and reports the total', async () => {
    mockApi(() => json({data: [{id: '1', email: 'ada@example.com'}], cursor: null, hasMore: false, total: 1}));

    const {client, close} = await connect(baseConfig);

    const result = await client.callTool({name: 'plunk_list_contacts', arguments: {}});

    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.content)).toContain('ada@example.com');

    await close();
  });

  it('steers toward filtering instead of blind paging when truncated', async () => {
    mockApi(() => json({data: [{id: '1'}], cursor: 'next-cursor', hasMore: true, total: 5000}));

    const {client, close} = await connect(baseConfig);

    const result = await client.callTool({name: 'plunk_list_contacts', arguments: {}});

    expect(JSON.stringify(result.content)).toMatch(/narrowing the search/i);

    await close();
  });

  it('turns an API failure into a readable tool error rather than throwing', async () => {
    mockApi(() => json({error: {code: 'NOT_FOUND', message: 'Contact not found'}}, 404));

    const {client, close} = await connect(baseConfig);

    const result = await client.callTool({name: 'plunk_get_contact', arguments: {id: 'missing'}});

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('Contact not found');

    await close();
  });

  it('rejects a send with neither template nor subject/body before calling the API', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');

    const {client, close} = await connect(baseConfig);

    const result = await client.callTool({
      name: 'plunk_send_email',
      arguments: {to: 'ada@example.com'},
    });

    expect(result.isError).toBe(true);
    expect(spy.mock.calls.filter(([u]) => String(u).includes('api.example.com'))).toHaveLength(0);

    await close();
  });

  it('rejects a SEGMENT campaign with no segmentId', async () => {
    const {client, close} = await connect(baseConfig);

    const result = await client.callTool({
      name: 'plunk_create_campaign',
      arguments: {
        name: 'n',
        subject: 's',
        body: 'b',
        from: 'a@example.com',
        audienceType: 'SEGMENT',
      },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('plunk_list_segments');

    await close();
  });

  it('tracks an event via the contact upsert when no public key is configured', async () => {
    const calls: string[] = [];

    mockApi((url) => {
      calls.push(url);
      return url.endsWith('/contacts') ? json({id: 'contact-1'}) : json({ok: true});
    });

    const {client, close} = await connect(baseConfig);

    const result = await client.callTool({
      name: 'plunk_track_event',
      arguments: {event: 'user.signup', email: 'ada@example.com'},
    });

    expect(result.isError).toBeFalsy();
    // /v1/track needs a public key, so the secret-key path must go the long way.
    expect(calls).toEqual(['https://api.example.com/contacts', 'https://api.example.com/events/track']);

    await close();
  });

  it('uses /v1/track directly when a public key is configured', async () => {
    const calls: string[] = [];

    mockApi((url) => {
      calls.push(url);
      return json({ok: true});
    });

    const {client, close} = await connect({...baseConfig, publicKey: 'pk_test'});

    await client.callTool({
      name: 'plunk_track_event',
      arguments: {event: 'user.signup', email: 'ada@example.com'},
    });

    expect(calls).toEqual(['https://api.example.com/v1/track']);

    await close();
  });
});

/**
 * The confirmation gate is the main thing standing between an agent and an
 * irreversible send, so it gets its own tests.
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

/** Records every Plunk call so we can assert the send never happened. */
function mockApi() {
  const calls: {url: string; method: string}[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const target = String(url instanceof Request ? url.url : url);

    if (!target.startsWith('https://api.example.com')) {
      throw new Error(`unexpected fetch to ${target}`);
    }

    calls.push({url: target, method: (init as RequestInit | undefined)?.method ?? 'GET'});

    if (target.includes('/send')) {
      return json({status: 'SENDING'});
    }

    // `totalRecipients` is the field the API actually returns.
    return json({id: 'camp-1', name: 'March newsletter', subject: 'Hello', totalRecipients: 43812});
  });

  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PLUNK_ALLOW_UNCONFIRMED_SENDS;
});

describe('plunk_send_campaign confirmation', () => {
  it('does not send on the first call', async () => {
    const calls = mockApi();
    const {client, close} = await connect();

    await client.callTool({name: 'plunk_send_campaign', arguments: {id: 'camp-1'}}).catch(() => undefined);

    // The campaign may be read to build the prompt, but nothing may be sent.
    expect(calls.filter((c) => c.url.includes('/send'))).toHaveLength(0);

    await close();
  });

  it('names the real recipient count so the user knows the blast radius', async () => {
    mockApi();
    const handler = createMcpHandler(() => buildServer(config));

    // Call the tool directly through the handler so we can read the raw
    // input_required payload the client would surface to the user.
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
            arguments: {id: 'camp-1'},
            _meta: {
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
              'io.modelcontextprotocol/clientCapabilities': {elicitation: {}},
            },
          },
        }),
      }),
    );

    const text = await response.text();

    expect(text).toContain('43,812 recipients');
    expect(text).toMatch(/cannot be undone/i);
    expect(text).toContain('March newsletter');

    await handler.close();
  });

  it('proceeds without confirmation only when the documented escape hatch is set', async () => {
    process.env.PLUNK_ALLOW_UNCONFIRMED_SENDS = 'true';

    const calls = mockApi();
    const {client, close} = await connect();

    const result = await client.callTool({name: 'plunk_send_campaign', arguments: {id: 'camp-1'}});

    expect(result.isError).toBeFalsy();
    expect(calls.filter((c) => c.url.includes('/send'))).toHaveLength(1);

    await close();
  });

  it('does not accept a model-supplied confirm argument', async () => {
    // If `confirm: true` were an input field the model could set it itself and
    // the gate would be decorative. It must not be part of the schema.
    const {client, close} = await connect();

    const {tools} = await client.listTools();
    const sendCampaign = tools.find((t) => t.name === 'plunk_send_campaign');
    const properties = (sendCampaign?.inputSchema as {properties?: Record<string, unknown>})?.properties ?? {};

    expect(Object.keys(properties)).not.toContain('confirm');

    await close();
  });
});

describe('plunk_send_email confirmation', () => {
  it('sends to a single recipient without prompting', async () => {
    const calls = mockApi();
    const {client, close} = await connect();

    const result = await client.callTool({
      name: 'plunk_send_email',
      arguments: {to: 'ada@example.com', subject: 'Hi', body: '<p>Hi</p>'},
    });

    expect(result.isError).toBeFalsy();
    expect(calls.filter((c) => c.url.includes('/v1/send'))).toHaveLength(1);

    await close();
  });

  it('does not send to multiple recipients before confirmation', async () => {
    const calls = mockApi();
    const {client, close} = await connect();

    await client
      .callTool({
        name: 'plunk_send_email',
        arguments: {to: ['a@example.com', 'b@example.com'], subject: 'Hi', body: '<p>Hi</p>'},
      })
      .catch(() => undefined);

    expect(calls.filter((c) => c.url.includes('/v1/send'))).toHaveLength(0);

    await close();
  });
});

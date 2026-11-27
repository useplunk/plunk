/**
 * Tests for the Streamable HTTP entry point: a real `http.Server` on an
 * ephemeral port, driven by a real MCP client over the network stack, with only
 * the Plunk API mocked.
 */

import type {AddressInfo} from 'node:net';

import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ConfigError} from '../config.js';
import {createHttpServer, createPlunkHttpHandler, loadHttpOptions, readBearerKey} from '../http.js';

const API = 'https://api.example.com';

let realFetch: typeof globalThis.fetch;
let closers: Array<() => Promise<void>> = [];

beforeEach(() => {
  realFetch = globalThis.fetch;
});

afterEach(async () => {
  vi.restoreAllMocks();
  globalThis.fetch = realFetch;
  await Promise.all(closers.map((close) => close()));
  closers = [];
});

async function listen(options: Partial<Parameters<typeof createHttpServer>[0]> = {}) {
  const server = createHttpServer({apiUrl: API, readOnly: false, ...options});

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  closers.push(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  );

  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

/** Lets traffic to the local MCP server through and answers Plunk API calls. */
function mockPlunkApi(respond: (url: string, init?: RequestInit) => Response) {
  const seen: Array<{url: string; authorization: string | null}> = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const target = String(input instanceof Request ? input.url : input);

    if (target.startsWith(API)) {
      seen.push({url: target, authorization: new Headers(init?.headers).get('authorization')});
      return respond(target, init);
    }

    return realFetch(input, init);
  });

  return seen;
}

async function connect(base: string, key: string, options?: ConstructorParameters<typeof Client>[1]) {
  const client = new Client({name: 'http-test', version: '1.0.0'}, options);
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
    requestInit: {headers: {Authorization: `Bearer ${key}`}},
  });

  await client.connect(transport);
  closers.push(() => client.close());

  return client;
}

const domains = (list: unknown[]) =>
  new Response(JSON.stringify(list), {status: 200, headers: {'Content-Type': 'application/json'}});

describe('plunk-mcp --http', () => {
  it('lists the tools for a client that sends a secret key', async () => {
    const base = await listen();
    const client = await connect(base, 'sk_one');

    const {tools} = await client.listTools();

    expect(tools.map((t) => t.name)).toContain('plunk_send_email');
    expect(tools.length).toBeGreaterThan(40);
  });

  it('calls the Plunk API with the key from the request, per request', async () => {
    const seen = mockPlunkApi(() => domains([{id: 'd1', domain: 'a.example', verified: true}]));
    const base = await listen();

    const first = await connect(base, 'sk_project_a');
    const second = await connect(base, 'sk_project_b');

    const result = await first.callTool({name: 'plunk_list_domains', arguments: {}});
    await second.callTool({name: 'plunk_list_domains', arguments: {}});

    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.content)).toContain('a.example');
    expect(seen.map((s) => s.authorization)).toEqual(['Bearer sk_project_a', 'Bearer sk_project_b']);
  });

  it('registers only read-only tools when started read-only', async () => {
    const base = await listen({readOnly: true});
    const client = await connect(base, 'sk_one');

    const {tools} = await client.listTools();

    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.map((t) => t.name)).not.toContain('plunk_send_campaign');
  });

  it('answers 401 with a challenge when no key is sent', async () => {
    const base = await listen();

    const response = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json, text/event-stream'},
      body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list'}),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toMatch(/^Bearer/);
  });

  it('refuses a public key and anything that is not a secret key', async () => {
    const base = await listen();

    for (const token of ['pk_public', 'whatever']) {
      const response = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: '{}',
      });

      expect(response.status).toBe(401);
    }
  });

  it('refuses a browser Origin that is not allowed, and accepts a listed one', async () => {
    const base = await listen({allowedOrigins: ['https://app.example.com']});
    const headers = {
      Authorization: 'Bearer sk_one',
      Origin: 'https://evil.example',
      'Content-Type': 'application/json',
    };

    const blocked = await fetch(`${base}/mcp`, {method: 'POST', headers, body: '{}'});
    expect(blocked.status).toBe(403);

    const allowed = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {...headers, Origin: 'https://app.example.com/'},
      body: '{}',
    });
    expect(allowed.status).not.toBe(403);
  });

  it('serves /health without a key and 404s other paths', async () => {
    const base = await listen();

    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({status: 'ok'});

    expect((await fetch(`${base}/other`)).status).toBe(404);
  });

  it('stays stateless: a request without a key never inherits an earlier one', async () => {
    const handler = createPlunkHttpHandler({apiUrl: API, readOnly: false});
    closers.push(() => handler.close());

    const ok = await handler.fetch(
      new Request('http://x.test/mcp', {
        method: 'POST',
        headers: {Authorization: 'Bearer sk_one', 'Content-Type': 'application/json', Accept: 'application/json'},
        body: '{}',
      }),
    );
    expect(ok.status).not.toBe(401);

    const missing = await handler.fetch(
      new Request('http://x.test/mcp', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'}),
    );
    expect(missing.status).toBe(401);
  });
});

describe('send confirmation over HTTP', () => {
  /** A campaign with an audience, and a send endpoint that records every hit. */
  function mockCampaign() {
    return mockPlunkApi((url) =>
      url.endsWith('/send')
        ? new Response(JSON.stringify({status: 'SENDING'}), {status: 200})
        : new Response(
            JSON.stringify({success: true, data: {id: 'camp-1', name: 'March newsletter', totalRecipients: 43812}}),
            {status: 200, headers: {'Content-Type': 'application/json'}},
          ),
    );
  }

  const sends = (seen: ReturnType<typeof mockPlunkApi>) =>seen.filter((s) => s.url.endsWith('/send'));

  /** A 2026-07-28 client whose user answers the confirmation prompt with `answer`. */
  async function modernClient(base: string, answer: {action: 'accept' | 'decline'; content?: {confirm: boolean}}) {
    const client = await connect(base, 'sk_one', {
      capabilities: {elicitation: {}},
      versionNegotiation: {mode: {pin: '2026-07-28'}},
    });
    client.setRequestHandler('elicitation/create', async () => answer);
    return client;
  }

  it('refuses a gated send from a 2025-era client, which cannot be prompted, and sends nothing', async () => {
    const seen = mockCampaign();
    const base = await listen();
    const client = await connect(base, 'sk_one');

    const result = await client.callTool({name: 'plunk_send_campaign', arguments: {id: 'camp-1'}});

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toMatch(/server-to-client requests/);
    expect(sends(seen)).toHaveLength(0);
  });

  it('sends once a 2026-07-28 client confirms, with the key from the request', async () => {
    const seen = mockCampaign();
    const base = await listen();
    const client = await modernClient(base, {action: 'accept', content: {confirm: true}});

    const result = await client.callTool({name: 'plunk_send_campaign', arguments: {id: 'camp-1'}});

    expect(result.isError).toBeFalsy();
    expect(sends(seen)).toHaveLength(1);
    expect(sends(seen)[0]?.authorization).toBe('Bearer sk_one');
  });

  it('does not send when the user declines', async () => {
    const seen = mockCampaign();
    const base = await listen();
    const client = await modernClient(base, {action: 'decline'});

    await client.callTool({name: 'plunk_send_campaign', arguments: {id: 'camp-1'}}).catch(() => undefined);

    expect(sends(seen)).toHaveLength(0);
  });
});

describe('readBearerKey', () => {
  it('extracts a secret key', () => {
    expect(readBearerKey('Bearer sk_abc')).toEqual({key: 'sk_abc'});
    expect(readBearerKey('bearer   sk_abc ')).toEqual({key: 'sk_abc'});
  });

  it('explains what is wrong with a missing, public or malformed key', () => {
    expect(readBearerKey(null)).toHaveProperty('error');
    expect(readBearerKey('Basic abc')).toHaveProperty('error');
    expect(readBearerKey('Bearer pk_abc')).toMatchObject({error: expect.stringMatching(/public key/)});
    expect(readBearerKey('Bearer abc')).toMatchObject({error: expect.stringMatching(/sk_/)});
  });
});

describe('loadHttpOptions', () => {
  it('defaults to loopback on port 3000 and the hosted API', () => {
    const options = loadHttpOptions({}, []);

    expect(options).toMatchObject({host: '127.0.0.1', port: 3000, readOnly: false, allowedOrigins: []});
    expect(options.apiUrl).toBe('https://next-api.useplunk.com');
  });

  it('reads flags, with flags winning over the environment', () => {
    const options = loadHttpOptions(
      {PLUNK_MCP_PORT: '4000', PLUNK_MCP_HOST: '0.0.0.0', PLUNK_API_URL: 'https://api.example.com/'},
      ['--http', '--port=5000', '--read-only', '--allowed-origins=https://a.example, https://b.example/'],
    );

    expect(options).toMatchObject({
      host: '0.0.0.0',
      port: 5000,
      readOnly: true,
      apiUrl: 'https://api.example.com',
      allowedOrigins: ['https://a.example', 'https://b.example'],
    });
  });

  it('rejects an invalid port', () => {
    expect(() => loadHttpOptions({PLUNK_MCP_PORT: 'abc'}, [])).toThrow(ConfigError);
    expect(() => loadHttpOptions({}, ['--port=70000'])).toThrow(ConfigError);
  });

  it('does not need a PLUNK_API_KEY', () => {
    expect(() => loadHttpOptions({}, [])).not.toThrow();
  });

  it('refuses PLUNK_ALLOW_UNCONFIRMED_SENDS unless --allow-unconfirmed-sends confirms it', () => {
    const env = {PLUNK_ALLOW_UNCONFIRMED_SENDS: 'true'};

    expect(() => loadHttpOptions(env, ['--http'])).toThrow(/every client/);
    expect(() => loadHttpOptions(env, ['--http', '--allow-unconfirmed-sends'])).not.toThrow();
  });

  it('trims the host flag', () => {
    expect(loadHttpOptions({}, ['--host= 0.0.0.0 ']).host).toBe('0.0.0.0');
  });
});

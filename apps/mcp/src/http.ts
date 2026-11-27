/**
 * Streamable HTTP transport for the Plunk MCP server.
 *
 * `plunk-mcp --http` serves the same tools as the stdio entry point over HTTP,
 * so a self-hoster can run one shared endpoint that remote MCP clients connect
 * to instead of installing the package on every machine.
 *
 * Credentials are per request, not per process: each call carries the project's
 * secret key as `Authorization: Bearer sk_…`, and the server builds its
 * configuration from that header. Nothing is stored between requests, so one
 * endpoint can serve any number of projects and a leaked process environment
 * holds no key. The endpoint is stateless (no session ids).
 *
 * Send confirmations need a client on the 2026-07-28 revision: it answers the
 * `input_required` prompt and retries, which works without a session. A
 * 2025-era client cannot be asked anything over stateless HTTP, so gated tools
 * (campaign sends, multi-recipient email, enabling sending workflows) return an
 * error to it and never send.
 *
 * Serve it behind TLS (a reverse proxy) when it is reachable from outside the
 * machine: a bearer key must not cross the network in clear text. It binds to
 * 127.0.0.1 unless told otherwise.
 */

import {createServer} from 'node:http';
import type {IncomingMessage, Server, ServerResponse} from 'node:http';
import {Readable} from 'node:stream';

import {createMcpHandler} from '@modelcontextprotocol/server';

import {ConfigError, isReadOnly, resolveApiUrl} from './config.js';
import {buildServer, SERVER_VERSION} from './server.js';

export const DEFAULT_HTTP_PORT = 3000;
export const DEFAULT_HTTP_HOST = '127.0.0.1';
export const MCP_PATH = '/mcp';
export const HEALTH_PATH = '/health';

export interface HttpServerOptions {
  /** Base URL of the Plunk API the tools call. */
  apiUrl: string;
  /** When true only read-only tools are registered. */
  readOnly: boolean;
  /**
   * Browser origins allowed to call the endpoint. A request carrying an `Origin`
   * header that is not listed is refused (the spec's DNS-rebinding guard);
   * requests without one, which is every non-browser client, are unaffected.
   */
  allowedOrigins?: string[];
  onerror?: (error: Error) => void;
}

export interface HttpListenOptions extends HttpServerOptions {
  host: string;
  port: number;
}

/** What `plunk-mcp --http` listens on, from flags and environment. */
export function loadHttpOptions(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv.slice(2),
): HttpListenOptions {
  const flag = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

  const rawPort = flag('port') ?? env.PLUNK_MCP_PORT?.trim() ?? String(DEFAULT_HTTP_PORT);
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ConfigError(`PLUNK_MCP_PORT must be a port number between 0 and 65535, received "${rawPort}".`);
  }

  // The escape hatch is read process-wide, so on a shared endpoint it removes
  // the send confirmation for every caller and every project at once. Over
  // stdio it is one user's choice; here it needs a second, explicit opt-in.
  if (env.PLUNK_ALLOW_UNCONFIRMED_SENDS === 'true' && !argv.includes('--allow-unconfirmed-sends')) {
    throw new ConfigError(
      'PLUNK_ALLOW_UNCONFIRMED_SENDS=true skips the send confirmation for every client of this HTTP endpoint. ' +
        'Pass --allow-unconfirmed-sends as well if that is intended, or unset it.',
    );
  }

  const origins = flag('allowed-origins') ?? env.PLUNK_MCP_ALLOWED_ORIGINS ?? '';

  return {
    apiUrl: resolveApiUrl(env, argv),
    readOnly: isReadOnly(env, argv),
    host: flag('host')?.trim() || env.PLUNK_MCP_HOST?.trim() || DEFAULT_HTTP_HOST,
    port,
    allowedOrigins: origins
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json', ...headers},
  });
}

function unauthorized(message: string): Response {
  return jsonResponse(
    401,
    {jsonrpc: '2.0', error: {code: -32001, message}, id: null},
    {'WWW-Authenticate': 'Bearer realm="plunk-mcp"'},
  );
}

/**
 * The secret key from an `Authorization: Bearer` header, or an error message
 * saying what is wrong with it.
 */
export function readBearerKey(header: string | null): {key: string} | {error: string} {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '');

  if (!match) {
    return {error: 'Send your Plunk secret key as "Authorization: Bearer sk_…".'};
  }

  const key = match[1] as string;

  if (key.startsWith('pk_')) {
    return {error: 'That is a public key (pk_*). The MCP server needs the project secret key (sk_*).'};
  }

  if (!key.startsWith('sk_')) {
    return {error: 'The bearer token must be a Plunk secret key (sk_*).'};
  }

  return {key};
}

export interface PlunkHttpHandler {
  fetch: (request: Request) => Promise<Response>;
  close: () => Promise<void>;
}

/** The web-standard request handler: route, check Origin and key, then hand over to the SDK. */
export function createPlunkHttpHandler(options: HttpServerOptions): PlunkHttpHandler {
  const allowedOrigins = options.allowedOrigins ?? [];

  const mcp = createMcpHandler(
    (ctx) => {
      const apiKey = ctx.authInfo?.token;

      if (!apiKey) {
        throw new Error('Request reached the MCP handler without a key.');
      }

      return buildServer({apiKey, apiUrl: options.apiUrl, readOnly: options.readOnly});
    },
    {onerror: options.onerror},
  );

  return {
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === HEALTH_PATH && request.method === 'GET') {
        return jsonResponse(200, {status: 'ok', version: SERVER_VERSION});
      }

      if (url.pathname !== MCP_PATH) {
        return jsonResponse(404, {error: `Not found. The MCP endpoint is ${MCP_PATH}.`});
      }

      // Exact origin match rather than the SDK's `originValidationResponse`,
      // which compares hostnames only and so lets http:// and any port through.
      const origin = request.headers.get('origin');

      if (origin && !allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return jsonResponse(403, {error: 'Origin not allowed.'});
      }

      const credentials = readBearerKey(request.headers.get('authorization'));

      if ('error' in credentials) {
        return unauthorized(credentials.error);
      }

      return mcp.fetch(request, {authInfo: {token: credentials.key, clientId: 'plunk-api-key', scopes: []}});
    },
    close: () => mcp.close(),
  };
}

/** Wraps a Node request as a web `Request`; aborts when the client goes away. */
function toWebRequest(req: IncomingMessage, signal: AbortSignal): Request {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(name, v));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const host = req.headers.host ?? 'localhost';

  return new Request(`http://${host}${req.url ?? '/'}`, {
    method: req.method,
    headers,
    signal,
    ...(hasBody ? {body: Readable.toWeb(req) as ReadableStream, duplex: 'half'} : {}),
  } as RequestInit);
}

async function sendWebResponse(response: Response, res: ServerResponse): Promise<void> {
  res.writeHead(response.status, Object.fromEntries(response.headers));

  if (!response.body) {
    res.end();
    return;
  }

  // Streamed (SSE) responses must reach the client as they are written.
  res.flushHeaders();

  const reader = response.body.getReader();

  try {
    for (;;) {
      const {done, value} = await reader.read();

      if (done) {
        break;
      }

      if (!res.write(value)) {
        // A client that disconnects while the buffer is full never emits
        // 'drain', so wait for whichever of the two comes first.
        await new Promise<void>((resolve) => {
          const settle = () => {
            res.off('drain', settle);
            res.off('close', settle);
            resolve();
          };
          res.once('drain', settle);
          res.once('close', settle);
        });
      }

      if (res.destroyed) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  } finally {
    res.end();
  }
}

/** A Node `http.Server` serving the endpoint. Call `listen` yourself, or use `serveHttp`. */
export function createHttpServer(options: HttpServerOptions): Server {
  const handler = createPlunkHttpHandler(options);
  const server = createServer((req, res) => {
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    handler
      .fetch(toWebRequest(req, abort.signal))
      .then((response) => sendWebResponse(response, res))
      .catch((error: Error) => {
        options.onerror?.(error);

        if (!res.headersSent) {
          res.writeHead(500, {'Content-Type': 'application/json'});
        }

        res.end(JSON.stringify({error: 'Internal server error.'}));
      });
  });

  server.on('close', () => void handler.close());

  return server;
}

/** Starts the HTTP server and installs shutdown handlers. Used by `plunk-mcp --http`. */
export function serveHttp(options: HttpListenOptions): Server {
  const server = createHttpServer({
    ...options,
    onerror: options.onerror ?? ((error) => console.error(`[plunk-mcp] ${error.message}`)),
  });

  server.listen(options.port, options.host, () => {
    console.error(
      `[plunk-mcp] v${SERVER_VERSION} listening on http://${options.host}:${options.port}${MCP_PATH} — ` +
        `api=${options.apiUrl}${options.readOnly ? ' (read-only)' : ''}`,
    );
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

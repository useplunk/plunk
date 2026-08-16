/**
 * Thin HTTP client for the Plunk API.
 *
 * Its job beyond `fetch` is turning Plunk's error envelope into messages an
 * agent can act on. The API returns
 *   { success: false, error: { code, message, statusCode, requestId, errors? } }
 * and the field-level `errors[]` on a 422 is the part a model needs in order to
 * retry correctly, so it is flattened into the message rather than dropped.
 */

import type {PlunkMcpConfig} from './config.js';

/** Error carrying enough context for the agent to decide whether to retry. */
export class PlunkApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    /** Seconds to wait, from `Retry-After`. Only set on 429. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'PlunkApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Use the public key instead of the secret key (only `/v1/track` needs this). */
  usePublicKey?: boolean;
}

export class PlunkClient {
  constructor(private readonly config: PlunkMcpConfig) {}

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  get hasPublicKey(): boolean {
    return Boolean(this.config.publicKey);
  }

  async request<T = unknown>({method = 'GET', path, query, body, usePublicKey}: RequestOptions): Promise<T> {
    const url = new URL(`${this.config.apiUrl}${path}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const key = usePublicKey ? this.config.publicKey : this.config.apiKey;

    if (!key) {
      throw new PlunkApiError(
        'This action needs a public key (pk_*). Set PLUNK_PUBLIC_KEY to enable it.',
        400,
        'MISSING_PUBLIC_KEY',
      );
    }

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'plunk-mcp',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      throw new PlunkApiError(
        `Could not reach the Plunk API at ${this.config.apiUrl}. ` +
          `Check PLUNK_API_URL is correct and the instance is reachable. (${(cause as Error).message})`,
        0,
        'NETWORK_ERROR',
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    let payload: unknown;

    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      throw toApiError(response, payload, text);
    }

    return payload as T;
  }
}

function toApiError(response: Response, payload: unknown, raw: string): PlunkApiError {
  const error = (payload as {error?: Record<string, unknown>} | undefined)?.error;
  const code = typeof error?.code === 'string' ? error.code : undefined;

  let message = typeof error?.message === 'string' ? error.message : raw.slice(0, 500) || response.statusText;

  // 422s carry the per-field detail that tells a model exactly what to change.
  const fieldErrors = error?.errors;

  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const detail = fieldErrors
      .map((entry) => {
        const {field, path, message: fieldMessage} = entry as Record<string, unknown>;
        const name = field ?? path;
        return name ? `${String(name)}: ${String(fieldMessage)}` : String(fieldMessage);
      })
      .join('; ');

    message = `${message} (${detail})`;
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;

    return new PlunkApiError(
      seconds
        ? `${message} Wait ${seconds}s before retrying — do not retry immediately.`
        : `${message} Back off before retrying.`,
      429,
      code ?? 'RATE_LIMIT_EXCEEDED',
      seconds,
    );
  }

  if (response.status === 401) {
    return new PlunkApiError(
      `${message} Check that PLUNK_API_KEY is a valid secret key (sk_*) for the intended project.`,
      401,
      code,
    );
  }

  if (response.status === 403 && code === 'PROJECT_DISABLED') {
    return new PlunkApiError(
      `${message} Writes are blocked until the project is re-enabled; reads still work.`,
      403,
      code,
    );
  }

  return new PlunkApiError(message, response.status, code);
}

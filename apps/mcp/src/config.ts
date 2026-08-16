/**
 * Configuration for the Plunk MCP server.
 *
 * Credentials come from the environment rather than the MCP authorization flow:
 * the spec's guidance for stdio servers is to read them from the environment,
 * and it keeps a self-hosted install to a single env var.
 */

export const DEFAULT_API_URL = 'https://next-api.useplunk.com';

export interface PlunkMcpConfig {
  /** Secret key (`sk_*`). Every tool except `plunk_track_event` needs it. */
  apiKey: string;
  /**
   * Public key (`pk_*`), optional. `POST /v1/track` is the one endpoint that
   * requires a public key, so without this `plunk_track_event` has to resolve
   * the contact first and go through `POST /events/track` instead.
   */
  publicKey?: string;
  /** Base URL of the Plunk API. Self-hosters point this at their own API domain. */
  apiUrl: string;
  /** When true only read-only tools are registered — mutations become unreachable. */
  readOnly: boolean;
}

export class ConfigError extends Error {}

/**
 * Builds config from the environment plus argv flags. Flags win over env so a
 * client config can override an inherited shell environment.
 *
 * Recognised flags: `--read-only`, `--api-url=<url>`.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, argv: string[] = process.argv.slice(2)): PlunkMcpConfig {
  // `PLUNK_API_KEY` is the name users expect from the published package, but the
  // Plunk API server already uses that name for its own platform-notification
  // key. Anyone running this inside the monorepo, or on a host that self-hosts
  // Plunk, can therefore have a key in the environment that belongs to a
  // different project — pointing the agent at the wrong data. `PLUNK_MCP_API_KEY`
  // wins so that case is disambiguated without renaming the common one.
  const apiKey = (env.PLUNK_MCP_API_KEY ?? env.PLUNK_API_KEY)?.trim();

  if (!apiKey) {
    throw new ConfigError(
      'PLUNK_API_KEY is required. Create one in the Plunk dashboard under Settings → API Keys and pass it as an environment variable. ' +
        '(If PLUNK_API_KEY is already in use for something else in this environment, set PLUNK_MCP_API_KEY instead — it takes precedence.)',
    );
  }

  // Fail on an obviously wrong key rather than letting every tool call 401.
  if (apiKey.startsWith('pk_')) {
    throw new ConfigError(
      'PLUNK_API_KEY is a public key (pk_*), but the MCP server needs the secret key (sk_*). ' +
        'Public keys can only call the event-tracking endpoint. Set the secret key as PLUNK_API_KEY, ' +
        'and if you also want event tracking without a contact ID, set the public key as PLUNK_PUBLIC_KEY.',
    );
  }

  const publicKey = env.PLUNK_PUBLIC_KEY?.trim() || undefined;

  if (publicKey && !publicKey.startsWith('pk_')) {
    throw new ConfigError('PLUNK_PUBLIC_KEY must be a public key (pk_*).');
  }

  const urlFlag = argv.find((a) => a.startsWith('--api-url='))?.slice('--api-url='.length);
  const apiUrl = stripTrailingSlash(urlFlag ?? (env.PLUNK_MCP_API_URL ?? env.PLUNK_API_URL)?.trim() ?? DEFAULT_API_URL);

  if (!/^https?:\/\//.test(apiUrl)) {
    throw new ConfigError(`PLUNK_API_URL must be an absolute http(s) URL, received "${apiUrl}".`);
  }

  const readOnly = argv.includes('--read-only') || isTruthy(env.PLUNK_READ_ONLY);

  return {apiKey, publicKey, apiUrl, readOnly};
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

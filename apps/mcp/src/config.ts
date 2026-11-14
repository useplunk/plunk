/**
 * Configuration for the Plunk MCP server.
 *
 * Credentials come from the environment rather than the MCP authorization flow:
 * the spec's guidance for stdio servers is to read them from the environment,
 * and it keeps a self-hosted install to a single env var.
 */

export const DEFAULT_API_URL = 'https://next-api.useplunk.com';

/** One project's keys, as configured through `PLUNK_API_KEY_<NAME>`. */
export interface ProjectKeys {
  apiKey: string;
  publicKey?: string;
}

export interface PlunkMcpConfig {
  /**
   * Secret key (`sk_*`). Every tool except `plunk_track_event` needs it.
   * Unset when `projects` is.
   */
  apiKey?: string;
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
  /**
   * Named projects, keyed by the name the agent passes as `project`. Set
   * instead of `apiKey`/`publicKey` when the server spans several projects.
   */
  projects?: Record<string, ProjectKeys>;
}

const PROJECT_KEY_PREFIX = 'PLUNK_API_KEY_';
const PROJECT_PUBLIC_KEY_PREFIX = 'PLUNK_PUBLIC_KEY_';

/** The variable a project's secret key is read from, for error messages. */
export function apiKeyVariable(project?: string): string {
  return project ? `${PROJECT_KEY_PREFIX}${project.toUpperCase()}` : 'PLUNK_API_KEY';
}

/** The variable a project's public key is read from, for error messages. */
export function publicKeyVariable(project?: string): string {
  return project ? `${PROJECT_PUBLIC_KEY_PREFIX}${project.toUpperCase()}` : 'PLUNK_PUBLIC_KEY';
}

export class ConfigError extends Error {}

/**
 * Builds config from the environment plus argv flags. Flags win over env so a
 * client config can override an inherited shell environment.
 *
 * Recognised flags: `--read-only`, `--api-url=<url>`.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, argv: string[] = process.argv.slice(2)): PlunkMcpConfig {
  const urlFlag = argv.find((a) => a.startsWith('--api-url='))?.slice('--api-url='.length);
  const apiUrl = stripTrailingSlash(urlFlag ?? (env.PLUNK_MCP_API_URL ?? env.PLUNK_API_URL)?.trim() ?? DEFAULT_API_URL);

  if (!/^https?:\/\//.test(apiUrl)) {
    throw new ConfigError(`PLUNK_API_URL must be an absolute http(s) URL, received "${apiUrl}".`);
  }

  const readOnly = argv.includes('--read-only') || isTruthy(env.PLUNK_READ_ONLY);

  const projects = loadProjects(env);

  if (projects) {
    return {apiUrl, readOnly, projects};
  }

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

  return {apiKey, publicKey, apiUrl, readOnly};
}

/**
 * Reads `PLUNK_API_KEY_<NAME>` (and optionally `PLUNK_PUBLIC_KEY_<NAME>`) pairs.
 * Returns undefined when none are set, which means single-project mode.
 *
 * A bare `PLUNK_API_KEY` is ignored once named keys exist: inside the monorepo
 * or on a self-hosted box it is often the API server's own platform key, and
 * silently adding it as an extra project would point the agent at data it was
 * never meant to touch. `PLUNK_MCP_API_KEY` and `PLUNK_PUBLIC_KEY` are only
 * ever set for this server, so combining them with named keys is ambiguous
 * and fails instead.
 */
function loadProjects(env: NodeJS.ProcessEnv): Record<string, ProjectKeys> | undefined {
  const projects: Record<string, ProjectKeys> = {};

  for (const [variable, raw] of Object.entries(env)) {
    const value = raw?.trim();

    if (!variable.startsWith(PROJECT_KEY_PREFIX) || !value) {
      continue;
    }

    const name = projectName(variable.slice(PROJECT_KEY_PREFIX.length), variable);

    if (!value.startsWith('sk_')) {
      throw new ConfigError(
        `${variable} must be a secret key (sk_*). Set a public key, if you want one, as ${publicKeyVariable(name)}.`,
      );
    }

    projects[name] = {apiKey: value};
  }

  for (const [variable, raw] of Object.entries(env)) {
    const value = raw?.trim();

    if (!variable.startsWith(PROJECT_PUBLIC_KEY_PREFIX) || !value) {
      continue;
    }

    const name = projectName(variable.slice(PROJECT_PUBLIC_KEY_PREFIX.length), variable);
    const project = projects[name];

    if (!project) {
      throw new ConfigError(`${variable} is set but ${apiKeyVariable(name)} is not. Every project needs a secret key.`);
    }

    if (!value.startsWith('pk_')) {
      throw new ConfigError(`${variable} must be a public key (pk_*).`);
    }

    project.publicKey = value;
  }

  if (Object.keys(projects).length === 0) {
    return undefined;
  }

  if (env.PLUNK_MCP_API_KEY?.trim()) {
    throw new ConfigError(
      `PLUNK_MCP_API_KEY cannot be combined with ${PROJECT_KEY_PREFIX}<NAME> keys. ` +
        `Give that project a name too, e.g. ${PROJECT_KEY_PREFIX}MAIN.`,
    );
  }

  if (env.PLUNK_PUBLIC_KEY?.trim()) {
    throw new ConfigError(
      `PLUNK_PUBLIC_KEY cannot be combined with ${PROJECT_KEY_PREFIX}<NAME> keys, because it is unclear which ` +
        `project it belongs to. Set it as ${PROJECT_PUBLIC_KEY_PREFIX}<NAME> instead.`,
    );
  }

  return projects;
}

/** Project names are what the agent passes as `project`, so keep them simple. */
function projectName(suffix: string, variable: string): string {
  const name = suffix.toLowerCase();

  if (!/^[a-z0-9][a-z0-9_]*$/.test(name)) {
    throw new ConfigError(`${variable}: the project name after the prefix may only use letters, digits and underscores.`);
  }

  return name;
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

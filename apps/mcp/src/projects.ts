/**
 * Which Plunk project a tool call acts on.
 *
 * With one project nothing here is visible: every call uses its key. With
 * several, each tool gains a required `project` argument, and `register()` runs
 * the handler inside that project's scope. The client reads its key from the
 * scope at request time, so the tool modules never handle project selection
 * themselves — and cannot get it wrong.
 *
 * The scope is deliberately per call, never a "current project" the agent sets
 * once: that kind of state outlives the agent's memory of having set it (a
 * summarised context, say), and the next send would go to whichever project was
 * selected last. An explicit argument puts the target in every call.
 */

import {AsyncLocalStorage} from 'node:async_hooks';

import type {PlunkMcpConfig, ProjectKeys} from './config.js';

export interface ProjectCredentials extends ProjectKeys {
  /** The configured project name. Absent for a plain `PLUNK_API_KEY` setup. */
  name?: string;
}

const scope = new AsyncLocalStorage<ProjectCredentials>();

/** The project the current tool call targets, when the server spans several. */
export function activeProject(): ProjectCredentials | undefined {
  return scope.getStore();
}

export class ProjectRouter {
  private readonly projects: Map<string, ProjectCredentials>;
  private readonly fallback?: ProjectCredentials;

  constructor(config: PlunkMcpConfig) {
    this.projects = new Map(Object.entries(config.projects ?? {}).map(([name, keys]) => [name, {...keys, name}]));

    if (this.projects.size === 1) {
      this.fallback = [...this.projects.values()][0];
    } else if (this.projects.size === 0) {
      if (!config.apiKey) {
        throw new Error('Plunk MCP config needs either an apiKey or at least one entry in projects.');
      }

      this.fallback = {apiKey: config.apiKey, publicKey: config.publicKey};
    }
  }

  /** Project names the agent chooses between. Empty unless there are at least two. */
  get names(): string[] {
    return this.fallback ? [] : [...this.projects.keys()].sort();
  }

  /** Runs `fn` with the named project's credentials active. */
  run<T>(name: string, fn: () => T): T {
    const project = this.projects.get(name);

    // The `project` schema is an enum of configured names, so the SDK rejects
    // anything else before it gets here. This guards direct callers.
    if (!project) {
      throw new Error(`Unknown Plunk project "${name}". Configured projects: ${this.names.join(', ')}.`);
    }

    return scope.run(project, fn);
  }

  /** Credentials for the request being made right now. */
  current(): ProjectCredentials {
    const project = this.fallback ?? scope.getStore();

    if (!project) {
      throw new Error('No Plunk project is active. Requests must be made from inside a registered tool.');
    }

    return project;
  }
}

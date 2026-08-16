/**
 * Helpers shared by every tool module: result shaping, error handling, and the
 * confirmation gate used before irreversible sends.
 */

import {acceptedContent, inputRequired} from '@modelcontextprotocol/server';
import type {
  CallToolResult,
  InputRequiredResult,
  McpServer,
  StandardSchemaWithJSON,
  ToolAnnotations,
  ToolCallback,
} from '@modelcontextprotocol/server';

import {PlunkApiError} from '../client.js';

export type ToolResult = CallToolResult | InputRequiredResult;

/** A tool result carrying both prose and the machine-readable payload. */
export function jsonResult(summary: string, data: unknown): CallToolResult {
  return {
    content: [{type: 'text', text: `${summary}\n\n${JSON.stringify(data, null, 2)}`}],
    structuredContent: data as CallToolResult['structuredContent'],
  };
}

export function textResult(text: string): CallToolResult {
  return {content: [{type: 'text', text}]};
}

/**
 * A failed tool call. Returned as a result rather than thrown so the model can
 * read it and correct itself, per the tools spec.
 */
export function errorResult(text: string): CallToolResult {
  return {content: [{type: 'text', text}], isError: true};
}

/**
 * Wraps a handler so API failures become readable tool errors instead of
 * protocol errors. Anything unexpected is still surfaced, never swallowed.
 */
export async function runTool(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PlunkApiError) {
      return errorResult(`Plunk API error (${error.status}${error.code ? ` ${error.code}` : ''}): ${error.message}`);
    }

    return errorResult(`Unexpected error calling Plunk: ${(error as Error).message}`);
  }
}

/**
 * Requires a human to confirm before an irreversible action proceeds.
 *
 * This deliberately does not accept a `confirm` tool argument: the model could
 * set that itself, which would make the gate meaningless. Confirmation comes
 * back through the elicitation round-trip, so it originates with the user.
 *
 * Clients that cannot elicit therefore cannot send. That is the safe direction
 * for mass email, and `PLUNK_ALLOW_UNCONFIRMED_SENDS=true` exists as a
 * documented escape hatch for headless automation.
 */
export function requireConfirmation(
  ctx: {mcpReq?: {inputResponses?: unknown}},
  key: string,
  message: string,
): InputRequiredResult | undefined {
  if (process.env.PLUNK_ALLOW_UNCONFIRMED_SENDS === 'true') {
    return undefined;
  }

  const answer = acceptedContent<{confirm?: boolean}>(
    ctx.mcpReq?.inputResponses as Parameters<typeof acceptedContent>[0],
    key,
  );

  if (answer?.confirm === true) {
    return undefined;
  }

  return inputRequired({
    inputRequests: {
      [key]: inputRequired.elicit({
        message,
        requestedSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: 'Confirm this send. It cannot be undone.',
            },
          },
          required: ['confirm'],
        },
      }),
    },
  });
}

/** Registration context handed to each tool module. */
export interface ToolContext {
  server: McpServer;
  readOnly: boolean;
}

/**
 * Registers a tool, skipping mutating tools entirely when running read-only so
 * they never appear in `tools/list`.
 *
 * Generic over the input schema so the handler keeps its inferred argument
 * types — widening this to the SDK's deprecated raw-shape overload would erase
 * them to `unknown` at every call site.
 */
export function register<InputArgs extends StandardSchemaWithJSON>(
  {server, readOnly}: ToolContext,
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema?: InputArgs;
    annotations: ToolAnnotations;
  },
  handler: ToolCallback<InputArgs>,
): void {
  if (readOnly && config.annotations.readOnlyHint !== true) {
    return;
  }

  server.registerTool(name, config, handler);
}

/** Truncation notice steering the agent to filter rather than page blindly. */
export function paginationHint(hasMore: boolean, cursor: string | null | undefined): string {
  if (!hasMore || !cursor) {
    return '';
  }

  return (
    `\n\nMore results exist. Prefer narrowing the search with a filter over paging through everything; ` +
    `if you do need the next page, pass cursor="${cursor}".`
  );
}

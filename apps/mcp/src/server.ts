/**
 * Builds the Plunk MCP server.
 *
 * Kept separate from the stdio entry point so the same builder serves the
 * future HTTP transport and the in-process tests without modification.
 */

import {McpServer} from '@modelcontextprotocol/server';

import {PlunkClient} from './client.js';
import type {PlunkMcpConfig} from './config.js';
import {ProjectRouter} from './projects.js';
import {registerCampaignTools} from './tools/campaigns.js';
import {registerContactTools} from './tools/contacts.js';
import {registerDomainTools} from './tools/domains.js';
import {registerEmailTools} from './tools/email.js';
import {registerEventTools} from './tools/events.js';
import {registerSegmentTools} from './tools/segments.js';
import {registerTemplateTools} from './tools/templates.js';
import {registerWorkflowTools} from './tools/workflows.js';
import type {ToolContext} from './tools/shared.js';

export const SERVER_NAME = 'plunk';
export const SERVER_VERSION = '0.16.0';

const INSTRUCTIONS = [
  'Plunk is an email platform: transactional email, contacts, segments, campaigns and automation.',
  '',
  'Two things to get right:',
  '',
  '1. **Transactional vs campaign.** `plunk_send_email` is for a one-off message to specific people.',
  '   Reaching a whole list or segment means `plunk_create_campaign` then `plunk_send_campaign`.',
  '   Do not loop `plunk_send_email` over an audience.',
  '',
  '2. **Sends are irreversible.** Sending a campaign cannot be undone, so `plunk_send_campaign` will',
  '   ask the user to confirm and will show them the recipient count. Do not try to work around that',
  '   prompt. Prefer `plunk_test_campaign` to send the user a single copy for review before any bulk',
  '   send. If a send is already scheduled or in flight, `plunk_cancel_campaign` stops the remainder.',
  '',
  'Sender addresses must be on a domain verified for the project, or the send is rejected — check with',
  '`plunk_list_domains` when you are choosing a `from` address or a send was refused.',
  '',
  'To act on a contact the user identified by email address, pass that address to the contact tools',
  'directly. `plunk_get_contact`, `plunk_subscribe_contact` and `plunk_unsubscribe_contact` all accept',
  '`email` as well as `id`, so there is no need to search for the ID first.',
  '',
  'Workflows run per contact when that contact triggers an event. `plunk_create_workflow` creates one',
  'disabled; build it with `plunk_add_workflow_steps` (every step type, conditions included), review it',
  'with `plunk_check_workflow`, then `plunk_set_workflow_enabled` turns it on and asks the user to',
  'confirm when it sends email.',
].join('\n');

function projectInstructions(names: string[]): string {
  return [
    '',
    `This server is connected to ${names.length} Plunk projects: ${names.map((n) => `\`${n}\``).join(', ')}.`,
    'Every tool takes a `project` argument naming the one it acts on. IDs belong to a single project, so pass',
    'the same `project` you used to look an ID up. If the user has not made clear which project they mean,',
    'ask rather than guessing — a send to the wrong project reaches the wrong audience.',
  ].join('\n');
}

export function buildServer(config: PlunkMcpConfig): McpServer {
  const projects = new ProjectRouter(config);
  const names = projects.names;

  const server = new McpServer(
    {name: SERVER_NAME, version: SERVER_VERSION},
    {
      capabilities: {tools: {}},
      instructions: names.length > 0 ? INSTRUCTIONS + projectInstructions(names) : INSTRUCTIONS,
    },
  );

  const client = new PlunkClient(config.apiUrl, () => projects.current());
  const ctx: ToolContext = {server, readOnly: config.readOnly, projects};

  // Registration order is stable, which keeps `tools/list` deterministic as the
  // spec asks and keeps client-side prompt caches warm across restarts.
  registerContactTools(ctx, client);
  registerEmailTools(ctx, client);
  registerEventTools(ctx, client);
  registerTemplateTools(ctx, client);
  registerCampaignTools(ctx, client);
  registerSegmentTools(ctx, client);
  registerDomainTools(ctx, client);
  registerWorkflowTools(ctx, client);

  return server;
}

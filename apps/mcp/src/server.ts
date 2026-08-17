/**
 * Builds the Plunk MCP server.
 *
 * Kept separate from the stdio entry point so the same builder serves the
 * future HTTP transport and the in-process tests without modification.
 */

import {McpServer} from '@modelcontextprotocol/server';

import {PlunkClient} from './client.js';
import type {PlunkMcpConfig} from './config.js';
import {registerCampaignTools} from './tools/campaigns.js';
import {registerContactTools} from './tools/contacts.js';
import {registerDomainTools} from './tools/domains.js';
import {registerEmailTools} from './tools/email.js';
import {registerEventTools} from './tools/events.js';
import {registerSegmentTools} from './tools/segments.js';
import {registerTemplateTools} from './tools/templates.js';
import type {ToolContext} from './tools/shared.js';

export const SERVER_NAME = 'plunk';
export const SERVER_VERSION = '0.14.0';

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
].join('\n');

export function buildServer(config: PlunkMcpConfig): McpServer {
  const server = new McpServer(
    {name: SERVER_NAME, version: SERVER_VERSION},
    {capabilities: {tools: {}}, instructions: INSTRUCTIONS},
  );

  const client = new PlunkClient(config);
  const ctx: ToolContext = {server, readOnly: config.readOnly};

  // Registration order is stable, which keeps `tools/list` deterministic as the
  // spec asks and keeps client-side prompt caches warm across restarts.
  registerContactTools(ctx, client);
  registerEmailTools(ctx, client);
  registerEventTools(ctx, client);
  registerTemplateTools(ctx, client);
  registerCampaignTools(ctx, client);
  registerSegmentTools(ctx, client);
  registerDomainTools(ctx, client);

  return server;
}

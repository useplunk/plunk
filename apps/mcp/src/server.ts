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
import {registerEmailTools} from './tools/email.js';
import {registerEventTools} from './tools/events.js';
import {registerSegmentTools} from './tools/segments.js';
import {registerTemplateTools} from './tools/templates.js';
import type {ToolContext} from './tools/shared.js';

export const SERVER_NAME = 'plunk';
export const SERVER_VERSION = '0.13.0';

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
  '   prompt. Prefer showing the user a draft, or sending a single test with `plunk_send_email`,',
  '   before any bulk send.',
  '',
  'Sender addresses must be on a domain verified for the project, or the send is rejected.',
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

  return server;
}

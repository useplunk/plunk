import * as z from 'zod';

import type {PlunkClient} from '../client.js';
import {EMAIL_TYPES} from '../schemas.js';

import {jsonResult, paginationHint, register, runTool, type ToolContext} from './shared.js';

interface TemplateList {
  data: unknown[];
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

export function registerTemplateTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_list_templates',
    {
      title: 'List templates',
      description: [
        '**Purpose:** List reusable email templates in the project.',
        '',
        '**NOT for:** Listing campaigns (use `plunk_list_campaigns`). A template is reusable content;',
        'a campaign is one send to an audience.',
        '',
        '**Returns:** A page of templates with their IDs, names, subjects and types.',
        '',
        '**When to use:** Before `plunk_send_email` with a `template`, to find the right template ID.',
        '',
        '**Key trigger phrases:** "what templates do I have", "list my templates"',
      ].join('\n'),
      inputSchema: z.object({
        search: z.string().optional().describe('Substring match on the template name.'),
        type: z.enum(EMAIL_TYPES).optional().describe('Filter by template type.'),
        limit: z.number().int().min(1).max(100).default(20).describe('Items per page (max 100).'),
        cursor: z.string().optional().describe('Cursor from a previous page.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({search, type, limit, cursor}) =>
      runTool(async () => {
        const result = await client.request<TemplateList>({
          path: '/templates',
          query: {search, type, limit, cursor},
        });

        return jsonResult(
          `Found ${result.data.length} template(s).${paginationHint(result.hasMore, result.cursor)}`,
          result,
        );
      }),
  );

  register(
    ctx,
    'plunk_create_template',
    {
      title: 'Create template',
      description: [
        '**Purpose:** Create a reusable email template. Templates can be rendered by `plunk_send_email`',
        'and reused by automation workflows.',
        '',
        '**NOT for:** Sending anything. Creating a template sends no email to anyone.',
        '',
        '**Returns:** The created template including its ID.',
        '',
        '**Body:** HTML. Use `{{variable}}` placeholders to interpolate contact data at send time —',
        'for example `{{name}}` or `{{data.plan}}`.',
        '',
        '**Requirements:** `from` must be on a domain verified for this project, or sending will fail later.',
        '',
        '**Key trigger phrases:** "create a template", "save this email for reuse"',
      ].join('\n'),
      inputSchema: z.object({
        name: z.string().describe('Internal name for the template. Not shown to recipients.'),
        subject: z.string().describe('Subject line. May contain {{variable}} placeholders.'),
        body: z.string().describe('HTML body. May contain {{variable}} placeholders.'),
        from: z.string().describe('Sender address. Must be on a verified domain.'),
        fromName: z.string().optional().describe('Sender display name.'),
        replyTo: z.string().optional().describe('Reply-to address.'),
        description: z.string().optional().describe('Internal note. Not sent to recipients.'),
        type: z.enum(EMAIL_TYPES).default('MARKETING').describe('Template type.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async (input) =>
      runTool(async () => {
        const template = await client.request({method: 'POST', path: '/templates', body: input});
        return jsonResult('Template created:', template);
      }),
  );
}

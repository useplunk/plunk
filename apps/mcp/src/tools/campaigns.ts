import * as z from 'zod';

import type {PlunkClient} from '../client.js';
import {EMAIL_TYPES, FILTER_HELP, filterCondition} from '../schemas.js';

import {
  errorResult,
  jsonResult,
  paginationHint,
  register,
  requireConfirmation,
  runTool,
  type ToolContext,
} from './shared.js';

interface CampaignList {
  data: unknown[];
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

interface Campaign {
  id: string;
  name?: string;
  subject?: string;
  status?: string;
  audienceType?: string;
  /** What the API actually returns. `recipientCount` is accepted as a fallback. */
  totalRecipients?: number;
  recipientCount?: number;
}

export function registerCampaignTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_list_campaigns',
    {
      title: 'List campaigns',
      description: [
        '**Purpose:** List campaigns and their status (draft, scheduled, sending, sent).',
        '',
        '**NOT for:** Listing templates (use `plunk_list_templates`).',
        '',
        '**Returns:** A page of campaigns with IDs, names, subjects, audience and status.',
        '',
        '**When to use:** To find a campaign ID before sending, or to report on what has gone out.',
        '',
        '**Key trigger phrases:** "my campaigns", "what did I send", "is the campaign scheduled"',
      ].join('\n'),
      inputSchema: z.object({
        search: z.string().optional().describe('Substring match on campaign name.'),
        status: z.string().optional().describe('Filter by status, e.g. DRAFT or SENT.'),
        limit: z.number().int().min(1).max(100).default(20).describe('Items per page (max 100).'),
        cursor: z.string().optional().describe('Cursor from a previous page.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({search, status, limit, cursor}) =>
      runTool(async () => {
        const result = await client.request<CampaignList>({
          path: '/campaigns',
          query: {search, status, limit, cursor},
        });

        return jsonResult(
          `Found ${result.data.length} campaign(s).${paginationHint(result.hasMore, result.cursor)}`,
          result,
        );
      }),
  );

  register(
    ctx,
    'plunk_create_campaign',
    {
      title: 'Create campaign',
      description: [
        '**Purpose:** Create a campaign — one email addressed to a whole audience. Creating it does',
        '**not** send it; it starts as a draft and goes out only via `plunk_send_campaign`.',
        '',
        '**NOT for:** Emailing one or a few named people (use `plunk_send_email`).',
        '',
        '**Returns:** The created campaign including its ID and resolved audience size.',
        '',
        '**Audience:**',
        '- `ALL` — every subscribed contact',
        '- `SEGMENT` — one existing segment; requires `segmentId` (find one with `plunk_list_segments`)',
        '- `FILTERED` — an inline filter tree; requires `audienceCondition`',
        '',
        FILTER_HELP,
        '',
        '**Key trigger phrases:** "create a campaign", "draft a newsletter", "email my whole list"',
      ].join('\n'),
      inputSchema: z.object({
        name: z.string().describe('Internal campaign name.'),
        subject: z.string().describe('Subject line.'),
        body: z.string().describe('HTML body.'),
        from: z.string().describe('Sender address. Must be on a verified domain.'),
        fromName: z.string().optional().describe('Sender display name.'),
        replyTo: z.string().optional().describe('Reply-to address.'),
        description: z.string().optional().describe('Internal note.'),
        type: z.enum(EMAIL_TYPES).default('MARKETING').describe('Content type.'),
        audienceType: z.enum(['ALL', 'SEGMENT', 'FILTERED']).describe('Who receives this campaign.'),
        segmentId: z.string().optional().describe('Segment ID. Required when audienceType is SEGMENT.'),
        audienceCondition: z
          .optional(filterCondition)
          .describe('Inline filter tree. Required when audienceType is FILTERED.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async (input) =>
      runTool(async () => {
        if (input.audienceType === 'SEGMENT' && !input.segmentId) {
          return errorResult(
            'audienceType is SEGMENT but no segmentId was given. Call plunk_list_segments to find the segment ID.',
          );
        }

        if (input.audienceType === 'FILTERED' && !input.audienceCondition) {
          return errorResult('audienceType is FILTERED but no audienceCondition was given.');
        }

        const campaign = await client.request<Campaign>({method: 'POST', path: '/campaigns', body: input});

        return jsonResult(
          'Campaign created as a draft. It has NOT been sent — use plunk_send_campaign to send it.',
          campaign,
        );
      }),
  );

  register(
    ctx,
    'plunk_send_campaign',
    {
      title: 'Send or schedule campaign',
      description: [
        '**Purpose:** Send an existing campaign to its entire audience, now or at a scheduled time.',
        '',
        '**NOT for:** Testing what a campaign looks like — that reaches every recipient. Send yourself',
        'a copy with `plunk_send_email` first if the user wants a preview.',
        '',
        '**Returns:** The campaign with its updated status and recipient count.',
        '',
        '**This is irreversible.** Once sending starts the email cannot be recalled. This tool always',
        'asks the user to confirm before it proceeds, and will report the recipient count in that prompt.',
        '',
        '**Key trigger phrases:** "send the campaign", "send it now", "schedule the newsletter"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The campaign ID to send.'),
        scheduledFor: z
          .string()
          .optional()
          .describe('ISO 8601 timestamp to schedule the send. Omit to send immediately.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true},
    },
    async ({id, scheduledFor}, context) =>
      runTool(async () => {
        // Read the campaign first so the confirmation names the real audience
        // size — "send to 43,812 people" is a very different decision from
        // "send campaign abc123", and the user should see which one this is.
        const campaign = await client.request<Campaign>({path: `/campaigns/${encodeURIComponent(id)}`});

        const recipients = campaign.totalRecipients ?? campaign.recipientCount;

        const audience =
          typeof recipients === 'number'
            ? `${recipients.toLocaleString()} recipients`
            : `its ${campaign.audienceType ?? 'configured'} audience`;

        const when = scheduledFor ? `scheduled for ${scheduledFor}` : 'sent immediately';

        const pending = requireConfirmation(
          context as {mcpReq?: {inputResponses?: unknown}},
          'confirm_campaign_send',
          `Send campaign "${campaign.name ?? id}" (subject: "${campaign.subject ?? '—'}") to ${audience}? ` +
            `It will be ${when}. This cannot be undone.`,
        );

        if (pending) {
          return pending;
        }

        const result = await client.request({
          method: 'POST',
          path: `/campaigns/${encodeURIComponent(id)}/send`,
          body: scheduledFor ? {scheduledFor} : {},
        });

        return jsonResult(scheduledFor ? `Campaign scheduled for ${scheduledFor}.` : 'Campaign sending.', result);
      }),
  );
}

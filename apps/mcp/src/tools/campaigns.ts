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

/**
 * The single-campaign routes wrap their payload as `{success, data}` while
 * `GET /campaigns` returns the page unwrapped. Reading through the envelope in
 * one place keeps that inconsistency out of the individual tools — and matters
 * for more than tidiness: the send confirmation reads the recipient count off
 * this object, and silently showed "its SEGMENT audience" for every campaign
 * while it was reading the envelope instead of the campaign.
 */
async function getCampaign(client: PlunkClient, id: string): Promise<Campaign> {
  const response = await client.request<Campaign | {success: boolean; data: Campaign}>({
    path: `/campaigns/${encodeURIComponent(id)}`,
  });

  return response && 'data' in response ? response.data : (response as Campaign);
}

/** Unwraps the same `{success, data}` envelope for any single-campaign payload. */
function unwrap<T>(response: T | {success: boolean; data: T}): T {
  return response && typeof response === 'object' && 'data' in response
    ? (response as {data: T}).data
    : (response as T);
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

        const campaign = unwrap(
          await client.request<Campaign | {success: boolean; data: Campaign}>({
            method: 'POST',
            path: '/campaigns',
            body: input,
          }),
        );

        return jsonResult(
          `Campaign created as a draft (id: ${campaign.id}). It has NOT been sent — send yourself a ` +
            'copy with plunk_test_campaign first, then use plunk_send_campaign to send it.',
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
        '**NOT for:** Testing what a campaign looks like — that reaches every recipient. Use',
        '`plunk_test_campaign` to send a single copy to a project member first.',
        '',
        '**Before calling this,** it is worth confirming the audience is what the user expects:',
        '`plunk_get_campaign` reports `totalRecipients`, and cancelling afterwards only stops whatever',
        'has not gone out yet.',
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
        const campaign = await getCampaign(client, id);

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

  register(
    ctx,
    'plunk_get_campaign',
    {
      title: 'Get campaign',
      description: [
        '**Purpose:** Fetch one campaign in full — its subject, body, sender, audience configuration',
        'and current status.',
        '',
        '**NOT for:** Delivery numbers on a campaign that has already gone out — use',
        '`plunk_get_campaign_stats` for opens, clicks and bounces.',
        '',
        '**Returns:** The campaign record, including `status` (DRAFT, SCHEDULED, SENDING, SENT,',
        'CANCELLED) and `totalRecipients`.',
        '',
        '**When to use:**',
        '- Before sending, to check what the campaign actually says and who it targets',
        '- To read the current status after scheduling or cancelling',
        '',
        '**Key trigger phrases:** "show me the campaign", "what does it say", "is it scheduled"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The campaign ID, as returned by plunk_list_campaigns.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const campaign = await getCampaign(client, id);
        return jsonResult('Campaign:', campaign);
      }),
  );

  register(
    ctx,
    'plunk_test_campaign',
    {
      title: 'Send campaign test',
      description: [
        '**Purpose:** Send one copy of a campaign to a project member so a human can check it before',
        'it reaches the real audience. This is the safe pre-flight step before `plunk_send_campaign`.',
        '',
        '**NOT for:** Reaching the campaign audience (that is `plunk_send_campaign`), and not a way to',
        'email an arbitrary address — see the restriction below.',
        '',
        '**Returns:** Confirmation that the test was sent.',
        '',
        '**The recipient must be a member of the Plunk project.** Any other address is rejected with a',
        '403. Ask the user which of their project addresses to send to rather than guessing.',
        '',
        '**This sends a real email** and counts toward the project send quota, so send one test and',
        'wait for the user to review it rather than firing several.',
        '',
        '**Key trigger phrases:** "send me a test", "preview it first", "check it before sending"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The campaign ID to test.'),
        email: z
          .string()
          .describe('Address to send the test to. Must belong to a member of this Plunk project.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({id, email}) =>
      runTool(async () => {
        await client.request({
          method: 'POST',
          path: `/campaigns/${encodeURIComponent(id)}/test`,
          body: {email},
        });

        return jsonResult(
          `Test email sent to ${email}. Ask the user to review it before calling plunk_send_campaign.`,
          {id, testSentTo: email},
        );
      }),
  );

  register(
    ctx,
    'plunk_cancel_campaign',
    {
      title: 'Cancel campaign',
      description: [
        '**Purpose:** Stop a campaign that is scheduled or currently sending.',
        '',
        '**NOT for:** Deleting a campaign, or for a campaign that has already finished — only',
        'SCHEDULED and SENDING campaigns can be cancelled, anything else returns a 400.',
        '',
        '**Returns:** The campaign with `status: CANCELLED`.',
        '',
        '**Cancelling is one-way.** A cancelled campaign cannot be un-cancelled or resumed; it has to',
        'be duplicated and sent again. For a campaign already SENDING, email that has gone out stays',
        'out — cancelling only stops the remainder.',
        '',
        '**Key trigger phrases:** "cancel the campaign", "stop the send", "call it off", "unschedule it"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The campaign ID to cancel.'),
      }),
      // Deliberately not behind requireConfirmation: this is the emergency stop
      // for a send in flight, and every second spent on an elicitation round
      // trip is more email delivered. It is marked destructive so clients can
      // still prompt if they want to.
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const result = unwrap(
          await client.request<Campaign | {success: boolean; data: Campaign}>({
            method: 'POST',
            path: `/campaigns/${encodeURIComponent(id)}/cancel`,
          }),
        );

        return jsonResult('Campaign cancelled. It cannot be resumed.', result);
      }),
  );

  register(
    ctx,
    'plunk_get_campaign_stats',
    {
      title: 'Get campaign stats',
      description: [
        '**Purpose:** Read delivery and engagement numbers for a campaign that has been sent.',
        '',
        '**NOT for:** Project-wide reporting across campaigns — this covers one campaign only.',
        '',
        '**Returns:** `totalRecipients`, `sentCount`, `deliveredCount`, `openedCount`, `clickedCount`,',
        '`bouncedCount`, plus `openRate`, `clickRate`, `bounceRate` and `deliveryRate` as percentages.',
        '',
        '**Interpreting it:** rates are percentages of `sentCount`, not of `totalRecipients`, so a',
        'campaign still sending will show rates against the portion sent so far. A campaign that has',
        'not been sent returns zeroes rather than an error.',
        '',
        '**Key trigger phrases:** "how did it do", "open rate", "did it bounce", "campaign performance"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The campaign ID to report on.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const stats = unwrap(
          await client.request<unknown>({path: `/campaigns/${encodeURIComponent(id)}/stats`}),
        );

        return jsonResult('Campaign stats:', stats);
      }),
  );
}

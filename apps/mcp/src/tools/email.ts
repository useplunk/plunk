import * as z from 'zod';

import type {PlunkClient} from '../client.js';

import {jsonResult, register, requireConfirmation, runTool, type ToolContext} from './shared.js';

/** Above this many recipients a single send is treated as a bulk action. */
const BULK_RECIPIENT_THRESHOLD = 1;

const recipient = z.union([
  z.string().describe('Email address'),
  z.object({
    name: z.string().optional().describe('Recipient display name'),
    email: z.string().describe('Recipient email address'),
  }),
]);

const scheduleAt = z
  .string()
  .describe(
    'When to send, as an ISO 8601 date with a timezone (e.g. "2026-11-01T09:00:00Z"), up to 30 days ahead. ' +
      'A time that is not in the future sends now.',
  );

const delivery = z
  .object({
    at: scheduleAt.optional(),
    throttle: z
      .union([
        z.string().describe('Window, e.g. "24h": send this notification to a recipient at most once per window.'),
        z.object({
          window: z
            .string()
            .optional()
            .describe('"30m", "24h", "7d" (1 minute to 365 days). Omit to send it at most once, ever.'),
          key: z
            .string()
            .optional()
            .describe(
              'Narrows the notification beyond its template, e.g. an organisation id. Required without a template.',
            ),
          scope: z
            .enum(['recipient', 'project'])
            .optional()
            .describe('"recipient" (default) holds it per person; "project" holds it once for everyone.'),
        }),
      ])
      .optional(),
  })
  .describe(
    'When, and whether, the email goes out. `at` schedules it; `throttle` skips it when the same ' +
      'notification already went to the recipient within the window (reported as status "throttled").',
  );

const sender = z.union([
  z.string().describe('Sender email address'),
  z.object({
    name: z.string().optional().describe('Sender display name'),
    email: z.string().describe('Sender email address'),
  }),
]);

export function registerEmailTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_send_email',
    {
      title: 'Send transactional email',
      description: [
        '**Purpose:** Send a one-off transactional email to one or a few specific recipients, now or at a',
        'scheduled time (`delivery.at`), optionally at most once per period (`delivery.throttle`).',
        '',
        '**NOT for:** Sending the same email to a whole list, segment, or audience — use',
        '`plunk_create_campaign` followed by `plunk_send_campaign`. Sending to more than a handful of',
        'people through this tool is the wrong shape and will hit the send rate limit.',
        '',
        '**Returns:** Per recipient: the contact, the email ID, and a `status` of "queued", "scheduled"',
        '(with `scheduledFor`) or "throttled" (with `nextAllowedAt`; nothing was sent).',
        '',
        '**When to use:**',
        '- One-off messages to named people: password reset, receipt, alert, reply',
        '- Testing what a template renders like for a specific recipient',
        '',
        '**Requirements:** Either `template`, or both `subject` and `body`. The `from` address must be',
        'on a verified domain unless the template already sets one.',
        '',
        '**This cannot be undone once sent.** Sending to multiple recipients asks for confirmation first.',
        'A scheduled email can be cancelled with `plunk_cancel_email` until it goes out.',
        '',
        '**Key trigger phrases:** "send an email", "email this to", "notify", "send them a message"',
      ].join('\n'),
      inputSchema: z.object({
        to: z
          .union([recipient, z.array(recipient)])
          .describe('Recipient(s): an email string, a {name, email} object, or an array of either.'),
        subject: z
          .string()
          .max(998)
          .optional()
          .describe('Subject line. Required unless `template` is given. Cannot contain newlines.'),
        body: z.string().optional().describe('HTML body. Required unless `template` is given.'),
        template: z
          .string()
          .optional()
          .describe('Template ID to render. Its subject/body/from are used unless you override them here.'),
        from: sender.optional().describe('Sender address. Must be on a verified domain.'),
        reply: z.string().optional().describe('Reply-to address.'),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Variables for template rendering, and custom data stored on the contact.'),
        subscribed: z
          .boolean()
          .optional()
          .describe('Set the subscription state of the recipient contact as part of this send.'),
        delivery: delivery.optional(),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({to, subject, body, template, from, reply, data, subscribed, delivery}, context) =>
      runTool(async () => {
        if (!template && (!subject || !body)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Provide either a `template` ID, or both `subject` and `body`. Neither was supplied.',
              },
            ],
            isError: true,
          };
        }

        const recipients = Array.isArray(to) ? to : [to];

        if (recipients.length > BULK_RECIPIENT_THRESHOLD) {
          const addresses = recipients
            .map((r) => (typeof r === 'string' ? r : r.email))
            .slice(0, 10)
            .join(', ');

          const pending = requireConfirmation(
            context as {mcpReq?: {inputResponses?: unknown}},
            'confirm_send',
            `Send this email to ${recipients.length} recipients (${addresses}${
              recipients.length > 10 ? ', …' : ''
            })? This cannot be undone.`,
          );

          if (pending) {
            return pending;
          }
        }

        const result = await client.request({
          method: 'POST',
          path: '/v1/send',
          body: {to, subject, body, template, from, reply, data, subscribed, delivery},
        });

        return jsonResult(
          delivery ? `Processed ${recipients.length} recipient(s); see each status.` : `Sent to ${recipients.length} recipient(s).`,
          result,
        );
      }),
  );

  register(
    ctx,
    'plunk_get_email',
    {
      title: 'Get email',
      description: [
        '**Purpose:** Look up one email by ID: its status, and when it is scheduled for or was sent.',
        '',
        '**Returns:** id, status (SCHEDULED, PENDING, SENT, DELIVERED, CANCELLED, …), subject, contact,',
        '`scheduledFor`, `sentAt`.',
        '',
        '**Key trigger phrases:** "did that email go out", "when is it scheduled", "status of email"',
      ].join('\n'),
      inputSchema: z.object({id: z.string().describe('Email ID, as returned by `plunk_send_email`.')}),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const email = await client.request({path: `/emails/${encodeURIComponent(id)}`});
        return jsonResult('Email:', email);
      }),
  );

  register(
    ctx,
    'plunk_reschedule_email',
    {
      title: 'Reschedule email',
      description: [
        '**Purpose:** Move a scheduled transactional email to another time before it goes out.',
        '',
        '**NOT for:** Changing its content — cancel it with `plunk_cancel_email` and send a new one.',
        '',
        '**Fails** once the email is sending, sent or cancelled.',
        '',
        '**Key trigger phrases:** "send it later instead", "move the email to", "postpone"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('Email ID of a scheduled email.'),
        at: scheduleAt,
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id, at}) =>
      runTool(async () => {
        const email = await client.request({
          method: 'PATCH',
          path: `/emails/${encodeURIComponent(id)}`,
          body: {delivery: {at}},
        });
        return jsonResult('Rescheduled:', email);
      }),
  );

  register(
    ctx,
    'plunk_cancel_email',
    {
      title: 'Cancel scheduled email',
      description: [
        '**Purpose:** Cancel a scheduled transactional email before it goes out. It is not sent or billed.',
        '',
        '**NOT for:** Recalling an email that was already sent — that is not possible.',
        '',
        '**Fails** once the email is sending, sent or cancelled.',
        '',
        '**Key trigger phrases:** "cancel that email", "don\'t send it", "unschedule"',
      ].join('\n'),
      inputSchema: z.object({id: z.string().describe('Email ID of a scheduled email.')}),
      // Like cancelling a campaign, it cannot be undone: the email can only be sent again
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const email = await client.request({method: 'POST', path: `/emails/${encodeURIComponent(id)}/cancel`});
        return jsonResult('Cancelled:', email);
      }),
  );

  register(
    ctx,
    'plunk_verify_email',
    {
      title: 'Verify email address',
      description: [
        '**Purpose:** Check whether an email address is deliverable before adding or sending to it.',
        'Checks syntax, disposable-domain lists, and MX records, and suggests a correction for likely typos.',
        '',
        '**NOT for:** Checking whether someone is already a contact (use `plunk_list_contacts`).',
        'This sends nothing and creates nothing.',
        '',
        '**Returns:** `valid`, `isDisposable`, `hasMxRecords`, an optional `suggestedEmail`, and reasons.',
        '',
        '**Key trigger phrases:** "is this email valid", "check this address", "did they typo their email"',
      ].join('\n'),
      inputSchema: z.object({
        email: z.string().describe('The email address to verify.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({email}) =>
      runTool(async () => {
        const result = await client.request({method: 'POST', path: '/v1/verify', body: {email}});
        return jsonResult('Verification result:', result);
      }),
  );
}

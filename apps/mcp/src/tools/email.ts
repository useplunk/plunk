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
        '**Purpose:** Send a one-off transactional email immediately to one or a few specific recipients.',
        '',
        '**NOT for:** Sending the same email to a whole list, segment, or audience — use',
        '`plunk_create_campaign` followed by `plunk_send_campaign`. Sending to more than a handful of',
        'people through this tool is the wrong shape and will hit the send rate limit.',
        '',
        '**Returns:** The created email records with their IDs and the resolved contacts.',
        '',
        '**When to use:**',
        '- One-off messages to named people: password reset, receipt, alert, reply',
        '- Testing what a template renders like for a specific recipient',
        '',
        '**Requirements:** Either `template`, or both `subject` and `body`. The `from` address must be',
        'on a verified domain unless the template already sets one.',
        '',
        '**This cannot be undone once sent.** Sending to multiple recipients asks for confirmation first.',
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
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({to, subject, body, template, from, reply, data, subscribed}, context) =>
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
          body: {to, subject, body, template, from, reply, data, subscribed},
        });

        return jsonResult(`Sent to ${recipients.length} recipient(s).`, result);
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

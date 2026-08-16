import * as z from 'zod';

import type {PlunkClient} from '../client.js';

import {jsonResult, register, runTool, type ToolContext} from './shared.js';

export function registerEventTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_track_event',
    {
      title: 'Track event',
      description: [
        '**Purpose:** Record that a contact did something ("user.signup", "order.placed"). Events are',
        'what trigger automation workflows, so this is how you start an automated sequence for someone.',
        'The contact is created if they do not exist yet.',
        '',
        '**NOT for:** Sending an email directly (use `plunk_send_email`). Tracking an event only',
        'records it — any email that follows comes from a workflow triggered by the event.',
        '',
        '**Returns:** The recorded event and the contact it was attached to.',
        '',
        '**When to use:**',
        '- The user wants to trigger a workflow for a specific person',
        '- Recording a lifecycle action against a contact',
        '',
        '**Key trigger phrases:** "track an event", "trigger the workflow", "mark them as signed up"',
      ].join('\n'),
      inputSchema: z.object({
        event: z.string().describe('Event name, e.g. "user.signup". Reused names group together.'),
        email: z.string().describe('Email address of the contact the event belongs to.'),
        subscribed: z
          .boolean()
          .optional()
          .describe('Set the contact subscription state as part of tracking this event.'),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Custom fields to store on the contact, e.g. {"plan":"pro"}.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({event, email, subscribed, data}) =>
      runTool(async () => {
        // `/v1/track` takes an email and upserts the contact, but it is the one
        // endpoint that requires the public key. With only a secret key we have
        // to reproduce it: upsert the contact to get an ID, then track against
        // that ID via the secret-key event endpoint.
        if (client.hasPublicKey) {
          const result = await client.request({
            method: 'POST',
            path: '/v1/track',
            body: {event, email, subscribed, data},
            usePublicKey: true,
          });

          return jsonResult(`Tracked "${event}" for ${email}.`, result);
        }

        const contact = await client.request<{id: string}>({
          method: 'POST',
          path: '/contacts',
          body: {email, subscribed: subscribed ?? true, data},
        });

        const result = await client.request({
          method: 'POST',
          path: '/events/track',
          body: {name: event, contactId: contact.id, data},
        });

        return jsonResult(`Tracked "${event}" for ${email}.`, result);
      }),
  );
}

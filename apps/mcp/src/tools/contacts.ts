import * as z from 'zod';

import type {PlunkClient} from '../client.js';

import {jsonResult, paginationHint, register, runTool, type ToolContext} from './shared.js';

interface ContactList {
  data: unknown[];
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

export function registerContactTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_list_contacts',
    {
      title: 'List contacts',
      description: [
        '**Purpose:** Browse or search the contacts in the Plunk project, with cursor pagination.',
        '',
        '**NOT for:** Looking up one contact whose ID you already have (use `plunk_get_contact`).',
        'Not for counting a campaign audience — create a segment instead.',
        '',
        '**Returns:** A page of contacts (id, email, subscribed, custom data), a `cursor` for the',
        'next page, `hasMore`, and `total`. `total` is only populated on the first page; later pages',
        'return 0 to avoid the recount cost.',
        '',
        '**When to use:**',
        '- The user asks who is on their list, or to find a contact by email',
        '- You need a contact ID before updating, deleting, or tracking an event',
        '',
        '**Key trigger phrases:** "who is subscribed", "find the contact", "look up", "my contacts"',
      ].join('\n'),
      inputSchema: z.object({
        search: z.string().optional().describe('Case-insensitive substring match on the email address.'),
        subscribed: z
          .boolean()
          .optional()
          .describe('Filter by subscription state. Omit to return both subscribed and unsubscribed contacts.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe('Items per page (max 100). Keep this small unless the user asked for a bulk export.'),
        cursor: z.string().optional().describe('Cursor from a previous page. Omit for the first page.'),
        sort: z.enum(['email', 'createdAt']).default('createdAt').describe('Column to sort by.'),
        dir: z.enum(['asc', 'desc']).default('desc').describe('Sort direction.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({search, subscribed, limit, cursor, sort, dir}) =>
      runTool(async () => {
        const result = await client.request<ContactList>({
          path: '/contacts',
          query: {search, subscribed, limit, cursor, sort, dir},
        });

        const summary =
          `Found ${result.data.length} contact(s)` +
          (result.total ? ` of ${result.total} total.` : '.') +
          paginationHint(result.hasMore, result.cursor);

        return jsonResult(summary, result);
      }),
  );

  register(
    ctx,
    'plunk_get_contact',
    {
      title: 'Get contact',
      description: [
        '**Purpose:** Fetch a single contact by its ID, including all custom data fields.',
        '',
        '**NOT for:** Searching by email address — use `plunk_list_contacts` with `search`.',
        '',
        '**Returns:** The contact record (id, email, subscribed, data, timestamps).',
        '',
        '**Key trigger phrases:** "show me this contact", "what data do we have on"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The contact ID (a UUID), as returned by plunk_list_contacts.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const contact = await client.request({path: `/contacts/${encodeURIComponent(id)}`});
        return jsonResult('Contact:', contact);
      }),
  );

  register(
    ctx,
    'plunk_create_contact',
    {
      title: 'Create or update contact',
      description: [
        '**Purpose:** Create a contact, or update it if the email already exists. This is an upsert,',
        'so it is safe to call when you are unsure whether the contact exists.',
        '',
        '**NOT for:** Changing the email address of an existing contact, or removing a data field —',
        'use `plunk_update_contact` for those.',
        '',
        '**Returns:** The created or updated contact, including its ID.',
        '',
        '**When to use:**',
        '- Adding someone to the list',
        '- Setting custom fields on a contact you may not have seen before',
        '',
        '**Key trigger phrases:** "add a contact", "subscribe", "add them to my list"',
      ].join('\n'),
      inputSchema: z.object({
        email: z.string().describe('Email address of the contact.'),
        subscribed: z.boolean().default(true).describe('Whether the contact is subscribed to marketing email.'),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Custom fields, e.g. {"plan":"pro","name":"Ada"}. Merged with any existing data.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({email, subscribed, data}) =>
      runTool(async () => {
        const contact = await client.request({
          method: 'POST',
          path: '/contacts',
          body: {email, subscribed, data},
        });

        return jsonResult('Contact created or updated:', contact);
      }),
  );

  register(
    ctx,
    'plunk_update_contact',
    {
      title: 'Update contact',
      description: [
        '**Purpose:** Change an existing contact by ID — its email, subscription state, or custom data.',
        '',
        '**NOT for:** Creating a contact (use `plunk_create_contact`).',
        '',
        '**Returns:** The updated contact.',
        '',
        '**Important:** Setting a key in `data` to null deletes that key. Fields you omit are left',
        'untouched. Changing the email to one already used by another contact fails with 409.',
        '',
        '**Key trigger phrases:** "unsubscribe them", "update their plan", "change their email"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The contact ID to update.'),
        email: z.string().optional().describe('New email address.'),
        subscribed: z.boolean().optional().describe('New subscription state.'),
        data: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Custom fields to merge. Set a key to null to delete that key.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id, email, subscribed, data}) =>
      runTool(async () => {
        const contact = await client.request({
          method: 'PATCH',
          path: `/contacts/${encodeURIComponent(id)}`,
          body: {email, subscribed, data},
        });

        return jsonResult('Contact updated:', contact);
      }),
  );

  register(
    ctx,
    'plunk_delete_contact',
    {
      title: 'Delete contact',
      description: [
        '**Purpose:** Permanently delete a contact and their event history.',
        '',
        '**NOT for:** Stopping email to someone while keeping their record — set `subscribed` to false',
        'with `plunk_update_contact` instead. That is almost always what the user actually wants,',
        'and unlike deletion it is reversible.',
        '',
        '**Returns:** Confirmation of deletion.',
        '',
        '**This cannot be undone.** Confirm with the user before calling it.',
        '',
        '**Key trigger phrases:** "delete this contact", "remove them entirely", "GDPR erase"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The contact ID to delete permanently.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        await client.request({method: 'DELETE', path: `/contacts/${encodeURIComponent(id)}`});
        return jsonResult('Contact deleted.', {id, deleted: true});
      }),
  );
}

/**
 * Sender-domain tools.
 *
 * Read-only on purpose. `POST /domains` and `DELETE /domains/:id` deliberately
 * skip the admin-role check when the caller authenticates with an API key
 * ("project-scoped by design"), so wrapping them would hand an agent authority
 * that a non-admin human member of the same project does not have. Listing and
 * verification status carry none of that, and they are the half that actually
 * prevents failed sends.
 */

import * as z from 'zod';

import type {PlunkClient} from '../client.js';

import {jsonResult, register, runTool, type ToolContext} from './shared.js';

interface Domain {
  id: string;
  domain: string;
  verified?: boolean;
}

export function registerDomainTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_list_domains',
    {
      title: 'List sender domains',
      description: [
        '**Purpose:** List the domains registered for the project and whether each one is verified.',
        'A `from` address is only accepted if its domain appears here **and** is verified.',
        '',
        '**NOT for:** Checking whether a recipient address is deliverable — that is `plunk_verify_email`.',
        'This is about the addresses you can send *from*, not the ones you send *to*.',
        '',
        '**Returns:** The project domains, each with `id`, `domain` and `verified`.',
        '',
        '**When to use:**',
        '- Before `plunk_send_email`, `plunk_create_campaign` or `plunk_create_template`, when you are',
        '  choosing or were given a `from` address — an unverified domain fails the send outright',
        '- The user asks what they can send from, or why a send was rejected',
        '',
        '**Key trigger phrases:** "what can I send from", "is my domain verified", "sender domain",',
        '"why was my email rejected"',
      ].join('\n'),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async () =>
      runTool(async () => {
        // The route carries a `:projectId` segment that the handler ignores —
        // it resolves the project from the API key instead. The segment still
        // has to be non-empty to match, so this passes a self-describing
        // placeholder rather than inventing an ID that looks real.
        const domains = await client.request<Domain[]>({path: '/domains/project/current'});

        const verified = domains.filter((entry) => entry.verified).map((entry) => entry.domain);

        const summary = verified.length
          ? `You can send from: ${verified.join(', ')}.`
          : 'No verified domains. Every send will be rejected until a domain is verified in the Plunk dashboard.';

        return jsonResult(summary, domains);
      }),
  );

  register(
    ctx,
    'plunk_check_domain',
    {
      title: 'Check domain verification',
      description: [
        '**Purpose:** Re-check the DNS verification status of one domain against the provider, and',
        'return what is still outstanding.',
        '',
        '**NOT for:** Adding or removing a domain — those are dashboard operations and are not exposed',
        'here. Point the user at Plunk → Settings → Domains for those.',
        '',
        '**Returns:** The current verification status for the domain.',
        '',
        '**Note:** This performs a live DNS check rather than reading a cached flag, so call it when',
        'the user has just added DNS records and wants to know whether they have propagated — not in a',
        'polling loop. DNS changes commonly take minutes to hours.',
        '',
        '**Key trigger phrases:** "check my DNS", "did the records propagate", "verify my domain now"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The domain ID, as returned by plunk_list_domains.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const status = await client.request({path: `/domains/${encodeURIComponent(id)}/verify`});
        return jsonResult('Domain verification status:', status);
      }),
  );
}

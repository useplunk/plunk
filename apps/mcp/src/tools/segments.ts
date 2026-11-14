import * as z from 'zod';

import type {PlunkClient} from '../client.js';
import {FILTER_HELP, filterCondition} from '../schemas.js';

import {errorResult, jsonResult, register, runTool, type ToolContext} from './shared.js';

export function registerSegmentTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_list_segments',
    {
      title: 'List segments',
      description: [
        '**Purpose:** List saved audience segments and their sizes.',
        '',
        '**NOT for:** Listing the contacts inside a segment — this returns the segments themselves.',
        '',
        '**Returns:** Every segment in the project, with IDs, names, types, conditions and cached member',
        'counts (`memberCount`).',
        '',
        '**When to use:** Before creating a `SEGMENT`-audience campaign, to find the segment ID and',
        'to show the user how many people it covers.',
        '',
        '**Key trigger phrases:** "what segments do I have", "my audiences", "how big is the segment"',
      ].join('\n'),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async () =>
      runTool(async () => {
        // GET /segments returns every segment as a bare array — it is not paginated.
        const segments = await client.request<unknown[]>({path: '/segments'});

        return jsonResult(`Found ${segments.length} segment(s).`, segments);
      }),
  );

  register(
    ctx,
    'plunk_create_segment',
    {
      title: 'Create segment',
      description: [
        '**Purpose:** Create a reusable audience segment. A `DYNAMIC` segment re-evaluates its filter',
        'continuously, so contacts join and leave automatically. A `STATIC` one holds a fixed membership',
        'you manage yourself.',
        '',
        '**NOT for:** Sending anything, and not needed for a one-off audience — a campaign can carry an',
        'inline filter via `audienceType: "FILTERED"` instead. Create a segment when the audience will',
        'be reused or when the user wants to see it in the dashboard.',
        '',
        '**Returns:** The created segment including its ID.',
        '',
        FILTER_HELP,
        '',
        '**Key trigger phrases:** "create a segment", "save this audience", "group of users who"',
      ].join('\n'),
      inputSchema: z.object({
        name: z.string().max(100).describe('Segment name.'),
        description: z.string().max(500).optional().describe('Optional description.'),
        type: z.enum(['DYNAMIC', 'STATIC']).default('DYNAMIC').describe('DYNAMIC re-evaluates; STATIC is fixed.'),
        condition: z.optional(filterCondition).describe('Filter tree. Required for DYNAMIC segments.'),
        trackMembership: z
          .boolean()
          .default(false)
          .describe(
            'Emit segment.<slug>.entry / .exit events as contacts join and leave. ' +
              'These can be used as workflow triggers.',
          ),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async (input) =>
      runTool(async () => {
        if (input.type === 'DYNAMIC' && !input.condition) {
          return errorResult(
            'A DYNAMIC segment needs a `condition` filter tree. Either supply one, or use type "STATIC".',
          );
        }

        const segment = await client.request({method: 'POST', path: '/segments', body: input});
        return jsonResult('Segment created:', segment);
      }),
  );
}

/**
 * Shared input schemas.
 *
 * These are written against the public HTTP API rather than imported from
 * `@plunk/shared`: that package is private and unpublished, and it is on zod 3
 * while the MCP SDK needs a zod 4 schema it can emit JSON Schema from. The API
 * is the contract here, and the contract test guards the duplication.
 */

import * as z from 'zod';

export const FILTER_OPERATORS = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
  'exists',
  'notExists',
  'within',
  'olderThan',
  'triggered',
  'triggeredWithin',
  'triggeredOlderThan',
  'notTriggered',
  'notTriggeredWithin',
  'memberOfSegment',
  'notMemberOfSegment',
] as const;

const filter = z.object({
  field: z
    .string()
    .describe(
      'Contact field to test. Custom fields use a "data." prefix (e.g. "data.plan"); standard fields are ' +
        '"email", "subscribed", "createdAt". Event operators take an event name here instead.',
    ),
  operator: z.enum(FILTER_OPERATORS).describe('Comparison operator.'),
  value: z
    .unknown()
    .optional()
    .describe(
      'Comparison value. Omit for exists/notExists/triggered/notTriggered. ' +
        'For time-window operators this is the number of `unit`s.',
    ),
  unit: z
    .enum(['days', 'hours', 'minutes'])
    .optional()
    .describe('Time unit for window operators (within, olderThan, triggeredWithin, …).'),
});

/**
 * The audience filter tree. Nesting is expressed with a recursive `conditions`
 * field, so the type has to be declared before it is fully defined.
 */
export interface FilterConditionInput {
  logic: 'AND' | 'OR';
  groups: {
    filters: z.infer<typeof filter>[];
    conditions?: FilterConditionInput;
  }[];
}

export const filterCondition: z.ZodType<FilterConditionInput> = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']).describe('How the groups combine.'),
    groups: z
      .array(
        z.object({
          filters: z.array(filter).describe('Filters inside a group are always combined with AND.'),
          conditions: z.optional(filterCondition).describe('Optional nested condition for deeper AND/OR trees.'),
        }),
      )
      .min(1),
  }),
) as z.ZodType<FilterConditionInput>;

/** Human-readable explanation of the filter tree, reused across tool descriptions. */
export const FILTER_HELP = [
  'Filters are a boolean tree: `logic` (AND/OR) combines `groups`, and the `filters` inside each group',
  'are always ANDed. Example — subscribed pro users who never opened anything in 30 days:',
  '{"logic":"AND","groups":[{"filters":[',
  '{"field":"subscribed","operator":"equals","value":true},',
  '{"field":"data.plan","operator":"equals","value":"pro"},',
  '{"field":"email.opened","operator":"notTriggeredWithin","value":30,"unit":"days"}]}]}',
].join('\n');

export const EMAIL_TYPES = ['TRANSACTIONAL', 'MARKETING', 'HEADLESS'] as const;

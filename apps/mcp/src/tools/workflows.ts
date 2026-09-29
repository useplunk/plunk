/**
 * Automation workflow tools.
 *
 * Covers the linear case — an event trigger followed by emails and delays —
 * which is what an agent is typically asked to set up. Branching steps
 * (CONDITION, WAIT_FOR_EVENT) and manual transition editing stay in the
 * dashboard's visual builder, where the graph is visible to a human.
 */

import * as z from 'zod';

import type {PlunkClient} from '../client.js';

import {errorResult, jsonResult, register, requireConfirmation, runTool, type ToolContext} from './shared.js';

/** `GET /workflows` is page-based, unlike the cursor-paginated contact/campaign lists. */
interface WorkflowList {
  data: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface WorkflowStep {
  id: string;
  type: string;
  name?: string;
}

interface Workflow {
  id: string;
  name?: string;
  enabled?: boolean;
  triggerConfig?: {eventName?: string} | null;
  steps?: WorkflowStep[];
}

interface ExecutionList {
  executions: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const EXECUTION_STATUSES = ['RUNNING', 'WAITING', 'COMPLETED', 'EXITED', 'FAILED', 'CANCELLED'] as const;

/** Upper bound the API enforces on a DELAY step (`WorkflowStepConfigSchemas.delay`). */
const MAX_DELAY: Record<'minutes' | 'hours' | 'days', number> = {
  minutes: 365 * 24 * 60,
  hours: 365 * 24,
  days: 365,
};

function pageHint(page: number, totalPages: number): string {
  return page < totalPages ? `\n\nMore results exist. For the next page, pass page=${page + 1}.` : '';
}

async function getWorkflow(client: PlunkClient, id: string): Promise<Workflow> {
  return client.request<Workflow>({path: `/workflows/${encodeURIComponent(id)}`});
}

export function registerWorkflowTools(ctx: ToolContext, client: PlunkClient): void {
  register(
    ctx,
    'plunk_list_workflows',
    {
      title: 'List workflows',
      description: [
        '**Purpose:** List automation workflows — sequences that run for a contact when they trigger',
        'an event — and whether each one is enabled.',
        '',
        '**NOT for:** Listing campaigns (use `plunk_list_campaigns`). A campaign is one send to an',
        'audience; a workflow runs per contact, every time its trigger event is tracked.',
        '',
        '**Returns:** A page of workflows with IDs, names, `enabled`, `triggerConfig.eventName`, and',
        'step and execution counts.',
        '',
        '**Key trigger phrases:** "my workflows", "my automations", "what sequences do I have"',
      ].join('\n'),
      inputSchema: z.object({
        search: z.string().optional().describe('Substring match on workflow name or description.'),
        status: z.enum(['active', 'disabled']).optional().describe('Only enabled (active) or disabled workflows.'),
        limit: z.number().int().min(1).max(100).default(20).describe('Items per page (max 100).'),
        page: z.number().int().min(1).default(1).describe('Page number, starting at 1.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({search, status, limit, page}) =>
      runTool(async () => {
        const result = await client.request<WorkflowList>({
          path: '/workflows',
          query: {search, status, page, pageSize: limit},
        });

        return jsonResult(
          `Found ${result.total} workflow(s); showing ${result.data.length}.` +
            pageHint(result.page, result.totalPages),
          result,
        );
      }),
  );

  register(
    ctx,
    'plunk_get_workflow',
    {
      title: 'Get workflow',
      description: [
        '**Purpose:** Fetch one workflow in full: its trigger event, every step, and the transitions',
        'that connect them.',
        '',
        '**NOT for:** Seeing which contacts are in the workflow — use `plunk_list_workflow_executions`.',
        '',
        '**Returns:** The workflow, with `steps[]`. Each step has `type` (TRIGGER, SEND_EMAIL, DELAY,',
        'WAIT_FOR_EVENT, CONDITION, EXIT, WEBHOOK, UPDATE_CONTACT), `config`, the linked `template`,',
        'and its `outgoingTransitions` / `incomingTransitions`.',
        '',
        '**Key trigger phrases:** "show me the workflow", "what does this automation do"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID, as returned by plunk_list_workflows.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const workflow = await getWorkflow(client, id);

        return jsonResult(
          `Workflow "${workflow.name ?? id}" is ${workflow.enabled ? 'enabled' : 'disabled'} and has ` +
            `${workflow.steps?.length ?? 0} step(s).`,
          workflow,
        );
      }),
  );

  register(
    ctx,
    'plunk_list_workflow_executions',
    {
      title: 'List workflow executions',
      description: [
        '**Purpose:** List the runs of one workflow — one execution per contact that entered it — with',
        'their status and the step each one is on.',
        '',
        '**NOT for:** Listing workflows themselves (use `plunk_list_workflows`).',
        '',
        '**Returns:** A page of executions, newest first, each with `status`, `contact` (id, email) and',
        '`currentStep`.',
        '',
        '**Key trigger phrases:** "who is in the workflow", "did the automation run", "failed runs"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID.'),
        status: z.enum(EXECUTION_STATUSES).optional().describe('Only executions in this status.'),
        limit: z.number().int().min(1).max(100).default(20).describe('Items per page (max 100).'),
        page: z.number().int().min(1).default(1).describe('Page number, starting at 1.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id, status, limit, page}) =>
      runTool(async () => {
        const result = await client.request<ExecutionList>({
          path: `/workflows/${encodeURIComponent(id)}/executions`,
          query: {status, page, pageSize: limit},
        });

        return jsonResult(
          `Found ${result.total} execution(s); showing ${result.executions.length}.` +
            pageHint(result.page, result.totalPages),
          result,
        );
      }),
  );

  register(
    ctx,
    'plunk_create_workflow',
    {
      title: 'Create workflow',
      description: [
        '**Purpose:** Create an automation workflow that starts whenever a contact triggers the given',
        'event. It is created **disabled**, with only its trigger step.',
        '',
        '**NOT for:** Sending anything now. Nothing runs until the workflow has steps and is enabled',
        'with `plunk_set_workflow_enabled`.',
        '',
        '**Returns:** The workflow and its `triggerStep`.',
        '',
        '**Next steps:** add steps in order with `plunk_add_workflow_step`, check the result with',
        '`plunk_get_workflow`, then enable it.',
        '',
        '**Key trigger phrases:** "create a workflow", "set up an automation", "welcome sequence"',
      ].join('\n'),
      inputSchema: z.object({
        name: z.string().min(1).max(100).describe('Workflow name.'),
        description: z.string().max(500).optional().describe('Internal note.'),
        eventName: z
          .string()
          .min(1)
          .describe('Event that starts the workflow for a contact, e.g. "user.signup" (see plunk_track_event).'),
        allowReentry: z
          .boolean()
          .optional()
          .describe('Let a contact enter the workflow again after a previous run. Defaults to false.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({name, description, eventName, allowReentry}) =>
      runTool(async () => {
        // Always created disabled: enabling goes through plunk_set_workflow_enabled
        // so it gets the same confirmation as any other send.
        const created = await client.request<Workflow>({
          method: 'POST',
          path: '/workflows',
          body: {name, description, eventName, allowReentry, enabled: false},
        });

        // The create response does not include the trigger step the API adds,
        // and adding the next step needs to know it exists.
        const workflow = await getWorkflow(client, created.id);
        const triggerStep = workflow.steps?.find((step) => step.type === 'TRIGGER');

        return jsonResult(
          `Workflow created (id: ${created.id}), disabled. Add steps with plunk_add_workflow_step, then ` +
            'enable it with plunk_set_workflow_enabled.',
          {...workflow, triggerStep},
        );
      }),
  );

  register(
    ctx,
    'plunk_add_workflow_step',
    {
      title: 'Add workflow step',
      description: [
        '**Purpose:** Append a step to a workflow: send an email from a template, or wait.',
        '',
        '**NOT for:** Branching or event-wait steps — build those in the dashboard workflow builder.',
        '',
        '**Returns:** The created step including its ID.',
        '',
        '**Step types:**',
        '- `SEND_EMAIL` — requires `templateId` (find one with `plunk_list_templates`). Sends that',
        '  template to the contact in the workflow.',
        '- `DELAY` — requires `amount` and `unit` (minutes, hours or days; at most 365 days).',
        '',
        '**Ordering:** with `autoConnect` (default true) the step is linked after the current last step',
        '(the step with no outgoing transition), so calling this repeatedly builds a linear sequence.',
        '',
        '**Key trigger phrases:** "add an email to the workflow", "wait 2 days then", "add a delay"',
      ].join('\n'),
      inputSchema: z.object({
        workflowId: z.string().describe('The workflow ID.'),
        type: z.enum(['SEND_EMAIL', 'DELAY']).describe('Step type.'),
        name: z.string().min(1).max(100).optional().describe('Step name shown in the builder. Generated if omitted.'),
        templateId: z.string().optional().describe('Template ID. Required for SEND_EMAIL.'),
        amount: z.number().positive().optional().describe('Delay length. Required for DELAY.'),
        unit: z.enum(['minutes', 'hours', 'days']).optional().describe('Delay unit. Required for DELAY.'),
        autoConnect: z
          .boolean()
          .default(true)
          .describe('Link this step after the current last step. Set false to add an unconnected step.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({workflowId, type, name, templateId, amount, unit, autoConnect}) =>
      runTool(async () => {
        let config: Record<string, unknown>;
        let stepName = name;

        if (type === 'SEND_EMAIL') {
          if (!templateId) {
            return errorResult(
              'A SEND_EMAIL step needs a templateId. Call plunk_list_templates to find the template ID.',
            );
          }

          // The executor reads the template from the step relation and also
          // validates `config.templateId`, so both have to be set.
          config = {templateId};
          stepName ??= 'Send email';
        } else {
          if (amount === undefined || !unit) {
            return errorResult('A DELAY step needs both `amount` and `unit`.');
          }

          if (amount > MAX_DELAY[unit]) {
            return errorResult(`A delay cannot exceed 365 days (${MAX_DELAY[unit]} ${unit}).`);
          }

          config = {amount, unit};
          stepName ??= `Wait ${amount} ${unit}`;
        }

        const step = await client.request<WorkflowStep>({
          method: 'POST',
          path: `/workflows/${encodeURIComponent(workflowId)}/steps`,
          body: {
            type,
            name: stepName,
            // Required by the API; the dashboard lays the graph out itself.
            position: {x: 0, y: 0},
            config,
            templateId: type === 'SEND_EMAIL' ? templateId : undefined,
            autoConnect,
          },
        });

        return jsonResult(`Added ${type} step "${stepName}" (id: ${step.id}).`, step);
      }),
  );

  register(
    ctx,
    'plunk_set_workflow_enabled',
    {
      title: 'Enable or disable workflow',
      description: [
        '**Purpose:** Turn a workflow on or off.',
        '',
        '**Enabling** means every contact who triggers the workflow event from now on enters it and',
        'receives its emails. If the workflow has email steps this asks the user to confirm first.',
        'Events tracked before it was enabled do not start it.',
        '',
        '**Disabling** stops new contacts from entering. Executions already in progress continue to',
        'the end.',
        '',
        '**Returns:** The updated workflow.',
        '',
        '**Key trigger phrases:** "turn on the workflow", "activate the automation", "pause the sequence"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID.'),
        enabled: z.boolean().describe('true to enable, false to disable.'),
      }),
      // Reversible, so not destructive. Disabling is never gated: it is how a
      // user stops a workflow that is sending the wrong thing.
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id, enabled}, context) =>
      runTool(async () => {
        if (enabled) {
          const workflow = await getWorkflow(client, id);
          const emailSteps = workflow.steps?.filter((step) => step.type === 'SEND_EMAIL').length ?? 0;

          if (!workflow.enabled && emailSteps > 0) {
            const eventName = workflow.triggerConfig?.eventName ?? 'its trigger event';

            const pending = requireConfirmation(
              context as {mcpReq?: {inputResponses?: unknown}},
              'confirm_workflow_enable',
              `Enable workflow "${workflow.name ?? id}"? Every contact who triggers "${eventName}" from now on ` +
                `will enter it and can receive up to ${emailSteps} email(s). Sent emails cannot be recalled.`,
            );

            if (pending) {
              return pending;
            }
          }
        }

        const result = await client.request<Workflow>({
          method: 'PATCH',
          path: `/workflows/${encodeURIComponent(id)}`,
          body: {enabled},
        });

        return jsonResult(
          enabled ? 'Workflow enabled.' : 'Workflow disabled. Executions already in progress will finish.',
          result,
        );
      }),
  );
}

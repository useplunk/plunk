/**
 * Automation workflow tools.
 *
 * Covers building a workflow end to end — the trigger, every step type, condition
 * branches and the connections between steps — plus inspecting, checking and
 * running it. The graph rules (config validation, branches, open positions) live
 * in `workflow-graph.ts`; this module turns them into API calls.
 */

import * as z from 'zod';

import type {PlunkClient} from '../client.js';

import {resolveContact} from './contacts.js';
import {errorResult, jsonResult, register, requireConfirmation, runTool, type ToolContext} from './shared.js';
import {
  branchProblem,
  buildStepConfig,
  CONDITION_OPERATORS,
  defaultAppendPoint,
  defaultStepName,
  DELAY_UNITS,
  findStep,
  reviewWorkflow,
  slotTransition,
  type StepParams,
  STEP_TYPES,
  stepBranches,
  SUBSCRIPTION_ACTIONS,
  transitionBranch,
  WEBHOOK_METHODS,
  type BuildableStepType,
  type Workflow,
  type WorkflowStep,
  type WorkflowTransition,
} from './workflow-graph.js';

/** `GET /workflows` is page-based, unlike the cursor-paginated contact/campaign lists. */
interface WorkflowList {
  data: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ExecutionList {
  executions: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Execution {
  id: string;
  status?: string;
  contact?: {id: string; email?: string};
  currentStep?: {id: string; name?: string; type?: string} | null;
}

const EXECUTION_STATUSES = ['RUNNING', 'WAITING', 'COMPLETED', 'EXITED', 'FAILED', 'CANCELLED'] as const;

function pageHint(page: number, totalPages: number): string {
  return page < totalPages ? `\n\nMore results exist. For the next page, pass page=${page + 1}.` : '';
}

async function getWorkflow(client: PlunkClient, id: string): Promise<Workflow> {
  return client.request<Workflow>({path: `/workflows/${encodeURIComponent(id)}`});
}

function workflowPath(workflowId: string, ...rest: string[]): string {
  return ['/workflows', workflowId, ...rest].map((part, i) => (i === 0 ? part : encodeURIComponent(part))).join('/');
}

function stepLabel(step: WorkflowStep): string {
  return `"${step.name ?? step.type}"`;
}

function countEmailSteps(workflow: Workflow): number {
  return workflow.steps?.filter((step) => step.type === 'SEND_EMAIL').length ?? 0;
}

const branchInput = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .optional()
    .describe('Stable branch id used to connect steps to it. Generated from the name if omitted.'),
  name: z.string().min(1).max(100).describe('Branch label shown in the dashboard.'),
  operator: z.enum(CONDITION_OPERATORS).describe('How `field` is compared for this branch.'),
  value: z.unknown().optional().describe('Value to compare against. Omit for exists / notExists.'),
});

/** Per-type step arguments. Each step type reads only its own; others are rejected. */
const stepConfigShape = {
  templateId: z.string().optional().describe('SEND_EMAIL: template to send (find it with plunk_list_templates).'),
  recipientEmail: z
    .string()
    .optional()
    .describe(
      'SEND_EMAIL: send to this fixed address instead of the contact (e.g. an internal alert). ' +
        'Pass "" to send to the contact again.',
    ),
  amount: z
    .number()
    .positive()
    .optional()
    .describe('DELAY: how long to wait. WAIT_FOR_EVENT: timeout length (omit amount and unit to wait indefinitely).'),
  unit: z.enum(DELAY_UNITS).optional().describe('Unit for `amount`. At most 365 days.'),
  eventName: z.string().min(1).optional().describe('WAIT_FOR_EVENT: the event to wait for.'),
  field: z
    .string()
    .min(1)
    .optional()
    .describe(
      'CONDITION: what to test — contact.email, contact.subscribed, data.<field> (contact data) or ' +
        'event.<field> (data of the event that started the workflow). See plunk_list_workflow_fields.',
    ),
  operator: z
    .enum(CONDITION_OPERATORS)
    .optional()
    .describe('CONDITION (yes/no): comparison. The step then routes on branches "yes" and "no".'),
  value: z
    .unknown()
    .optional()
    .describe(
      'CONDITION (yes/no): value to compare against; equals is strict, so true ≠ "true". ' +
        'Omit for exists / notExists.',
    ),
  branches: z
    .array(branchInput)
    .min(1)
    .max(20)
    .optional()
    .describe(
      'CONDITION (multi-branch): checked in order, first match wins; no match takes the "default" branch. ' +
        'Use instead of operator/value.',
    ),
  updates: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('UPDATE_CONTACT: contact data fields to set, merged into the existing data.'),
  subscriptionAction: z
    .enum(SUBSCRIPTION_ACTIONS)
    .optional()
    .describe('UPDATE_CONTACT: also subscribe or unsubscribe the contact.'),
  url: z.string().optional().describe('WEBHOOK: URL to call. Template variables like {{email}} are rendered.'),
  method: z.enum(WEBHOOK_METHODS).optional().describe('WEBHOOK: HTTP method (default POST).'),
  headers: z.record(z.string(), z.string()).optional().describe('WEBHOOK: request headers.'),
  body: z.unknown().optional().describe('WEBHOOK: JSON body.'),
  reason: z.string().max(200).optional().describe('EXIT: reason recorded on the execution.'),
};

const placementShape = {
  after: z
    .string()
    .optional()
    .describe(
      'ID of the step this one follows. Omit to append at the end of a linear workflow. If that position ' +
        'already leads to a step, the new step is inserted in between.',
    ),
  branch: z
    .string()
    .optional()
    .describe('Required when `after` is a CONDITION step: "yes" / "no", or a multi-branch id / "default".'),
  continueOn: z
    .string()
    .optional()
    .describe(
      'Only when inserting a CONDITION in front of existing steps: the branch of the new condition that keeps ' +
        'leading to them. Defaults to "yes" ("default" for multi-branch).',
    ),
};

const STEP_PARAM_KEYS = Object.keys(stepConfigShape) as (keyof StepParams)[];

function pickStepParams(args: Record<string, unknown>): StepParams {
  const params: Record<string, unknown> = {};

  for (const key of STEP_PARAM_KEYS) {
    if (args[key] !== undefined) {
      params[key] = args[key];
    }
  }

  return params as StepParams;
}

interface StepSpec extends StepParams {
  type: BuildableStepType;
  name?: string;
  after?: string;
  branch?: string;
  continueOn?: string;
  /** false adds the step without connecting it. */
  autoConnect?: boolean;
}

type AddStepOutcome = {step: WorkflowStep; message: string} | {error: string};

/**
 * Adds one step and wires it in. The step is created unconnected and then
 * linked explicitly, rather than through the API's `autoConnect`, which picks
 * the most recent dead end even when that is an EXIT step or a CONDITION that
 * needs a branch. If linking fails the new step is removed again, so a failed
 * call leaves the graph as it was.
 */
async function addStep(client: PlunkClient, workflow: Workflow, spec: StepSpec): Promise<AddStepOutcome> {
  const built = buildStepConfig(spec.type, spec);

  if ('error' in built) {
    return built;
  }

  const config = built.config;
  const name = spec.name ?? defaultStepName(spec.type, config);
  const templateId = spec.type === 'SEND_EMAIL' ? (config.templateId as string) : undefined;
  const stepBody = {type: spec.type, name, config, templateId};

  if (spec.continueOn !== undefined && spec.type !== 'CONDITION') {
    return {error: '`continueOn` only applies when inserting a CONDITION step.'};
  }

  if (spec.autoConnect === false) {
    if (spec.after || spec.branch) {
      return {error: '`after` and `branch` place the step; drop them or leave autoConnect on.'};
    }

    const step = await client.request<WorkflowStep>({
      method: 'POST',
      path: workflowPath(workflow.id, 'steps'),
      // Required by the API; the dashboard lays the graph out itself.
      body: {...stepBody, position: {x: 0, y: 0}, autoConnect: false},
    });

    return {
      step,
      message:
        `Added ${spec.type} step "${name}" (id: ${step.id}), not connected. ` +
        'Connect it with plunk_connect_workflow_steps.',
    };
  }

  let from: WorkflowStep;

  if (spec.after) {
    const found = findStep(workflow, spec.after);

    if (!found) {
      return {error: `No step with id "${spec.after}" in this workflow. Call plunk_get_workflow to see its steps.`};
    }

    from = found;
  } else {
    if (spec.branch) {
      return {error: '`branch` needs `after`: say which CONDITION step the branch belongs to.'};
    }

    const point = defaultAppendPoint(workflow);

    if ('error' in point) {
      return point;
    }

    from = point.step;
  }

  const problem = branchProblem(from, spec.branch);

  if (problem) {
    return {error: problem};
  }

  const occupied = slotTransition(from, spec.branch);
  const where = `after ${stepLabel(from)}${spec.branch ? ` on branch "${spec.branch}"` : ''}`;

  if (!occupied) {
    const step = await client.request<WorkflowStep>({
      method: 'POST',
      path: workflowPath(workflow.id, 'steps'),
      body: {...stepBody, position: {x: 0, y: 0}, autoConnect: false},
    });

    try {
      await client.request({
        method: 'POST',
        path: workflowPath(workflow.id, 'transitions'),
        body: {fromStepId: from.id, toStepId: step.id, ...(spec.branch ? {condition: {branch: spec.branch}} : {})},
      });
    } catch (error) {
      await client.request({method: 'DELETE', path: workflowPath(workflow.id, 'steps', step.id)}).catch(() => {});
      throw error;
    }

    return {
      step,
      message: `Added ${spec.type} step "${name}" (id: ${step.id}) ${where}.${nextHint(spec.type, step, config)}`,
    };
  }

  // The position is taken: insert between `from` and whatever it leads to.
  const target = findStep(workflow, occupied.toStepId);
  const targetLabel = target ? stepLabel(target) : occupied.toStepId;

  if (spec.type === 'EXIT') {
    return {
      error:
        `${stepLabel(from)} already leads to ${targetLabel}, and an EXIT step cannot go in between because ` +
        'everything after it would be cut off. Disconnect them first (plunk_disconnect_workflow_steps) or ' +
        'add the EXIT at an open position.',
    };
  }

  let continueOn: string | undefined;

  if (spec.type === 'CONDITION') {
    const branches = stepBranches({id: '', type: 'CONDITION', config}) ?? [];
    continueOn = spec.continueOn ?? (branches.includes('yes') ? 'yes' : 'default');

    if (!branches.includes(continueOn)) {
      return {error: `The new condition has no branch "${continueOn}". Its branches are ${branches.join(', ')}.`};
    }

    // Moving the downstream path off "yes" takes two more calls, and in between
    // a live contact could reach the condition with nowhere to go.
    if (continueOn !== 'yes' && workflow.enabled) {
      return {
        error:
          `Inserting this condition means rewiring ${targetLabel} onto branch "${continueOn}", which is not ` +
          'atomic. Disable the workflow first, or add the condition at an open position.',
      };
    }
  }

  const step = await client.request<WorkflowStep>({
    method: 'POST',
    path: workflowPath(workflow.id, 'transitions', occupied.id, 'insert-step'),
    body: stepBody,
  });

  // The API hangs the downstream path off the new condition's "yes" branch.
  if (continueOn && continueOn !== 'yes') {
    const refreshed = await getWorkflow(client, workflow.id);
    const downstream = findStep(refreshed, step.id)?.outgoingTransitions?.[0];

    try {
      if (downstream) {
        await client.request({method: 'DELETE', path: workflowPath(workflow.id, 'transitions', downstream.id)});
        await client.request({
          method: 'POST',
          path: workflowPath(workflow.id, 'transitions'),
          body: {fromStepId: step.id, toStepId: downstream.toStepId, condition: {branch: continueOn}},
        });
      }
    } catch (error) {
      return {
        error:
          `Inserted condition "${name}" (id: ${step.id}) but could not move ${targetLabel} onto branch ` +
          `"${continueOn}": ${(error as Error).message}. Connect it with plunk_connect_workflow_steps, then ` +
          'check the result with plunk_check_workflow.',
      };
    }
  }

  const continuation = continueOn ? ` Branch "${continueOn}" continues to ${targetLabel}.` : '';

  return {
    step,
    message:
      `Inserted ${spec.type} step "${name}" (id: ${step.id}) ${where}, before ${targetLabel}.${continuation}` +
      nextHint(spec.type, step, config),
  };
}

function nextHint(type: BuildableStepType, step: WorkflowStep, config: Record<string, unknown>): string {
  if (type !== 'CONDITION') {
    return '';
  }

  const branches = stepBranches({id: step.id, type, config}) ?? [];
  const choices = branches.map((b) => `"${b}"`).join(' / ');
  return ` Continue each path with after="${step.id}" and branch=${choices}; an unconnected branch ends the workflow.`;
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
        'For a compact view plus problems that would break it at run time, use `plunk_check_workflow`.',
        '',
        '**Returns:** A numbered outline of the flow, then the workflow with `steps[]`. Each step has',
        '`type` (TRIGGER, SEND_EMAIL, DELAY, WAIT_FOR_EVENT, CONDITION, EXIT, WEBHOOK, UPDATE_CONTACT),',
        '`config`, the linked `template`, and its `outgoingTransitions` / `incomingTransitions`. A',
        'transition out of a CONDITION carries `condition.branch`.',
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
        const {outline} = reviewWorkflow(workflow);

        return jsonResult(
          `Workflow "${workflow.name ?? id}" is ${workflow.enabled ? 'enabled' : 'disabled'} and has ` +
            `${workflow.steps?.length ?? 0} step(s).\n\n${outline}`,
          workflow,
        );
      }),
  );

  register(
    ctx,
    'plunk_check_workflow',
    {
      title: 'Check workflow',
      description: [
        '**Purpose:** Review a workflow before enabling it or after editing it: a numbered outline in the',
        'order a contact walks it, and every problem that would make a run fail or misroute.',
        '',
        '**Checks:** step configs the executor would reject, SEND_EMAIL steps without a template,',
        'condition fields that never resolve, connections on branches a condition no longer has, steps',
        'with more than one exit, and steps not connected to the trigger.',
        '',
        '**Returns:** `outline` (one line per step with its exits and id) and `issues[]` with',
        '`severity` error | warning. `plunk_set_workflow_enabled` refuses to enable while errors remain.',
        '',
        '**Key trigger phrases:** "is the workflow ok", "review the automation", "check before enabling"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const workflow = await getWorkflow(client, id);
        const review = reviewWorkflow(workflow);
        const errors = review.issues.filter((issue) => issue.severity === 'error').length;
        const warnings = review.issues.length - errors;
        const issueLines = review.issues.map((issue) => `- ${issue.severity}: ${issue.message}`).join('\n');

        return jsonResult(
          `Workflow "${workflow.name ?? id}": ${errors} error(s), ${warnings} warning(s).\n\n${review.outline}` +
            (issueLines ? `\n\n${issueLines}` : ''),
          {id: workflow.id, name: workflow.name, enabled: workflow.enabled, ...review},
        );
      }),
  );

  register(
    ctx,
    'plunk_list_workflow_fields',
    {
      title: 'List workflow condition fields',
      description: [
        '**Purpose:** List the fields a CONDITION step can test: contact fields, custom contact data, and',
        'the data keys seen on an event.',
        '',
        '**Returns:** `typedFields[]` with `field`, `type` and `category`. Contact data appears as',
        '`contact.data.<key>`, which conditions accept as-is; event keys appear as `event.<key>`.',
        'Of the built-in contact fields only `contact.email` and `contact.subscribed` can be tested.',
        '',
        '**Key trigger phrases:** "what can I branch on", "which fields can the condition use"',
      ].join('\n'),
      inputSchema: z.object({
        eventName: z
          .string()
          .optional()
          .describe('Only list event data keys seen on this event, e.g. the workflow trigger event.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({eventName}) =>
      runTool(async () => {
        const result = await client.request<{count?: number}>({path: '/workflows/fields', query: {eventName}});

        return jsonResult(`Found ${result.count ?? 0} field(s).`, result);
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
    'plunk_get_workflow_execution',
    {
      title: 'Get workflow execution',
      description: [
        '**Purpose:** Fetch one execution with every step it ran: when, with what result, and the error',
        'if a step failed.',
        '',
        '**Returns:** The execution with `status`, `exitReason`, `contact`, `currentStep` and',
        '`stepExecutions[]` (step, status, output, error).',
        '',
        '**Key trigger phrases:** "why did the workflow fail for this contact", "which branch did it take"',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID.'),
        executionId: z.string().describe('The execution ID, from plunk_list_workflow_executions.'),
      }),
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id, executionId}) =>
      runTool(async () => {
        const execution = await client.request<Execution>({path: workflowPath(id, 'executions', executionId)});

        return jsonResult(
          `Execution ${execution.id} is ${execution.status ?? 'unknown'}` +
            (execution.currentStep ? ` at "${execution.currentStep.name ?? execution.currentStep.type}"` : '') +
            '.',
          execution,
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
        '**Next steps:** add steps with `plunk_add_workflow_steps` (many at once) or',
        '`plunk_add_workflow_step`, review with `plunk_check_workflow`, then enable it.',
        '',
        '**Segment triggers:** a contact entering or leaving a segment tracks',
        '`segment.<segment-slug>.entry` / `.exit`, which can be used as the event name.',
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
          `Workflow created (id: ${created.id}), disabled. Add steps with plunk_add_workflow_steps, then ` +
            'enable it with plunk_set_workflow_enabled.',
          {...workflow, triggerStep},
        );
      }),
  );

  register(
    ctx,
    'plunk_update_workflow',
    {
      title: 'Update workflow',
      description: [
        '**Purpose:** Rename a workflow, edit its description, change the event that starts it, or',
        'allow / forbid re-entry.',
        '',
        '**NOT for:** Turning it on or off (use `plunk_set_workflow_enabled`) or editing steps (use',
        '`plunk_update_workflow_step`).',
        '',
        '**Note:** on an enabled workflow that sends email, changing the trigger event or allowing',
        're-entry changes who receives it, so it asks the user to confirm first. The trigger event',
        'cannot change while runs are in progress; disable the workflow first.',
        '',
        '**Returns:** The updated workflow.',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID.'),
        name: z.string().min(1).max(100).optional().describe('New name.'),
        description: z.string().max(500).optional().describe('New internal note.'),
        eventName: z.string().min(1).optional().describe('New trigger event.'),
        allowReentry: z.boolean().optional().describe('Let a contact enter again after a previous run.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async ({id, name, description, eventName, allowReentry}, context) =>
      runTool(async () => {
        if ([name, description, eventName, allowReentry].every((value) => value === undefined)) {
          return errorResult('Nothing to update: pass name, description, eventName or allowReentry.');
        }

        if (eventName !== undefined || allowReentry === true) {
          const workflow = await getWorkflow(client, id);
          const emailSteps = countEmailSteps(workflow);

          if (workflow.enabled && emailSteps > 0) {
            const change = eventName
              ? `start on "${eventName}" instead of "${workflow.triggerConfig?.eventName ?? 'its current event'}"`
              : 'let contacts enter again after a previous run';

            const pending = requireConfirmation(
              context as {mcpReq?: {inputResponses?: unknown}},
              'confirm_workflow_update',
              `Change enabled workflow "${workflow.name ?? id}" to ${change}? It can send up to ${emailSteps} ` +
                'email(s) per contact. Sent emails cannot be recalled.',
            );

            if (pending) {
              return pending;
            }
          }
        }

        const result = await client.request<Workflow>({
          method: 'PATCH',
          path: workflowPath(id),
          body: {name, description, allowReentry, triggerConfig: eventName ? {eventName} : undefined},
        });

        return jsonResult('Workflow updated.', result);
      }),
  );

  register(
    ctx,
    'plunk_duplicate_workflow',
    {
      title: 'Duplicate workflow',
      description: [
        '**Purpose:** Copy a workflow with all its steps and connections, e.g. to make a variant for',
        'another language or audience. The copy is disabled and has no runs.',
        '',
        '**Returns:** The new workflow. Change its trigger with `plunk_update_workflow` and its',
        'templates with `plunk_update_workflow_step`.',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow to copy.'),
        name: z.string().min(1).max(100).optional().describe('Name for the copy.'),
        eventName: z.string().min(1).optional().describe('Trigger event for the copy.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({id, name, eventName}) =>
      runTool(async () => {
        const copy = await client.request<Workflow>({method: 'POST', path: workflowPath(id, 'duplicate')});

        if (name || eventName) {
          try {
            await client.request({
              method: 'PATCH',
              path: workflowPath(copy.id),
              body: {name, triggerConfig: eventName ? {eventName} : undefined},
            });
          } catch (error) {
            return errorResult(
              `Created disabled copy "${copy.name ?? copy.id}" (id: ${copy.id}) but could not rename or ` +
                `re-trigger it: ${(error as Error).message}. Retry with plunk_update_workflow.`,
            );
          }
        }

        const workflow = await getWorkflow(client, copy.id);

        return jsonResult(`Created disabled copy "${workflow.name ?? copy.id}" (id: ${copy.id}).`, workflow);
      }),
  );

  register(
    ctx,
    'plunk_delete_workflow',
    {
      title: 'Delete workflow',
      description: [
        '**Purpose:** Permanently delete a workflow and its steps. Cannot be undone.',
        '',
        'Only disabled workflows can be deleted here: disable it with `plunk_set_workflow_enabled`',
        'first. The API also refuses while runs are in progress (`plunk_cancel_workflow_executions`).',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true},
    },
    async ({id}) =>
      runTool(async () => {
        const workflow = await getWorkflow(client, id);

        if (workflow.enabled) {
          return errorResult(
            `Workflow "${workflow.name ?? id}" is enabled. ` +
              'Disable it with plunk_set_workflow_enabled before deleting it.',
          );
        }

        await client.request({method: 'DELETE', path: workflowPath(id)});

        return jsonResult(`Deleted workflow "${workflow.name ?? id}".`, {id, deleted: true});
      }),
  );

  register(
    ctx,
    'plunk_add_workflow_step',
    {
      title: 'Add workflow step',
      description: [
        '**Purpose:** Add one step to a workflow and connect it. To build several steps, prefer',
        '`plunk_add_workflow_steps`.',
        '',
        "**Step types** (pass only that type's arguments):",
        '- `SEND_EMAIL` — `templateId`; optional `recipientEmail` for a fixed address.',
        '- `DELAY` — `amount` + `unit` (at most 365 days).',
        '- `WAIT_FOR_EVENT` — `eventName`; optional timeout via `amount` + `unit`. The flow continues',
        '  on the same path whether the event arrives or the timeout passes.',
        '- `CONDITION` — `field` + `operator` (+ `value`) for yes/no, or `field` + `branches` for',
        '  several outcomes. Connect what follows with `after` = the condition and `branch`.',
        '- `UPDATE_CONTACT` — `updates` (data fields to set) and/or `subscriptionAction`.',
        '- `WEBHOOK` — `url`, optional `method`, `headers`, `body`.',
        '- `EXIT` — ends the run, optional `reason`. Nothing can follow it.',
        '',
        '**Placement:** by default the step goes after the only open end of the workflow. Pass `after`',
        '(a step ID) to place it elsewhere, plus `branch` when `after` is a CONDITION. If that position',
        'already leads somewhere, the step is inserted in between. An unconnected condition branch ends',
        'the run for contacts that take it.',
        '',
        '**Returns:** The created step including its ID.',
        '',
        '**Key trigger phrases:** "add an email to the workflow", "wait 2 days then", "if they clicked"',
      ].join('\n'),
      inputSchema: z.object({
        workflowId: z.string().describe('The workflow ID.'),
        type: z.enum(STEP_TYPES).describe('Step type.'),
        name: z.string().min(1).max(100).optional().describe('Step name shown in the builder. Generated if omitted.'),
        ...stepConfigShape,
        ...placementShape,
        autoConnect: z.boolean().default(true).describe('Set false to add the step without connecting it to anything.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async (args) =>
      runTool(async () => {
        // Fail on a bad config before touching the API.
        const built = buildStepConfig(args.type, pickStepParams(args));

        if ('error' in built) {
          return errorResult(built.error);
        }

        const workflow = await getWorkflow(client, args.workflowId);
        const outcome = await addStep(client, workflow, {
          ...pickStepParams(args),
          type: args.type,
          name: args.name,
          after: args.after,
          branch: args.branch,
          continueOn: args.continueOn,
          autoConnect: args.autoConnect,
        });

        return 'error' in outcome ? errorResult(outcome.error) : jsonResult(outcome.message, outcome.step);
      }),
  );

  register(
    ctx,
    'plunk_add_workflow_steps',
    {
      title: 'Add workflow steps',
      description: [
        '**Purpose:** Build a workflow in one call: add a list of steps, each connected after the',
        'previous one unless it says otherwise.',
        '',
        '**Each item** takes the same arguments as `plunk_add_workflow_step` plus an optional `key`.',
        "`after` may name an earlier item's `key` or an existing step ID. An item following a",
        'CONDITION must say which `branch` it continues on, and so must the first item of each other',
        'branch, e.g. `{after: "check", branch: "no", ...}`.',
        '',
        '**Partial failure:** steps are added in order and the call stops at the first one that fails;',
        'steps already added stay, and the error lists them.',
        '',
        '**Returns:** The created steps with their keys and IDs, and the workflow outline.',
      ].join('\n'),
      inputSchema: z.object({
        workflowId: z.string().describe('The workflow ID.'),
        steps: z
          .array(
            z.object({
              key: z.string().min(1).max(40).optional().describe('Name for this item, for `after` in later items.'),
              type: z.enum(STEP_TYPES).describe('Step type.'),
              name: z.string().min(1).max(100).optional().describe('Step name. Generated if omitted.'),
              ...stepConfigShape,
              ...placementShape,
            }),
          )
          .min(1)
          .max(50)
          .describe('Steps in the order to add them.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({workflowId, steps}) =>
      runTool(async () => {
        const created: {key?: string; id: string; type: string; name?: string}[] = [];
        const keyed = new Map<string, string>();
        let workflow = await getWorkflow(client, workflowId);

        for (const [index, item] of steps.entries()) {
          if (item.key && keyed.has(item.key)) {
            return errorResult(`Duplicate key "${item.key}" at item ${index + 1}.` + createdNote(created));
          }

          const previous = created[created.length - 1];
          const after = item.after ? (keyed.get(item.after) ?? item.after) : previous?.id;

          const outcome = await addStep(client, workflow, {
            ...pickStepParams(item),
            type: item.type,
            name: item.name,
            after,
            branch: item.branch,
            continueOn: item.continueOn,
          }).catch((error: Error) => ({error: error.message}));

          if ('error' in outcome) {
            return errorResult(
              `Item ${index + 1} (${item.key ?? item.type}) failed: ${outcome.error}` + createdNote(created),
            );
          }

          created.push({key: item.key, id: outcome.step.id, type: item.type, name: outcome.step.name});
          if (item.key) {
            keyed.set(item.key, outcome.step.id);
          }

          workflow = await getWorkflow(client, workflowId);
        }

        const {outline} = reviewWorkflow(workflow);

        return jsonResult(`Added ${created.length} step(s).\n\n${outline}`, {steps: created, outline});
      }),
  );

  register(
    ctx,
    'plunk_update_workflow_step',
    {
      title: 'Update workflow step',
      description: [
        "**Purpose:** Change a step's name or settings: swap the template, change a delay, edit a",
        'condition or the fields a contact update sets. Only the arguments passed change.',
        '',
        '**NOT for:** Changing the trigger event (use `plunk_update_workflow` with `eventName`) or the',
        'step type (add a new step and delete this one).',
        '',
        '**Note:** settings cannot change while an enabled workflow has runs in progress; disable it',
        'first. A condition cannot drop a branch that still leads somewhere; disconnect it first.',
        '',
        '**Returns:** The updated step.',
      ].join('\n'),
      inputSchema: z.object({
        workflowId: z.string().describe('The workflow ID.'),
        stepId: z.string().describe('The step ID.'),
        name: z.string().min(1).max(100).optional().describe('New step name.'),
        ...stepConfigShape,
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true},
    },
    async (args) =>
      runTool(async () => {
        const workflow = await getWorkflow(client, args.workflowId);
        const step = findStep(workflow, args.stepId);

        if (!step) {
          return errorResult(`No step with id "${args.stepId}" in this workflow.`);
        }

        const params = pickStepParams(args);
        const changesConfig = Object.keys(params).length > 0;

        if (!changesConfig && args.name === undefined) {
          return errorResult('Nothing to update: pass a new name or the settings to change.');
        }

        if (!changesConfig) {
          const updated = await client.request<WorkflowStep>({
            method: 'PATCH',
            path: workflowPath(workflow.id, 'steps', step.id),
            body: {name: args.name},
          });

          return jsonResult(`Renamed step to "${args.name}".`, updated);
        }

        if (!(STEP_TYPES as readonly string[]).includes(step.type)) {
          return errorResult(
            step.type === 'TRIGGER'
              ? 'The trigger step follows the workflow: change its event with plunk_update_workflow eventName.'
              : `A ${step.type} step cannot be edited here.`,
          );
        }

        const type = step.type as BuildableStepType;
        const existing =
          type === 'SEND_EMAIL' && step.templateId
            ? {...(step.config as Record<string, unknown>), templateId: step.templateId}
            : step.config;
        const built = buildStepConfig(type, params, existing);

        if ('error' in built) {
          return errorResult(built.error);
        }

        if (type === 'CONDITION') {
          const kept = stepBranches({...step, config: built.config}) ?? [];
          const dropped = (step.outgoingTransitions ?? [])
            .map((transition) => ({transition, branch: transitionBranch(transition)}))
            .filter(({branch}) => branch !== undefined && !kept.includes(branch));

          if (dropped.length > 0) {
            const names = dropped.map(({branch}) => `"${branch}"`).join(', ');
            return errorResult(
              `Branch ${names} still leads to a step but the new condition has no such branch. Keep its id in ` +
                '`branches`, or disconnect it first with plunk_disconnect_workflow_steps.',
            );
          }
        }

        // A name the tools generated describes the old settings; regenerate it.
        const generated = step.name === defaultStepName(type, (existing ?? {}) as Record<string, unknown>);
        const name = args.name ?? (generated ? defaultStepName(type, built.config) : undefined);

        const updated = await client.request<WorkflowStep>({
          method: 'PATCH',
          path: workflowPath(workflow.id, 'steps', step.id),
          body: {
            name,
            config: built.config,
            templateId: type === 'SEND_EMAIL' ? built.config.templateId : undefined,
          },
        });

        return jsonResult(`Updated ${type} step ${stepLabel(updated)}.`, updated);
      }),
  );

  register(
    ctx,
    'plunk_delete_workflow_step',
    {
      title: 'Delete workflow step',
      description: [
        '**Purpose:** Remove a step. `downstream` decides what happens to the steps after it:',
        '',
        '- `reconnect` (default) — what came before now leads to what came after. Not possible for a',
        '  CONDITION step, which has several paths below it.',
        '- `detach` — only this step is removed; the steps after it stay but no longer run until',
        '  they are connected again. Needs the workflow disabled.',
        '- `delete` — this step **and every step below it** are removed, including steps other',
        '  paths also lead to.',
        '',
        '**Returns:** What was removed and the workflow outline after the change.',
      ].join('\n'),
      inputSchema: z.object({
        workflowId: z.string().describe('The workflow ID.'),
        stepId: z.string().describe('The step ID.'),
        downstream: z
          .enum(['reconnect', 'detach', 'delete'])
          .optional()
          .describe('What happens to the steps after it. Defaults to reconnect; required for a CONDITION step.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true},
    },
    async ({workflowId, stepId, downstream}) =>
      runTool(async () => {
        const workflow = await getWorkflow(client, workflowId);
        const step = findStep(workflow, stepId);

        if (!step) {
          return errorResult(`No step with id "${stepId}" in this workflow.`);
        }

        if (step.type === 'TRIGGER') {
          return errorResult('The trigger step cannot be deleted; delete the workflow instead.');
        }

        const outgoing = step.outgoingTransitions ?? [];
        const mode = downstream ?? (step.type === 'CONDITION' && outgoing.length > 0 ? undefined : 'reconnect');

        if (!mode || (mode === 'reconnect' && step.type === 'CONDITION' && outgoing.length > 0)) {
          return errorResult(
            `${stepLabel(step)} is a CONDITION with steps after it, so the flow cannot be reconnected around ` +
              'it. Pass downstream="detach" to keep those steps, or downstream="delete" to remove them too.',
          );
        }

        if (mode === 'detach' && outgoing.length > 0 && workflow.enabled) {
          return errorResult('Detaching takes several calls; disable the workflow first.');
        }

        // The plain DELETE removes everything reachable from the step, so
        // detaching drops the step's own connections first.
        const removed = mode === 'delete' ? downstreamOf(workflow, stepId) : [step];

        if (mode === 'detach') {
          for (const transition of outgoing) {
            await client.request({method: 'DELETE', path: workflowPath(workflowId, 'transitions', transition.id)});
          }
        }

        await client.request({
          method: 'DELETE',
          path: workflowPath(workflowId, 'steps', stepId),
          query: mode === 'reconnect' ? {splice: 'true'} : undefined,
        });

        const review = reviewWorkflow(await getWorkflow(client, workflowId));
        const orphans = review.issues.filter((issue) => issue.code === 'unreachable');
        const orphanNote = orphans.length > 0 ? `\n\n${orphans.map((issue) => `- ${issue.message}`).join('\n')}` : '';

        return jsonResult(`Deleted ${removed.map(stepLabel).join(', ')}.${orphanNote}\n\n${review.outline}`, {
          deleted: removed.map((removedStep) => removedStep.id),
          outline: review.outline,
        });
      }),
  );

  register(
    ctx,
    'plunk_connect_workflow_steps',
    {
      title: 'Connect workflow steps',
      description: [
        '**Purpose:** Make one step lead to another, e.g. wire a condition branch, or join two paths',
        'into a shared next step.',
        '',
        'Out of a CONDITION, pass the `branch`. Every other step has a single exit, so it must not',
        'already lead somewhere (disconnect it first). Connections that would form a loop are refused.',
        '',
        '**Returns:** The new transition.',
      ].join('\n'),
      inputSchema: z.object({
        workflowId: z.string().describe('The workflow ID.'),
        fromStepId: z.string().describe('Step the flow comes from.'),
        toStepId: z.string().describe('Step the flow goes to.'),
        branch: z.string().optional().describe('Required when fromStepId is a CONDITION: the branch to connect.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({workflowId, fromStepId, toStepId, branch}) =>
      runTool(async () => {
        const workflow = await getWorkflow(client, workflowId);
        const from = findStep(workflow, fromStepId);
        const to = findStep(workflow, toStepId);

        if (!from || !to) {
          return errorResult(`No step with id "${!from ? fromStepId : toStepId}" in this workflow.`);
        }

        if (to.type === 'TRIGGER') {
          return errorResult('Nothing can lead into the trigger step.');
        }

        const problem = branchProblem(from, branch);

        if (problem) {
          return errorResult(problem);
        }

        const existing = slotTransition(from, branch);

        if (existing) {
          const current = findStep(workflow, existing.toStepId);
          return errorResult(
            `${stepLabel(from)}${branch ? ` branch "${branch}"` : ''} already leads to ` +
              `${current ? stepLabel(current) : existing.toStepId}. ` +
              'Disconnect it first with plunk_disconnect_workflow_steps.',
          );
        }

        const transition = await client.request<WorkflowTransition>({
          method: 'POST',
          path: workflowPath(workflowId, 'transitions'),
          body: {fromStepId, toStepId, ...(branch ? {condition: {branch}} : {})},
        });

        return jsonResult(
          `Connected ${stepLabel(from)}${branch ? ` (branch "${branch}")` : ''} → ${stepLabel(to)}.`,
          transition,
        );
      }),
  );

  register(
    ctx,
    'plunk_disconnect_workflow_steps',
    {
      title: 'Disconnect workflow steps',
      description: [
        '**Purpose:** Remove the connection out of a step (or out of one branch of a CONDITION). The',
        'steps themselves stay; anything only reachable through that connection stops running.',
        '',
        'Identify the connection by `transitionId`, or by `fromStepId` (+ `branch` for a CONDITION).',
        '',
        '**Returns:** Which connection was removed.',
      ].join('\n'),
      inputSchema: z.object({
        workflowId: z.string().describe('The workflow ID.'),
        transitionId: z.string().optional().describe('The transition ID, from plunk_get_workflow.'),
        fromStepId: z.string().optional().describe('Step whose outgoing connection to remove.'),
        branch: z.string().optional().describe('When fromStepId is a CONDITION: which branch.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true},
    },
    async ({workflowId, transitionId, fromStepId, branch}) =>
      runTool(async () => {
        if (!transitionId === !fromStepId) {
          return errorResult('Pass either transitionId, or fromStepId (with branch for a CONDITION).');
        }

        const workflow = await getWorkflow(client, workflowId);
        let transition: WorkflowTransition | undefined;

        if (transitionId) {
          transition = workflow.steps
            ?.flatMap((step) => step.outgoingTransitions ?? [])
            .find((candidate) => candidate.id === transitionId);
        } else {
          const from = findStep(workflow, fromStepId!);

          if (!from) {
            return errorResult(`No step with id "${fromStepId}" in this workflow.`);
          }

          const problem = from.type === 'EXIT' ? undefined : branchProblem(from, branch);

          if (problem) {
            return errorResult(problem);
          }

          transition = slotTransition(from, branch);
        }

        if (!transition) {
          return errorResult('There is no such connection.');
        }

        await client.request({method: 'DELETE', path: workflowPath(workflowId, 'transitions', transition.id)});

        const from = findStep(workflow, transition.fromStepId);
        const to = findStep(workflow, transition.toStepId);
        const via = transitionBranch(transition);

        return jsonResult(
          `Disconnected ${from ? stepLabel(from) : transition.fromStepId}${via ? ` (branch "${via}")` : ''} → ` +
            `${to ? stepLabel(to) : transition.toStepId}.`,
          {deleted: transition.id, fromStepId: transition.fromStepId, toStepId: transition.toStepId, branch: via},
        );
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
        'Events tracked before it was enabled do not start it. Enabling is refused while',
        '`plunk_check_workflow` reports errors.',
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
          const errors = reviewWorkflow(workflow).issues.filter((issue) => issue.severity === 'error');

          if (errors.length > 0) {
            return errorResult(
              `Not enabling "${workflow.name ?? id}": fix these first.\n` +
                errors.map((issue) => `- ${issue.message}`).join('\n'),
            );
          }

          const emailSteps = countEmailSteps(workflow);

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

  register(
    ctx,
    'plunk_start_workflow_execution',
    {
      title: 'Start workflow for a contact',
      description: [
        '**Purpose:** Run an enabled workflow for one contact now, without the trigger event — e.g. to',
        'test it on your own address. Asks the user to confirm when the workflow sends email.',
        '',
        '**NOT for:** Starting it for many contacts. Track the trigger event instead.',
        '',
        '**Returns:** The new execution. Follow it with `plunk_get_workflow_execution`.',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID. It must be enabled.'),
        contactId: z.string().optional().describe('The contact ID.'),
        email: z.string().optional().describe('The contact email, instead of contactId.'),
        context: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Event data for the run, readable as event.<key> in conditions and templates.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true},
    },
    async ({id, contactId, email, context: eventData}, context) =>
      runTool(async () => {
        const resolved = await resolveContact(client, {id: contactId, email});

        if ('error' in resolved) {
          return errorResult(resolved.error);
        }

        const workflow = await getWorkflow(client, id);

        if (!workflow.enabled) {
          return errorResult(`Workflow "${workflow.name ?? id}" is disabled; enable it first.`);
        }

        const emailSteps = countEmailSteps(workflow);

        if (emailSteps > 0) {
          const pending = requireConfirmation(
            context as {mcpReq?: {inputResponses?: unknown}},
            'confirm_workflow_start',
            `Start workflow "${workflow.name ?? id}" for ${resolved.label} now? They can receive up to ` +
              `${emailSteps} email(s). Sent emails cannot be recalled.`,
          );

          if (pending) {
            return pending;
          }
        }

        const execution = await client.request<Execution>({
          method: 'POST',
          path: workflowPath(id, 'executions'),
          body: {contactId: resolved.id, context: eventData},
        });

        return jsonResult(`Started workflow for ${resolved.label} (execution ${execution.id}).`, execution);
      }),
  );

  register(
    ctx,
    'plunk_cancel_workflow_executions',
    {
      title: 'Cancel workflow executions',
      description: [
        '**Purpose:** Stop runs in progress: one execution, or every running and waiting execution of',
        'the workflow. Only RUNNING and WAITING executions can be cancelled.',
        '',
        '**Caveat:** a run parked on a WAIT_FOR_EVENT step can still resume when that event arrives or',
        'its timeout passes, so check it with `plunk_get_workflow_execution` afterwards.',
        '',
        '**NOT for:** Stopping new contacts from entering — disable the workflow for that.',
        '',
        '**Returns:** The cancelled execution, or how many were cancelled.',
      ].join('\n'),
      inputSchema: z.object({
        id: z.string().describe('The workflow ID.'),
        executionId: z.string().optional().describe('Cancel only this execution.'),
        all: z.boolean().optional().describe('Cancel every running and waiting execution.'),
      }),
      annotations: {readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true},
    },
    async ({id, executionId, all}) =>
      runTool(async () => {
        if (!executionId === !all) {
          return errorResult('Pass either executionId or all=true.');
        }

        if (executionId) {
          // The API cancels whatever it is given, which would overwrite the outcome of a finished run.
          const current = await client.request<Execution>({path: workflowPath(id, 'executions', executionId)});

          if (current.status !== 'RUNNING' && current.status !== 'WAITING') {
            return errorResult(`Execution ${executionId} is ${current.status ?? 'not active'}; nothing to cancel.`);
          }

          const execution = await client.request<Execution>({
            method: 'DELETE',
            path: workflowPath(id, 'executions', executionId),
          });

          return jsonResult(`Cancelled execution ${executionId}.`, execution);
        }

        const result = await client.request<{cancelled: number}>({
          method: 'POST',
          path: workflowPath(id, 'executions', 'cancel-all'),
        });

        return jsonResult(`Cancelled ${result.cancelled} execution(s).`, result);
      }),
  );
}

/** The step and everything reachable from it — what the API's plain step DELETE removes. */
function downstreamOf(workflow: Workflow, stepId: string): WorkflowStep[] {
  const seen = new Set([stepId]);
  const queue = [stepId];

  while (queue.length > 0) {
    const current = findStep(workflow, queue.shift()!);

    for (const transition of current?.outgoingTransitions ?? []) {
      if (!seen.has(transition.toStepId)) {
        seen.add(transition.toStepId);
        queue.push(transition.toStepId);
      }
    }
  }

  return (workflow.steps ?? []).filter((step) => seen.has(step.id));
}

function createdNote(created: {key?: string; id: string; type: string}[]): string {
  if (created.length === 0) {
    return ' Nothing was added.';
  }

  return (
    ` Already added and kept: ${created.map((step) => `${step.key ?? step.type} (${step.id})`).join(', ')}. ` +
    'Continue from the last of them with `after`.'
  );
}

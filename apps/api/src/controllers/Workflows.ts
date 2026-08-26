import {Controller, Delete, Get, Middleware, Patch, Post} from '@overnightjs/core';
import {WorkflowExecutionStatus} from '@plunk/db';
import {WorkflowSchemas} from '@plunk/shared';
import type {NextFunction, Request, Response} from 'express';
import signale from 'signale';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {WorkflowService} from '../services/WorkflowService.js';
import {CatchAsync} from '../utils/asyncHandler.js';
import {parseListSort} from '../utils/listSort.js';

@Controller('workflows')
export class Workflows {
  /**
   * GET /workflows
   * List all workflows for the authenticated project
   *
   * Query params:
   * - page, pageSize: pagination
   * - search: filter by name/description
   * - status: active | disabled — maps to the `enabled` boolean facet
   * - sort: name | createdAt | updatedAt | steps (default: createdAt)
   *   `steps` sorts by the related step count.
   * - dir: asc | desc (default: desc)
   */
  @Get('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async list(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const search = req.query.search as string | undefined;
    // `steps` is a workflow-specific sortable column (orders by step count).
    const sort = parseListSort(req.query.sort, req.query.dir, {field: 'createdAt', direction: 'desc'}, ['steps']);

    // Status facet: `active` / `disabled` -> `enabled` boolean. Any other value
    // (or absent) leaves the filter off.
    const statusRaw = req.query.status as string | undefined;
    const enabled = statusRaw === 'active' ? true : statusRaw === 'disabled' ? false : undefined;

    const result = await WorkflowService.list(auth.projectId!, page, pageSize, search, sort, enabled);

    return res.status(200).json(result);
  }

  /**
   * GET /workflows/fields
   * Get all available fields for workflow conditions (contact fields + event fields)
   * Query param: eventName - Optional event name to filter event fields
   * NOTE: This must be defined BEFORE the :id route to avoid conflicts
   */
  @Get('fields')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getAvailableFields(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const eventName = req.query.eventName as string | undefined;

    try {
      const result = await WorkflowService.getAvailableFields(auth.projectId!, eventName);

      return res.status(200).json(result);
    } catch (error) {
      signale.error('[WORKFLOWS] Failed to get available fields:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get available fields',
      });
    }
  }

  /**
   * POST /workflows/bulk-update
   * Apply a bulk operation to multiple workflows at once.
   *
   * Currently supports `{ids: string[], delete: true}` for bulk delete. The
   * schema is intentionally open-ended so future bulk operations can stack on
   * the same endpoint.
   *
   * Atomicity: the underlying service wraps the ownership check, the
   * active-execution guard, and the delete in a single Prisma transaction, so a
   * partial bulk delete is not possible.
   *
   * NOTE: This must be defined BEFORE the :id route to avoid conflicts.
   */
  @Post('bulk-update')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async bulkUpdate(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    // Let Zod throw on invalid input so the global error handler in app.ts
    // formats it into the standard error envelope, matching the other
    // schema-validated endpoints.
    const data = WorkflowSchemas.bulkUpdate.parse(req.body);

    const result = await WorkflowService.bulkUpdate(auth.projectId!, data);

    return res.status(200).json(result);
  }

  /**
   * GET /workflows/:id
   * Get a specific workflow with all steps and transitions
   */
  @Get(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async get(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    const workflow = await WorkflowService.get(auth.projectId!, workflowId);

    return res.status(200).json(workflow);
  }

  /**
   * POST /workflows
   * Create a new workflow
   */
  @Post('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async create(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {name, description, eventName, enabled, allowReentry} = req.body;

    if (!name) {
      return res.status(400).json({error: 'Name is required'});
    }

    if (!eventName) {
      return res.status(400).json({error: 'Event name is required'});
    }

    const workflow = await WorkflowService.create(auth.projectId!, {
      name,
      description,
      eventName,
      enabled,
      allowReentry,
    });

    return res.status(201).json(workflow);
  }

  /**
   * PATCH /workflows/:id
   * Update a workflow
   */
  @Patch(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async update(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const {name, description, triggerType, triggerConfig, enabled, allowReentry} = req.body;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    const workflow = await WorkflowService.update(auth.projectId!, workflowId, {
      name,
      description,
      triggerType,
      triggerConfig,
      enabled,
      allowReentry,
    });

    return res.status(200).json(workflow);
  }

  /**
   * DELETE /workflows/:id
   * Delete a workflow
   */
  @Delete(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async delete(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    await WorkflowService.delete(auth.projectId!, workflowId);

    return res.status(204).send();
  }

  /**
   * POST /workflows/:id/duplicate
   * Duplicate a workflow (always disabled, no execution state)
   */
  @Post(':id/duplicate')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async duplicate(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    const workflow = await WorkflowService.duplicate(auth.projectId!, workflowId);

    return res.status(201).json(workflow);
  }

  /**
   * POST /workflows/:id/steps
   * Add a step to a workflow
   */
  @Post(':id/steps')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async addStep(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const {type, name, position, config, templateId, autoConnect} = req.body;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    if (!type || !name || !position || !config) {
      return res.status(400).json({error: 'Type, name, position, and config are required'});
    }

    const step = await WorkflowService.addStep(auth.projectId!, workflowId, {
      type,
      name,
      position,
      config,
      templateId,
      autoConnect,
    });

    return res.status(201).json(step);
  }

  /**
   * PATCH /workflows/:id/steps/:stepId
   * Update a workflow step
   */
  @Patch(':id/steps/:stepId')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async updateStep(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const stepId = req.params.stepId;
    const {name, position, config, templateId} = req.body;

    if (!workflowId || !stepId) {
      return res.status(400).json({error: 'Workflow ID and Step ID are required'});
    }

    const step = await WorkflowService.updateStep(auth.projectId!, workflowId, stepId, {
      name,
      position,
      config,
      templateId,
    });

    return res.status(200).json(step);
  }

  /**
   * DELETE /workflows/:id/steps/:stepId
   * Delete a workflow step
   */
  @Delete(':id/steps/:stepId')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async deleteStep(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const stepId = req.params.stepId;
    const splice = req.query.splice === 'true';

    if (!workflowId || !stepId) {
      return res.status(400).json({error: 'Workflow ID and Step ID are required'});
    }

    if (splice) {
      await WorkflowService.spliceStep(auth.projectId!, workflowId, stepId);
    } else {
      await WorkflowService.deleteStep(auth.projectId!, workflowId, stepId);
    }

    return res.status(204).send();
  }

  /**
   * POST /workflows/:id/transitions
   * Create a transition between steps
   */
  @Post(':id/transitions')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async createTransition(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const {fromStepId, toStepId, condition, waitOutcome, priority} = req.body;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    if (!fromStepId || !toStepId) {
      return res.status(400).json({error: 'From step ID and to step ID are required'});
    }

    const transition = await WorkflowService.createTransition(auth.projectId!, workflowId, {
      fromStepId,
      toStepId,
      condition,
      waitOutcome,
      priority,
    });

    return res.status(201).json(transition);
  }

  /**
   * POST /workflows/:id/transitions/:transitionId/insert-step
   * Insert a new step in the middle of an existing transition (A -> B becomes A -> NEW -> B)
   */
  @Post(':id/transitions/:transitionId/insert-step')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async insertStepOnTransition(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const transitionId = req.params.transitionId;
    const {type, name, position, config, templateId} = req.body;

    if (!workflowId || !transitionId) {
      return res.status(400).json({error: 'Workflow ID and Transition ID are required'});
    }

    if (!type || !name || !config) {
      return res.status(400).json({error: 'Type, name, and config are required'});
    }

    const step = await WorkflowService.insertStepOnTransition(auth.projectId!, workflowId, transitionId, {
      type,
      name,
      position,
      config,
      templateId,
    });

    return res.status(201).json(step);
  }

  /**
   * DELETE /workflows/:id/transitions/:transitionId
   * Delete a transition
   */
  @Delete(':id/transitions/:transitionId')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async deleteTransition(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const transitionId = req.params.transitionId;

    if (!workflowId || !transitionId) {
      return res.status(400).json({error: 'Workflow ID and Transition ID are required'});
    }

    await WorkflowService.deleteTransition(auth.projectId!, workflowId, transitionId);

    return res.status(204).send();
  }

  /**
   * POST /workflows/:id/executions
   * Start a workflow execution for a contact
   */
  @Post(':id/executions')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async startExecution(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const {contactId, context} = req.body;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    if (!contactId) {
      return res.status(400).json({error: 'Contact ID is required'});
    }

    const execution = await WorkflowService.startExecution(auth.projectId!, workflowId, contactId, context);

    return res.status(201).json(execution);
  }

  /**
   * GET /workflows/:id/executions
   * List executions for a workflow
   */
  @Get(':id/executions')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async listExecutions(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const status = req.query.status as WorkflowExecutionStatus | undefined;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    const result = await WorkflowService.listExecutions(auth.projectId!, workflowId, page, pageSize, status);

    return res.status(200).json(result);
  }

  /**
   * GET /workflows/:id/executions/:executionId
   * Get a specific execution with details
   */
  @Get(':id/executions/:executionId')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getExecution(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const executionId = req.params.executionId;

    if (!workflowId || !executionId) {
      return res.status(400).json({error: 'Workflow ID and Execution ID are required'});
    }

    const execution = await WorkflowService.getExecution(auth.projectId!, workflowId, executionId);

    return res.status(200).json(execution);
  }

  /**
   * DELETE /workflows/:id/executions/:executionId
   * Cancel a workflow execution
   */
  @Delete(':id/executions/:executionId')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async cancelExecution(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;
    const executionId = req.params.executionId;

    if (!workflowId || !executionId) {
      return res.status(400).json({error: 'Workflow ID and Execution ID are required'});
    }

    const execution = await WorkflowService.cancelExecution(auth.projectId!, workflowId, executionId);

    return res.status(200).json(execution);
  }

  /**
   * POST /workflows/:id/executions/cancel-all
   * Cancel all active executions for a workflow
   */
  @Post(':id/executions/cancel-all')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async cancelAllExecutions(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const workflowId = req.params.id;

    if (!workflowId) {
      return res.status(400).json({error: 'Workflow ID is required'});
    }

    const result = await WorkflowService.cancelAllExecutions(auth.projectId!, workflowId);

    return res.status(200).json(result);
  }
}

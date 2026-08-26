import type {Workflow, WorkflowExecution, WorkflowStep, WorkflowTransition} from '@plunk/db';
import {Prisma, WorkflowExecutionStatus} from '@plunk/db';
import type {PaginatedResponse, WorkflowExecutionWithDetails, WorkflowWithDetails} from '@plunk/types';
import {toPrismaJson} from '@plunk/types';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import type {ListSort} from '../utils/listSort.js';

import {ContactService} from './ContactService.js';
import {EventService} from './EventService.js';
import {NtfyService} from './NtfyService.js';
import {WorkflowExecutionService} from './WorkflowExecutionService.js';

export class WorkflowService {
  private static async validateStepTemplate(projectId: string, templateId?: string | null): Promise<void> {
    if (templateId === undefined || templateId === null) {
      return;
    }

    const template = await prisma.template.findFirst({
      where: {id: templateId, projectId},
      select: {id: true},
    });

    if (!template) {
      throw new HttpException(404, 'Template not found');
    }
  }

  /**
   * Get all workflows for a project with pagination
   */
  public static async list(
    projectId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    sort: ListSort = {field: 'createdAt', direction: 'desc'},
    enabled?: boolean,
  ): Promise<PaginatedResponse<Workflow>> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkflowWhereInput = {
      projectId,
      // Status facet (Active / Disabled). Undefined = no filter; the
      // `@@index([projectId, enabled])` covers this predicate.
      ...(enabled !== undefined ? {enabled} : {}),
      ...(search
        ? {
            OR: [
              {name: {contains: search, mode: 'insensitive' as const}},
              {description: {contains: search, mode: 'insensitive' as const}},
            ],
          }
        : {}),
    };

    // The `steps` column sorts by the related step count, which Prisma expresses
    // as `orderBy: {steps: {_count}}` rather than a scalar field. Every other
    // sortable field (name/createdAt/updatedAt) maps straight onto the scalar.
    const orderBy: Prisma.WorkflowOrderByWithRelationInput =
      sort.field === 'steps'
        ? {steps: {_count: sort.direction}}
        : ({[sort.field]: sort.direction} as Prisma.WorkflowOrderByWithRelationInput);

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: {
              steps: true,
              executions: true,
            },
          },
        },
      }),
      prisma.workflow.count({where}),
    ]);

    return {
      data: workflows as Workflow[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single workflow by ID with all steps and transitions
   */
  public static async get(projectId: string, workflowId: string): Promise<WorkflowWithDetails> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        projectId,
      },
      include: {
        steps: {
          include: {
            template: {
              select: {
                id: true,
                name: true,
              },
            },
            outgoingTransitions: true,
            incomingTransitions: true,
          },
          orderBy: {createdAt: 'asc'},
        },
      },
    });

    if (!workflow) {
      throw new HttpException(404, 'Workflow not found');
    }

    return workflow;
  }

  /**
   * Create a new workflow
   */
  public static async create(
    projectId: string,
    data: {
      name: string;
      description?: string;
      eventName: string;
      enabled?: boolean;
      allowReentry?: boolean;
    },
  ): Promise<Workflow> {
    if (!data.eventName?.trim()) {
      throw new HttpException(400, 'Event name is required');
    }

    const workflow = await prisma.$transaction(async tx => {
      const newWorkflow = await tx.workflow.create({
        data: {
          projectId,
          name: data.name,
          description: data.description,
          triggerType: 'EVENT',
          triggerConfig: {eventName: data.eventName.trim()},
          enabled: data.enabled ?? false,
          allowReentry: data.allowReentry ?? false,
        },
      });

      await tx.workflowStep.create({
        data: {
          workflowId: newWorkflow.id,
          type: 'TRIGGER',
          name: `Trigger: ${data.eventName.trim()}`,
          position: {x: 100, y: 100},
          config: {eventName: data.eventName.trim()},
        },
      });

      return newWorkflow;
    });

    if (workflow.enabled) {
      await EventService.invalidateWorkflowCache(projectId);
    }

    // Get project name for notification
    const project = await prisma.project.findUnique({
      where: {id: projectId},
      select: {name: true},
    });

    if (project) {
      // Send notification about workflow creation
      await NtfyService.notifyWorkflowCreated(workflow.name, project.name, projectId);
    }

    return workflow;
  }

  /**
   * Update a workflow
   */
  public static async update(
    projectId: string,
    workflowId: string,
    data: {
      name?: string;
      description?: string;
      triggerType?: Workflow['triggerType'];
      triggerConfig?: Prisma.JsonValue;
      enabled?: boolean;
      allowReentry?: boolean;
    },
  ): Promise<Workflow> {
    // Verify workflow exists and belongs to project
    const workflow = await this.get(projectId, workflowId);

    // Check if workflow is enabled and has active executions
    if (workflow.enabled) {
      const activeExecutions = await this.hasActiveExecutions(workflowId);

      if (activeExecutions > 0) {
        // Block changes to trigger configuration while executions are running
        const hasCriticalChanges = data.triggerType !== undefined || data.triggerConfig !== undefined;

        if (hasCriticalChanges) {
          throw new HttpException(
            409,
            `Cannot modify workflow trigger while workflow has ${activeExecutions} active execution(s). ` +
              'Please disable the workflow first or wait for executions to complete. ' +
              'You can still update name, description, and re-entry settings.',
          );
        }
      }
    }

    // Use transaction to update workflow and TRIGGER step atomically
    const updated = await prisma.$transaction(async tx => {
      const updateData: Prisma.WorkflowUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
      if (data.triggerConfig !== undefined) {
        updateData.triggerConfig = data.triggerConfig === null ? Prisma.JsonNull : data.triggerConfig;
      }
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.allowReentry !== undefined) updateData.allowReentry = data.allowReentry;

      const updatedWorkflow = await tx.workflow.update({
        where: {id: workflowId},
        data: updateData,
        include: {
          project: {
            select: {name: true},
          },
        },
      });

      // If triggerConfig changed and it's an EVENT trigger, update the TRIGGER step
      if (data.triggerConfig !== undefined && updatedWorkflow.triggerType === 'EVENT') {
        const newTriggerConfig = data.triggerConfig as {eventName?: string} | null;
        const eventName = newTriggerConfig?.eventName;

        if (eventName) {
          // Find the TRIGGER step
          const triggerStep = await tx.workflowStep.findFirst({
            where: {
              workflowId: workflowId,
              type: 'TRIGGER',
            },
          });

          if (triggerStep) {
            // Update TRIGGER step config and name to match
            await tx.workflowStep.update({
              where: {id: triggerStep.id},
              data: {
                name: `Trigger: ${eventName}`,
                config: {eventName},
              },
            });
          }
        }
      }

      return updatedWorkflow;
    });

    // Invalidate workflow cache if enabled status changed or workflow is enabled
    if (data.enabled !== undefined || updated.enabled) {
      await EventService.invalidateWorkflowCache(projectId);
    }

    // Also invalidate cache if triggerConfig changed on an enabled workflow
    if (data.triggerConfig !== undefined && updated.enabled) {
      await EventService.invalidateWorkflowCache(projectId);
    }

    // Send notification if enabled status changed
    if (data.enabled !== undefined && data.enabled !== workflow.enabled) {
      if (data.enabled) {
        await NtfyService.notifyWorkflowEnabled(updated.name, updated.project.name, projectId);
      } else {
        await NtfyService.notifyWorkflowDisabled(updated.name, updated.project.name, projectId);
      }
    }

    return updated;
  }

  /**
   * Delete a workflow
   */
  public static async delete(projectId: string, workflowId: string): Promise<void> {
    // Verify workflow exists and belongs to project - get with project name
    const workflow = await prisma.workflow.findUnique({
      where: {id: workflowId, projectId},
      include: {
        project: {
          select: {name: true},
        },
      },
    });

    if (!workflow) {
      throw new HttpException(404, 'Workflow not found');
    }

    // Check if workflow has active executions
    const activeExecutions = await this.hasActiveExecutions(workflowId);

    if (activeExecutions > 0) {
      throw new HttpException(
        409,
        `Cannot delete workflow: it has ${activeExecutions} active execution(s). Please wait for them to complete or cancel them first.`,
      );
    }

    await prisma.workflow.delete({
      where: {id: workflowId},
    });

    // Invalidate workflow cache if workflow was enabled
    if (workflow.enabled) {
      await EventService.invalidateWorkflowCache(projectId);
    }

    // Send notification about workflow deletion
    await NtfyService.notifyWorkflowDeleted(workflow.name, workflow.project.name, projectId);
  }

  /**
   * Apply a bulk operation to multiple workflows at once.
   *
   * The payload is intentionally open-ended (a single endpoint) so future bulk
   * operations (e.g. enable / disable) can stack on the same operation. For now
   * the only supported mode is `delete: true` (bulk delete).
   *
   * Atomicity: every selected workflow must belong to the requesting project AND
   * none of them may currently have active executions. Both checks plus the
   * `deleteMany` are folded into a single Prisma transaction, so a partial bulk
   * delete is impossible — either every selected workflow is removed, or the
   * whole operation rolls back.
   *
   * Guards mirror the single-workflow `delete()` above:
   * - 404 if any id is missing from this project (foreign / cross-project id).
   * - 409 if any selected workflow has active (RUNNING / WAITING) executions.
   *
   * Deleting a workflow cascades its steps, transitions and executions exactly
   * as the single `delete()` does (Prisma relations). After the transaction
   * commits, the enabled-workflow cache is invalidated once if any deleted
   * workflow was enabled, matching the single-delete side effect.
   */
  public static async bulkUpdate(
    projectId: string,
    options: {ids: string[]; delete?: boolean},
  ): Promise<{deleted?: number; updated?: number}> {
    const {ids, delete: shouldDelete} = options;

    // Dedup defensively — the schema permits the same id twice and we don't
    // want duplicates inflating the ownership / row counts below.
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length === 0) {
      return {updated: 0};
    }

    if (shouldDelete) {
      const {deleted, hadEnabled} = await prisma.$transaction(async tx => {
        // 1. Ownership / project-scope check. Cross-project leaks are the main
        //    thing this endpoint must defend against.
        const owned = await tx.workflow.findMany({
          where: {id: {in: uniqueIds}, projectId},
          select: {id: true, enabled: true},
        });

        if (owned.length !== uniqueIds.length) {
          throw new HttpException(404, 'One or more workflows not found in this project');
        }

        // 2. Reject the whole bulk delete if ANY selected workflow has active
        //    executions. Mirrors the single delete() guard — no partial wipes.
        const activeExecutions = await tx.workflowExecution.count({
          where: {
            workflowId: {in: uniqueIds},
            status: {
              in: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING],
            },
          },
        });

        if (activeExecutions > 0) {
          throw new HttpException(
            409,
            `Cannot delete: ${activeExecutions} active execution(s) across the selected workflows. ` +
              'Please wait for them to complete or cancel them first.',
          );
        }

        const result = await tx.workflow.deleteMany({
          where: {id: {in: uniqueIds}, projectId},
        });

        return {deleted: result.count, hadEnabled: owned.some(w => w.enabled)};
      });

      // Invalidate workflow cache if any deleted workflow was enabled.
      if (hadEnabled) {
        await EventService.invalidateWorkflowCache(projectId);
      }

      return {deleted};
    }

    // No-op shape for forward-compat: when other bulk modes ship they'll branch
    // off here. Returning {updated: 0} keeps the response shape stable.
    return {updated: 0};
  }

  /**
   * Duplicate a workflow including all steps and transitions.
   * The duplicate always starts disabled to prevent accidental triggering.
   * Runtime execution state is intentionally not copied.
   */
  public static async duplicate(projectId: string, workflowId: string): Promise<Workflow> {
    const source = await this.get(projectId, workflowId);

    const transitions = await prisma.workflowTransition.findMany({
      where: {fromStep: {workflowId}},
    });

    return prisma.$transaction(async tx => {
      const newWorkflow = await tx.workflow.create({
        data: {
          projectId,
          name: `${source.name} (Copy)`,
          description: source.description,
          triggerType: source.triggerType,
          triggerConfig:
            source.triggerConfig === null
              ? Prisma.JsonNull
              : (source.triggerConfig as Prisma.InputJsonValue),
          enabled: false,
          allowReentry: source.allowReentry,
        },
      });

      const stepIdMap = new Map<string, string>();

      for (const step of source.steps) {
        const created = await tx.workflowStep.create({
          data: {
            workflowId: newWorkflow.id,
            type: step.type,
            name: step.name,
            position: step.position as Prisma.InputJsonValue,
            config: step.config as Prisma.InputJsonValue,
            templateId: step.templateId,
          },
        });
        stepIdMap.set(step.id, created.id);
      }

      for (const transition of transitions) {
        const fromStepId = stepIdMap.get(transition.fromStepId);
        const toStepId = stepIdMap.get(transition.toStepId);
        if (!fromStepId || !toStepId) continue;

        await tx.workflowTransition.create({
          data: {
            fromStepId,
            toStepId,
            condition:
              transition.condition === null
                ? Prisma.JsonNull
                : (transition.condition as Prisma.InputJsonValue),
            priority: transition.priority,
          },
        });
      }

      return newWorkflow;
    });
  }

  /**
   * Add a step to a workflow
   */
  public static async addStep(
    projectId: string,
    workflowId: string,
    data: {
      type: WorkflowStep['type'];
      name: string;
      position: Prisma.JsonValue;
      config: Prisma.JsonValue;
      templateId?: string;
      autoConnect?: boolean; // If true, automatically connect from the last step
    },
  ): Promise<WorkflowStep> {
    // Verify workflow exists and belongs to project
    const workflow = await this.get(projectId, workflowId);

    // Prevent adding duplicate TRIGGER steps
    if (data.type === 'TRIGGER') {
      const existingTrigger = workflow.steps.find(step => step.type === 'TRIGGER');
      if (existingTrigger) {
        throw new HttpException(400, 'Workflow already has a trigger step. Only one trigger is allowed per workflow.');
      }
    }

    await this.validateStepTemplate(projectId, data.templateId);

    // Create the new step
    const newStep = await prisma.workflowStep.create({
      data: {
        workflowId,
        type: data.type,
        name: data.name,
        position: toPrismaJson(data.position),
        config: toPrismaJson(data.config),
        templateId: data.templateId,
      },
    });

    // Auto-connect: If enabled (default true), create a transition from the last step to this new step
    // This is useful for linear workflows where steps are added sequentially
    const shouldAutoConnect = data.autoConnect !== false; // Default to true

    if (shouldAutoConnect && workflow.steps.length > 0) {
      // Find the last step that doesn't have any outgoing transitions (the "leaf" step)
      // This is typically the most recently added step
      const stepsWithoutOutgoing = workflow.steps.filter(step => step.outgoingTransitions.length === 0);

      if (stepsWithoutOutgoing.length > 0) {
        // Connect from the last leaf step to the new step
        const lastStep = stepsWithoutOutgoing[stepsWithoutOutgoing.length - 1];

        if (lastStep) {
          await prisma.workflowTransition.create({
            data: {
              fromStepId: lastStep.id,
              toStepId: newStep.id,
              priority: 0,
            },
          });
        }
      }
    }

    return newStep;
  }

  /**
   * Update a workflow step
   */
  public static async updateStep(
    projectId: string,
    workflowId: string,
    stepId: string,
    data: {
      name?: string;
      position?: Prisma.JsonValue;
      config?: Prisma.JsonValue;
      templateId?: string | null;
    },
  ): Promise<WorkflowStep> {
    // First verify workflow belongs to project
    const workflow = await this.get(projectId, workflowId);

    // Then verify step exists and belongs to workflow
    const step = await prisma.workflowStep.findUnique({
      where: {id: stepId},
    });

    if (step?.workflowId !== workflowId) {
      throw new HttpException(404, 'Workflow step not found');
    }

    // Check if workflow is enabled and has active executions
    if (workflow.enabled) {
      const activeExecutions = await this.hasActiveExecutions(workflowId);

      if (activeExecutions > 0) {
        // Only allow safe changes: name and position updates
        const hasCriticalChanges = data.config !== undefined || data.templateId !== undefined;

        if (hasCriticalChanges) {
          throw new HttpException(
            409,
            `Cannot modify step configuration while workflow has ${activeExecutions} active execution(s). ` +
              'Please disable the workflow first or wait for executions to complete. ' +
              'You can still update the step name and position.',
          );
        }
      }
    }

    await this.validateStepTemplate(projectId, data.templateId);

    const updateData: Prisma.WorkflowStepUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.position !== undefined) updateData.position = toPrismaJson(data.position);
    if (data.config !== undefined) updateData.config = toPrismaJson(data.config);
    if (data.templateId !== undefined) {
      if (data.templateId === null) {
        updateData.template = {disconnect: true};
      } else {
        updateData.template = {connect: {id: data.templateId}};
      }
    }

    return prisma.workflowStep.update({
      where: {id: stepId},
      data: updateData,
    });
  }

  /**
   * Delete a workflow step
   */
  public static async deleteStep(projectId: string, workflowId: string, stepId: string): Promise<void> {
    const workflow = await this.get(projectId, workflowId);

    const step = await prisma.workflowStep.findUnique({
      where: {id: stepId},
      include: {
        outgoingTransitions: true,
      },
    });

    if (step?.workflowId !== workflowId) {
      throw new HttpException(404, 'Workflow step not found');
    }

    // Prevent deletion of TRIGGER steps
    if (step.type === 'TRIGGER') {
      throw new HttpException(400, 'Cannot delete the trigger step. Every workflow must have a trigger.');
    }

    // Check if workflow is enabled and has active executions on this step or downstream
    if (workflow.enabled) {
      // Check if any active executions are currently on this step
      const executionsOnStep = await prisma.workflowExecution.count({
        where: {
          workflowId,
          currentStepId: stepId,
          status: {
            in: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING],
          },
        },
      });

      if (executionsOnStep > 0) {
        throw new HttpException(
          409,
          `Cannot delete step "${step.name}" while ${executionsOnStep} execution(s) are currently on this step. ` +
            'Please disable the workflow first or wait for executions to complete.',
        );
      }

      // Also check downstream steps for active executions
      const allSteps = await prisma.workflowStep.findMany({
        where: {workflowId},
        include: {outgoingTransitions: true},
      });

      // Build adjacency map
      const adjacencyMap = new Map<string, string[]>();
      for (const s of allSteps) {
        adjacencyMap.set(
          s.id,
          s.outgoingTransitions.map(t => t.toStepId),
        );
      }

      // Find all downstream steps
      const downstreamSteps = new Set<string>([stepId]);
      const queue = [stepId];

      while (queue.length > 0) {
        const currentStepId = queue.shift()!;
        const outgoingStepIds = adjacencyMap.get(currentStepId) || [];

        for (const nextStepId of outgoingStepIds) {
          if (!downstreamSteps.has(nextStepId)) {
            downstreamSteps.add(nextStepId);
            queue.push(nextStepId);
          }
        }
      }

      // Check if any active executions are on downstream steps
      const executionsOnDownstream = await prisma.workflowExecution.count({
        where: {
          workflowId,
          currentStepId: {in: Array.from(downstreamSteps)},
          status: {
            in: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING],
          },
        },
      });

      if (executionsOnDownstream > 0) {
        throw new HttpException(
          409,
          `Cannot delete step "${step.name}" while ${executionsOnDownstream} execution(s) are on downstream steps. ` +
            'Deleting this step would orphan those executions. ' +
            'Please disable the workflow first or wait for executions to complete.',
        );
      }
    }

    // Find all downstream steps that need to be deleted (cascade)
    // First, get all steps and transitions for this workflow to build a graph
    const allSteps = await prisma.workflowStep.findMany({
      where: {workflowId},
      include: {outgoingTransitions: true},
    });

    // Build adjacency map for efficient traversal
    const adjacencyMap = new Map<string, string[]>();
    for (const s of allSteps) {
      adjacencyMap.set(
        s.id,
        s.outgoingTransitions.map(t => t.toStepId),
      );
    }

    // Use BFS to traverse the workflow graph and find all downstream steps
    const stepsToDelete = new Set<string>([stepId]);
    const queue = [stepId];

    while (queue.length > 0) {
      const currentStepId = queue.shift()!;
      const outgoingStepIds = adjacencyMap.get(currentStepId) || [];

      for (const nextStepId of outgoingStepIds) {
        if (!stepsToDelete.has(nextStepId)) {
          stepsToDelete.add(nextStepId);
          queue.push(nextStepId);
        }
      }
    }

    // Delete all affected steps (Prisma will cascade delete the transitions)
    await prisma.workflowStep.deleteMany({
      where: {
        id: {in: Array.from(stepsToDelete)},
        workflowId, // Safety check to ensure we only delete steps from this workflow
      },
    });
  }

  /**
   * Splice a step out of the flow: re-wire its parent(s) directly to its child,
   * then delete only the step itself. Not allowed for CONDITION or TRIGGER steps.
   */
  public static async spliceStep(projectId: string, workflowId: string, stepId: string): Promise<void> {
    await this.get(projectId, workflowId);

    const step = await prisma.workflowStep.findUnique({
      where: {id: stepId},
      include: {
        outgoingTransitions: true,
        incomingTransitions: true,
      },
    });

    if (step?.workflowId !== workflowId) {
      throw new HttpException(404, 'Workflow step not found');
    }

    if (step.type === 'TRIGGER') {
      throw new HttpException(400, 'Cannot remove the trigger step.');
    }

    if (step.type === 'CONDITION') {
      throw new HttpException(400, 'Cannot splice a condition step out of the flow.');
    }

    // Check for active executions on this step
    const executionsOnStep = await prisma.workflowExecution.count({
      where: {
        workflowId,
        currentStepId: stepId,
        status: {in: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING]},
      },
    });

    if (executionsOnStep > 0) {
      throw new HttpException(
        409,
        `Cannot remove step "${step.name}" while ${executionsOnStep} execution(s) are currently on it. ` +
          'Please disable the workflow first or wait for executions to complete.',
      );
    }

    // Re-wire: for each incoming transition, point it to our child (if we have one)
    const child = step.outgoingTransitions[0];

    if (child) {
      for (const incoming of step.incomingTransitions) {
        await prisma.workflowTransition.update({
          where: {id: incoming.id},
          data: {toStepId: child.toStepId},
        });
      }
    }

    // Delete the step — cascades and removes its own transitions
    await prisma.workflowStep.delete({where: {id: stepId}});
  }

  /**
   * Insert a new step in the middle of an existing transition.
   *
   * Given `A -[t]-> B`, this creates `A -[t]-> NEW -> B` in a single transaction:
   * the existing transition is re-pointed at the new step (keeping its condition,
   * so a condition branch keeps its label) and a fresh transition carries the
   * flow on to the original target.
   *
   * When the inserted step is itself a CONDITION, the downstream transition is
   * attached to its first branch (`yes`) rather than left unconditional — a
   * condition step routes exclusively by branch, so an unconditional outgoing
   * transition would never be taken and B would be stranded.
   *
   * Purely additive — no step is removed and nothing becomes unreachable — so
   * unlike splice/delete this does not need to guard against in-flight executions.
   * An execution parked on A simply picks up the new step on its next hop.
   */
  public static async insertStepOnTransition(
    projectId: string,
    workflowId: string,
    transitionId: string,
    data: {
      type: WorkflowStep['type'];
      name: string;
      position?: Prisma.JsonValue;
      config: Prisma.JsonValue;
      templateId?: string;
    },
  ): Promise<WorkflowStep> {
    await this.get(projectId, workflowId);

    const transition = await prisma.workflowTransition.findFirst({
      where: {
        id: transitionId,
        fromStep: {workflowId, workflow: {projectId}},
      },
    });

    if (!transition) {
      throw new HttpException(404, 'Transition not found');
    }

    if (data.type === 'TRIGGER') {
      throw new HttpException(400, 'A trigger step cannot be inserted into the flow.');
    }

    // EXIT terminates a path, so it can never carry the flow on to the original
    // target — inserting one here would silently orphan everything below it.
    if (data.type === 'EXIT') {
      throw new HttpException(
        400,
        'An exit step ends the flow and cannot be inserted between two steps. ' +
          'Disconnect the steps first, then add the exit step.',
      );
    }

    await this.validateStepTemplate(projectId, data.templateId);

    return prisma.$transaction(async tx => {
      const newStep = await tx.workflowStep.create({
        data: {
          workflowId,
          type: data.type,
          name: data.name,
          position: toPrismaJson(data.position ?? {x: 0, y: 0}),
          config: toPrismaJson(data.config),
          templateId: data.templateId,
        },
      });

      // Re-point the original transition (keeps its condition/priority, so the
      // branch it belongs to is preserved) at the new step.
      await tx.workflowTransition.update({
        where: {id: transitionId},
        data: {toStepId: newStep.id},
      });

      await tx.workflowTransition.create({
        data: {
          fromStepId: newStep.id,
          toStepId: transition.toStepId,
          // A freshly created condition has no config yet, which the builder reads
          // as the default binary yes/no pair — so `yes` is its first branch.
          condition: data.type === 'CONDITION' ? toPrismaJson({branch: 'yes'}) : Prisma.JsonNull,
          priority: 0,
        },
      });

      return newStep;
    });
  }

  /**
   * Whether `targetStepId` is reachable by following transitions from `fromStepId`.
   * Used to keep the graph acyclic when new connections are made.
   */
  private static async reaches(workflowId: string, fromStepId: string, targetStepId: string): Promise<boolean> {
    if (fromStepId === targetStepId) {
      return true;
    }

    const allSteps = await prisma.workflowStep.findMany({
      where: {workflowId},
      select: {id: true, outgoingTransitions: {select: {toStepId: true}}},
    });

    const adjacency = new Map(allSteps.map(s => [s.id, s.outgoingTransitions.map(t => t.toStepId)]));

    const seen = new Set<string>([fromStepId]);
    const queue = [fromStepId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      for (const nextId of adjacency.get(currentId) ?? []) {
        if (nextId === targetStepId) {
          return true;
        }
        if (!seen.has(nextId)) {
          seen.add(nextId);
          queue.push(nextId);
        }
      }
    }

    return false;
  }

  /**
   * Create a transition between two steps
   */
  public static async createTransition(
    projectId: string,
    workflowId: string,
    data: {
      fromStepId: string;
      toStepId: string;
      condition?: Prisma.JsonValue;
      priority?: number;
    },
  ): Promise<WorkflowTransition> {
    if (data.fromStepId === data.toStepId) {
      throw new HttpException(400, 'A step cannot be connected to itself');
    }

    // Verify both steps belong to the workflow
    const steps = await prisma.workflowStep.findMany({
      where: {
        id: {in: [data.fromStepId, data.toStepId]},
        workflowId,
        workflow: {projectId},
      },
    });

    if (steps.length !== 2) {
      throw new HttpException(404, 'One or both steps not found');
    }

    const fromStep = steps.find(s => s.id === data.fromStepId);

    // An exit step terminates the path it is on.
    if (fromStep?.type === 'EXIT') {
      throw new HttpException(400, 'An exit step ends the flow and cannot be connected to another step');
    }

    // For CONDITION steps, validate that this branch doesn't already have a transition
    if (fromStep?.type === 'CONDITION' && data.condition) {
      const conditionObj =
        typeof data.condition === 'object' && data.condition !== null
          ? (data.condition as Record<string, unknown>)
          : null;
      if (conditionObj && 'branch' in conditionObj) {
        // Check if a transition with this branch already exists
        const existingTransition = await prisma.workflowTransition.findFirst({
          where: {
            fromStepId: data.fromStepId,
            condition: {
              path: ['branch'],
              equals: toPrismaJson(conditionObj.branch),
            },
          },
        });

        if (existingTransition) {
          throw new HttpException(
            400,
            `A transition for the "${conditionObj.branch}" branch already exists from this step`,
          );
        }
      }
    } else if (fromStep?.type !== 'CONDITION') {
      // Every other step type routes to exactly one next step. A second outgoing
      // transition would make the next hop ambiguous at execution time.
      const existingOutgoing = await prisma.workflowTransition.findFirst({
        where: {fromStepId: data.fromStepId},
      });

      if (existingOutgoing) {
        throw new HttpException(
          400,
          `"${fromStep?.name}" already leads to another step. Disconnect it first, or use a condition step to branch.`,
        );
      }
    }

    // Reject connections that would close a loop. Nothing bounds how many times
    // an execution may traverse the graph, so a cycle would run indefinitely.
    if (await this.reaches(workflowId, data.toStepId, data.fromStepId)) {
      throw new HttpException(400, 'This connection would create a loop in the workflow');
    }

    const newTransition = await prisma.workflowTransition.create({
      data: {
        fromStepId: data.fromStepId,
        toStepId: data.toStepId,
        condition: data.condition ?? Prisma.JsonNull,
        priority: data.priority ?? 0,
      },
    });

    return newTransition;
  }

  /**
   * Delete a transition
   */
  public static async deleteTransition(projectId: string, workflowId: string, transitionId: string): Promise<void> {
    // Get workflow to check if it's enabled
    const workflow = await this.get(projectId, workflowId);

    // Verify transition exists and belongs to workflow
    const transition = await prisma.workflowTransition.findFirst({
      where: {
        id: transitionId,
        fromStep: {
          workflowId,
          workflow: {projectId},
        },
      },
      include: {
        fromStep: true,
        toStep: true,
      },
    });

    if (!transition) {
      throw new HttpException(404, 'Transition not found');
    }

    // Check if workflow is enabled and has active executions that could be affected
    if (workflow.enabled) {
      // Get all steps that would become orphaned by removing this transition
      const allSteps = await prisma.workflowStep.findMany({
        where: {workflowId},
        include: {outgoingTransitions: true, incomingTransitions: true},
      });

      // Build adjacency map without this transition
      const adjacencyMap = new Map<string, string[]>();
      for (const s of allSteps) {
        adjacencyMap.set(
          s.id,
          s.outgoingTransitions.filter(t => t.id !== transitionId).map(t => t.toStepId),
        );
      }

      // Find all steps reachable from the toStep (downstream)
      const downstreamSteps = new Set<string>([transition.toStepId]);
      const queue = [transition.toStepId];

      while (queue.length > 0) {
        const currentStepId = queue.shift()!;
        const outgoingStepIds = adjacencyMap.get(currentStepId) || [];

        for (const nextStepId of outgoingStepIds) {
          if (!downstreamSteps.has(nextStepId)) {
            downstreamSteps.add(nextStepId);
            queue.push(nextStepId);
          }
        }
      }

      // Check if any active executions are on the toStep or downstream steps
      const executionsAffected = await prisma.workflowExecution.count({
        where: {
          workflowId,
          currentStepId: {in: Array.from(downstreamSteps)},
          status: {
            in: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING],
          },
        },
      });

      if (executionsAffected > 0) {
        throw new HttpException(
          409,
          `Cannot delete transition from "${transition.fromStep.name}" to "${transition.toStep.name}" ` +
            `while ${executionsAffected} execution(s) are on affected steps. ` +
            'Please disable the workflow first or wait for executions to complete.',
        );
      }
    }

    await prisma.workflowTransition.delete({
      where: {id: transitionId},
    });
  }

  /**
   * Start a workflow execution for a contact
   */
  public static async startExecution(
    projectId: string,
    workflowId: string,
    contactId: string,
    context?: Prisma.JsonValue,
  ): Promise<WorkflowExecution> {
    // Verify workflow exists, is enabled, and belongs to project
    const workflow = await this.get(projectId, workflowId);

    if (!workflow.enabled) {
      throw new HttpException(400, 'Workflow is not enabled');
    }

    // Verify contact belongs to project
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        projectId,
      },
    });

    if (!contact) {
      throw new HttpException(404, 'Contact not found');
    }

    // Check re-entry rules
    if (!workflow.allowReentry) {
      // If re-entry is not allowed, check if contact has ANY execution (regardless of status)
      const existingExecution = await prisma.workflowExecution.findFirst({
        where: {
          workflowId,
          contactId,
        },
      });

      if (existingExecution) {
        throw new HttpException(
          409,
          `Workflow does not allow re-entry. Contact already has execution (${existingExecution.status})`,
        );
      }
    } else {
      // If re-entry is allowed, only check if there's a currently RUNNING execution
      const runningExecution = await prisma.workflowExecution.findFirst({
        where: {
          workflowId,
          contactId,
          status: WorkflowExecutionStatus.RUNNING,
        },
      });

      if (runningExecution) {
        throw new HttpException(409, 'Workflow is already running for this contact');
      }
    }

    // Find the trigger step
    const triggerStep = workflow.steps.find(step => step.type === 'TRIGGER');

    if (!triggerStep) {
      throw new HttpException(400, 'Workflow has no trigger step');
    }

    // Create workflow execution
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        contactId,
        status: WorkflowExecutionStatus.RUNNING,
        currentStepId: triggerStep.id,
        context: context ?? Prisma.JsonNull,
      },
    });

    // Start executing the workflow asynchronously
    // Don't await - let it run in background
    WorkflowExecutionService.processStepExecution(execution.id, triggerStep.id).catch(error => {
      signale.error('Error executing workflow:', error);
    });

    return execution;
  }

  /**
   * Get workflow executions with filtering
   */
  public static async listExecutions(
    projectId: string,
    workflowId: string,
    page = 1,
    pageSize = 20,
    status?: WorkflowExecutionStatus,
  ) {
    // Verify workflow belongs to project
    await this.get(projectId, workflowId);

    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkflowExecutionWhereInput = {
      workflowId,
      ...(status ? {status} : {}),
    };

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {startedAt: 'desc'},
        include: {
          contact: {
            select: {
              id: true,
              email: true,
            },
          },
          currentStep: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      prisma.workflowExecution.count({where}),
    ]);

    return {
      executions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single execution with details
   */
  public static async getExecution(
    projectId: string,
    workflowId: string,
    executionId: string,
  ): Promise<WorkflowExecutionWithDetails> {
    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId,
        workflow: {projectId},
      },
      include: {
        workflow: true,
        contact: {
          select: {
            id: true,
            email: true,
          },
        },
        currentStep: true,
        stepExecutions: {
          include: {
            step: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {createdAt: 'asc'},
        },
      },
    });

    if (!execution) {
      throw new HttpException(404, 'Workflow execution not found');
    }

    return execution;
  }

  /**
   * Cancel a workflow execution
   */
  public static async cancelExecution(
    projectId: string,
    workflowId: string,
    executionId: string,
  ): Promise<WorkflowExecution> {
    // Verify execution exists
    await this.getExecution(projectId, workflowId, executionId);

    return prisma.workflowExecution.update({
      where: {id: executionId},
      data: {
        status: WorkflowExecutionStatus.CANCELLED,
        completedAt: new Date(),
        exitReason: 'Cancelled by user',
      },
    });
  }

  /**
   * Cancel all active executions for a workflow
   */
  public static async cancelAllExecutions(projectId: string, workflowId: string): Promise<{cancelled: number}> {
    // Verify workflow exists and belongs to project
    await this.get(projectId, workflowId);

    // Cancel all running and waiting executions
    const result = await prisma.workflowExecution.updateMany({
      where: {
        workflowId,
        status: {
          in: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING],
        },
      },
      data: {
        status: WorkflowExecutionStatus.CANCELLED,
        completedAt: new Date(),
        exitReason: 'Cancelled by user (bulk cancel)',
      },
    });

    return {cancelled: result.count};
  }

  /**
   * Get all available fields for workflow conditions (contact fields + event fields)
   */
  public static async getAvailableFields(projectId: string, eventName?: string) {
    // Get contact fields with types (standard + custom data fields)
    const contactFieldsWithTypes = await ContactService.getAvailableFields(projectId);

    // Build typed field list with 'contact.' prefix
    const contactFields = contactFieldsWithTypes.map(f => ({
      field: `contact.${f.field}`,
      type: f.type,
      category: f.field.startsWith('data.') ? 'Custom Data' : 'Contact Fields',
    }));

    // Get event fields by analyzing actual event data
    // Event fields are treated as dynamic (unknown type at runtime)
    const eventFieldNames = await EventService.getAvailableEventFields(projectId, eventName);
    const eventFields = eventFieldNames.map(field => ({
      field,
      type: 'string' as const, // Event fields default to string, can contain any JSON value
      category: 'Event Data',
    }));

    // Combine all fields
    const allFields = [...contactFields, ...eventFields].sort((a, b) => a.field.localeCompare(b.field));

    // Also return legacy format for backwards compatibility
    const fieldNames = allFields.map(f => f.field);

    return {
      fields: fieldNames,
      typedFields: allFields,
      count: allFields.length,
    };
  }

  /**
   * Check if a workflow has active executions
   */
  private static async hasActiveExecutions(workflowId: string): Promise<number> {
    return prisma.workflowExecution.count({
      where: {
        workflowId,
        status: {
          in: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING],
        },
      },
    });
  }
}

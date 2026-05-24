import type {Template} from '@plunk/db';
import {Prisma} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import type {ListSort} from '../utils/listSort.js';
import {buildEmailFieldsUpdate} from '../utils/modelUpdate.js';

export class TemplateService {
  /**
   * Get all templates for a project with pagination
   */
  public static async list(
    projectId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    type?: Template['type'],
    sort: ListSort = {field: 'createdAt', direction: 'desc'},
  ): Promise<PaginatedResponse<Template>> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.TemplateWhereInput = {
      projectId,
      ...(type ? {type} : {}),
      ...(search
        ? {
            OR: [
              {name: {contains: search, mode: 'insensitive' as const}},
              {description: {contains: search, mode: 'insensitive' as const}},
              {subject: {contains: search, mode: 'insensitive' as const}},
            ],
          }
        : {}),
    };

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {[sort.field]: sort.direction} as Prisma.TemplateOrderByWithRelationInput,
      }),
      prisma.template.count({where}),
    ]);

    return {
      data: templates,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single template by ID
   */
  public static async get(projectId: string, templateId: string): Promise<Template> {
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        projectId,
      },
    });

    if (!template) {
      throw new HttpException(404, 'Template not found');
    }

    return template;
  }

  /**
   * Create a new template
   */
  public static async create(
    projectId: string,
    data: {
      name: string;
      description?: string;
      subject: string;
      body: string;
      from: string;
      fromName?: string | null;
      replyTo?: string | null;
      type?: Template['type'];
    },
  ): Promise<Template> {
    return prisma.template.create({
      data: {
        projectId,
        name: data.name,
        description: data.description,
        subject: data.subject,
        body: data.body,
        from: data.from,
        fromName: data.fromName,
        replyTo: data.replyTo,
        type: data.type ?? 'MARKETING',
      },
    });
  }

  /**
   * Update a template
   */
  public static async update(
    projectId: string,
    templateId: string,
    data: {
      name?: string;
      description?: string;
      subject?: string;
      body?: string;
      from?: string;
      fromName?: string | null;
      replyTo?: string | null;
      type?: Template['type'];
    },
  ): Promise<Template> {
    // Verify template exists and belongs to project
    await this.get(projectId, templateId);

    const updateData = {
      ...buildEmailFieldsUpdate(data),
      ...(data.type !== undefined ? {type: data.type} : {}),
    } as Prisma.TemplateUpdateInput;

    return prisma.template.update({
      where: {id: templateId},
      data: updateData,
    });
  }

  /**
   * Delete a template
   */
  public static async delete(projectId: string, templateId: string): Promise<void> {
    // Verify template exists and belongs to project
    await this.get(projectId, templateId);

    // Check if template is used in any workflows
    const workflowSteps = await prisma.workflowStep.count({
      where: {
        templateId,
        workflow: {projectId},
      },
    });

    if (workflowSteps > 0) {
      throw new HttpException(
        409,
        'Cannot delete template: it is currently used in workflow steps. Remove it from workflows first.',
      );
    }

    await prisma.template.delete({
      where: {id: templateId},
    });
  }

  /**
   * Apply a bulk operation to multiple templates at once.
   *
   * The payload is intentionally open-ended (a single endpoint) so future
   * tag-related fields (`addTags` / `removeTags`) can stack on the same
   * operation once a `Template.tags` column exists. For now the only
   * supported mode is `delete: true` (bulk delete).
   *
   * Atomicity: every selected template must belong to the requesting project
   * AND none of them may currently be referenced by a workflow step. Both
   * checks plus the `deleteMany` are folded into a single Prisma transaction,
   * so a partial bulk delete is impossible — either every selected template is
   * removed, or the whole operation rolls back.
   *
   * - 404 if any id is missing from this project (foreign / cross-project id).
   * - 409 if any selected template is still referenced by a workflow step
   *   (mirrors the single-template `delete()` guard above).
   */
  public static async bulkUpdate(
    projectId: string,
    options: {ids: string[]; delete?: boolean},
  ): Promise<{deleted?: number; updated?: number}> {
    const {ids, delete: shouldDelete} = options;

    // Dedup defensively — the schema permits the same id twice and we don't
    // want duplicates inflating the ownership/row counts below.
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length === 0) {
      return {updated: 0};
    }

    if (shouldDelete) {
      return prisma.$transaction(async tx => {
        // 1. Ownership / project-scope check. Cross-project leaks are the main
        //    thing this endpoint must defend against.
        const owned = await tx.template.findMany({
          where: {id: {in: uniqueIds}, projectId},
          select: {id: true},
        });

        if (owned.length !== uniqueIds.length) {
          throw new HttpException(404, 'One or more templates not found in this project');
        }

        // 2. Reject the whole bulk delete if ANY selected template is still
        //    referenced by a workflow step. Mirrors the single delete()
        //    behavior — no partial wipes.
        const referenced = await tx.workflowStep.findMany({
          where: {
            templateId: {in: uniqueIds},
            workflow: {projectId},
          },
          select: {templateId: true},
          distinct: ['templateId'],
        });

        if (referenced.length > 0) {
          const count = referenced.length;
          throw new HttpException(
            409,
            `Cannot delete: ${count} of the selected template${
              count === 1 ? ' is' : 's are'
            } currently used in workflow steps. Remove from workflows first.`,
          );
        }

        const result = await tx.template.deleteMany({
          where: {id: {in: uniqueIds}, projectId},
        });

        return {deleted: result.count};
      });
    }

    // No-op shape for forward-compat: when tag add/remove modes ship they'll
    // branch off here. Returning {updated: 0} keeps the response shape stable.
    return {updated: 0};
  }

  /**
   * Duplicate a template
   */
  public static async duplicate(projectId: string, templateId: string): Promise<Template> {
    const template = await this.get(projectId, templateId);

    // Create a new template with the same data
    return prisma.template.create({
      data: {
        projectId,
        name: `${template.name} (Copy)`,
        description: template.description,
        subject: template.subject,
        body: template.body,
        from: template.from,
        fromName: template.fromName,
        replyTo: template.replyTo,
        type: template.type,
      },
    });
  }

  /**
   * Get template usage statistics
   */
  public static async getUsage(projectId: string, templateId: string) {
    // Verify template exists and belongs to project
    await this.get(projectId, templateId);

    const [workflowStepsCount, emailsCount] = await Promise.all([
      prisma.workflowStep.count({
        where: {
          templateId,
          workflow: {projectId},
        },
      }),
      prisma.email.count({
        where: {
          templateId,
          projectId,
        },
      }),
    ]);

    return {
      workflowSteps: workflowStepsCount,
      emailsSent: emailsCount,
    };
  }
}

import type {Template} from '@plunk/db';
import {Prisma} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
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
        orderBy: {createdAt: 'desc'},
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
      disableFooter?: boolean;
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
        disableFooter: data.disableFooter ?? false,
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
      disableFooter?: boolean;
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
        disableFooter: template.disableFooter,
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

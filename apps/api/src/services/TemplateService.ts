import type {Template} from '@plunk/db';
import {Prisma} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import {buildEmailFieldsUpdate} from '../utils/modelUpdate.js';
import {DomainService} from './DomainService.js';
import {sendRawEmail} from './SESService.js';

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

  /**
   * Send a test email for a template
   * Only project members can receive test emails
   */
  public static async sendTest(projectId: string, templateId: string, testEmail: string): Promise<void> {
    const template = await this.get(projectId, templateId);

    // Validate that the test email belongs to a project member
    const membership = await prisma.membership.findFirst({
      where: {
        projectId,
        user: {
          email: testEmail,
        },
      },
      include: {
        user: true,
      },
    });

    if (!membership) {
      throw new HttpException(403, 'Test emails can only be sent to project members');
    }

    // Verify domain is registered and verified before sending
    await DomainService.verifyEmailDomain(template.from, projectId);

    // Get project for fallback sender name
    const project = await prisma.project.findUnique({
      where: {id: projectId},
    });

    if (!project) {
      throw new HttpException(404, 'Project not found');
    }

    await sendRawEmail({
      from: {
        name: template.fromName || project.name || 'Plunk',
        email: template.from,
      },
      to: [testEmail],
      content: {
        subject: `[TEST] ${template.subject}`,
        html: template.body,
      },
      reply: template.replyTo || undefined,
      headers: {
        'X-Plunk-Test': 'true',
      },
      tracking: false,
    });
  }
}

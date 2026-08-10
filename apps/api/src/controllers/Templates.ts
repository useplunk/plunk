import {Controller, Delete, Get, Middleware, Patch, Post} from '@overnightjs/core';
import {TemplateType} from '@plunk/db';
import {TemplateSchemas} from '@plunk/shared';
import type {NextFunction, Request, Response} from 'express';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {DomainService} from '../services/DomainService.js';
import {TemplateService} from '../services/TemplateService.js';
import {CatchAsync} from '../utils/asyncHandler.js';
import {parseListSort} from '../utils/listSort.js';
import {assertValidTemplateSyntax} from '../utils/templateValidation.js';

@Controller('templates')
export class Templates {
  /**
   * GET /templates
   * List all templates for the authenticated project
   *
   * Query params:
   * - page, pageSize: pagination
   * - search: filter by name/description/subject
   * - type: filter by TemplateType
   * - sort: name | createdAt | updatedAt (default: createdAt)
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
    const type = req.query.type as TemplateType | undefined;
    const sort = parseListSort(req.query.sort, req.query.dir, {field: 'createdAt', direction: 'desc'});

    const result = await TemplateService.list(auth.projectId!, page, pageSize, search, type, sort);

    return res.status(200).json(result);
  }

  /**
   * GET /templates/:id
   * Get a specific template by ID
   */
  @Get(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async get(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({error: 'Template ID is required'});
    }

    const template = await TemplateService.get(auth.projectId!, templateId);

    return res.status(200).json(template);
  }

  /**
   * POST /templates
   * Create a new template
   */
  @Post('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async create(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {name, description, subject, body, from, fromName, replyTo, type} = req.body;

    if (!name) {
      return res.status(400).json({error: 'Name is required'});
    }

    if (!subject) {
      return res.status(400).json({error: 'Subject is required'});
    }

    if (!body) {
      return res.status(400).json({error: 'Body is required'});
    }

    if (!from) {
      return res.status(400).json({error: 'From address is required'});
    }

    assertValidTemplateSyntax({subject, body});

    // Verify domain ownership and verification
    await DomainService.verifyEmailDomain(from, auth.projectId!);

    const template = await TemplateService.create(auth.projectId!, {
      name,
      description,
      subject,
      body,
      from,
      fromName,
      replyTo,
      type,
    });

    return res.status(201).json(template);
  }

  /**
   * PATCH /templates/:id
   * Update a template
   */
  @Patch(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async update(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const templateId = req.params.id;
    const {name, description, subject, body, from, fromName, replyTo, type} = req.body;

    if (!templateId) {
      return res.status(400).json({error: 'Template ID is required'});
    }

    assertValidTemplateSyntax({subject, body});

    // Verify domain ownership and verification if 'from' is being updated
    if (from) {
      await DomainService.verifyEmailDomain(from, auth.projectId!);
    }

    const template = await TemplateService.update(auth.projectId!, templateId, {
      name,
      description,
      subject,
      body,
      from,
      fromName,
      replyTo,
      type,
    });

    return res.status(200).json(template);
  }

  /**
   * DELETE /templates/:id
   * Delete a template
   */
  @Delete(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async delete(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({error: 'Template ID is required'});
    }

    await TemplateService.delete(auth.projectId!, templateId);

    return res.status(204).send();
  }

  /**
   * POST /templates/bulk-update
   * Apply a bulk operation to multiple templates at once.
   *
   * Currently supports `{ids: string[], delete: true}` for bulk delete.
   * The schema is intentionally open-ended so tag-related fields
   * (addTags / removeTags) can stack on the same endpoint once a
   * `Template.tags` column exists.
   *
   * Atomicity: the underlying service wraps the ownership check, the
   * workflow-step-reference check, and the delete in a single Prisma
   * transaction, so a partial bulk delete is not possible.
   */
  @Post('bulk-update')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async bulkUpdate(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    // Let Zod throw on invalid input so the global error handler in app.ts
    // formats it into the standard {success:false, error:{message, ...}}
    // envelope, matching every other endpoint in this controller.
    const data = TemplateSchemas.bulkUpdate.parse(req.body);

    const result = await TemplateService.bulkUpdate(auth.projectId!, data);

    return res.status(200).json(result);
  }

  /**
   * POST /templates/:id/duplicate
   * Duplicate a template
   */
  @Post(':id/duplicate')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async duplicate(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({error: 'Template ID is required'});
    }

    const template = await TemplateService.duplicate(auth.projectId!, templateId);

    return res.status(201).json(template);
  }

  /**
   * GET /templates/:id/usage
   * Get template usage statistics
   */
  @Get(':id/usage')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getUsage(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({error: 'Template ID is required'});
    }

    const usage = await TemplateService.getUsage(auth.projectId!, templateId);

    return res.status(200).json(usage);
  }
}

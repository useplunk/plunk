import {Controller, Delete, Get, Middleware, Patch, Post} from '@overnightjs/core';
import {FormSchemas} from '@plunk/shared';
import type {FormField, FormSettings} from '@plunk/types';
import type {NextFunction, Request, Response} from 'express';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {FormService} from '../services/FormService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  return req.ip || 'unknown';
}

@Controller('forms')
export class Forms {
  /**
   * GET /forms/public/:publicId
   * PUBLIC: Get form configuration for rendering (no auth required)
   */
  @Get('public/:publicId')
  @CatchAsync
  public async getPublic(req: Request, res: Response, _next: NextFunction) {
    const publicId = req.params.publicId;

    if (!publicId) {
      return res.status(400).json({error: 'Form public ID is required'});
    }

    const config = await FormService.getPublicConfig(publicId);
    return res.status(200).json(config);
  }

  /**
   * POST /forms/public/:publicId/submit
   * PUBLIC: Submit a form (no auth required)
   */
  @Post('public/:publicId/submit')
  @CatchAsync
  public async submitPublic(req: Request, res: Response, _next: NextFunction) {
    const publicId = req.params.publicId;

    if (!publicId) {
      return res.status(400).json({error: 'Form public ID is required'});
    }

    const result = await FormService.submit(publicId, req.body, getClientIp(req));
    return res.status(200).json(result);
  }

  /**
   * GET /forms
   * List all forms for the authenticated project
   */
  @Get('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async list(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const forms = await FormService.list(auth.projectId!);
    return res.status(200).json(forms);
  }

  /**
   * POST /forms
   * Create a new form
   */
  @Post('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async create(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const data = FormSchemas.create.parse(req.body);

    const form = await FormService.create(auth.projectId!, {
      name: data.name,
      slug: data.slug,
      fields: data.fields as FormField[],
      settings: data.settings as FormSettings,
      segmentId: data.segmentId,
      enabled: data.enabled,
      createSegment: data.createSegment,
    });

    return res.status(201).json(form);
  }

  /**
   * GET /forms/:id
   * Get a specific form by ID
   */
  @Get(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async get(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const formId = req.params.id;

    if (!formId) {
      return res.status(400).json({error: 'Form ID is required'});
    }

    const form = await FormService.get(auth.projectId!, formId);
    return res.status(200).json(form);
  }

  /**
   * PATCH /forms/:id
   * Update a form
   */
  @Patch(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async update(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const formId = req.params.id;

    if (!formId) {
      return res.status(400).json({error: 'Form ID is required'});
    }

    const data = FormSchemas.update.parse(req.body);

    const form = await FormService.update(auth.projectId!, formId, {
      name: data.name,
      slug: data.slug,
      fields: data.fields as FormField[] | undefined,
      settings: data.settings as FormSettings | undefined,
      segmentId: data.segmentId,
      enabled: data.enabled,
      createSegment: data.createSegment,
    });

    return res.status(200).json(form);
  }

  /**
   * DELETE /forms/:id
   * Delete a form
   */
  @Delete(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async delete(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const formId = req.params.id;

    if (!formId) {
      return res.status(400).json({error: 'Form ID is required'});
    }

    await FormService.delete(auth.projectId!, formId);
    return res.status(204).send();
  }
}

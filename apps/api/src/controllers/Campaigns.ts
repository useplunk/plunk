import {Controller, Delete, Get, Middleware, Post, Put} from '@overnightjs/core';
import {CampaignAudienceType, CampaignStatus, TemplateType} from '@plunk/db';
import {CampaignSchemas, UtilitySchemas} from '@plunk/shared';
import type {NextFunction, Request, Response} from 'express';

import {HttpException} from '../exceptions/index.js';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {CampaignService} from '../services/CampaignService.js';
import {DomainService} from '../services/DomainService.js';
import {CatchAsync} from '../utils/asyncHandler.js';
import {parseListSort} from '../utils/listSort.js';
import {assertValidTemplateSyntax} from '../utils/templateValidation.js';

@Controller('campaigns')
export class Campaigns {
  /**
   * Create a new campaign
   * POST /campaigns
   */
  @Post('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async create(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {name, description, subject, body, from, fromName, replyTo, type, audienceType, audienceCondition, segmentId} =
      CampaignSchemas.create.parse(req.body);

    if (audienceType === CampaignAudienceType.SEGMENT && !segmentId) {
      throw new HttpException(400, 'Segment ID is required for SEGMENT audience type');
    }

    if (audienceType === CampaignAudienceType.FILTERED && !audienceCondition) {
      throw new HttpException(400, 'Audience condition is required for FILTERED audience type');
    }

    assertValidTemplateSyntax({subject, body});

    // Verify domain ownership and verification
    await DomainService.verifyEmailDomain(from, auth.projectId);

    const campaign = await CampaignService.create(auth.projectId, {
      name,
      description,
      subject,
      body,
      from,
      fromName,
      replyTo,
      type,
      audienceType,
      audienceCondition,
      segmentId,
    });

    return res.status(201).json({
      success: true,
      data: campaign,
    });
  }

  /**
   * Get all campaigns for a project
   * GET /campaigns
   *
   * Query params:
   * - page, pageSize: pagination
   * - status: filter by CampaignStatus
   * - search: filter by name/subject/from
   * - sort: name | createdAt | updatedAt (default: createdAt)
   * - dir: asc | desc (default: desc)
   */
  @Get('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async list(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const status = req.query.status as CampaignStatus | undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() || undefined : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const sort = parseListSort(req.query.sort, req.query.dir, {field: 'createdAt', direction: 'desc'});

    // Validate status if provided
    if (status && !Object.values(CampaignStatus).includes(status)) {
      throw new HttpException(400, 'Invalid status value');
    }

    const result = await CampaignService.list(auth.projectId, {
      status,
      search,
      page,
      pageSize,
      sort,
    });

    return res.json(result);
  }

  /**
   * Apply a bulk operation to multiple campaigns at once.
   * POST /campaigns/bulk-update
   *
   * Currently supports `{ids: string[], delete: true}` for bulk delete. The
   * schema is intentionally open-ended so future bulk operations can stack on
   * the same endpoint.
   *
   * Atomicity: the underlying service wraps the ownership check, the
   * draft-only guard, and the delete in a single Prisma transaction, so a
   * partial bulk delete is not possible.
   *
   * NOTE: This must be defined BEFORE the :id route to avoid conflicts.
   */
  @Post('bulk-update')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async bulkUpdate(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    // Let Zod throw on invalid input so the global error handler in app.ts
    // formats it into the standard error envelope, matching the other
    // schema-validated endpoints in this controller.
    const data = CampaignSchemas.bulkUpdate.parse(req.body);

    const result = await CampaignService.bulkUpdate(auth.projectId, data);

    return res.status(200).json(result);
  }

  /**
   * Get a specific campaign
   * GET /campaigns/:id
   */
  @Get(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async get(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    const campaign = await CampaignService.get(auth.projectId, id!);

    return res.json({
      success: true,
      data: campaign,
    });
  }

  /**
   * Update a campaign
   * PUT /campaigns/:id
   */
  @Put(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async update(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);
    const {name, description, subject, body, from, fromName, replyTo, type, audienceType, audienceCondition, segmentId} =
      req.body;

    // Validate audience-specific fields if audienceType is being updated
    if (audienceType === CampaignAudienceType.SEGMENT && segmentId === undefined) {
      throw new HttpException(400, 'Segment ID is required for SEGMENT audience type');
    }

    if (audienceType === CampaignAudienceType.FILTERED && audienceCondition === undefined) {
      throw new HttpException(400, 'Audience condition is required for FILTERED audience type');
    }

    assertValidTemplateSyntax({subject, body});

    // Verify domain ownership and verification if 'from' is being updated
    if (from) {
      await DomainService.verifyEmailDomain(from, auth.projectId);
    }

    const campaign = await CampaignService.update(auth.projectId, id!, {
      name,
      description,
      subject,
      body,
      from,
      fromName,
      replyTo,
      type: type as TemplateType | undefined,
      audienceType,
      audienceCondition,
      segmentId,
    });

    return res.json({
      success: true,
      data: campaign,
    });
  }

  /**
   * Delete a campaign
   * DELETE /campaigns/:id
   */
  @Delete(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async delete(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    await CampaignService.delete(auth.projectId, id!);

    return res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  }

  /**
   * Duplicate a campaign
   * POST /campaigns/:id/duplicate
   */
  @Post(':id/duplicate')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async duplicate(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    const campaign = await CampaignService.duplicate(auth.projectId, id!);

    return res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign duplicated successfully',
    });
  }

  /**
   * Send or schedule a campaign
   * POST /campaigns/:id/send
   */
  @Post(':id/send')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async send(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);
    const scheduledFor = req.body?.scheduledFor;

    // Parse scheduledFor if provided
    let scheduledDate: Date | undefined;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);

      if (isNaN(scheduledDate.getTime())) {
        throw new HttpException(400, 'Invalid scheduledFor date format');
      }
    }

    const campaign = await CampaignService.send(auth.projectId, id!, scheduledDate);

    return res.json({
      success: true,
      data: campaign,
      message: scheduledDate ? `Campaign scheduled for ${scheduledDate.toISOString()}` : 'Campaign is being sent',
    });
  }

  /**
   * Cancel a campaign
   * POST /campaigns/:id/cancel
   */
  @Post(':id/cancel')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async cancel(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    const campaign = await CampaignService.cancel(auth.projectId, id!);

    return res.json({
      success: true,
      data: campaign,
      message: 'Campaign cancelled successfully',
    });
  }

  /**
   * Get campaign statistics
   * GET /campaigns/:id/stats
   */
  @Get(':id/stats')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async stats(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    const stats = await CampaignService.getStats(auth.projectId, id!);

    return res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * Send a test email for a campaign
   * POST /campaigns/:id/test
   */
  @Post(':id/test')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  private async sendTest(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);
    const {email} = CampaignSchemas.sendTest.parse(req.body);

    await CampaignService.sendTest(auth.projectId, id!, email);

    return res.json({
      success: true,
      message: `Test email sent to ${email}`,
    });
  }
}

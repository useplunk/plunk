import {Controller, Get, Middleware, Patch, Post} from '@overnightjs/core';
import {EmailSchemas, UtilitySchemas} from '@plunk/shared';
import type {NextFunction, Request, Response} from 'express';

import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {EmailService} from '../services/EmailService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

/**
 * The email resource: looking up one email, and changing a scheduled transactional email
 * (`delivery.at` on POST /v1/send) before it goes out.
 */
@Controller('emails')
export class Emails {
  /**
   * GET /emails/:id
   * One email of the project: its status, and when it is scheduled for or was sent
   */
  @Get(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async get(req: Request, res: Response, _next: NextFunction) {
    const {id} = UtilitySchemas.id.parse(req.params);

    const email = await EmailService.getEmail(res.locals.auth.projectId, id);

    return res.status(200).json(email);
  }

  /**
   * PATCH /emails/:id
   * Move a scheduled transactional email to another time. A time that is not in the future
   * sends it now. 409 EMAIL_NOT_SCHEDULED once it is sending, sent or cancelled.
   *
   * Body: { delivery: { at: ISO 8601 date with timezone } }
   */
  @Patch(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async reschedule(req: Request, res: Response, _next: NextFunction) {
    const {id} = UtilitySchemas.id.parse(req.params);
    const {delivery} = EmailSchemas.reschedule.parse(req.body);

    const email = await EmailService.reschedule(res.locals.auth.projectId, id, delivery.at ?? new Date());

    return res.status(200).json(email);
  }

  /**
   * POST /emails/:id/cancel
   * Cancel a scheduled transactional email. It is not sent or billed, and a notification it
   * held under `delivery.throttle` may be sent again straight away. 409 EMAIL_NOT_SCHEDULED
   * once it is sending, sent or cancelled.
   */
  @Post(':id/cancel')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async cancel(req: Request, res: Response, _next: NextFunction) {
    const {id} = UtilitySchemas.id.parse(req.params);

    const email = await EmailService.cancelScheduled(res.locals.auth.projectId, id);

    return res.status(200).json(email);
  }
}

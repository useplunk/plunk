import {Controller, Get, Middleware} from '@overnightjs/core';
import type {NextFunction, Request, Response} from 'express';
import {ActivityType} from '@plunk/types';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {ActivityService} from '../services/ActivityService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

@Controller('activity')
export class Activity {
  /**
   * GET /activity
   * Get unified activity feed for the project
   *
   * Query params:
   * - limit: number (default 50, max 100)
   * - cursor: string (pagination cursor: timestamp_id)
   * - types: ActivityType[] (filter by activity types)
   * - contactId: string (filter by contact)
   * - startDate: ISO date string
   * - endDate: ISO date string
   */
  @Get('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getActivities(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;
    const contactId = req.query.contactId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Parse types filter (comma-separated)
    let types: ActivityType[] | undefined;
    if (req.query.types) {
      const typesParam = req.query.types as string;
      types = typesParam
        .split(',')
        .filter(t => Object.values(ActivityType).includes(t as ActivityType)) as ActivityType[];
    }

    const result = await ActivityService.getActivities(
      auth.projectId,
      limit,
      cursor,
      types,
      contactId,
      startDate,
      endDate,
    );

    return res.status(200).json(result);
  }

  /**
   * GET /activity/stats
   * Get activity statistics for the project
   *
   * Query params:
   * - startDate: ISO date string (defaults to 30 days ago)
   * - endDate: ISO date string (defaults to now)
   */
  @Get('stats')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getStats(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await ActivityService.getStats(auth.projectId, startDate, endDate);

    return res.status(200).json(stats);
  }

  /**
   * GET /activity/recent-count
   * Get count of recent activities (for real-time updates)
   *
   * Query params:
   * - minutes: number (default 5)
   */
  @Get('recent-count')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getRecentCount(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const minutes = Math.min(parseInt(req.query.minutes as string) || 5, 60); // Max 60 minutes

    const count = await ActivityService.getRecentActivityCount(auth.projectId, minutes);

    return res.status(200).json({count, minutes});
  }

  /**
   * GET /activity/types
   * Get available activity types (for UI filters)
   */
  @Get('types')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getTypes(_req: Request, res: Response, _next: NextFunction) {
    const types = Object.values(ActivityType);
    return res.status(200).json({types});
  }

  /**
   * GET /activity/emails/:id
   * Get the body of an email in the feed, for its preview
   */
  @Get('emails/:id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getEmailBody(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const email = await ActivityService.getEmailBody(auth.projectId, req.params.id as string);

    return res.status(200).json(email);
  }

  /**
   * GET /activity/upcoming
   * Get upcoming scheduled activities (campaigns and workflow emails)
   *
   * Query params:
   * - limit: number (default 50, max 100)
   * - daysAhead: number (default 30, max 90)
   */
  @Get('upcoming')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getUpcoming(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const daysAhead = Math.min(parseInt(req.query.daysAhead as string) || 30, 90);

    const activities = await ActivityService.getUpcomingActivities(auth.projectId, limit, daysAhead);

    return res.status(200).json({activities});
  }
}

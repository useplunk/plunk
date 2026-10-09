import {Controller, Get, Middleware} from '@overnightjs/core';
import type {AnalyticsLeaderboardKind, AnalyticsStream} from '@plunk/types';
import type {NextFunction, Request, Response} from 'express';

import {type FieldError, ValidationError} from '../exceptions/index.js';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {type AnalyticsQuery, AnalyticsService} from '../services/AnalyticsService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

const STREAMS: AnalyticsStream[] = ['ALL', 'TRANSACTIONAL', 'CAMPAIGN', 'WORKFLOW'];
const LEADERBOARD_KINDS: AnalyticsLeaderboardKind[] = ['campaigns', 'templates', 'workflows'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every endpoint takes the same filter:
 * - from, to: ISO timestamps, from inclusive and to exclusive. Defaults to the last 30 days.
 *   A range longer than 90 days (plus slack) is shortened from the start.
 * - tz: IANA timezone the buckets and heatmap are drawn in. Defaults to UTC.
 * - stream: ALL | TRANSACTIONAL | CAMPAIGN | WORKFLOW. Defaults to ALL.
 *
 * Clients should send stable bounds (day boundaries rather than "now") so repeat loads hit
 * the cache; the server never draws buckets past the current time.
 */
function parseQuery(req: Request, res: Response): AnalyticsQuery {
  const errors: FieldError[] = [];

  const parseDate = (field: 'from' | 'to'): Date | undefined => {
    const raw = req.query[field];
    if (raw === undefined || raw === '') return undefined;
    const date = new Date(String(raw));
    if (Number.isNaN(date.getTime())) {
      errors.push({field, message: `${field} must be an ISO date`, code: 'invalid_date', received: raw});
      return undefined;
    }
    return date;
  };

  const to = parseDate('to') ?? new Date();
  let from = parseDate('from') ?? new Date(to.getTime() - AnalyticsService.DEFAULT_RANGE_DAYS * DAY_MS);

  if (from >= to) {
    errors.push({field: 'from', message: 'from must be before to', code: 'invalid_range'});
  }

  const earliest = new Date(to.getTime() - AnalyticsService.MAX_RANGE_DAYS * DAY_MS);
  if (from < earliest) {
    from = earliest;
  }

  const tz = req.query.tz ? String(req.query.tz) : 'UTC';
  if (!isValidTimezone(tz)) {
    errors.push({field: 'tz', message: 'tz must be an IANA timezone', code: 'invalid_timezone', received: tz});
  }

  const stream = (req.query.stream ? String(req.query.stream).toUpperCase() : 'ALL') as AnalyticsStream;
  if (!STREAMS.includes(stream)) {
    errors.push({field: 'stream', message: `stream must be one of ${STREAMS.join(', ')}`, code: 'invalid_enum'});
  }

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }

  return {projectId: res.locals.auth.projectId, from, to, tz, stream};
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: tz});
    return true;
  } catch {
    return false;
  }
}

@Controller('analytics')
export class Analytics {
  /**
   * GET /analytics/overview
   * Headline metrics for the period and the period before it, plus a per-stream breakdown
   */
  @Get('overview')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getOverview(req: Request, res: Response, _next: NextFunction) {
    return res.status(200).json(await AnalyticsService.getOverview(parseQuery(req, res)));
  }

  /**
   * GET /analytics/timeseries
   * Email counts per local hour (ranges up to two days) or day, for this and the previous period
   */
  @Get('timeseries')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getTimeseries(req: Request, res: Response, _next: NextFunction) {
    return res.status(200).json(await AnalyticsService.getTimeseries(parseQuery(req, res)));
  }

  /**
   * GET /analytics/deliverability
   * Hard and soft bounces, complaints, and results per recipient domain
   */
  @Get('deliverability')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getDeliverability(req: Request, res: Response, _next: NextFunction) {
    return res.status(200).json(await AnalyticsService.getDeliverability(parseQuery(req, res)));
  }

  /**
   * GET /analytics/leaderboard?kind=campaigns|templates|workflows
   * Per-campaign, per-template or per-workflow results, up to 50 rows by volume
   */
  @Get('leaderboard')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getLeaderboard(req: Request, res: Response, _next: NextFunction) {
    const query = parseQuery(req, res);
    const kind = String(req.query.kind ?? 'campaigns') as AnalyticsLeaderboardKind;

    if (!LEADERBOARD_KINDS.includes(kind)) {
      throw new ValidationError([
        {field: 'kind', message: `kind must be one of ${LEADERBOARD_KINDS.join(', ')}`, code: 'invalid_enum'},
      ]);
    }

    return res.status(200).json(await AnalyticsService.getLeaderboard(query, kind));
  }

  /**
   * GET /analytics/links
   * Most clicked links
   */
  @Get('links')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getLinks(req: Request, res: Response, _next: NextFunction) {
    return res.status(200).json(await AnalyticsService.getLinks(parseQuery(req, res)));
  }

  /**
   * GET /analytics/heatmap
   * First opens and clicks by local weekday and hour
   */
  @Get('heatmap')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getHeatmap(req: Request, res: Response, _next: NextFunction) {
    return res.status(200).json(await AnalyticsService.getHeatmap(parseQuery(req, res)));
  }

  /**
   * GET /analytics/audience
   * Contact totals and growth: new contacts, unsubscribes and suppressions per bucket
   */
  @Get('audience')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getAudience(req: Request, res: Response, _next: NextFunction) {
    return res.status(200).json(await AnalyticsService.getAudience(parseQuery(req, res)));
  }

  /**
   * GET /analytics/events
   * Most frequent custom events, with their count in the previous period
   */
  @Get('events')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getTopEvents(req: Request, res: Response, _next: NextFunction) {
    return res.status(200).json(await AnalyticsService.getTopEvents(parseQuery(req, res)));
  }
}

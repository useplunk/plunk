import {Controller, Delete, Get, Middleware, Post} from '@overnightjs/core';
import type {NextFunction, Request, Response} from 'express';
import signale from 'signale';
import {prisma} from '../database/prisma.js';
import {NotFound} from '../exceptions/index.js';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {ContactService} from '../services/ContactService.js';
import {EventService} from '../services/EventService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

@Controller('events')
export class Events {
  /**
   * POST /events/track
   * Track a custom event (can trigger workflows)
   */
  @Post('track')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async track(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {name, contactId, emailId, data} = req.body;

    if (!name) {
      return res.status(400).json({error: 'Event name is required'});
    }

    // Both IDs are client-supplied: they must belong to the authenticated project
    // before they are recorded or used to start workflows (cross-tenant IDOR)
    if (contactId) {
      // Throws a 404 when the contact belongs to another project
      await ContactService.get(auth.projectId!, contactId);
    }

    if (emailId) {
      const email = await prisma.email.findFirst({
        where: {id: emailId, projectId: auth.projectId!},
        select: {id: true},
      });

      if (!email) {
        throw new NotFound('email', emailId);
      }
    }

    const event = await EventService.trackEvent(auth.projectId!, name, contactId, emailId, data);

    return res.status(201).json(event);
  }

  /**
   * GET /events
   * List events for the project
   */
  @Get('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async list(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const eventName = req.query.eventName as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const events = await EventService.getProjectEvents(auth.projectId!, eventName, limit);

    return res.status(200).json({events});
  }

  /**
   * GET /events/stats
   * Get event statistics
   */
  @Get('stats')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async stats(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await EventService.getEventStats(auth.projectId!, startDate, endDate);

    return res.status(200).json(stats);
  }

  /**
   * GET /events/contact/:contactId
   * Get events for a specific contact
   */
  @Get('contact/:contactId')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getContactEvents(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const contactId = req.params.contactId;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!contactId) {
      return res.status(400).json({error: 'Contact ID is required'});
    }

    const events = await EventService.getContactEvents(auth.projectId!, contactId, limit);

    return res.status(200).json({events});
  }

  /**
   * GET /events/names
   * Get unique event names for the project
   */
  @Get('names')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getEventNames(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    const eventNames = await EventService.getUniqueEventNames(auth.projectId!);

    return res.status(200).json({eventNames});
  }

  /**
   * GET /events/:eventName/usage
   * Check if an event is used in segments/workflows and get usage statistics
   * Returns information about where the event is used and whether it can be safely deleted
   */
  @Get(':eventName/usage')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async getEventUsage(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const eventName = req.params.eventName;

    if (!eventName) {
      return res.status(400).json({error: 'Event name is required'});
    }

    try {
      const usage = await EventService.getEventUsage(auth.projectId!, eventName);
      return res.status(200).json(usage);
    } catch (error) {
      signale.error('[EVENTS] Failed to get event usage:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get event usage',
      });
    }
  }

  /**
   * DELETE /events/:eventName
   * Delete all events with a specific name
   * Only works if the event is not used in any segments or workflows
   */
  @Delete(':eventName')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async deleteEvent(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const eventName = req.params.eventName;

    if (!eventName) {
      return res.status(400).json({error: 'Event name is required'});
    }

    try {
      const result = await EventService.deleteEvent(auth.projectId!, eventName);
      return res.status(200).json(result);
    } catch (error) {
      signale.error('[EVENTS] Failed to delete event:', error);
      return res.status(error instanceof Error && error.message.includes('Cannot delete') ? 400 : 500).json({
        error: error instanceof Error ? error.message : 'Failed to delete event',
      });
    }
  }
}

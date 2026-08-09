import {Controller, Get, Post} from '@overnightjs/core';
import type {NextFunction, Request, Response} from 'express';

import {DASHBOARD_URI} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {ContactService} from '../services/ContactService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

/**
 * List management endpoint advertised in the `List-Unsubscribe` header (see
 * {@link buildEmailHeaders}). It is deliberately a single URL serving two very
 * different callers, dispatched by method:
 *
 * - `POST` — a mailbox provider performing RFC 8058 one-click unsubscribe. No
 *   human is present, so this must act immediately and return success.
 * - `GET` — a person who clicked the link in their mail client. Redirects to the
 *   dashboard's unsubscribe page, which asks for confirmation and offers the
 *   preference center.
 *
 * Both are public: a recipient cannot authenticate, and the contact id is an
 * unguessable UUID, which is the opaque identifier RFC 8058 §3.2 calls for.
 *
 * This route must stay exempt from any rate limiting added later. Providers can
 * deliver one-click POSTs in bursts, and a throttled unsubscribe is worse than a
 * slow one — the recipient is told they are unsubscribed either way, and reaches
 * for the spam button when mail keeps arriving.
 */
@Controller('unsubscribe')
export class Unsubscribe {
  /**
   * POST /unsubscribe/:id
   * PUBLIC: RFC 8058 one-click unsubscribe. Providers send a bare POST with a
   * `List-Unsubscribe=One-Click` body; the body carries no information we need,
   * so it is not parsed or required.
   */
  @Post(':id')
  @CatchAsync
  public async oneClick(req: Request, res: Response, _next: NextFunction) {
    const contactId = req.params.id;

    if (!contactId) {
      return res.status(400).type('text/plain').send('Contact ID is required');
    }

    const contact = await prisma.contact.findUnique({
      where: {id: contactId},
      select: {subscribed: true},
    });

    // Only act on a contact that is still subscribed. Providers retry, and users
    // can click unsubscribe more than once, so a repeat call must not fire a
    // second `contact.unsubscribed` event.
    if (contact?.subscribed) {
      await ContactService.unsubscribe(contactId);
    }

    // An unknown id reports success too. There is nothing the caller can do with
    // a failure, a 404 tells an unauthenticated caller which ids exist, and error
    // responses make providers retry a request that will never succeed.
    return res.status(200).type('text/plain').send('Unsubscribed');
  }

  /**
   * GET /unsubscribe/:id
   * PUBLIC: a human followed the header link — hand them to the dashboard page.
   */
  @Get(':id')
  public redirect(req: Request, res: Response, _next: NextFunction) {
    const contactId = req.params.id;

    if (!contactId) {
      return res.status(400).type('text/plain').send('Contact ID is required');
    }

    return res.redirect(302, `${DASHBOARD_URI}/unsubscribe/${encodeURIComponent(contactId)}`);
  }
}

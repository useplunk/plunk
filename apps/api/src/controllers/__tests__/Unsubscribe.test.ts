import type {Request, Response} from 'express';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {API_URI, DASHBOARD_URI} from '../../app/constants';
import {buildEmailHeaders} from '../../services/EmailHeaderService';
import {Unsubscribe} from '../Unsubscribe';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * Minimal Express response double capturing what the controller sent.
 *
 * `sent` is the completion signal, and tests must await it rather than the
 * handler call: the `CatchAsync` decorator does not return the promise it
 * creates, so awaiting a decorated method resolves immediately, before any of
 * its async work has run. Express only ever observes the response, so this is
 * what "the handler finished" actually means here.
 */
function mockResponse() {
  const captured = {status: 200, body: '', contentType: '', redirectedTo: ''};

  let markSent: () => void;
  const sent = new Promise<void>(resolve => {
    markSent = resolve;
  });

  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    type(value: string) {
      captured.contentType = value;
      return this;
    },
    send(body: string) {
      captured.body = body;
      markSent();
      return this;
    },
    redirect(code: number, url: string) {
      captured.status = code;
      captured.redirectedTo = url;
      markSent();
      return this;
    },
  } as unknown as Response;

  return {res, captured, sent};
}

/**
 * Express always populates `req.query` (an empty object when there is no query
 * string), so the double does too — a handler reading a parameter off it must
 * not have to guard against the property being absent.
 */
function mockRequest(id: string | undefined, query: Record<string, string> = {}) {
  return {params: {id}, query} as unknown as Request;
}

describe('Unsubscribe controller', () => {
  const prisma = getPrismaClient();
  const controller = new Unsubscribe();
  const next = vi.fn();

  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  /** Invoke the one-click handler and wait for the response to be sent. */
  async function postOneClick(id: string | undefined, query: Record<string, string> = {}) {
    const {res, captured, sent} = mockResponse();
    void controller.oneClick(mockRequest(id, query), res, next);
    await sent;
    // A handler that threw would reach `next` and leave the default status
    // untouched, which would otherwise read as a success.
    expect(next).not.toHaveBeenCalled();
    return captured;
  }

  describe('POST /unsubscribe/:id (RFC 8058 one-click)', () => {
    it('unsubscribes a subscribed contact on a bare POST', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});

      const captured = await postOneClick(contact.id);

      expect(captured.status).toBe(200);
      const updated = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(updated?.subscribed).toBe(false);
    });

    it('is idempotent — a provider retry still succeeds and fires no second event', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});

      await postOneClick(contact.id);
      const captured = await postOneClick(contact.id);

      expect(captured.status).toBe(200);
      const updated = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(updated?.subscribed).toBe(false);

      const events = await prisma.event.findMany({where: {name: 'contact.unsubscribed', projectId}});
      expect(events).toHaveLength(1);
    });

    it('reports success for an unknown contact id rather than 404 or 500', async () => {
      const captured = await postOneClick('11111111-1111-4111-8111-111111111111');

      expect(captured.status).toBe(200);
    });

    it('rejects a missing contact id', async () => {
      const captured = await postOneClick(undefined);

      expect(captured.status).toBe(400);
    });

    /**
     * The regression test for the bug this endpoint exists to fix: the header
     * used to advertise the dashboard page, which only unsubscribes from a
     * client-side button click, so a provider POST changed nothing. Walk the
     * real emitted header rather than a hardcoded URL, so the two can't drift.
     */
    it('is reachable at the URL the List-Unsubscribe header advertises', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});

      const headers = buildEmailHeaders({emailClass: 'marketing', unsubscribeId: contact.id});
      const advertised = headers['List-Unsubscribe'];

      expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      expect(advertised).toBe(`<${API_URI}/unsubscribe/${contact.id}>`);

      // Resolve the advertised URL back to a route param and POST to it, exactly
      // as a mailbox provider would.
      const url = new URL(advertised!.slice(1, -1));
      const [, route, id] = url.pathname.split('/');
      expect(route).toBe('unsubscribe');

      const captured = await postOneClick(id);

      expect(captured.status).toBe(200);
      const updated = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(updated?.subscribed).toBe(false);
    });
  });

  describe('GET /unsubscribe/:id (human click-through)', () => {
    it('redirects to the dashboard confirmation page without unsubscribing', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});
      const {res, captured} = mockResponse();

      controller.redirect(mockRequest(contact.id), res, next);

      expect(captured.status).toBe(302);
      expect(captured.redirectedTo).toBe(`${DASHBOARD_URI}/unsubscribe/${contact.id}`);

      // A GET must not opt anyone out — link scanners and mail clients prefetch.
      const updated = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(updated?.subscribed).toBe(true);
    });

    it('encodes the id it forwards', () => {
      const {res, captured} = mockResponse();

      controller.redirect(mockRequest('../../evil'), res, next);

      expect(captured.redirectedTo).toBe(`${DASHBOARD_URI}/unsubscribe/..%2F..%2Fevil`);
    });

    it('carries the source email through to the dashboard page', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});
      const {res, captured} = mockResponse();

      controller.redirect(mockRequest(contact.id, {e: 'email-123'}), res, next);

      expect(captured.redirectedTo).toBe(`${DASHBOARD_URI}/unsubscribe/${contact.id}?e=email-123`);
    });
  });

  describe('source email attribution', () => {
    /** An email of this contact's, so the `e` parameter has something valid to name. */
    async function createEmailFor(contactId: string) {
      return prisma.email.create({
        data: {
          projectId,
          contactId,
          subject: 'Product update',
          body: '<p>hi</p>',
          from: 'hello@plunk.test',
          sourceType: 'CAMPAIGN',
        },
      });
    }

    it('records the originating email on the unsubscribe event', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});
      const email = await createEmailFor(contact.id);

      await postOneClick(contact.id, {e: email.id});

      const event = await prisma.event.findFirst({where: {projectId, name: 'contact.unsubscribed'}});
      expect(event?.emailId).toBe(email.id);
    });

    it('records no source when the link carries none', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});

      await postOneClick(contact.id);

      const event = await prisma.event.findFirst({where: {projectId, name: 'contact.unsubscribed'}});
      expect(event?.emailId).toBeNull();
    });

    /**
     * The parameter is attacker-controlled, so a claim naming someone else's
     * email must not be believed — but must also not block the opt-out.
     */
    it('ignores a source email belonging to another contact but still unsubscribes', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});
      const other = await factories.createContact({projectId, subscribed: true});
      const otherEmail = await createEmailFor(other.id);

      await postOneClick(contact.id, {e: otherEmail.id});

      const event = await prisma.event.findFirst({where: {projectId, name: 'contact.unsubscribed'}});
      expect(event?.emailId).toBeNull();

      const updated = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(updated?.subscribed).toBe(false);
    });

    it('ignores a source email that does not exist but still unsubscribes', async () => {
      const contact = await factories.createContact({projectId, subscribed: true});

      await postOneClick(contact.id, {e: '11111111-1111-4111-8111-111111111111'});

      const event = await prisma.event.findFirst({where: {projectId, name: 'contact.unsubscribed'}});
      expect(event?.emailId).toBeNull();

      const updated = await prisma.contact.findUnique({where: {id: contact.id}});
      expect(updated?.subscribed).toBe(false);
    });
  });
});

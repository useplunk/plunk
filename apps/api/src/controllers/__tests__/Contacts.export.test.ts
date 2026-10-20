import {once} from 'node:events';
import {get} from 'node:http';
import {Readable} from 'node:stream';

import {Server} from '@overnightjs/core';
import type {ContactExportResult} from '@plunk/types';
import {QueueEvents} from 'bullmq';
import cookies from 'cookie-parser';
import type {NextFunction, Request, Response} from 'express';
import {json} from 'express';
import request from 'supertest';
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {HttpException} from '../../exceptions/index.js';
import {createContactExportWorker} from '../../jobs/contact-export-processor.js';
import {jwt} from '../../middleware/auth.js';
import {ContactExportStorage} from '../../services/ContactExportStorage.js';
import {ContactExportService} from '../../services/ContactExportService.js';
import {contactExportQueue} from '../../services/QueueService.js';
import {Contacts} from '../Contacts.js';

vi.mock('../../app/constants.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../app/constants.js')>()),
  PLUNK_ENABLED: true,
}));

class TestServer extends Server {
  constructor() {
    super();
    this.app.use(json(), cookies());
    this.addControllers(new Contacts());
    this.app.use((error: HttpException, _req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) return res.destroy();
      res.status(error.code || 500).json({message: error.message});
    });
  }
  get handler() {
    return this.app;
  }
}

const app = new TestServer().handler;
let worker: ReturnType<typeof createContactExportWorker>;
let events: QueueEvents;
let project: Awaited<ReturnType<typeof factories.createProject>>;
let userId: string;
const keys: string[] = [];

async function completedExport() {
  const response = await request(app).post('/contacts/exports').auth(project.secret, {type: 'bearer'}).expect(202);
  const job = await ContactExportService.getJob(response.body.jobId, project.id);
  const result = (await job.waitUntilFinished(events, 15000)) as ContactExportResult;
  keys.push(result.key);
  return {job, result};
}

describe('Authenticated contact CSV routes and worker', () => {
  beforeAll(async () => {
    worker = createContactExportWorker();
    events = new QueueEvents(contactExportQueue.name, {connection: contactExportQueue.opts.connection});
    await events.waitUntilReady();
  });
  beforeEach(async () => {
    const fixture = await factories.createUserWithProject();
    project = fixture.project;
    userId = fixture.user.id;
    await getPrismaClient().user.update({where: {id: userId}, data: {emailVerified: true}});
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(keys.splice(0).map(key => ContactExportStorage.remove(key)));
  });
  afterAll(async () => {
    await worker.close();
    await events.close();
  });

  it('runs the real queue and downloads the whole project using a browser JWT without a project header', async () => {
    await factories.createContact({projectId: project.id, email: 'export@example.test', data: {name: '世界'}});
    const {job, result} = await completedExport();
    await request(app)
      .get(`/contacts/exports/${job.id}`)
      .auth(project.secret, {type: 'bearer'})
      .expect(200)
      .expect(({body}) => {
        expect(body).toMatchObject({status: 'completed', rows: 1});
        expect(body).not.toHaveProperty('key');
      });
    const response = await request(app)
      .get(`/contacts/exports/${job.id}/download`)
      .set('Cookie', `next_token=${jwt.sign(userId)}`)
      .expect(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain(result.filename);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.text).toContain('export@example.test');
    expect(response.text).toContain('世界');
  });

  it('rejects unauthenticated, invalid-key and public-key creation', async () => {
    await request(app).post('/contacts/exports').expect(401);
    await request(app).post('/contacts/exports').auth('sk_invalid', {type: 'bearer'}).expect(401);
    await request(app).post('/contacts/exports').auth(project.public, {type: 'bearer'}).expect(401);
  });

  it('requires authentication and project membership at the download boundary', async () => {
    const {job} = await completedExport();
    const other = await factories.createUserWithProject();
    await request(app).get(`/contacts/exports/${job.id}/download`).expect(401);
    await request(app)
      .get(`/contacts/exports/${job.id}/download`)
      .set('Cookie', `next_token=${jwt.sign(other.user.id)}`)
      .expect(403);
    await request(app)
      .get(`/contacts/exports/${job.id}/download`)
      .auth(other.project.secret, {type: 'bearer'})
      .expect(404);
    await request(app).get(`/contacts/exports/${job.id}`).auth(other.project.secret, {type: 'bearer'}).expect(404);
    await request(app).delete(`/contacts/exports/${job.id}`).auth(other.project.secret, {type: 'bearer'}).expect(404);
  });

  it('ignores client project ids and filters when queuing an export', async () => {
    const other = await factories.createProject();
    await factories.createContact({projectId: project.id, email: 'own@example.test'});
    await factories.createContact({projectId: other.id, email: 'other@example.test'});
    const response = await request(app)
      .post('/contacts/exports?search=missing&status=unsubscribed')
      .auth(project.secret, {type: 'bearer'})
      .send({projectId: other.id})
      .expect(202);
    const job = await ContactExportService.getJob(response.body.jobId, project.id);
    const result = (await job.waitUntilFinished(events, 15000)) as ContactExportResult;
    keys.push(result.key);
    expect(result.rows).toBe(1);
    expect(job.data.projectId).toBe(project.id);
  });

  it('cancels completed exports and blocks future downloads', async () => {
    const {job, result} = await completedExport();
    await request(app).delete(`/contacts/exports/${job.id}`).auth(project.secret, {type: 'bearer'}).expect(204);
    await request(app).get(`/contacts/exports/${job.id}/download`).auth(project.secret, {type: 'bearer'}).expect(409);
    await expect(ContactExportStorage.download(result.key)).rejects.toThrow();
  });

  it('rejects an unverified dashboard user at creation and download', async () => {
    const {job} = await completedExport();
    await getPrismaClient().user.update({where: {id: userId}, data: {emailVerified: false}});
    const cookie = `next_token=${jwt.sign(userId)}`;
    await request(app).post('/contacts/exports').set('Cookie', cookie).set('X-Project-Id', project.id).expect(403);
    await request(app).get(`/contacts/exports/${job.id}/download`).set('Cookie', cookie).expect(403);
  });

  it('returns a useful failure without exposing worker details or contact data', async () => {
    vi.spyOn(ContactExportService, 'process').mockRejectedValueOnce(new Error('private@example.test storage failure'));
    const response = await request(app).post('/contacts/exports').auth(project.secret, {type: 'bearer'}).expect(202);
    const job = await ContactExportService.getJob(response.body.jobId, project.id);
    await expect(job.waitUntilFinished(events, 15000)).rejects.toThrow('storage failure');
    const status = await request(app)
      .get(`/contacts/exports/${job.id}`)
      .auth(project.secret, {type: 'bearer'})
      .expect(200);
    expect(status.body).toEqual({status: 'failed', rows: 0, error: 'Could not export contacts. Please try again.'});
  });

  it('destroys the source stream when the browser interrupts a download', async () => {
    const {job} = await completedExport();
    const source = Readable.from(
      (async function* () {
        while (true) {
          yield Buffer.alloc(65536, 'a');
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      })(),
    );
    const closed = new Promise<void>(resolve => source.once('close', resolve));
    vi.spyOn(ContactExportStorage, 'download').mockResolvedValueOnce(source);
    const listener = app.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const address = listener.address() as {port: number};
    try {
      await new Promise<void>((resolve, reject) => {
        const req = get(
          `http://127.0.0.1:${address.port}/contacts/exports/${job.id}/download`,
          {
            headers: {Authorization: `Bearer ${project.secret}`},
          },
          response => {
            response.once('data', () => {
              response.destroy();
              resolve();
            });
          },
        );
        req.on('error', reject);
      });
      await closed;
      expect(source.destroyed).toBe(true);
    } finally {
      listener.close();
      source.destroy();
    }
  });

  it('handles unknown jobs through the static route rather than contact lookup', async () => {
    const response = await request(app)
      .get('/contacts/exports/does-not-exist')
      .auth(project.secret, {type: 'bearer'})
      .expect(404);
    expect(response.body.message).toContain('export not found');
  });
});

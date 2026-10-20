import {access, readFile, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {QueueEvents} from 'bullmq';
import {parse} from 'csv-parse/sync';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {factories, getPrismaClient} from '../../../../../test/helpers';
import {prisma} from '../../database/prisma.js';
import {createContactExportWorker} from '../../jobs/contact-export-processor.js';
import {ContactExportService, csvCell} from '../ContactExportService.js';
import {ContactExportStorage} from '../ContactExportStorage.js';
import {contactExportQueue} from '../QueueService.js';

const database = getPrismaClient();
const keys: string[] = [];
let projectId: string;

async function exportCsv() {
  const {jobId} = await ContactExportService.start(projectId);
  const job = await ContactExportService.getJob(jobId, projectId);
  const result = await ContactExportService.process(job);
  keys.push(result.key);
  const stream = await ContactExportStorage.download(result.key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  return {result, csv, records: parse(csv, {bom: true, columns: true}) as Record<string, string>[]};
}

describe('Contact CSV export', () => {
  beforeEach(async () => {
    await contactExportQueue.drain();
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(keys.splice(0).map(key => ContactExportStorage.remove(key)));
    await contactExportQueue.drain();
  });

  it('exports more than two pages, including later custom fields, in deterministic columns', async () => {
    await database.contact.createMany({
      data: Array.from({length: 205}, (_, i) => ({
        projectId,
        email: `contact-${String(i).padStart(3, '0')}@example.test`,
        data: i === 204 ? {'z': 'late', 'email': 'custom email', 'data.z': 'literal dot'} : {a: 'early'},
      })),
    });
    const query = vi.spyOn(prisma.contact, 'findMany');
    const {result, csv, records} = await exportCsv();
    expect(result.rows).toBe(205);
    expect(records).toHaveLength(205);
    expect(Object.keys(records[0]!)).toEqual([
      'id',
      'email',
      'subscribed',
      'snoozedUntil',
      'createdAt',
      'updatedAt',
      'data.a',
      'data.data.z',
      'data.email',
      'data.z',
    ]);
    expect(records[0]!['data.z']).toBe('');
    expect(records[204]).toMatchObject({'data.z': 'late', 'data.email': 'custom email', 'data.data.z': 'literal dot'});
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(query).toHaveBeenCalledTimes(4);
    for (const [args] of query.mock.calls) {
      expect(args).toMatchObject({where: {projectId}, take: 100, orderBy: {email: 'asc'}});
      expect(args).not.toHaveProperty('skip');
    }
    expect(query.mock.calls[1]?.[0]).toMatchObject({where: {email: {gt: records[99]!.email}}});
  });

  it('exports only headers for an empty project', async () => {
    const {result, records, csv} = await exportCsv();
    expect(result.rows).toBe(0);
    expect(records).toEqual([]);
    expect(parse(csv, {bom: true})).toHaveLength(1);
  });

  it('preserves quoting, Unicode, nulls, booleans, numbers, dates and nested JSON', async () => {
    await factories.createContact({
      projectId,
      data: {
        text: 'Hello, "世界"\r\nnext line',
        empty: null,
        flag: false,
        count: -12.5,
        object: {nested: ['α', 2, true]},
        formula: ' =HYPERLINK("https://example.test")',
        __proto__: 'ignored by object literal',
      },
    });
    const {records} = await exportCsv();
    expect(records[0]).toMatchObject({
      'data.text': 'Hello, "世界"\r\nnext line',
      'data.empty': '',
      'data.flag': 'false',
      'data.count': '-12.5',
      'data.object': '{"nested":["α",2,true]}',
      'data.formula': '\' =HYPERLINK("https://example.test")',
    });
    expect(records[0]!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it.each(['=1+1', '+SUM(A1)', '-2+1', '@SUM(A1)', '\tvalue', '\rvalue', '\nvalue', '  =1', '\uFEFF=1'])(
    'neutralizes spreadsheet formulas/control prefixes: %j',
    value => {
      expect(parse(csvCell(value))[0][0]).toBe(`'${value}`);
    },
  );

  it('does not include another project or accept its export id', async () => {
    const {project: other} = await factories.createUserWithProject();
    await factories.createContact({projectId: other.id, email: 'private@example.test', data: {secret: 'never export'}});
    const {records, csv} = await exportCsv();
    expect(records).toEqual([]);
    expect(csv).not.toContain('secret');
    const {jobId} = await ContactExportService.start(projectId);
    await expect(ContactExportService.getJob(jobId, other.id)).rejects.toThrow('not found');
    await expect(ContactExportService.cancel(jobId, other.id)).rejects.toThrow('not found');
  });

  it('deduplicates unfinished jobs for the project', async () => {
    const first = await ContactExportService.start(projectId);
    const second = await ContactExportService.start(projectId);
    expect(second.jobId).toBe(first.jobId);
  });

  it('fails explicitly for too many custom columns and removes its snapshot', async () => {
    await factories.createContact({
      projectId,
      data: Object.fromEntries(Array.from({length: 1001}, (_, i) => [`k${i}`, i])),
    });
    const before = await readdir(tmpdir());
    const {jobId} = await ContactExportService.start(projectId);
    const job = await ContactExportService.getJob(jobId, projectId);
    await expect(ContactExportService.process(job)).rejects.toThrow('1000 custom fields');
    expect(
      (await readdir(tmpdir())).filter(name => name.startsWith('plunk-contact-export-') && !before.includes(name)),
    ).toEqual([]);
  });

  it('expires access even when Redis still retains the job', async () => {
    const {jobId} = await ContactExportService.start(projectId);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 86400001);
    await expect(ContactExportService.getJob(jobId, projectId)).rejects.toThrow('expired');
  });

  it('streams multipart CSV and aborts an interrupted upload', async () => {
    const source = async function* () {
      yield 'a'.repeat(5 * 1024 * 1024);
      throw new Error('interrupted source');
    };
    await expect(ContactExportStorage.upload(source(), async () => {})).rejects.toThrow('interrupted source');
    const content = '世界,'.repeat(2 * 1024 * 1024);
    const key = await ContactExportStorage.upload(
      (async function* () {
        yield content;
      })(),
      async () => {},
    );
    keys.push(key);
    const stream = await ContactExportStorage.download(key);
    let size = 0;
    for await (const chunk of stream) size += Buffer.byteLength(chunk);
    expect(size).toBe(Buffer.byteLength(content));
    const response = await fetch(`${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}-contact-exports/${key}`);
    expect(response.status).toBe(403);
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return {promise, resolve};
}

describe('Contact export queue lifecycle', () => {
  let projectId: string;
  let worker: ReturnType<typeof createContactExportWorker> | undefined;
  let events: QueueEvents;
  let releaseWorker: (() => void) | undefined;

  beforeEach(async () => {
    await contactExportQueue.pause();
    await contactExportQueue.drain();
    projectId = (await factories.createUserWithProject()).project.id;
    events = new QueueEvents(contactExportQueue.name, {connection: contactExportQueue.opts.connection});
    await events.waitUntilReady();
  });

  afterEach(async () => {
    releaseWorker?.();
    releaseWorker = undefined;
    await worker?.close();
    worker = undefined;
    await events.close();
    vi.restoreAllMocks();
    await contactExportQueue.drain();
    await contactExportQueue.resume();
  });

  it('restarts immediately after queued cancellation, without a worker consuming the old job', async () => {
    const first = await ContactExportService.start(projectId);
    await ContactExportService.cancel(first.jobId, projectId);
    expect(await ContactExportService.status(first.jobId, projectId)).toEqual({status: 'cancelled', rows: 0});
    const retry = await ContactExportService.start(projectId);
    expect(retry.jobId).not.toBe(first.jobId);
    expect(await ContactExportService.status(retry.jobId, projectId)).toMatchObject({status: 'waiting'});
    expect(await contactExportQueue.getJob(first.jobId)).toBeUndefined();
    expect(await contactExportQueue.getDeduplicationJobId(projectId)).toBe(retry.jobId);
  });

  it('replaces an expired waiting job using its stored timestamp', async () => {
    const first = await ContactExportService.start(projectId);
    const client = await contactExportQueue.client;
    await client.hset(contactExportQueue.toKey(first.jobId), 'timestamp', String(Date.now() - 86400001));
    await expect(ContactExportService.getJob(first.jobId, projectId)).rejects.toThrow('expired');
    const retry = await ContactExportService.start(projectId);
    expect(retry.jobId).not.toBe(first.jobId);
    expect(await ContactExportService.status(retry.jobId, projectId)).toMatchObject({status: 'waiting'});
    expect(await contactExportQueue.getJob(first.jobId)).toBeUndefined();
  });

  it.each(['new', 'cancelled', 'expired'] as const)('deduplicates concurrent starts for a %s export', async state => {
    if (state !== 'new') {
      const first = await ContactExportService.start(projectId);
      if (state === 'cancelled') await ContactExportService.cancel(first.jobId, projectId);
      else {
        const client = await contactExportQueue.client;
        await client.hset(contactExportQueue.toKey(first.jobId), 'timestamp', String(Date.now() - 86400001));
      }
    }
    const starts = await Promise.all(Array.from({length: 20}, () => ContactExportService.start(projectId)));
    expect(new Set(starts.map(start => start.jobId)).size).toBe(1);
    const id = starts[0]!.jobId;
    expect(await contactExportQueue.getDeduplicationJobId(projectId)).toBe(id);
    expect(await ContactExportService.status(id, projectId)).toMatchObject({status: 'waiting'});
    const queued = await contactExportQueue.getJobs(['waiting', 'paused']);
    expect(queued.filter(job => job.data.projectId === projectId).map(job => job.id)).toEqual([id]);
  });

  it.each(['cancelled', 'expired'] as const)(
    'keeps an %s active export locked until real worker cleanup completes',
    async state => {
      await database.contact.createMany({
        data: Array.from({length: 150}, (_, i) => ({projectId, email: `lifecycle-${i}@example.test`})),
      });
      const before = await readdir(tmpdir());
      const entered = deferred();
      const release = deferred();
      releaseWorker = release.resolve;
      const upload = ContactExportStorage.upload.bind(ContactExportStorage);
      vi.spyOn(ContactExportStorage, 'upload').mockImplementationOnce(async (source, checkCancelled) => {
        entered.resolve();
        await release.promise;
        return upload(source, checkCancelled);
      });
      const query = vi.spyOn(prisma.contact, 'findMany');
      const first = await ContactExportService.start(projectId);
      const job = await ContactExportService.getJob(first.jobId, projectId);
      // Attach failure handling before the worker can reject the cancelled/expired job.
      const finished = job.waitUntilFinished(events, 15000).then(
        () => undefined,
        error => error as Error,
      );
      worker = createContactExportWorker();
      await contactExportQueue.resume();
      await entered.promise;
      expect(await job.getState()).toBe('active');
      expect(query).toHaveBeenCalledTimes(3);
      const snapshots = await projectSnapshots(projectId, before);
      expect(snapshots).toHaveLength(1);
      const concurrent = await Promise.all(Array.from({length: 20}, () => ContactExportService.start(projectId)));
      expect(new Set(concurrent.map(result => result.jobId))).toEqual(new Set([first.jobId]));
      if (state === 'cancelled') await ContactExportService.cancel(first.jobId, projectId);
      else {
        const client = await contactExportQueue.client;
        await client.hset(contactExportQueue.toKey(first.jobId), 'timestamp', String(Date.now() - 86400001));
      }
      await expect(ContactExportService.start(projectId)).rejects.toMatchObject({
        code: 409,
        message: expect.stringContaining('still stopping'),
      });
      expect(await contactExportQueue.getDeduplicationJobId(projectId)).toBe(first.jobId);
      expect(
        (await contactExportQueue.getJobs(['active'])).filter(job => job.data.projectId === projectId),
      ).toHaveLength(1);
      await contactExportQueue.pause();
      release.resolve();
      expect(await finished).toMatchObject({
        message: expect.stringContaining(state === 'cancelled' ? 'cancelled' : 'expired'),
      });
      for (const snapshot of snapshots) await expect(access(snapshot)).rejects.toMatchObject({code: 'ENOENT'});
      const retry = await ContactExportService.start(projectId);
      expect(retry.jobId).not.toBe(first.jobId);
      expect(await ContactExportService.status(retry.jobId, projectId)).toMatchObject({status: 'waiting'});
    },
  );

  it('stops after the current page on active cancellation and removes its snapshot before unlocking', async () => {
    await database.contact.createMany({
      data: Array.from({length: 150}, (_, i) => ({projectId, email: `page-${i}@example.test`})),
    });
    const before = await readdir(tmpdir());
    const entered = deferred();
    const release = deferred();
    releaseWorker = release.resolve;
    const process = ContactExportService.process.bind(ContactExportService);
    vi.spyOn(ContactExportService, 'process').mockImplementationOnce(async job => {
      const updateProgress = job.updateProgress.bind(job);
      vi.spyOn(job, 'updateProgress').mockImplementationOnce(async progress => {
        await updateProgress(progress);
        entered.resolve();
        await release.promise;
      });
      return process(job);
    });
    const query = vi.spyOn(prisma.contact, 'findMany');
    const first = await ContactExportService.start(projectId);
    const job = await ContactExportService.getJob(first.jobId, projectId);
    const finished = job.waitUntilFinished(events, 15000).then(
      () => undefined,
      error => error as Error,
    );
    worker = createContactExportWorker();
    await contactExportQueue.resume();
    await entered.promise;
    const snapshots = await projectSnapshots(projectId, before);
    expect(snapshots).toHaveLength(1);
    await ContactExportService.cancel(first.jobId, projectId);
    await expect(ContactExportService.start(projectId)).rejects.toMatchObject({code: 409});
    await contactExportQueue.pause();
    release.resolve();
    expect(await finished).toMatchObject({message: expect.stringContaining('cancelled')});
    expect(query).toHaveBeenCalledTimes(1);
    for (const snapshot of snapshots) await expect(access(snapshot)).rejects.toMatchObject({code: 'ENOENT'});
    expect(await ContactExportService.status(first.jobId, projectId)).toEqual({status: 'cancelled', rows: 0});
    expect((await ContactExportService.start(projectId)).jobId).not.toBe(first.jobId);
  });

  it('does not release deduplication when a queued job becomes active just before removal', async () => {
    const entered = deferred();
    const release = deferred();
    releaseWorker = release.resolve;
    const process = ContactExportService.process.bind(ContactExportService);
    vi.spyOn(ContactExportService, 'process').mockImplementationOnce(async job => {
      entered.resolve();
      await release.promise;
      return process(job);
    });
    const first = await ContactExportService.start(projectId);
    await ContactExportService.cancel(first.jobId, projectId);
    const job = await ContactExportService.getJob(first.jobId, projectId);
    const finished = job.waitUntilFinished(events, 15000).then(
      () => undefined,
      error => error as Error,
    );
    worker = createContactExportWorker();
    const remove = contactExportQueue.remove.bind(contactExportQueue);
    vi.spyOn(contactExportQueue, 'remove').mockImplementationOnce(async (jobId, options) => {
      // Promote in the gap AFTER getState reported waiting, BEFORE atomic remove.
      await contactExportQueue.resume();
      await entered.promise;
      expect(await job.getState()).toBe('active');
      return remove(jobId, options);
    });
    await expect(ContactExportService.start(projectId)).rejects.toMatchObject({code: 409});
    expect(await contactExportQueue.getDeduplicationJobId(projectId)).toBe(first.jobId);
    expect(await contactExportQueue.getJob(first.jobId)).toBeDefined();
    await contactExportQueue.pause();
    release.resolve();
    expect(await finished).toMatchObject({message: expect.stringContaining('cancelled')});
    expect((await ContactExportService.start(projectId)).jobId).not.toBe(first.jobId);
  });
});

// Other test files export in parallel; identify only this test project's files.
async function projectSnapshots(projectId: string, before: string[]) {
  const matches: string[] = [];
  for (const name of await readdir(tmpdir())) {
    if (!name.startsWith('plunk-contact-export-') || before.includes(name)) continue;
    const path = join(tmpdir(), name, 'contacts.ndjson');
    const contents = await readFile(path, 'utf8').catch(() => '');
    if (contents.includes(`"projectId":"${projectId}"`)) matches.push(join(tmpdir(), name));
  }
  return matches;
}

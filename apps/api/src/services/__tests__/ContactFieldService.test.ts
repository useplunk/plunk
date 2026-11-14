import {beforeEach, describe, expect, it, vi} from 'vitest';
import {factories} from '../../../../../test/helpers';
import {prisma} from '../../database/prisma';
import {ContactFieldService} from '../ContactFieldService';
import {ContactService} from '../ContactService';
import {contactFieldsQueue} from '../QueueService';

vi.mock('../QueueService', async importOriginal => ({
  ...(await importOriginal<typeof import('../QueueService')>()),
  contactFieldsQueue: {add: vi.fn()},
}));

const queuedScans = () => vi.mocked(contactFieldsQueue.add).mock.calls;

const customFields = async (projectId: string) =>
  (await ContactFieldService.list(projectId)).fields.filter(f => f.field.startsWith('data.'));

describe('ContactFieldService', () => {
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  it('lists only the standard fields and queues a scan for a project never scanned', async () => {
    const result = await ContactFieldService.list(projectId);

    expect(result.pending).toBe(true);
    expect(result.fields.map(f => f.field)).toEqual(['createdAt', 'email', 'subscribed', 'updatedAt']);
    expect(queuedScans()).toEqual([['scan', {projectId}, {jobId: `contact-fields-${projectId}`, delay: 0}]]);
  });

  it('measures coverage and type in a scan', async () => {
    await factories.createContact({projectId, data: {plan: 'pro', seats: 3, trial: true, renewsAt: '2026-01-01'}});
    await factories.createContact({projectId, data: {plan: 'free', seats: '3', trial: null}});
    await factories.createContact({projectId, data: {plan: 'free'}});
    await factories.createContact({projectId});

    await ContactFieldService.scan(projectId);
    const result = await ContactFieldService.list(projectId);

    expect(result.pending).toBe(false);
    expect(await customFields(projectId)).toEqual([
      {field: 'data.plan', type: 'string', coverage: 75},
      {field: 'data.renewsAt', type: 'date', coverage: 25},
      // A number on one contact and a string on another
      {field: 'data.seats', type: 'string', coverage: 50},
      // A stored JSON null does not count
      {field: 'data.trial', type: 'boolean', coverage: 25},
    ]);
  });

  it('does not queue another scan while the measurements are fresh and complete', async () => {
    await factories.createContact({projectId, data: {plan: 'pro'}});
    await ContactFieldService.scan(projectId);

    await ContactFieldService.list(projectId);

    expect(queuedScans()).toHaveLength(0);
  });

  it('offers a field from the write that introduces it, before it is measured', async () => {
    await factories.createContact({projectId, data: {plan: 'pro'}});
    await ContactFieldService.scan(projectId);

    await ContactService.upsert(projectId, 'new@example.com', {company: 'Acme'});

    expect(await customFields(projectId)).toEqual([
      {field: 'data.company', type: 'string', coverage: null},
      {field: 'data.plan', type: 'string', coverage: 100},
    ]);
    expect(queuedScans()[0]).toEqual(['scan', {projectId}, {jobId: `contact-fields-${projectId}`, delay: 10000}]);
  });

  it('does not queue a scan for writes of known fields', async () => {
    await ContactService.create(projectId, {email: 'a@example.com', data: {plan: 'pro'}});
    await ContactFieldService.scan(projectId);
    vi.mocked(contactFieldsQueue.add).mockClear();

    const contact = await ContactService.create(projectId, {email: 'b@example.com', data: {plan: 'free'}});
    await ContactService.update(projectId, contact.id, {data: {plan: 'pro'}});
    await ContactService.upsert(projectId, 'c@example.com', {plan: 'free'});

    expect(queuedScans()).toHaveLength(0);
  });

  it('prunes fields no contact carries any more', async () => {
    const contact = await ContactService.create(projectId, {email: 'a@example.com', data: {plan: 'pro', legacy: 1}});
    await prisma.contact.update({where: {id: contact.id}, data: {data: {plan: 'pro'}}});
    await new Promise(resolve => setTimeout(resolve, 5));

    await ContactFieldService.scan(projectId);

    expect((await customFields(projectId)).map(f => f.field)).toEqual(['data.plan']);
  });

  it('keeps a field first written while a scan is running', async () => {
    await factories.createContact({projectId, data: {plan: 'pro'}});

    const queryRaw = prisma.$queryRaw.bind(prisma);
    vi.spyOn(prisma, '$queryRaw').mockImplementationOnce((async (...args: Parameters<typeof prisma.$queryRaw>) => {
      const rows = await queryRaw(...args);
      // The write lands after the scan read past it
      await ContactFieldService.recordKeys(projectId, ['company']);
      return rows;
    }) as typeof prisma.$queryRaw);

    await ContactFieldService.scan(projectId);

    expect((await customFields(projectId)).map(f => f.field)).toEqual(['data.company', 'data.plan']);
  });

  it('stops offering a deleted field', async () => {
    await ContactService.create(projectId, {email: 'a@example.com', data: {plan: 'pro', legacy: 1}});
    await ContactFieldService.scan(projectId);

    await ContactService.deleteField(projectId, 'data.legacy');

    expect((await customFields(projectId)).map(f => f.field)).toEqual(['data.plan']);
  });

  it('keeps projects apart', async () => {
    const {project: other} = await factories.createUserWithProject();
    await ContactService.create(other.id, {email: 'a@example.com', data: {secret: 'x'}});
    await factories.createContact({projectId: other.id, data: {secret: 'x'}});
    await ContactFieldService.scan(other.id);

    await ContactFieldService.scan(projectId);

    expect(await customFields(projectId)).toEqual([]);
  });
});

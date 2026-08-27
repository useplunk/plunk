import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WorkflowExecutionStatus, WorkflowTriggerType} from '@plunk/db';
import {EventService} from '../EventService';
import {Keys} from '../keys';
import {factories, getPrismaClient} from '../../../../../test/helpers';

// Mock Redis for caching tests - must be inline to avoid hoisting issues
vi.mock('../../database/redis', () => {
  const store = new Map<string, {value: string; expiry?: number}>();
  return {
    redis: {
      get: vi.fn(async (key: string) => {
        const item = store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
          store.delete(key);
          return null;
        }
        return item.value;
      }),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, {value});
        return 'OK';
      }),
      setex: vi.fn(async (key: string, seconds: number, value: string) => {
        store.set(key, {value, expiry: Date.now() + seconds * 1000});
        return 'OK';
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
        return 1;
      }),
      incr: vi.fn(async (key: string) => {
        const current = store.get(key);
        const newValue = current ? parseInt(current.value) + 1 : 1;
        store.set(key, {value: String(newValue)});
        return newValue;
      }),
      expire: vi.fn(async (key: string, seconds: number) => {
        const item = store.get(key);
        if (!item) return 0;
        store.set(key, {...item, expiry: Date.now() + seconds * 1000});
        return 1;
      }),
      clear: () => store.clear(),
    },
  };
});

describe('EventService', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  afterEach(async () => {
    // Clear Redis mock
    const {redis} = await import('../../database/redis');
    if ('clear' in redis) {
      (redis as unknown as {clear: () => void}).clear();
    }
  });

  // ========================================
  // EVENT TRACKING
  // ========================================
  describe('trackEvent', () => {
    it('should create an event record', async () => {
      const contact = await factories.createContact({projectId});

      const event = await EventService.trackEvent(projectId, 'user.signup', contact.id, undefined, {
        source: 'web',
        plan: 'free',
      });

      expect(event.projectId).toBe(projectId);
      expect(event.contactId).toBe(contact.id);
      expect(event.name).toBe('user.signup');
      expect(event.data).toEqual({source: 'web', plan: 'free'});
    });

    it('should track event without contact (project-level event)', async () => {
      const event = await EventService.trackEvent(projectId, 'project.created', undefined, undefined, {
        plan: 'pro',
      });

      expect(event.projectId).toBe(projectId);
      expect(event.contactId).toBeNull();
      expect(event.name).toBe('project.created');
    });

    it('should track event with email reference', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id);

      const event = await EventService.trackEvent(projectId, 'email.opened', contact.id, email.id, {
        userAgent: 'Mozilla/5.0',
      });

      expect(event.emailId).toBe(email.id);
      expect(event.contactId).toBe(contact.id);
    });

    it('should trigger workflows listening for the event', async () => {
      const contact = await factories.createContact({projectId});

      // Create workflow triggered by 'purchase.completed' event
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'purchase.completed'},
      });

      // Add a delay step so workflow doesn't complete immediately
      const triggerStep = await prisma.workflowStep.findFirst({
        where: {workflowId: workflow.id, type: 'TRIGGER'},
      });

      const delayStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: 'DELAY',
          name: 'Wait',
          position: {x: 100, y: 0},
          config: {amount: 24, unit: 'hours'},
        },
      });

      // Connect steps
      await prisma.workflowTransition.create({
        data: {
          fromStepId: triggerStep!.id,
          toStepId: delayStep.id,
        },
      });

      // Track the event
      await EventService.trackEvent(projectId, 'purchase.completed', contact.id, undefined, {
        amount: 99.99,
        product: 'Premium Plan',
      });

      // Verify workflow execution was created
      const executions = await prisma.workflowExecution.findMany({
        where: {
          workflowId: workflow.id,
          contactId: contact.id,
        },
      });

      expect(executions).toHaveLength(1);
      // Workflow should be in COMPLETED status since DELAY step completes and has no next step
      // (DELAY sets to WAITING then processNextSteps sees no transitions and completes it)
      expect([WorkflowExecutionStatus.WAITING, WorkflowExecutionStatus.COMPLETED]).toContain(executions[0].status);
    });

    it('should NOT start a workflow for a contact from another project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const foreignContact = await factories.createContact({projectId: otherProject.id});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'cross.tenant'},
      });

      // Event tracked in this project, but pointing at another tenant's contact
      await EventService.trackEvent(projectId, 'cross.tenant', foreignContact.id);

      const executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id},
      });

      expect(executions).toHaveLength(0);
    });

    it('should NOT trigger disabled workflows', async () => {
      const contact = await factories.createContact({projectId});

      // Create disabled workflow
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: false, // Disabled
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'test.event'},
      });

      await EventService.trackEvent(projectId, 'test.event', contact.id);

      // No execution should be created
      const executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id},
      });

      expect(executions).toHaveLength(0);
    });

    it('should NOT trigger workflows for different event names', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'user.signup'},
      });

      // Track different event
      await EventService.trackEvent(projectId, 'user.login', contact.id);

      // No execution should be created
      const executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id},
      });

      expect(executions).toHaveLength(0);
    });

    it('should respect workflow re-entry settings', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: false, // Do not allow re-entry
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'repeat.event'},
      });

      // First event - should create execution
      await EventService.trackEvent(projectId, 'repeat.event', contact.id);

      let executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id, contactId: contact.id},
      });

      expect(executions).toHaveLength(1);

      // Second event - should NOT create execution (re-entry not allowed)
      await EventService.trackEvent(projectId, 'repeat.event', contact.id);

      executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id, contactId: contact.id},
      });

      expect(executions).toHaveLength(1); // Still only 1
    });

    it('should allow re-entry when enabled', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: true, // Allow re-entry
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'repeat.event'},
      });

      // First event
      await EventService.trackEvent(projectId, 'repeat.event', contact.id);

      // Complete first execution
      const firstExecution = await prisma.workflowExecution.findFirst({
        where: {workflowId: workflow.id, contactId: contact.id},
      });

      await prisma.workflowExecution.update({
        where: {id: firstExecution!.id},
        data: {status: WorkflowExecutionStatus.COMPLETED},
      });

      // Second event - should create new execution
      await EventService.trackEvent(projectId, 'repeat.event', contact.id);

      const executions = await prisma.workflowExecution.findMany({
        where: {workflowId: workflow.id, contactId: contact.id},
      });

      expect(executions).toHaveLength(2);
    });

    it('should not re-enter while an enabled execution is waiting', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'waiting.event'},
      });
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: 'TRIGGER'},
      });
      await prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          contactId: contact.id,
          status: WorkflowExecutionStatus.WAITING,
          currentStepId: triggerStep.id,
        },
      });

      await EventService.trackEvent(projectId, 'waiting.event', contact.id);

      expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id, contactId: contact.id}})).toBe(1);
    });

    it('should enroll parallel duplicate events only once while the workflow is active', async () => {
      const contact = await factories.createContact({projectId});
      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        allowReentry: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'parallel.event'},
      });
      const triggerStep = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: 'TRIGGER'},
      });
      const delayStep = await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: 'DELAY',
          name: 'Keep execution active',
          position: {x: 100, y: 0},
          config: {amount: 1, unit: 'minutes'},
        },
      });
      await prisma.workflowTransition.create({
        data: {fromStepId: triggerStep.id, toStepId: delayStep.id},
      });

      await Promise.all([
        EventService.trackEvent(projectId, 'parallel.event', contact.id),
        EventService.trackEvent(projectId, 'parallel.event', contact.id),
      ]);

      expect(await prisma.workflowExecution.count({where: {workflowId: workflow.id, contactId: contact.id}})).toBe(1);
    });

    it('should trigger multiple workflows listening for same event', async () => {
      const contact = await factories.createContact({projectId});

      const workflow1 = await factories.createWorkflow({
        projectId,
        enabled: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'shared.event'},
      });

      const workflow2 = await factories.createWorkflow({
        projectId,
        enabled: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'shared.event'},
      });

      await EventService.trackEvent(projectId, 'shared.event', contact.id);

      const execution1 = await prisma.workflowExecution.findFirst({
        where: {workflowId: workflow1.id},
      });

      const execution2 = await prisma.workflowExecution.findFirst({
        where: {workflowId: workflow2.id},
      });

      expect(execution1).toBeDefined();
      expect(execution2).toBeDefined();
    });
  });

  // ========================================
  // EVENT RETRIEVAL
  // ========================================
  describe('getContactEvents', () => {
    it('should get events for a specific contact', async () => {
      const contact1 = await factories.createContact({projectId});
      const contact2 = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'event.1', contact1.id);
      await EventService.trackEvent(projectId, 'event.2', contact1.id);
      await EventService.trackEvent(projectId, 'event.3', contact2.id);

      const events = await EventService.getContactEvents(projectId, contact1.id);

      expect(events).toHaveLength(2);
      expect(events.every(e => e.contactId === contact1.id)).toBe(true);
    });

    it('should return events in reverse chronological order (newest first)', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'first', contact.id);
      await new Promise(resolve => setTimeout(resolve, 10));
      await EventService.trackEvent(projectId, 'second', contact.id);
      await new Promise(resolve => setTimeout(resolve, 10));
      await EventService.trackEvent(projectId, 'third', contact.id);

      const events = await EventService.getContactEvents(projectId, contact.id);

      expect(events[0].name).toBe('third'); // Newest
      expect(events[1].name).toBe('second');
      expect(events[2].name).toBe('first'); // Oldest
    });

    it('should respect limit parameter', async () => {
      const contact = await factories.createContact({projectId});

      // Create 100 events
      for (let i = 0; i < 100; i++) {
        await EventService.trackEvent(projectId, `event.${i}`, contact.id);
      }

      const events = await EventService.getContactEvents(projectId, contact.id, 25);

      expect(events).toHaveLength(25);
    });

    it('should default to 50 events limit', async () => {
      const contact = await factories.createContact({projectId});

      // Create 60 events
      for (let i = 0; i < 60; i++) {
        await EventService.trackEvent(projectId, `event.${i}`, contact.id);
      }

      const events = await EventService.getContactEvents(projectId, contact.id);

      expect(events).toHaveLength(50); // Default limit
    });
  });

  describe('getProjectEvents', () => {
    it('should get all events for a project', async () => {
      const contact1 = await factories.createContact({projectId});
      const contact2 = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'event.1', contact1.id);
      await EventService.trackEvent(projectId, 'event.2', contact2.id);
      await EventService.trackEvent(projectId, 'event.3');

      const events = await EventService.getProjectEvents(projectId);

      expect(events).toHaveLength(3);
      expect(events.every(e => e.projectId === projectId)).toBe(true);
    });

    it('should filter by event name', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'user.signup', contact.id);
      await EventService.trackEvent(projectId, 'user.login', contact.id);
      await EventService.trackEvent(projectId, 'user.signup', contact.id);

      const events = await EventService.getProjectEvents(projectId, 'user.signup');

      expect(events).toHaveLength(2);
      expect(events.every(e => e.name === 'user.signup')).toBe(true);
    });

    it('should include contact email in results', async () => {
      const contact = await factories.createContact({
        projectId,
        email: 'test@example.com',
      });

      await EventService.trackEvent(projectId, 'test.event', contact.id);

      const events = await EventService.getProjectEvents(projectId);

      expect(events[0].contact?.email).toBe('test@example.com');
    });

    it('should respect limit parameter', async () => {
      const contact = await factories.createContact({projectId});

      for (let i = 0; i < 150; i++) {
        await EventService.trackEvent(projectId, `event.${i}`, contact.id);
      }

      const events = await EventService.getProjectEvents(projectId, undefined, 50);

      expect(events).toHaveLength(50);
    });
  });

  // ========================================
  // EVENT STATISTICS
  // ========================================
  describe('getEventStats', () => {
    it('should return event counts grouped by type', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'user.signup', contact.id);
      await EventService.trackEvent(projectId, 'user.signup', contact.id);
      await EventService.trackEvent(projectId, 'user.login', contact.id);
      await EventService.trackEvent(projectId, 'purchase.completed', contact.id);
      await EventService.trackEvent(projectId, 'purchase.completed', contact.id);
      await EventService.trackEvent(projectId, 'purchase.completed', contact.id);

      const stats = await EventService.getEventStats(projectId);

      expect(stats).toHaveLength(3);

      // Should be ordered by count (desc)
      expect(stats[0].name).toBe('purchase.completed');
      expect(stats[0].count).toBe(3);
      expect(stats[1].name).toBe('user.signup');
      expect(stats[1].count).toBe(2);
      expect(stats[2].name).toBe('user.login');
      expect(stats[2].count).toBe(1);
    });

    it('should filter by date range', async () => {
      const contact = await factories.createContact({projectId});

      const oldDate = new Date('2024-01-01');

      // Create old event directly
      await prisma.event.create({
        data: {
          projectId,
          contactId: contact.id,
          name: 'old.event',
          createdAt: oldDate,
        },
      });

      // Create recent events
      await EventService.trackEvent(projectId, 'recent.event', contact.id);

      const startDate = new Date('2024-05-01');
      const stats = await EventService.getEventStats(projectId, startDate);

      expect(stats).toHaveLength(1);
      expect(stats[0].name).toBe('recent.event');
    });

    it('should handle empty result', async () => {
      const stats = await EventService.getEventStats(projectId);

      expect(stats).toHaveLength(0);
    });
  });

  describe('getUniqueEventNames', () => {
    it('should return unique event names ordered by frequency', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'event.a', contact.id);
      await EventService.trackEvent(projectId, 'event.b', contact.id);
      await EventService.trackEvent(projectId, 'event.b', contact.id);
      await EventService.trackEvent(projectId, 'event.c', contact.id);
      await EventService.trackEvent(projectId, 'event.c', contact.id);
      await EventService.trackEvent(projectId, 'event.c', contact.id);

      const names = await EventService.getUniqueEventNames(projectId);

      expect(names).toHaveLength(3);
      expect(names[0]).toBe('event.c'); // Most frequent
      expect(names[1]).toBe('event.b');
      expect(names[2]).toBe('event.a'); // Least frequent
    });

    it('should return empty array when no events exist', async () => {
      const names = await EventService.getUniqueEventNames(projectId);

      expect(names).toHaveLength(0);
    });
  });

  // ========================================
  // WORKFLOW CACHE MANAGEMENT
  // ========================================
  describe('invalidateWorkflowCache', () => {
    it('should invalidate workflow cache for project', async () => {
      const {redis} = await import('../../database/redis');

      // Set cache
      const cacheKey = Keys.Workflow.enabled(projectId);
      await redis.set(cacheKey, JSON.stringify([{id: 'test'}]));

      // Verify cache exists
      const cached = await redis.get(cacheKey);
      expect(cached).toBeTruthy();

      // Invalidate
      await EventService.invalidateWorkflowCache(projectId);

      // Verify cache deleted
      const afterInvalidation = await redis.get(cacheKey);
      expect(afterInvalidation).toBeNull();
    });

    it('should not throw error if cache does not exist', async () => {
      await expect(EventService.invalidateWorkflowCache(projectId)).resolves.not.toThrow();
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('edge cases', () => {
    it('should handle events with complex data structures', async () => {
      const contact = await factories.createContact({projectId});

      const complexData = {
        user: {
          id: 123,
          profile: {
            name: 'John Doe',
            preferences: ['email', 'sms'],
          },
        },
        metadata: {
          source: 'mobile_app',
          version: '2.0.1',
        },
        items: [
          {id: 1, name: 'Item 1', price: 19.99},
          {id: 2, name: 'Item 2', price: 29.99},
        ],
      };

      const event = await EventService.trackEvent(projectId, 'complex.event', contact.id, undefined, complexData);

      expect(event.data).toEqual(complexData);

      // Verify data persists correctly
      const retrieved = await prisma.event.findUnique({
        where: {id: event.id},
      });

      expect(retrieved?.data).toEqual(complexData);
    });

    it('should handle events with null data', async () => {
      const contact = await factories.createContact({projectId});

      const event = await EventService.trackEvent(projectId, 'simple.event', contact.id);

      expect(event.data).toBeNull();
    });

    it('should handle event names with special characters', async () => {
      const contact = await factories.createContact({projectId});

      const eventName = 'user:action@domain.com/path-123';

      const event = await EventService.trackEvent(projectId, eventName, contact.id);

      expect(event.name).toBe(eventName);
    });

    it('should not trigger workflows for events without contact when workflow expects contact', async () => {
      await factories.createWorkflow({
        projectId,
        enabled: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'test.event'},
      });

      // Track event without contact
      await EventService.trackEvent(projectId, 'test.event');

      // No execution should be created (event is not contact-specific)
      const executions = await prisma.workflowExecution.findMany({
        where: {workflow: {projectId}},
      });

      expect(executions).toHaveLength(0);
    });
  });

  // ========================================
  // FIELD DISCOVERY
  // ========================================
  describe('getAvailableEventFields', () => {
    it('should discover fields from event data', async () => {
      const contact = await factories.createContact({projectId});

      // Create events with various fields
      await EventService.trackEvent(projectId, 'email.opened', contact.id, undefined, {
        subject: 'Welcome',
        from: 'hello@example.com',
        openedAt: new Date().toISOString(),
      });

      await EventService.trackEvent(projectId, 'email.opened', contact.id, undefined, {
        subject: 'Newsletter',
        from: 'news@example.com',
        isFirstOpen: true,
        opens: 1,
      });

      const fields = await EventService.getAvailableEventFields(projectId, 'email.opened');

      expect(fields).toContain('event.subject');
      expect(fields).toContain('event.from');
      expect(fields).toContain('event.openedAt');
      expect(fields).toContain('event.isFirstOpen');
      expect(fields).toContain('event.opens');
      expect(fields).toHaveLength(5);
    });

    it('should filter fields by event name', async () => {
      const contact = await factories.createContact({projectId});

      // Create email.opened events
      await EventService.trackEvent(projectId, 'email.opened', contact.id, undefined, {
        subject: 'Test',
        openedAt: new Date().toISOString(),
      });

      // Create email.clicked events
      await EventService.trackEvent(projectId, 'email.clicked', contact.id, undefined, {
        subject: 'Test',
        link: 'https://example.com',
        clickedAt: new Date().toISOString(),
      });

      // Get fields for email.opened only
      const openedFields = await EventService.getAvailableEventFields(projectId, 'email.opened');

      expect(openedFields).toContain('event.subject');
      expect(openedFields).toContain('event.openedAt');
      expect(openedFields).not.toContain('event.link');
      expect(openedFields).not.toContain('event.clickedAt');
    });

    it('should return all event fields when no event name specified', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'email.opened', contact.id, undefined, {
        openedAt: new Date().toISOString(),
      });

      await EventService.trackEvent(projectId, 'email.clicked', contact.id, undefined, {
        link: 'https://example.com',
      });

      const allFields = await EventService.getAvailableEventFields(projectId);

      expect(allFields).toContain('event.openedAt');
      expect(allFields).toContain('event.link');
    });

    it('should return empty array when no events exist', async () => {
      const fields = await EventService.getAvailableEventFields(projectId, 'nonexistent.event');

      expect(fields).toHaveLength(0);
    });

    it('should ignore events with null data', async () => {
      const contact = await factories.createContact({projectId});

      // Event without data
      await EventService.trackEvent(projectId, 'simple.event', contact.id);

      // Event with data
      await EventService.trackEvent(projectId, 'simple.event', contact.id, undefined, {
        field1: 'value1',
      });

      const fields = await EventService.getAvailableEventFields(projectId, 'simple.event');

      expect(fields).toEqual(['event.field1']);
    });

    it('should handle nested field structures', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'complex.event', contact.id, undefined, {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
        metadata: {
          source: 'web',
        },
      });

      const fields = await EventService.getAvailableEventFields(projectId, 'complex.event');

      // Should return top-level keys
      expect(fields).toContain('event.user');
      expect(fields).toContain('event.metadata');
    });

    it('should deduplicate fields across multiple events', async () => {
      const contact = await factories.createContact({projectId});

      // Create 5 events with same fields
      for (let i = 0; i < 5; i++) {
        await EventService.trackEvent(projectId, 'test.event', contact.id, undefined, {
          field1: `value${i}`,
          field2: `value${i}`,
        });
      }

      const fields = await EventService.getAvailableEventFields(projectId, 'test.event');

      expect(fields).toEqual(['event.field1', 'event.field2']);
    });

    it('should respect 100 event sample limit for performance', async () => {
      const contact = await factories.createContact({projectId});

      // Create 150 events with different fields
      for (let i = 0; i < 150; i++) {
        await EventService.trackEvent(projectId, 'test.event', contact.id, undefined, {
          [`field${i}`]: `value${i}`,
        });
      }

      const fields = await EventService.getAvailableEventFields(projectId, 'test.event');

      // Should sample only last 100 events (most recent)
      // So we should see field50-field149 (100 fields)
      expect(fields.length).toBeLessThanOrEqual(100);
    });

    it('should return fields in alphabetical order', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'test.event', contact.id, undefined, {
        zebra: 'last',
        apple: 'first',
        middle: 'middle',
      });

      const fields = await EventService.getAvailableEventFields(projectId, 'test.event');

      expect(fields).toEqual(['event.apple', 'event.middle', 'event.zebra']);
    });

    it('should handle email event data structure', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id);

      // Simulate actual email.sent event data
      await EventService.trackEvent(projectId, 'email.sent', contact.id, email.id, {
        subject: 'Welcome Email',
        from: 'hello@example.com',
        fromName: 'Example Team',
        messageId: 'msg-123',
        templateId: 'tpl-456',
        campaignId: null,
        sourceType: 'TRANSACTIONAL',
        sentAt: new Date().toISOString(),
      });

      const fields = await EventService.getAvailableEventFields(projectId, 'email.sent');

      expect(fields).toContain('event.subject');
      expect(fields).toContain('event.from');
      expect(fields).toContain('event.fromName');
      expect(fields).toContain('event.messageId');
      expect(fields).toContain('event.templateId');
      expect(fields).toContain('event.campaignId');
      expect(fields).toContain('event.sourceType');
      expect(fields).toContain('event.sentAt');
    });
  });

  describe('Event Data - Persistent vs Non-Persistent', () => {
    it('should store all event data (persistent + non-persistent) in event record', async () => {
      const contact = await factories.createContact({projectId});

      const eventData = {
        totalSpent: 599.99, // Persistent
        orderId: {value: 'ORD-123', persistent: false}, // Non-persistent
        items: {value: [{name: 'Widget', qty: 2}], persistent: false}, // Non-persistent
      };

      const event = await EventService.trackEvent(projectId, 'purchase', contact.id, undefined, eventData);

      // Event should store ALL data for workflow access
      expect(event.data).toMatchObject({
        totalSpent: 599.99,
        orderId: {value: 'ORD-123', persistent: false},
        items: {value: [{name: 'Widget', qty: 2}], persistent: false},
      });
    });

    it('should pass all event data to workflow execution context', async () => {
      const contact = await factories.createContact({projectId});

      const workflow = await factories.createWorkflow({
        projectId,
        enabled: true,
        triggerType: WorkflowTriggerType.EVENT,
        triggerConfig: {eventName: 'order_placed'},
      });

      await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: 'TRIGGER',
        name: 'Order Trigger',
        position: {x: 0, y: 0},
        config: {},
      });

      const eventData = {
        amount: 99.99, // Persistent
        confirmationCode: {value: 'CONF-456', persistent: false}, // Non-persistent
      };

      await EventService.trackEvent(projectId, 'order_placed', contact.id, undefined, eventData);

      // Wait for async workflow creation
      await new Promise(resolve => setTimeout(resolve, 50));

      const execution = await prisma.workflowExecution.findFirst({
        where: {
          workflowId: workflow.id,
          contactId: contact.id,
        },
      });

      // Execution context should have ALL event data
      expect(execution).toBeDefined();
      expect(execution?.context).toMatchObject({
        amount: 99.99,
        confirmationCode: {value: 'CONF-456', persistent: false},
      });
    });
  });

  // ========================================
  // RESERVED EVENT VALIDATION
  // ========================================
  describe('isReservedEvent', () => {
    describe('Email events (email.*)', () => {
      it('should identify email.sent as reserved', () => {
        expect(EventService.isReservedEvent('email.sent')).toBe(true);
      });

      it('should identify email.delivery as reserved', () => {
        expect(EventService.isReservedEvent('email.delivery')).toBe(true);
      });

      it('should identify email.open as reserved', () => {
        expect(EventService.isReservedEvent('email.open')).toBe(true);
      });

      it('should identify email.click as reserved', () => {
        expect(EventService.isReservedEvent('email.click')).toBe(true);
      });

      it('should identify email.bounce as reserved', () => {
        expect(EventService.isReservedEvent('email.bounce')).toBe(true);
      });

      it('should identify email.complaint as reserved', () => {
        expect(EventService.isReservedEvent('email.complaint')).toBe(true);
      });

      it('should identify any email.* pattern as reserved', () => {
        expect(EventService.isReservedEvent('email.custom')).toBe(true);
        expect(EventService.isReservedEvent('email.anything')).toBe(true);
      });
    });

    describe('Contact events', () => {
      it('should identify contact.subscribed as reserved', () => {
        expect(EventService.isReservedEvent('contact.subscribed')).toBe(true);
      });

      it('should identify contact.unsubscribed as reserved', () => {
        expect(EventService.isReservedEvent('contact.unsubscribed')).toBe(true);
      });

      it('should not identify other contact.* events as reserved', () => {
        expect(EventService.isReservedEvent('contact.created')).toBe(false);
        expect(EventService.isReservedEvent('contact.updated')).toBe(false);
      });
    });

    describe('Segment events (segment.*.entry, segment.*.exit)', () => {
      it('should identify segment.*.entry as reserved', () => {
        expect(EventService.isReservedEvent('segment.vip-users.entry')).toBe(true);
        expect(EventService.isReservedEvent('segment.premium.entry')).toBe(true);
        expect(EventService.isReservedEvent('segment.active-subscribers.entry')).toBe(true);
      });

      it('should identify segment.*.exit as reserved', () => {
        expect(EventService.isReservedEvent('segment.vip-users.exit')).toBe(true);
        expect(EventService.isReservedEvent('segment.premium.exit')).toBe(true);
        expect(EventService.isReservedEvent('segment.active-subscribers.exit')).toBe(true);
      });

      it('should not identify other segment.* events as reserved', () => {
        expect(EventService.isReservedEvent('segment.created')).toBe(false);
        expect(EventService.isReservedEvent('segment.vip-users.updated')).toBe(false);
        expect(EventService.isReservedEvent('segment.premium')).toBe(false);
      });
    });

    describe('Non-reserved events', () => {
      it('should not identify custom user events as reserved', () => {
        expect(EventService.isReservedEvent('user.signup')).toBe(false);
        expect(EventService.isReservedEvent('purchase.completed')).toBe(false);
        expect(EventService.isReservedEvent('order.placed')).toBe(false);
        expect(EventService.isReservedEvent('custom.event')).toBe(false);
      });

      it('should not identify events with similar prefixes as reserved', () => {
        expect(EventService.isReservedEvent('emails.sent')).toBe(false);
        expect(EventService.isReservedEvent('contacts.subscribed')).toBe(false);
        expect(EventService.isReservedEvent('segments.entry')).toBe(false);
      });
    });
  });
});

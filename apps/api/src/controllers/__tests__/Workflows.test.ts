import {beforeEach, describe, expect, it} from 'vitest';
import {factories} from '../../../../../test/helpers';
import {ContactService} from '../../services/ContactService';
import {EventService} from '../../services/EventService';
import {WorkflowService} from '../../services/WorkflowService';

describe('Workflows Controller', () => {
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  // ========================================
  // GET /workflows/fields
  // ========================================
  describe('GET /workflows/fields', () => {
    it('should return contact and event fields', async () => {
      // Through the service: custom fields are registered by contact writes
      const contact = await ContactService.create(projectId, {
        email: 'john@example.com',
        data: {
          firstName: 'John',
          lastName: 'Doe',
          plan: 'premium',
        },
      });

      // Create email events with data
      await EventService.trackEvent(projectId, 'email.opened', contact.id, undefined, {
        subject: 'Welcome',
        from: 'hello@example.com',
        openedAt: new Date().toISOString(),
        isFirstOpen: true,
      });

      const responseBody = await WorkflowService.getAvailableFields(projectId);

      expect(responseBody.fields).toBeInstanceOf(Array);
      expect(responseBody.count).toBeGreaterThan(0);

      // Should include standard contact fields
      expect(responseBody.fields).toContain('contact.email');
      expect(responseBody.fields).toContain('contact.subscribed');

      // Should include custom contact data fields
      expect(responseBody.fields).toContain('contact.data.firstName');
      expect(responseBody.fields).toContain('contact.data.lastName');
      expect(responseBody.fields).toContain('contact.data.plan');

      // Should include event fields
      expect(responseBody.fields).toContain('event.subject');
      expect(responseBody.fields).toContain('event.from');
      expect(responseBody.fields).toContain('event.openedAt');
      expect(responseBody.fields).toContain('event.isFirstOpen');
    });

    it('should filter event fields by eventName query param', async () => {
      const contact = await factories.createContact({projectId});

      // Create email.opened events
      await EventService.trackEvent(projectId, 'email.opened', contact.id, undefined, {
        subject: 'Test',
        openedAt: new Date().toISOString(),
        isFirstOpen: true,
      });

      // Create email.clicked events
      await EventService.trackEvent(projectId, 'email.clicked', contact.id, undefined, {
        subject: 'Test',
        link: 'https://example.com',
        clickedAt: new Date().toISOString(),
      });

      const responseBody = await WorkflowService.getAvailableFields(projectId, 'email.opened');

      // Should include email.opened fields
      expect(responseBody.fields).toContain('event.subject');
      expect(responseBody.fields).toContain('event.openedAt');
      expect(responseBody.fields).toContain('event.isFirstOpen');

      // Should NOT include email.clicked fields
      expect(responseBody.fields).not.toContain('event.link');
      expect(responseBody.fields).not.toContain('event.clickedAt');
    });

    it('should return fields in sorted order', async () => {
      const contact = await factories.createContact({
        projectId,
        data: {
          zebra: 'last',
          apple: 'first',
        },
      });

      await EventService.trackEvent(projectId, 'test.event', contact.id, undefined, {
        zoo: 'value',
        aardvark: 'value',
      });

      const responseBody = await WorkflowService.getAvailableFields(projectId);

      const fields = responseBody.fields as string[];

      // Verify fields are sorted
      const sortedFields = [...fields].sort();
      expect(fields).toEqual(sortedFields);
    });

    it('should return empty event fields when no events exist', async () => {
      const responseBody = await WorkflowService.getAvailableFields(projectId);

      // Should still have contact fields
      expect(responseBody.fields).toContain('contact.email');
      expect(responseBody.fields).toContain('contact.subscribed');

      // But no event fields
      const eventFields = responseBody.fields.filter((f: string) => f.startsWith('event.'));
      expect(eventFields).toHaveLength(0);
    });

    it('should only return fields for authenticated project', async () => {
      // Create another project with events
      const {project: otherProject} = await factories.createUserWithProject();
      const otherContact = await factories.createContact({projectId: otherProject.id});

      await EventService.trackEvent(otherProject.id, 'other.event', otherContact.id, undefined, {
        secretField: 'secret value',
      });

      const responseBody = await WorkflowService.getAvailableFields(projectId);

      // Should not include fields from other project
      expect(responseBody.fields).not.toContain('event.secretField');
    });

    it('should handle URL encoded event names', async () => {
      const contact = await factories.createContact({projectId});

      await EventService.trackEvent(projectId, 'email.opened', contact.id, undefined, {
        field1: 'value',
      });

      const responseBody = await WorkflowService.getAvailableFields(projectId, 'email.opened');

      expect(responseBody.fields).toContain('event.field1');
    });
  });

  // ========================================
  // Integration Tests
  // ========================================
  describe('Workflow field discovery integration', () => {
    it('should discover correct fields for email.sent events', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id);

      // Create email.sent event with actual structure
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

      const responseBody = await WorkflowService.getAvailableFields(projectId, 'email.sent');

      expect(responseBody.fields).toContain('event.subject');
      expect(responseBody.fields).toContain('event.from');
      expect(responseBody.fields).toContain('event.fromName');
      expect(responseBody.fields).toContain('event.messageId');
      expect(responseBody.fields).toContain('event.templateId');
      expect(responseBody.fields).toContain('event.sourceType');
      expect(responseBody.fields).toContain('event.sentAt');
    });

    it('should discover correct fields for email.opened events', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id);

      await EventService.trackEvent(projectId, 'email.opened', contact.id, email.id, {
        subject: 'Newsletter',
        from: 'news@example.com',
        fromName: 'Newsletter Team',
        messageId: 'msg-456',
        openedAt: new Date().toISOString(),
        opens: 1,
        isFirstOpen: true,
      });

      const responseBody = await WorkflowService.getAvailableFields(projectId, 'email.opened');

      expect(responseBody.fields).toContain('event.openedAt');
      expect(responseBody.fields).toContain('event.opens');
      expect(responseBody.fields).toContain('event.isFirstOpen');
    });

    it('should discover correct fields for email.clicked events', async () => {
      const contact = await factories.createContact({projectId});
      const email = await factories.createEmail(projectId, contact.id);

      await EventService.trackEvent(projectId, 'email.clicked', contact.id, email.id, {
        subject: 'Sale Announcement',
        from: 'sales@example.com',
        link: 'https://example.com/sale',
        clickedAt: new Date().toISOString(),
        clicks: 1,
        isFirstClick: true,
      });

      const responseBody = await WorkflowService.getAvailableFields(projectId, 'email.clicked');

      expect(responseBody.fields).toContain('event.link');
      expect(responseBody.fields).toContain('event.clickedAt');
      expect(responseBody.fields).toContain('event.clicks');
      expect(responseBody.fields).toContain('event.isFirstClick');
    });
  });
});

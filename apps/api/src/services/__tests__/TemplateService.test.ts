import {beforeEach, describe, expect, it} from 'vitest';
import {TemplateType} from '@plunk/db';
import {TemplateService} from '../TemplateService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

describe('TemplateService', () => {
  let projectId: string;
  const prisma = getPrismaClient();

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  // ========================================
  // CRUD OPERATIONS
  // ========================================
  describe('create', () => {
    it('should create a template with all fields', async () => {
      const template = await TemplateService.create(projectId, {
        name: 'Welcome Email',
        description: 'Sent to new users',
        subject: 'Welcome to {{company}}!',
        body: '<h1>Hello {{firstName}}</h1>',
        from: 'hello@example.com',
        fromName: 'Company Team',
        replyTo: 'support@example.com',
        type: TemplateType.TRANSACTIONAL,
      });

      expect(template.name).toBe('Welcome Email');
      expect(template.description).toBe('Sent to new users');
      expect(template.subject).toBe('Welcome to {{company}}!');
      expect(template.body).toBe('<h1>Hello {{firstName}}</h1>');
      expect(template.from).toBe('hello@example.com');
      expect(template.fromName).toBe('Company Team');
      expect(template.replyTo).toBe('support@example.com');
      expect(template.type).toBe(TemplateType.TRANSACTIONAL);
      expect(template.projectId).toBe(projectId);
    });

    it('should create template with minimal required fields', async () => {
      const template = await TemplateService.create(projectId, {
        name: 'Basic Template',
        subject: 'Test',
        body: 'Test body',
        from: 'test@example.com',
      });

      expect(template.name).toBe('Basic Template');
      expect(template.type).toBe(TemplateType.MARKETING); // Default type
      expect(template.description).toBeNull();
      expect(template.fromName).toBeNull();
      expect(template.replyTo).toBeNull();
    });

    it('should default to MARKETING type when not specified', async () => {
      const template = await TemplateService.create(projectId, {
        name: 'Newsletter',
        subject: 'Monthly Update',
        body: 'Content',
        from: 'news@example.com',
      });

      expect(template.type).toBe(TemplateType.MARKETING);
    });
  });

  describe('get', () => {
    it('should retrieve a template by ID', async () => {
      const created = await factories.createTemplate({
        projectId,
        name: 'Test Template',
      });

      const retrieved = await TemplateService.get(projectId, created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test Template');
    });

    it('should throw 404 when template not found', async () => {
      await expect(TemplateService.get(projectId, 'non-existent-id')).rejects.toThrow('Template not found');
    });

    it('should throw 404 when template belongs to different project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const template = await factories.createTemplate({
        projectId: otherProject.id,
      });

      await expect(TemplateService.get(projectId, template.id)).rejects.toThrow('Template not found');
    });
  });

  describe('list', () => {
    it('should list templates with pagination', async () => {
      // Create 25 templates
      for (let i = 0; i < 25; i++) {
        await factories.createTemplate({
          projectId,
          name: `Template ${i}`,
        });
      }

      const page1 = await TemplateService.list(projectId, 1, 10);
      expect(page1.data).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(10);
      expect(page1.totalPages).toBe(3);

      const page2 = await TemplateService.list(projectId, 2, 10);
      expect(page2.data).toHaveLength(10);
      expect(page2.page).toBe(2);

      const page3 = await TemplateService.list(projectId, 3, 10);
      expect(page3.data).toHaveLength(5);
      expect(page3.page).toBe(3);
    });

    it('should filter templates by search query (name)', async () => {
      await factories.createTemplate({projectId, name: 'Welcome Email'});
      await factories.createTemplate({projectId, name: 'Password Reset'});
      await factories.createTemplate({projectId, name: 'Welcome Message'});

      const result = await TemplateService.list(projectId, 1, 20, 'welcome');

      expect(result.total).toBe(2);
      expect(result.data.every(t => t.name.toLowerCase().includes('welcome'))).toBe(true);
    });

    it('should filter templates by search query (description)', async () => {
      await prisma.template.create({
        data: {
          projectId,
          name: 'Template 1',
          description: 'For new users',
          subject: 'Subject',
          body: 'Body',
          from: 'test@example.com',
        },
      });
      await prisma.template.create({
        data: {
          projectId,
          name: 'Template 2',
          description: 'For existing customers',
          subject: 'Subject',
          body: 'Body',
          from: 'test@example.com',
        },
      });
      await prisma.template.create({
        data: {
          projectId,
          name: 'Template 3',
          description: 'For new subscribers',
          subject: 'Subject',
          body: 'Body',
          from: 'test@example.com',
        },
      });

      const result = await TemplateService.list(projectId, 1, 20, 'new');

      expect(result.total).toBe(2);
      expect(result.data.map(t => t.description)).toEqual(
        expect.arrayContaining([expect.stringContaining('new')]),
      );
    });

    it('should filter templates by search query (subject)', async () => {
      await factories.createTemplate({
        projectId,
        subject: 'Welcome to our platform',
      });
      await factories.createTemplate({
        projectId,
        subject: 'Reset your password',
      });
      await factories.createTemplate({
        projectId,
        subject: 'Welcome back!',
      });

      const result = await TemplateService.list(projectId, 1, 20, 'welcome');

      expect(result.total).toBe(2);
    });

    it('should filter templates by type', async () => {
      await factories.createTemplate({projectId, type: TemplateType.MARKETING});
      await factories.createTemplate({projectId, type: TemplateType.MARKETING});
      await factories.createTemplate({projectId, type: TemplateType.TRANSACTIONAL});
      await factories.createTemplate({projectId, type: TemplateType.HEADLESS});

      const marketingResult = await TemplateService.list(projectId, 1, 20, undefined, TemplateType.MARKETING);
      expect(marketingResult.total).toBe(2);
      expect(marketingResult.data.every(t => t.type === TemplateType.MARKETING)).toBe(true);

      const transactionalResult = await TemplateService.list(projectId, 1, 20, undefined, TemplateType.TRANSACTIONAL);
      expect(transactionalResult.total).toBe(1);
      expect(transactionalResult.data[0].type).toBe(TemplateType.TRANSACTIONAL);

      const headlessResult = await TemplateService.list(projectId, 1, 20, undefined, TemplateType.HEADLESS);
      expect(headlessResult.total).toBe(1);
      expect(headlessResult.data[0].type).toBe(TemplateType.HEADLESS);
    });

    it('should combine search and type filters', async () => {
      await factories.createTemplate({
        projectId,
        name: 'Welcome Email',
        type: TemplateType.MARKETING,
      });
      await factories.createTemplate({
        projectId,
        name: 'Welcome SMS',
        type: TemplateType.TRANSACTIONAL,
      });
      await factories.createTemplate({
        projectId,
        name: 'Newsletter',
        type: TemplateType.MARKETING,
      });

      const result = await TemplateService.list(projectId, 1, 20, 'welcome', TemplateType.MARKETING);

      expect(result.total).toBe(1);
      expect(result.data[0].name).toBe('Welcome Email');
    });

    it('should return templates ordered by creation date (newest first)', async () => {
      const template1 = await factories.createTemplate({projectId, name: 'First'});
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const template2 = await factories.createTemplate({projectId, name: 'Second'});
      await new Promise(resolve => setTimeout(resolve, 10));
      const template3 = await factories.createTemplate({projectId, name: 'Third'});

      const result = await TemplateService.list(projectId, 1, 20);

      expect(result.data[0].id).toBe(template3.id); // Newest
      expect(result.data[1].id).toBe(template2.id);
      expect(result.data[2].id).toBe(template1.id); // Oldest
    });

    it('should only return templates for the specified project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();

      await factories.createTemplate({projectId});
      await factories.createTemplate({projectId});
      await factories.createTemplate({projectId: otherProject.id});

      const result = await TemplateService.list(projectId);

      expect(result.total).toBe(2);
    });
  });

  describe('update', () => {
    it('should update template name', async () => {
      const template = await factories.createTemplate({
        projectId,
        name: 'Old Name',
      });

      const updated = await TemplateService.update(projectId, template.id, {
        name: 'New Name',
      });

      expect(updated.name).toBe('New Name');
    });

    it('should update template body and subject', async () => {
      const template = await factories.createTemplate({projectId});

      const updated = await TemplateService.update(projectId, template.id, {
        subject: 'New Subject',
        body: '<p>New body content</p>',
      });

      expect(updated.subject).toBe('New Subject');
      expect(updated.body).toBe('<p>New body content</p>');
    });

    it('should update template type', async () => {
      const template = await factories.createTemplate({
        projectId,
        type: TemplateType.MARKETING,
      });

      const updated = await TemplateService.update(projectId, template.id, {
        type: TemplateType.TRANSACTIONAL,
      });

      expect(updated.type).toBe(TemplateType.TRANSACTIONAL);
    });

    it('should update template type to HEADLESS', async () => {
      const template = await factories.createTemplate({
        projectId,
        type: TemplateType.MARKETING,
      });

      const updated = await TemplateService.update(projectId, template.id, {
        type: TemplateType.HEADLESS,
      });

      expect(updated.type).toBe(TemplateType.HEADLESS);
    });

    it('should update email fields (from, fromName, replyTo)', async () => {
      const template = await factories.createTemplate({projectId});

      const updated = await TemplateService.update(projectId, template.id, {
        from: 'new@example.com',
        fromName: 'New Name',
        replyTo: 'reply@example.com',
      });

      expect(updated.from).toBe('new@example.com');
      expect(updated.fromName).toBe('New Name');
      expect(updated.replyTo).toBe('reply@example.com');
    });

    it('should throw 404 when updating non-existent template', async () => {
      await expect(TemplateService.update(projectId, 'non-existent-id', {name: 'New Name'})).rejects.toThrow(
        'Template not found',
      );
    });

    it('should throw 404 when updating template from different project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const template = await factories.createTemplate({projectId: otherProject.id});

      await expect(TemplateService.update(projectId, template.id, {name: 'New Name'})).rejects.toThrow(
        'Template not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete a template', async () => {
      const template = await factories.createTemplate({projectId});

      await TemplateService.delete(projectId, template.id);

      const deleted = await prisma.template.findUnique({
        where: {id: template.id},
      });

      expect(deleted).toBeNull();
    });

    it('should throw 404 when deleting non-existent template', async () => {
      await expect(TemplateService.delete(projectId, 'non-existent-id')).rejects.toThrow('Template not found');
    });

    it('should BLOCK deleting template used in workflow steps', async () => {
      const template = await factories.createTemplate({projectId});
      const workflow = await factories.createWorkflow({projectId});
      await factories.createWorkflowStep({
        workflowId: workflow.id,
        templateId: template.id,
        type: 'SEND_EMAIL',
      });

      await expect(TemplateService.delete(projectId, template.id)).rejects.toThrow(/currently used in workflow steps/i);
    });

    it('should ALLOW deleting template that was used but no longer in workflows', async () => {
      const template = await factories.createTemplate({projectId});
      const workflow = await factories.createWorkflow({projectId});
      const step = await factories.createWorkflowStep({
        workflowId: workflow.id,
        templateId: template.id,
        type: 'SEND_EMAIL',
      });

      // Remove template from workflow step
      await prisma.workflowStep.update({
        where: {id: step.id},
        data: {templateId: null},
      });

      // Should now be deletable
      await TemplateService.delete(projectId, template.id);

      const deleted = await prisma.template.findUnique({
        where: {id: template.id},
      });

      expect(deleted).toBeNull();
    });
  });

  describe('bulkUpdate (delete)', () => {
    it('should bulk-delete multiple templates in this project', async () => {
      const a = await factories.createTemplate({projectId});
      const b = await factories.createTemplate({projectId});
      const c = await factories.createTemplate({projectId});

      const result = await TemplateService.bulkUpdate(projectId, {
        ids: [a.id, b.id, c.id],
        delete: true,
      });

      expect(result.deleted).toBe(3);
      expect(await prisma.template.count({where: {projectId}})).toBe(0);
    });

    it('should dedup repeated ids so the deleted count is not inflated', async () => {
      const a = await factories.createTemplate({projectId});

      const result = await TemplateService.bulkUpdate(projectId, {
        ids: [a.id, a.id, a.id],
        delete: true,
      });

      expect(result.deleted).toBe(1);
      expect(await prisma.template.findUnique({where: {id: a.id}})).toBeNull();
    });

    it('should throw 404 when any id does not exist', async () => {
      const a = await factories.createTemplate({projectId});

      await expect(
        TemplateService.bulkUpdate(projectId, {ids: [a.id, 'non-existent-id'], delete: true}),
      ).rejects.toThrow(/not found in this project/i);

      // Nothing deleted — the whole operation rolled back.
      expect(await prisma.template.findUnique({where: {id: a.id}})).not.toBeNull();
    });

    it('should throw 404 (and delete nothing) when an id belongs to another project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();
      const mine = await factories.createTemplate({projectId});
      const foreign = await factories.createTemplate({projectId: otherProject.id});

      await expect(
        TemplateService.bulkUpdate(projectId, {ids: [mine.id, foreign.id], delete: true}),
      ).rejects.toThrow(/not found in this project/i);

      // Both survive — atomic rollback, no cross-project leak.
      expect(await prisma.template.findUnique({where: {id: mine.id}})).not.toBeNull();
      expect(await prisma.template.findUnique({where: {id: foreign.id}})).not.toBeNull();
    });

    it('should throw 409 (and delete nothing) when any selected template is used in a workflow step', async () => {
      const used = await factories.createTemplate({projectId});
      const free = await factories.createTemplate({projectId});
      const workflow = await factories.createWorkflow({projectId});
      await factories.createWorkflowStep({
        workflowId: workflow.id,
        templateId: used.id,
        type: 'SEND_EMAIL',
      });

      await expect(
        TemplateService.bulkUpdate(projectId, {ids: [used.id, free.id], delete: true}),
      ).rejects.toThrow(/currently used in workflow steps/i);

      // Partial delete must be impossible — the un-referenced template must survive too.
      expect(await prisma.template.findUnique({where: {id: used.id}})).not.toBeNull();
      expect(await prisma.template.findUnique({where: {id: free.id}})).not.toBeNull();
    });

    it('should return {updated: 0} when delete flag is omitted (forward-compat no-op)', async () => {
      const a = await factories.createTemplate({projectId});

      const result = await TemplateService.bulkUpdate(projectId, {ids: [a.id]});

      expect(result).toEqual({updated: 0});
      // No-op: the template is untouched.
      expect(await prisma.template.findUnique({where: {id: a.id}})).not.toBeNull();
    });
  });

  describe('duplicate', () => {
    it('should duplicate a template with (Copy) suffix', async () => {
      const original = await factories.createTemplate({
        projectId,
        name: 'Original Template',
        description: 'Original description',
        subject: 'Original subject',
        body: 'Original body',
        from: 'original@example.com',
        fromName: 'Original Name',
        replyTo: 'reply@example.com',
        type: TemplateType.TRANSACTIONAL,
      });

      const duplicate = await TemplateService.duplicate(projectId, original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Original Template (Copy)');
      expect(duplicate.description).toBe(original.description);
      expect(duplicate.subject).toBe(original.subject);
      expect(duplicate.body).toBe(original.body);
      expect(duplicate.from).toBe(original.from);
      expect(duplicate.fromName).toBe(original.fromName);
      expect(duplicate.replyTo).toBe(original.replyTo);
      expect(duplicate.type).toBe(original.type);
      expect(duplicate.projectId).toBe(projectId);
    });

    it('should handle duplicating template with null optional fields', async () => {
      const original = await prisma.template.create({
        data: {
          projectId,
          name: 'Minimal Template',
          subject: 'Subject',
          body: 'Body',
          from: 'from@example.com',
          description: null,
          fromName: null,
          replyTo: null,
        },
      });

      const duplicate = await TemplateService.duplicate(projectId, original.id);

      expect(duplicate.name).toBe('Minimal Template (Copy)');
      expect(duplicate.description).toBeNull();
      expect(duplicate.fromName).toBeNull();
      expect(duplicate.replyTo).toBeNull();
    });

    it('should throw 404 when duplicating non-existent template', async () => {
      await expect(TemplateService.duplicate(projectId, 'non-existent-id')).rejects.toThrow('Template not found');
    });
  });

  // ========================================
  // TEMPLATE USAGE TRACKING
  // ========================================
  describe('getUsage', () => {
    it('should return usage statistics for template', async () => {
      const template = await factories.createTemplate({projectId});
      const workflow = await factories.createWorkflow({projectId});

      // Create workflow steps using this template
      await factories.createWorkflowStep({
        workflowId: workflow.id,
        templateId: template.id,
        type: 'SEND_EMAIL',
      });
      await factories.createWorkflowStep({
        workflowId: workflow.id,
        templateId: template.id,
        type: 'SEND_EMAIL',
      });

      // Create emails sent using this template
      const contact = await factories.createContact({projectId});
      await factories.createEmail(projectId, contact.id, {templateId: template.id});
      await factories.createEmail(projectId, contact.id, {templateId: template.id});
      await factories.createEmail(projectId, contact.id, {templateId: template.id});

      const usage = await TemplateService.getUsage(projectId, template.id);

      expect(usage.workflowSteps).toBe(2);
      expect(usage.emailsSent).toBe(3);
    });

    it('should return zero usage for unused template', async () => {
      const template = await factories.createTemplate({projectId});

      const usage = await TemplateService.getUsage(projectId, template.id);

      expect(usage.workflowSteps).toBe(0);
      expect(usage.emailsSent).toBe(0);
    });

    it('should only count usage within the project', async () => {
      const {project: otherProject} = await factories.createUserWithProject();

      const template = await factories.createTemplate({projectId});

      // Create workflow steps in different project (shouldn't count)
      const otherWorkflow = await factories.createWorkflow({projectId: otherProject.id});
      await factories.createWorkflowStep({
        workflowId: otherWorkflow.id,
        templateId: template.id, // Using same template ID (cross-project reference)
        type: 'SEND_EMAIL',
      });

      const usage = await TemplateService.getUsage(projectId, template.id);

      // Should not count workflow step from other project
      expect(usage.workflowSteps).toBe(0);
    });

    it('should throw 404 when getting usage for non-existent template', async () => {
      await expect(TemplateService.getUsage(projectId, 'non-existent-id')).rejects.toThrow('Template not found');
    });
  });

  // ========================================
  // EDGE CASES & DATA INTEGRITY
  // ========================================
  describe('edge cases', () => {
    it('should handle templates with HTML content', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Hello {{firstName}}</h1>
            <p>Welcome to {{company}}</p>
          </body>
        </html>
      `;

      const template = await TemplateService.create(projectId, {
        name: 'HTML Template',
        subject: 'Welcome',
        body: html,
        from: 'test@example.com',
      });

      expect(template.body).toBe(html);

      const retrieved = await TemplateService.get(projectId, template.id);
      expect(retrieved.body).toBe(html);
    });

    it('should handle templates with variable placeholders', async () => {
      const body = 'Hello {{firstName}} {{lastName}}, your code is {{verificationCode}}';
      const subject = 'Welcome {{firstName}} - {{company}}';

      const template = await TemplateService.create(projectId, {
        name: 'Variables Test',
        subject,
        body,
        from: 'test@example.com',
      });

      expect(template.subject).toBe(subject);
      expect(template.body).toBe(body);
    });

    it('should handle templates with special characters', async () => {
      const template = await TemplateService.create(projectId, {
        name: 'Special Chars: @#$%^&*()',
        subject: 'Émojis 🎉 & Spëcial Çhars',
        body: '<p>Price: $100 • Discount: 20%</p>',
        from: 'test@example.com',
      });

      expect(template.name).toBe('Special Chars: @#$%^&*()');
      expect(template.subject).toContain('🎉');
      expect(template.body).toContain('$100');
    });

    it('should handle very long template content', async () => {
      const longBody = '<p>' + 'Lorem ipsum '.repeat(1000) + '</p>';

      const template = await TemplateService.create(projectId, {
        name: 'Long Template',
        subject: 'Test',
        body: longBody,
        from: 'test@example.com',
      });

      expect(template.body.length).toBeGreaterThan(10000);
    });
  });
});

import {beforeEach, describe, expect, it} from 'vitest';
import {WorkflowStepType} from '@plunk/db';
import {WorkflowService} from '../WorkflowService';
import {factories, getPrismaClient} from '../../../../../test/helpers';

/**
 * Plunk records email engagement as `email.open`, `email.click`, `email.delivery`, `email.bounce`
 * and `email.complaint`. Segments also accept the past tense, but a workflow compares event names
 * exactly, so a trigger or wait saved with the past tense would never fire.
 */
describe('WorkflowService - event names that never fire', () => {
  const prisma = getPrismaClient();
  let projectId: string;

  beforeEach(async () => {
    const {project} = await factories.createUserWithProject();
    projectId = project.id;
  });

  const neverFires = (emitted: string) => ({
    code: 400,
    message: expect.stringContaining(`Plunk records this event as "${emitted}"`),
  });

  describe('create', () => {
    it.each([
      ['email.opened', 'email.open'],
      ['email.clicked', 'email.click'],
      ['email.delivered', 'email.delivery'],
      ['email.bounced', 'email.bounce'],
      ['email.complained', 'email.complaint'],
    ])('rejects "%s" and names "%s"', async (pastTense, emitted) => {
      await expect(WorkflowService.create(projectId, {name: 'Re-engage', eventName: pastTense})).rejects.toMatchObject(
        neverFires(emitted),
      );
    });

    it.each(['email.open', 'user.signup', 'email.custom', ' email.open '])('accepts "%s"', async eventName => {
      const workflow = await WorkflowService.create(projectId, {name: 'Re-engage', eventName});

      expect(workflow.triggerConfig).toEqual({eventName: eventName.trim()});
    });
  });

  describe('update', () => {
    it('rejects changing the trigger to a past-tense name', async () => {
      const workflow = await factories.createWorkflow({projectId, triggerConfig: {eventName: 'user.signup'}});

      await expect(
        WorkflowService.update(projectId, workflow.id, {triggerConfig: {eventName: 'email.clicked'}}),
      ).rejects.toMatchObject(neverFires('email.click'));
    });

    it('still saves a workflow whose trigger was stored before the check', async () => {
      const workflow = await factories.createWorkflow({projectId, triggerConfig: {eventName: 'email.opened'}});

      const renamed = await WorkflowService.update(projectId, workflow.id, {name: 'Renamed'});
      expect(renamed.name).toBe('Renamed');

      // The settings dialog sends the unchanged trigger along with every other field
      const described = await WorkflowService.update(projectId, workflow.id, {
        description: 'Win back inactive contacts',
        triggerConfig: {eventName: 'email.opened'},
      });
      expect(described.description).toBe('Win back inactive contacts');
    });
  });

  describe('WAIT_FOR_EVENT steps', () => {
    it('rejects adding a wait for a past-tense name', async () => {
      const workflow = await factories.createWorkflow({projectId});

      await expect(
        WorkflowService.addStep(projectId, workflow.id, {
          type: WorkflowStepType.WAIT_FOR_EVENT,
          name: 'Wait',
          position: {x: 0, y: 0},
          config: {eventName: 'email.delivered', timeout: 3600},
          autoConnect: false,
        }),
      ).rejects.toMatchObject(neverFires('email.delivery'));
    });

    it('adds a wait with an empty config, as the editor does before the step is configured', async () => {
      const workflow = await factories.createWorkflow({projectId});

      const step = await WorkflowService.addStep(projectId, workflow.id, {
        type: WorkflowStepType.WAIT_FOR_EVENT,
        name: 'Wait',
        position: {x: 0, y: 0},
        config: {},
        autoConnect: false,
      });

      expect(step.config).toEqual({});
    });

    it('rejects changing a wait to a past-tense name, but keeps one stored before the check editable', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const wait = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.WAIT_FOR_EVENT,
        config: {eventName: 'email.opened', timeout: 3600},
      });

      await expect(
        WorkflowService.updateStep(projectId, workflow.id, wait.id, {
          config: {eventName: 'email.bounced', timeout: 3600},
        }),
      ).rejects.toMatchObject(neverFires('email.bounce'));

      // The step dialog sends the whole config, unchanged name included
      const updated = await WorkflowService.updateStep(projectId, workflow.id, wait.id, {
        config: {eventName: 'email.opened', timeout: 7200},
      });
      expect(updated.config).toEqual({eventName: 'email.opened', timeout: 7200});
    });

    it('does not check event names on other step types', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const template = await factories.createTemplate({projectId});
      const send = await factories.createWorkflowStep({
        workflowId: workflow.id,
        type: WorkflowStepType.SEND_EMAIL,
        templateId: template.id,
      });

      const updated = await WorkflowService.updateStep(projectId, workflow.id, send.id, {
        config: {templateId: template.id, eventName: 'email.opened'},
      });

      expect(updated.config).toEqual({templateId: template.id, eventName: 'email.opened'});
    });

    it('rejects inserting a wait for a past-tense name into the flow', async () => {
      const workflow = await factories.createWorkflow({projectId});
      const trigger = await prisma.workflowStep.findFirstOrThrow({
        where: {workflowId: workflow.id, type: WorkflowStepType.TRIGGER},
      });
      const exit = await factories.createWorkflowStep({workflowId: workflow.id, type: WorkflowStepType.EXIT});
      const transition = await prisma.workflowTransition.create({data: {fromStepId: trigger.id, toStepId: exit.id}});

      await expect(
        WorkflowService.insertStepOnTransition(projectId, workflow.id, transition.id, {
          type: WorkflowStepType.WAIT_FOR_EVENT,
          name: 'Wait',
          config: {eventName: 'email.complained'},
        }),
      ).rejects.toMatchObject(neverFires('email.complaint'));
    });
  });
});

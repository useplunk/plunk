import type {
  Contact,
  Prisma,
  Template,
  Workflow,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStepExecution,
} from '@plunk/db';
import {StepExecutionStatus, WorkflowExecutionStatus, WorkflowWaitOutcome} from '@plunk/db';
import {toPrismaJson} from '@plunk/types';
import {renderTemplate, WorkflowStepConfigSchemas} from '@plunk/shared';
import dns from 'node:dns/promises';
import net from 'node:net';
import signale from 'signale';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import {DASHBOARD_URI} from '../app/constants.js';

import {EmailService} from './EmailService.js';
import {NtfyService} from './NtfyService.js';
import {QueueService} from './QueueService.js';

type StepConfig = Prisma.JsonValue;
type StepResult = Record<string, unknown>;
type WorkflowExecutionWithRelations = WorkflowExecution & {contact: Contact; workflow: Workflow};
type WorkflowStepWithTemplate = WorkflowStep & {template?: Template | null};
type WorkflowStepWithTransitions = WorkflowStep & {
  outgoingTransitions?: Array<{
    id: string;
    condition: Prisma.JsonValue;
    waitOutcome: WorkflowWaitOutcome | null;
    priority: number;
    toStep: WorkflowStep;
  }>;
};

/**
 * Core Workflow Execution Engine
 * Handles the execution of workflows step by step
 */
export class WorkflowExecutionService {
  /**
   * Process a single step execution
   * This is the main entry point for executing workflow steps
   */
  public static async processStepExecution(executionId: string, stepId: string): Promise<void> {
    signale.info(`[WORKFLOW] Processing step execution: ${executionId} -> ${stepId}`);

    const initialExecution = await prisma.workflowExecution.findUnique({
      where: {id: executionId},
      include: {
        workflow: {
          include: {
            steps: {
              include: {
                template: true,
                outgoingTransitions: {
                  orderBy: {priority: 'asc'},
                  include: {toStep: true},
                },
              },
            },
            project: {
              select: {disabled: true, id: true, name: true},
            },
          },
        },
        contact: true,
      },
    });

    if (!initialExecution) {
      signale.error(`[WORKFLOW] Execution ${executionId} not found`);
      throw new HttpException(404, 'Workflow execution not found');
    }

    signale.info(`[WORKFLOW] Execution ${executionId} status: ${initialExecution.status}`);

    // For WAITING executions, check if this is a delayed step that's ready to execute
    if (initialExecution.status === WorkflowExecutionStatus.WAITING) {
      signale.info(`[WORKFLOW] Execution ${executionId} is WAITING, resuming from delay`);
      // This is a delayed step - continue with execution
    } else if (initialExecution.status !== WorkflowExecutionStatus.RUNNING) {
      signale.info(
        `[WORKFLOW] Execution ${executionId} already completed or cancelled with status ${initialExecution.status}, skipping`,
      );
      return; // Already completed or cancelled
    }

    // Check if project is disabled
    if (initialExecution.workflow.project.disabled) {
      signale.warn(
        `[WORKFLOW] Project ${initialExecution.workflow.projectId} (${initialExecution.workflow.project.name}) is disabled, cancelling workflow execution ${executionId}`,
      );
      await prisma.workflowExecution.update({
        where: {id: executionId},
        data: {
          status: WorkflowExecutionStatus.CANCELLED,
          completedAt: new Date(),
          exitReason: 'Project disabled',
        },
      });
      return;
    }

    // Check if workflow is disabled
    // Note: We allow running executions to complete even if workflow is disabled
    // This prevents disruption to contacts who are already in the workflow
    // Only NEW executions are prevented when workflow is disabled (see startExecution in WorkflowService)
    if (!initialExecution.workflow.enabled) {
      signale.info(
        `[WORKFLOW] Workflow ${initialExecution.workflow.id} (${initialExecution.workflow.name}) is disabled, but allowing execution ${executionId} to continue`,
      );
      // Allow execution to continue - no action needed
    }

    const step = initialExecution.workflow.steps.find(s => s.id === stepId);
    if (!step) {
      signale.error(`[WORKFLOW] Step ${stepId} not found in workflow ${initialExecution.workflow.id}`);
      throw new HttpException(404, 'Step not found in workflow');
    }

    signale.info(`[WORKFLOW] Found step: ${step.name} (${step.type})`);

    // Track if this execution was in WAITING state (meaning it's a delayed step)
    const isResumingFromDelay = initialExecution.status === WorkflowExecutionStatus.WAITING;

    // If workflow execution is WAITING (e.g., from a delay), set it back to RUNNING
    let execution = initialExecution;
    if (initialExecution.status === WorkflowExecutionStatus.WAITING) {
      signale.info(`[WORKFLOW] Setting execution ${executionId} from WAITING to RUNNING`);
      await prisma.workflowExecution.update({
        where: {id: executionId},
        data: {
          status: WorkflowExecutionStatus.RUNNING,
          currentStepId: stepId,
        },
      });

      // Re-fetch the execution with the updated status
      const updatedExecution = await prisma.workflowExecution.findUnique({
        where: {id: executionId},
        include: {
          workflow: {
            include: {
              steps: {
                include: {
                  template: true,
                  outgoingTransitions: {
                    orderBy: {priority: 'asc'},
                    include: {toStep: true},
                  },
                },
              },
              project: {
                select: {disabled: true, id: true, name: true},
              },
            },
          },
          contact: true,
        },
      });

      if (!updatedExecution) {
        signale.error(`[WORKFLOW] Execution ${executionId} not found after status update`);
        throw new HttpException(404, 'Workflow execution not found');
      }

      execution = updatedExecution;

      signale.info(`[WORKFLOW] Execution ${executionId} status updated to RUNNING`);
    }

    // Create or get step execution record
    let stepExecution = await prisma.workflowStepExecution.findFirst({
      where: {
        executionId,
        stepId,
        status: {in: [StepExecutionStatus.PENDING, StepExecutionStatus.RUNNING]},
      },
    });

    if (!stepExecution) {
      signale.info(`[WORKFLOW] Creating new step execution for ${executionId} -> ${stepId}`);
      try {
        stepExecution = await prisma.workflowStepExecution.create({
          data: {
            executionId,
            stepId,
            status: StepExecutionStatus.RUNNING,
            startedAt: new Date(),
          },
        });
        signale.info(`[WORKFLOW] Created step execution ${stepExecution.id}`);
      } catch (error) {
        signale.error(`[WORKFLOW] Failed to create step execution for ${executionId} -> ${stepId}:`, error);
        throw error;
      }
    } else {
      stepExecution = await prisma.workflowStepExecution.update({
        where: {id: stepExecution.id},
        data: {
          status: StepExecutionStatus.RUNNING,
          startedAt: stepExecution.startedAt || new Date(),
        },
      });
      signale.info(`[WORKFLOW] Updated existing step execution ${stepExecution.id} to RUNNING`);
    }

    try {
      // Execute the step based on its type
      signale.info(`[WORKFLOW] Executing step ${stepId} of type ${step.type}`);
      const result = await this.executeStep(step, execution, stepExecution);
      signale.info(`[WORKFLOW] Step ${stepId} executed successfully`);

      // Check if step is in a waiting state (WAIT_FOR_EVENT steps only)
      // DELAY steps now mark themselves as COMPLETED and queue the next step
      const updatedStepExecution = await prisma.workflowStepExecution.findUnique({
        where: {id: stepExecution.id},
      });

      if (updatedStepExecution?.status === StepExecutionStatus.WAITING) {
        // Don't mark as completed or process next steps - the step will be resumed later
        return;
      }

      // Check if the workflow execution is now in WAITING state (DELAY steps do this)
      // Only check this if we're NOT resuming from a delay - if we are resuming,
      // we've already set it to RUNNING and the step just executed
      if (!isResumingFromDelay) {
        const updatedExecution = await prisma.workflowExecution.findUnique({
          where: {id: execution.id},
        });

        if (updatedExecution?.status === WorkflowExecutionStatus.WAITING) {
          // Workflow is waiting (DELAY step has queued the next step) - don't process next steps now
          return;
        }
      }

      // Mark step as completed (for normal steps that complete immediately)
      await prisma.workflowStepExecution.update({
        where: {id: stepExecution.id},
        data: {
          status: StepExecutionStatus.COMPLETED,
          completedAt: new Date(),
          output: result ? toPrismaJson(result) : undefined,
        },
      });

      // Determine next step(s) based on transitions and conditions
      await this.processNextSteps(execution, step, result);
    } catch (error) {
      signale.error(`[WORKFLOW] Error executing step ${step.id}:`, error);
      // Mark step as failed
      await prisma.workflowStepExecution.update({
        where: {id: stepExecution.id},
        data: {
          status: StepExecutionStatus.FAILED,
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Mark workflow execution as failed
      const failedExecution = await prisma.workflowExecution.update({
        where: {id: executionId},
        data: {
          status: WorkflowExecutionStatus.FAILED,
          completedAt: new Date(),
        },
        include: {
          workflow: {
            select: {
              name: true,
              project: {
                select: {name: true, id: true},
              },
            },
          },
          contact: {
            select: {email: true},
          },
        },
      });

      // Send notification about workflow execution failure
      await NtfyService.notifyWorkflowExecutionFailed(
        failedExecution.workflow.name,
        failedExecution.workflow.project.name,
        failedExecution.workflow.project.id,
        failedExecution.contact.email,
        error instanceof Error ? error.message : 'Unknown error',
      );

      throw error;
    }
  }

  /**
   * Process timeout for a WAIT_FOR_EVENT step
   * Called by BullMQ worker when timeout job executes
   */
  public static async processTimeout(executionId: string, stepId: string, stepExecutionId: string): Promise<void> {
    // Fetch the step execution
    const stepExecution = await prisma.workflowStepExecution.findUnique({
      where: {id: stepExecutionId},
      include: {
        execution: true,
        step: {
          include: {
            outgoingTransitions: {
              include: {toStep: true},
              orderBy: {priority: 'asc'},
            },
          },
        },
      },
    });

    if (!stepExecution) {
      return;
    }

    // Only process if step is still waiting (event might have arrived before timeout)
    if (stepExecution.status !== StepExecutionStatus.WAITING) {
      return;
    }

    const result = {
      waitOutcome: WorkflowWaitOutcome.TIMEOUT,
      timedOut: true,
      eventName:
        stepExecution.step.config &&
        typeof stepExecution.step.config === 'object' &&
        'eventName' in stepExecution.step.config
          ? stepExecution.step.config.eventName
          : undefined,
    };

    // Mark step as completed with timeout
    await prisma.workflowStepExecution.update({
      where: {id: stepExecution.id},
      data: {
        status: StepExecutionStatus.COMPLETED,
        completedAt: new Date(),
        output: toPrismaJson(result),
      },
    });

    await this.processNextSteps(stepExecution.execution, stepExecution.step, result);
  }

  /**
   * Handle event occurrence and resume waiting workflows
   */
  public static async handleEvent(
    projectId: string,
    eventName: string,
    contactId?: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    // Find workflows waiting for this event
    const waitingExecutions = await prisma.workflowStepExecution.findMany({
      where: {
        status: StepExecutionStatus.WAITING,
        execution: {
          workflow: {projectId},
          ...(contactId ? {contactId} : {}),
        },
        step: {
          type: 'WAIT_FOR_EVENT',
        },
      },
      include: {
        execution: {
          include: {
            contact: true,
            workflow: true,
          },
        },
        step: {
          include: {
            outgoingTransitions: {
              orderBy: {priority: 'asc'},
              include: {toStep: true},
            },
          },
        },
      },
    });

    for (const stepExecution of waitingExecutions) {
      const config = stepExecution.step.config;

      if (config && typeof config === 'object' && 'eventName' in config && config.eventName === eventName) {
        const currentContext =
          stepExecution.execution.context &&
          typeof stepExecution.execution.context === 'object' &&
          !Array.isArray(stepExecution.execution.context)
            ? (stepExecution.execution.context as Record<string, unknown>)
            : {};
        const resumedContext = {...currentContext, ...(data ?? {})};
        const result = {
          waitOutcome: WorkflowWaitOutcome.EVENT,
          eventReceived: true,
          eventName,
          ...(data ? {eventData: data} : {}),
          receivedAt: new Date().toISOString(),
        };

        // Persist the resume payload with the completed wait. A worker restart
        // after this commit reads the same context for downstream steps.
        await prisma.$transaction([
          prisma.workflowStepExecution.update({
            where: {id: stepExecution.id},
            data: {
              status: StepExecutionStatus.COMPLETED,
              completedAt: new Date(),
              output: toPrismaJson(result),
            },
          }),
          prisma.workflowExecution.update({
            where: {id: stepExecution.executionId},
            data: {context: toPrismaJson(resumedContext)},
          }),
        ]);

        // Cancel any pending timeout job
        await QueueService.cancelWorkflowTimeout(stepExecution.id);

        // Continue workflow
        await this.processNextSteps(stepExecution.execution, stepExecution.step, result);
      }
    }
  }

  /**
   * Execute a specific step based on its type
   */
  private static async executeStep(
    step: WorkflowStepWithTemplate,
    execution: WorkflowExecutionWithRelations,
    stepExecution: WorkflowStepExecution,
  ): Promise<StepResult> {
    const config = step.config;

    switch (step.type) {
      case 'TRIGGER':
        return await this.executeTrigger(step, execution, stepExecution, config);

      case 'SEND_EMAIL':
        return await this.executeSendEmail(step, execution, stepExecution, config);

      case 'DELAY':
        return await this.executeDelay(step, execution, stepExecution, config);

      case 'WAIT_FOR_EVENT':
        return await this.executeWaitForEvent(step, execution, stepExecution, config);

      case 'CONDITION':
        return await this.executeCondition(step, execution, stepExecution, config);

      case 'EXIT':
        return await this.executeExit(step, execution, stepExecution, config);

      case 'WEBHOOK':
        return await this.executeWebhook(step, execution, stepExecution, config);

      case 'UPDATE_CONTACT':
        return await this.executeUpdateContact(step, execution, stepExecution, config);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * TRIGGER step - Entry point of workflow
   */
  private static async executeTrigger(
    _step: WorkflowStep,
    _execution: WorkflowExecutionWithRelations,
    _stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    // Trigger step is just the entry point, it doesn't do anything
    // But we can log or track that the workflow started
    const eventName = config && typeof config === 'object' && 'eventName' in config ? config.eventName : 'manual';
    return {
      triggered: true,
      eventName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * SEND_EMAIL step - Send an email to the contact or a custom recipient
   */
  private static async executeSendEmail(
    step: WorkflowStepWithTemplate,
    execution: WorkflowExecutionWithRelations,
    stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    if (!step.template) {
      throw new Error('No template configured for SEND_EMAIL step');
    }

    // Parse and validate step config using schema
    const stepConfig = WorkflowStepConfigSchemas.sendEmail.parse(config);
    const recipientConfig = stepConfig.recipient || {type: 'CONTACT' as const};

    // Get contact data for variable substitution
    const contact = execution.contact;
    const contactData =
      contact.data && typeof contact.data === 'object' && !Array.isArray(contact.data)
        ? (contact.data as Record<string, unknown>)
        : {};

    // Render template with contact data
    const executionContext =
      execution.context && typeof execution.context === 'object' && !Array.isArray(execution.context)
        ? (execution.context as Record<string, unknown>)
        : {};

    const variables = {
      id: contact.id,
      email: contact.email,
      ...contactData,
      ...executionContext,
      data: contactData,
      event: executionContext,
      unsubscribeUrl: `${DASHBOARD_URI}/unsubscribe/${contact.id}`,
      subscribeUrl: `${DASHBOARD_URI}/subscribe/${contact.id}`,
      manageUrl: `${DASHBOARD_URI}/manage/${contact.id}`,
    };

    const renderedSubject = this.renderTemplate(step.template.subject, variables);
    const renderedBody = this.renderTemplate(step.template.body, variables);

    // Determine recipient email
    // Schema validation ensures customEmail exists when type is CUSTOM
    const recipientEmail = recipientConfig.type === 'CUSTOM' ? recipientConfig.customEmail! : contact.email;

    // Send email via EmailService
    const email = await EmailService.sendWorkflowEmail({
      projectId: execution.workflow.projectId,
      contactId: contact.id, // Keep original contact for tracking
      workflowExecutionId: execution.id,
      workflowStepExecutionId: stepExecution.id, // Use stepExecution.id, not step.id
      templateId: step.template.id,
      subject: renderedSubject,
      body: renderedBody,
      from: step.template.from,
      fromName: step.template.fromName || undefined,
      replyTo: step.template.replyTo || undefined,
      // Pass custom recipient email if specified
      recipientEmail: recipientConfig.type === 'CUSTOM' ? recipientConfig.customEmail : undefined,
    });

    return {
      emailId: email.id,
      sentAt: email.createdAt,
      recipientType: recipientConfig.type,
      recipientEmail,
    };
  }

  /**
   * DELAY step - Wait for a specified duration
   */
  private static async executeDelay(
    _step: WorkflowStep,
    _execution: WorkflowExecutionWithRelations,
    stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    const {amount, unit} = WorkflowStepConfigSchemas.delay.parse(config);

    // Calculate delay in milliseconds
    let delayMs = 0;

    switch (unit) {
      case 'minutes':
        delayMs = amount * 60 * 1000;
        break;
      case 'hours':
        delayMs = amount * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = amount * 24 * 60 * 60 * 1000;
        break;
      default:
        throw new Error(`Unknown delay unit: ${unit}`);
    }

    const resumeAt = new Date(Date.now() + delayMs);

    // Mark step as completed immediately (BullMQ handles the delay)
    await prisma.workflowStepExecution.update({
      where: {id: stepExecution.id},
      data: {
        status: StepExecutionStatus.COMPLETED,
        completedAt: new Date(),
        output: {
          delayAmount: amount,
          delayUnit: unit,
          resumeAt: resumeAt.toISOString(),
        },
      },
    });

    // Update workflow execution to waiting
    await prisma.workflowExecution.update({
      where: {id: _execution.id},
      data: {
        status: WorkflowExecutionStatus.WAITING,
      },
    });

    // Find next steps to queue
    const transitions = await prisma.workflowTransition.findMany({
      where: {fromStepId: _step.id},
      include: {toStep: true},
      orderBy: {priority: 'asc'},
    });

    if (transitions.length > 0) {
      const firstTransition = transitions[0];
      if (firstTransition?.toStep) {
        const nextStep = firstTransition.toStep;
        await QueueService.queueWorkflowStep(_execution.id, nextStep.id, Math.max(0, delayMs));
      }
    }

    return {
      delayAmount: amount,
      delayUnit: unit,
      resumeAt: resumeAt.toISOString(),
      queued: true,
    };
  }

  /**
   * WAIT_FOR_EVENT step - Wait for a specific event to occur
   */
  private static async executeWaitForEvent(
    _step: WorkflowStep,
    _execution: WorkflowExecutionWithRelations,
    stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    const {eventName, timeout} = WorkflowStepConfigSchemas.waitForEvent.parse(config);

    // Calculate timeout
    const timeoutDate = timeout ? new Date(Date.now() + timeout * 1000) : null;

    // Update step execution to waiting
    await prisma.workflowStepExecution.update({
      where: {id: stepExecution.id},
      data: {
        status: StepExecutionStatus.WAITING,
        executeAfter: timeoutDate,
      },
    });

    // Update workflow execution to waiting
    await prisma.workflowExecution.update({
      where: {id: _execution.id},
      data: {
        status: WorkflowExecutionStatus.WAITING,
      },
    });

    // Queue timeout handler if timeout is specified
    if (timeout && timeout > 0) {
      const timeoutMs = timeout * 1000;
      await QueueService.queueWorkflowTimeout(_execution.id, _step.id, stepExecution.id, timeoutMs);
    }

    return {
      eventName,
      timeout: timeout || null,
      waitingUntil: timeoutDate?.toISOString() || 'indefinite',
    };
  }

  /**
   * CONDITION step - Evaluate a condition and determine branching
   */
  private static async executeCondition(
    _step: WorkflowStep,
    execution: WorkflowExecutionWithRelations,
    _stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    const parsed = WorkflowStepConfigSchemas.condition.parse(config);

    // Get the value to evaluate
    const contact = execution.contact;
    const contactData =
      contact.data && typeof contact.data === 'object' && !Array.isArray(contact.data)
        ? (contact.data as Record<string, unknown>)
        : {};
    const context = execution.context || {};

    // Resolve the field value (support dot notation)
    // Structure allows access to:
    // - contact.email, contact.subscribed
    // - data.firstName, data.lastName, etc.
    // - workflow.* (execution context - alias for event data)
    // - event.* (event data that triggered the workflow)
    const fieldData = {
      contact: {
        email: contact.email,
        subscribed: contact.subscribed,
      },
      data: contactData,
      workflow: context,
      event: context, // Alias for easier access to event data
    };

    // Multi-branch mode (switch/case)
    if ('mode' in parsed && parsed.mode === 'multi') {
      const actualValue = this.resolveField(parsed.field, fieldData);

      for (const branch of parsed.branches) {
        if (this.evaluateCondition(actualValue, branch.operator, branch.value)) {
          return {
            field: parsed.field,
            mode: 'multi',
            matchedBranch: branch.name,
            actualValue,
            branch: branch.id,
          };
        }
      }

      // No branch matched — use default
      return {
        field: parsed.field,
        mode: 'multi',
        matchedBranch: 'default',
        actualValue,
        branch: 'default',
      };
    }

    // Legacy binary mode (if/else)
    const field = parsed.field;
    const operator = 'operator' in parsed ? parsed.operator : 'equals';
    const value = 'value' in parsed ? parsed.value : undefined;
    const actualValue = this.resolveField(field, fieldData);
    const result = this.evaluateCondition(actualValue, operator, value);

    return {
      field,
      operator,
      expectedValue: value,
      // Convert undefined to null so it's preserved in JSON (JSON.stringify removes undefined)
      actualValue: actualValue === undefined ? null : actualValue,
      result,
      branch: result ? 'yes' : 'no',
    };
  }

  /**
   * EXIT step - Terminate the workflow
   */
  private static async executeExit(
    _step: WorkflowStep,
    execution: WorkflowExecutionWithRelations,
    _stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    const reason =
      config &&
      typeof config === 'object' &&
      !Array.isArray(config) &&
      'reason' in config &&
      typeof config.reason === 'string'
        ? config.reason
        : 'exit_step';

    // Mark workflow as exited
    await prisma.workflowExecution.update({
      where: {id: execution.id},
      data: {
        status: WorkflowExecutionStatus.EXITED,
        exitReason: reason || undefined,
        completedAt: new Date(),
      },
    });

    return {
      exited: true,
      reason,
    };
  }

  /**
   * True if a dotted-quad IPv4 address is in a private/reserved range.
   */
  private static isPrivateIpv4(addr: string): boolean {
    const parts = addr.split('.').map(Number);
    const a = parts[0] ?? -1;
    const b = parts[1] ?? -1;

    return (
      a === 127 || // 127.0.0.0/8 loopback
      a === 10 || // 10.0.0.0/8 private
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
      (a === 192 && b === 168) || // 192.168.0.0/16 private
      (a === 169 && b === 254) || // 169.254.0.0/16 link-local / cloud metadata
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 shared address space
      a === 0 || // 0.0.0.0/8
      a >= 224 // 224.0.0.0+ multicast and reserved
    );
  }

  /**
   * Expands an IPv6 address into its 8 hextets (16-bit numbers).
   *
   * Handles `::` compression, an optional zone id, and a trailing dotted-quad
   * (e.g. `::ffff:169.254.169.254`). Returns null if the address is malformed —
   * callers must treat that as untrusted.
   */
  private static expandIpv6(addr: string): number[] | null {
    // Drop the zone id (fe80::1%eth0) — it is not part of the address
    const bare = addr.split('%')[0]?.toLowerCase() ?? '';

    // A trailing dotted-quad occupies the final two hextets
    let head = bare;
    const dotted = bare.lastIndexOf(':');
    const tail = bare.slice(dotted + 1);
    let embedded: number[] = [];
    if (tail.includes('.')) {
      if (!net.isIPv4(tail)) {
        return null;
      }
      const [a = 0, b = 0, c = 0, d = 0] = tail.split('.').map(Number);
      embedded = [(a << 8) | b, (c << 8) | d];
      head = bare.slice(0, dotted + 1);
      // `::1.2.3.4` leaves a trailing `::`, `1::1.2.3.4` a trailing `:`
      head = head.endsWith('::') ? head : head.slice(0, -1);
    }

    const halves = head.split('::');
    if (halves.length > 2) {
      return null;
    }

    const toHextets = (part: string) =>
      part === '' ? [] : part.split(':').map(h => (/^[0-9a-f]{1,4}$/.test(h) ? Number.parseInt(h, 16) : Number.NaN));

    const left = toHextets(halves[0] ?? '');
    const right = halves.length === 2 ? toHextets(halves[1] ?? '') : [];

    const fixed = [...left, ...right, ...embedded];
    if (fixed.some(Number.isNaN)) {
      return null;
    }

    if (halves.length === 1) {
      return fixed.length === 8 ? fixed : null;
    }

    const gap = 8 - fixed.length;
    if (gap < 1) {
      return null;
    }

    return [...left, ...new Array<number>(gap).fill(0), ...right, ...embedded];
  }

  /**
   * Validates that an IP address is not in a private/reserved range to prevent SSRF.
   * Blocks loopback, private, link-local, and cloud metadata ranges.
   *
   * IPv6 is range-checked on the parsed hextets rather than by string prefix, so
   * alternate spellings of the same address cannot slip through. Transition
   * mechanisms that embed an IPv4 address (IPv4-mapped, IPv4-compatible, 6to4,
   * NAT64, Teredo) are unwrapped and the embedded IPv4 re-validated — otherwise
   * e.g. `2002:a9fe:a9fe::` would reach 169.254.169.254 unblocked.
   */
  private static isPrivateIp(ip: string): boolean {
    if (net.isIPv4(ip)) {
      return WorkflowExecutionService.isPrivateIpv4(ip);
    }

    if (net.isIPv6(ip)) {
      const h = WorkflowExecutionService.expandIpv6(ip);
      if (!h) {
        return true;
      }

      const [h0 = 0, h1 = 0, h2 = 0, h3 = 0, h4 = 0, h5 = 0, h6 = 0, h7 = 0] = h;
      const v4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
      const topZero = h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0;

      // ::/128 unspecified and ::1/128 loopback
      if (topZero && h5 === 0 && h6 === 0 && (h7 === 0 || h7 === 1)) {
        return true;
      }

      // ::ffff:0:0/96 IPv4-mapped and ::/96 IPv4-compatible (deprecated)
      if (topZero && (h5 === 0xffff || h5 === 0)) {
        return WorkflowExecutionService.isPrivateIpv4(v4(h6, h7));
      }

      // 64:ff9b::/96 and 64:ff9b:1::/48 NAT64 (RFC 6052, RFC 8215)
      if (h0 === 0x0064 && h1 === 0xff9b) {
        return h2 === 0x0001 ? true : WorkflowExecutionService.isPrivateIpv4(v4(h6, h7));
      }

      // 2002::/16 6to4 (RFC 3056) — the embedded IPv4 is the tunnel endpoint
      if (h0 === 0x2002) {
        return WorkflowExecutionService.isPrivateIpv4(v4(h1, h2));
      }

      // 2001:0000::/32 Teredo (RFC 4380) — obfuscated endpoints, block outright
      if (h0 === 0x2001 && h1 === 0x0000) {
        return true;
      }

      return (
        (h0 & 0xffc0) === 0xfe80 || // fe80::/10 link-local
        (h0 & 0xfe00) === 0xfc00 || // fc00::/7 unique local
        (h0 & 0xff00) === 0xff00 || // ff00::/8 multicast
        (h0 === 0x0100 && h1 === 0 && h2 === 0 && h3 === 0) || // 100::/64 discard-only
        (h0 === 0x2001 && h1 === 0x0db8) // 2001:db8::/32 documentation
      );
    }

    // Unknown format — reject to be safe
    return true;
  }

  /**
   * SSRF-safe fetch. Resolves the hostname, validates the IP is not internal,
   * and manually follows redirects re-validating each hop.
   */
  private static async safeFetch(url: string, options: RequestInit): Promise<Response> {
    const MAX_REDIRECTS = 5;
    let currentUrl = url;

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const parsed = new URL(currentUrl);

      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error(`Webhook URL scheme not allowed: ${parsed.protocol}`);
      }

      // WHATWG URL keeps the brackets on IPv6 literals (http://[::1]/)
      const hostname =
        parsed.hostname.startsWith('[') && parsed.hostname.endsWith(']')
          ? parsed.hostname.slice(1, -1)
          : parsed.hostname;

      // An IP literal needs no resolution — validate it directly
      const address = net.isIP(hostname) ? hostname : (await dns.lookup(hostname)).address;

      if (WorkflowExecutionService.isPrivateIp(address)) {
        throw new Error(`Webhook URL resolves to a private/internal IP address: ${address}`);
      }

      const response = await fetch(currentUrl, {
        ...options,
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error('Redirect with no Location header');
        }
        // Resolve relative redirects against the current URL
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      return response;
    }

    throw new Error('Too many redirects');
  }

  /**
   * WEBHOOK step - Call an external webhook.
   *
   * Renders `{{vars}}` in `url`, header values, and `body`. The variable
   * scope is a superset of the SEND_EMAIL scope: id, email, contact data,
   * execution context, and subscribe/unsubscribe/manage URLs — plus a
   * webhook-only `event` namespace exposing the trigger event payload.
   * `method` is intentionally NOT rendered — it must remain a literal
   * HTTP verb.
   */
  private static async executeWebhook(
    _step: WorkflowStep,
    execution: WorkflowExecutionWithRelations,
    _stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    const {url, method, headers, body} = WorkflowStepConfigSchemas.webhook.parse(config);

    // Prepare webhook payload
    const contact = execution.contact;
    const contactData =
      contact.data && typeof contact.data === 'object' && !Array.isArray(contact.data)
        ? (contact.data as Record<string, unknown>)
        : {};
    const executionContext =
      execution.context && typeof execution.context === 'object' && !Array.isArray(execution.context)
        ? (execution.context as Record<string, unknown>)
        : {};
    const context = execution.context || {};

    // Render scope: SEND_EMAIL's scope (id, email, contact data, execution
    // context, subscribe/unsubscribe/manage URLs) plus a webhook-only
    // `event` namespace carrying the trigger event payload. `method` is
    // intentionally NOT rendered — it must remain a literal HTTP verb.
    const variables = {
      id: contact.id,
      email: contact.email,
      ...contactData,
      ...executionContext,
      data: contactData,
      event: context,
      unsubscribeUrl: `${DASHBOARD_URI}/unsubscribe/${contact.id}`,
      subscribeUrl: `${DASHBOARD_URI}/subscribe/${contact.id}`,
      manageUrl: `${DASHBOARD_URI}/manage/${contact.id}`,
    };

    const renderedUrl = this.renderTemplate(url, variables);
    const renderedHeaders = headers
      ? Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, this.renderTemplate(value, variables)]))
      : undefined;
    const renderedBody = body ? this.renderJsonTemplate(body, variables) : undefined;

    const payload = renderedBody || {
      contact: {
        email: contact.email,
        subscribed: contact.subscribed,
        data: contactData,
      },
      workflow: {
        id: execution.workflow.id,
        name: execution.workflow.name,
      },
      execution: {
        id: execution.id,
        startedAt: execution.startedAt,
      },
      event: context, // Include event data that triggered the workflow
    };

    // Make HTTP request
    const response = await WorkflowExecutionService.safeFetch(renderedUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...renderedHeaders,
      },
      body: method !== 'GET' ? JSON.stringify(payload) : undefined,
    });

    const responseData = await response.text();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = responseData;
    }

    return {
      url: renderedUrl,
      method,
      statusCode: response.status,
      success: response.ok,
      response: parsedResponse,
    };
  }

  /**
   * Helper: Recursively render template variables in any JSON-shaped value.
   * Strings are rendered, arrays/objects are walked, and non-string scalars
   * (numbers, booleans, null) are returned untouched.
   */
  private static renderJsonTemplate(value: unknown, variables: Record<string, unknown>): unknown {
    if (typeof value === 'string') {
      return this.renderTemplate(value, variables);
    }
    if (Array.isArray(value)) {
      return value.map(item => this.renderJsonTemplate(item, variables));
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        result[key] = this.renderJsonTemplate(child, variables);
      }
      return result;
    }
    return value;
  }

  /**
   * UPDATE_CONTACT step - Update contact data
   */
  private static async executeUpdateContact(
    _step: WorkflowStep,
    execution: WorkflowExecutionWithRelations,
    _stepExecution: WorkflowStepExecution,
    config: StepConfig,
  ): Promise<StepResult> {
    const {updates, subscriptionAction} = WorkflowStepConfigSchemas.updateContact.parse(config);

    const contact = execution.contact;
    const currentData =
      contact.data && typeof contact.data === 'object' && !Array.isArray(contact.data)
        ? (contact.data as Record<string, unknown>)
        : {};

    const hasDataUpdates = updates && Object.keys(updates).length > 0;
    const newData = hasDataUpdates ? {...currentData, ...updates} : currentData;

    const desiredSubscribed =
      subscriptionAction === 'subscribe' ? true : subscriptionAction === 'unsubscribe' ? false : undefined;
    const subscriptionChanging = desiredSubscribed !== undefined && desiredSubscribed !== contact.subscribed;

    const updateData: Prisma.ContactUpdateInput = {};
    if (hasDataUpdates) {
      updateData.data = toPrismaJson(newData);
    }
    if (subscriptionChanging) {
      updateData.subscribed = desiredSubscribed;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.contact.update({
        where: {id: contact.id},
        data: updateData,
      });
    }

    if (subscriptionChanging) {
      const {EventService} = await import('./EventService.js');
      await EventService.trackEvent(
        execution.workflow.projectId,
        desiredSubscribed ? 'contact.subscribed' : 'contact.unsubscribed',
        contact.id,
      );
    }

    return {
      updated: hasDataUpdates || subscriptionChanging,
      updates,
      newData,
      subscriptionAction,
      subscribed: desiredSubscribed ?? contact.subscribed,
    };
  }

  /**
   * Process next steps based on transitions
   */
  private static async processNextSteps(
    execution: Pick<WorkflowExecution, 'id'>,
    currentStep: WorkflowStepWithTransitions,
    stepResult: StepResult,
  ): Promise<void> {
    const transitions = currentStep.outgoingTransitions || [];

    if (transitions.length === 0) {
      // No more steps, complete the workflow
      await prisma.workflowExecution.update({
        where: {id: execution.id},
        data: {
          status: WorkflowExecutionStatus.COMPLETED,
          completedAt: new Date(),
          currentStepId: null,
        },
      });
      return;
    }

    // WAIT_FOR_EVENT owns a distinct routing dimension. It does not borrow the
    // condition JSON used by CONDITION steps.
    let nextStep = null;

    if (currentStep.type === 'WAIT_FOR_EVENT') {
      const waitOutcome = stepResult.waitOutcome;
      const outcomeTransition = transitions.find(t => t.waitOutcome === waitOutcome);

      if (outcomeTransition) {
        nextStep = outcomeTransition.toStep;
      } else if (transitions.every(t => t.waitOutcome === null)) {
        // Compatibility for rows created before the wait-outcome migration and
        // direct test fixtures: their single transition handled either result.
        nextStep = transitions[0]?.toStep ?? null;
      }
    }

    for (const transition of currentStep.type === 'WAIT_FOR_EVENT' ? [] : transitions) {
      const condition = transition.condition;

      // If no condition, always follow
      if (!condition) {
        nextStep = transition.toStep;
        break;
      }

      // If condition exists, evaluate it
      // For CONDITION steps, check the branch
      if (
        stepResult.branch &&
        typeof condition === 'object' &&
        condition !== null &&
        !Array.isArray(condition) &&
        'branch' in condition &&
        condition.branch === stepResult.branch
      ) {
        nextStep = transition.toStep;
        break;
      }

      // For other conditional logic
      if (this.evaluateTransitionCondition(condition, stepResult, execution)) {
        nextStep = transition.toStep;
        break;
      }
    }

    if (!nextStep) {
      // No valid transition found, complete workflow
      await prisma.workflowExecution.update({
        where: {id: execution.id},
        data: {
          status: WorkflowExecutionStatus.COMPLETED,
          completedAt: new Date(),
          currentStepId: null,
        },
      });
      return;
    }

    // Update current step and continue execution
    await prisma.workflowExecution.update({
      where: {id: execution.id},
      data: {
        currentStepId: nextStep.id,
        status: WorkflowExecutionStatus.RUNNING,
      },
    });

    // Process the next step
    // All steps are processed immediately - DELAY and WAIT_FOR_EVENT will pause the workflow internally
    await this.processStepExecution(execution.id, nextStep.id);
  }

  /**
   * Helper: Render template with variables
   * Uses shared template rendering from @plunk/shared
   */
  private static renderTemplate(template: string, variables: Record<string, unknown>): string {
    return renderTemplate(template, variables);
  }

  /**
   * Helper: Resolve field value from object using dot notation
   */
  private static resolveField(field: string, data: Record<string, unknown>): unknown {
    // Handle legacy "contact.data.X" format by converting to "data.X"
    // The UI historically showed examples like "contact.data.plan" but the field structure
    // has "data" as a top-level key, not nested under "contact"
    let normalizedField = field;
    if (field.startsWith('contact.data.')) {
      normalizedField = field.substring(8); // Remove "contact." prefix, leaving "data.X"
    }

    const parts = normalizedField.split('.');
    let value: unknown = data;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Helper: Evaluate condition
   */
  private static evaluateCondition(actualValue: unknown, operator: string, expectedValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        // equals can match null/undefined if expectedValue is also null/undefined
        return actualValue === expectedValue;
      case 'notEquals':
        // Match SegmentService behavior: only match when field exists and is not equal
        // Missing fields (undefined/null) do NOT match
        if (actualValue === undefined || actualValue === null) {
          return false;
        }
        return actualValue !== expectedValue;
      case 'contains':
        // Return false if the value doesn't exist (undefined/null)
        if (actualValue === undefined || actualValue === null) {
          return false;
        }
        return String(actualValue).includes(String(expectedValue));
      case 'notContains':
        // Match SegmentService behavior: only match when field exists and doesn't contain substring
        // Missing fields (undefined/null) do NOT match
        if (actualValue === undefined || actualValue === null) {
          return false;
        }
        return !String(actualValue).includes(String(expectedValue));
      case 'greaterThan':
        // Numeric comparisons require field to exist
        if (actualValue === undefined || actualValue === null) {
          return false;
        }
        return Number(actualValue) > Number(expectedValue);
      case 'lessThan':
        // Numeric comparisons require field to exist
        if (actualValue === undefined || actualValue === null) {
          return false;
        }
        return Number(actualValue) < Number(expectedValue);
      case 'greaterThanOrEqual':
        // Numeric comparisons require field to exist
        if (actualValue === undefined || actualValue === null) {
          return false;
        }
        return Number(actualValue) >= Number(expectedValue);
      case 'lessThanOrEqual':
        // Numeric comparisons require field to exist
        if (actualValue === undefined || actualValue === null) {
          return false;
        }
        return Number(actualValue) <= Number(expectedValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'notExists':
        return actualValue === undefined || actualValue === null;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Helper: Evaluate transition condition
   */
  private static evaluateTransitionCondition(
    _condition: Prisma.JsonValue,
    _stepResult: StepResult,
    _execution: Pick<WorkflowExecution, 'id'>,
  ): boolean {
    // Implement custom transition condition logic here
    // For now, return false as default
    return false;
  }
}

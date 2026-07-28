import {
  AuthMethod,
  CampaignStatus,
  EmailSourceType,
  EmailStatus,
  Prisma,
  PrismaClient,
  Role,
  TemplateType,
  TrackingMode,
  WorkflowExecutionStatus,
  WorkflowStepType,
  WorkflowTriggerType
} from '@plunk/db';
import {getPrismaClient} from './database';
import bcrypt from 'bcrypt';

/**
 * Factory helpers for creating test data
 * These factories create database records with sensible defaults
 */

let factoryCounter = 0;

function uniqueId() {
  return `${Date.now()}-${factoryCounter++}`;
}

export interface UserFactoryOptions {
  email?: string;
  password?: string;
  type?: AuthMethod;
}

export interface ProjectFactoryOptions {
  name?: string;
  disabled?: boolean;
  tracking?: TrackingMode;
  billingLimitWorkflows?: number | null;
  billingLimitCampaigns?: number | null;
  billingLimitTransactional?: number | null;
}

export interface ContactFactoryOptions {
  projectId: string;
  email?: string;
  data?: Record<string, unknown>;
  subscribed?: boolean;
}

export interface TemplateFactoryOptions {
  projectId: string;
  name?: string;
  subject?: string;
  body?: string;
  from?: string;
  fromName?: string;
  type?: TemplateType;
}

export interface CampaignFactoryOptions {
  projectId: string;
  name?: string;
  subject?: string;
  body?: string;
  from?: string;
  status?: CampaignStatus;
  scheduledFor?: Date | null;
  segmentId?: string | null;
  type?: TemplateType;
}

export interface WorkflowFactoryOptions {
  projectId: string;
  name?: string;
  enabled?: boolean;
  triggerType?: WorkflowTriggerType;
  triggerConfig?: unknown;
  allowReentry?: boolean;
}

export interface WorkflowStepFactoryOptions {
  workflowId: string;
  type?: WorkflowStepType;
  name?: string;
  position?: {x: number; y: number};
  config?: unknown;
  templateId?: string | null;
}

export interface DomainFactoryOptions {
  projectId: string;
  domain?: string;
  verified?: boolean;
  dkimTokens?: unknown;
}

export class TestFactories {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Create a test user
   */
  async createUser(options: UserFactoryOptions = {}) {
    const email = options.email || `user-${uniqueId()}@test.com`;
    const password = options.password || 'password123';
    // Cost factor 4 is the bcrypt minimum — ~100x faster than the production cost of 10.
    // Test users don't need real-world hash strength.
    const hashedPassword = await bcrypt.hash(password, 4);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        type: options.type || AuthMethod.PASSWORD,
      },
    });
  }

  /**
   * Create a test project
   */
  async createProject(options: ProjectFactoryOptions = {}) {
    return this.prisma.project.create({
      data: {
        name: options.name || `Test Project ${uniqueId()}`,
        public: `pk_${uniqueId()}`,
        secret: `sk_${uniqueId()}`,
        disabled: options.disabled || false,
        tracking: options.tracking ?? TrackingMode.ENABLED,
        billingLimitWorkflows: options.billingLimitWorkflows,
        billingLimitCampaigns: options.billingLimitCampaigns,
        billingLimitTransactional: options.billingLimitTransactional,
      },
    });
  }

  /**
   * Create a user with a project
   */
  async createUserWithProject(userOptions: UserFactoryOptions = {}, projectOptions: ProjectFactoryOptions = {}) {
    const user = await this.createUser(userOptions);
    const project = await this.createProject(projectOptions);

    await this.prisma.membership.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: Role.ADMIN,
      },
    });

    return {user, project};
  }

  /**
   * Create a test contact
   */
  async createContact(options: ContactFactoryOptions) {
    return this.prisma.contact.create({
      data: {
        projectId: options.projectId,
        email: options.email || `contact-${uniqueId()}@test.com`,
        data: options.data || {},
        subscribed: options.subscribed ?? true,
      },
    });
  }

  /**
   * Create multiple contacts using bulk insert for better performance and memory efficiency
   */
  async createContacts(projectId: string, count: number, baseOptions: Partial<ContactFactoryOptions> = {}) {
    // Use createMany for bulk insert to avoid memory issues
    const contactsData = Array.from({length: count}, (_, i) => ({
      projectId,
      email: `contact-${i}-${uniqueId()}@test.com`,
      data: baseOptions.data || {},
      subscribed: baseOptions.subscribed ?? true,
    }));

    await this.prisma.contact.createMany({
      data: contactsData,
    });

    // Fetch the created contacts to return them (needed for test assertions)
    // Use a limited query to avoid loading too many at once
    return this.prisma.contact.findMany({
      where: {projectId},
      orderBy: {createdAt: 'desc'},
      take: count,
    });
  }

  /**
   * Create a test template
   */
  async createTemplate(options: TemplateFactoryOptions) {
    return this.prisma.template.create({
      data: {
        projectId: options.projectId,
        name: options.name || `Template ${uniqueId()}`,
        subject: options.subject || 'Test Subject',
        body: options.body || '<p>Hello {{firstName}}, this is a test email.</p>',
        from: options.from || 'test@example.com',
        fromName: options.fromName || 'Test Sender',
        type: options.type || TemplateType.MARKETING,
      },
    });
  }

  /**
   * Create a test campaign
   */
  async createCampaign(options: CampaignFactoryOptions) {
    return this.prisma.campaign.create({
      data: {
        projectId: options.projectId,
        name: options.name || `Campaign ${uniqueId()}`,
        subject: options.subject || 'Test Campaign Subject',
        body: options.body || '<p>Test campaign body</p>',
        from: options.from || 'campaign@example.com',
        status: options.status || CampaignStatus.DRAFT,
        scheduledFor: options.scheduledFor,
        segmentId: options.segmentId,
        type: options.type || TemplateType.MARKETING,
      },
    });
  }

  /**
   * Create a scheduled campaign
   * Supports both old (projectId, scheduledFor, options) and new (options) signatures
   */
  async createScheduledCampaign(
    projectIdOrOptions: string | CampaignFactoryOptions,
    scheduledFor?: Date,
    options?: Partial<CampaignFactoryOptions>,
  ) {
    // Support both calling conventions
    let campaignOptions: CampaignFactoryOptions;

    if (typeof projectIdOrOptions === 'string') {
      // Old signature: createScheduledCampaign(projectId, scheduledFor, options)
      const projectId = projectIdOrOptions;
      campaignOptions = {
        projectId,
        ...options,
        scheduledFor: scheduledFor || new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    } else {
      // New signature: createScheduledCampaign(options)
      campaignOptions = projectIdOrOptions;
      campaignOptions.scheduledFor = campaignOptions.scheduledFor || new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    return this.createCampaign({
      ...campaignOptions,
      status: CampaignStatus.SCHEDULED,
    });
  }

  /**
   * Create an email
   * Supports both old (projectId, contactId, options) and new (options) signatures
   */
  async createEmail(
    projectIdOrOptions:
      | string
      | {
          projectId: string;
          contactId: string;
          subject?: string;
          body?: string;
          from?: string;
          status?: EmailStatus;
          sourceType?: EmailSourceType;
          templateId?: string | null;
          campaignId?: string | null;
          sentAt?: Date | null;
          messageId?: string | null;
          openedAt?: Date | null;
          clickedAt?: Date | null;
          opens?: number;
          clicks?: number;
          error?: string | null;
          trackingOverride?: boolean | null;
        },
    contactId?: string,
    additionalOptions?: Partial<{
      subject?: string;
      body?: string;
      from?: string;
      status?: EmailStatus;
      sourceType?: EmailSourceType;
      templateId?: string | null;
      campaignId?: string | null;
      sentAt?: Date | null;
      messageId?: string | null;
      openedAt?: Date | null;
      clickedAt?: Date | null;
      opens?: number;
      clicks?: number;
      error?: string | null;
      trackingOverride?: boolean | null;
    }>,
  ) {
    // Support both calling conventions
    let options: {
      projectId: string;
      contactId: string;
      subject?: string;
      body?: string;
      from?: string;
      status?: EmailStatus;
      sourceType?: EmailSourceType;
      templateId?: string | null;
      campaignId?: string | null;
      sentAt?: Date | null;
      messageId?: string | null;
      openedAt?: Date | null;
      clickedAt?: Date | null;
      opens?: number;
      clicks?: number;
      error?: string | null;
      trackingOverride?: boolean | null;
    };

    if (typeof projectIdOrOptions === 'string') {
      // Old signature: createEmail(projectId, contactId, options)
      if (!contactId) {
        throw new Error('contactId is required when using old signature');
      }
      options = {
        projectId: projectIdOrOptions,
        contactId,
        ...additionalOptions,
      };
    } else {
      // New signature: createEmail(options)
      options = projectIdOrOptions;
    }

    // Automatically determine sourceType based on context if not provided
    let sourceType = options.sourceType;
    if (!sourceType) {
      if (options.campaignId) {
        sourceType = EmailSourceType.CAMPAIGN;
      } else if (options.templateId) {
        sourceType = EmailSourceType.WORKFLOW;
      } else {
        sourceType = EmailSourceType.TRANSACTIONAL;
      }
    }

    return this.prisma.email.create({
      data: {
        projectId: options.projectId,
        contactId: options.contactId,
        subject: options.subject || 'Test Email',
        body: options.body || '<p>Test email body</p>',
        from: options.from || 'test@example.com',
        status: options.status || EmailStatus.PENDING,
        sourceType,
        templateId: options.templateId,
        campaignId: options.campaignId,
        sentAt: options.sentAt,
        messageId: options.messageId,
        openedAt: options.openedAt,
        clickedAt: options.clickedAt,
        opens: options.opens,
        clicks: options.clicks,
        error: options.error,
        trackingOverride: options.trackingOverride,
      },
    });
  }

  /**
   * Create a workflow with trigger step (matches WorkflowService.create behavior)
   */
  async createWorkflow(options: WorkflowFactoryOptions) {
    return this.prisma.$transaction(async tx => {
      const workflow = await tx.workflow.create({
        data: {
          projectId: options.projectId,
          name: options.name || `Workflow ${uniqueId()}`,
          enabled: options.enabled ?? false,
          triggerType: options.triggerType || WorkflowTriggerType.EVENT,
          triggerConfig: options.triggerConfig || {eventName: 'contact.created'},
          allowReentry: options.allowReentry ?? false,
        },
      });

      // Create trigger step (required for workflow to function)
      await tx.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: WorkflowStepType.TRIGGER,
          name: 'Trigger',
          position: {x: 0, y: 0},
          config: options.triggerConfig || {eventName: 'contact.created'},
        },
      });

      return workflow;
    });
  }

  /**
   * Create a workflow step
   */
  async createWorkflowStep(options: WorkflowStepFactoryOptions) {
    // Build config based on step type
    let config = options.config;
    if (!config) {
      switch (options.type) {
        case WorkflowStepType.SEND_EMAIL:
          config = {templateId: options.templateId || null};
          break;
        case WorkflowStepType.DELAY:
          config = {amount: 24, unit: 'hours'};
          break;
        case WorkflowStepType.WAIT_FOR_EVENT:
          config = {eventName: 'test.event', timeout: 3600};
          break;
        default:
          config = {};
      }
    }

    return this.prisma.workflowStep.create({
      data: {
        workflowId: options.workflowId,
        type: options.type || WorkflowStepType.SEND_EMAIL,
        name: options.name || `Step ${uniqueId()}`,
        position: options.position || {x: 0, y: 0},
        config,
        templateId: options.templateId,
      },
    });
  }

  /**
   * Create a workflow execution
   */
  async createWorkflowExecution(
    workflowId: string,
    contactId: string,
    overrides: {
      status?: WorkflowExecutionStatus;
      context?: Record<string, unknown>;
    } = {},
  ) {
    return this.prisma.workflowExecution.create({
      data: {
        workflowId,
        contactId,
        status: overrides.status || WorkflowExecutionStatus.RUNNING,
        context: overrides.context || {},
      },
    });
  }

  /**
   * Create a complete workflow with steps
   */
  async createWorkflowWithSteps(
    projectId: string,
    steps: Array<{
      type: WorkflowStepType;
      delay?: number;
      timeout?: number;
      templateId?: string;
      config?: unknown;
    }>,
  ) {
    const workflow = await this.createWorkflow({projectId});

    const createdSteps = [];
    for (let i = 0; i < steps.length; i++) {
      const stepData = steps[i];

      // Build config based on provided data or step type
      let config = stepData.config;
      if (!config) {
        switch (stepData.type) {
          case WorkflowStepType.SEND_EMAIL:
            config = {templateId: stepData.templateId || null};
            break;
          case WorkflowStepType.DELAY:
            config = {amount: stepData.delay || 24, unit: 'hours'};
            break;
          case WorkflowStepType.WAIT_FOR_EVENT:
            config = {
              eventName: 'test.event',
              timeout: stepData.timeout || 3600,
            };
            break;
          default:
            config = {};
        }
      }

      const step = await this.createWorkflowStep({
        workflowId: workflow.id,
        type: stepData.type,
        name: `Step ${i + 1}`,
        position: {x: i * 100, y: 0},
        config,
        templateId: stepData.templateId,
      });
      createdSteps.push(step);
    }

    return {workflow, steps: createdSteps};
  }

  /**
   * Create a segment
   * Supports both old format (filters array) and new format (condition object)
   */
  async createSegment(
    projectId: string,
    overrides: {
      name?: string;
      filters?: Array<{field: string; operator: string; value?: unknown; unit?: string}>;
      condition?: {
        logic: 'AND' | 'OR';
        groups: Array<{filters: Array<{field: string; operator: string; value?: unknown; unit?: string}>}>;
      };
      trackMembership?: boolean;
    } = {},
  ) {
    // Convert filters array to condition format if condition not provided
    const condition = overrides.condition || {
      logic: 'AND' as const,
      groups: [{filters: overrides.filters || []}],
    };

    return this.prisma.segment.create({
      data: {
        projectId,
        name: overrides.name || `Segment ${uniqueId()}`,
        condition: condition as unknown as Prisma.InputJsonValue,
        trackMembership: overrides.trackMembership ?? false,
      },
    });
  }

  /**
   * Create an event
   */
  async createEvent(
    projectId: string,
    contactId: string,
    overrides: {
      event?: string;
      data?: Record<string, unknown>;
    } = {},
  ) {
    return this.prisma.event.create({
      data: {
        projectId,
        contactId,
        event: overrides.event || 'test.event',
        data: overrides.data || {},
      },
    });
  }

  /**
   * Create a domain
   */
  async createDomain(options: DomainFactoryOptions) {
    return this.prisma.domain.create({
      data: {
        projectId: options.projectId,
        domain: options.domain || 'example.com',
        verified: options.verified ?? true,
        dkimTokens: options.dkimTokens || null,
      },
    });
  }
}

// Export lazy-initialized singleton instance
let factoriesInstance: TestFactories | null = null;

export const factories = new Proxy({} as TestFactories, {
  get(target, prop) {
    if (!factoriesInstance) {
      factoriesInstance = new TestFactories();
    }
    return factoriesInstance[prop as keyof TestFactories];
  },
});

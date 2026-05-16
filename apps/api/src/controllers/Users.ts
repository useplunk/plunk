import {randomBytes} from 'node:crypto';

import {Controller, Delete, Get, Middleware, Patch, Post, Put} from '@overnightjs/core';
import {BillingLimitSchemas, ProjectSchemas, UtilitySchemas} from '@plunk/shared';
import type {NextFunction, Request, Response} from 'express';

import {DASHBOARD_URI, STRIPE_ENABLED, STRIPE_PRICE_EMAIL_USAGE, STRIPE_PRICE_ONBOARDING} from '../app/constants.js';
import {stripe} from '../app/stripe.js';
import {prisma} from '../database/prisma.js';
import {ErrorCode, HttpException, NotAuthenticated, NotFound} from '../exceptions/index.js';
import {isAuthenticated, requireEmailVerified} from '../middleware/auth.js';
import {BillingLimitService} from '../services/BillingLimitService.js';
import {MembershipService} from '../services/MembershipService.js';
import {NtfyService} from '../services/NtfyService.js';
import {ProjectService} from '../services/ProjectService.js';
import {SecurityService} from '../services/SecurityService.js';
import {UserService} from '../services/UserService.js';
import {CatchAsync} from '../utils/asyncHandler.js';
import signale from 'signale';

@Controller('users')
export class Users {
  @Get('@me')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async me(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    const me = await UserService.id(auth.userId);

    if (!me) {
      throw new NotAuthenticated();
    }

    return res.status(200).json({id: me.id, email: me.email});
  }

  @Get('@me/projects')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async meProjects(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    const projects = await UserService.projects(auth.userId);

    return res.status(200).json(projects);
  }

  @Post('@me/projects')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async createProject(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    // Check if user is a member of any disabled project
    const {hasDisabledProject, disabledProjectNames} = await SecurityService.userHasDisabledProject(auth.userId);
    if (hasDisabledProject) {
      throw new HttpException(
        403,
        `You cannot create new projects at this time. Please contact support for assistance.`,
        ErrorCode.PROJECT_DISABLED,
      );
    }

    const {name} = ProjectSchemas.create.parse(req.body);

    // Generate unique API keys
    const publicKey = `pk_${randomBytes(32).toString('hex')}`;
    const secretKey = `sk_${randomBytes(32).toString('hex')}`;

    // Create the project
    const project = await prisma.project.create({
      data: {
        name,
        public: publicKey,
        secret: secretKey,
        members: {
          create: {
            userId: auth.userId,
            role: 'OWNER',
          },
        },
      },
    });

    // Send notification about project creation
    await NtfyService.notifyProjectCreated(project.name, project.id, auth.userId);

    return res.status(201).json(project);
  }

  @Patch('@me/projects/:id')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async updateProject(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);
    const data = ProjectSchemas.update.parse(req.body);

    // Verify user has admin/owner access to this project
    await MembershipService.requireAdminAccess(auth.userId!, id);

    // Update the project
    const project = await prisma.project.update({
      where: {id},
      data,
    });

    await ProjectService.invalidate(id, [{public: project.public, secret: project.secret}]);

    return res.status(200).json(project);
  }

  @Post('@me/projects/:id/regenerate-keys')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async regenerateProjectKeys(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    // Verify user has admin/owner access to this project
    await MembershipService.requireAdminAccess(auth.userId!, id);

    // Capture the existing keys so we can drop them from cache after rotation
    const previousProject = await prisma.project.findUnique({
      where: {id},
      select: {public: true, secret: true},
    });

    // Generate new unique API keys
    const publicKey = `pk_${randomBytes(32).toString('hex')}`;
    const secretKey = `sk_${randomBytes(32).toString('hex')}`;

    // Update the project with new keys
    const project = await prisma.project.update({
      where: {id},
      data: {
        public: publicKey,
        secret: secretKey,
      },
      select: {
        id: true,
        name: true,
        public: true,
        secret: true,
        createdAt: true,
        updatedAt: true,
        disabled: true,
        customer: true,
        subscription: true,
      },
    });

    // Invalidate cached lookups for both old and new keys so revoked keys
    // stop authorizing requests immediately instead of after cache TTL.
    await ProjectService.invalidate(id, [
      {public: previousProject?.public, secret: previousProject?.secret},
      {public: project.public, secret: project.secret},
    ]);

    // Send notification about API key regeneration
    await NtfyService.notifyApiKeysRegenerated(project.name!, id!, auth.userId!);

    return res.status(200).json(project);
  }

  @Post('@me/projects/:id/checkout')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async createCheckoutSession(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);
    const {currency} = req.query;

    // Check if billing is enabled
    if (!STRIPE_ENABLED || !stripe) {
      return res.status(404).json({error: 'Billing is not enabled'});
    }

    // Verify user has admin/owner access to this project
    await MembershipService.requireAdminAccess(auth.userId!, id);

    // Get the project
    const project = await prisma.project.findUnique({
      where: {id},
    });

    if (!project) {
      throw new NotFound('Project not found');
    }

    // If project already has a subscription, return error
    if (project.subscription) {
      return res.status(400).json({error: 'Project already has a subscription'});
    }

    // Build line items for subscription
    const lineItems = [];

    // Add one-time onboarding fee if configured
    if (STRIPE_PRICE_ONBOARDING) {
      lineItems.push({price: STRIPE_PRICE_ONBOARDING, quantity: 1});
    }

    // Add metered pricing for pay-per-email (required)
    if (!STRIPE_PRICE_EMAIL_USAGE) {
      return res.status(500).json({error: 'Usage-based pricing not configured. Set STRIPE_PRICE_EMAIL_USAGE.'});
    }
    lineItems.push({price: STRIPE_PRICE_EMAIL_USAGE}); // No quantity for metered items

    // Calculate billing cycle anchor to first day of next month
    // This ensures all subscriptions renew on the 1st of each month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const billingCycleAnchor = Math.floor(nextMonth.getTime() / 1000);

    // Validate currency if provided
    let checkoutCurrency: string | undefined;
    if (currency && typeof currency === 'string') {
      const validCurrencies = ['usd', 'eur', 'gbp'];
      if (validCurrencies.includes(currency.toLowerCase())) {
        checkoutCurrency = currency.toLowerCase();
      } else {
        return res.status(400).json({error: 'Invalid currency. Supported: USD, EUR, GBP'});
      }
    }

    // Create checkout session
    // Note: proration_behavior cannot be set when one-time prices are included
    // The billing_cycle_anchor alone ensures the subscription is anchored to the 1st of the month
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: project.customer ?? undefined, // Use existing customer if available
      client_reference_id: project.id, // Store project ID for webhook
      line_items: lineItems,
      ...(checkoutCurrency && {currency: checkoutCurrency}),
      custom_fields: [
        {
          key: 'promo_code',
          label: {type: 'custom', custom: 'Promo code'},
          type: 'text',
          optional: true,
        },
      ],
      subscription_data: {
        billing_cycle_anchor: billingCycleAnchor,
      },
      success_url: `${DASHBOARD_URI}/settings?tab=billing&success=true`,
      cancel_url: `${DASHBOARD_URI}/settings?tab=billing&canceled=true`,
    });

    return res.status(200).json({url: session.url});
  }

  @Post('@me/projects/:id/billing-portal')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async createBillingPortalSession(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    // Check if billing is enabled
    if (!STRIPE_ENABLED || !stripe) {
      return res.status(404).json({error: 'Billing is not enabled'});
    }

    // Verify user has admin/owner access to this project
    await MembershipService.requireAdminAccess(auth.userId!, id);

    // Get the project
    const project = await prisma.project.findUnique({
      where: {id},
    });

    if (!project) {
      throw new NotFound('Project not found');
    }

    // Project must have a customer ID to access billing portal
    if (!project.customer) {
      return res.status(400).json({error: 'No customer found for this project'});
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: project.customer,
      return_url: `${DASHBOARD_URI}/settings?tab=billing`,
    });

    return res.status(200).json({url: session.url});
  }

  @Get('@me/projects/:id/billing-limits')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async getBillingLimits(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    if (!id) {
      throw new NotFound('Project ID is required');
    }

    // Verify user has access to this project
    await MembershipService.requireAccess(auth.userId!, id);

    // Get billing limits and usage
    const limitsAndUsage = await BillingLimitService.getLimitsAndUsage(id);

    return res.status(200).json(limitsAndUsage);
  }

  @Put('@me/projects/:id/billing-limits')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async updateBillingLimits(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    if (!id) {
      throw new NotFound('Project ID is required');
    }

    const data = BillingLimitSchemas.update.parse(req.body);

    // Verify user has admin/owner access to this project
    await MembershipService.requireAdminAccess(auth.userId!, id);

    // Get the project with current limits
    const project = await prisma.project.findUnique({
      where: {id},
      select: {
        subscription: true,
        billingLimitWorkflows: true,
        billingLimitCampaigns: true,
        billingLimitTransactional: true,
        billingLimitInbound: true,
      },
    });

    if (!project) {
      throw new NotFound('Project not found');
    }

    // Require active subscription to set billing limits
    if (!project.subscription) {
      return res.status(400).json({error: 'An active subscription is required to set billing limits'});
    }

    // Update billing limits
    await prisma.project.update({
      where: {id},
      data: {
        billingLimitWorkflows: data.workflows,
        billingLimitCampaigns: data.campaigns,
        billingLimitTransactional: data.transactional,
        billingLimitInbound: data.inbound,
      },
    });

    // Clear notification cache keys for limits that changed
    // This allows new warning/limit emails to be sent when the new limits are reached
    await BillingLimitService.clearNotificationCacheForChangedLimits(
      id,
      {
        workflows: project.billingLimitWorkflows,
        campaigns: project.billingLimitCampaigns,
        transactional: project.billingLimitTransactional,
        inbound: project.billingLimitInbound,
      },
      data,
    );

    const limitsAndUsage = await BillingLimitService.getLimitsAndUsage(id);

    return res.status(200).json(limitsAndUsage);
  }

  @Get('@me/projects/:id/billing-consumption')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async getBillingConsumption(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    // Check if billing is enabled
    if (!STRIPE_ENABLED || !stripe) {
      return res.status(404).json({error: 'Billing is not enabled'});
    }

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    if (!id) {
      throw new NotFound('Project ID is required');
    }

    // Verify user has access to this project
    await MembershipService.requireAccess(auth.userId!, id);

    const project = await prisma.project.findUnique({
      where: {id},
      select: {
        customer: true,
        subscription: true,
      },
    });

    if (!project) {
      throw new NotFound('Project not found');
    }

    if (!project.customer || !project.subscription) {
      return res.status(400).json({error: 'No active subscription found'});
    }

    // Get the current billing period (start of current month to now)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get upcoming invoice to see costs and usage
    let upcomingInvoice = null;
    let totalUsage = 0;

    try {
      upcomingInvoice = (await stripe.invoices.createPreview({
        customer: project.customer,
        subscription: project.subscription,
      })) as any;

      // Extract metered usage from invoice line items
      if (upcomingInvoice && upcomingInvoice.lines && upcomingInvoice.lines.data) {
        // Since we only have one meter (email usage), we can safely use the first line item
        // The invoice preview doesn't expand the price object, so we can't match by price ID
        const meteredLine = upcomingInvoice.lines.data[0];

        if (meteredLine && meteredLine.quantity) {
          totalUsage = meteredLine.quantity;
        }
      }
    } catch (error) {
      // No upcoming invoice yet or error retrieving it
      // This is normal for new subscriptions or if there's no usage yet
      signale.error('[BILLING] Error retrieving upcoming invoice:', error);
    }

    // Get customer to retrieve balance (credits)
    const customer = await stripe.customers.retrieve(project.customer);
    let credits = null;

    if (!customer.deleted) {
      // Stripe stores balance in cents as a negative number (credit) or positive (debit)
      // A negative balance means the customer has credits
      const balance = customer.balance || 0;
      const hasCredits = balance < 0;
      const creditAmount = hasCredits ? Math.abs(balance) : 0;

      credits = {
        balance,
        hasCredits,
        creditAmount,
        currency: customer.currency || 'usd',
      };
    }

    const responseData = {
      period: {
        start: startOfMonth.toISOString(),
        end: now.toISOString(),
      },
      usage: {
        total: totalUsage,
        records: [], // Deprecated in favor of invoice line items
      },
      credits,
      upcomingInvoice: upcomingInvoice
        ? {
            amountDue: upcomingInvoice.amount_due,
            currency: upcomingInvoice.currency,
            periodStart: upcomingInvoice.period_start
              ? new Date(upcomingInvoice.period_start * 1000).toISOString()
              : startOfMonth.toISOString(),
            periodEnd: upcomingInvoice.period_end
              ? new Date(upcomingInvoice.period_end * 1000).toISOString()
              : now.toISOString(),
            subtotal: upcomingInvoice.subtotal ?? 0,
            total: upcomingInvoice.total ?? 0,
          }
        : null,
    };

    return res.status(200).json(responseData);
  }

  @Get('@me/projects/:id/billing-invoices')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async getBillingInvoices(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    // Check if billing is enabled
    if (!STRIPE_ENABLED || !stripe) {
      return res.status(404).json({error: 'Billing is not enabled'});
    }

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    if (!id) {
      throw new NotFound('Project ID is required');
    }

    // Verify user has access to this project
    await MembershipService.requireAccess(auth.userId!, id);

    // Get the project
    const project = await prisma.project.findUnique({
      where: {id},
      select: {
        customer: true,
      },
    });

    if (!project) {
      throw new NotFound('Project not found');
    }

    if (!project.customer) {
      return res.status(400).json({error: 'No customer found'});
    }

    // Get all invoices for this customer
    const invoices = await stripe.invoices.list({
      customer: project.customer,
      limit: 100,
    });

    // Check for unpaid invoices
    const unpaidInvoices = invoices.data.filter(
      invoice => invoice.status === 'open' || invoice.status === 'uncollectible',
    );

    return res.status(200).json({
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        created: new Date(invoice.created * 1000).toISOString(),
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        subtotal: invoice.subtotal,
        total: invoice.total,
        paid: invoice.status === 'paid',
      })),
      hasUnpaidInvoices: unpaidInvoices.length > 0,
      unpaidInvoices: unpaidInvoices.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      })),
    });
  }

  @Get('@me/projects/:id/security')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async getSecurityHealth(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    if (!id) {
      throw new NotFound('Project ID is required');
    }

    // Verify user has access to this project
    await MembershipService.requireAccess(auth.userId!, id);

    // Get security metrics
    const metrics = await SecurityService.getProjectSecurityMetrics(id);

    return res.status(200).json(metrics);
  }

  @Post('@me/projects/:id/reset')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async resetProject(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    if (!id) {
      throw new NotFound('Project ID is required');
    }

    // Verify user has admin/owner access to this project
    await MembershipService.requireAdminAccess(auth.userId!, id);

    // Check if project is disabled - block reset operation
    const isDisabled = await SecurityService.isProjectDisabled(id);
    if (isDisabled) {
      throw new HttpException(
        403,
        'This project has been disabled. Please contact support for assistance.',
        ErrorCode.PROJECT_DISABLED,
      );
    }

    // Delete all project data in a transaction
    await prisma.$transaction(async tx => {
      // Delete all emails
      await tx.email.deleteMany({
        where: {projectId: id},
      });

      // Delete all events
      await tx.event.deleteMany({
        where: {projectId: id},
      });

      // Delete all campaigns
      await tx.campaign.deleteMany({
        where: {projectId: id},
      });

      // Delete all workflows
      await tx.workflow.deleteMany({
        where: {projectId: id},
      });

      // Delete all segments
      await tx.segment.deleteMany({
        where: {projectId: id},
      });

      // Delete all contacts
      await tx.contact.deleteMany({
        where: {projectId: id},
      });

      // Delete all templates
      await tx.template.deleteMany({
        where: {projectId: id},
      });

      // Delete all API requests
      await tx.apiRequest.deleteMany({
        where: {projectId: id},
      });
    });

    return res.status(200).json({success: true, message: 'Project reset successfully'});
  }

  @Delete('@me/projects/:id')
  @Middleware([isAuthenticated, requireEmailVerified])
  @CatchAsync
  public async deleteProject(req: Request, res: Response, _next: NextFunction) {
    const auth = res.locals.auth;
    const {id} = UtilitySchemas.id.parse(req.params);

    if (!auth.userId) {
      throw new NotAuthenticated();
    }

    if (!id) {
      throw new NotFound('Project ID is required');
    }

    // Verify user has owner or admin access to this project
    await MembershipService.requireAdminAccess(auth.userId!, id);

    // Get project to check for active subscription and disabled status
    const project = await prisma.project.findUnique({
      where: {id},
      select: {
        name: true,
        subscription: true,
        customer: true,
        disabled: true,
      },
    });

    if (!project) {
      throw new NotFound('Project not found');
    }

    // Check if project is disabled - block delete operation
    if (project.disabled) {
      throw new HttpException(
        403,
        'This project has been disabled. Please contact support for assistance.',
        ErrorCode.PROJECT_DISABLED,
      );
    }

    // If project has an active subscription, cancel it first
    if (STRIPE_ENABLED && stripe && project.subscription) {
      try {
        await stripe.subscriptions.cancel(project.subscription);
      } catch (error) {
        // Log but don't fail if subscription cancellation fails
        signale.error('Failed to cancel subscription:', error);
      }
    }

    // Delete the project (cascading deletes will handle related data)
    await prisma.project.delete({
      where: {id},
    });

    // Send notification about project deletion
    await NtfyService.notifyProjectDeleted(project.name, id, auth.userId);

    return res.status(200).json({success: true, message: 'Project deleted successfully'});
  }
}

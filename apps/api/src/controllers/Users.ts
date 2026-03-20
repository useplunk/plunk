import {randomBytes} from 'node:crypto';

import {Controller, Delete, Get, Middleware, Patch, Post} from '@overnightjs/core';
import {ProjectSchemas, UtilitySchemas} from '@plunk/shared';
import type {NextFunction, Request, Response} from 'express';

import {prisma} from '../database/prisma.js';
import {ErrorCode, HttpException, NotAuthenticated, NotFound} from '../exceptions/index.js';
import {isAuthenticated, requireEmailVerified} from '../middleware/auth.js';
import {MembershipService} from '../services/MembershipService.js';
import {NtfyService} from '../services/NtfyService.js';
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
        `You cannot create new projects while you are a member of disabled projects: ${disabledProjectNames.join(', ')}. Please contact support to resolve security violations.`,
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

    // Send notification about API key regeneration
    await NtfyService.notifyApiKeysRegenerated(project.name!, id!, auth.userId!);

    return res.status(200).json(project);
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
        'Cannot reset a disabled project. Please contact support to resolve security violations before making changes.',
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
        'Cannot delete a disabled project. Please contact support to resolve security violations.',
        ErrorCode.PROJECT_DISABLED,
      );
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

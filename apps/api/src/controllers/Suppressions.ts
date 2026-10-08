import {Controller, Get, Middleware, Post, Put} from '@overnightjs/core';
import {EmailStatus} from '@plunk/db';
import type {Request, Response} from 'express';
import {z} from 'zod';

import {prisma} from '../database/prisma.js';
import {HttpException} from '../exceptions/index.js';
import {requireAuth, requireEmailVerified} from '../middleware/auth.js';
import {RecipientSuppressionService, suppressionRuleSchema} from '../services/RecipientSuppressionService.js';
import {CatchAsync} from '../utils/asyncHandler.js';

@Controller('suppressions')
export class Suppressions {
  @Get('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async list(_req: Request, res: Response) {
    return res.json(
      await prisma.recipientSuppressionRule.findMany({
        where: {projectId: res.locals.auth.projectId},
        orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
      }),
    );
  }

  @Post('')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async create(req: Request, res: Response) {
    const parsed = suppressionRuleSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpException(400, parsed.error.issues[0]?.message || 'Invalid rule');
    const data = parsed.data;
    const projectId = res.locals.auth.projectId;
    // Lock only this project to make the rule cap safe under concurrent creates.
    const rule = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId} FOR UPDATE`;
      if ((await tx.recipientSuppressionRule.count({where: {projectId}})) >= 100)
        throw new HttpException(400, 'Maximum 100 suppression rules per project');
      return tx.recipientSuppressionRule.create({data: {...data, projectId}});
    });
    return res.status(201).json(rule);
  }

  @Put(':id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async update(req: Request, res: Response) {
    const parsed = suppressionRuleSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpException(400, parsed.error.issues[0]?.message || 'Invalid rule');
    const data = parsed.data;
    const result = await prisma.recipientSuppressionRule.updateMany({
      where: {id: String(req.params.id), projectId: res.locals.auth.projectId},
      data,
    });
    if (!result.count) throw new HttpException(404, 'Suppression rule not found');
    return res.json({success: true});
  }

  @Post('preview')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async preview(req: Request, res: Response) {
    const {address} = z.object({address: z.string().email().max(254)}).parse(req.body);
    const match = await RecipientSuppressionService.match(res.locals.auth.projectId, address);
    return res.json({suppressed: !!match, match: match || null});
  }

  @Get('emails')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async emails(req: Request, res: Response) {
    const {cursor, limit} = z
      .object({cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(20)})
      .parse(req.query);
    const position = cursor
      ? await prisma.email.findFirst({
          where: {id: cursor, projectId: res.locals.auth.projectId, status: EmailStatus.SUPPRESSED},
          select: {id: true, createdAt: true},
        })
      : null;
    if (cursor && !position) throw new HttpException(400, 'Invalid capture cursor');
    const emails = await prisma.email.findMany({
      where: {
        projectId: res.locals.auth.projectId,
        status: EmailStatus.SUPPRESSED,
        ...(position
          ? {OR: [{createdAt: {lt: position.createdAt}}, {createdAt: position.createdAt, id: {lt: position.id}}]}
          : {}),
      },
      orderBy: [{createdAt: 'desc'}, {id: 'desc'}],
      take: limit + 1,
      select: {
        id: true,
        createdAt: true,
        recipientAddress: true,
        subject: true,
        renderedSubject: true,
        suppression: true,
        status: true,
      },
    });
    const hasMore = emails.length > limit;
    if (hasMore) emails.pop();
    return res.json({emails, nextCursor: hasMore ? emails[emails.length - 1]?.id : null});
  }

  @Get('emails/:id')
  @Middleware([requireAuth, requireEmailVerified])
  @CatchAsync
  public async email(req: Request, res: Response) {
    const email = await prisma.email.findFirst({
      where: {id: String(req.params.id), projectId: res.locals.auth.projectId, status: EmailStatus.SUPPRESSED},
    });
    if (!email) throw new HttpException(404, 'Captured email not found');
    return res.json(email);
  }
}

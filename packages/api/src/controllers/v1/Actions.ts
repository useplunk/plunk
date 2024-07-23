import {
	Controller,
	Delete,
	Get,
	Middleware,
	Post,
	Put,
} from "@overnightjs/core";
import { ActionSchemas, UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { NotFound } from "../../exceptions";
import {
	type IJwt,
	type ISecret,
	isAuthenticated,
	isValidSecretKey,
} from "../../middleware/auth";
import { ActionService } from "../../services/ActionService";
import { EventService } from "../../services/EventService";
import { MembershipService } from "../../services/MembershipService";
import { ProjectService } from "../../services/ProjectService";
import { TemplateService } from "../../services/TemplateService";
import { Keys } from "../../services/keys";
import { redis } from "../../services/redis";

@Controller("actions")
export class Actions {
	@Get(":id")
	@Middleware([isAuthenticated])
	public async getActionById(req: Request, res: Response) {
		const { id } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const action = await ActionService.id(id);

		if (!action) {
			throw new NotFound("action");
		}

		const isMember = await MembershipService.isMember(action.projectId, userId);

		if (!isMember) {
			throw new NotFound("action");
		}

		return res.status(200).json(action);
	}

	@Get(":id/related")
	@Middleware([isAuthenticated])
	public async getRelatedActionsById(req: Request, res: Response) {
		const { id } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const action = await ActionService.id(id);

		if (!action) {
			throw new NotFound("action");
		}

		const isMember = await MembershipService.isMember(action.projectId, userId);

		if (!isMember) {
			throw new NotFound("action");
		}

		const related = await ActionService.related(id);

		return res.status(200).json(related);
	}

	@Post()
	@Middleware([isValidSecretKey])
	public async createAction(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const {
			name,
			runOnce,
			delay,
			template: templateId,
			events,
			notevents,
		} = ActionSchemas.create.parse(req.body);

		const template = await TemplateService.id(templateId);

		if (!template) {
			throw new NotFound("template");
		}

		const action = await prisma.action.create({
			data: {
				projectId: project.id,
				name,
				runOnce,
				delay,
				templateId: template.id,
			},
		});

		await Promise.all([
			events.map(async (e: string) => {
				const event = await EventService.id(e);

				if (!event) {
					throw new NotFound("event");
				}

				if (event.projectId !== project.id) {
					throw new NotFound("event");
				}

				await prisma.action.update({
					where: { id: action.id },
					data: { events: { connect: { id: event.id } } },
				});
			}),
			notevents.map(async (e: string) => {
				const event = await EventService.id(e);

				if (!event) {
					throw new NotFound("event");
				}

				if (event.projectId !== project.id) {
					throw new NotFound("event");
				}

				await prisma.action.update({
					where: { id: action.id },
					data: { notevents: { connect: { id: event.id } } },
				});
			}),
		]);

		await redis.del(Keys.Action.id(action.id));
		await redis.del(Keys.Project.actions(project.id));

		return res.status(200).json(action);
	}

	@Put()
	@Middleware([isValidSecretKey])
	public async updateAction(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const {
			id,
			template: templateId,
			events,
			notevents,
			name,
			runOnce,
			delay,
		} = ActionSchemas.update.parse(req.body);

		let action = await ActionService.id(id);

		if (!action || action.projectId !== project.id) {
			throw new NotFound("action");
		}

		const template = await TemplateService.id(templateId);

		if (!template || template.projectId !== project.id) {
			throw new NotFound("template");
		}

		const actionEvents = await prisma.action.findUnique({
			where: { id },
			include: { events: true, notevents: true },
		});

		action = await prisma.action.update({
			where: { id },
			data: {
				name,
				runOnce,
				delay,
				templateId,
				events: { disconnect: actionEvents?.events.map((e) => ({ id: e.id })) },
				notevents: {
					disconnect: actionEvents?.notevents.map((e) => ({ id: e.id })),
				},
			},
			include: {
				events: true,
				notevents: true,
				triggers: true,
				emails: true,
				template: true,
			},
		});

		await Promise.all([
			events.map(async (e: string) => {
				const event = await EventService.id(e);

				if (!event || event.projectId !== project.id) {
					throw new NotFound("event");
				}

				await prisma.action.update({
					where: { id },
					data: { events: { connect: { id: event.id } } },
				});
			}),
			notevents.map(async (e: string) => {
				const event = await EventService.id(e);

				if (!event || event.projectId !== project.id) {
					throw new NotFound("event");
				}

				await prisma.action.update({
					where: { id },
					data: { notevents: { connect: { id: event.id } } },
				});
			}),
		]);

		await redis.del(Keys.Action.id(action.id));
		await redis.del(Keys.Project.actions(project.id));

		return res.status(200).json(action);
	}

	@Delete()
	@Middleware([isValidSecretKey])
	public async deleteAction(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id } = UtilitySchemas.id.parse(req.body);

		const action = await ActionService.id(id);

		if (!action || action.projectId !== project.id) {
			throw new NotFound("action");
		}

		await prisma.action.delete({ where: { id } });

		await redis.del(Keys.Action.id(action.id));
		await redis.del(Keys.Project.actions(project.id));

		return res.status(200).json(action);
	}
}

import { randomBytes } from "node:crypto";
import {
	Controller,
	Delete,
	Get,
	Middleware,
	Post,
	Put,
} from "@overnightjs/core";
import { TemplateSchemas, UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { NotAllowed, NotFound } from "../../exceptions";
import {
	type IJwt,
	type ISecret,
	isAuthenticated,
	isValidSecretKey,
} from "../../middleware/auth";
import { MembershipService } from "../../services/MembershipService";
import { ProjectService } from "../../services/ProjectService";
import { TemplateService } from "../../services/TemplateService";
import { Keys } from "../../services/keys";
import { redis } from "../../services/redis";

@Controller("templates")
export class Templates {
	@Get(":id")
	@Middleware([isAuthenticated])
	public async getTemplateById(req: Request, res: Response) {
		const { id } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const template = await TemplateService.id(id);

		if (!template) {
			throw new NotFound("template");
		}

		const isMember = await MembershipService.isMember(
			template.projectId,
			userId,
		);

		if (!isMember) {
			throw new NotFound("template");
		}

		return res.status(200).json(template);
	}

	@Post("duplicate")
	@Middleware([isValidSecretKey])
	public async duplicateTemplate(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id } = UtilitySchemas.id.parse(req.body);

		const template = await TemplateService.id(id);

		if (!template || template.projectId !== project.id) {
			throw new NotFound("template");
		}

		const duplicatedTemplate = await prisma.template.create({
			data: {
				projectId: project.id,
				subject: template.subject,
				body: template.body,
				type: template.type,
				style: template.style,
			},
		});

		await prisma.event.createMany({
			data: [
				{
					projectId: project.id,
					name: `${duplicatedTemplate.subject
						.toLowerCase()
						.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
						.replace(/ /g, "-")}-template-delivered`,
					templateId: template.id,
				},
				{
					projectId: project.id,
					name: `${duplicatedTemplate.subject
						.toLowerCase()
						.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
						.replace(/ /g, "-")}-template-opened`,
					templateId: template.id,
				},
			],
		});

		await redis.del(Keys.Project.templates(project.id));
		await redis.del(Keys.Template.id(template.id));

		return res.status(200).json(template);
	}

	@Post()
	@Middleware([isValidSecretKey])
	public async createTemplate(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { subject, body, type, style } = TemplateSchemas.create.parse(
			req.body,
		);

		const template = await prisma.template.create({
			data: {
				projectId: project.id,
				subject,
				body,
				type,
				style,
			},
		});

		await prisma.event.createMany({
			data: [
				{
					projectId: project.id,
					name: `${subject
						.toLowerCase()
						.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
						.replace(/ /g, "-")}-template-delivered`,
					templateId: template.id,
				},
				{
					projectId: project.id,
					name: `${subject
						.toLowerCase()
						.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
						.replace(/ /g, "-")}-template-opened`,
					templateId: template.id,
				},
			],
		});

		await redis.del(Keys.Project.templates(project.id));
		await redis.del(Keys.Template.id(template.id));

		return res.status(200).json(template);
	}

	@Put()
	@Middleware([isValidSecretKey])
	public async updateTemplate(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id, subject, body, type, style } = TemplateSchemas.update.parse(
			req.body,
		);

		let template = await TemplateService.id(id);

		if (!template || template.projectId !== project.id) {
			throw new NotFound("template");
		}

		template = await prisma.template.update({
			where: { id },
			data: { subject, body, type, style },
			include: {
				actions: true,
			},
		});

		const events = await prisma.event.findMany({
			where: { templateId: template.id },
		});

		await Promise.all(
			events.map(async (e) => {
				await prisma.event.update({
					where: { id: e.id },
					data: {
						name: e.name.includes("delivered")
							? `${subject
									.toLowerCase()
									.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
									.replace(/ /g, "-")}-template-delivered`
							: `${subject
									.toLowerCase()
									.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
									.replace(/ /g, "-")}-template-opened`,
					},
				});
			}),
		);

		await redis.del(Keys.Project.templates(project.id));
		await redis.del(Keys.Template.id(template.id));

		return res.status(200).json(template);
	}

	@Delete()
	@Middleware([isValidSecretKey])
	public async deleteTemplate(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id } = UtilitySchemas.id.parse(req.body);

		const template = await TemplateService.id(id);

		if (!template || template.projectId !== project.id) {
			throw new NotFound("template");
		}

		const actions = await TemplateService.actions(id);

		if (actions && actions.length > 0) {
			throw new NotAllowed(
				"This template is being used by an action. Unlink the action before deleting the template.",
			);
		}

		await prisma.template.delete({ where: { id } });

		await redis.del(Keys.Project.templates(project.id));
		await redis.del(Keys.Template.id(template.id));

		return res.status(200).json(template);
	}
}

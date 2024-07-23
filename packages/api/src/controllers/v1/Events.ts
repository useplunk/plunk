import { Controller, Delete, Middleware } from "@overnightjs/core";
import { UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { NotFound } from "../../exceptions";
import { type ISecret, isValidSecretKey } from "../../middleware/auth";
import { EventService } from "../../services/EventService";
import { ProjectService } from "../../services/ProjectService";
import { Keys } from "../../services/keys";
import { redis } from "../../services/redis";

@Controller("events")
export class Events {
	@Delete()
	@Middleware([isValidSecretKey])
	public async deleteEvent(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id } = UtilitySchemas.id.parse(req.body);

		const event = await EventService.id(id);

		if (!event || event.projectId !== project.id) {
			throw new NotFound("event");
		}

		await prisma.event.delete({ where: { id } });

		await redis.del(Keys.Event.id(id));

		return res.status(200).json(event);
	}
}

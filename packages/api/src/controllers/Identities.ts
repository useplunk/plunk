import { Controller, Get, Middleware, Post } from "@overnightjs/core";
import { IdentitySchemas, UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import signale from "signale";
import { prisma } from "../database/prisma";
import { NotFound } from "../exceptions";
import { type IJwt, isAuthenticated } from "../middleware/auth";
import { ProjectService } from "../services/ProjectService";
import { Keys } from "../services/keys";
import { redis } from "../services/redis";
import {
	getIdentities,
	getIdentityVerificationAttributes,
	ses,
	verifyIdentity,
} from "../util/ses";

@Controller("identities")
export class Identities {
	@Get("id/:id")
	@Middleware([isAuthenticated])
	public async getVerification(req: Request, res: Response) {
		const { id } = UtilitySchemas.id.parse(req.params);

		const project = await ProjectService.id(id);

		if (!project) {
			throw new NotFound("project");
		}

		if (!project.email) {
			return res.status(200).json({ success: false });
		}

		const attributes = await getIdentityVerificationAttributes(project.email);

		if (attributes.status === "Success" && !project.verified) {
			await prisma.project.update({ where: { id }, data: { verified: true } });

			await redis.del(Keys.Project.id(project.id));
			await redis.del(Keys.Project.secret(project.secret));
			await redis.del(Keys.Project.public(project.public));
		}

		return res.status(200).json({ tokens: attributes.tokens });
	}

	@Middleware([isAuthenticated])
	@Post("create")
	public async addIdentity(req: Request, res: Response) {
		const { id, email } = IdentitySchemas.create.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(id);

		if (!project) {
			throw new NotFound("project");
		}

		const existingProject = await prisma.project.findFirst({
			where: { email: { endsWith: email.split("@")[1] } },
		});

		if (existingProject) {
			throw new Error("Domain already attached to another project");
		}

		const tokens = await verifyIdentity(email);

		await prisma.project.update({
			where: { id },
			data: { email, verified: false },
		});

		await redis.del(Keys.User.projects(userId));
		await redis.del(Keys.Project.id(project.id));

		return res.status(200).json({ success: true, tokens });
	}

	@Middleware([isAuthenticated])
	@Post("reset")
	public async resetIdentity(req: Request, res: Response) {
		const { id } = UtilitySchemas.id.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(id);

		if (!project) {
			throw new NotFound("project");
		}

		await prisma.project.update({
			where: { id },
			data: { email: null, verified: false },
		});

		await redis.del(Keys.User.projects(userId));
		await redis.del(Keys.Project.id(project.id));

		return res.status(200).json({ success: true });
	}

	@Post("update")
	public async updateIdentities(req: Request, res: Response) {
		const count = await prisma.project.count({
			where: { email: { not: null } },
		});

		for (let i = 0; i < count; i += 99) {
			const dbIdentities = await prisma.project.findMany({
				where: { email: { not: null } },
				select: { id: true, email: true },
				skip: i,
				take: 99,
			});

			const awsIdentities = await getIdentities(
				dbIdentities.map((i) => i.email as string),
			);

			for (const identity of awsIdentities) {
				const projectId = dbIdentities.find((i) =>
					i.email?.endsWith(identity.email),
				);

				const project = await ProjectService.id(projectId?.id as string);

				if (identity.status === "Failed") {
					signale.info(`Restarting verification for ${identity.email}`);
					try {
						void verifyIdentity(identity.email);
					} catch (e) {
						// @ts-ignore
						if (e.Code === "Throttling") {
							signale.warn("Throttling detected, waiting 5 seconds");
							await new Promise((r) => setTimeout(r, 5000));
						}
					}
				}

				await prisma.project.update({
					where: { id: projectId?.id as string },
					data: { verified: identity.status === "Success" },
				});

				if (project && !project.verified && identity.status === "Success") {
					signale.success(`Successfully verified ${identity.email}`);
					void ses.setIdentityFeedbackForwardingEnabled({
						Identity: identity.email,
						ForwardingEnabled: false,
					});

					await redis.del(Keys.Project.id(project.id));
					await redis.del(Keys.Project.secret(project.secret));
					await redis.del(Keys.Project.public(project.public));
				}

				if (project?.verified && identity.status !== "Success") {
					await redis.del(Keys.Project.id(project.id));
					await redis.del(Keys.Project.secret(project.secret));
					await redis.del(Keys.Project.public(project.public));
				}
			}
		}

		return res.status(200).json({ success: true });
	}
}

import { Controller, Delete, Get, Middleware, Post, Put } from "@overnightjs/core";
import { IdentitySchemas, ProjectSchemas, UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import z from "zod";
import { prisma } from "../database/prisma";
import { NotAllowed, NotAuthenticated, NotFound } from "../exceptions";
import { type IJwt, isAuthenticated } from "../middleware/auth";
import { MembershipService } from "../services/MembershipService";
import { ProjectService } from "../services/ProjectService";
import { UserService } from "../services/UserService";
import { Keys } from "../services/keys";
import { redis } from "../services/redis";
import { generateToken } from "../util/tokens";

@Controller("projects")
export class Projects {
	@Get("id/:id")
	@Middleware([isAuthenticated])
	public async getProjectByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		return res.json(project);
	}

	@Get("id/:id/memberships")
	@Middleware([isAuthenticated])
	public async getProjectMembershipsByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const memberships = await ProjectService.memberships(projectId);

		return res.status(200).json(memberships);
	}

	@Get("id/:id/usage")
	@Middleware([isAuthenticated])
	public async getProjectUsageByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const usage = await ProjectService.usage(projectId);

		return res.status(200).json(usage);
	}

	@Get("id/:id/events")
	@Middleware([isAuthenticated])
	public async getProjectEventsByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { triggers } = z
			.object({
				triggers: z
					.boolean()
					.optional()
					.default(true)
					.or(z.string().transform((str) => str.toLowerCase() === "true")),
			})
			.parse(req.query);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const events = await ProjectService.events(projectId, triggers);

		return res.status(200).json(events);
	}

	@Get("id/:id/actions")
	@Middleware([isAuthenticated])
	public async getProjectActionsByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const actions = await ProjectService.actions(projectId);

		return res.status(200).json(actions);
	}

	@Get("id/:id/templates")
	@Middleware([isAuthenticated])
	public async getProjectTemplatesByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const templates = await ProjectService.templates(projectId);

		return res.status(200).json(templates);
	}

	@Get("id/:id/contacts/search")
	@Middleware([isAuthenticated])
	public async searchContacts(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const { query } = z.object({ query: z.string().min(1) }).parse(req.query);
		const queryLike = `%${query}%`;
		const contacts = await prisma.$queryRaw`
			SELECT
				c."id",
				c."email",
				c."subscribed",
				GREATEST(c."createdAt", MAX(e."createdAt"), MAX(t."createdAt")) AS "createdAt"
			FROM
				contacts c
			LEFT JOIN triggers t on c.id = t."contactId"
			LEFT JOIN emails e on e.id = e."contactId"
			WHERE (c."projectId" = ${project.id}
				AND(c."email" ILIKE ${queryLike} OR c."data" ILIKE ${queryLike}))
			GROUP BY c.id
			ORDER BY
				"createdAt" DESC;
		`

		return res.status(200).json({
			contacts,
			count: contacts.length,
		});
	}

	@Get("id/:id/contacts/count")
	@Middleware([isAuthenticated])
	public async getProjectContactCountByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const count = await ProjectService.contacts.count(projectId);

		return res.status(200).json(count);
	}

	@Get("id/:id/contacts/metadata")
	@Middleware([isAuthenticated])
	public async getProjectMetadataByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const metadata = await ProjectService.metadata(projectId);

		return res.status(200).json(metadata);
	}

	@Get("id/:id/contacts")
	@Middleware([isAuthenticated])
	public async getProjectContactsByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);
		const { page } = UtilitySchemas.pagination.parse(req.query);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		if (page === 0) {
			const contacts = await ProjectService.contacts.get(projectId);

			return res.status(200).json({ contacts, count: contacts?.length });
		}
		const contacts = await ProjectService.contacts.paginated(projectId, page);
		const count = await ProjectService.contacts.count(projectId);

		return res.status(200).json({ contacts, count });
	}

	@Get("id/:id/feed")
	@Middleware([isAuthenticated])
	public async getProjectFeedByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);
		const { page } = UtilitySchemas.pagination.parse(req.query);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const feed = await ProjectService.feed(projectId, page);

		return res.status(200).json(feed);
	}

	@Get("id/:id/campaigns")
	@Middleware([isAuthenticated])
	public async getProjectCampaignsByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const campaigns = await ProjectService.campaigns(projectId);

		return res.status(200).json(campaigns);
	}

	@Get("id/:id/emails/count")
	@Middleware([isAuthenticated])
	public async getProjectEmailCountByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const count = await ProjectService.emails.count(projectId);

		return res.status(200).json(count);
	}

	@Get("id/:id/emails")
	@Middleware([isAuthenticated])
	public async getProjectEmailsByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const emails = await ProjectService.emails.get(projectId);

		return res.status(200).json(emails);
	}

	@Get("id/:id/analytics")
	@Middleware([isAuthenticated])
	public async getProjectAnalyticsByID(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.params);
		const { method } = ProjectSchemas.analytics.parse(req.query);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		const analytics = await ProjectService.analytics({ id: projectId, method });

		return res.status(200).json(analytics);
	}

	@Post("create")
	@Middleware([isAuthenticated])
	public async createProject(req: Request, res: Response) {
		const { name, url } = ProjectSchemas.create.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		const user = await UserService.id(userId);

		if (!user) {
			throw new NotAuthenticated();
		}

		let secretKey = "";
		let secretIsAvailable = false;

		let publicKey = "";
		let publicIsAvailable = false;

		while (!secretIsAvailable) {
			secretKey = generateToken("secret");

			secretIsAvailable = await ProjectService.secretIsAvailable(secretKey);
		}

		while (!publicIsAvailable) {
			publicKey = generateToken("public");

			publicIsAvailable = await ProjectService.publicIsAvailable(publicKey);
		}

		const project = await prisma.project.create({
			data: {
				name,
				url,
				secret: secretKey,
				public: publicKey,
				memberships: {
					create: [{ userId, role: "OWNER" }],
				},
			},
		});

		await redis.del(Keys.User.projects(userId));
		await redis.del(Keys.Project.secret(project.secret));
		await redis.del(Keys.Project.public(project.public));
		await redis.del(Keys.Project.id(project.id));

		return res.status(200).json({ success: true, data: project });
	}

	@Post("id/:id/regenerate")
	@Middleware([isAuthenticated])
	public async regenerateAPIkey(req: Request, res: Response) {
		const { userId } = res.locals.auth as IJwt;

		let project = await ProjectService.id(req.params.id);

		if (!project) {
			throw new NotFound("project");
		}

		const user = await UserService.id(userId);

		if (!user) {
			throw new NotAuthenticated();
		}

		const isAdmin = await MembershipService.isAdmin(project.id, userId);

		if (!isAdmin) {
			throw new NotAllowed();
		}

		let secretKey = "";
		let secretIsAvailable = false;

		let publicKey = "";
		let publicIsAvailable = false;

		while (!secretIsAvailable) {
			secretKey = generateToken("secret");

			secretIsAvailable = await ProjectService.secretIsAvailable(secretKey);
		}

		while (!publicIsAvailable) {
			publicKey = generateToken("public");

			publicIsAvailable = await ProjectService.secretIsAvailable(publicKey);
		}

		project = await prisma.project.update({
			where: { id: project.id },
			data: { secret: secretKey, public: publicKey },
		});

		await redis.del(Keys.User.projects(userId));

		return res.status(200).json({ success: true, project });
	}

	@Put("update")
	@Middleware([isAuthenticated])
	public async updateProject(req: Request, res: Response) {
		const { id: projectId, name, url } = ProjectSchemas.update.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		let project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isAdmin = await MembershipService.isAdmin(projectId, userId);

		if (!isAdmin) {
			throw new NotAllowed();
		}

		project = await prisma.project.update({
			where: { id: projectId },
			data: {
				name,
				url,
			},
		});

		await redis.del(Keys.Project.id(project.id));
		await redis.del(Keys.Project.secret(project.secret));
		await redis.del(Keys.User.projects(userId));

		return res.status(200).json({ success: true, data: project });
	}

	@Put("update/identity")
	@Middleware([isAuthenticated])
	public async updateIdentity(req: Request, res: Response) {
		const { id: projectId, from } = IdentitySchemas.update.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		let project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isAdmin = await MembershipService.isAdmin(projectId, userId);

		if (!isAdmin) {
			throw new NotAllowed();
		}

		project = await prisma.project.update({
			where: { id: projectId },
			data: {
				from,
			},
		});

		await redis.del(Keys.Project.id(project.id));
		await redis.del(Keys.Project.secret(project.secret));
		await redis.del(Keys.User.projects(userId));

		return res.status(200).json({ success: true, data: project });
	}

	@Delete("delete")
	@Middleware([isAuthenticated])
	public async deleteProject(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const user = await UserService.id(userId);

		if (!user) {
			throw new NotAuthenticated();
		}

		const isOwner = await MembershipService.isOwner(projectId, userId);

		if (!isOwner) {
			throw new NotAllowed();
		}

		await prisma.project.delete({ where: { id: project.id } });

		await redis.del(Keys.User.projects(userId));
		await redis.del(Keys.Project.id(projectId));

		return res.status(200).json({ success: true, data: project });
	}
}

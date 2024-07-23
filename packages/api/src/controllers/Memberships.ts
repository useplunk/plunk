import { Controller, Middleware, Post } from "@overnightjs/core";
import { MembershipSchemas, UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import {
	HttpException,
	NotAllowed,
	NotAuthenticated,
	NotFound,
} from "../exceptions";
import { type IJwt, isAuthenticated } from "../middleware/auth";
import { MembershipService } from "../services/MembershipService";
import { ProjectService } from "../services/ProjectService";
import { UserService } from "../services/UserService";
import { Keys } from "../services/keys";
import { redis } from "../services/redis";

@Controller("memberships")
export class Memberships {
	@Middleware([isAuthenticated])
	@Post("invite")
	public async inviteMember(req: Request, res: Response) {
		const { id: projectId, email } = MembershipSchemas.invite.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isAdmin = await MembershipService.isAdmin(projectId, userId);

		if (!isAdmin) {
			throw new NotAllowed();
		}

		const invitedUser = await UserService.email(email);

		if (!invitedUser) {
			throw new HttpException(
				404,
				"We could not find that user, please ask them to sign up first.",
			);
		}

		const alreadyMember = await MembershipService.isMember(
			project.id,
			invitedUser.id,
		);

		if (alreadyMember) {
			throw new NotAllowed();
		}

		await MembershipService.invite(projectId, invitedUser.id, "ADMIN");

		const memberships = await ProjectService.memberships(projectId);

		return res.status(200).json({ success: true, memberships });
	}

	@Middleware([isAuthenticated])
	@Post("kick")
	public async kickMember(req: Request, res: Response) {
		const { id: projectId, email } = MembershipSchemas.kick.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		const user = await UserService.id(userId);

		if (!user) {
			throw new NotAuthenticated();
		}

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isAdmin = await MembershipService.isAdmin(projectId, userId);

		if (!isAdmin) {
			throw new NotAllowed();
		}

		const kickedUser = await UserService.email(email);

		if (!kickedUser) {
			throw new NotFound("user");
		}

		const isMember = await MembershipService.isMember(
			project.id,
			kickedUser.id,
		);

		if (!isMember) {
			throw new NotAllowed();
		}

		if (userId === kickedUser.id) {
			throw new NotAllowed();
		}

		await MembershipService.kick(projectId, kickedUser.id);

		const memberships = await ProjectService.memberships(projectId);

		return res.status(200).json({ success: true, memberships });
	}

	@Middleware([isAuthenticated])
	@Post("leave")
	public async leaveProject(req: Request, res: Response) {
		const { id: projectId } = UtilitySchemas.id.parse(req.body);

		const { userId } = res.locals.auth as IJwt;

		const user = await UserService.id(userId);

		if (!user) {
			throw new NotAuthenticated();
		}

		const project = await ProjectService.id(projectId);

		if (!project) {
			throw new NotFound("project");
		}

		const isMember = await MembershipService.isMember(projectId, userId);

		if (!isMember) {
			throw new NotAllowed();
		}

		await MembershipService.kick(projectId, userId);

		await redis.del(Keys.User.projects(userId));

		const memberships = await UserService.projects(userId);

		return res.status(200).json({ success: true, memberships });
	}
}

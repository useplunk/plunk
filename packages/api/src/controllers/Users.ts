import { Controller, Get, Middleware } from "@overnightjs/core";
import type { Request, Response } from "express";
import { NotAuthenticated } from "../exceptions";
import { type IJwt, isAuthenticated } from "../middleware/auth";
import { UserService } from "../services/UserService";

@Controller("users")
export class Users {
	@Get("@me")
	@Middleware([isAuthenticated])
	public async me(req: Request, res: Response) {
		const auth = res.locals.auth as IJwt;

		const me = await UserService.id(auth.userId);

		if (!me) {
			throw new NotAuthenticated();
		}

		return res.status(200).json({ id: me.id, email: me.email });
	}

	@Get("@me/projects")
	@Middleware([isAuthenticated])
	public async meProjects(req: Request, res: Response) {
		const auth = res.locals.auth as IJwt;

		const projects = await UserService.projects(auth.userId);

		return res.status(200).json(projects);
	}
}

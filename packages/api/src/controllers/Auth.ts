import { Controller, Get, Post } from "@overnightjs/core";
import { UserSchemas, UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import { prisma } from "../database/prisma";
import { NotAllowed, NotFound } from "../exceptions";
import { jwt } from "../middleware/auth";
import { AuthService } from "../services/AuthService";
import { UserService } from "../services/UserService";
import { Keys } from "../services/keys";
import { REDIS_ONE_MINUTE, redis } from "../services/redis";
import { createHash } from "../util/hash";

@Controller("auth")
export class Auth {
	@Post("login")
	public async login(req: Request, res: Response) {
		const { email, password } = UserSchemas.credentials.parse(req.body);

		const user = await UserService.email(email);

		if (!user) {
			return res.json({ success: false, data: "Incorrect email or password" });
		}

		if (!user.password) {
			return res.json({
				success: "redirect",
				redirect: `/auth/reset?id=${user.id}`,
			});
		}

		const verified = await AuthService.verifyCredentials(email, password);

		if (!verified) {
			return res.json({ success: false, data: "Incorrect email or password" });
		}

		await redis.set(
			Keys.User.id(user.id),
			JSON.stringify(user),
			"EX",
			REDIS_ONE_MINUTE * 60,
		);

		const token = jwt.sign(user.id);
		const cookie = UserService.cookieOptions();

		return res
			.cookie(UserService.COOKIE_NAME, token, cookie)
			.json({ success: true, data: { id: user.id, email: user.email } });
	}

	@Post("signup")
	public async signup(req: Request, res: Response) {
		const { email, password } = UserSchemas.credentials.parse(req.body);

		const user = await UserService.email(email);

		if (user) {
			return res.json({
				success: false,
				data: "That email is already associated with another user",
			});
		}

		const created_user = await prisma.user.create({
			data: {
				email,
				password: await createHash(password),
			},
		});

		await redis.set(
			Keys.User.id(created_user.id),
			JSON.stringify(created_user),
			"EX",
			REDIS_ONE_MINUTE * 60,
		);

		const token = jwt.sign(created_user.id);
		const cookie = UserService.cookieOptions();

		return res.cookie(UserService.COOKIE_NAME, token, cookie).json({
			success: true,
			data: { id: created_user.id, email: created_user.email },
		});
	}

	@Post("reset")
	public async reset(req: Request, res: Response) {
		const { id, password } = UtilitySchemas.id
			.merge(UserSchemas.credentials.pick({ password: true }))
			.parse(req.body);

		const user = await UserService.id(id);

		if (!user) {
			throw new NotFound("user");
		}

		if (user.password) {
			throw new NotAllowed();
		}

		await prisma.user.update({
			where: { id },
			data: { password: await createHash(password) },
		});

		await redis.del(Keys.User.id(user.id));
		await redis.del(Keys.User.email(user.email));

		return res.json({ success: true });
	}

	@Get("logout")
	public logout(req: Request, res: Response) {
		res.cookie(
			UserService.COOKIE_NAME,
			"",
			UserService.cookieOptions(new Date()),
		);
		return res.json(true);
	}
}

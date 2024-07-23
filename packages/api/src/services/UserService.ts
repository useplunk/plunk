import dayjs from "dayjs";
import { NODE_ENV } from "../app/constants";
import { prisma } from "../database/prisma";
import { Keys } from "./keys";
import { wrapRedis } from "./redis";

export class UserService {
	public static readonly COOKIE_NAME = "token";

	public static id(id: string) {
		return wrapRedis(Keys.User.id(id), () => {
			return prisma.user.findUnique({
				where: { id },
			});
		});
	}

	public static email(email: string) {
		return wrapRedis(Keys.User.email(email), () => {
			return prisma.user.findUnique({
				where: { email },
			});
		});
	}

	public static async projects(id: string) {
		return wrapRedis(Keys.User.projects(id), async () => {
			const user = await prisma.user.findUnique({
				where: { id },
				include: { memberships: true },
			});

			if (!user) {
				return [];
			}

			return prisma.project.findMany({
				where: {
					id: {
						in: user.memberships.map((project) => project.projectId),
					},
				},
				orderBy: { name: "asc" },
			});
		});
	}

	/**
	 * Generates cookie options
	 * @param expires An optional expiry for this cookie (useful for a logout)
	 */
	public static cookieOptions(expires?: Date) {
		return {
			httpOnly: true,
			expires: expires ?? dayjs().add(168, "hours").toDate(),
			secure: NODE_ENV !== "development",
			sameSite: "lax",
			path: "/",
		} as const;
	}
}

import type { Role } from "@prisma/client";
import { NODE_ENV } from "../app/constants";
import { prisma } from "../database/prisma";
import { Keys } from "./keys";
import { redis, wrapRedis } from "./redis";

export class MembershipService {
	public static async isMember(projectId: string, userId: string) {
		return wrapRedis(
			Keys.ProjectMembership.isMember(projectId, userId),
			async () => {
				if (NODE_ENV === "development") {
					return true;
				}

				const membership = await prisma.projectMembership.findFirst({
					where: { projectId, userId },
				});

				return !!membership;
			},
		);
	}

	public static async isAdmin(projectId: string, userId: string) {
		return wrapRedis(
			Keys.ProjectMembership.isAdmin(projectId, userId),
			async () => {
				if (NODE_ENV === "development") {
					return true;
				}

				const membership = await prisma.projectMembership.findFirst({
					where: { projectId, userId, role: { in: ["ADMIN", "OWNER"] } },
				});

				return !!membership;
			},
		);
	}

	public static async isOwner(projectId: string, userId: string) {
		return wrapRedis(
			Keys.ProjectMembership.isOwner(projectId, userId),
			async () => {
				if (NODE_ENV === "development") {
					return true;
				}

				const membership = await prisma.projectMembership.findFirst({
					where: { projectId, userId, role: "OWNER" },
				});

				return !!membership;
			},
		);
	}

	public static async kick(projectId: string, userId: string) {
		await prisma.projectMembership.delete({
			where: { userId_projectId: { projectId, userId } },
		});

		await redis.del(Keys.Project.memberships(projectId));
		await redis.del(Keys.User.projects(userId));
	}

	public static async invite(projectId: string, userId: string, role: Role) {
		await prisma.projectMembership.create({
			data: { projectId, userId, role },
		});

		await redis.del(Keys.Project.memberships(projectId));
		await redis.del(Keys.User.projects(userId));
	}
}

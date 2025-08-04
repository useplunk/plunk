import dayjs from "dayjs";
import { prisma } from "../database/prisma";
import { Keys } from "./keys";
import { wrapRedis } from "./redis";

export class ProjectService {
	public static contacts = {
		get: (id: string) => {
			return wrapRedis(Keys.Project.contacts(id), async () => {
				return prisma.project.findUnique({ where: { id } }).contacts({
					select: {
						id: true,
						email: true,
						subscribed: true,
						createdAt: true,
						data: true,
						updatedAt: true,
						triggers: { select: { createdAt: true, eventId: true } },
					},
				});
			});
		},

		paginated: (id: string, page: number) => {
			return wrapRedis(Keys.Project.contacts(id, { page }), async () => {
				return prisma.project.findUnique({ where: { id } }).contacts({
					select: {
						id: true,
						email: true,
						subscribed: true,
						createdAt: true,
						triggers: { select: { createdAt: true } },
						emails: { select: { createdAt: true } },
					},
					orderBy: [{ createdAt: "desc" }],
					take: 20,
					skip: (page - 1) * 20,
				});
			});
		},

		count: (id: string) => {
			return wrapRedis(Keys.Project.contacts(id, { count: true }), async () => {
				return prisma.contact.count({ where: { projectId: id } });
			});
		},
	};

	public static emails = {
		get: (id: string) => {
			return wrapRedis(Keys.Project.emails(id), async () => {
				return prisma.email.findMany({
					where: {
						OR: [{ action: { projectId: id } }, { campaign: { projectId: id } }, { projectId: id }],
					},
					orderBy: { createdAt: "desc" },
				});
			});
		},
		count: (id: string) => {
			return wrapRedis(Keys.Project.emails(id, { count: true }), async () => {
				return prisma.email.count({ where: { contact: { projectId: id } } });
			});
		},
	};

	public static id(id: string) {
		return wrapRedis(Keys.Project.id(id), async () => {
			return prisma.project.findUnique({ where: { id } });
		});
	}

	public static key(key: string) {
		if (key.startsWith("sk_")) {
			return ProjectService.secret(key);
		}
		return ProjectService.public(key);
	}

	public static secret(secretKey: string) {
		return wrapRedis(Keys.Project.secret(secretKey), () => {
			return prisma.project.findUnique({ where: { secret: secretKey } });
		});
	}

	public static public(publicKey: string) {
		return wrapRedis(Keys.Project.public(publicKey), () => {
			return prisma.project.findUnique({ where: { public: publicKey } });
		});
	}

	public static async secretIsAvailable(secretKey: string) {
		const project = await ProjectService.secret(secretKey);

		return !project;
	}

	public static async publicIsAvailable(publicKey: string) {
		const project = await ProjectService.public(publicKey);

		return !project;
	}

	public static memberships(id: string) {
		return wrapRedis(Keys.Project.memberships(id), async () => {
			const memberships = await prisma.project.findUnique({ where: { id } }).memberships({ include: { user: true } });

			if (!memberships) {
				return [];
			}

			return memberships.map((membership) => {
				return {
					userId: membership.userId,
					email: membership.user.email,
					role: membership.role,
				};
			});
		});
	}

	public static metadata(id: string) {
		return wrapRedis(Keys.Project.metadata(id), async () => {
			const contacts = await prisma.project.findUnique({ where: { id } }).contacts({
				where: {
					data: {
						not: null,
					},
				},
				distinct: ["data"],
				select: {
					data: true,
				},
			});

			if (!contacts) {
				return [];
			}

			return [...new Set(contacts.filter((c) => c.data).flatMap((c) => Object.keys(JSON.parse(c.data as string))))];
		});
	}

	public static async feed(id: string, page: number) {
		const itemsPerPage = 10;
		const skip = (page - 1) * itemsPerPage;

		const triggers = await prisma.trigger.findMany({
			where: { contact: { projectId: id } },
			include: {
				contact: {
					select: {
						id: true,
						email: true,
					},
				},
				event: {
					select: {
						name: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		const emails = await prisma.email.findMany({
			where: { contact: { projectId: id } },
			include: {
				contact: {
					select: {
						id: true,
						email: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		const combined = [...triggers, ...emails];
		combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

		return combined.slice(skip, skip + itemsPerPage);
	}

	public static usage(id: string) {
		return wrapRedis(Keys.Project.usage(id), async () => {
			const transactional = await prisma.email.count({
				where: {
					projectId: id,
					createdAt: {
						gte: new Date(dayjs().startOf("month").toISOString()),
						lte: new Date(dayjs().endOf("month").toISOString()),
					},
				},
			});

			const automation = await prisma.email.count({
				where: {
					action: { projectId: id },
					createdAt: {
						gte: new Date(dayjs().startOf("month").toISOString()),
						lte: new Date(dayjs().endOf("month").toISOString()),
					},
				},
			});

			const campaign = await prisma.email.count({
				where: {
					campaign: { projectId: id },
					createdAt: {
						gte: new Date(dayjs().startOf("month").toISOString()),
						lte: new Date(dayjs().endOf("month").toISOString()),
					},
				},
			});

			return {
				transactional,
				automation,
				campaign,
			};
		});
	}

	public static events(id: string, triggers: boolean) {
		return wrapRedis(Keys.Project.events(id, triggers), async () => {
			if (triggers) {
				return prisma.project.findUnique({ where: { id } }).events({
					include: {
						triggers: {
							select: { id: true, createdAt: true, contactId: true },
						},
					},
					orderBy: { createdAt: "desc" },
				});
			}
			return prisma.project.findUnique({ where: { id } }).events({
				orderBy: { createdAt: "desc" },
			});
		});
	}

	public static actions(id: string) {
		return wrapRedis(Keys.Project.actions(id), async () => {
			return prisma.project.findUnique({ where: { id } }).actions({
				include: {
					triggers: { select: { id: true } },
					template: true,
					emails: { select: { id: true, status: true } },
					tasks: { select: { id: true } },
				},
			});
		});
	}

	public static templates(id: string) {
		return wrapRedis(Keys.Project.templates(id), async () => {
			return prisma.project.findUnique({ where: { id } }).templates({
				include: { actions: true },
				orderBy: { createdAt: "desc" },
			});
		});
	}

	public static campaigns(id: string) {
		return wrapRedis(Keys.Project.campaigns(id), async () => {
			return prisma.$queryRaw`
			SELECT
				c.id,
				c.subject,
				c.body,
				c.email,
				c."from",
				c.status,
				c.delivered,
				c."style",
				c."projectId",
				c."createdAt",
				c."updatedAt",
				COUNT(DISTINCT e.id)::int AS emails_count,
				(COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'OPENED'))::int AS opened_emails_count,
				COUNT(DISTINCT t.id)::int AS tasks_count
			FROM
				campaigns c
				LEFT JOIN emails e ON e. "campaignId" = c.id
				LEFT JOIN tasks t ON t. "campaignId" = c.id
			WHERE
				c. "projectId" = ${id}
			GROUP BY
				c.id
			ORDER by c."createdAt" DESC;
		`
		});
	}

	public static analytics(params: {
		id: string;
		method?: "week" | "month" | "year";
	}) {
		return wrapRedis(Keys.Project.analytics(params.id), async () => {
			const methods = {
				week: {
					daysBack: 7,
					method: "week",
				},
				month: {
					daysBack: 30,
					method: "day",
				},
				year: {
					daysBack: 365,
					method: "month",
				},
			};

			const end = dayjs().toDate();
			const start = dayjs()
				.subtract(methods[params.method ?? "week"].daysBack, "days")
				.toDate();

			const contacts = await prisma.$queryRaw`
WITH date_range AS (
    SELECT generate_series(
        (SELECT DATE_TRUNC('day', MIN("createdAt")) FROM contacts),
        DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
        INTERVAL '1 day'
    ) AS day
)

SELECT
    dr.day,
    SUM(COALESCE(ct.count, 0)) OVER (ORDER BY dr.day) as count
FROM date_range dr
LEFT JOIN (
    SELECT
        DATE_TRUNC('day', c."createdAt") AS day,
        COUNT(c.id) as count
    FROM contacts c
    WHERE "projectId" = ${params.id}
    GROUP BY DATE_TRUNC('day', c."createdAt")
) ct ON dr.day = ct.day
WHERE dr.day < DATE_TRUNC('day', NOW())
ORDER BY dr.day DESC
LIMIT 30;
      
      `;

			const rawActionClicks = await prisma.$queryRaw`
SELECT clicks."link", a."name", count(clicks.id)::int FROM clicks
JOIN emails e on clicks."emailId" = e.id
JOIN actions a on e."actionId" = a.id
WHERE clicks."link" NOT LIKE '%unsubscribe%' AND DATE(clicks."createdAt") BETWEEN DATE(${start}) AND DATE(${end}) AND a."projectId" = ${params.id}
GROUP BY a."name", clicks."link"
      `;

			const combinedRoutes = {};

			// @ts-expect-error
			rawActionClicks.forEach((item) => {
				const url = new URL(item.link);
				const route = url.pathname;
				// @ts-expect-error
				if (combinedRoutes[route]) {
					// @ts-expect-error
					combinedRoutes[route].count += item.count;
				} else {
					// @ts-expect-error
					combinedRoutes[route] = {
						link: url.hostname + route,
						name: item.name,
						count: item.count,
					};
				}
			});

			const formattedActionClicks = Object.values(combinedRoutes).sort(
				// @ts-expect-error
				(a, b) => b.count - a.count,
			);

			const subscribed = await prisma.contact.count({
				where: { subscribed: true, projectId: params.id },
			});
			const unsubscribed = await prisma.contact.count({
				where: { subscribed: false, projectId: params.id },
			});

			const opened = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
					status: "OPENED",
				},
			});

			const openedPrev = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
					status: "OPENED",
					createdAt: {
						lte: start,
					},
				},
			});

			const bounced = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
					status: "BOUNCED",
				},
			});

			const bouncedPrev = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
					status: "BOUNCED",
					createdAt: {
						lte: start,
					},
				},
			});

			const complaint = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
					status: "COMPLAINT",
				},
			});

			const complaintPrev = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
					status: "COMPLAINT",
					createdAt: {
						lte: start,
					},
				},
			});

			const total = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
				},
			});

			const totalPrev = await prisma.email.count({
				where: {
					contact: { projectId: params.id },
					createdAt: {
						lte: start,
					},
				},
			});

			return {
				contacts: { timeseries: contacts, subscribed, unsubscribed },
				emails: {
					total,
					opened,
					bounced,
					complaint,
					totalPrev,
					bouncedPrev,
					complaintPrev,
					openedPrev,
				},
				clicks: {
					actions: formattedActionClicks,
				},
			};
		});
	}
}

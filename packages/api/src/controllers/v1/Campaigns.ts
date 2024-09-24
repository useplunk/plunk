import { Controller, Delete, Get, Middleware, Post, Put } from "@overnightjs/core";
import { CampaignSchemas, UtilitySchemas } from "@plunk/shared";
import dayjs from "dayjs";
import type { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { HttpException, NotAllowed, NotFound } from "../../exceptions";
import { type IJwt, type ISecret, isAuthenticated, isValidSecretKey } from "../../middleware/auth";
import { CampaignService } from "../../services/CampaignService";
import { ContactService } from "../../services/ContactService";
import { EmailService } from "../../services/EmailService";
import { MembershipService } from "../../services/MembershipService";
import { ProjectService } from "../../services/ProjectService";
import { Keys } from "../../services/keys";
import { redis } from "../../services/redis";

@Controller("campaigns")
export class Campaigns {
	@Get(":id")
	@Middleware([isAuthenticated])
	public async getCampaignById(req: Request, res: Response) {
		const { id } = UtilitySchemas.id.parse(req.params);

		const { userId } = res.locals.auth as IJwt;

		const campaign = await CampaignService.id(id);

		if (!campaign) {
			throw new NotFound("campaign");
		}

		const isMember = await MembershipService.isMember(campaign.projectId, userId);

		if (!isMember) {
			throw new NotFound("campaign");
		}

		return res.status(200).json(campaign);
	}

	@Post("send")
	@Middleware([isValidSecretKey])
	public async sendCampaign(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id, live, delay: userDelay } = CampaignSchemas.send.parse(req.body);

		const campaign = await CampaignService.id(id);

		if (!campaign || campaign.projectId !== project.id) {
			throw new NotFound("campaign");
		}

		if (live) {
			if (campaign.recipients.length === 0) {
				throw new HttpException(400, "No recipients found");
			}

			await prisma.campaign.update({
				where: { id: campaign.id },
				data: { status: "DELIVERED", delivered: new Date() },
			});

			await prisma.event.createMany({
				data: [
					{
						projectId: project.id,
						name: `${campaign.subject
							.toLowerCase()
							.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
							.replace(/ /g, "-")}-campaign-delivered`,
						campaignId: campaign.id,
					},
					{
						projectId: project.id,
						name: `${campaign.subject
							.toLowerCase()
							.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
							.replace(/ /g, "-")}-campaign-opened`,
						campaignId: campaign.id,
					},
				],
			});

			let delay = userDelay ?? 0;

			const tasks = campaign.recipients.map((r, index) => {
				if (index % 80 === 0) {
					delay += 1;
				}

				return {
					campaignId: campaign.id,
					contactId: r.id,
					runBy: dayjs().add(delay, "minutes").toDate(),
				};
			});

			await prisma.task.createMany({ data: tasks });
		} else {
			const members = await ProjectService.memberships(project.id);

			await EmailService.send({
				from: {
					name: project.from ?? project.name,
					email: project.verified && project.email ? project.email : "no-reply@useplunk.dev",
				},
				to: members.map((m) => m.email),
				content: {
					subject: `[Plunk Campaign Test] ${campaign.subject}`,
					html: EmailService.compile({
						content: campaign.body,
						footer: {
							unsubscribe: false,
						},
						contact: {
							id: "",
						},
						project: {
							name: project.name,
						},
					}),
				},
			});
		}

		await redis.del(Keys.Campaign.id(campaign.id));
		await redis.del(Keys.Project.campaigns(project.id));

		return res.status(200).json({});
	}

	@Post("duplicate")
	@Middleware([isValidSecretKey])
	public async duplicateCampaign(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id } = UtilitySchemas.id.parse(req.body);

		const campaign = await CampaignService.id(id);

		if (!campaign) {
			throw new NotFound("campaign");
		}

		const duplicatedCampaign = await prisma.campaign.create({
			data: {
				projectId: project.id,
				subject: campaign.subject,
				body: campaign.body,
				style: campaign.style,
				email: campaign.email,
				from: campaign.from,
			},
		});

		await redis.del(Keys.Campaign.id(campaign.id));
		await redis.del(Keys.Project.campaigns(project.id));

		return res.status(200).json(duplicatedCampaign);
	}

	@Post()
	@Middleware([isValidSecretKey])
	public async createCampaign(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		let { subject, body, recipients, style, email, from } = CampaignSchemas.create.parse(req.body);

		if (email && !project.verified) {
			throw new NotAllowed("You need to attach a domain to your project to customize the sender address");
		}

		if (email && email.split("@")[1] !== project.email?.split("@")[1]) {
			throw new NotAllowed("The sender address must be the same domain as the project's email address");
		}

		if (recipients.length === 1 && recipients[0] === "all") {
			const projectContacts = await prisma.contact.findMany({
				where: { projectId: project.id, subscribed: true },
				select: { id: true },
			});

			recipients = projectContacts.map((c) => c.id);
		}

		const campaign = await prisma.campaign.create({
			data: {
				projectId: project.id,
				subject,
				body,
				style,
				from: from === "" ? null : from,
				email: email === "" ? null : email,
			},
		});

		const chunkSize = 500;
		for (let i = 0; i < recipients.length; i += chunkSize) {
			const chunk = recipients.slice(i, i + chunkSize);

			const recipientIds = await Promise.all(
				chunk.map(async (recipient) => {
					if (recipient.includes("@")) {
						let contact = await ContactService.email(recipient, project.id);

						if (!contact) {
							contact = await prisma.contact.create({
								data: {
									email: recipient,
									projectId: project.id,
									subscribed: true,
								},
							});
						}

						return contact.id;
					}

					return recipient;
				}),
			);

			await prisma.campaign.update({
				where: { id: campaign.id },
				data: {
					recipients: {
						connect: recipientIds.map((id) => ({ id })),
					},
				},
			});
		}

		await redis.del(Keys.Campaign.id(campaign.id));
		await redis.del(Keys.Project.campaigns(project.id));

		return res.status(200).json(campaign);
	}

	@Put()
	@Middleware([isValidSecretKey])
	public async updateCampaign(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		let { id, subject, body, recipients, style, email, from } = CampaignSchemas.update.parse(req.body);

		if (email && !project.verified) {
			throw new NotAllowed("You need to attach a domain to your project to customize the sender address");
		}

		if (email && email.split("@")[1] !== project.email?.split("@")[1]) {
			throw new NotAllowed("The sender address must be the same domain as the project's email address");
		}

		if (recipients.length === 1 && recipients[0] === "all") {
			const projectContacts = await prisma.contact.findMany({
				where: { projectId: project.id, subscribed: true },
				select: { id: true },
			});

			recipients = projectContacts.map((c) => c.id);
		}

		let campaign = await CampaignService.id(id);

		if (!campaign || campaign.projectId !== project.id) {
			throw new NotFound("campaign");
		}

		campaign = await prisma.campaign.update({
			where: { id },
			data: {
				subject,
				body,
				style,
				from: from === "" ? null : from,
				email: email === "" ? null : email,
			},
			include: {
				recipients: { select: { id: true } },
				emails: {
					select: {
						id: true,
						status: true,
						contact: { select: { id: true, email: true } },
					},
				},
			},
		});

		await prisma.campaign.update({
			where: { id },
			data: {
				recipients: {
					set: [],
				},
			},
		});

		const chunkSize = 500;

		for (let i = 0; i < campaign.recipients.length; i += chunkSize) {
			const chunk = campaign.recipients.slice(i, i + chunkSize);

			await prisma.$executeRaw`DELETE FROM "_CampaignToContact" WHERE "A" = ${campaign.id} AND "B" = ANY(${chunk.map((c) => c.id)})`;
		}

		for (let i = 0; i < recipients.length; i += chunkSize) {
			const chunk = recipients.slice(i, i + chunkSize);

			const recipientIds = await Promise.all(
				chunk.map(async (recipient) => {
					if (recipient.includes("@")) {
						let contact = await ContactService.email(recipient, project.id);

						if (!contact) {
							contact = await prisma.contact.create({
								data: {
									email: recipient,
									projectId: project.id,
									subscribed: true,
								},
							});
						}

						return contact.id;
					}

					return recipient;
				}),
			);

			await prisma.campaign.update({
				where: { id: campaign.id },
				data: {
					recipients: {
						connect: recipientIds.map((id) => ({ id })),
					},
				},
			});
		}

		await redis.del(Keys.Campaign.id(campaign.id));
		await redis.del(Keys.Project.campaigns(project.id));

		return res.status(200).json(campaign);
	}

	@Delete()
	@Middleware([isValidSecretKey])
	public async deleteCampaign(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id } = UtilitySchemas.id.parse(req.body);

		const campaign = await CampaignService.id(id);

		if (!campaign || campaign.projectId !== project.id) {
			throw new NotFound("campaign");
		}

		await prisma.campaign.delete({ where: { id } });

		await redis.del(Keys.Campaign.id(campaign.id));
		await redis.del(Keys.Project.campaigns(project.id));

		return res.status(200).json(campaign);
	}
}

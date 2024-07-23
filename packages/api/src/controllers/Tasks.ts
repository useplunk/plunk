import { Controller, Post } from "@overnightjs/core";
import type { Request, Response } from "express";
import signale from "signale";
import { prisma } from "../database/prisma";
import { ContactService } from "../services/ContactService";
import { EmailService } from "../services/EmailService";
import { ProjectService } from "../services/ProjectService";

@Controller("tasks")
export class Tasks {
	@Post()
	public async handleTasks(req: Request, res: Response) {
		// Get all tasks with a runBy data in the past
		const tasks = await prisma.task.findMany({
			where: { runBy: { lte: new Date() } },
			orderBy: { runBy: "asc" },
			include: {
				action: { include: { template: true, notevents: true } },
				campaign: true,
				contact: true,
			},
		});

		for (const task of tasks) {
			const { action, campaign, contact } = task;

			const project = await ProjectService.id(contact.projectId);

			// If the project does not exist or is disabled, delete all tasks
			if (!project) {
				await prisma.task.deleteMany({
					where: {
						contact: {
							projectId: contact.projectId,
						},
					},
				});
				continue;
			}

			let subject = "";
			let body = "";

			if (action) {
				const { template, notevents } = action;

				if (notevents.length > 0) {
					const triggers = await ContactService.triggers(contact.id);
					if (
						notevents.some((e) =>
							triggers.some(
								(t) => t.contactId === contact.id && t.eventId === e.id,
							),
						)
					) {
						await prisma.task.delete({ where: { id: task.id } });
						continue;
					}
				}

				({ subject, body } = EmailService.format({
					subject: template.subject,
					body: template.body,
					data: {
						plunk_id: contact.id,
						plunk_email: contact.email,
						...JSON.parse(contact.data ?? "{}"),
					},
				}));
			} else if (campaign) {
				({ subject, body } = EmailService.format({
					subject: campaign.subject,
					body: campaign.body,
					data: {
						plunk_id: contact.id,
						plunk_email: contact.email,
						...JSON.parse(contact.data ?? "{}"),
					},
				}));
			}

			const { messageId } = await EmailService.send({
				from: {
					name: project.from ?? project.name,
					email:
						project.verified && project.email
							? project.email
							: "no-reply@useplunk.dev",
				},
				to: [contact.email],
				content: {
					subject,
					html: EmailService.compile({
						content: body,
						footer: {
							unsubscribe: campaign
								? true
								: !!action && action.template.type === "MARKETING",
						},
						contact: {
							id: contact.id,
						},
						project: {
							name: project.name,
						},
						isHtml:
							(campaign && campaign.style === "HTML") ??
							(!!action && action.template.style === "HTML"),
					}),
				},
			});

			const emailData: {
				messageId: string;
				contactId: string;
				actionId?: string;
				campaignId?: string;
			} = {
				messageId,
				contactId: contact.id,
			};

			if (action) {
				emailData.actionId = action.id;
			} else if (campaign) {
				emailData.campaignId = campaign.id;
			}

			await prisma.email.create({ data: emailData });

			await prisma.task.delete({ where: { id: task.id } });

			signale.success(
				`Task completed for ${contact.email} from ${project.name}`,
			);
		}

		return res.status(200).json({ success: true });
	}
}

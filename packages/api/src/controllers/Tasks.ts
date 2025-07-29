import { Controller, Post } from "@overnightjs/core";
import type { Request, Response } from "express";
import signale from "signale";
import { prisma } from "../database/prisma";
import { ContactService } from "../services/ContactService";
import { EmailService } from "../services/EmailService";
import { ProjectService } from "../services/ProjectService";
import type { Task, Action, Campaign, Contact, Template, Event } from "@prisma/client";

type TaskWithRelations = Task & {
	action: (Action & { template: Template; notevents: Event[] }) | null;
	campaign: Campaign | null;
	contact: Contact;
};

@Controller("tasks")
export class Tasks {
	@Post()
	public async handleTasks(req: Request, res: Response) {
		const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || "20");
		const MAX_PARALLEL = parseInt(process.env.MAX_PARALLEL_EMAILS || "5");
		
		// Get tasks in batches to avoid memory issues
		const tasks = await prisma.task.findMany({
			where: { runBy: { lte: new Date() } },
			orderBy: { runBy: "asc" },
			take: BATCH_SIZE,
			include: {
				action: { include: { template: true, notevents: true } },
				campaign: true,
				contact: true,
			},
		});

		if (tasks.length === 0) {
			return res.status(200).json({ success: true, processed: 0 });
		}

		// Process tasks in parallel batches
		const processPromises: Promise<void>[] = [];
		
		for (let i = 0; i < tasks.length; i += MAX_PARALLEL) {
			const batch = tasks.slice(i, i + MAX_PARALLEL);
			processPromises.push(this.processBatch(batch));
		}

		await Promise.allSettled(processPromises);
		
		signale.info(`Processed ${tasks.length} tasks`);
		
		return res.status(200).json({ 
			success: true, 
			processed: tasks.length,
			timestamp: new Date().toISOString()
		});
	}

	private async processBatch(tasks: TaskWithRelations[]): Promise<void> {
		const emailPromises = tasks.map(async (task) => {
			try {
				await this.processTask(task);
				await prisma.task.delete({ where: { id: task.id } });
				signale.success(`Email sent to ${task.contact.email}`);
			} catch (error) {
				signale.error(`Failed to process task ${task.id}:`, error);
				// Optionally implement retry logic or mark as failed
			}
		});

		await Promise.allSettled(emailPromises);
	}

	private async processTask(task: TaskWithRelations): Promise<void> {
		const { action, campaign, contact } = task;

		const project = await ProjectService.id(contact.projectId);

		// If the project does not exist, delete related tasks
		if (!project) {
			await prisma.task.deleteMany({
				where: {
					contact: {
						projectId: contact.projectId,
					},
				},
			});
			return;
		}

		let subject = "";
		let body = "";
		let email = "";
		let name = "";

		if (action) {
			const { template, notevents } = action;

			if (notevents.length > 0) {
				const triggers = await ContactService.triggers(contact.id);
				if (notevents.some((e) => triggers.some((t) => t.contactId === contact.id && t.eventId === e.id))) {
					return;
				}
			}

			email = project.verified && project.email ? template.email ?? project.email : "no-reply@useplunk.dev";
			name = template.from ?? project.from ?? project.name;

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
			email = project.verified && project.email ? campaign.email ?? project.email : "no-reply@useplunk.dev";
			name = campaign.from ?? project.from ?? project.name;

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
				name,
				email,
			},
			to: [contact.email],
			content: {
				subject,
				html: EmailService.compile({
					content: body,
					footer: {
						unsubscribe: campaign ? true : !!action && action.template.type === "MARKETING",
					},
					contact: {
						id: contact.id,
					},
					project: {
						name: project.name,
					},
					isHtml: (campaign && campaign.style === "HTML") ?? (!!action && action.template.style === "HTML"),
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
	}
}

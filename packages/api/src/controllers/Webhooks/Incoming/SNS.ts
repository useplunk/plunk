import { Controller, Post } from "@overnightjs/core";
import type { Event } from "@prisma/client";
import type { Request, Response } from "express";
import signale from "signale";
import { prisma } from "../../../database/prisma";
import { ActionService } from "../../../services/ActionService";
import { ProjectService } from "../../../services/ProjectService";

const eventMap = {
	Bounce: "BOUNCED",
	Delivery: "DELIVERED",
	Open: "OPENED",
	Complaint: "COMPLAINT",
	Click: "CLICKED",
} as const;

@Controller("sns")
export class SNSWebhook {
	@Post()
	public async receiveSNSWebhook(req: Request, res: Response) {
		try {
			const body = JSON.parse(req.body.Message);

			const email = await prisma.email.findUnique({
				where: { messageId: body.mail.messageId },
				include: {
					contact: true,
					action: { include: { template: { include: { events: true } } } },
					campaign: { include: { events: true } },
				},
			});

			if (!email) {
				return res.status(200).json({});
			}

			const project = await ProjectService.id(email.contact.projectId);

			if (!project) {
				return res.status(200).json({ success: false });
			}

			// The email was a transactional email
			if (email.projectId) {
				if (body.eventType === "Click") {
					signale.success(
						`Click received for ${email.contact.email} from ${project.name}`,
					);
					await prisma.click.create({
						data: { emailId: email.id, link: body.click.link },
					});
				}

				if (body.eventType === "Complaint") {
					signale.warn(
						`Complaint received for ${email.contact.email} from ${project.name}`,
					);
				}

				if (body.eventType === "Bounce") {
					signale.warn(
						`Bounce received for ${email.contact.email} from ${project.name}`,
					);
				}

				await prisma.email.update({
					where: { messageId: body.mail.messageId },
					data: {
						status:
							eventMap[
								body.eventType as "Bounce" | "Delivery" | "Open" | "Complaint"
							],
					},
				});

				return res.status(200).json({ success: true });
			}

			if (body.eventType === "Complaint" || body.eventType === "Bounce") {
				signale.warn(
					`${body.eventType === "Complaint" ? "Complaint" : "Bounce"} received for ${email.contact.email} from ${project.name}`,
				);

				await prisma.email.update({
					where: { messageId: body.mail.messageId },
					data: { status: eventMap[body.eventType as "Bounce" | "Complaint"] },
				});

				await prisma.contact.update({
					where: { id: email.contactId },
					data: { subscribed: false },
				});

				return res.status(200).json({ success: true });
			}

			if (body.eventType === "Click") {
				signale.success(
					`Click received for ${email.contact.email} from ${project.name}`,
				);

				await prisma.click.create({
					data: { emailId: email.id, link: body.click.link },
				});

				return res.status(200).json({ success: true });
			}

			let event: Event | undefined;

			if (email.action) {
				event = email.action.template.events.find((e) =>
					e.name.includes(
						(body.eventType as
							| "Bounce"
							| "Delivery"
							| "Open"
							| "Complaint"
							| "Click") === "Delivery"
							? "delivered"
							: "opened",
					),
				);
			}

			if (email.campaign) {
				event = email.campaign.events.find((e) =>
					e.name.includes(
						(body.eventType as
							| "Bounce"
							| "Delivery"
							| "Open"
							| "Complaint"
							| "Click") === "Delivery"
							? "delivered"
							: "opened",
					),
				);
			}

			if (!event) {
				return res.status(200).json({ success: false });
			}

			switch (body.eventType as "Delivery" | "Open") {
				case "Delivery":
					signale.success(
						`Delivery received for ${email.contact.email} from ${project.name}`,
					);
					await prisma.email.update({
						where: { messageId: body.mail.messageId },
						data: { status: "DELIVERED" },
					});

					await prisma.trigger.create({
						data: { contactId: email.contactId, eventId: event.id },
					});

					break;
				case "Open":
					signale.success(
						`Open received for ${email.contact.email} from ${project.name}`,
					);
					await prisma.email.update({
						where: { messageId: body.mail.messageId },
						data: { status: "OPENED" },
					});
					await prisma.trigger.create({
						data: { contactId: email.contactId, eventId: event.id },
					});

					break;
			}

			if (email.action) {
				void ActionService.trigger({ event, contact: email.contact, project });
			}
		} catch (e) {
			if (req.body.SubscribeURL) {
				signale.info("--------------");
				signale.info("SNS Topic Confirmation URL:");
				signale.info(req.body.SubscribeURL);
				signale.info("--------------");
			} else {
				signale.error(e);
			}
		}

		return res.status(200).json({ success: true });
	}
}

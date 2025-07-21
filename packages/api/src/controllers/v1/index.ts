import { ChildControllers, Controller, Middleware, Post } from "@overnightjs/core";
import { EventSchemas } from "@plunk/shared";
import dayjs from "dayjs";
import type { Request, Response } from "express";
import signale from "signale";
import { prisma } from "../../database/prisma";
import { HttpException, NotAllowed } from "../../exceptions";
import { type IKey, type ISecret, isValidKey, isValidSecretKey } from "../../middleware/auth";
import { ActionService } from "../../services/ActionService";
import { ContactService } from "../../services/ContactService";
import { EmailService } from "../../services/EmailService";
import { EventService } from "../../services/EventService";
import { ProjectService } from "../../services/ProjectService";
import { Keys } from "../../services/keys";
import { redis } from "../../services/redis";
import { Actions } from "./Actions";
import { Campaigns } from "./Campaigns";
import { Contacts } from "./Contacts";
import { Events } from "./Events";
import { Templates } from "./Templates";

@Controller("v1")
@ChildControllers([new Actions(), new Templates(), new Campaigns(), new Contacts(), new Events()])
export class V1 {
	@Post()
	@Post("track")
	@Middleware([isValidKey])
	public async postEvent(req: Request, res: Response) {
		const { key } = res.locals.auth as IKey;

		const project = await ProjectService.key(key);

		if (!project) {
			throw new HttpException(401, "Incorrect Bearer token specified");
		}

		const result = EventSchemas.post.safeParse(req.body);

		if (!result.success) {
			signale.warn(`${project.name} tried tracking an event with invalid data: ${JSON.stringify(req.body)}`);
			if ("unionErrors" in result.error.issues[0]) {
				throw new HttpException(400, result.error.issues[0].unionErrors[0].errors[0].message);
			}

			throw new HttpException(400, result.error.issues[0].message);
		}

		const { event: name, email, data, subscribed } = result.data;

		if (name === "subscribe" || name === "unsubscribe") {
			throw new NotAllowed("subscribe & unsubscribe are reserved event names.");
		}

		let event = await EventService.event(project.id, name);

		if (!event) {
			event = await prisma.event.create({
				data: { name, projectId: project.id },
			});
			redis.set(Keys.Event.event(project.id, event.name), JSON.stringify(event));
			redis.set(Keys.Event.id(event.id), JSON.stringify(event));

			redis.del(Keys.Project.events(project.id, true));
			redis.del(Keys.Project.events(project.id, false));
		}

		let contact = await ContactService.email(project.id, email);

		if (!contact) {
			contact = await prisma.contact.create({
				data: {
					email,
					subscribed: subscribed ?? true,
					projectId: project.id,
				},
			});

			redis.del(Keys.Contact.id(contact.id));
			redis.del(Keys.Contact.email(project.id, contact.email));
		} else {
			if (subscribed !== null && contact.subscribed !== subscribed) {
				contact = await prisma.contact.update({where: {id: contact.id}, data: {subscribed}});
		
				redis.del(Keys.Contact.id(contact.id));
				redis.del(Keys.Contact.email(project.id, contact.email));
			  }
		}

		if (data) {
			const givenUserData = Object.entries(data);
			const userData = JSON.parse(contact.data ?? "{}");
			const dataToUpdate = JSON.parse(contact.data ?? "{}");

			givenUserData.forEach(([key, value]) => {
				userData[key] = value.value;
				if (value.persistent) {
					dataToUpdate[key] = value.value;
				}
			});

			contact.data = JSON.stringify(userData);

			await prisma.contact.update({
				where: { id: contact.id },
				data: { data: JSON.stringify(dataToUpdate) },
			});
		}

		await prisma.trigger.create({
			data: { eventId: event.id, contactId: contact.id },
		});

		void ActionService.trigger({ event, contact, project });

		signale.success(`${project.name} triggered ${event.name} for ${contact.email}`);

		return res.status(200).json({
			success: true,
			contact: contact.id,
			event: event.id,
			timestamp: dayjs().toISOString(),
		});
	}

	@Post("send")
	@Middleware([isValidSecretKey])
	public async send(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new HttpException(401, "Incorrect Bearer token specified");
		}

		const result = EventSchemas.send.safeParse(req.body);

		if (!result.success) {
			if ("unionErrors" in result.error.issues[0]) {
				throw new HttpException(400, result.error.issues[0].unionErrors[0].errors[0].message);
			}

			throw new HttpException(400, result.error.issues[0].message);
		}

		const { from, name, reply, to, subject, body, subscribed, headers, attachments } = result.data;

		if (!project.email || !project.verified) {
			throw new HttpException(401, "Verify your domain before you start sending");
		}

		if (from && from.split("@")[1] !== project.email?.split("@")[1]) {
			throw new HttpException(401, "Custom from address must be from a verified domain");
		}

		const emails: {
			contact: {
				id: string;
				email: string;
			};
			email: string;
		}[] = [];

		for (const email of to) {
			let contact = await ContactService.email(project.id, email);

			if (!contact) {
				contact = await prisma.contact.create({
					data: {
						email,
						subscribed: subscribed ?? false,
						projectId: project.id,
					},
				});

				redis.del(Keys.Contact.id(contact.id));
				redis.del(Keys.Contact.email(project.id, contact.email));
			} else {
				if (subscribed && contact.subscribed !== subscribed) {
					await prisma.contact.update({
						where: { id: contact.id },
						data: { subscribed },
					});
					redis.set(
						Keys.Contact.email(project.id, contact.email),
						JSON.stringify({
							...contact,
							subscribed,
						}),
					);
					redis.del(Keys.Contact.id(contact.id));
				}
			}

			const { subject: enrichedSubject, body: enrichedBody } = EmailService.format({
				subject,
				body,
				data: {
					plunk_id: contact.id,
					plunk_email: contact.email,
					...JSON.parse(contact.data ?? "{}"),
				},
			});

			const { messageId } = await EmailService.send({
				from: {
					name: name ?? project.from ?? project.name,
					email: from ?? project.email,
				},
				reply: reply ?? from ?? project.email,
				to: [email],
				headers,
				attachments,
				content: {
					subject: enrichedSubject,
					html: EmailService.compile({
						isHtml: true,
						content: enrichedBody,
						footer: {
							unsubscribe: false,
						},
						contact: {
							id: contact.id,
						},
						project: {
							name: project.name,
						},
					}),
				},
			});

			const createdEmail = await prisma.email.create({
				data: {
					messageId,
					subject,
					body: enrichedBody,
					contactId: contact.id,
					projectId: project.id,
				},
			});

			emails.push({
				contact: { id: contact.id, email: contact.email },
				email: createdEmail.id,
			});
		}

		redis.del(Keys.Project.emails(project.id));
		redis.del(Keys.Project.emails(project.id, { count: true }));

		signale.success(`${project.name} sent a transactional email to ${to.join(", ")}`);

		return res.status(200).json({ success: true, emails, timestamp: dayjs().toISOString() });
	}
}

import { Controller, Delete, Get, Middleware, Post, Put } from "@overnightjs/core";
import { ContactSchemas, UtilitySchemas } from "@plunk/shared";
import type { Request, Response } from "express";
import z from "zod";
import { prisma } from "../../database/prisma";
import { HttpException, NotFound } from "../../exceptions";
import { type IKey, type ISecret, isValidKey, isValidSecretKey } from "../../middleware/auth";
import { ActionService } from "../../services/ActionService";
import { ContactService } from "../../services/ContactService";
import { EventService } from "../../services/EventService";
import { ProjectService } from "../../services/ProjectService";
import { Keys } from "../../services/keys";
import { redis } from "../../services/redis";

@Controller("contacts")
export class Contacts {
	@Get("count")
	@Middleware([isValidKey])
	public async getContactCount(req: Request, res: Response) {
		const { key } = res.locals.auth as IKey;

		const project = await ProjectService.key(key);

		if (!project) {
			throw new NotFound("project");
		}

		const count = await ProjectService.contacts.count(project.id);

		return res.status(200).json({ count });
	}

	@Get(":id")
	public async getContactById(req: Request, res: Response) {
		const { id } = UtilitySchemas.id.parse(req.params);
		const { withProject } = z
			.object({
				withProject: z
					.boolean()
					.default(false)
					.or(z.string().transform((s) => s === "true")),
			})
			.parse(req.query);

		const contact = await ContactService.id(id);

		if (!contact) {
			throw new NotFound("contact");
		}

		if (withProject) {
			const project = await ProjectService.id(contact.projectId);

			if (!project) {
				throw new NotFound("project");
			}

			return res.status(200).json({
				...contact,
				project: { name: project.name, public: project.public },
			});
		}
		return res.status(200).json(contact);
	}

	@Get()
	@Middleware([isValidSecretKey])
	public async getContacts(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const contacts = await ProjectService.contacts.get(project.id);

		return res.status(200).json(
			contacts?.map((c) => {
				return {
					id: c.id,
					email: c.email,
					subscribed: c.subscribed,
					data: c.data,
					createdAt: c.createdAt,
					updatedAt: c.updatedAt,
				};
			}),
		);
	}

	@Post("unsubscribe")
	@Middleware([isValidKey])
	public async unsubscribe(req: Request, res: Response) {
		const { key } = res.locals.auth as IKey;

		const project = await ProjectService.key(key);

		if (!project) {
			throw new NotFound("project");
		}

		const { id, email } = ContactSchemas.manage.parse(req.body);

		let contact = id ? await ContactService.id(id) : await ContactService.email(project.id, email as string);

		if (!contact || contact.projectId !== project.id) {
			throw new NotFound("contact");
		}

		contact = await prisma.contact.update({
			where: { id: contact.id },
			data: { subscribed: false },
		});

		let event = await EventService.event(project.id, "unsubscribe");

		if (!event) {
			event = await prisma.event.create({
				data: { name: "unsubscribe", projectId: project.id },
			});

			await redis.del(Keys.Project.events(project.id, true));
			await redis.del(Keys.Project.events(project.id, false));
			await redis.del(Keys.Event.event(project.id, event.name));
			await redis.del(Keys.Event.id(event.id));
		}

		await prisma.trigger.create({
			data: { eventId: event.id, contactId: contact.id },
		});
		await redis.del(Keys.Contact.id(contact.id));

		await ActionService.trigger({ event, contact, project });

		await redis.del(Keys.Project.contacts(project.id));
		await redis.del(Keys.Contact.id(contact.id));
		await redis.del(Keys.Contact.email(project.id, contact.email));

		return res.status(200).json({ success: true, contact: contact.id, subscribed: false });
	}

	@Post("subscribe")
	@Middleware([isValidKey])
	public async subscribe(req: Request, res: Response) {
		const { key } = res.locals.auth as IKey;

		const project = await ProjectService.key(key);

		if (!project) {
			throw new NotFound("project");
		}

		const { id, email } = ContactSchemas.manage.parse(req.body);

		let contact = id ? await ContactService.id(id) : await ContactService.email(project.id, email as string);

		if (!contact || contact.projectId !== project.id) {
			throw new NotFound("contact");
		}

		contact = await prisma.contact.update({
			where: { id: contact.id },
			data: { subscribed: true },
		});

		let event = await EventService.event(project.id, "subscribe");

		if (!event) {
			event = await prisma.event.create({
				data: { name: "subscribe", projectId: project.id },
			});

			await redis.del(Keys.Project.events(project.id, true));
			await redis.del(Keys.Project.events(project.id, false));
			await redis.del(Keys.Event.event(project.id, event.name));
			await redis.del(Keys.Event.id(event.id));
		}

		await prisma.trigger.create({
			data: { eventId: event.id, contactId: contact.id },
		});
		await redis.del(Keys.Contact.id(contact.id));

		await ActionService.trigger({ event, contact, project });

		await redis.del(Keys.Project.contacts(project.id));
		await redis.del(Keys.Contact.id(contact.id));
		await redis.del(Keys.Contact.email(project.id, contact.email));

		return res.status(200).json({ success: true, contact: contact.id, subscribed: true });
	}

	@Post()
	@Middleware([isValidSecretKey])
	public async createContact(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { email, subscribed, data } = ContactSchemas.create.parse(req.body);

		let contact = await ContactService.email(project.id, email);

		if (contact) {
			throw new HttpException(409, "Contact already exists");
		}

		contact = await prisma.contact.create({
			data: {
				projectId: project.id,
				email,
				subscribed,
				data: data ? JSON.stringify(data) : null,
			},
		});

		await redis.del(Keys.Project.contacts(project.id));
		await redis.del(Keys.Contact.id(contact.id));
		await redis.del(Keys.Contact.email(project.id, email));

		return res.status(200).json({
			success: true,
			id: contact.id,
			email: contact.email,
			subscribed: contact.subscribed,
			data: contact.data,
			createdAt: contact.createdAt,
			updatedAt: contact.updatedAt,
		});
	}

	@Put()
	@Middleware([isValidSecretKey])
	public async updateContact(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id, email, subscribed, data } = ContactSchemas.manage.parse(req.body);

		let contact = id ? await ContactService.id(id) : await ContactService.email(project.id, email as string);

		if (!contact || contact.projectId !== project.id) {
			throw new NotFound("contact");
		}

		const updateData: Record<string, unknown> = {
			email,
			subscribed: subscribed ?? contact.subscribed,
		};

		if (data) {
			const givenUserData = Object.entries(data);
			const dataToUpdate = JSON.parse(contact.data ?? "{}");

			givenUserData.forEach(([key, value]) => {
				if (!value) {
					delete dataToUpdate[key];
				} else {
					dataToUpdate[key] = value;
				}
			});

			updateData.data = JSON.stringify(dataToUpdate);
		}

		contact = await prisma.contact.update({
			where: { id: contact.id },
			data: updateData,
		});

		await redis.del(Keys.Project.contacts(project.id));
		await redis.del(Keys.Contact.id(contact.id));
		await redis.del(Keys.Contact.email(project.id, contact.email));

		return res.status(200).json({
			success: true,
			id: contact.id,
			email: contact.email,
			subscribed: contact.subscribed,
			data: contact.data,
			createdAt: contact.createdAt,
			updatedAt: contact.updatedAt,
		});
	}

	@Delete()
	@Middleware([isValidSecretKey])
	public async deleteContact(req: Request, res: Response) {
		const { sk } = res.locals.auth as ISecret;

		const project = await ProjectService.secret(sk);

		if (!project) {
			throw new NotFound("project");
		}

		const { id } = UtilitySchemas.id.parse(req.body);

		const contact = await ContactService.id(id);

		if (!contact || contact.projectId !== project.id) {
			throw new NotFound("contact");
		}

		await prisma.contact.delete({ where: { id } });

		await redis.del(Keys.Project.contacts(project.id));
		await redis.del(Keys.Contact.id(contact.id));
		await redis.del(Keys.Contact.email(project.id, contact.email));

		return res.status(200).json({
			success: true,
			id: contact.id,
			email: contact.email,
			subscribed: contact.subscribed,
			data: contact.data,
			createdAt: contact.createdAt,
			updatedAt: contact.updatedAt,
		});
	}
}

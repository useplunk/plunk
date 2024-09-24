import type { Contact, Event, Project } from "@prisma/client";
import dayjs from "dayjs";
import { prisma } from "../database/prisma";
import { ContactService } from "./ContactService";
import { EmailService } from "./EmailService";
import { Keys } from "./keys";
import { wrapRedis } from "./redis";

export class ActionService {
	/**
	 * Gets an action by its ID
	 * @param id
	 */
	public static id(id: string) {
		return wrapRedis(Keys.Action.id(id), async () => {
			return prisma.action.findUnique({
				where: { id },
				include: {
					events: true,
					notevents: true,
					triggers: true,
					emails: true,
					template: true,
				},
			});
		});
	}

	/**
	 * Gets all actions that share an event with the action with the given ID
	 * @param id
	 */
	public static related(id: string) {
		return wrapRedis(Keys.Action.related(id), async () => {
			const action = await ActionService.id(id);

			if (!action) {
				return [];
			}

			return prisma.action.findMany({
				where: {
					events: { some: { id: { in: action.events.map((e) => e.id) } } },
					id: { not: action.id },
				},
				include: { events: true },
			});
		});
	}

	/**
	 * Gets all actions that have an event as a trigger
	 * @param eventId
	 */
	public static event(eventId: string) {
		return wrapRedis(Keys.Action.event(eventId), async () => {
			return prisma.event.findUniqueOrThrow({ where: { id: eventId } }).actions({
				include: { events: true, template: true, notevents: true },
			});
		});
	}

	/**
	 * Takes a contact and an event and triggers all required actions
	 * @param contact
	 * @param event
	 * @param project
	 */
	public static async trigger({ event, contact, project }: { event: Event; contact: Contact; project: Project }) {
		const actions = await ActionService.event(event.id);

		const triggers = await ContactService.triggers(contact.id);

		for (const action of actions) {
			const hasTriggeredAction = !!triggers.find((t) => t.actionId === action.id);

			if (action.runOnce && hasTriggeredAction) {
				// User has already triggered this run once action
				continue;
			}

			if (action.notevents.length > 0 && action.notevents.some((e) => triggers.some((t) => t.eventId === e.id))) {
				continue;
			}

			let triggeredEvents = triggers.filter((t) => t.eventId === event.id);

			if (hasTriggeredAction) {
				const lastActionTrigger = triggers.filter((t) => t.contactId === contact.id && t.actionId === action.id)[0];

				triggeredEvents = triggeredEvents.filter((e) => e.createdAt > lastActionTrigger.createdAt);
			}

			const updatedTriggers = [...new Set(triggeredEvents.map((t) => t.eventId))];
			const requiredTriggers = action.events.map((e) => e.id);

			if (updatedTriggers.sort().join(",") !== requiredTriggers.sort().join(",")) {
				// Not all required events have been triggered
				continue;
			}

			await prisma.trigger.create({
				data: { actionId: action.id, contactId: contact.id },
			});

			if (!contact.subscribed && action.template.type === "MARKETING") {
				continue;
			}

			if (action.delay === 0) {
				const { subject, body } = EmailService.format({
					subject: action.template.subject,
					body: action.template.body,
					data: {
						plunk_id: contact.id,
						plunk_email: contact.email,
						...JSON.parse(contact.data ?? "{}"),
					},
				});

				const { messageId } = await EmailService.send({
					from: {
						name: action.template.from ?? project.from ?? project.name,
						email: project.verified && project.email ? action.template.email ?? project.email : "no-reply@useplunk.dev",
					},
					to: [contact.email],
					content: {
						subject,
						html: EmailService.compile({
							content: body,
							footer: {
								unsubscribe: action.template.type === "MARKETING",
							},
							contact: {
								id: contact.id,
							},
							project: {
								name: project.name,
							},
							isHtml: action.template.style === "HTML",
						}),
					},
				});

				await prisma.email.create({
					data: {
						messageId,
						actionId: action.id,
						contactId: contact.id,
					},
				});
			} else {
				await prisma.task.create({
					data: {
						actionId: action.id,
						contactId: contact.id,
						runBy: dayjs().add(action.delay, "minutes").toDate(),
					},
				});
			}
		}
	}
}

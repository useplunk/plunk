import { TemplateStyle, TemplateType } from "@prisma/client";
import { z } from "zod";

const email = z
	.string({ invalid_type_error: "Email needs to be a string", required_error: "Email is required" })
	.email({ message: "Invalid email address" })
	.transform((e) => e.toLowerCase());

const password = z.string().min(6, "Password needs to be at least 6 characters long");

const id = z
	.string({ invalid_type_error: "ID needs to be a string", required_error: "ID is required" })
	.uuid({ message: "Id needs to be a valid UUID" });

export const UtilitySchemas = {
	id: z.object({
		id,
	}),
	email: z.object({
		email,
	}),
	pagination: z.object({
		page: z
			.number({
				invalid_type_error: "Page needs to be a number",
				required_error: "Page is required",
			})
			.min(1, "Page needs to be at least 1")
			.default(1)
			.or(
				z.string().transform((s) => {
					return Number(s);
				}),
			),
	}),
};

export const UserSchemas = {
	credentials: z.object({
		email: email,
		password: password,
	}),
};

const zodSchema = z.record(
	z.union(
		[
			z
				.string({
					invalid_type_error:
						"Metadata can only be a string, array of strings or a non-persistent object (https://docs.useplunk.com/working-with-contacts/metadata#non-persistent-metadata)",
				})
				.transform((s) => {
					return { persistent: true, value: s };
				}),
			z
				.array(
					z.string({
						invalid_type_error:
							"Metadata can only be a string, array of strings or a non-persistent object (https://docs.useplunk.com/working-with-contacts/metadata#non-persistent-metadata)",
					}),
				)
				.transform((s) => {
					return { persistent: true, value: s };
				}),
			z.object(
				{
					persistent: z.boolean({ invalid_type_error: "Persistent should be a boolean" }).optional().default(true),
					value: z.union([z.string(), z.array(z.string())], {
						invalid_type_error:
							"Metadata can only be a string, array of strings or a non-persistent object (https://docs.useplunk.com/working-with-contacts/metadata#non-persistent-metadata)",
					}),
				},
				{
					invalid_type_error:
						"Metadata can only be a string, array of strings or a non-persistent object (https://docs.useplunk.com/working-with-contacts/metadata#non-persistent-metadata)",
				},
			),
		],
		{
			invalid_type_error:
				"Metadata can only be a string, array of strings or a non-persistent object (https://docs.useplunk.com/working-with-contacts/metadata#non-persistent-metadata)",
		},
	),
	{ invalid_type_error: "Metadata should be an object (https://docs.useplunk.com/working-with-contacts/metadata)" },
);
export const EventSchemas = {
	post: z.object({
		email,
		subscribed: z
			.boolean({
				invalid_type_error:
					"Subscribed should be a boolean. Read more: https://docs.useplunk.com/api-reference/actions/track",
			})
			.nullish(),
		event: z
			.string({
				required_error: "Event is required. Read more: https://docs.useplunk.com/api-reference/actions/track",
				invalid_type_error: "Event can only be a string. Read more: https://docs.useplunk.com/api-reference/actions/track",
			})
			.transform((n) => n.toLowerCase())
			.transform((n) => n.replace(/ /g, "-")),
		data: zodSchema.nullish(),
	}),
	send: z.object({
		subscribed: z.boolean({ invalid_type_error: "Subscribed should be a boolean" }).nullish(),
		from: email.nullish(),
		name: z.string().nullish(),
		reply: email.nullish(),
		to: z
			.array(email)
			.max(5, "You can only send transactional emails to 5 people at a time")
			.or(email.transform((e) => [e])),
		subject: z.string({
			required_error: "Subject is required. Read more: https://docs.useplunk.com/api-reference/transactional/send",
		}),
		body: z.string({
			required_error: "Body is required. Read more: https://docs.useplunk.com/api-reference/transactional/send",
		}),
		headers: z.record(z.string()).nullish(),
		attachments: z.array(z.object({
			filename: z.string(),
			content: z.string(), // Base64 encoded content
			contentType: z.string(),
		})).max(5, "You can only include up to 5 attachments").nullish(),
	}),
};

export const CampaignSchemas = {
	send: z.object({
		id,
		live: z.boolean().default(false),
		delay: z.number().int("Delay needs to be a whole number").nonnegative("Delay needs to be a positive number"),
	}),
	create: z.object({
		subject: z
			.string()
			.min(1, "Subject needs to be at least 1 character long")
			.max(70, "Subject needs to be less than 70 characters long"),
		body: z.string().min(1, "Body needs to be at least 1 character long"),
		email: email.nullish().or(z.literal("")),
		from: z.string().nullish(),
		recipients: z.array(z.string()),
		style: z.nativeEnum(TemplateStyle).default("PLUNK"),
	}),
	update: z.object({
		id,
		subject: z
			.string()
			.min(1, "Subject needs to be at least 1 character long")
			.max(70, "Subject needs to be less than 70 characters long"),
		body: z.string().min(1, "Body needs to be at least 1 character long"),
		email: email.nullish().or(z.literal("")),
		from: z.string().nullish(),
		recipients: z.array(z.string()),
		style: z.nativeEnum(TemplateStyle).default("PLUNK"),
	}),
};

export const ActionSchemas = {
	create: z.object({
		name: z.string().min(1, "Name needs to be at least 1 character long"),
		runOnce: z.boolean().default(false),
		delay: z.number().int("Delay needs to be a whole number").nonnegative("Delay needs to be a positive number"),
		template: id,
		events: z.array(id).min(1, "Select at least one event"),
		notevents: z.array(id).optional().default([]),
	}),
	update: z.object({
		id,
		name: z.string().min(1, "Name needs to be at least 1 character long"),
		runOnce: z.boolean().default(false),
		delay: z.number().int("Delay needs to be a whole number").nonnegative("Delay needs to be a positive number"),
		template: id,
		events: z.array(id).default([]),
		notevents: z.array(id).optional().default([]),
	}),
};

export const ContactSchemas = {
	create: z.object({
		email,
		data: z
			.object({})
			.catchall(z.union([z.string(), z.array(z.string())]))
			.or(z.string().transform((s) => (s === "" ? null : JSON.parse(s))))
			.nullish(),
		subscribed: z.boolean(),
	}),
	manage: z
		.object({
			id: id.optional(),
			email: email.optional(),
			data: z
				.object({})
				.catchall(z.union([z.string(), z.array(z.string()), z.null()]))
				.or(z.string().transform((s) => (s === "" ? null : JSON.parse(s))))
				.nullish(),
			subscribed: z.boolean().nullish(),
		})
		.refine(
			(data) => {
				return data.id || data.email;
			},
			{ message: "Either id or email should be specified" },
		)
		.refine(
			(data) => {
				// if id and email are both present
				return !(data.id && data.email);
			},
			{ message: "Either id or email should be specified" },
		),
};

export const TemplateSchemas = {
	create: z.object({
		subject: z.string().min(1, "Subject can't be empty").max(70, "Subject needs to be less than 70 characters long"),
		body: z.string().min(1, "Body can't be empty"),
		email: email.nullish().or(z.literal("")),
		from: z.string().nullish(),
		type: z.nativeEnum(TemplateType).default("MARKETING"),
		style: z.nativeEnum(TemplateStyle).default("PLUNK"),
	}),
	update: z.object({
		id,
		subject: z.string().min(1, "Subject can't be empty").max(70, "Subject needs to be less than 70 characters long"),
		body: z.string().min(1, "Body can't be empty"),
		email: email.nullish().or(z.literal("")),
		from: z.string().nullish(),
		type: z.nativeEnum(TemplateType).default("MARKETING"),
		style: z.nativeEnum(TemplateStyle).default("PLUNK"),
	}),
};

export const MembershipSchemas = {
	invite: z.object({
		id,
		email,
		role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
	}),
	kick: z.object({
		id,
		email,
	}),
};

export const ProjectSchemas = {
	secret: z.object({
		secret: z.string(),
	}),
	create: z.object({
		name: z.string().min(1, "Name can't be empty"),

		url: z
			.string()
			.regex(/^(?:(?:https?):\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/)
			.transform((u) => (u.startsWith("http") ? u : `https://${u}`)),
	}),
	update: z.object({
		id: id,
		name: z.string().min(1, "Name can't be empty"),

		url: z
			.string()
			.regex(/^(?:(?:https?):\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/)
			.transform((u) => (u.startsWith("http") ? u : `https://${u}`)),
	}),
	analytics: z.object({
		method: z.enum(["week", "month", "year"]).default("week"),
	}),
};

export const IdentitySchemas = {
	create: z.object({
		id: id,
		email: email.refine(
			(e) => {
				return !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "useplunk.com", "useplunk.dev"].includes(
					e.split("@")[1],
				);
			},
			{ message: "Please use your own domain" },
		),
	}),
	update: z.object({
		id: id,
		from: z.string().min(1, "Name can't be empty"),
	}),
};

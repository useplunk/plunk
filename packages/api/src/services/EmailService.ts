import mjml2html from "mjml";
import { APP_URI, AWS_SES_CONFIGURATION_SET } from "../app/constants";
import { ses } from "../util/ses";
import { DEFAULT_BASE_TEMPLATE, DEFAULT_FOOTER, TemplatingLanguage } from "@plunk/shared";
import Handlebars from "handlebars";

export class EmailService {
	public static async send({
		from,
		to,
		content,
		reply,
		headers,
		attachments,
	}: {
		from: {
			name: string;
			email: string;
		};
		reply?: string;
		to: string[];
		content: {
			subject: string;
			html: string;
		};
		headers?: {
			[key: string]: string;
		} | null;
		attachments?: Array<{
			filename: string;
			content: string;
			contentType: string;
		}> | null;
	}) {
		// Check if the body contains an unsubscribe link
		const regex = /unsubscribe\/([a-f\d-]+)"/;
		const containsUnsubscribeLink = content.html.match(regex);

		let unsubscribeLink = "";
		if (containsUnsubscribeLink?.[1]) {
			const unsubscribeId = containsUnsubscribeLink[1];
			unsubscribeLink = `List-Unsubscribe: <https://${APP_URI}/unsubscribe/${unsubscribeId}>`;
		}

		// Generate a unique boundary for multipart messages
		const boundary = `----=_NextPart_${Math.random().toString(36).substring(2)}`;
		const mixedBoundary = attachments?.length ? `----=_MixedPart_${Math.random().toString(36).substring(2)}` : null;

		const rawMessage = `From: ${from.name} <${from.email}>
To: ${to.join(", ")}
Reply-To: ${reply || from.email}
Subject: ${content.subject}
MIME-Version: 1.0
${
	mixedBoundary 
		? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
		: `Content-Type: multipart/alternative; boundary="${boundary}"`
}
${
	headers
		? Object.entries(headers)
				.map(([key, value]) => `${key}: ${value}`)
				.join("\n")
		: ""
}
${unsubscribeLink}

${mixedBoundary ? `--${mixedBoundary}\n` : ""}${
	mixedBoundary 
		? `Content-Type: multipart/alternative; boundary="${boundary}"\n\n` 
		: ""
}--${boundary}
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 7bit

${EmailService.breakLongLines(content.html, 500)}
--${boundary}--
${
	attachments?.length 
		? attachments.map(attachment => `
--${mixedBoundary}
Content-Type: ${attachment.contentType}
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="${attachment.filename}"

${EmailService.breakLongLines(attachment.content, 76, true)}
`).join('\n')
		: ""
}${mixedBoundary ? `\n--${mixedBoundary}--` : ""}`;

		const response = await ses.sendRawEmail({
			Destinations: to,
			ConfigurationSetName: AWS_SES_CONFIGURATION_SET,
			RawMessage: {
				Data: new TextEncoder().encode(rawMessage),
			},
			Source: `${from.name} <${from.email}>`,
		});

		if (!response.MessageId) {
			throw new Error("Could not send email");
		}

		return { messageId: response.MessageId };
	}

	public static compile({
		content,
		footer,
		contact,
		project,
		isHtml,
	}: {
		content: string;

		project: {
			name: string;
			baseTemplate: string | null;
			unsubscribeFooter: string | null;
		};
		contact: {
			id: string;
		};
		footer: {
			unsubscribe?: boolean;
		};
		isHtml?: boolean;
	}) {
		const html = content.replace(/<img/g, "<img");

		const unsubscribeLink = `${APP_URI.startsWith("https://") ? APP_URI : `https://${APP_URI}`}/unsubscribe/${contact.id}`;		

		if(isHtml) {
			let unsubscribeFooter: string = '';

			if(footer.unsubscribe) {
				const result = mjml2html((project.unsubscribeFooter ?? DEFAULT_FOOTER).replace("{{unsubscribe_url}}", unsubscribeLink).replace("{{project_name}}", project.name));
				if(result.errors.length > 0) {
					throw new Error(result.errors[0].message);
				}
				unsubscribeFooter = result.html.replace(/^\s+|\s+$/g, "");
			}
			return `${html}

${unsubscribeFooter}`;
		}

		let unsubscribeFooter: string = '';

		if(footer.unsubscribe) {
			unsubscribeFooter = (project.unsubscribeFooter ?? DEFAULT_FOOTER).replace("{{unsubscribe_url}}", unsubscribeLink).replace("{{project_name}}", project.name);
		}

    	const compiledTemplate = (project.baseTemplate ?? DEFAULT_BASE_TEMPLATE).replace("{{html}}", html).replace("{{unsubscribe_footer}}", unsubscribeFooter);

		const result = mjml2html(compiledTemplate);
		if(result.errors.length > 0) {
			throw new Error(result.errors[0].message);
		}
    	return result.html.replace(/^\s+|\s+$/g, "");
	}

	public static format({ templatingLanguage, subject, body, data }: { templatingLanguage: TemplatingLanguage; subject: string; body: string; data: { plunk_id: string, plunk_email: string} & Record<string, string> }) {
		if (templatingLanguage === "HANDLEBARS") {
			Handlebars.registerHelper("default", (expected, defaultValue) => expected ?? defaultValue);
			return {
				subject: Handlebars.compile(subject)(data),
				body: Handlebars.compile(body)(data),
			};
		}
		return {
			subject: subject.replace(/\{\{(.*?)}}/g, (match, key) => {
				const [mainKey, defaultValue] = key.split("??").map((s: string) => s.trim());
				return data[mainKey] ?? defaultValue ?? "";
			}),
			body: body.replace(/\{\{(.*?)}}/g, (match, key) => {
				const [mainKey, defaultValue] = key.split("??").map((s: string) => s.trim());
				if (Array.isArray(data[mainKey])) {
					return data[mainKey].map((e: string) => `<li>${e}</li>`).join("\n");
				}
				return data[mainKey] ?? defaultValue ?? "";
			}),
		};
	}

	private static breakLongLines(input: string, maxLineLength: number, isBase64: boolean = false): string {
		if (isBase64) {
			// For base64 content, break at exact intervals without looking for spaces
			const result = [];
			for (let i = 0; i < input.length; i += maxLineLength) {
				result.push(input.substring(i, i + maxLineLength));
			}
			return result.join("\n");
		} else {
			// Original implementation for text content
			const lines = input.split("\n");
			const result = [];
			for (let line of lines) {
				while (line.length > maxLineLength) {
					let pos = maxLineLength;
					while (pos > 0 && line[pos] !== " ") {
						pos--;
					}
					if (pos === 0) {
						pos = maxLineLength;
					}
					result.push(line.substring(0, pos));
					line = line.substring(pos).trim();
				}
				result.push(line);
			}
			return result.join("\n");
		}
	}
}

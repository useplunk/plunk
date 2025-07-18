import mjml2html from "mjml";
import { APP_URI, AWS_SES_CONFIGURATION_SET } from "../app/constants";
import { ses } from "../util/ses";

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

		if (isHtml) {
			return `${html}

${
	footer.unsubscribe
		? ` <table align="center" width="100%" style="max-width: 480px; width: 100%; margin-left: auto; margin-right: auto; font-family: Inter, ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'; border: 0; cellpadding: 0; cellspacing: 0;" role="presentation">
      <tbody>
        <tr>
          <td>
            <hr style="border: none; border-top: 1px solid #eaeaea; width: 100%; margin-top: 12px; margin-bottom: 12px;">
            <p style="font-size: 12px; line-height: 24px; margin: 16px 0; text-align: center; color: rgb(64, 64, 64);">
              You received this email because you agreed to receive emails from ${project.name}. If you no longer wish to receive emails like this, please 
              <a href="${APP_URI.startsWith("https://") ? APP_URI : `https://${APP_URI}`}/unsubscribe/${contact.id}">update your preferences</a>.
            </p>
          </td>
        </tr>
      </tbody>
    </table>`
		: ""
}`;
		}
		return mjml2html(
			`<mjml>
  <mj-head>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" />
    <mj-style inline="inline">
      .prose {
        color: #4a5568;
        max-width: 600px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
      }

      .prose [class~="lead"] {
        color: #4a5568;
        font-size: 20px;
        line-height: 32px;
        margin-top: 19px;
        margin-bottom: 19px;
      }

      .prose a {
        color: #1a202c;
        text-decoration: underline;
      }

      .prose strong {
        color: #1a202c;
        font-weight: 600;
      }

      .prose ol {
        counter-reset: list-counter;
        margin-top: 20px;
        margin-bottom: 20px;
      }

      .prose ol > li {
        position: relative;
        counter-increment: list-counter;
        padding-left: 28px;
      }

      .prose ol > li::before {
        content: counter(list-counter) ".";
        position: absolute;
        font-weight: 400;
        color: #718096;
      }

      .prose ul > li {
        position: relative;
        padding-left: 28px;
      }

      .prose ul > li::before {
        content: "";
        position: absolute;
        background-color: #cbd5e0;
        border-radius: 50%;
        width: 6px;
        height: 6px;
        top: 11px;
        left: 4px;
      }

      .prose hr {
        border-color: #e2e8f0;
        border-top-width: 1px;
        margin-top: 42px;
        margin-bottom: 42px;
      }

      .prose blockquote {
        font-weight: 500;
        font-style: italic;
        color: #1a202c;
        border-left: 4px solid #e2e8f0;
        quotes: initial;
        margin-top: 25px;
        margin-bottom: 25px;
        padding-left: 16px;
      }

      .prose h1 {
        color: #1a202c;
        font-weight: 800;
        font-size: 36px;
        margin-top: 0px;
        margin-bottom: 14px;
        line-height: 40px;
      }

      .prose h2 {
        color: #1a202c;
        font-weight: 700;
        font-size: 24px;
        margin-top: 32px;
        margin-bottom: 16px;
        line-height: 32px;
      }

      .prose h3 {
        color: #1a202c;
        font-weight: 600;
        font-size: 20px;
        margin-top: 25px;
        margin-bottom: 9.6px;
        line-height: 32px;
      }

      .prose h4 {
        color: #1a202c;
        font-weight: 600;
        margin-top: 24px;
        margin-bottom: 8px;
        line-height: 1.5;
      }

      .prose figure figcaption {
        color: #718096;
        font-size: 14px;
        line-height: 1.4;
        margin-top: 14px;
      }

      .prose code {
        color: #1a202c;
        font-weight: 600;
        font-size: 14px;
      }

      .prose code::before {
        content: "\`";
      }

      .prose code::after {
        content: "\`";
      }

      .prose pre {
        color: #e2e8f0;
        background-color: #2d3748;
        overflow-x: auto;
        font-size: 14px;
        line-height: 1.7142857;
        margin-top: 27px;
        margin-bottom: 27px;
        border-radius: 6px;
        padding-top: 13px;
        padding-right: 18px;
        padding-bottom: 13px;
        padding-left: 18px;
      }

      .prose pre code {
        background-color: transparent;
        border-width: 0;
        border-radius: 0;
        padding: 0;
        font-weight: 400;
        color: inherit;
        font-size: inherit;
        font-family: inherit;
        line-height: inherit;
      }

      .prose pre code::before {
        content: "";
      }

      .prose pre code::after {
        content: "";
      }

      .prose table {
        width: 100%;
        table-layout: auto;
        margin-top: 32px;
        margin-bottom: 32px;
        font-size: 11px;
        line-height: 1.7142857;
      }

      .prose thead {
        color: #1a202c;
        font-weight: 600;
        border-bottom: 1px solid #cbd5e0;
      }

      .prose thead th {
        vertical-align: bottom;
        padding-right: 9px;
        padding-bottom: 9px;
        padding-left: 9px;
      }

      .prose tbody tr {
        border-bottom: 1px solid #e2e8f0;
      }

      .prose tbody tr:last-child {
        border-bottom-width: 0;
      }

      .prose tbody td {
        vertical-align: top;
        padding-top: 9px;
        padding-right: 9px;
        padding-bottom: 9px;
        padding-left: 9px;
      }

      .prose {
        font-size: 16px;
        line-height: 1.75;
      }

      .prose p {
        margin-top: 20px;
        margin-bottom: 20px;
      }

      .prose img {
        margin-top: 32px;
        margin-bottom: 32px;
        max-width: 100%;
        height: auto;
        display: block;
      }

      .prose video {
        margin-top: 32px;
        margin-bottom: 32px;
      }

      .prose figure {
        margin-top: 32px;
        margin-bottom: 32px;
      }

      .prose figure > * {
        margin-top: 0;
        margin-bottom: 0;
      }

      .prose h2 code {
        font-size: 14px;
      }

      .prose h3 code {
        font-size: 14px;
      }

      .prose ul {
        margin-top: 20px;
        margin-bottom: 20px;
      }

      .prose li {
        margin-top: 8px;
        margin-bottom: 8px;
      }

      .prose ol > li:before {
        left: 0;
      }

      .prose > ul > li p {
        margin-top: 12px;
        margin-bottom: 12px;
      }

      .prose > ul > li > *:first-child {
        margin-top: 20px;
      }

      .prose > ul > li > *:last-child {
        margin-bottom: 20px;
      }

      .prose > ol > li > *:first-child {
        margin-top: 20px;
      }

      .prose > ol > li > *:last-child {
        margin-bottom: 20px;
      }

      .prose ul ul,
      .prose ul ol,
      .prose ol ul,
      .prose ol ol {
        margin-top: 12px;
        margin-bottom: 12px;
      }

      .prose hr + * {
        margin-top: 0;
      }

      .prose h2 + * {
        margin-top: 0;
      }

      .prose h3 + * {
        margin-top: 0;
      }

      .prose h4 + * {
        margin-top: 0;
      }

      .prose thead th:first-child {
        padding-left: 0;
      }

      .prose thead th:last-child {
        padding-right: 0;
      }

      .prose tbody td:first-child {
        padding-left: 0;
      }

      .prose tbody td:last-child {
        padding-right: 0;
      }

      .prose > :first-child {
        margin-top: 0;
      }

      .prose > :last-child {
        margin-bottom: 0;
      }
    </mj-style>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-raw>
          <tr class="prose prose-neutral">
            <td style="padding:10px 25px;word-break:break-word">
              ${html}
            </td>
          </tr>
        </mj-raw>
      </mj-column>
    </mj-section>
     <mj-section>
      <mj-column>
        ${
									footer.unsubscribe
										? `
              <mj-divider border-width="2px" border-color="#f5f5f5"></mj-divider>
              <mj-text align="center">
                <p style="color: #a3a3a3; text-decoration: none; font-size: 12px; line-height: 1.7142857;">
                  You received this email because you agreed to receive emails from ${project.name}. If you no longer wish to receive emails like this, please <a style="text-decoration: underline" href="${APP_URI.startsWith("https://") ? APP_URI : `https://${APP_URI}`}/unsubscribe/${contact.id}" target="_blank">update your preferences</a>.
                </p>
              </mj-text>
            `
										: ""
								}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
		).html.replace(/^\s+|\s+$/g, "");
	}

	public static format({ subject, body, data }: { subject: string; body: string; data: Record<string, string> }) {
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

import "dotenv/config";

import { simpleParser } from "mailparser";
import signale from "signale";
import {
	SMTPServer,
	type SMTPServerAddress,
	type SMTPServerAuthentication,
	type SMTPServerAuthenticationResponse,
	type SMTPServerDataStream,
	type SMTPServerSession,
} from "smtp-server";
import { API_URI } from "./lib/constants";
import { prisma } from "./lib/prisma";

const server = new SMTPServer({
	async onAuth(
		auth: SMTPServerAuthentication,
		session: SMTPServerSession,
		callback: (err: Error | null | undefined, response?: SMTPServerAuthenticationResponse) => void,
	) {
		if (auth.username?.toLowerCase() !== "plunk") {
			return callback(new Error("Invalid login"));
		}

		const project = await prisma.project.findUnique({
			where: {
				secret: auth.password,
			},
		});

		if (!project) {
			return callback(new Error("Invalid login"));
		}

		callback(null, {
			user: project.secret,
		});
	},
	async onMailFrom(address: SMTPServerAddress, session: SMTPServerSession, callback: (err?: Error | null) => void) {
		const project = await prisma.project.findFirst({
			where: {
				email: {
					endsWith: address.address.split("@")[1],
				},
			},
		});

		if (!project || project.secret !== session.user) {
			return callback(new Error("This domain is not associated with your account"));
		}

		if (!project.verified) {
			return callback(new Error("Please verify your domain before sending emails"));
		}

		callback();
	},
	async onRcptTo(address: SMTPServerAddress, session: SMTPServerSession, callback: (err?: Error | null) => void) {
		if (session.envelope.rcptTo.length > 5) {
			return callback(new Error("Too many recipients"));
		}

		callback();
	},
	onData(stream: SMTPServerDataStream, session: SMTPServerSession, callback: (err?: Error | null) => void) {
		simpleParser(stream, async (err, parsed) => {
			if (err) {
				return callback(err);
			}

			if (!parsed.from) {
				return callback(new Error("No sender"));
			}

			if (!parsed.to || !("value" in parsed.to)) {
				return callback(new Error("No recipients"));
			}

			try {
				await fetch(`${API_URI}/v1/send`, {
					method: "POST",
					body: JSON.stringify({
						from: parsed.from.text,
						to: parsed.to.value.map((to) => to.address),
						subject: parsed.subject,
						body: parsed.html,
					}),
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user}`,
					},
				});
			} catch (err) {
				signale.error(err);
				return callback(new Error("Failed to send email"));
			}

			callback();
		});
	},
});

server.listen(465, "0.0.0.0", () => {
	signale.success("SMTP server started on port 465");
});

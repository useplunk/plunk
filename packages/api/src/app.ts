import "dotenv/config";
import "express-async-errors";

import { STATUS_CODES } from "node:http";
import { Server } from "@overnightjs/core";
import compression from "compression";
import cookies from "cookie-parser";
import cors from "cors";
import { type NextFunction, type Request, type Response, json } from "express";
import helmet from "helmet";
import morgan from "morgan";
import signale from "signale";
import { API_URI, NODE_ENV, PORT } from "./app/constants";
import { task } from "./app/cron";
import { Auth } from "./controllers/Auth";
import { Identities } from "./controllers/Identities";
import { Memberships } from "./controllers/Memberships";
import { Projects } from "./controllers/Projects";
import { Tasks } from "./controllers/Tasks";
import { Users } from "./controllers/Users";
import { Webhooks } from "./controllers/Webhooks";
import { V1 } from "./controllers/v1";
import { prisma } from "./database/prisma";
import { HttpException } from "./exceptions";

const server = new (class extends Server {
	public constructor() {
		super();

		// Set the content-type to JSON for any request coming from AWS SNS
		this.app.use((req, res, next) => {
			if (req.get("x-amz-sns-message-type")) {
				req.headers["content-type"] = "application/json";
			}
			next();
		});

		this.app.use(
			compression({
				threshold: 0,
			}),
		);

		// Parse the rest of our application as json
		this.app.use(json({ limit: "50mb" }));
		this.app.use(cookies());
		this.app.use(helmet());

		this.app.use(["/v1", "/v1/track", "/v1/send"], (req, res, next) => {
			res.set({ "Access-Control-Allow-Origin": "*" });
			next();
		});

		this.app.use(
			cors({
				origin: [API_URI],
				credentials: true,
			}),
		);

		this.app.use(morgan(NODE_ENV === "development" ? "dev" : "short"));

		this.addControllers([
			new Auth(),
			new Users(),
			new Projects(),
			new Memberships(),
			new Webhooks(),
			new Identities(),
			new Tasks(),
			new V1(),
		]);

		this.app.use("*", () => {
			throw new HttpException(404, "Unknown route");
		});
	}
})();

server.app.use((req, res, next) => {
	console.log(`Incoming request: ${req.method} ${req.path}`);
	next();
});

server.app.use(
	(error: Error, req: Request, res: Response, _next: NextFunction) => {
		const code = error instanceof HttpException ? error.code : 500;

		if (NODE_ENV !== "development") {
			signale.error(error);
		}

		res.status(code).json({
			code,
			error: STATUS_CODES[code],
			message: error.message,
			time: Date.now(),
		});
	},
);

void prisma.$connect().then(() => {
	server.app.listen(PORT, () => {
		task.start();

		signale.success("[HTTPS] Ready on", PORT);
	});
});

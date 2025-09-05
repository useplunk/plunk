import cron from "node-cron";
import signale from "signale";

import { Identities } from "../controllers/Identities";
import { Tasks } from "../controllers/Tasks";

export const task = cron.schedule("* * * * *", async () => {
	signale.info("Running scheduled tasks");
	try {
		await (new Tasks().handleTasks());
	} catch (e) {
		signale.error("Failed to run scheduled tasks. Please check the error below");
		console.error(e);
	}

	signale.info("Updating verified identities");
	try {
		await (new Identities().updateIdentities());
	} catch (e) {
		signale.error("Failed to update verified identities. Please check the error below");
		console.error(e);
	}
});

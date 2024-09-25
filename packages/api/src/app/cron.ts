import cron from "node-cron";
import signale from "signale";
import { API_URI } from "./constants";

export const task = cron.schedule("* * * * *", () => {
	signale.info("Running scheduled tasks");
	try {
		void fetch(`${API_URI}/tasks`, {
			method: "POST",
		});
	} catch (e) {
		signale.error("Failed to run scheduled tasks. Please check the error below");
		console.error(e);
	}

	signale.info("Updating verified identities");
	try {
		void fetch(`${API_URI}/identities/update`, {
			method: "POST",
		});
	} catch (e) {
		signale.error("Failed to update verified identities. Please check the error below");
		console.error(e);
	}
});

import cron from "node-cron";
import signale from "signale";
import { API_URI } from "./constants";

export const task = cron.schedule("* * * * *", () => {
	signale.info("Running scheduled tasks");
	void fetch(`${API_URI}/tasks`, {
		method: "POST",
	});

	signale.info("Updating verified identities");
	void fetch(`${API_URI}/identities/update`, {
		method: "POST",
	});
});

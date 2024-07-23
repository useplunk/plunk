import { randomBytes } from "node:crypto";

/**
 * A function that generates a random 24 byte API secret
 * @param type
 */
export function generateToken(type: "secret" | "public") {
	return `${type === "secret" ? "sk" : "pk"}_${randomBytes(24).toString("hex")}`;
}

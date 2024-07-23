/**
 * Safely parse environment variables
 * @param key The key
 * @param defaultValue An optional default value if the environment variable does not exist
 */
export function validateEnv<T extends string = string>(
	key: keyof NodeJS.ProcessEnv,
	defaultValue?: T,
): T {
	const value = process.env[key] as T | undefined;

	if (!value) {
		if (typeof defaultValue !== "undefined") {
			return defaultValue;
		}
		throw new Error(`${key} is not defined in environment variables`);
	}

	return value;
}

// ENV
export const JWT_SECRET = validateEnv("JWT_SECRET");
export const PORT = validateEnv<`${number}`>("PORT", "4000");
export const NODE_ENV = validateEnv<"development" | "production">(
	"NODE_ENV",
	"production",
);

export const REDIS_URL = validateEnv("REDIS_URL");

// URLs
export const API_URI = validateEnv("API_URI", "http://localhost:8080");
export const APP_URI = validateEnv("APP_URI", "http://localhost:3000");

// AWS
export const AWS_REGION = validateEnv("AWS_REGION");
export const AWS_ACCESS_KEY_ID = validateEnv("AWS_SES_ACCESS_KEY_ID");
export const AWS_SECRET_ACCESS_KEY = validateEnv("AWS_SES_SECRET_ACCESS_KEY");
export const AWS_SES_CONFIGURATION_SET = validateEnv(
	"AWS_SES_CONFIGURATION_SET",
);

/**
 * Safely parse environment variables
 * @param key The key
 * @param defaultValue An optional default value if the environment variable does not exist
 */
export function validateEnv<T extends string = string>(key: keyof NodeJS.ProcessEnv, defaultValue?: T): T {
	const value = process.env[key] as T | undefined;

	if (!value) {
		if (typeof defaultValue !== "undefined") {
			return defaultValue;
		}
		throw new Error(`${key} is not defined in environment variables`);
	}

	return value;
}

export const API_URI = validateEnv("API_URI", "http://localhost:4000");

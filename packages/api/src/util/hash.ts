import bcrypt from "bcrypt";

/**
 * Verifies a hash against a password
 * @param {string} pass The password
 * @param {string} hash The hash
 */
export const verifyHash = (pass: string, hash: string) => {
	return new Promise((resolve, reject) => {
		void bcrypt.compare(pass, hash, (err, res) => {
			if (err) {
				return reject(err);
			}
			return resolve(res);
		});
	});
};

/**
 * Generates a hash from plain text
 * @param {string} pass The password
 * @returns {Promise<string>} Password hash
 */
export const createHash = (pass: string): Promise<string> => {
	return new Promise((resolve, reject) => {
		void bcrypt.hash(pass, 10, (err, res) => {
			if (err) {
				return reject(err);
			}
			resolve(res);
		});
	});
};

import dayjs from "dayjs";
import type { NextFunction, Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import { JWT_SECRET } from "../app/constants";
import { HttpException, NotAuthenticated } from "../exceptions";

export interface IJwt {
	type: "jwt";
	userId: string;
}

export interface ISecret {
	type: "secret";
	sk: string;
}

export interface IKey {
	type: "key";
	key: string;
}

/**
 * Middleware to check if this unsubscribe is authenticated on the dashboard
 * @param req
 * @param res
 * @param next
 */
export const isAuthenticated = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	res.locals.auth = { type: "jwt", userId: parseJwt(req) };

	next();
};

/**
 * Middleware to check if this request is signed with an API secret key
 * @param req
 * @param res
 * @param next
 */
export const isValidSecretKey = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	res.locals.auth = { type: "secret", sk: parseBearer(req, "secret") };

	next();
};

export const isValidKey = (req: Request, res: Response, next: NextFunction) => {
	res.locals.auth = { type: "key", key: parseBearer(req) };

	next();
};

export const jwt = {
	/**
	 * Extracts a unsubscribe id from a jwt
	 * @param token The JWT token
	 */
	verify(token: string): string | null {
		try {
			const verified = jsonwebtoken.verify(token, JWT_SECRET) as {
				id: string;
			};
			return verified.id;
		} catch (e) {
			return null;
		}
	},
	/**
	 * Signs a JWT token
	 * @param id The unsubscribe's ID to sign into a jwt token
	 */
	sign(id: string): string {
		return jsonwebtoken.sign({ id }, JWT_SECRET, {
			expiresIn: "168h",
		});
	},
	/**
	 * Find out when a JWT expires
	 * @param token The unsubscribe's jwt token
	 */
	expires(token: string): dayjs.Dayjs {
		const { exp } = jsonwebtoken.verify(token, JWT_SECRET) as {
			exp?: number;
		};
		return dayjs(exp);
	},
};

/**
 * Parse a unsubscribe's ID from the request JWT token
 * @param request The express request object
 */
export function parseJwt(request: Request): string {
	const token: string | undefined = request.cookies.token;

	if (!token) {
		throw new NotAuthenticated();
	}

	const id = jwt.verify(token);

	if (!id) {
		throw new NotAuthenticated();
	}

	return id;
}

/**
 * Parse a bearer token from the request headers
 * @param request The express request object
 * @param type
 */
export function parseBearer(
	request: Request,
	type?: "secret" | "public",
): string {
	const bearer: string | undefined = request.headers.authorization;

	if (!bearer) {
		throw new HttpException(401, "No authorization header passed");
	}

	if (!bearer.includes("Bearer")) {
		throw new HttpException(401, "Please add Bearer in front of your API key");
	}

	const split = bearer.split(" ");

	if (!(split[0] === "Bearer") || split.length > 2) {
		throw new HttpException(
			401,
			"Your authorization header is malformed. Please pass your API key as Bearer sk_...",
		);
	}

	if (!type && !split[1].startsWith("sk_") && !split[1].startsWith("pk_")) {
		throw new HttpException(
			401,
			"Your API key could not be parsed. API keys start with sk_ or pk_",
		);
	}

	if (!type) {
		return split[1];
	}

	if (type === "secret" && split[1].startsWith("pk_")) {
		throw new HttpException(
			401,
			"You attached a public key but this route may only be accessed with a secret key",
		);
	}

	if (type === "secret" && !split[1].startsWith("sk_")) {
		throw new HttpException(
			401,
			"Your secret key could not be parsed. Secret keys start with sk_ and should be passed in the authorization header as Bearer sk_...",
		);
	}

	if (type === "public" && !split[1].startsWith("pk_")) {
		throw new HttpException(
			401,
			"Your public key could not be parsed. Public keys start with pk_ and should be passed in the authorization header as Bearer sk_...",
		);
	}

	return split[1];
}

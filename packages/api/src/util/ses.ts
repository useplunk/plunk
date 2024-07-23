import { SES } from "@aws-sdk/client-ses";
import {
	AWS_ACCESS_KEY_ID,
	AWS_REGION,
	AWS_SECRET_ACCESS_KEY,
} from "../app/constants";

export const ses = new SES({
	apiVersion: "2010-12-01",
	region: AWS_REGION,
	credentials: {
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY,
	},
});

export const getIdentities = async (identities: string[]) => {
	const res = await ses.getIdentityVerificationAttributes({
		Identities: identities.flatMap((identity) => [identity.split("@")[1]]),
	});

	const parsedResult = Object.entries(res.VerificationAttributes ?? {});
	return parsedResult.map((obj) => {
		return { email: obj[0], status: obj[1].VerificationStatus };
	});
};

export const verifyIdentity = async (email: string) => {
	const DKIM = await ses.verifyDomainDkim({
		Domain: email.includes("@") ? email.split("@")[1] : email,
	});

	await ses.setIdentityMailFromDomain({
		Identity: email.includes("@") ? email.split("@")[1] : email,
		MailFromDomain: `plunk.${email.includes("@") ? email.split("@")[1] : email}`,
	});

	return DKIM.DkimTokens;
};

export const getIdentityVerificationAttributes = async (email: string) => {
	const attributes = await ses.getIdentityDkimAttributes({
		Identities: [email, email.split("@")[1]],
	});

	const parsedAttributes = Object.entries(attributes.DkimAttributes ?? {});

	return {
		email: parsedAttributes[0][0],
		tokens: parsedAttributes[0][1].DkimTokens,
		status: parsedAttributes[0][1].DkimVerificationStatus,
	};
};

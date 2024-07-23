import type { UtilitySchemas } from "@plunk/shared";
import type { User } from "@prisma/client";
import { motion } from "framer-motion";
import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { toast } from "sonner";
import { FullscreenLoader, Redirect } from "../../components";
import { useContact } from "../../lib/hooks/contacts";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
	const router = useRouter();

	if (!router.isReady) {
		return <FullscreenLoader />;
	}

	const { data: contact, error } = useContact({
		id: router.query.id as string,
		withProject: true,
	});
	const [submitted, setSubmitted] = useState<
		"initial" | "loading" | "submitted"
	>("initial");

	if (error) {
		return <Redirect to={"/"} />;
	}

	if (!contact) {
		return <FullscreenLoader />;
	}

	const subscribe = async () => {
		setSubmitted("loading");

		toast.promise(
			network.mock<User, typeof UtilitySchemas.id>(
				contact.project.public,
				"POST",
				"/v1/contacts/subscribe",
				{
					id: contact.id,
				},
			),
			{
				loading: "Subscribing...",
				success: "Thank you for subscribing!",
				error: "Could not subscribe you!",
			},
		);

		setSubmitted("submitted");
	};

	return (
		<>
			<NextSeo
				title={`Subscribe to ${contact.project.name}`}
				openGraph={{
					title: `Subscribe to ${contact.project.name}`,
				}}
				additionalMetaTags={[
					{
						property: "title",
						content: `Subscribe to ${contact.project.name}`,
					},
				]}
			/>
			<div
				className={
					"flex h-screen w-full flex-col items-center justify-center bg-neutral-50"
				}
			>
				<div
					className={
						"w-3/4 rounded border border-neutral-200 bg-white p-12 shadow-sm md:w-2/4 xl:w-2/6"
					}
				>
					{submitted === "submitted" ? (
						<>
							<motion.div className={"mb-3 flex items-center justify-center"}>
								<motion.svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									initial={{ pathLength: 0 }}
									animate={{ pathLength: 1 }}
									transition={{ duration: 0.3, delay: 0.2, ease: "easeInOut" }}
									className={
										"h-24 w-24 rounded-full bg-emerald-100 p-6 text-emerald-900"
									}
								>
									<motion.path
										d="M20 6 9 17l-5-5"
										initial={{ pathLength: 0 }}
										animate={{ pathLength: 1 }}
										transition={{
											duration: 0.3,
											delay: 0.2,
											ease: "easeInOut",
										}}
									/>
								</motion.svg>
							</motion.div>

							<h1
								className={
									"text-center text-2xl font-bold leading-tight text-neutral-800"
								}
							>
								You have been subscribed!
							</h1>
						</>
					) : (
						<>
							<h1
								className={
									"text-center text-2xl font-bold leading-tight text-neutral-800"
								}
							>
								Confirm your subscription?
							</h1>
							<p className={"mt-4 text-center text-sm text-neutral-500"}>
								By confirming your subscription to {contact.project.name} for{" "}
								{contact.email} you agree to receive emails from us.
							</p>
							<div className="relative mt-2 w-full">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.9 }}
									onClick={subscribe}
									className={
										"mt-5 flex w-full items-center justify-center rounded bg-neutral-800 py-2.5 text-sm font-medium text-white"
									}
								>
									{submitted === "loading" ? (
										<svg
											className="-ml-1 mr-3 h-6 w-6 animate-spin"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
									) : (
										"Subscribe"
									)}
								</motion.button>
							</div>
						</>
					)}
				</div>
			</div>
		</>
	);
}

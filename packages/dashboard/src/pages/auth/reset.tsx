import { zodResolver } from "@hookform/resolvers/zod";
import { UserSchemas, UtilitySchemas } from "@plunk/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Redirect } from "../../components";
import { network } from "../../lib/network";

interface ResetValues {
	password: string;
}

/**
 *
 */
export default function Index() {
	const router = useRouter();

	if (!router.query.id) {
		return <Redirect to={"/"} />;
	}

	const [submitted, setSubmitted] = useState(false);
	const [hidePassword, setHidePassword] = useState(true);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ResetValues>({
		resolver: zodResolver(UserSchemas.credentials.pick({ password: true })),
	});

	const resetPassword = async (data: ResetValues) => {
		const schema = UtilitySchemas.id.merge(
			UserSchemas.credentials.pick({ password: true }),
		);

		setSubmitted(true);
		await network.fetch<
			{
				success: true;
			},
			typeof schema
		>("POST", "/auth/reset", {
			id: router.query.id as string,
			...data,
		});

		return router.push("/auth/login");
	};

	return (
		<main className={"flex h-screen w-screen items-center justify-center"}>
			<div className={"space-y-6"}>
				<div>
					<svg
						className={
							"mx-auto h-14 w-14 rounded-full bg-blue-100 p-2 text-blue-900"
						}
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="1.5"
							d="M15 13.25C17.3472 13.25 19.25 11.3472 19.25 9C19.25 6.65279 17.3472 4.75 15 4.75C12.6528 4.75 10.75 6.65279 10.75 9C10.75 9.31012 10.7832 9.61248 10.8463 9.90372L4.75 16V19.25H8L8.75 18.5V16.75H10.5L11.75 15.5V13.75H13.5L14.0963 13.1537C14.3875 13.2168 14.6899 13.25 15 13.25Z"
						/>
						<path
							stroke="currentColor"
							d="M16.5 8C16.5 8.27614 16.2761 8.5 16 8.5C15.7239 8.5 15.5 8.27614 15.5 8C15.5 7.72386 15.7239 7.5 16 7.5C16.2761 7.5 16.5 7.72386 16.5 8Z"
						/>
					</svg>
				</div>
				<div className={"space-y-3 text-center"}>
					<h1 className={"text-4xl font-bold text-neutral-800"}>
						Reset password
					</h1>
					<p className={"text-neutral-700"}>
						Please enter your new password and confirm it.
					</p>
				</div>
				<form onSubmit={handleSubmit(resetPassword)} className="space-y-6">
					<div>
						<label
							htmlFor={"password"}
							className="block text-sm font-semibold text-neutral-600"
						>
							New password
						</label>
						<div className="relative mt-1">
							<input
								type={hidePassword ? "password" : "text"}
								placeholder={hidePassword ? "•••••••••••••" : "Password"}
								autoComplete={"current-password"}
								className={
									"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
								}
								{...register("password")}
							/>
							<div className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3">
								<svg
									onClick={() => setHidePassword(!hidePassword)}
									className="h-5 w-5 text-neutral-400"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									{hidePassword ? (
										<>
											<path
												fillRule="evenodd"
												d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
												clipRule="evenodd"
											/>
											<path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
										</>
									) : (
										<>
											<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
											<path
												fillRule="evenodd"
												d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
												clipRule="evenodd"
											/>
										</>
									)}
								</svg>
							</div>
						</div>
						<AnimatePresence>
							{errors.password?.message && (
								<motion.p
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									className="mt-1 text-xs text-red-500"
								>
									Password must be atleast 6 characters long
								</motion.p>
							)}
						</AnimatePresence>
					</div>

					<div>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.9 }}
							type="submit"
							className={
								"flex w-full items-center justify-center rounded-md bg-neutral-800 py-2.5 text-sm font-medium text-white"
							}
						>
							{submitted ? (
								<svg
									className="-ml-1 mr-3 h-5 w-5 animate-spin"
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
								"Change password"
							)}
						</motion.button>
					</div>
				</form>
			</div>
		</main>
	);
}

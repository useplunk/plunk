import { zodResolver } from "@hookform/resolvers/zod";
import { UserSchemas } from "@plunk/shared";
import type { User } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import logo from "../../../public/assets/logo.png";
import { FullscreenLoader, Redirect } from "../../components";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

/**
 *
 */
interface AuthValues {
	password: string;
	email: string;
	auth: string;
}

/**
 *
 */
export default function Index() {
	const router = useRouter();

	const { data: user, error, mutate } = useUser();

	const [submitted, setSubmitted] = useState(false);
	const [hidePassword, setHidePassword] = useState(true);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<AuthValues>({
		resolver: zodResolver(UserSchemas.credentials),
	});

	if (user && !error) {
		return <Redirect to={"/"} />;
	}

	if (!user && !error) {
		return <FullscreenLoader />;
	}

	const login = async (data: AuthValues) => {
		setSubmitted(true);
		const result = await network.fetch<
			| {
					success: true;
					data: User;
			  }
			| {
					success: false;
					data: string;
			  }
			| {
					success: "redirect";
					redirect: string;
			  },
			typeof UserSchemas.credentials
		>("POST", "/auth/login", {
			...data,
		});

		if (result.success === "redirect") {
			return router.push(result.redirect);
		}

		if (result.success) {
			await mutate(result.data);

			return router.push("/");
		}
		setError("auth", { message: result.data });

		setSubmitted(false);
	};

	return (
		<>
			<div className="bg-off-white flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
				<div className="flex flex-col items-center sm:mx-auto sm:w-full sm:max-w-md">
					<Image
						src={logo}
						placeholder={"blur"}
						width={35}
						height={35}
						alt={"Plunk Logo"}
					/>
					<h2 className="mt-4 text-center text-3xl font-bold text-neutral-800">
						Sign in to your account
					</h2>
				</div>

				<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
					<div className="rounded border border-neutral-200 bg-white px-4 py-8 sm:px-10">
						<form onSubmit={handleSubmit(login)} className="space-y-6">
							<div>
								<label
									htmlFor={"email"}
									className="block text-sm font-medium text-neutral-700"
								>
									Email
								</label>
								<div className="mt-1">
									<input
										type={"email"}
										className={
											"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
										}
										autoComplete={"email"}
										placeholder={"hello@useplunk.com"}
										{...register("email")}
									/>
								</div>
								<AnimatePresence>
									{errors.email?.message && (
										<motion.p
											initial={{ height: 0 }}
											animate={{ height: "auto" }}
											exit={{ height: 0 }}
											className="mt-1 text-xs text-red-500"
										>
											{errors.email.message}
										</motion.p>
									)}
								</AnimatePresence>
							</div>

							<div>
								<label
									htmlFor={"password"}
									className="block text-sm font-semibold text-neutral-600"
								>
									Password
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
											Password must be at least 6 characters long
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
										"Sign in"
									)}
								</motion.button>
								<AnimatePresence>
									{errors.auth?.message && (
										<motion.p
											initial={{ height: 0 }}
											animate={{ height: "auto" }}
											exit={{ height: 0 }}
											className="mt-1 text-xs text-red-500"
										>
											{errors.auth.message}
										</motion.p>
									)}
								</AnimatePresence>
							</div>
						</form>
					</div>
					<div className={"w-full text-center"}>
						<Link
							href={"/auth/signup"}
							passHref
							className={
								"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-500"
							}
						>
							Want to create an account instead?
						</Link>
					</div>
				</div>
			</div>
		</>
	);
}

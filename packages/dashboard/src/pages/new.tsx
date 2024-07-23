import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectSchemas } from "@plunk/shared";
import type { Project } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import Shared from "../../public/assets/shared.svg";
import { FullscreenLoader, Redirect } from "../components";
import { atomActiveProject } from "../lib/atoms/project";
import { useProjects } from "../lib/hooks/projects";
import { useUser } from "../lib/hooks/users";
import { network } from "../lib/network";

interface ProjectValues {
	name: string;
	url: string;
	error: string;
}

/**
 *
 */
export default function Index() {
	const router = useRouter();

	const [, setActiveProjectId] = useAtom(atomActiveProject);

	const { data: user, error } = useUser();
	const { data: projects, mutate } = useProjects();

	const [submitted, setSubmitted] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
		control,
	} = useForm<ProjectValues>({
		resolver: zodResolver(ProjectSchemas.create),
	});

	const { isValid } = useFormState({
		control,
	});

	if (error) {
		return <Redirect to={"auth/login"} />;
	}

	if (!user || !projects) {
		return <FullscreenLoader />;
	}

	const create = async (data: ProjectValues) => {
		setSubmitted(true);

		localStorage.removeItem("skip_onboarding");

		const result = await network.fetch<
			| {
					data: Project;
					success: true;
			  }
			| {
					success: false;
					data: string;
			  },
			typeof ProjectSchemas.create
		>("POST", "/projects/create", {
			...data,
			url: data.url.startsWith("http") ? data.url : `https://${data.url}`,
		});

		if (result.success) {
			await mutate([...projects, result.data]);
			localStorage.setItem("project", result.data.id);
			setActiveProjectId(result.data.id);
			return router.push("/");
		}
		setSubmitted(false);
		setError("error", { message: result.data });
	};

	return (
		<>
			<div className="flex min-h-screen">
				<div className="flex flex-1 flex-col justify-center px-4 py-12 sm:border-r-2 sm:border-neutral-100 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
					<div className="mx-auto w-full max-w-sm lg:w-96">
						<div>
							<h2 className="mt-6 text-3xl font-extrabold text-neutral-800">
								Create a new project
							</h2>
							<p className={"text-sm text-neutral-500"}>
								Get ready to take your emails to the next level.
							</p>
						</div>

						<div className="mt-8">
							<div className="mt-6">
								<form
									onSubmit={handleSubmit(create)}
									className="relative mt-2 w-full"
								>
									<div className="mt-4 flex flex-col">
										<label htmlFor="name" className="text-xs font-light">
											Project name
										</label>
										<input
											autoComplete={"off"}
											type="text"
											className={
												"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
											}
											placeholder="My project"
											{...register("name")}
										/>
										<AnimatePresence>
											{errors.name?.message && (
												<motion.p
													initial={{ height: 0 }}
													animate={{ height: "auto" }}
													exit={{ height: 0 }}
													className="mt-1 text-xs text-red-500"
												>
													{errors.name.message}
												</motion.p>
											)}
										</AnimatePresence>
									</div>

									<div className="mt-4 flex flex-col">
										<label htmlFor="url" className="text-xs font-light">
											Project URL
										</label>
										<div className="mt-1 flex rounded-md">
											<span className="inline-flex items-center rounded-l border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
												https://
											</span>
											<input
												type="text"
												className={
													"block w-full rounded-r border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
												}
												placeholder="www.example.com"
												{...register("url")}
											/>
										</div>

										<AnimatePresence>
											{errors.url?.message && (
												<motion.p
													initial={{ height: 0 }}
													animate={{ height: "auto" }}
													exit={{ height: 0 }}
													className="mt-1 text-xs text-red-500"
												>
													{errors.url.message}
												</motion.p>
											)}
										</AnimatePresence>
									</div>

									<AnimatePresence>
										{errors.error?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{errors.error.message}
											</motion.p>
										)}
									</AnimatePresence>
									<motion.button
										whileHover={isValid ? { scale: 1.05 } : {}}
										whileTap={isValid ? { scale: 0.9 } : {}}
										type="submit"
										disabled={!isValid || submitted}
										className={` ${
											isValid
												? "bg-neutral-800 text-white"
												: "bg-neutral-200 text-white"
										} mt-5 flex w-full items-center justify-center rounded py-2.5 text-sm font-medium transition`}
									>
										{submitted ? (
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
											<span
												className={"flex items-center justify-center gap-x-2"}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="24"
													height="24"
													viewBox="0 0 24 24"
													strokeWidth="1.5"
													stroke="currentColor"
													fill="none"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" />
													<path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" />
													<circle cx="15" cy="9" r="1" />
												</svg>
												Launch
											</span>
										)}
									</motion.button>
								</form>

								{projects.length > 0 ? (
									<div className={"w-full"}>
										<Link
											href={"/"}
											className={
												"mt-2 block text-center text-sm text-neutral-400 underline transition ease-in-out hover:text-neutral-600"
											}
										>
											Back to the dashboard
										</Link>
									</div>
								) : null}
							</div>
						</div>
					</div>
				</div>
				<div className="relative hidden w-0 flex-1 items-center justify-center bg-gradient-to-br from-blue-50 to-white lg:flex">
					<div
						className={
							"w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-9"
						}
					>
						<Shared />
					</div>
				</div>
			</div>
		</>
	);
}

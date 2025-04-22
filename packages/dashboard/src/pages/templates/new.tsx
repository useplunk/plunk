import { zodResolver } from "@hookform/resolvers/zod";
import { TemplateSchemas } from "@plunk/shared";
import type { Template } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, Dropdown, Editor, FullscreenLoader, Input, Tooltip } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject } from "../../lib/hooks/projects";
import { useTemplates } from "../../lib/hooks/templates";
import { network } from "../../lib/network";

interface TemplateValues {
	subject: string;
	body: string;
	email?: string;
	from?: string;
	type: "MARKETING" | "TRANSACTIONAL";
	style: "PLUNK" | "HTML";
}

const templates = {
	blank: {
		subject: "",
		body: "",
	},
};

/**
 *
 */
export default function Index() {
	const router = useRouter();

	const project = useActiveProject();
	const { mutate } = useTemplates();

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
		setError,
		clearErrors,
	} = useForm<TemplateValues>({
		resolver: zodResolver(TemplateSchemas.create),
		defaultValues: {
			...templates.blank,
			type: "MARKETING",
			style: "PLUNK",
		},
	});

	useEffect(() => {
		watch((value, { name, type }) => {
			if (name === "email") {
				if (value.email && project?.email && !value.email.endsWith(project.email.split("@")[1])) {
					setError("email", {
						type: "manual",
						message: `The sender address must end with @${project.email?.split("@")[1]}`,
					});
				} else {
					clearErrors("email");
				}
			}
		});
	}, [watch, project, setError, clearErrors]);

	if (!project) {
		return <FullscreenLoader />;
	}

	const create = async (data: TemplateValues) => {
		toast.promise(
			network.mock<Template, typeof TemplateSchemas.create>(project.secret, "POST", "/v1/templates", {
				...data,
			}),
			{
				loading: "Creating new template",
				success: () => {
					void mutate();

					return "Created new template!";
				},
				error: "Could not create new template!",
			},
		);

		await router.push("/templates");
	};

	return (
		<>
			<Dashboard>
				<Card title={"Create a new template"} description={"Reusable blueprints of your emails"}>
					<form onSubmit={handleSubmit(create)} className="space-y-6 sm:space-y-0 sm:grid sm:gap-6 sm:grid-cols-6">
						<Input
							className={"sm:col-span-4"}
							label={"Subject"}
							placeholder={`Welcome to ${project.name}!`}
							register={register("subject")}
							error={errors.subject}
						/>

						<div className={"sm:col-span-2"}>
							<label htmlFor={"type"} className="flex items-center text-sm font-medium text-neutral-700">
								Type
								<Tooltip
									content={
										<>
											<p className={"mb-2 text-base font-semibold"}>What type of email is this?</p>
											<ul className={"list-inside"}>
												<li className={"mb-6"}>
													<span className={"font-semibold"}>Marketing</span>
													<br />
													Promotional emails with a Plunk-hosted unsubscribe link
													<br />
													<span className={"text-neutral-400"}>(e.g. welcome emails, promotions)</span>
												</li>
												<li>
													<span className={"font-semibold"}>Transactional</span>
													<br />
													Mission critical emails <br />
													<span className={"text-neutral-400"}> (e.g. email verification, password reset)</span>
												</li>
											</ul>
										</>
									}
									icon={
										<>
											<path d="M12 16v.01" />
											<path d="M12 13a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
											<circle cx="12" cy="12" r="9" />
										</>
									}
								/>
							</label>
							<Dropdown
								onChange={(t) => setValue("type", t as "MARKETING" | "TRANSACTIONAL")}
								values={[
									{ name: "Marketing", value: "MARKETING" },
									{ name: "Transactional", value: "TRANSACTIONAL" },
								]}
								selectedValue={watch("type")}
							/>
							<AnimatePresence>
								{errors.type?.message && (
									<motion.p
										initial={{ height: 0 }}
										animate={{ height: "auto" }}
										exit={{ height: 0 }}
										className="mt-1 text-xs text-red-500"
									>
										{errors.type.message}
									</motion.p>
								)}
							</AnimatePresence>
						</div>

						{project.verified && (
							<Input
								className={"sm:col-span-3"}
								label={"Sender Email"}
								placeholder={`${project.email}`}
								register={register("email")}
								error={errors.email}
							/>
						)}

						{project.verified && (
							<Input
								className={"sm:col-span-3"}
								label={"Sender Name"}
								placeholder={`${project.from ?? project.name}`}
								register={register("from")}
								error={errors.from}
							/>
						)}

						<div className={"sm:col-span-6"}>
							<Editor
								value={watch("body")}
								mode={watch("style")}
								modeSwitcher
								onChange={(value, type) => {
									setValue("body", value);
									setValue("style", type);
								}}
							/>
							<AnimatePresence>
								{errors.body?.message && (
									<motion.p
										initial={{ height: 0 }}
										animate={{ height: "auto" }}
										exit={{ height: 0 }}
										className="mt-1 text-xs text-red-500"
									>
										{errors.body.message}
									</motion.p>
								)}
							</AnimatePresence>
						</div>

						<div className={"flex justify-end gap-3 sm:col-span-6"}>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.9 }}
								onClick={(e) => {
									e.preventDefault();
									return router.push("/templates");
								}}
								className={
									"flex w-fit justify-center rounded border border-neutral-300 bg-white px-6 py-2 text-base font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
								}
							>
								Cancel
							</motion.button>

							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.9 }}
								className={
									"flex items-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
								}
							>
								<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M12 5.75V18.25"
									/>
									<path
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M18.25 12L5.75 12"
									/>
								</svg>
								Create
							</motion.button>
						</div>
					</form>
				</Card>
			</Dashboard>
		</>
	);
}

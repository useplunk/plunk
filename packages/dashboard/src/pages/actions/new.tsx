import { zodResolver } from "@hookform/resolvers/zod";
import { ActionSchemas } from "@plunk/shared";
import type { Template } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, Dropdown, FullscreenLoader, Input, MultiselectDropdown, Toggle } from "../../components";
import { Dashboard } from "../../layouts";
import { useActions } from "../../lib/hooks/actions";
import { useEvents } from "../../lib/hooks/events";
import { useActiveProject } from "../../lib/hooks/projects";
import { useTemplates } from "../../lib/hooks/templates";
import { network } from "../../lib/network";

interface ActionValues {
	name: string;
	runOnce: boolean;
	delay: number;
	template: string;
	events: string[];
	notevents: string[];
}

/**
 *
 */
export default function Index() {
	const project = useActiveProject();
	const { mutate } = useActions();
	const { data: templates } = useTemplates();
	const { data: events } = useEvents();
	const router = useRouter();

	const [delay, setDelay] = useState<{
		delay: number;
		unit: "MINUTES" | "HOURS" | "DAYS";
	}>({
		delay: 0,
		unit: "MINUTES",
	});

	useEffect(() => {
		switch (delay.unit) {
			case "MINUTES":
				setValue("delay", delay.delay);
				break;
			case "HOURS":
				setValue("delay", delay.delay * 60);
				break;
			case "DAYS":
				setValue("delay", delay.delay * 24 * 60);
				break;
		}
	}, [delay]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<ActionValues>({
		resolver: zodResolver(ActionSchemas.create),
		defaultValues: {
			template: "No template selected",
			events: [],
			notevents: [],
			runOnce: false,
		},
	});

	if (!project || !templates || !events) {
		return <FullscreenLoader />;
	}

	const create = async (data: ActionValues) => {
		toast.promise(
			network.mock<Template, typeof ActionSchemas.create>(project.secret, "POST", "/v1/actions", {
				...data,
			}),
			{
				loading: "Creating new action",
				success: () => {
					void mutate();
					return "Created new action";
				},
				error: "Could not create new action!",
			},
		);

		await router.push("/actions");
	};

	return (
		<>
			<Dashboard>
				<Card title={"Create a new action"}>
					<form onSubmit={handleSubmit(create)} className="mx-auto my-3 max-w-xl space-y-6">
						<Input label={"Name"} placeholder={"Onboarding Flow"} register={register("name")} error={errors.name} />

						<div>
							<label htmlFor={"events"} className="block text-sm font-medium text-neutral-700">
								Run on triggers
							</label>
							<MultiselectDropdown
								onChange={(e) => setValue("events", e)}
								values={events
									.filter((e) => !e.campaignId && !watch("notevents").includes(e.id))
									.sort((a, b) => {
										if (a.templateId && !b.templateId) {
											return 1;
										}

										if (!a.templateId && b.templateId) {
											return -1;
										}

										if (a.name === "unsubscribe" || a.name === "subscribe") {
											return 1;
										}

										if (b.name === "unsubscribe" || b.name === "subscribe") {
											return -1;
										}

										if (a.name.includes("delivered") && !b.name.includes("delivered")) {
											return -1;
										}

										return 0;
									})
									.map((e) => {
										return {
											name: e.name,
											value: e.id,
											tag: e.templateId
												? e.name.includes("opened")
													? "On Open"
													: "On Delivery"
												: e.name === "unsubscribe" || e.name === "subscribe"
													? "Automated"
													: undefined,
										};
									})}
								selectedValues={watch("events")}
							/>
							<AnimatePresence>
								{(errors.events as FieldError | undefined)?.message && (
									<motion.p
										initial={{ height: 0 }}
										animate={{ height: "auto" }}
										exit={{ height: 0 }}
										className="mt-1 text-xs text-red-500"
									>
										{(errors.events as FieldError | undefined)?.message}
									</motion.p>
								)}
							</AnimatePresence>
						</div>

						<div>
							<label htmlFor={"events"} className="block text-sm font-medium text-neutral-700">
								Exclude contacts with triggers
							</label>
							<MultiselectDropdown
								onChange={(e) => setValue("notevents", e)}
								values={events
									.filter((e) => !e.campaignId && !watch("events").includes(e.id))
									.sort((a, b) => {
										if (a.templateId && !b.templateId) {
											return 1;
										}

										if (!a.templateId && b.templateId) {
											return -1;
										}

										if (a.name === "unsubscribe" || a.name === "subscribe") {
											return 1;
										}

										if (b.name === "unsubscribe" || b.name === "subscribe") {
											return -1;
										}

										if (a.name.includes("delivered") && !b.name.includes("delivered")) {
											return -1;
										}

										return 0;
									})
									.map((e) => {
										return {
											name: e.name,
											value: e.id,
											tag: e.templateId
												? e.name.includes("opened")
													? "On Open"
													: "On Delivery"
												: e.name === "unsubscribe" || e.name === "subscribe"
													? "Automated"
													: undefined,
										};
									})}
								selectedValues={watch("notevents")}
							/>
							<AnimatePresence>
								{(errors.notevents as FieldError | undefined)?.message && (
									<motion.p
										initial={{ height: 0 }}
										animate={{ height: "auto" }}
										exit={{ height: 0 }}
										className="mt-1 text-xs text-red-500"
									>
										{(errors.notevents as FieldError | undefined)?.message}
									</motion.p>
								)}
							</AnimatePresence>
						</div>

						<div>
							<label htmlFor={"template"} className="block text-sm font-medium text-neutral-700">
								Template
							</label>
							<Dropdown
								onChange={(t) => setValue("template", t)}
								values={templates.map((t) => {
									return { name: t.subject, value: t.id };
								})}
								selectedValue={watch("template")}
							/>
							<AnimatePresence>
								{errors.template?.message && (
									<motion.p
										initial={{ height: 0 }}
										animate={{ height: "auto" }}
										exit={{ height: 0 }}
										className="mt-1 text-xs text-red-500"
									>
										{errors.template.message}
									</motion.p>
								)}
							</AnimatePresence>
						</div>

						<div>
							<label htmlFor={"template"} className="block text-sm font-medium text-neutral-800">
								Delay before sending
							</label>
							<div className={"grid grid-cols-6 gap-4"}>
								<div className={"col-span-2 mt-1"}>
									<input
										type={"number"}
										autoComplete={"off"}
										min={0}
										className={
											"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
										}
										placeholder={"0"}
										value={delay.delay}
										onChange={(e) =>
											setDelay({
												...delay,
												delay: Number.parseInt(e.target.value),
											})
										}
									/>
								</div>
								<div className={"col-span-4"}>
									<Dropdown
										onChange={(t) =>
											setDelay({
												...delay,
												unit: t as "MINUTES" | "HOURS" | "DAYS",
											})
										}
										values={[
											{ name: "Minutes", value: "MINUTES" },
											{ name: "Hours", value: "HOURS" },
											{ name: "Days", value: "DAYS" },
										]}
										selectedValue={delay.unit}
									/>
								</div>
							</div>
						</div>

						<div>
							<Toggle
								title={"Run once"}
								description={"Toggle this on if you want to run this action only once per contact."}
								toggled={watch("runOnce")}
								onToggle={() => setValue("runOnce", !watch("runOnce"))}
							/>
						</div>

						<div className={"flex justify-end gap-3"}>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.9 }}
								onClick={(e) => {
									e.preventDefault();
									return router.push("/actions");
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

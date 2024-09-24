import { zodResolver } from "@hookform/resolvers/zod";
import { CampaignSchemas, type UtilitySchemas } from "@plunk/shared";
import type { Campaign, Template } from "@prisma/client";
import { Ring } from "@uiball/loaders";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Save, Search, Users2, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	Alert,
	Badge,
	Card,
	Dropdown,
	Editor,
	FullscreenLoader,
	Input,
	Modal,
	MultiselectDropdown,
	Table,
} from "../../components";
import { Dashboard } from "../../layouts";
import { useCampaign, useCampaigns } from "../../lib/hooks/campaigns";
import { useContacts } from "../../lib/hooks/contacts";
import { useEventsWithoutTriggers } from "../../lib/hooks/events";
import { useActiveProject } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

interface CampaignValues {
	subject: string;
	body: string;
	email?: string;
	from?: string;
	recipients: string[];
	style: "PLUNK" | "HTML";
}

/**
 *
 */
export default function Index() {
	const router = useRouter();

	if (!router.isReady) {
		return <FullscreenLoader />;
	}

	const project = useActiveProject();
	const { mutate: campaignsMutate } = useCampaigns();
	const { data: campaign, mutate: campaignMutate } = useCampaign(router.query.id as string);
	const { data: contacts } = useContacts(0);
	const { data: events } = useEventsWithoutTriggers();

	const [query, setQuery] = useState<{
		events?: string[];
		last?: "day" | "week" | "month";
		data?: string;
		value?: string;
		notevents?: string[];
		notlast?: "day" | "week" | "month";
	}>({});
	const [confirmModal, setConfirmModal] = useState(false);
	const [advancedSelector, setSelector] = useState(false);
	const [delay, setDelay] = useState(0);

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		reset,
		setValue,
		setError,
		clearErrors,
	} = useForm<CampaignValues>({
		resolver: zodResolver(CampaignSchemas.update),
		defaultValues: { recipients: [], body: undefined },
	});

	useEffect(() => {
		if (!campaign) {
			return;
		}

		reset({
			...campaign,
			recipients: campaign.recipients.map((r: { id: string }) => r.id),
		});
	}, [reset, campaign]);

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

	if (!project || !campaign || !events || (watch("body") as string | undefined) === undefined) {
		return <FullscreenLoader />;
	}

	const selectQuery = () => {
		if (!contacts) {
			return;
		}

		let filteredContacts = contacts.contacts;

		if (query.events && query.events.length > 0) {
			query.events.map((e) => {
				filteredContacts = filteredContacts.filter((c) => c.triggers.some((t) => t.eventId === e));
			});
		}

		if (query.last) {
			filteredContacts = filteredContacts.filter((c) => {
				if (c.triggers.length === 0) {
					return false;
				}

				const lastTrigger = c.triggers.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

				if (lastTrigger.length === 0) {
					return false;
				}

				return dayjs(lastTrigger[0].createdAt).isAfter(dayjs().subtract(1, query.last));
			});
		}

		if (query.notevents && query.notevents.length > 0 && query.notlast) {
			query.notevents.map((e) => {
				filteredContacts = filteredContacts.filter((c) => {
					if (c.triggers.length === 0) {
						return true;
					}

					const lastTrigger = c.triggers.filter((t) => t.eventId === e).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

					if (lastTrigger.length === 0) {
						return true;
					}

					return dayjs(lastTrigger[0].createdAt).isAfter(dayjs().subtract(1, query.last));
				});
			});
		} else if (query.notevents && query.notevents.length > 0) {
			query.notevents.map((e) => {
				filteredContacts = filteredContacts.filter((c) => c.triggers.every((t) => t.eventId !== e));
			});
		} else if (query.notlast) {
			filteredContacts = filteredContacts.filter((c) => {
				if (c.triggers.length === 0) {
					return true;
				}

				const lastTrigger = c.triggers.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

				if (lastTrigger.length === 0) {
					return true;
				}

				return !dayjs(lastTrigger[0].createdAt).isAfter(dayjs().subtract(1, query.notlast));
			});
		}

		if (query.data) {
			filteredContacts = filteredContacts.filter((c) => {
				if (!c.data) {
					return false;
				}

				return JSON.parse(c.data)[query.data as string];
			});
		}

		if (query.data && query.value) {
			filteredContacts = filteredContacts.filter((c) => {
				if (!c.data) {
					return false;
				}

				return Array.isArray(JSON.parse(c.data)[query.data as string])
					? JSON.parse(c.data)[query.data as string].includes(query.value)
					: JSON.parse(c.data)[query.data as string] === query.value;
			});
		}

		setValue(
			"recipients",
			filteredContacts.map((c) => c.id),
		);
	};

	const send = async (data: CampaignValues) => {
		setConfirmModal(false);

		toast.success("Saved your campaign. Starting delivery now, please hold on!");

		await network.mock<Campaign, typeof CampaignSchemas.update>(
			project.secret,
			"PUT",
			"/v1/campaigns",

			data.recipients.length === contacts?.contacts.filter((c) => c.subscribed).length
				? { id: campaign.id, ...data, recipients: ["all"] }
				: {
						id: campaign.id,
						...data,
					},
		);

		toast.promise(
			network.mock<Campaign, typeof CampaignSchemas.send>(project.secret, "POST", "/v1/campaigns/send", {
				id: campaign.id,
				live: true,
				delay,
			}),

			{
				loading: "Starting delivery...",
				success: () => {
					void campaignMutate();
					void campaignsMutate();

					return `Started delivery of your campaign to ${watch("recipients").length} recipients`;
				},
				error: () => {
					return "Could not send your campaign!";
				},
			},
		);
	};

	const sendTest = async (data: CampaignValues) => {
		await network.mock<Campaign, typeof CampaignSchemas.update>(project.secret, "PUT", "/v1/campaigns", {
			id: campaign.id,
			...data,
		});

		toast.promise(
			network.mock<Campaign, typeof CampaignSchemas.send>(project.secret, "POST", "/v1/campaigns/send", {
				id: campaign.id,
				live: false,
				delay: 0,
			}),

			{
				loading: "Sending you a test campaign",
				success: "Sent all project members a test campaign",
				error: "Could not send your campaign!",
			},
		);
	};

	const update = (data: CampaignValues) => {
		toast.promise(
			network.mock<Campaign, typeof CampaignSchemas.update>(project.secret, "PUT", "/v1/campaigns", {
				id: campaign.id,
				...data,
			}),
			{
				loading: "Saving your campaign",
				success: () => {
					void campaignMutate();
					void campaignsMutate();
					return "Saved your campaign";
				},
				error: "Could not save your campaign!",
			},
		);
	};

	const duplicate = async (e: { preventDefault: () => void }) => {
		e.preventDefault();
		toast.promise(
			network.mock<Template, typeof UtilitySchemas.id>(project.secret, "POST", "/v1/campaigns/duplicate", {
				id: campaign.id,
			}),
			{
				loading: "Duplicating your campaign",
				success: () => {
					void campaignMutate();
					void campaignsMutate();
					return "Duplicated your campaign";
				},
				error: "Could not duplicate your campaign!",
			},
		);

		await router.push("/campaigns");
	};

	const remove = async (e: { preventDefault: () => void }) => {
		e.preventDefault();
		toast.promise(
			network.mock<Template, typeof UtilitySchemas.id>(project.secret, "DELETE", "/v1/campaigns", {
				id: campaign.id,
			}),
			{
				loading: "Deleting your campaign",
				success: () => {
					void campaignMutate();
					void campaignsMutate();
					return "Deleted your campaign";
				},
				error: "Could not delete your campaign!",
			},
		);

		await router.push("/campaigns");
	};

	return (
		<>
			<Modal
				isOpen={confirmModal}
				onToggle={() => setConfirmModal(!confirmModal)}
				onAction={handleSubmit(send)}
				type={"info"}
				title={"Send campaign"}
				description={`Once you start sending this campaign to ${watch("recipients").length} contacts, you can no longer make changes or undo it.`}
			>
				<label className="block text-sm font-medium text-neutral-700">Delay</label>
				<Dropdown
					inModal={true}
					onChange={(val) => setDelay(Number.parseInt(val))}
					values={[
						{
							name: "Send immediately",
							value: "0",
						},
						{
							name: "In an hour",
							value: "60",
						},
						{
							name: "In 6 hours",
							value: "360",
						},
						{
							name: "In 12 hours",
							value: "720",
						},
						{
							name: "In 24 hours",
							value: "1440",
						},
					]}
					selectedValue={delay.toString()}
				/>
			</Modal>
			<Dashboard>
				<Card
					title={campaign.status !== "DRAFT" ? "View campaign" : "Update campaign"}
					options={
						<>
							<button
								onClick={duplicate}
								className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100"
								role="menuitem"
								tabIndex={-1}
							>
								<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M6.5 15.25V15.25C5.5335 15.25 4.75 14.4665 4.75 13.5V6.75C4.75 5.64543 5.64543 4.75 6.75 4.75H13.5C14.4665 4.75 15.25 5.5335 15.25 6.5V6.5"
									/>
									<rect
										width="10.5"
										height="10.5"
										x="8.75"
										y="8.75"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										rx="2"
									/>
								</svg>
								Duplicate
							</button>
							<button
								onClick={remove}
								className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100"
								role="menuitem"
								tabIndex={-1}
							>
								<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
									<path
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M6.75 7.75L7.59115 17.4233C7.68102 18.4568 8.54622 19.25 9.58363 19.25H14.4164C15.4538 19.25 16.319 18.4568 16.4088 17.4233L17.25 7.75"
									/>
									<path
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M9.75 7.5V6.75C9.75 5.64543 10.6454 4.75 11.75 4.75H12.25C13.3546 4.75 14.25 5.64543 14.25 6.75V7.5"
									/>
									<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 7.75H19" />
								</svg>
								Delete
							</button>
						</>
					}
				>
					<form onSubmit={handleSubmit(update)} className="space-6 grid gap-6 sm:grid-cols-6">
						<div className={"sm:col-span-6 grid sm:grid-cols-6 gap-6"}>
							<Input
								className={"sm:col-span-6"}
								label={"Subject"}
								placeholder={`Welcome to ${project.name}!`}
								register={register("subject")}
								error={errors.subject}
							/>

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
						</div>

						{contacts ? (
							<>
								<div className={"sm:col-span-3"}>
									<label htmlFor={"recipients"} className="block text-sm font-medium text-neutral-700">
										Recipients
									</label>
									<MultiselectDropdown
										disabled={campaign.status !== "DRAFT"}
										onChange={(c) => setValue("recipients", c)}
										values={contacts.contacts
											.filter((c) => c.subscribed)
											.map((c) => {
												return { name: c.email, value: c.id };
											})}
										selectedValues={watch("recipients")}
									/>
									<AnimatePresence>
										{(errors.recipients as FieldError | undefined)?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{(errors.recipients as FieldError | undefined)?.message}
											</motion.p>
										)}
									</AnimatePresence>
								</div>

								<div className={"grid gap-6 sm:col-span-3 sm:grid-cols-2"}>
									{campaign.status === "DRAFT" && (
										<>
											<button
												onClick={(e) => {
													e.preventDefault();

													if (watch("recipients").length > 0) {
														return setValue("recipients", []);
													}

													setValue(
														"recipients",
														contacts.contacts.filter((c) => c.subscribed).map((c) => c.id),
													);
												}}
												className={
													"mt-6 flex items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white px-8 py-1 text-center text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-100"
												}
											>
												{watch("recipients").length === 0 ? <Users2 size={18} /> : <XIcon size={18} />}
												{watch("recipients").length === 0 ? "All contacts" : "Clear selection"}
											</button>
											<button
												onClick={(e) => {
													e.preventDefault();
													setSelector(!advancedSelector);
												}}
												className={
													"mt-6 flex items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white px-8 py-1 text-center text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-100"
												}
											>
												{advancedSelector ? <XIcon size={18} /> : <Search size={18} />}
												{advancedSelector ? "Close" : "Advanced selector"}
											</button>
										</>
									)}
								</div>

								<AnimatePresence>
									{advancedSelector && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
											transition={{ duration: 0.2 }}
											className={
												"relative z-20 grid gap-6 rounded border border-neutral-300 px-6 py-6 sm:col-span-6 sm:grid-cols-4"
											}
										>
											<div className={"sm:col-span-2"}>
												<label htmlFor={"event"} className="block text-sm font-medium text-neutral-700">
													Has triggers for events
												</label>
												<MultiselectDropdown
													onChange={(e) =>
														setQuery(
															e.length > 0
																? { ...query, events: e }
																: {
																		...query,
																		events: undefined,
																		last: undefined,
																	},
														)
													}
													values={[
														...events
															.filter((e) => !query.notevents?.includes(e.id))
															.sort((a, b) => {
																if (!a.templateId && !a.campaignId) {
																	return -1;
																}
																if (!b.templateId && !b.campaignId) {
																	return 1;
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
																	tag:
																		e.templateId ?? e.campaignId ? (e.name.includes("opened") ? "On Open" : "On Delivery") : undefined,
																};
															}),
													]}
													selectedValues={query.events ?? []}
												/>
											</div>

											<div className={"sm:col-span-2"}>
												{query.events && query.events.length > 0 && (
													<>
														<label htmlFor={"event"} className="block text-sm font-medium text-neutral-700">
															Has triggered {query.events.length} selected events
														</label>
														<Dropdown
															onChange={(e) =>
																setQuery({
																	...query,
																	last: (e as "" | "day" | "week" | "month") === "" ? undefined : (e as "day" | "week" | "month"),
																})
															}
															values={[
																{ name: "Anytime", value: "" },
																{ name: "In the last day", value: "day" },
																{ name: "In the last week", value: "week" },
																{ name: "In the last month", value: "month" },
															]}
															selectedValue={query.last ?? ""}
														/>
													</>
												)}
											</div>

											<div className={"sm:col-span-2"}>
												<label htmlFor={"event"} className="block text-sm font-medium text-neutral-700">
													No triggers for events
												</label>
												<MultiselectDropdown
													onChange={(e) => {
														setQuery(
															e.length > 0
																? { ...query, notevents: e }
																: {
																		...query,
																		notevents: undefined,
																		notlast: undefined,
																	},
														);
													}}
													values={[
														...events
															.filter((e) => !query.events?.includes(e.id))
															.sort((a, b) => {
																if (!a.templateId && !a.campaignId) {
																	return -1;
																}
																if (!b.templateId && !b.campaignId) {
																	return 1;
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
																	tag:
																		e.templateId ?? e.campaignId ? (e.name.includes("opened") ? "On Open" : "On Delivery") : undefined,
																};
															}),
													]}
													selectedValues={query.notevents ?? []}
												/>
											</div>

											<div className={"sm:col-span-2"}>
												{query.notevents && query.notevents.length > 0 && (
													<>
														<label htmlFor={"event"} className="block text-sm font-medium text-neutral-700">
															Not triggered {query.notevents.length} selected events
														</label>
														<Dropdown
															onChange={(e) =>
																setQuery({
																	...query,
																	notlast: (e as "" | "day" | "week" | "month") === "" ? undefined : (e as "day" | "week" | "month"),
																})
															}
															values={[
																{ name: "Anytime", value: "" },
																{ name: "In the last day", value: "day" },
																{ name: "In the last week", value: "week" },
																{ name: "In the last month", value: "month" },
															]}
															selectedValue={query.notlast ?? ""}
														/>
													</>
												)}
											</div>

											<div className={"sm:col-span-2"}>
												<label htmlFor={"event"} className="block text-sm font-medium text-neutral-700">
													All contacts with parameter
												</label>
												<Dropdown
													onChange={(e) =>
														setQuery({
															...query,
															data: e === "" ? undefined : e,
														})
													}
													values={[
														{ name: "Any parameter", value: "" },
														...new Set(
															contacts.contacts
																.filter((c) => c.data)
																.map((c) => {
																	return Object.keys(JSON.parse(c.data ?? "{}"));
																})
																.reduce((acc, val) => acc.concat(val), []),
														),
													].map((k) => (typeof k === "string" ? { name: k, value: k } : k))}
													selectedValue={query.data ?? ""}
												/>
											</div>

											<div className={"sm:col-span-2"}>
												{query.data && (
													<>
														<label htmlFor={"event"} className="block text-sm font-medium text-neutral-700">
															All contacts where parameter {query.data} is
														</label>

														<Dropdown
															onChange={(e) =>
																setQuery({
																	...query,
																	value: e === "" ? undefined : e,
																})
															}
															values={[
																{ name: "Any value", value: "" },
																...new Set(
																	contacts.contacts
																		.filter((c) => c.data && JSON.parse(c.data)[query.data ?? ""])
																		.map((c) => {
																			return JSON.parse(c.data ?? "{}")[query.data ?? ""];
																		})
																		.reduce((acc, val) => acc.concat(val), []),
																),
															].map((k) =>
																typeof k === "string"
																	? {
																			name: k,
																			value: k,
																		}
																	: (k as {
																			name: string;
																			value: string;
																		}),
															)}
															selectedValue={query.value ?? ""}
														/>
													</>
												)}
											</div>

											<div className={"sm:col-span-4"}>
												<motion.button
													onClick={(e) => {
														e.preventDefault();
														selectQuery();
													}}
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.9 }}
													className={
														"ml-auto flex items-center justify-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
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
													Select contacts
												</motion.button>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</>
						) : (
							campaign.status === "DRAFT" && (
								<>
									<div className={"flex items-center gap-6 rounded border border-neutral-300 px-8 py-3 sm:col-span-6"}>
										<Ring size={20} />
										<div>
											<h1 className={"text-lg font-semibold text-neutral-800"}>Hang on!</h1>
											<p className={"text-sm text-neutral-600"}>
												We're still loading your contacts. This might take up to a minute. You can already start writing your
												campaign in the editor below.
											</p>
										</div>
									</div>
								</>
							)
						)}

						<AnimatePresence>
							{watch("recipients").length >= 10 && campaign.status !== "DELIVERED" && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className={"relative z-10 sm:col-span-6"}
								>
									<Alert type={"info"} title={"Automatic batching"}>
										Your campaign will be sent out in batches of 80 recipients each. It will be delivered to all contacts{" "}
										{dayjs().to(dayjs().add(Math.ceil(watch("recipients").length / 80), "minutes"))}
									</Alert>
								</motion.div>
							)}
						</AnimatePresence>

						{campaign.status !== "DRAFT" &&
							(campaign.emails.length === 0 ? (
								<div className={"flex items-center gap-6 rounded border border-neutral-300 px-6 py-3 sm:col-span-6"}>
									<Ring size={20} />
									<div>
										<h1 className={"text-lg font-semibold text-neutral-800"}>Hang on!</h1>
										<p className={"text-sm text-neutral-600"}>
											We are still sending your campaign. Emails will start appearing here once they are sent.
										</p>
									</div>
								</div>
							) : (
								<div
									className={"max-h-[400px] overflow-x-hidden overflow-y-scroll rounded border border-neutral-200 sm:col-span-6"}
								>
									<Table
										values={campaign.emails.map(
											(e: {
												contact: { email: string; id: string };
												status: string;
											}) => {
												return {
													Email: e.contact.email,
													Status: (
														<Badge type={e.status === "DELIVERED" ? "info" : e.status === "OPENED" ? "success" : "danger"}>
															{e.status.at(0)?.toUpperCase() + e.status.slice(1).toLowerCase()}
														</Badge>
													),
													View: (
														<Link href={`/contacts/${e.contact.id}`}>
															<Eye size={20} />
														</Link>
													),
												};
											},
										)}
									/>
								</div>
							))}

						<div className={"sm:col-span-6"}>
							<Editor
								value={watch("body")}
								mode={watch("style")}
								onChange={(value, type) => {
									setValue("body", value);
									setValue("style", type);
								}}
								modeSwitcher={campaign.status === "DRAFT"}
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

						<div className={"ml-auto mt-6 flex justify-end gap-x-5 sm:col-span-6"}>
							{campaign.status === "DRAFT" ? (
								<>
									<motion.button
										onClick={handleSubmit(sendTest)}
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.9 }}
										className={
											"ml-auto mt-6 flex items-center gap-x-0.5 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"
										}
									>
										<svg width="24" height="24" className={"rotate-45 pb-1"} fill="none" viewBox="0 0 24 24">
											<path
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="1.5"
												d="M4.75 19.25L12 4.75L19.25 19.25L12 15.75L4.75 19.25Z"
											/>
											<path
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="1.5"
												d="M12 15.5V12.75"
											/>
										</svg>
										Send test to {project.name}'s members
									</motion.button>
									<motion.button
										onClick={(e) => {
											e.preventDefault();
											setConfirmModal(true);
										}}
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.9 }}
										className={
											"ml-auto mt-6 flex items-center gap-x-0.5 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"
										}
									>
										<svg width="24" height="24" className={"rotate-45 pb-1"} fill="none" viewBox="0 0 24 24">
											<path
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="1.5"
												d="M4.75 19.25L12 4.75L19.25 19.25L12 15.75L4.75 19.25Z"
											/>
											<path
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="1.5"
												d="M12 15.5V12.75"
											/>
										</svg>
										Save & Send
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.9 }}
										className={
											"ml-auto mt-6 flex items-center gap-x-2 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"
										}
									>
										<Save strokeWidth={1.5} size={18} />
										Save
									</motion.button>
								</>
							) : null}
						</div>
					</form>
				</Card>
			</Dashboard>
		</>
	);
}

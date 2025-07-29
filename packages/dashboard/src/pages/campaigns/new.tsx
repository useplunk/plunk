import { zodResolver } from "@hookform/resolvers/zod";
import { CampaignSchemas } from "@plunk/shared";
import type { Campaign } from "@prisma/client";
import { Ring } from "@uiball/loaders";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Users2, XIcon } from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Card, Dropdown, Editor, FullscreenLoader, Input, MultiselectDropdown } from "../../components";
import { Dashboard } from "../../layouts";
import { useCampaigns } from "../../lib/hooks/campaigns";
import { useContacts, usePaginatedContacts, useContactsCount } from "../../lib/hooks/contacts";
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
	const { mutate } = useCampaigns();
	const { data: contactsCount } = useContactsCount();
	const { data: events } = useEventsWithoutTriggers();

	// Contact selection state
	const [contactPage, setContactPage] = useState(1);
	const [contactSearch, setContactSearch] = useState("");
	const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
	const [isSelectingAll, setIsSelectingAll] = useState(false);
	
	const { data: paginatedContacts } = usePaginatedContacts(
		contactPage,
		50,
		contactSearch,
		true // Only subscribed contacts
	);

	const [query, setQuery] = useState<{
		events?: string[];
		last?: "day" | "week" | "month";
		data?: string;
		value?: string;
		notevents?: string[];
		notlast?: "day" | "week" | "month";
	}>({});
	const [advancedSelector, setSelector] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		setError,
		clearErrors,
	} = useForm<CampaignValues>({
		resolver: zodResolver(CampaignSchemas.create),
		defaultValues: {
			recipients: [],
			...templates.blank,
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

	if (!project || !events) {
		return <FullscreenLoader />;
	}

	// Helper functions for contact selection
	const toggleContactSelection = (contactId: string) => {
		setSelectedContactIds(prev => 
			prev.includes(contactId) 
				? prev.filter(id => id !== contactId)
				: [...prev, contactId]
		);
	};

	const selectAllContacts = () => {
		setIsSelectingAll(true);
		setSelectedContactIds([]);
		setValue("recipients", ["all"]);
	};

	const clearSelectedContacts = () => {
		setIsSelectingAll(false);
		setSelectedContactIds([]);
		setValue("recipients", []);
	};

	const selectCurrentPageContacts = () => {
		if (!paginatedContacts) return;
		
		const pageContactIds = paginatedContacts.contacts.map(c => c.id);
		const newSelection = [...new Set([...selectedContactIds, ...pageContactIds])];
		setSelectedContactIds(newSelection);
		setIsSelectingAll(false);
		setValue("recipients", newSelection);
	};

	// Update recipients when selection changes
	useEffect(() => {
		if (!isSelectingAll) {
			setValue("recipients", selectedContactIds);
		}
	}, [selectedContactIds, isSelectingAll, setValue]);

	const selectQuery = () => {
		// This function now handles advanced filtering
		// Implementation would need to be updated to work with paginated data
		// For now, we'll use the basic selection
		console.warn("Advanced filtering with pagination not yet implemented");
	};

	const create = async (data: CampaignValues) => {
		toast.promise(
			network.mock<Campaign, typeof CampaignSchemas.create>(
				project.secret,
				"POST",
				"/v1/campaigns",
				isSelectingAll || data.recipients.includes("all")
					? { ...data, recipients: ["all"] }
					: { ...data },
			),
			{
				loading: "Creating new campaign",
				success: () => {
					void mutate();
					return "Created new campaign";
				},
				error: "Could not create new campaign!",
			},
		);

		await router.push("/campaigns");
	};

	return (
		<>
			<Dashboard>
				<Card title={"Create a new campaign"}>
					<form onSubmit={handleSubmit(create)} className="space-y-6 sm:grid sm:grid-cols-6 sm:gap-6">
						<div className={"sm:col-span-6 sm:grid sm:grid-cols-6 sm:gap-6 space-y-6 sm:space-y-0"}>
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

						{paginatedContacts || contactsCount ? (
							<>
								<div className={"sm:col-span-6"}>
									<label htmlFor={"recipients"} className="block text-sm font-medium text-neutral-700 mb-2">
										Recipients
									</label>
									
									{/* Selection Summary */}
									<div className="bg-gray-50 p-3 rounded mb-4">
										<div className="flex justify-between items-center mb-2">
											<span className="text-sm text-gray-700">
												{isSelectingAll 
													? `All contacts selected (${contactsCount || 0})`
													: `${selectedContactIds.length} contacts selected`
												}
											</span>
											<div className="flex gap-2">
												<button
													type="button"
													onClick={selectAllContacts}
													className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
												>
													Select All ({contactsCount || 0})
												</button>
												{paginatedContacts && (
													<button
														type="button"
														onClick={selectCurrentPageContacts}
														className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
													>
														Select Page ({paginatedContacts.contacts.length})
													</button>
												)}
												<button
													type="button"
													onClick={clearSelectedContacts}
													className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
												>
													Clear All
												</button>
											</div>
										</div>
									</div>

									{/* Search */}
									<div className="mb-4">
										<input
											type="text"
											placeholder="Search contacts..."
											value={contactSearch}
											onChange={(e) => setContactSearch(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										/>
									</div>

									{/* Contact List */}
									{paginatedContacts && (
										<div className="border rounded-md max-h-60 overflow-y-auto">
											{paginatedContacts.contacts.map((contact) => (
												<div key={contact.id} className="flex items-center p-2 border-b last:border-b-0 hover:bg-gray-50">
													<input
														type="checkbox"
														checked={isSelectingAll || selectedContactIds.includes(contact.id)}
														onChange={() => !isSelectingAll && toggleContactSelection(contact.id)}
														disabled={isSelectingAll}
														className="mr-3"
													/>
													<div className="flex-1">
														<div className="text-sm font-medium">{contact.email}</div>
														<div className="text-xs text-gray-500">
															Added {dayjs(contact.createdAt).format('MMM D, YYYY')}
														</div>
													</div>
												</div>
											))}
										</div>
									)}

									{/* Pagination */}
									{paginatedContacts && paginatedContacts.totalPages > 1 && (
										<div className="flex justify-between items-center mt-4">
											<span className="text-sm text-gray-600">
												Page {paginatedContacts.page} of {paginatedContacts.totalPages}
											</span>
											<div className="flex gap-2">
												<button
													type="button"
													onClick={() => setContactPage(prev => Math.max(1, prev - 1))}
													disabled={paginatedContacts.page <= 1}
													className="px-3 py-1 text-sm border rounded disabled:opacity-50"
												>
													Previous
												</button>
												<button
													type="button"
													onClick={() => setContactPage(prev => Math.min(paginatedContacts.totalPages, prev + 1))}
													disabled={paginatedContacts.page >= paginatedContacts.totalPages}
													className="px-3 py-1 text-sm border rounded disabled:opacity-50"
												>
													Next
												</button>
											</div>
										</div>
									)}

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

								<div className={"sm:col-span-6"}>
									<button
										type="button"
										onClick={(e) => {
											e.preventDefault();
											setSelector(!advancedSelector);
										}}
										className={
											"flex items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white px-4 py-2 text-center text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-100"
										}
									>
										{advancedSelector ? <XIcon size={18} /> : <Search size={18} />}
										{advancedSelector ? "Close Advanced" : "Advanced Selector"}
									</button>
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
						)}

						<AnimatePresence>
							{((isSelectingAll && contactsCount && contactsCount >= 10) || 
							  (!isSelectingAll && selectedContactIds.length >= 10)) && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className={"relative z-10 sm:col-span-6"}
								>
									<Alert type={"info"} title={"Automatic batching"}>
										Your campaign will be sent out in batches of 100 recipients each. It will be delivered to all contacts{" "}
										{dayjs().to(dayjs().add(Math.ceil((isSelectingAll ? contactsCount || 0 : selectedContactIds.length) / 100), "minutes"))}
									</Alert>
								</motion.div>
							)}
						</AnimatePresence>

						<div className={"sm:col-span-6"}>
							<Editor
								value={watch("body")}
								mode={watch("style")}
								onChange={(value, type) => {
									setValue("body", value);
									setValue("style", type);
								}}
								modeSwitcher
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

						<div className={"ml-auto mt-6 flex justify-end gap-3 sm:col-span-6"}>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.9 }}
								onClick={(e) => {
									e.preventDefault();
									return router.push("/campaigns");
								}}
								className={
									"flex w-fit justify-center rounded border border-neutral-300 bg-white px-6 py-2 text-base font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
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

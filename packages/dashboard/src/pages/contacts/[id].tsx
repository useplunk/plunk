// @ts-nocheck
// React Hook Form messes up our types, ignore the entire file

import { zodResolver } from "@hookform/resolvers/zod";
import { ContactSchemas, EventSchemas, type UtilitySchemas } from "@plunk/shared";
import type { Contact, Email, Template } from "@prisma/client";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Card, Empty, FullscreenLoader, Input, Modal, Toggle } from "../../components";
import { Dashboard } from "../../layouts";
import { useContact } from "../../lib/hooks/contacts";
import { useActiveProject } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

interface ContactValues {
	email: string;
	data: string | null;
	subscribed: boolean;
}

interface EventValues {
	event: string;
}

/**
 *
 */
export default function Index() {
	const router = useRouter();

	if (!router.isReady) {
		return <FullscreenLoader />;
	}

	const [eventModal, setEventModal] = useState(false);

	const project = useActiveProject();
	const { data: contact, mutate } = useContact({
		id: router.query.id as string,
	});

	const { handleSubmit, watch, setValue, reset } = useForm<ContactValues>({
		resolver: zodResolver(ContactSchemas.manage),
	});

	const {
		register: dataRegister,
		control,
		getValues: getDataValues,
		reset: dataReset,
	} = useForm({
		defaultValues: {
			data: Object.entries(JSON.parse(contact?.data ? contact.data : "{}")).map(([key]) => ({
				value: { key },
			})),
		},
		resolver: zodResolver(
			z.object({
				data: z
					.array(
						z.object({
							value: z.object({ key: z.string(), value: z.string() }),
						}),
					)
					.min(0),
			}),
		),
	});

	const { fields, append: fieldAppend, remove: fieldRemove } = useFieldArray({ control, name: "data" });

	const {
		register: eventRegister,
		handleSubmit: eventHandleSubmit,
		formState: { errors: eventErrors },
		reset: eventReset,
	} = useForm<EventValues>({
		resolver: zodResolver(EventSchemas.post.pick({ event: true })),
	});

	useEffect(() => {
		if (!contact) {
			return;
		}

		reset({
			email: contact.email,
			subscribed: contact.subscribed,
		});
		dataReset({
			data: Object.entries(JSON.parse(contact.data ? contact.data : "{}")).map(([key, value]) => ({
				value: { key, value },
			})),
		});
	}, [dataReset, reset, contact]);

	if (!contact) {
		return <FullscreenLoader />;
	}

	const create = (data: EventValues) => {
		toast.promise(
			network.mock<Template, typeof EventSchemas.post>(project.secret, "POST", "/v1", {
				...data,
				email: contact.email,
			}),
			{
				loading: "Creating new event",
				success: () => {
					void mutate();
					eventReset();
					return "Created new event";
				},
				error: "Could not create new event!",
			},
		);

		setEventModal(false);
	};

	const update = (data: ContactValues) => {
		const entries = getDataValues().data.map(({ value }) => [value.key, value.value]);
		let dataObject = {};

		entries.forEach(([key, value]) => {
			Object.assign(dataObject, { [key]: value });
		});

		dataObject = Object.fromEntries(Object.entries(dataObject).filter(([, value]) => value !== ""));

		toast.promise(
			network.mock<Contact, typeof ContactSchemas.manage>(project.secret, "PUT", "/v1/contacts", {
				...data,
				data: dataObject,
			}),
			{
				loading: "Saving your changes",
				success: () => {
					void mutate();
					return "Saved your changes";
				},
				error: "Could not save your changes!",
			},
		);
	};

	const remove = async (e: { preventDefault: () => void }) => {
		e.preventDefault();
		toast.promise(
			network.mock<Contact, typeof UtilitySchemas.id>(project.secret, "DELETE", "/v1/contacts", {
				id: contact.id,
			}),
			{
				loading: "Deleting contact",
				success: "Deleted contact",
				error: "Could not delete contact!",
			},
		);

		await router.push("/contacts");
	};

	return (
		<>
			<Modal
				isOpen={eventModal}
				onToggle={() => setEventModal(!eventModal)}
				onAction={eventHandleSubmit(create)}
				type={"info"}
				action={"Trigger"}
				title={"Trigger event"}
				description={`Trigger an event for ${contact.email}`}
				icon={
					<>
						<rect strokeWidth={2} width="14.5" height="14.5" x="4.75" y="4.75" rx="2" />
						<path strokeWidth={2} d="M8.75 10.75L11.25 13L8.75 15.25" />
					</>
				}
			>
				<Input register={eventRegister("event")} label={"Event"} placeholder={"signup"} error={eventErrors.event} />
			</Modal>
			<Dashboard>
				<Card
					title={""}
					options={
						<>
							<button
								onClick={() => setEventModal(true)}
								className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100"
								role="menuitem"
								tabIndex={-1}
							>
								<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
									<rect
										width="14.5"
										height="14.5"
										x="4.75"
										y="4.75"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										rx="2"
									/>
									<path
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1.5"
										d="M8.75 10.75L11.25 13L8.75 15.25"
									/>
								</svg>
								Trigger event
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
					<form onSubmit={handleSubmit(update)} className="space-y-6 sm:grid sm:gap-x-5 sm:space-y-9 sm:grid-cols-2">
						<div className={"col-span-2 flex items-center gap-6"}>
							<span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
								<span className="text-xl font-semibold leading-none text-neutral-800">{contact.email[0].toUpperCase()}</span>
							</span>
							<h1 className={"text-2xl font-semibold text-neutral-800"}>
								{contact.email[0].toUpperCase()}
								{contact.email.slice(1)}
							</h1>
						</div>

						<div className={"grid sm:col-span-2"}>
							<div className={"grid items-center gap-3 sm:grid-cols-9"}>
								<label htmlFor={"data"} className="block text-sm font-medium text-neutral-700 sm:col-span-8">
									Metadata
								</label>
								<button
									onClick={(e) => {
										e.preventDefault();
										fieldAppend({ value: { key: "", value: "" } });
									}}
									className={
										"ml-auto flex w-full items-center justify-center gap-x-0.5 rounded border border-neutral-200 bg-white py-1 text-center text-sm text-neutral-700 transition ease-in-out hover:bg-neutral-50 sm:col-span-1"
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
									Add
								</button>
							</div>

							{fields.length > 0 ? (
								fields.map((field, index) => {
									return (
										<>
											<div key={field.id}>
												<div className="grid w-full grid-cols-9 items-end gap-3">
													<div className={"col-span-4"}>
														<label htmlFor={"data"} className="text-xs font-light">
															Key
														</label>
														<input
															type={"text"}
															placeholder={"Key"}
															className={
																"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
															}
															key={field.id}
															{...dataRegister(`data.${index}.value.key`)}
														/>
													</div>

													<div className={"col-span-4"}>
														<label htmlFor={"data"} className="text-xs font-light">
															Value
														</label>
														<input
															type={"text"}
															placeholder={"Value"}
															className={
																"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
															}
															key={field.id}
															{...dataRegister(`data.${index}.value.value`)}
														/>
													</div>
													<button
														className={
															"col-span-1 flex h-10 items-center justify-center rounded bg-red-100 text-sm text-red-800 transition hover:bg-red-200"
														}
														onClick={(e) => {
															e.preventDefault();
															fieldRemove(index);
														}}
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
															<path
																stroke="currentColor"
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth="1.5"
																d="M5 7.75H19"
															/>
														</svg>
													</button>
												</div>
											</div>
										</>
									);
								})
							) : (
								<p className={"text-sm text-neutral-500"}>No fields added</p>
							)}
						</div>

						<div className={"col-span-2"}>
							<Toggle
								title={"Subscribed"}
								description={
									watch("subscribed")
										? "This contact has opted-in to receive marketing emails"
										: "This contact prefers not to receive marketing emails"
								}
								toggled={watch("subscribed")}
								onToggle={() => setValue("subscribed", !watch("subscribed"))}
							/>
						</div>

						<div className={"col-span-2 ml-auto flex justify-end gap-x-5"}>
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
						</div>
					</form>
				</Card>
				<Card title={"Journey"}>
					{contact.triggers.length > 0 || contact.emails.length > 0 ? (
						<div className="scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full flow-root h-96 max-h-96 overflow-y-auto pr-6">
							<ul className="-mb-8">
								{[...contact.triggers, ...contact.emails]
									.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
									.map((t, index) => {
										if (t.messageId) {
											const email = t as Email;

											return (
												<li>
													<div className="relative pb-8">
														{contact.triggers.length + contact.emails.length - 1 !== index && (
															<span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />
														)}

														<div className="relative flex space-x-3">
															<div>
																<span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
																	<svg
																		className={"h-5 w-5"}
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 24 24"
																		strokeWidth="1.5"
																		stroke="currentColor"
																		fill="none"
																		strokeLinecap="round"
																		strokeLinejoin="round"
																	>
																		<>
																			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
																			<rect x="3" y="5" width="18" height="14" rx="2" />
																			<polyline points="3 7 12 13 21 7" />
																		</>
																	</svg>
																</span>
															</div>
															<div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
																<div>
																	<p className="text-sm text-neutral-500">Transactional email {email.subject} delivered</p>
																</div>
																<div className="whitespace-nowrap text-right text-sm text-neutral-500">
																	<time dateTime={dayjs(t.createdAt).format("YYYY-MM-DD")}>{dayjs().to(t.createdAt)}</time>
																</div>
															</div>
														</div>
													</div>
												</li>
											);
										}

										if (t.action) {
											return (
												<li>
													<div className="relative pb-8">
														{contact.triggers.length + contact.emails.length - 1 !== index && (
															<span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />
														)}

														<div className="relative flex space-x-3">
															<div>
																<span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
																	<svg
																		className={"h-5 w-5"}
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 24 24"
																		strokeWidth="1.5"
																		stroke="currentColor"
																		fill="none"
																		strokeLinecap="round"
																		strokeLinejoin="round"
																	>
																		<path d="M16 21h3c.81 0 1.48 -.67 1.48 -1.48l.02 -.02c0 -.82 -.69 -1.5 -1.5 -1.5h-3v3z" />
																		<path d="M16 15h2.5c.84 -.01 1.5 .66 1.5 1.5s-.66 1.5 -1.5 1.5h-2.5v-3z" />
																		<path d="M4 9v-4c0 -1.036 .895 -2 2 -2s2 .964 2 2v4" />
																		<path d="M2.99 11.98a9 9 0 0 0 9 9m9 -9a9 9 0 0 0 -9 -9" />
																		<path d="M8 7h-4" />
																	</svg>
																</span>
															</div>
															<div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
																<div>
																	<p className="text-sm text-neutral-500">{t.action.name} triggered</p>
																</div>
																<div className="whitespace-nowrap text-right text-sm text-neutral-500">
																	<time dateTime={dayjs(t.createdAt).format("YYYY-MM-DD")}>{dayjs().to(t.createdAt)}</time>
																</div>
															</div>
														</div>
													</div>
												</li>
											);
										}

										if (t.event) {
											return (
												<li>
													<div className="relative pb-8">
														{contact.triggers.length + contact.emails.length - 1 !== index && (
															<span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />
														)}
														<div className="relative flex space-x-3">
															<div>
																<span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
																	{t.event.templateId ? (
																		<svg
																			className={"h-5 w-5"}
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 24 24"
																			strokeWidth="1.5"
																			stroke="currentColor"
																			fill="none"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																		>
																			{t.event.name.includes("delivered") ? (
																				<>
																					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
																					<rect x="3" y="5" width="18" height="14" rx="2" />
																					<polyline points="3 7 12 13 21 7" />
																				</>
																			) : (
																				<>
																					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
																					<polyline points="3 9 12 15 21 9 12 3 3 9" />
																					<path d="M21 9v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" />
																					<line x1="3" y1="19" x2="9" y2="13" />
																					<line x1="15" y1="13" x2="21" y2="19" />
																				</>
																			)}
																		</svg>
																	) : t.event.campaignId ? (
																		<svg
																			className={"h-5 w-5"}
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 24 24"
																			strokeWidth="1.5"
																			stroke="currentColor"
																			fill="none"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																		>
																			<path d="M13 5h8" />
																			<path d="M13 9h5" />
																			<path d="M13 15h8" />
																			<path d="M13 19h5" />
																			<rect x="3" y="4" width="6" height="6" rx="1" />
																			<rect x="3" y="14" width="6" height="6" rx="1" />
																		</svg>
																	) : (
																		<svg
																			className={"h-5 w-5"}
																			xmlns="http://www.w3.org/2000/svg"
																			viewBox="0 0 24 24"
																			strokeWidth="1.5"
																			stroke="currentColor"
																			fill="none"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																		>
																			<path d="M8 9l3 3l-3 3" />
																			<line x1="13" y1="15" x2="16" y2="15" />
																			<rect x="3" y="4" width="18" height="16" rx="2" />
																		</svg>
																	)}
																</span>
															</div>
															<div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
																<div>
																	<p className="text-sm text-neutral-500">
																		{t.event.templateId || t.event.campaignId
																			? `${t.event.name.charAt(0).toUpperCase()}${t.event.name
																					.replaceAll("-", " ")
																					.slice(1)
																					.replace(/(delivered|opened)$/, "")}`
																			: t.event.name}{" "}
																		{t.event.templateId
																			? t.event.name.endsWith("delivered")
																				? "delivered"
																				: "opened"
																			: t.event.campaignId
																				? t.event.name.endsWith("delivered")
																					? "delivered"
																					: "opened"
																				: "triggered"}
																	</p>
																</div>
																<div className="whitespace-nowrap text-right text-sm text-neutral-500">
																	<time dateTime={dayjs(t.createdAt).format("YYYY-MM-DD")}>{dayjs().to(t.createdAt)}</time>
																</div>
															</div>
														</div>
													</div>
												</li>
											);
										}
									})}
							</ul>
						</div>
					) : (
						<Empty title={"No triggers"} description={"This contact has not yet triggered any events or actions"} />
					)}
				</Card>
			</Dashboard>
		</>
	);
}

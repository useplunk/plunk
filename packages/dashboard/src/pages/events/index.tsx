import { zodResolver } from "@hookform/resolvers/zod";
import { EventSchemas, type UtilitySchemas } from "@plunk/shared";
import type { Template } from "@prisma/client";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Plus, TerminalSquare, Trash } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { toast } from "sonner";
import {
	Alert,
	Badge,
	Card,
	Empty,
	FullscreenLoader,
	Input,
	Modal,
	Skeleton,
	Table,
} from "../../components";
import { Dashboard } from "../../layouts";
import { useContactsCount } from "../../lib/hooks/contacts";
import { useEvents } from "../../lib/hooks/events";
import { useActiveProject } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

interface EventValues {
	event: string;
}

/**
 *
 */
export default function Index() {
	const project = useActiveProject();
	const { data: user } = useUser();
	const { data: contacts } = useContactsCount();
	const { data: events, mutate } = useEvents();

	const [eventModal, setEventModal] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<EventValues>({
		resolver: zodResolver(EventSchemas.post.pick({ event: true })),
	});

	if (!project || !user) {
		return <FullscreenLoader />;
	}

	const create = (data: EventValues) => {
		toast.promise(
			network.mock<Template, typeof EventSchemas.post>(
				project.secret,
				"POST",
				"/v1",
				{
					...data,
					email: user.email,
					subscribed: true,
				},
			),
			{
				loading: "Creating new event",
				success: () => {
					void mutate();
					reset();
					return "Created new event";
				},
				error: "Could not create new event!",
			},
		);

		setEventModal(false);
	};

	const remove = (id: string) => {
		toast.promise(
			network.mock<Event, typeof UtilitySchemas.id>(
				project.secret,
				"DELETE",
				"/v1/events",
				{
					id,
				},
			),
			{
				loading: "Deleting your event",
				success: () => {
					void mutate();
					return "Deleted your event";
				},
				error: "Could not delete your event!",
			},
		);
	};

	return (
		<>
			<Modal
				isOpen={eventModal}
				onToggle={() => setEventModal(!eventModal)}
				onAction={handleSubmit(create)}
				type={"info"}
				action={"Trigger"}
				title={"Create a new event"}
				description={"Trigger a new event to send out emails to your contacts"}
				icon={
					<>
						<rect
							strokeWidth={2}
							width="14.5"
							height="14.5"
							x="4.75"
							y="4.75"
							rx="2"
						/>
						<path strokeWidth={2} d="M8.75 10.75L11.25 13L8.75 15.25" />
					</>
				}
			>
				<Input
					register={register("event")}
					label={"Event"}
					placeholder={"user-signup"}
					error={errors.event}
				/>
			</Modal>

			<Dashboard>
				{events?.length === 0 && (
					<Alert type={"info"} title={"Need a hand?"}>
						<div className={"mt-3 grid items-center sm:grid-cols-4"}>
							<p className={"sm:col-span-3"}>
								Want us to help you get started? We can help you build your
								first action in less than 5 minutes.
							</p>

							<Link
								href={"/onboarding/actions"}
								className={
									"inline-block rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white sm:col-span-1"
								}
							>
								Build an action
							</Link>
						</div>
					</Alert>
				)}

				<Card
					title={"Events"}
					description={"View the events your application has sent to Plunk"}
					actions={
						<>
							<motion.button
								onClick={() => setEventModal(true)}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.9 }}
								className={
									"flex items-center gap-x-1 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
								}
							>
								<Plus strokeWidth={1.5} size={18} />
								New
							</motion.button>
						</>
					}
				>
					{events && contacts ? (
						events.filter((event) => !event.templateId && !event.campaignId)
							.length > 0 ? (
							<Table
								values={events
									.filter((event) => !event.templateId && !event.campaignId)
									.sort((a, b) => {
										const aTrigger =
											a.triggers.length > 0
												? a.triggers.sort()[0].createdAt
												: a.createdAt;

										const bTrigger =
											b.triggers.length > 0
												? b.triggers.sort()[0].createdAt
												: b.createdAt;

										return bTrigger > aTrigger ? 1 : -1;
									})
									.map((e) => {
										return {
											Event: e.name,
											"Triggered by users": (
												<Badge type={"info"}>{`${
													e.triggers.length > 0
														? Math.round(
																([
																	...new Map(
																		e.triggers.map((t) => [t.contactId, t]),
																	).values(),
																].length /
																	contacts) *
																	100,
															)
														: 0
												}%`}</Badge>
											),
											"Total triggers": e.triggers.length,
											Timeline: (
												<>
													<ResponsiveContainer width={100} height={40}>
														<AreaChart
															width={100}
															height={40}
															data={Object.entries(
																e.triggers.reduce(
																	(acc, cur) => {
																		const date = dayjs(cur.createdAt).format(
																			"MM/YYYY",
																		);

																		if (acc[date]) {
																			acc[date] += 1;
																		} else {
																			acc[date] = 1;
																		}

																		return acc;
																	},
																	{} as Record<string, number>,
																),
															)
																.sort((a, b) => {
																	// day is the month with year e.g 01/2021
																	const aDay = a[0];
																	const bDay = b[0];

																	return aDay > bDay ? 1 : -1;
																})
																.map(([day, count]) => {
																	return {
																		day,
																		count,
																	};
																})}
															margin={{
																top: 5,
																right: 0,
																left: 0,
															}}
														>
															<defs>
																<linearGradient
																	id="gradientFill"
																	x1="0"
																	y1="0"
																	x2="0"
																	y2="1"
																>
																	<stop
																		offset="100%"
																		stopColor="#2563eb"
																		stopOpacity={0.4}
																	/>
																	<stop
																		offset="100%"
																		stopColor="#93c5fd"
																		stopOpacity={0}
																	/>
																</linearGradient>
															</defs>

															<YAxis
																axisLine={false}
																fill={"#fff"}
																tickSize={0}
																width={5}
																interval={0}
															/>

															<Area
																type="monotone"
																dataKey="count"
																stroke="#2563eb"
																fill="url(#gradientFill)"
																strokeWidth={2}
															/>
														</AreaChart>
													</ResponsiveContainer>
												</>
											),
											"Last Activity": dayjs()
												.to(
													e.triggers.length > 0
														? e.triggers.sort((a, b) => {
																return b.createdAt > a.createdAt ? 1 : -1;
															})[0].createdAt
														: e.createdAt,
												)
												.toString(),
											Trigger: (
												<button
													onClick={() => {
														toast.promise(
															network.mock<true, typeof EventSchemas.post>(
																project.secret,
																"POST",
																"/v1",
																{
																	email: user.email,
																	event: e.name,
																	subscribed: true,
																},
															),
															{
																loading: "Creating new trigger",
																success: () => {
																	void mutate();
																	return "Trigger created";
																},
																error: "Could not create new trigger!",
															},
														);
													}}
													className={
														"flex items-center text-center text-sm font-medium transition hover:text-neutral-800"
													}
												>
													<TerminalSquare size={18} />
												</button>
											),

											Remove: !e.templateId ? (
												<button
													onClick={() => remove(e.id)}
													className={
														"flex items-center text-center text-sm font-medium transition hover:text-neutral-800"
													}
												>
													<Trash size={18} />
												</button>
											) : (
												<span className={"text-xs"}>Cannot be deleted</span>
											),
										};
									})}
							/>
						) : (
							<Empty
								title={"No events"}
								description={"You have not yet posted an event to Plunk"}
							/>
						)
					) : (
						<Skeleton type={"table"} />
					)}
				</Card>
				<Card
					title={"Template events"}
					description={"Events linked to your templates"}
				>
					{events && contacts ? (
						events.filter((event) => event.templateId).length > 0 ? (
							<Table
								values={events
									.filter((event) => event.templateId)
									.sort((a, b) => {
										const aTrigger =
											a.triggers.length > 0
												? a.triggers.sort()[0].createdAt
												: a.createdAt;

										const bTrigger =
											b.triggers.length > 0
												? b.triggers.sort()[0].createdAt
												: b.createdAt;

										return bTrigger > aTrigger ? 1 : -1;
									})
									.map((e) => {
										return {
											Event: e.name,
											"Triggered by users": (
												<Badge type={"info"}>{`${
													e.triggers.length > 0
														? Math.round(
																([
																	...new Map(
																		e.triggers.map((t) => [t.contactId, t]),
																	).values(),
																].length /
																	contacts) *
																	100,
															)
														: 0
												}%`}</Badge>
											),
											"Total times triggered": e.triggers.length,
											"Last Activity": dayjs()
												.to(
													e.triggers.length > 0
														? e.triggers.sort((a, b) => {
																return b.createdAt > a.createdAt ? 1 : -1;
															})[0].createdAt
														: e.createdAt,
												)
												.toString(),
										};
									})}
							/>
						) : (
							<Empty
								title={"No template events"}
								description={
									"All delivery tracking for templates can be found here"
								}
							/>
						)
					) : (
						<Skeleton type={"table"} />
					)}
				</Card>
			</Dashboard>
		</>
	);
}

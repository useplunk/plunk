import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Plus, Workflow } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Alert, Badge, Card, Empty, FullscreenLoader, Skeleton } from "../../components";
import { Dashboard } from "../../layouts";
import { useActions } from "../../lib/hooks/actions";
import { useActiveProject } from "../../lib/hooks/projects";

/**
 *
 */
export default function Index() {
	const project = useActiveProject();
	const { data: actions } = useActions();

	if (!project) {
		return <FullscreenLoader />;
	}

	return (
		<>
			<Dashboard>
				{actions?.length === 0 && (
					<Alert type={"info"} title={"Need a hand?"}>
						<div className={"mt-3 grid items-center sm:grid-cols-4"}>
							<p className={"sm:col-span-3"}>
								Want us to help you get started? We can help you build your first action in less than 5 minutes.
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
					title={"Actions"}
					description={"Repeatable automations that can be triggered by your applications"}
					actions={
						<>
							<Link href={"actions/new"} passHref>
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.9 }}
									className={
										"flex items-center gap-x-1 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
									}
								>
									<Plus strokeWidth={1.5} size={18} />
									New
								</motion.button>
							</Link>
						</>
					}
				>
					{actions ? (
						actions.length > 0 ? (
							<>
								<div className={"grid grid-cols-1 gap-6 lg:grid-cols-2"}>
									{actions
										.sort((a, b) => {
											if (a.name < b.name) {
												return -1;
											}

											if (a.name > b.name) {
												return 1;
											}

											return 0;
										})
										.map((a) => {
											return (
												<>
													<div
														className="col-span-1 divide-y divide-neutral-200 rounded border border-neutral-200 bg-white"
														key={a.id}
													>
														<div className="flex w-full items-center justify-between space-x-6 p-6">
															<span className="inline-flex rounded bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
																<Workflow size={20} />
															</span>
															<div className="flex-1 truncate">
																<div className="flex items-center space-x-3">
																	<h3 className="truncate text-lg font-bold text-neutral-800">{a.name}</h3>
																</div>
																<div className={"mb-6"}>
																	<h2 className={"text col-span-2 truncate font-semibold text-neutral-700"}>Quick stats</h2>
																	<div className={"grid grid-cols-2 gap-3"}>
																		<div>
																			<label className={"text-xs font-medium text-neutral-500"}>Total triggers</label>
																			<p className="mt-1 truncate text-sm text-neutral-500">{a.triggers.length}</p>
																		</div>

																		<div>
																			<label className={"text-xs font-medium text-neutral-500"}>Last activity</label>
																			<p className="mt-1 truncate text-sm text-neutral-500">
																				{a.triggers.length > 0 ? "Last triggered" : "Created"}{" "}
																				{dayjs()
																					.to(
																						a.triggers.length > 0
																							? a.triggers.sort((a, b) => {
																									return a.createdAt > b.createdAt ? -1 : 1;
																								})[0].createdAt
																							: a.createdAt,
																					)
																					.toString()}
																			</p>
																		</div>
																		<div>
																			<label className={"text-xs font-medium text-neutral-500"}>Open rate</label>
																			<p className="mt-1 truncate text-sm text-neutral-500">
																				{a.emails.length > 0
																					? Math.round((a.emails.filter((e) => e.status === "OPENED").length / a.emails.length) * 100)
																					: 0}
																				%
																			</p>
																		</div>
																		{a.delay > 0 && (
																			<div>
																				<label className={"text-xs font-medium text-neutral-500"}>Emails in queue</label>
																				<p className="mt-1 truncate text-sm text-neutral-500">{a.tasks.length}</p>
																			</div>
																		)}
																	</div>
																</div>
																<div className={"my-4"}>
																	<h2 className={"col-span-2 truncate font-semibold text-neutral-700"}>Properties</h2>
																	<div className={"grid grid-cols-2 gap-3"}>
																		<div>
																			<label className={"text-xs font-medium text-neutral-500"}>Repeats</label>
																			<p className="mt-1 truncate text-sm text-neutral-500">
																				<Badge type={a.runOnce ? "success" : "info"}>
																					{a.runOnce ? "Runs once per user" : "Recurring"}
																				</Badge>
																			</p>
																		</div>
																		<div>
																			<label className={"text-xs font-medium text-neutral-500"}>Delay</label>
																			<p className="mt-1 truncate text-sm text-neutral-500">
																				<Badge type={a.delay === 0 ? "info" : "success"}>
																					{a.delay === 0
																						? "Instant"
																						: a.delay % 1440 === 0
																							? `${a.delay / 1440} day delay`
																							: a.delay % 60 === 0
																								? `${a.delay / 60} hour delay`
																								: `${a.delay} minute delay`}
																				</Badge>
																			</p>
																		</div>
																	</div>
																</div>
															</div>
														</div>
														<div>
															<div className="-mt-px flex divide-x divide-neutral-200">
																<div className="flex w-0 flex-1">
																	<Link
																		href={`/actions/${a.id}`}
																		passHref
																		className="relative inline-flex w-0 flex-1 items-center justify-center rounded-bl rounded-br py-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 hover:text-neutral-700"
																	>
																		<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
																			<path
																				stroke="currentColor"
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth="1.5"
																				d="M4.75 19.25L9 18.25L18.2929 8.95711C18.6834 8.56658 18.6834 7.93342 18.2929 7.54289L16.4571 5.70711C16.0666 5.31658 15.4334 5.31658 15.0429 5.70711L5.75 15L4.75 19.25Z"
																			/>
																			<path
																				stroke="currentColor"
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth="1.5"
																				d="M19.25 19.25H13.75"
																			/>
																		</svg>

																		<span className="ml-3">Edit</span>
																	</Link>
																</div>
															</div>
														</div>
													</div>
												</>
											);
										})}
								</div>
							</>
						) : (
							<>
								<Empty title={"No actions here"} description={"Set up a new automation in a few clicks"} />
							</>
						)
					) : (
						<Skeleton type={"table"} />
					)}
				</Card>
			</Dashboard>
		</>
	);
}

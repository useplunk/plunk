import { motion } from "framer-motion";
import { Plus, Send } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Badge, Card, Empty, Skeleton } from "../../components";
import { Dashboard } from "../../layouts";
import { useCampaigns } from "../../lib/hooks/campaigns";

/**
 *
 */
export default function Index() {
	const { data: campaigns } = useCampaigns();

	return (
		<>
			<Dashboard>
				<Card
					title={"Campaigns"}
					description={"Send your contacts emails in bulk with a few clicks"}
					actions={
						<>
							<Link href={"/campaigns/new"} passHref>
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
					{campaigns ? (
						campaigns.length > 0 ? (
							<>
								<div className={"grid grid-cols-1 gap-6 sm:grid-cols-2"}>
									{campaigns.map((c) => {
										return (
											<>
												<div
													className="col-span-1 divide-y divide-neutral-200 rounded border border-neutral-200 bg-white"
													key={c.id}
												>
													<div className="flex w-full items-center justify-between space-x-6 p-6">
														<span className="inline-flex rounded bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
															<Send size={20} />
														</span>
														<div className="flex-1 truncate">
															<div className="flex items-center space-x-3">
																<h3 className="truncate text-lg font-bold text-neutral-800">{c.subject}</h3>
															</div>
															<div className={"mb-6"}>
																<h2 className={"text col-span-2 truncate font-semibold text-neutral-700"}>Quick Stats</h2>
																<div className={"grid grid-cols-2 gap-3"}>
																	{c.status === "DELIVERED" ? (
																		<>
																			<div>
																				<label className={"text-xs font-medium text-neutral-500"}>Open rate</label>
																				<p className="mt-1 truncate text-sm text-neutral-500">
																					{c.emails_count > 0
																						? Math.round((c.opened_emails_count / c.emails_count) * 100)
																						: 0}
																					%
																				</p>
																			</div>

																			{c.tasks_count > 0 && (
																				<div>
																					<label className={"text-xs font-medium text-neutral-500"}>Emails in queue</label>
																					<p className="mt-1 truncate text-sm text-neutral-500">{c.tasks_count}</p>
																				</div>
																			)}
																		</>
																	) : (
																		<>
																			<div>
																				<label className={"text-xs font-medium text-neutral-500"}>Open rate</label>
																				<p className="mt-1 truncate text-sm text-neutral-500">Awaiting delivery</p>
																			</div>
																		</>
																	)}
																</div>
															</div>
															<div className={"my-4"}>
																<h2 className={"col-span-2 truncate font-semibold text-neutral-700"}>Properties</h2>
																<div className={"grid grid-cols-2 gap-3"}>
																	<div>
																		<label className={"text-xs font-medium text-neutral-500"}>Recipients</label>
																		<p className="mt-1 truncate text-sm text-neutral-500">{c.emails_count}</p>
																	</div>

																	<div>
																		<label className={"text-xs font-medium text-neutral-500"}>Status</label>
																		<p className="mt-1 truncate text-sm text-neutral-500">
																			{c.status === "DRAFT" ? (
																				<Badge type={"info"}>Draft</Badge>
																			) : (
																				<Badge type={c.tasks_count > 0 ? "info" : "success"}>
																					{c.tasks_count > 0 ? "Sending" : "Delivered"}
																				</Badge>
																			)}
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
																	href={`/campaigns/${c.id}`}
																	className="relative inline-flex w-0 flex-1 items-center justify-center rounded-bl rounded-br py-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 hover:text-neutral-700"
																>
																	<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
																		{c.status === "DELIVERED" ? (
																			<>
																				<path
																					stroke="currentColor"
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					strokeWidth="1.5"
																					d="M19.25 12C19.25 13 17.5 18.25 12 18.25C6.5 18.25 4.75 13 4.75 12C4.75 11 6.5 5.75 12 5.75C17.5 5.75 19.25 11 19.25 12Z"
																				/>
																				<circle
																					cx="12"
																					cy="12"
																					r="2.25"
																					stroke="currentColor"
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					strokeWidth="1.5"
																				/>
																			</>
																		) : (
																			<>
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
																			</>
																		)}
																	</svg>

																	<span className="ml-3">{c.status === "DELIVERED" ? "View" : "Edit"}</span>
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
							<Empty title={"No campaigns found"} description={"Send your contacts emails in bulk with a few clicks"} />
						)
					) : (
						<Skeleton type={"table"} />
					)}
				</Card>
			</Dashboard>
		</>
	);
}

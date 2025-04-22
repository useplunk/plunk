import dayjs from "dayjs";
import { Book, Eye, Frown, LineChart, Send } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Badge, Card, Empty, FullscreenLoader, Redirect, Skeleton, Table } from "../components";
import { Dashboard } from "../layouts";
import { useActiveProject, useActiveProjectFeed, useProjects } from "../lib/hooks/projects";

/**
 *
 */
export default function Index() {
	const [feedPage, setFeedPage] = useState(1);

	const activeProject = useActiveProject();
	const { data: projects } = useProjects();
	const { data: feed } = useActiveProjectFeed(feedPage);

	if (projects?.length === 0) {
		return <Redirect to={"/new"} />;
	}

	if (!activeProject) {
		return <FullscreenLoader />;
	}

	return (
		<>
			<Dashboard>
				<>
					<div className="divide-y divide-neutral-200 overflow-hidden rounded border border-neutral-200 bg-neutral-200 lg:grid lg:grid-cols-3 lg:gap-px lg:divide-y-0">
						<div className="group relative rounded-tl rounded-tr bg-white p-6 transition focus-within:ring-2 focus-within:ring-inset focus-within:ring-neutral-800 lg:rounded-tr-none">
							{activeProject.verified ? (
								<>
									<div>
										<span className="inline-flex rounded bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
											<Send size={20} />
										</span>
									</div>
									<div className="mt-8">
										<h3 className="text-lg font-medium">
											<Link href={"/campaigns/new"} className="focus:outline-none">
												<span className="absolute inset-0" aria-hidden="true" />
												Send a campaign
											</Link>
										</h3>
										<p className="mt-2 text-sm text-neutral-500">Send a broadcast to your contacts</p>
									</div>
								</>
							) : (
								<>
									<div>
										<span className="inline-flex rounded bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
											<svg
												className="h-6 w-6"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												aria-hidden="true"
											>
												<circle
													cx="12"
													cy="12"
													r="7.25"
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="1.5"
												/>
												<path
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="1.5"
													d="M15.25 12C15.25 16.5 13.2426 19.25 12 19.25C10.7574 19.25 8.75 16.5 8.75 12C8.75 7.5 10.7574 4.75 12 4.75C13.2426 4.75 15.25 7.5 15.25 12Z"
												/>
												<path
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="1.5"
													d="M5 12H12H19"
												/>
											</svg>
										</span>
									</div>
									<div className="mt-8">
										<Badge type={"danger"}>Important</Badge>
										<h3 className="mt-3 text-lg font-medium">
											<Link href={"/settings/identity"} className="focus:outline-none">
												<span className="absolute inset-0" aria-hidden="true" />
												Verify your domain
											</Link>
										</h3>
										<p className="mt-2 text-sm text-neutral-500">Verify your domain before you send emails</p>
									</div>
								</>
							)}

							<span
								className="pointer-events-none absolute right-6 top-6 text-neutral-300 transition group-hover:text-neutral-400"
								aria-hidden="true"
							>
								<svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
								</svg>
							</span>
						</div>

						<div className="group relative bg-white p-6 transition focus-within:ring-2 focus-within:ring-inset focus-within:ring-neutral-800 lg:rounded-tr">
							<div>
								<span className="inline-flex rounded bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
									<LineChart size={20} />
								</span>
							</div>
							<div className="mt-2 flex h-4/6 flex-col justify-end">
								<h3 className="text-lg font-medium">
									<Link href={"/analytics"} passHref className="focus:outline-none">
										<span className="absolute inset-0" aria-hidden="true" />
										Analytics
									</Link>
								</h3>
								<p className="mt-2 text-sm text-neutral-500">Discover insights about your emails</p>
							</div>
							<span
								className="pointer-events-none absolute right-6 top-6 text-neutral-300 transition group-hover:text-neutral-400"
								aria-hidden="true"
							>
								<svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
								</svg>
							</span>
						</div>

						<div className="group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-neutral-800 lg:rounded-bl">
							<div>
								<span className="inline-flex rounded bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
									<Book size={20} />
								</span>
							</div>
							<div className="mt-2 flex h-4/6 flex-col justify-end">
								<h3 className="text-lg font-medium">
									<a href={"https://docs.useplunk.com"} target={"_blank"} className="focus:outline-none" rel="noreferrer">
										<span className="absolute inset-0" aria-hidden="true" />
										Documentation
									</a>
								</h3>
								<p className="mt-2 text-sm text-neutral-500">Discover how to use Plunk</p>
							</div>
							<span
								className="pointer-events-none absolute right-6 top-6 text-neutral-300 transition group-hover:text-neutral-400"
								aria-hidden="true"
							>
								<svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
								</svg>
							</span>
						</div>
					</div>

					<Card title={"Activity feed"}>
						{feed ? (
							feed.length === 0 ? (
								<>
									<Empty
										icon={<Frown size={24} />}
										title={"No feed yet"}
										description={"Send an email or track an event to see it here"}
									/>
								</>
							) : (
								<>
									<Table
										values={feed.map((f) => {
											if ("messageId" in f) {
												return {
													Email: f.contact.email,
													Activity: (
														<Badge type={"info"}>
															{f.createdAt === f.updatedAt ? "Email delivered" : `Email ${f.status.toLowerCase()}`}
														</Badge>
													),
													Type: <Badge type={"success"}>Email</Badge>,
													Time: dayjs().to(dayjs(f.createdAt)),
													View: (
														<Link href={`/contacts/${f.contact.id}`}>
															<Eye size={20} />
														</Link>
													),
												};
											}
											if (f.action) {
												return {
													Email: f.contact.email,
													Activity: <Badge type={"info"}>{f.action.name}</Badge>,
													Type: <Badge type={"info"}>Action</Badge>,
													Time: dayjs().to(dayjs(f.createdAt)),
													View: (
														<Link href={`/contacts/${f.contact.id}`}>
															<Eye size={20} />
														</Link>
													),
												};
											}
											if (f.event) {
												return {
													Email: f.contact.email,
													Activity: <Badge type={"info"}>{f.event.name}</Badge>,
													Type: <Badge type={"purple"}>Event</Badge>,
													Time: dayjs().to(dayjs(f.createdAt)),
													View: (
														<Link href={`/contacts/${f.contact.id}`}>
															<Eye size={20} />
														</Link>
													),
												};
											}

											return {};
										})}
									/>

									<button
										className={
											"mx-auto mt-5 block rounded border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-50"
										}
										onClick={() => {
											setFeedPage(feedPage + 1);
										}}
									>
										Load older
									</button>
								</>
							)
						) : (
							<Skeleton type={"table"} />
						)}
					</Card>
				</>
			</Dashboard>
		</>
	);
}

import { zodResolver } from "@hookform/resolvers/zod";
import { ActionSchemas, EventSchemas, TemplateSchemas } from "@plunk/shared";
import type { Template } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	CodeBlock,
	Dropdown,
	Editor,
	FullscreenLoader,
	Modal,
	MultiselectDropdown,
	Toggle,
	Tooltip,
} from "../../components";
import { API_URI } from "../../lib/constants";
import { useActions } from "../../lib/hooks/actions";
import { useEvents } from "../../lib/hooks/events";
import { useActiveProject } from "../../lib/hooks/projects";
import { useTemplates } from "../../lib/hooks/templates";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

interface EventValues {
	event: string;
}

interface TemplateValues {
	subject: string;
	body: string;
	type: "MARKETING" | "TRANSACTIONAL";
	style: "PLUNK" | "HTML";
}

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
	const router = useRouter();

	const activeProject = useActiveProject();
	const { data: user } = useUser();
	const { data: events, mutate: eventMutate } = useEvents();
	const { data: templates, mutate: templateMutate } = useTemplates();
	const { data: actions, mutate: actionMutate } = useActions();

	const [eventModal, setEventModal] = useState(false);
	const [advancedSettings, setAdvancedSettings] = useState(false);
	const [step, setStep] = useState<0 | 1 | 2 | 3>(0);

	const [language, setLanguage] = useState<
		"javascript" | "python" | "curl" | "PHP" | "ruby"
	>("curl");
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
				actionSetValue("delay", delay.delay);
				break;
			case "HOURS":
				actionSetValue("delay", delay.delay * 60);
				break;
			case "DAYS":
				actionSetValue("delay", delay.delay * 24 * 60);
				break;
		}
	}, [delay]);

	const {
		register: eventRegister,
		handleSubmit: eventHandleSubmit,
		formState: { errors: eventErrors },
		getValues: eventGetValues,
	} = useForm<EventValues>({
		resolver: zodResolver(EventSchemas.post.pick({ event: true })),
	});

	const {
		register: templateRegister,
		handleSubmit: templateHandleSubmit,
		formState: { errors: templateErrors },
		setValue: templateSetValue,
		watch: templateWatch,
	} = useForm<TemplateValues>({
		resolver: zodResolver(TemplateSchemas.create),
		defaultValues: {
			type: "MARKETING",
			style: "PLUNK",
			subject: "Welcome to Plunk!",
			body:
				'<h1 id="welcome-to-plunk-">Welcome to Plunk!</h1>\n' +
				"<p>Writing emails in Plunk is super easy, anyone do it! \n" +
				'They also support all sorts of cool stuff like <code>code blocks</code>, <strong>bold text</strong>, and <a href="https://www.useplunk.com">links</a>.</p><p><strong>Highlight this text</strong> and see what is possible!</p>',
		},
	});

	const {
		register: actionRegister,
		handleSubmit: actionHandleSubmit,
		formState: { errors: actionErrors },
		setValue: actionSetValue,
		watch: actionWatch,
	} = useForm<ActionValues>({
		resolver: zodResolver(ActionSchemas.create),
		defaultValues: {
			template: "No template selected",
			events: [],
			notevents: [],
			runOnce: false,
		},
	});

	if (!activeProject || !events || !user || !actions || !templates) {
		return <FullscreenLoader />;
	}

	const triggerEvent = (data: EventValues) => {
		toast.promise(
			network.mock<boolean, typeof EventSchemas.post>(
				activeProject.secret,
				"POST",
				"/v1/track",
				{
					event: data.event,
					email: user.email,
					subscribed: true,
				},
			),
			{
				loading: "Sending your event",
				success: () => {
					setEventModal(false);
					void eventMutate();

					return `${data.event} delivered`;
				},
				error: "Having trouble sending your event, we will try again later!",
			},
		);
	};

	const createTemplate = (data: TemplateValues) => {
		toast.promise(
			network.mock<Template, typeof TemplateSchemas.create>(
				activeProject.secret,
				"POST",
				"/v1/templates",
				{
					...data,
				},
			),
			{
				loading: "Creating new template",
				success: () => {
					void templateMutate();

					setStep(3);

					return "Created your template";
				},
				error: "Could not create new email!",
			},
		);
	};

	const createAction = (data: ActionValues) => {
		toast.promise(
			Promise.all([
				fetch("/api/plunk", {
					method: "POST",
					body: JSON.stringify({
						event: "onboarding-completed",
						email: user.email,
						data: {
							project: activeProject.name,
							firstEvent: events.sort(
								(a, b) =>
									new Date(a.createdAt).getTime() -
									new Date(b.createdAt).getTime(),
							)[0].name,
						},
					}),
					headers: { "Content-Type": "application/json" },
				}),
				network.mock<Template, typeof ActionSchemas.create>(
					activeProject.secret,
					"POST",
					"/v1/actions",
					{
						...data,
					},
				),
			]),
			{
				loading: "Creating new action",
				success: () => {
					void actionMutate();
					return "Created your action";
				},
				error: "Could not create new action!",
			},
		);
	};

	const renderStep = () => {
		switch (step) {
			case 0:
				return (
					<>
						<motion.div
							key={"welcome"}
							initial={{ opacity: 0, x: 100 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -100 }}
							className={
								"flex h-96 flex-col items-center justify-center text-center"
							}
						>
							<motion.span
								animate={{
									rotate: [0, 35, 0],
								}}
								transition={{ repeat: 5, duration: 1 }}
								className={"text-6xl"}
							>
								👋
							</motion.span>
							<h2 className={"my-4 text-4xl font-bold"}>Let's get started!</h2>
							<div className={"max-w-2xl font-medium text-neutral-500"}>
								<p>Are you ready to give Plunk Actions a spin?</p>

								<p>
									In this 3 step tutorial, we'll help you set up your first
									email action so that you have an example on hand when you are
									ready to start building your own.
								</p>
							</div>

							<motion.button
								whileTap={{ scale: 0.9 }}
								whileHover={{ scale: 1.05 }}
								onClick={() => setStep(1)}
								className={
									"mt-6 rounded bg-neutral-800 px-12 py-4 text-sm font-medium text-white"
								}
							>
								Let's get started!
							</motion.button>
						</motion.div>
					</>
				);
			case 1:
				return events.length > 0 ? (
					<>
						<motion.div
							key={"event-success"}
							initial={{ opacity: 0, x: 100 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -100 }}
							className={
								"flex h-96 flex-col items-center justify-center text-center"
							}
						>
							<motion.span
								animate={{
									rotate: [0, -180, 0],
								}}
								transition={{ repeat: 1, duration: 1 }}
								className={"text-6xl"}
							>
								🎉
							</motion.span>
							<h2 className={"my-4 text-2xl font-bold"}>
								Your event has successfully arrived
							</h2>
							<p className={"font-medium text-neutral-500 sm:w-1/2"}>
								We have received your event{" "}
								<span
									className={
										"rounded bg-neutral-50 px-2 py-0.5 font-mono text-neutral-600"
									}
								>
									{
										events.sort(
											(a, b) =>
												new Date(a.createdAt).getTime() -
												new Date(b.createdAt).getTime(),
										)[0].name
									}
								</span>
								, you are now ready to create your first email template!
							</p>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.9 }}
								onClick={() => setStep(2)}
								className={
									"mt-4 rounded-md bg-neutral-800 px-10 py-3 text-sm font-medium text-white"
								}
							>
								Design an email
							</motion.button>
						</motion.div>
					</>
				) : (
					<>
						<motion.div
							key={"event"}
							initial={{ opacity: 0, x: 100 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -100 }}
						>
							<div className={"mx-auto my-6 max-w-xl text-center"}>
								<h2 className={"my-2 text-2xl font-bold"}>
									Track your first event
								</h2>
								<p className={"font-medium text-neutral-500"}>
									Actions start from events. You can call them whatever you want
									and send them from anywhere using an API call.
								</p>
							</div>
							<div className={"mt-8 grid gap-6 sm:grid-cols-3"}>
								<div
									className={
										"border-b border-neutral-100 p-4 sm:col-span-2 sm:border-b-0 sm:border-r-2"
									}
								>
									<h3 className={"text-center font-semibold text-neutral-800"}>
										From your application
									</h3>
									<div className={"mt-3 space-y-6"}>
										<div>
											<Dropdown
												onChange={(e) =>
													setLanguage(e as "javascript" | "python" | "curl")
												}
												values={[
													{ value: "curl", name: "cURL" },
													{ name: "JavaScript", value: "javascript" },
													{ value: "python", name: "Python" },
													{ value: "PHP", name: "PHP" },
													{ value: "ruby", name: "Ruby" },
												]}
												selectedValue={language}
											/>
										</div>
										<CodeBlock
											style={{
												fontSize: "0.9rem",
												borderRadius: "0.5rem",
												padding: "1rem",
											}}
											language={language}
											code={
												{
													javascript: `await fetch('${API_URI}/v1/track', {
  method: 'POST',
  body: JSON.stringify({
    event: "my-new-event",
    email: "${user.email}"
  }),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${activeProject.secret}',
  },
});`,
													python: `import requests
                          
requests.post(
    "${API_URI}/v1/track",
    headers={"Content-Type": "application/json", "Authorization": "Bearer ${activeProject.secret}"},
    json={
      "event": "my-new-event", 
      "user": "${user.email}", 
    },
)`,
													curl: `curl --location --request POST '${API_URI}/v1/track' \\
--header 'Authorization: Bearer ${activeProject.secret}' \\
--header 'Content-Type: application/json' \\
--data-raw '{"email": "hello@useplunk.com", "event": "new-project"}'`,

													PHP: `<?php
$client = new Client();
$request = new Request('POST', '${API_URI}/v1/track', ['Authorization' => 'Bearer ${activeProject.secret}', 'Content-Type' => 'application/json'], '{
  "event": "my-new-event",
  "email": "${user.email}"
}');
$res = $client->sendAsync($request)->wait();`,

													ruby: `require "uri"
require "json"
require "net/http"

url = URI("${API_URI}/v1/track")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = "Bearer ${activeProject.secret}"
request["Content-Type"] = "application/json"
request.body = JSON.dump({
  "event": "my-new-event",
  "email": "${user.email}"
})

response = https.request(request)`,
												}[language]
											}
										/>
									</div>
								</div>

								<div
									className={"flex flex-col items-center justify-center p-4"}
								>
									<h3 className={"text-center font-semibold text-neutral-800"}>
										From Plunk
									</h3>
									<div
										className={
											"flex flex-1 flex-col items-center justify-center"
										}
									>
										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.9 }}
											onClick={() => setEventModal(true)}
											className={
												"mt-6 rounded-md bg-neutral-800 px-10 py-4 text-sm font-medium text-white"
											}
										>
											Trigger a demo event
										</motion.button>
									</div>
								</div>
							</div>
						</motion.div>
					</>
				);
			case 2:
				return (
					<>
						<motion.div
							key={"template"}
							initial={{ opacity: 0, x: 100 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -100 }}
						>
							<div className={"mx-auto my-6 max-w-4xl text-center"}>
								<h2 className={"my-2 text-2xl font-bold"}>Design an email</h2>
								<p className={"font-medium text-neutral-500"}>
									Our templates are easy to write and automatically transformed
									into HTML that email clients understand.
								</p>
							</div>

							<form
								onSubmit={templateHandleSubmit(createTemplate)}
								className={"grid gap-6 sm:grid-cols-6"}
							>
								<div className={"sm:col-span-4"}>
									<label
										htmlFor={"subject"}
										className="block text-sm font-medium text-neutral-700"
									>
										Subject
									</label>
									<div className="mt-1">
										<input
											autoComplete={"off"}
											type={"text"}
											className={
												"block w-full rounded-md border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
											}
											placeholder={"The subject of the email"}
											{...templateRegister("subject")}
										/>
									</div>
									<AnimatePresence>
										{templateErrors.subject?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{templateErrors.subject.message}
											</motion.p>
										)}
									</AnimatePresence>
								</div>

								<div className={"sm:col-span-2"}>
									<label
										htmlFor={"type"}
										className="block flex items-center text-sm font-medium text-neutral-700"
									>
										Type
										<Tooltip
											content={
												<>
													<p className={"mb-2 text-base font-semibold"}>
														What type of email is this?
													</p>
													<ul className={"list-inside"}>
														<li className={"mb-6"}>
															<span className={"font-semibold"}>Marketing</span>
															<br />
															Promotional emails with a Plunk-hosted unsubscribe
															link
															<br />
															<span className={"text-neutral-400"}>
																(e.g. welcome emails, promotions)
															</span>
														</li>
														<li>
															<span className={"font-semibold"}>
																Transactional
															</span>
															<br />
															Mission critical emails <br />
															<span className={"text-neutral-400"}>
																{" "}
																(e.g. email verification, password reset)
															</span>
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
										onChange={(t) =>
											templateSetValue(
												"type",
												t as "MARKETING" | "TRANSACTIONAL",
											)
										}
										values={[
											{ name: "Marketing", value: "MARKETING" },
											{ name: "Transactional", value: "TRANSACTIONAL" },
										]}
										selectedValue={templateWatch("type")}
									/>
									<AnimatePresence>
										{templateErrors.type?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{templateErrors.type.message}
											</motion.p>
										)}
									</AnimatePresence>
								</div>

								<div className={"sm:col-span-6"}>
									<Editor
										value={templateWatch("body")}
										mode={"PLUNK"}
										onChange={(val) => templateSetValue("body", val)}
									/>
									<AnimatePresence>
										{templateErrors.body?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{templateErrors.body.message}
											</motion.p>
										)}
									</AnimatePresence>
								</div>

								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.9 }}
									className={
										"my-6 ml-auto flex items-center gap-x-0.5 rounded-md bg-neutral-800 px-10 py-2.5 text-center text-sm font-medium text-white sm:col-span-6"
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
							</form>
						</motion.div>
					</>
				);
			case 3:
				return actions.length > 0 ? (
					<>
						<motion.div
							key={"action-success"}
							initial={{ opacity: 0, x: 100 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -100 }}
							className={
								"flex h-96 flex-col items-center justify-center text-center"
							}
						>
							<motion.span
								animate={{
									x: [0, -20, 20, 0],
								}}
								transition={{ repeat: 1, duration: 1 }}
								className={"text-6xl"}
							>
								🏎
							</motion.span>
							<h2 className={"my-4 text-2xl font-bold"}>
								Your action has been created
							</h2>
							<p className={"w-1/2 font-medium text-neutral-500"}>
								Users will now automatically start to receive emails when they
								complete your event{" "}
								<span
									className={
										"rounded-md bg-neutral-50 px-2 py-0.5 font-mono text-neutral-500"
									}
								>
									{
										events.sort(
											(a, b) =>
												new Date(a.createdAt).getTime() -
												new Date(b.createdAt).getTime(),
										)[0].name
									}
								</span>
								. There is loads more to discover in Plunk but let's try out
								your action first!
							</p>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.9 }}
								className={
									"mt-9 rounded-md bg-neutral-800 px-24 py-3 text-sm font-medium text-white"
								}
								onClick={async () => {
									toast.promise(
										network.mock<boolean, typeof EventSchemas.post>(
											activeProject.secret,
											"POST",
											"/v1/track",
											{
												event: eventGetValues("event"),
												email: user.email,
											},
										),
										{
											loading: "Sending your event",
											success: `${eventGetValues("event")} delivered`,
											error: "Could not deliver your event!",
										},
									);

									await router.push("/");
								}}
							>
								Try it out!
							</motion.button>
						</motion.div>
					</>
				) : (
					<>
						<motion.div
							initial={{ opacity: 0, x: 100 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -100 }}
							key={"action"}
						>
							<div className={"mx-auto my-6 max-w-2xl text-center"}>
								<h2 className={"my-2 text-2xl font-bold"}>
									Creating your first action
								</h2>
								<p className={"font-medium text-neutral-500"}>
									Actions tie together events and templates, they automate your
									email workflows.
								</p>
							</div>
							<form
								onSubmit={actionHandleSubmit(createAction)}
								className="grid gap-4 space-y-6 pb-6 sm:grid-cols-2"
							>
								<div className={"sm:col-span-2"}>
									<label
										htmlFor={"name"}
										className="block text-sm font-medium text-neutral-700"
									>
										Name
									</label>
									<div className="mt-1">
										<input
											type={"text"}
											autoComplete={"off"}
											className={
												"block w-full rounded-md border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
											}
											placeholder={"Welcome flow"}
											{...actionRegister("name")}
										/>
									</div>
									<AnimatePresence>
										{actionErrors.name?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{actionErrors.name.message}
											</motion.p>
										)}
									</AnimatePresence>
								</div>

								<div>
									<label
										htmlFor={"events"}
										className="block text-sm font-medium text-neutral-700"
									>
										Events that need to be triggered
									</label>
									<MultiselectDropdown
										onChange={(e) => actionSetValue("events", e)}
										values={events.map((e) => {
											return { name: e.name, value: e.id };
										})}
										selectedValues={actionWatch("events")}
									/>
									<AnimatePresence>
										{(actionErrors.events as FieldError | undefined)
											?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{
													(actionErrors.events as FieldError | undefined)
														?.message
												}
											</motion.p>
										)}
									</AnimatePresence>
								</div>

								<div>
									<label
										htmlFor={"template"}
										className="block text-sm font-medium text-neutral-700"
									>
										Template that will be sent
									</label>
									<Dropdown
										onChange={(t) => actionSetValue("template", t)}
										values={templates.map((t) => {
											return { name: t.subject, value: t.id };
										})}
										selectedValue={actionWatch("template")}
									/>
									<AnimatePresence>
										{actionErrors.template?.message && (
											<motion.p
												initial={{ height: 0 }}
												animate={{ height: "auto" }}
												exit={{ height: 0 }}
												className="mt-1 text-xs text-red-500"
											>
												{actionErrors.template.message}
											</motion.p>
										)}
									</AnimatePresence>
								</div>

								{
									<div className={"w-full text-center sm:col-span-2"}>
										<button
											onClick={(e) => {
												e.preventDefault();
												setAdvancedSettings(!advancedSettings);
											}}
											className={
												"text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
											}
										>
											{advancedSettings
												? "Hide advanced settings"
												: "Show advanced settings"}
										</button>
									</div>
								}

								<AnimatePresence>
									{advancedSettings && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
											key={"advanced"}
											className={"sm:col-span-2"}
										>
											<div>
												<label
													htmlFor={"template"}
													className="block text-sm font-medium text-neutral-700"
												>
													Delay before sending
												</label>
												<div className={"grid grid-cols-2 gap-4"}>
													<div className={"mt-1"}>
														<input
															type={"number"}
															autoComplete={"off"}
															min={0}
															className={
																"block w-full rounded-md border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
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
													<div>
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

											<div className={"mt-8 sm:col-span-2"}>
												<Toggle
													title={"Run once"}
													description={
														actionWatch("runOnce")
															? "This action will only run once for each contact."
															: "This action will run each time the required events are triggered."
													}
													toggled={actionWatch("runOnce")}
													onToggle={() =>
														actionSetValue("runOnce", !actionWatch("runOnce"))
													}
												/>
											</div>
										</motion.div>
									)}
								</AnimatePresence>

								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.9 }}
									className={
										"ml-auto flex items-center gap-x-0.5 rounded-md bg-neutral-800 px-10 py-2.5 text-center text-sm font-medium text-white sm:col-span-2"
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
							</form>
						</motion.div>
					</>
				);
		}
	};

	return (
		<>
			<Modal
				isOpen={eventModal}
				onToggle={() => setEventModal(!eventModal)}
				onAction={eventHandleSubmit(triggerEvent)}
				type={"info"}
				action={"Trigger"}
				title={"Trigger an event"}
				description={"Trigger an event to use in your actions"}
			>
				<div>
					<label
						htmlFor={"event"}
						className="block text-sm font-medium text-neutral-700"
					>
						Event
					</label>
					<div className="mt-1">
						<input
							type={"text"}
							autoComplete={"off"}
							className={
								"block w-full rounded-md border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
							}
							placeholder={"My-new-event"}
							{...eventRegister("event")}
						/>
					</div>
					<AnimatePresence>
						{eventErrors.event?.message && (
							<motion.p
								initial={{ height: 0 }}
								animate={{ height: "auto" }}
								exit={{ height: 0 }}
								className="mt-1 text-xs text-red-500"
							>
								{eventErrors.event.message}
							</motion.p>
						)}
					</AnimatePresence>
				</div>
			</Modal>
			<main>
				<div className={"mx-auto max-w-7xl"}>
					<div className={"pt-8"}>
						<nav aria-label="Progress">
							<ol className="space-y-4 md:flex md:space-x-8 md:space-y-0">
								<li className="md:flex-1">
									<span
										className={`${
											step >= 0 ? "border-neutral-800" : "border-neutral-200"
										} group flex flex-col border-l-4 py-2 pl-4 transition md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4`}
									>
										<span className="text-sm font-medium">Welcome</span>
									</span>
								</li>

								<li className="md:flex-1">
									<span
										className={`${
											step >= 1 ? "border-neutral-800" : "border-neutral-200"
										} group flex flex-col border-l-4 py-2 pl-4 transition md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4`}
									>
										<span className="text-sm font-medium">Track an event</span>
									</span>
								</li>

								<li className="md:flex-1">
									<span
										className={`${
											step >= 2 ? "border-neutral-800" : "border-neutral-200"
										} group flex flex-col border-l-4 py-2 pl-4 transition md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4`}
									>
										<span className="text-sm font-medium">Design an email</span>
									</span>
								</li>

								<li className="md:flex-1">
									<span
										className={`${
											step >= 3 ? "border-neutral-800" : "border-neutral-200"
										} group flex flex-col border-l-4 py-2 pl-4 transition md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4`}
									>
										<span className="text-sm font-medium">
											Create an action
										</span>
									</span>
								</li>
							</ol>
						</nav>
					</div>
					<div className={"mx-auto flex h-full flex-col items-center pt-16"}>
						{renderStep()}
					</div>
				</div>
				{step === 0 && (
					<div className={"fixed bottom-3 w-full bg-white text-center"}>
						<span
							className={
								"cursor-pointer text-sm text-neutral-500 transition ease-in-out hover:text-neutral-700"
							}
							onClick={async () => {
								await router.push("/onboarding");
							}}
						>
							Go back
						</span>
					</div>
				)}
			</main>
		</>
	);
}

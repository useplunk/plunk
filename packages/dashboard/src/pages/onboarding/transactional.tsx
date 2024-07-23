import type { EventSchemas } from "@plunk/shared";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { toast } from "sonner";
import { CodeBlock, Dropdown, FullscreenLoader } from "../../components";
import { API_URI } from "../../lib/constants";
import { useEmailsCount } from "../../lib/hooks/emails";
import { useActiveProject } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
	const router = useRouter();
	const project = useActiveProject();
	const { data: user } = useUser();
	const { data: emails, mutate } = useEmailsCount();
	const [language, setLanguage] = useState<
		"javascript" | "python" | "curl" | "PHP" | "ruby"
	>("curl");

	if (!project || !user || emails === undefined) {
		return <FullscreenLoader />;
	}

	return (
		<>
			<div
				className={
					"flex min-h-screen w-screen flex-col items-center justify-center gap-6"
				}
			>
				<div>
					{emails > 0 ? (
						<>
							<motion.div
								key={"email-success"}
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
								<h2 className={"my-4 text-2xl font-bold"}>Wasn't that easy?</h2>
								<p className={"font-medium text-neutral-500"}>
									Just like that you've sent your first email with Plunk!
								</p>
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.9 }}
									className={
										"mt-9 rounded-md bg-neutral-800 px-24 py-3 text-sm font-medium text-white"
									}
									onClick={async () => {
										await router.push("/");
									}}
								>
									Explore the rest of Plunk
								</motion.button>
							</motion.div>
						</>
					) : (
						<>
							<motion.div
								key={"welcome"}
								initial={{ opacity: 0, x: 100 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -100 }}
								className={"flex flex-col items-center justify-center gap-6"}
							>
								<div className={"text-center"}>
									<motion.span
										animate={{
											rotate: [0, 35, 0],
										}}
										transition={{ repeat: 5, duration: 1 }}
										className={"text-6xl"}
									>
										👋
									</motion.span>
									<h2 className={"my-4 text-4xl font-bold"}>Send it!</h2>
									<div className={"max-w-2xl font-medium text-neutral-500"}>
										<p>
											Are you ready to send a transactional email with Plunk?
										</p>

										<p>
											Sending a transactional email is as easy as making a
											single API call.
										</p>
									</div>
								</div>

								<div className={"w-full max-w-2xl space-y-3"}>
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

									<CodeBlock
										style={{
											fontSize: "0.9rem",
											borderRadius: "0.5rem",
											padding: "1rem",
										}}
										language={language}
										code={
											{
												javascript: `await fetch('${API_URI}/v1/send', {
  method: 'POST',
  body: JSON.stringify({
    to: "${user.email}",
    subject: "Your first email",
    body: "Hello from Plunk!"
  }),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${project.secret}',
  },
});`,
												python: `import requests
                          
requests.post(
    "${API_URI}/v1/send",
    headers={"Content-Type": "application/json", "Authorization": "Bearer ${project.secret}"},
    json={
      "subject": "Your first email",
      "body": "Hello from Plunk!", 
      "to": "${user.email}", 
    },
)`,
												curl: `curl --location --request POST '${API_URI}/v1/send' \\
--header 'Authorization: Bearer ${project.secret}' \\
--header 'Content-Type: application/json' \\
--data-raw '{"subject": "Your first email", "body": "Hello from Plunk!", "to": "${user.email}"}'`,

												PHP: `<?php
$client = new Client();
$request = new Request('POST', '${API_URI}/v1/send', ['Authorization' => 'Bearer ${project.secret}', 'Content-Type' => 'application/json'], '{
  "subject": "Your first email",
  "body": "Hello from Plunk!", 
  "to": "${user.email}", 
}');
$res = $client->sendAsync($request)->wait();`,

												ruby: `require "uri"
require "json"
require "net/http"

url = URI("${API_URI}/v1/send")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = "Bearer ${project.secret}"
request["Content-Type"] = "application/json"
request.body = JSON.dump({
  "subject": "Your first email",
  "body": "Hello from Plunk!", 
  "to": "${user.email}", 
})

response = https.request(request)`,
											}[language]
										}
									/>
								</div>
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.9 }}
									className={
										"rounded-md bg-neutral-800 px-24 py-3 text-sm font-medium text-white"
									}
									onClick={() => {
										toast.promise(
											network.mock<boolean, typeof EventSchemas.send>(
												project.secret,
												"POST",
												"/v1/send",
												{
													subject: "Your first email",
													body: "Hello from Plunk!",
													to: user.email,
												},
											),
											{
												loading: "Sending the email",
												success: () => {
													void mutate();
													return `Sent! Check your inbox at ${user.email}`;
												},
												error: "Could not send the email",
											},
										);
									}}
								>
									Run this code
								</motion.button>
							</motion.div>
						</>
					)}
				</div>

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
			</div>
		</>
	);
}

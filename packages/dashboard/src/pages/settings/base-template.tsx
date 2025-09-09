import type { Project } from "@prisma/client";
import React, { useCallback, useEffect, useState } from "react";
import { DEFAULT_BASE_TEMPLATE, DEFAULT_FOOTER, ProjectSchemas, TemplatingLanguage } from "@plunk/shared";
import { Card, Dropdown, FullscreenLoader, SettingTabs } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject, useProjects } from "../../lib/hooks/projects";
import { network } from "../../lib/network";
import HTMLEditor from "@monaco-editor/react";

import { toast } from "sonner";
import { motion } from "framer-motion";

/**
 *
 */
export default function Index() {
	const [project, setProject] = useState<Project>();
	const { data: projects, mutate: projectsMutate } = useProjects();
	const activeProject = useActiveProject();
	const [baseTemplate, setBaseTemplate] = useState<string | undefined>();
	const [unsubscribeFooter, setUnsubscribeFooter] = useState<string | undefined>();
	const [preview, setPreview] = useState<string | undefined>(undefined);
	const [templatingLanguage, setTemplatingLanguage] = useState<TemplatingLanguage>("DEFAULT");
	useEffect(() => {
		if (activeProject) {
			setBaseTemplate(activeProject.baseTemplate ?? undefined);
			setUnsubscribeFooter(activeProject.unsubscribeFooter ?? undefined);
			setTemplatingLanguage(activeProject.templatingLanguage as TemplatingLanguage ?? "DEFAULT");
		}
	}, [activeProject]);

	useEffect(() => {
		setPreview(undefined);
	}, [baseTemplate, unsubscribeFooter]);

	const validate = useCallback(() => {
		let valid = true;
		if (baseTemplate) {
			['{{html}}', '{{unsubscribe_footer}}'].forEach((placeholder) => {
				if (!baseTemplate.includes(placeholder)) {
					toast.error(`The base template must contain the ${placeholder} placeholder`);
					valid = false;
				}
			});
		}
		if (unsubscribeFooter) {
			['{{unsubscribe_url}}', '{{project_name}}'].forEach((placeholder) => {
				if (!unsubscribeFooter.includes(placeholder)) {
					toast.error(`The unsubscribe footer must contain the ${placeholder} placeholder`);
					valid = false;
				}
			});
		}

		return valid;
	}, [baseTemplate, unsubscribeFooter]);

	const update = useCallback(async () => {
		if (!activeProject) {
			return;
		}

		const valid = validate();

		if (!valid) {
			return;
		}

		toast.promise(
			network.fetch<
				{
					success: true;
				},
				typeof ProjectSchemas.update
			>("PUT", "/projects/update/", {
				id: activeProject.id,
				name: activeProject.name,
				url: activeProject.url,
				templatingLanguage,
				baseTemplate,
				unsubscribeFooter,
			}),
			{
				loading: "Updating your project",
				success: "Updated your project",
				error: "Could not update your project",
			},
		);

		await projectsMutate();
	}, [activeProject, projectsMutate, baseTemplate, unsubscribeFooter, templatingLanguage]);


	const previewTemplate = useCallback(async () => {
		if (!activeProject) {
			return;
		}

		const valid = validate();

		if (!valid) {
			return;
		}

		toast.promise(
			async () => {
				const body = await network.fetch<
					{
						success: true;
						html: string;
					},
					typeof ProjectSchemas.update
				>("POST", "/projects/preview/template", {
					id: activeProject.id,
					name: activeProject.name,
					url: activeProject.url,
					baseTemplate,
					unsubscribeFooter,
					templatingLanguage,
				});
				setPreview(body.html);
			},
			{
				loading: "Loading template preview",
				success: "Template preview loaded",
				error: (data) => `Template preview failed: ${data.message}`,
			},
		)

	}, [activeProject, baseTemplate, unsubscribeFooter, templatingLanguage]);

	if (activeProject && !project) {
		setProject(activeProject);
	}

	if (!project || !projects) {
		return <FullscreenLoader />;
	}

	if (!activeProject) {
		return <FullscreenLoader />;
	}

	return (
		<>
			<Dashboard>
				<SettingTabs />
				<Card
					title={"Base Email Template"}
					description={`Manage the base email template for ${activeProject.name}`}
				>
					<div className={"mb-3 sm:grid sm:gap-3 md:grid-cols-4"}>
						<div className="sm:col-span-1">
							<label className="block text-sm font-medium text-neutral-700">Templating Language</label>
							<Dropdown
								values={[
									{ name: "Default", value: "DEFAULT" },
									{ name: "Handlebars", value: "HANDLEBARS" },
								] as const}
								selectedValue={templatingLanguage}
								onChange={(t) => setTemplatingLanguage(t as TemplatingLanguage)}
							/>
						</div>
						<div className="sm:col-span-4">
							<label className="block text-sm font-medium text-neutral-700">Email Template</label>
							<div className="mt-1 h-full">
								<HTMLEditor
									height={400}
									className={"rounded border border-neutral-300"}
									language="html"
									theme="vs-light"
									value={baseTemplate ?? DEFAULT_BASE_TEMPLATE}
									onChange={(e) => setBaseTemplate(e as string)}
									options={{
										inlineSuggest: true,
										fontSize: "12px",
										formatOnType: true,
										autoClosingBrackets: true,
										minimap: {
											enabled: false,
										},
									}}
								/>
							</div>
						</div>
						<div className="sm:col-span-4">
							<label className="block text-sm font-medium text-neutral-700">Unsubscribe Footer</label>
							<div className="mt-1 h-full">
								<HTMLEditor
									height={200}
									className={"rounded border border-neutral-300"}
									language="html"
									theme="vs-light"
									value={unsubscribeFooter ?? DEFAULT_FOOTER}
									onChange={(e) => setUnsubscribeFooter(e as string)}
									options={{
										inlineSuggest: true,
										fontSize: "12px",
										formatOnType: true,
										autoClosingBrackets: true,
										minimap: {
											enabled: false,
										},
									}}
								/>
							</div>
						</div>
					</div>
					<div className="mt-3 ml-auto flex gap-x-3 justify-end sm:col-span-4">
						<button
							className={
								"block rounded border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-50"
							}
							onClick={() => previewTemplate()}
						>
							Preview
						</button>
						<button
							className={
								"block rounded border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-50"
							}
							onClick={() => {
								setBaseTemplate(undefined);
								setUnsubscribeFooter(undefined);
								setTemplatingLanguage("DEFAULT");
								toast.success("Reset to default");
							}}
						>
							Reset to default
						</button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.9 }}
							onClick={() => update()}
							className={
								"flex items-center rounded bg-neutral-800 px-5 py-2.5 text-center text-sm font-medium text-white"
							}
						>
							Save
						</motion.button>

					</div>
				</Card>
				{preview && (
					<Card title={"Preview"} >
						<div className="mt-3">
							<iframe srcDoc={preview} className="w-full min-h-[400px] rounded border border-neutral-300" />
						</div>
					</Card>)}
			</Dashboard>
		</>
	);
}

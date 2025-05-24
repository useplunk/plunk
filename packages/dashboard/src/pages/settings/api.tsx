import type { Project } from "@prisma/client";
import React, { useState } from "react";
import { Card, FullscreenLoader, Modal, SettingTabs } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject, useProjects } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 *
 */
export default function Index() {
	const [showRegenerateModal, setShowRegenerateModal] = useState(false);
	const [project, setProject] = useState<Project>();

	const activeProject = useActiveProject();
	const { data: projects, mutate: projectMutate } = useProjects();

	if (activeProject && !project) {
		setProject(activeProject);
	}

	if (!project || !projects) {
		return <FullscreenLoader />;
	}

	if (!activeProject) {
		return <FullscreenLoader />;
	}

	const regenerate = () => {
		setShowRegenerateModal(!showRegenerateModal);

		toast.promise(
			network
				.fetch<{
					success: true;
					project: Project;
				}>("POST", `/projects/id/${project.id}/regenerate`)
				.then(async (res) => {
					await projectMutate(
						[
							...projects.filter((project) => {
								return project.id !== res.project.id;
							}),
							res.project,
						],
						false,
					);
				}),
			{
				loading: "Regenerating API keys...",
				success: "Successfully regenerated API keys!",
				error: "Failed to create new API keys",
			},
		);
	};

	return (
		<>
			<Modal
				isOpen={showRegenerateModal}
				onToggle={() => setShowRegenerateModal(!showRegenerateModal)}
				onAction={regenerate}
				type={"danger"}
				title={"Are you sure?"}
				description={"Any applications that use your previously generated keys will stop working!"}
			/>
			<Dashboard>
				<SettingTabs />
				<Card
					title={"API access"}
					description={`Manage your API keys for ${activeProject.name}`}
					actions={
						<>
							<button
								onClick={() => setShowRegenerateModal(!showRegenerateModal)}
								className={
									"flex items-center gap-x-1 rounded bg-red-600 px-8 py-2 text-center text-sm font-medium text-white transition ease-in-out hover:bg-red-700"
								}
							>
								<RefreshCw strokeWidth={1.5} size={18} />
								Regenerate
							</button>
						</>
					}
				>
					<div
						onClick={() => {
							void navigator.clipboard.writeText(activeProject.public);
							toast.success("Copied your public API key");
						}}
					>
						<label className="block text-sm font-medium text-neutral-700">Public API Key</label>
						<p className={"cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm truncate"}>
							{activeProject.public}
						</p>

						<p className={"text-sm text-neutral-500"}>
							Use this key for any front-end services. This key can only be used to publish events.
						</p>
					</div>

					<div className={"mt-4"}>
						<div
							onClick={() => {
								void navigator.clipboard.writeText(activeProject.secret);
								toast.success("Copied your secret API key");
							}}
						>
							<label className="block text-sm font-medium text-neutral-700">Secret API Key</label>
							<p className={"cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm truncate"}>
								{activeProject.secret}
							</p>

							<p className={"text-sm text-neutral-500"}>
								Use this key for any secure back-end services. This key gives complete access to your Plunk setup.
							</p>
						</div>
					</div>
				</Card>
			</Dashboard>
		</>
	);
}

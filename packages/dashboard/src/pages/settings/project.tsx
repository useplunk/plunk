import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectSchemas, type UtilitySchemas } from "@plunk/shared";
import { network } from "dashboard/src/lib/network";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	Card,
	FullscreenLoader,
	Input,
	Modal,
	SettingTabs,
} from "../../components";
import { Dashboard } from "../../layouts";
import {
	useActiveProject,
	useActiveProjectMemberships,
	useProjects,
} from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";

interface ProjectValues {
	name: string;
	url: string;
}

/**
 *
 */
export default function Index() {
	const router = useRouter();
	const activeProject = useActiveProject();
	const { data: user } = useUser();
	const { data: memberships } = useActiveProjectMemberships();
	const { mutate: projectsMutate } = useProjects();

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ProjectValues>({
		resolver: zodResolver(ProjectSchemas.update.omit({ id: true })),
	});

	const [showDeleteModal, setShowDeleteModal] = useState(false);

	useEffect(() => {
		if (!activeProject) {
			return;
		}

		reset(activeProject);
	}, [reset, activeProject]);

	if (!activeProject || !memberships || !user) {
		return <FullscreenLoader />;
	}

	const update = async (data: ProjectValues) => {
		toast.promise(
			network.fetch<
				{
					success: true;
				},
				typeof ProjectSchemas.update
			>("PUT", "/projects/update/", {
				id: activeProject.id,
				...data,
			}),
			{
				loading: "Updating your project",
				success: "Updated your project",
				error: "Could not update your project",
			},
		);

		await projectsMutate();
	};

	const deleteProject = async () => {
		setShowDeleteModal(!showDeleteModal);

		await fetch("/api/plunk", {
			method: "POST",
			body: JSON.stringify({
				event: "project-deleted",
				email: user.email,
				data: {
					project: activeProject.name,
				},
			}),
			headers: { "Content-Type": "application/json" },
		});

		toast.promise(
			network
				.fetch<
					{
						success: true;
					},
					typeof UtilitySchemas.id
				>("DELETE", "/projects/delete", {
					id: activeProject.id,
				})
				.then(async () => {
					localStorage.removeItem("project");
					await router.push("/");
					window.location.reload();
				}),
			{
				loading: "Deleting your project",
				success: "Deleted your project",
				error: "Could not delete your project",
			},
		);
	};

	return (
		<>
			<Modal
				isOpen={showDeleteModal}
				onToggle={() => setShowDeleteModal(!showDeleteModal)}
				onAction={deleteProject}
				type={"danger"}
				title={"Are you sure?"}
				description={
					"All data associated with this project will also be permanently deleted. This action cannot be reversed!"
				}
			/>
			<Dashboard>
				<SettingTabs />
				<Card
					title={"Project details"}
					description={"Manage your project details"}
				>
					<form onSubmit={handleSubmit(update)} className="space-y-6">
						<div className={"grid gap-5 sm:grid-cols-2"}>
							<Input
								register={register("name")}
								label={"Name"}
								placeholder={"ACME Inc."}
								error={errors.name}
							/>
							<Input
								register={register("url")}
								label={"URL"}
								placeholder={"https://useplunk.com"}
								error={errors.url}
							/>
						</div>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.9 }}
							className={
								"ml-auto flex items-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
							}
						>
							Save
						</motion.button>
					</form>
				</Card>
				{memberships.find((membership) => membership.userId === user.id)
					?.role === "OWNER" ? (
					<Card
						title={"Danger zone"}
						description={"Better watch out here"}
						className={"mt-4"}
					>
						<div className={"flex"}>
							<div className={"w-2/3"}>
								<p className={"text-sm font-bold text-neutral-500"}>
									Delete your project
								</p>
								<p className={"text-sm text-neutral-400"}>
									Deleting your project may have unwanted consequences. All data
									associated with this project will get deleted and can not be
									recovered!{" "}
								</p>
							</div>
							<button
								className={
									"ml-auto h-1/2 self-center rounded bg-red-500 px-6 py-2 text-sm font-medium text-white transition ease-in-out hover:bg-red-600"
								}
								onClick={() => setShowDeleteModal(true)}
							>
								Delete project
							</button>
						</div>
					</Card>
				) : null}
			</Dashboard>
		</>
	);
}

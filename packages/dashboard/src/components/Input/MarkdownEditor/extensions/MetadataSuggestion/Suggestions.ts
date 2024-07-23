// @ts-nocheck

import { ReactRenderer } from "@tiptap/react";
import { network } from "dashboard/src/lib/network";
import type { RefAttributes } from "react";
import tippy from "tippy.js";
import MentionList from "./SuggestionList";

export default {
	items: async ({ query }: { query: string }) => {
		const activeProject =
			typeof window !== "undefined"
				? window.localStorage.getItem("project")
				: null;

		if (!activeProject) {
			return [];
		}

		const keys = await network.fetch<string[]>(
			"GET",
			`/projects/id/${activeProject}/contacts/metadata`,
		);

		return keys.filter((key) =>
			key.toLowerCase().includes(query.toLowerCase()),
		);
	},

	render: () => {
		let component: ReactRenderer<unknown, RefAttributes<unknown>>;
		let popup: { destroy: () => void }[];

		return {
			onStart: (props: { editor: any; clientRect: any }) => {
				component = new ReactRenderer(MentionList, {
					props,
					editor: props.editor,
				});

				if (!props.clientRect) {
					return;
				}

				popup = tippy("body", {
					getReferenceClientRect: props.clientRect,
					appendTo: () => document.body,
					content: component.element,
					showOnCreate: true,
					interactive: true,
					trigger: "manual",
					placement: "bottom-start",
				});
			},

			onUpdate(props) {
				component.updateProps(props);

				if (!props.clientRect) {
					return;
				}

				popup[0].setProps({
					getReferenceClientRect: props.clientRect,
				});
			},

			onKeyDown(props) {
				if (props.event.key === "Escape") {
					popup[0].hide();

					return true;
				}

				return component.ref?.onKeyDown(props);
			},

			onExit() {
				if (popup[0]) {
					popup[0].destroy();
				}

				component.destroy();
			},
		};
	},
};

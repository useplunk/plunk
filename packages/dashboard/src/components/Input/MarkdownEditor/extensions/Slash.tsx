import { type Editor, Extension, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	List,
	ListOrdered,
	Quote,
	Strikethrough,
} from "lucide-react";
import React, {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import tippy from "tippy.js";

interface CommandItemProps {
	title: string;
	description: string;
	icon: ReactNode;
}

interface Command {
	editor: Editor;
	range: Range;
}

const Command = Extension.create({
	name: "slash-command",
	addOptions() {
		return {
			suggestion: {
				char: "/",
				command: ({
					editor,
					range,
					props,
				}: { editor: Editor; range: Range; props: any }) => {
					props.command({ editor, range });
				},
			},
		};
	},
	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				...this.options.suggestion,
			}),
		];
	},
});

const getSuggestionItems = ({ query }: { query: string }) => {
	return [
		{
			title: "Heading 1",
			description: "Big section heading.",
			icon: <Heading1 size={18} />,
			command: ({ editor, range }: Command) => {
				editor
					.chain()
					.focus()
					.deleteRange(range)
					.setNode("heading", { level: 1 })
					.run();
			},
		},
		{
			title: "Heading 2",
			description: "Medium section heading.",
			icon: <Heading2 size={18} />,
			command: ({ editor, range }: Command) => {
				editor
					.chain()
					.focus()
					.deleteRange(range)
					.setNode("heading", { level: 2 })
					.run();
			},
		},
		{
			title: "Heading 3",
			description: "Small section heading.",
			icon: <Heading3 size={18} />,
			command: ({ editor, range }: Command) => {
				editor
					.chain()
					.focus()
					.deleteRange(range)
					.setNode("heading", { level: 3 })
					.run();
			},
		},
		{
			title: "Bold",
			description: "Make text bold.",
			icon: <Bold size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).setMark("bold").run();
			},
		},
		{
			title: "Italic",
			description: "Make text italic.",
			icon: <Italic size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).setMark("italic").run();
			},
		},
		{
			title: "Strikethrough",
			description: "Make text strikethrough.",
			icon: <Strikethrough size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).setMark("strike").run();
			},
		},
		{
			title: "Bullet List",
			description: "Create a bullet list.",
			icon: <List size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).toggleBulletList().run();
			},
		},
		{
			title: "Numbered List",
			description: "Create a numbered list.",
			icon: <ListOrdered size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).toggleOrderedList().run();
			},
		},
		{
			title: "Code Block",
			description: "Create a code block.",
			icon: <Code size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
			},
		},
		{
			title: "Quote",
			description: "Create a quote.",
			icon: <Quote size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).toggleBlockquote().run();
			},
		},
		{
			title: "Align Left",
			description: "Align text to the left.",
			icon: <AlignLeft size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).setTextAlign("left").run();
			},
		},
		{
			title: "Align Center",
			description: "Align text to the center.",
			icon: <AlignCenter size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).setTextAlign("center").run();
			},
		},
		{
			title: "Align Right",
			description: "Align text to the right.",
			icon: <AlignRight size={18} />,
			command: ({ editor, range }: Command) => {
				editor.chain().focus().deleteRange(range).setTextAlign("right").run();
			},
		},
	].filter((item) => {
		if (query.length > 0) {
			return item.title.toLowerCase().includes(query.toLowerCase());
		}
		return true;
	});
	// .slice(0, 10);
};

export const updateScrollView = (container: HTMLElement, item: HTMLElement) => {
	const containerHeight = container.offsetHeight;
	const itemHeight = item.offsetHeight;

	const top = item.offsetTop;
	const bottom = top + itemHeight;

	if (top < container.scrollTop) {
		container.scrollTop -= container.scrollTop - top + 5;
	} else if (bottom > containerHeight + container.scrollTop) {
		container.scrollTop += bottom - containerHeight - container.scrollTop + 5;
	}
};

const CommandList = ({
	items,
	command,
	editor,
}: { items: CommandItemProps[]; command: any; editor: any; range: any }) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const selectItem = useCallback(
		(index: number) => {
			const item = items[index];

			command(item);
		},
		[command, editor, items],
	);

	useEffect(() => {
		const navigationKeys = ["ArrowUp", "ArrowDown", "Enter"];
		const onKeyDown = (e: KeyboardEvent) => {
			if (navigationKeys.includes(e.key)) {
				e.preventDefault();
				if (e.key === "ArrowUp") {
					setSelectedIndex((selectedIndex + items.length - 1) % items.length);
					return true;
				}
				if (e.key === "ArrowDown") {
					setSelectedIndex((selectedIndex + 1) % items.length);
					return true;
				}

				if (e.key === "Enter") {
					selectItem(selectedIndex);
					return true;
				}
				return false;
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [items, selectedIndex, setSelectedIndex, selectItem]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [items]);

	const commandListContainer = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const container = commandListContainer.current;

		const item = container?.children[selectedIndex] as HTMLElement;

		if (container) {
			updateScrollView(container, item);
		}
	}, [selectedIndex]);

	return items.length > 0 ? (
		<div
			ref={commandListContainer}
			className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto scroll-smooth rounded-md border border-neutral-200 bg-white px-1 py-2 shadow-md transition-all"
		>
			{items.map((item: CommandItemProps, index: number) => {
				return (
					<button
						className={`flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-neutral-800 hover:bg-neutral-100 ${
							index === selectedIndex ? "bg-neutral-100 text-neutral-800" : ""
						}`}
						key={index}
						onClick={() => selectItem(index)}
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white">
							{item.icon}
						</div>
						<div>
							<p className="font-medium">{item.title}</p>
							<p className="text-xs text-neutral-500">{item.description}</p>
						</div>
					</button>
				);
			})}
		</div>
	) : null;
};

const renderItems = () => {
	let component: ReactRenderer | null = null;
	let popup: any;

	return {
		onStart: (props: { editor: Editor; clientRect: DOMRect }) => {
			component = new ReactRenderer(CommandList, {
				props,
				editor: props.editor,
			});

			// @ts-ignore
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
		onUpdate: (props: { editor: Editor; clientRect: DOMRect }) => {
			component?.updateProps(props);

			popup?.[0].setProps({
				getReferenceClientRect: props.clientRect,
			});
		},
		onKeyDown: (props: { event: KeyboardEvent }) => {
			if (props.event.key === "Escape") {
				popup?.[0].hide();

				return true;
			}

			// @ts-ignore
			return component?.ref?.onKeyDown(props);
		},
		onExit: () => {
			popup?.[0].destroy();
			component?.destroy();
		},
	};
};

const Slash = Command.configure({
	suggestion: {
		items: getSuggestionItems,
		render: renderItems,
	},
});

export default Slash;

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "../../Overlay";
import "tippy.js/animations/scale.css";
import HTMLEditor from "@monaco-editor/react";
import { Color } from "@tiptap/extension-color";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import FontFamily from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { AlignCenter, AlignLeft, AlignRight, ImageIcon, Inspect, LinkIcon } from "lucide-react";
import { Dropdown } from "../Dropdown";
import { Button } from "./extensions/Button";
import { EditorBubbleMenu } from "./extensions/EditorBubbleMenu";
import { Mention } from "./extensions/MetadataSuggestion/MetadataSuggestion";
import suggestion from "./extensions/MetadataSuggestion/Suggestions";
import { Progress, type colors } from "./extensions/Progress";
import Slash from "./extensions/Slash";

export interface MarkdownEditorProps {
	value: string;
	mode: "PLUNK" | "HTML";
	onChange: (value: string, type: "PLUNK" | "HTML") => void;
	modeSwitcher?: boolean;
}

/**
 *
 * @param root0
 * @param root0.value
 * @param root0.onChange
 */
export default function Editor({ value, onChange, mode, modeSwitcher }: MarkdownEditorProps) {
	const [imageModal, setImageModal] = useState(false);
	const [urlModal, setUrlModal] = useState(false);
	const [barModal, setBarModal] = useState(false);
	const [buttonModal, setButtonModal] = useState(false);
	const [confirmModal, setConfirmModal] = useState(false);

	const editor = useEditor({
		extensions: [
			Slash,
			StarterKit,
			Typography,
			TextStyle,
			Mention.configure({
				HTMLAttributes: {
					class: "mention",
				},
				// @ts-ignore
				suggestion,
			}),
			Dropcursor.configure({
				width: 3,
				color: "#e5e5e5",
			}),
			TextAlign.configure({
				alignments: ["left", "center", "right"],
				types: ["heading", "paragraph"],
				defaultAlignment: "left",
			}),
			FontFamily.configure({
				types: ["textStyle"],
			}),
			Image.configure({ allowBase64: true }),
			Placeholder.configure({
				placeholder: "Start typing or press / to use a slash command",
				includeChildren: true,
			}),
			Progress,
			Button,
			Link.configure({
				autolink: true,
				protocols: ["http", "https", "mailto"],
			}).extend({
				addKeyboardShortcuts() {
					return {
						Space: ({ editor }) => {
							if (editor.isActive("link")) {
								// Toggle the link and add a space
								editor.commands.toggleMark("link");
								// Add a space
								return editor.chain().focus().insertContent(" ").run();
							}

							return false;
						},
					};
				},
			}),
			Color,
		],
		content: value,
		editorProps: {
			attributes: {
				class: "prose font-sans my-5 focus:outline-none",
			},
			handleDOMEvents: {
				keydown: (_view, event) => {
					return event.key === "Enter" && !event.shiftKey;
				},
				paste: (view, event) => {
					const text = event.clipboardData?.getData("text");
					const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*({{[\w-]+}})?)*$/;

					if (editor && text && urlPattern.test(text)) {
						event.preventDefault();
						editor
							.chain()
							.focus()
							.extendMarkRange("link")
							.setLink({ href: text.startsWith("http") ? text : `https://${text}`, target: "_blank" })
							.run();
						editor.commands.insertContent(text);
					}
					return true;
				},
			},
		},
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML(), "PLUNK");
		},
		immediatelyRender: false
	});

	const {
		register: registerUrl,
		handleSubmit: handleSubmitUrl,
		reset: resetUrl,
		setFocus: setFocusUrl,
		formState: { errors: errorsUrl },
	} = useForm<{
		url: string;
	}>({
		resolver: zodResolver(
			z.object({
				url: z
					.string()
					.regex(/^(?:https?:\/\/)?(?:\{\{[\w-]+}}|(?:[\w-]+\.)+[a-z]{2,})(?:\/\S*)?(?:\?\S*)?$/)
					.transform((u) => {
						if (u.startsWith("{{") && u.endsWith("}}")) {
							return u;
						}

						return u.startsWith("http") ? u : `https://${u}`;
					}),
			}),
		),
	});

	const {
		register: registerBar,
		handleSubmit: handleSubmitBar,
		reset: resetBar,
		setValue: setValueBar,
		watch: watchBar,
		formState: { errors: errorsBar },
	} = useForm<{
		percent: number;
		color: colors;
	}>({
		resolver: zodResolver(
			z.object({
				percent: z.preprocess((a) => Number.parseInt(z.string().parse(a), 10), z.number().positive().max(100)),
				color: z.enum(["red", "yellow", "green", "blue", "indigo", "purple", "pink", "orange", "black"]).default("blue"),
			}),
		),
		defaultValues: {
			color: "blue",
		},
	});

	const {
		register: registerButton,
		handleSubmit: handleSubmitButton,
		reset: resetButton,
		setValue: setValueButton,
		watch: watchButton,
		formState: { errors: errorsButton },
	} = useForm<{
		link: string;
		color: colors;
	}>({
		resolver: zodResolver(
			z.object({
				link: z
					.string()
					.regex(/^(?:https?:\/\/)?(?:\{\{[\w-]+}}|(?:[\w-]+\.)+[a-z]{2,})(?:\/\S*)?$/)
					.transform((u) => {
						if (u.startsWith("{{") && u.endsWith("}}")) {
							return u;
						}

						return u.startsWith("http") ? u : `https://${u}`;
					}),
				color: z.enum(["red", "yellow", "green", "blue", "indigo", "purple", "pink", "orange", "black"]).default("blue"),
			}),
		),
		defaultValues: {
			color: "blue",
		},
	});

	const addImage = useCallback(
		(data: { url: string }) => {
			editor?.chain().focus().setImage({ src: data.url }).run();
			setImageModal(false);
		},
		[editor],
	);

	const addBar = useCallback(
		(data: { percent: number; color: colors }) => {
			editor?.chain().focus().setProgress({ percent: data.percent, color: data.color }).run();
			setBarModal(false);
			resetBar();
		},
		[editor, resetBar],
	);

	const addButton = useCallback(
		(data: { link: string; color: colors }) => {
			editor?.chain().focus().setButton({ href: data.link, color: data.color }).run();
			setButtonModal(false);
			resetButton();
		},
		[editor, resetButton],
	);

	const addUrl = useCallback(
		(data: { url: string }) => {
			editor?.chain().focus().setLink({ href: data.url, target: "_blank" }).run();
			setUrlModal(false);
			resetUrl();
		},
		[editor, resetUrl],
	);

	if (!editor) {
		return null;
	}

	return (
		<>
			<Modal
				title={"Watch out!"}
				isOpen={confirmModal}
				onToggle={() => setConfirmModal(!confirmModal)}
				onAction={() => {
					if (mode === "PLUNK") {
						void onChange("", "HTML");
					} else {
						void onChange("", "PLUNK");
					}

					editor.chain().clearContent().run();
					setConfirmModal(false);
				}}
				type={"danger"}
			>
				<div className={"flex flex-col gap-3"}>
					<p className={"text-sm text-neutral-700"}>
						Are you sure you want to switch to {mode === "PLUNK" ? "HTML" : "the Plunk Editor"}? <br /> This will clear your
						current content.
					</p>
				</div>
			</Modal>
			{modeSwitcher && (
				<div className={"my-3 flex w-full gap-3 rounded-lg bg-neutral-100 p-2"}>
					<button
						onClick={(e) => {
							e.preventDefault();
							setConfirmModal(true);
						}}
						className={`w-full flex-1 rounded p-2 text-sm font-medium ${mode === "PLUNK" ? "bg-white" : "hover:bg-neutral-50"
							} transition ease-in-out`}
					>
						Plunk Editor
					</button>
					<button
						onClick={(e) => {
							e.preventDefault();
							setConfirmModal(true);
						}}
						className={`w-full flex-1 rounded p-2 text-sm font-medium ${mode === "HTML" ? "bg-white" : "hover:bg-neutral-50"
							} transition ease-in-out`}
					>
						HTML
					</button>{" "}
				</div>
			)}

			<Modal
				title={"Add image"}
				description={"Enter the URL of the image you want to add."}
				isOpen={imageModal}
				onToggle={() => setImageModal(!imageModal)}
				onAction={handleSubmitUrl(addImage)}
				type={"info"}
				action={"Add"}
				icon={
					<>
						<path d="M4.75 16L7.49619 12.5067C8.2749 11.5161 9.76453 11.4837 10.5856 12.4395L13 15.25M10.915 12.823C11.9522 11.5037 13.3973 9.63455 13.4914 9.51294C13.4947 9.50859 13.4979 9.50448 13.5013 9.50017C14.2815 8.51598 15.7663 8.48581 16.5856 9.43947L19 12.25M6.75 19.25H17.25C18.3546 19.25 19.25 18.3546 19.25 17.25V6.75C19.25 5.64543 18.3546 4.75 17.25 4.75H6.75C5.64543 4.75 4.75 5.64543 4.75 6.75V17.25C4.75 18.3546 5.64543 19.25 6.75 19.25Z" />
					</>
				}
			>
				<form onSubmit={handleSubmitUrl(addImage)} className="grid gap-6 sm:grid-cols-2">
					<div className={"sm:col-span-2"}>
						<label htmlFor={"url"} className="block text-sm font-medium text-neutral-700">
							Image URL
						</label>
						<div className="mt-1 flex rounded-md shadow-sm">
							<input
								type="text"
								autoComplete={"off"}
								className={
									"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
								}
								placeholder="https://www.example.com/image.png"
								{...registerUrl("url")}
							/>
						</div>
						<AnimatePresence>
							{errorsUrl.url?.message && (
								<motion.p
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									className="mt-1 text-xs text-red-500"
								>
									{errorsUrl.url.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				</form>
			</Modal>
			<Modal
				title={"Add URL"}
				description={"Copy and paste the URL"}
				isOpen={urlModal}
				onToggle={() => setUrlModal(!urlModal)}
				onAction={handleSubmitUrl(addUrl)}
				type={"info"}
				action={"Add"}
				icon={
					<>
						<path d="M16.75 13.25L18 12C19.6569 10.3431 19.6569 7.65685 18 6V6C16.3431 4.34315 13.6569 4.34315 12 6L10.75 7.25" />
						<path d="M7.25 10.75L6 12C4.34315 13.6569 4.34315 16.3431 6 18V18C7.65685 19.6569 10.3431 19.6569 12 18L13.25 16.75" />
						<path d="M14.25 9.75L9.75 14.25" />
					</>
				}
			>
				<form
					onSubmit={handleSubmitUrl(addUrl)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void handleSubmitUrl(addUrl)();
						}
					}}
					className="grid gap-6 sm:grid-cols-2"
				>
					<div className={"sm:col-span-2"}>
						<label htmlFor={"url"} className="block text-sm font-medium text-neutral-700">
							URL
						</label>
						<div className="mt-1 flex rounded-md shadow-sm">
							<span className="inline-flex items-center rounded-l border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
								https://
							</span>
							<input
								type="text"
								autoComplete={"off"}
								className={
									"block w-full rounded-r border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
								}
								placeholder="www.example.com"
								{...registerUrl("url")}
							/>
						</div>
						<AnimatePresence>
							{errorsUrl.url?.message && (
								<motion.p
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									className="mt-1 text-xs text-red-500"
								>
									{errorsUrl.url.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				</form>
			</Modal>
			<Modal
				title={"Add a progress bar"}
				description={"Show the percentage of progress with ease"}
				isOpen={barModal}
				onToggle={() => setBarModal(!barModal)}
				onAction={handleSubmitBar(addBar)}
				type={"info"}
				action={"Add"}
				icon={
					<>
						<path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
						<path d="M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
						<path d="M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
						<path d="M4 20l14 0" />
					</>
				}
			>
				<form
					onSubmit={handleSubmitBar(addBar)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void handleSubmitUrl(addUrl)();
						}
					}}
					className="grid gap-6 sm:grid-cols-2"
				>
					<div className={"sm:col-span-2"}>
						<label htmlFor={"percentage"} className="block text-sm font-medium text-neutral-700">
							Percentage
						</label>
						<div className="mt-1">
							<input
								autoComplete={"off"}
								type={"number"}
								min={0}
								max={100}
								className={
									"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
								}
								placeholder={"20"}
								{...registerBar("percent")}
							/>
						</div>
						<AnimatePresence>
							{errorsBar.percent?.message && (
								<motion.p
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									className="mt-1 text-xs text-red-500"
								>
									{errorsBar.percent.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>

					<div className={"sm:col-span-2"}>
						<label htmlFor={"style"} className="flex items-center text-sm font-medium text-neutral-700">
							Color
						</label>
						<Dropdown
							inModal={true}
							onChange={(t) => setValueBar("color", t as colors)}
							values={[
								{ value: "blue", name: "Blue" },
								{ value: "red", name: "Red" },
								{ value: "green", name: "Green" },
								{ value: "yellow", name: "Yellow" },
								{ value: "orange", name: "Orange" },
								{ value: "purple", name: "Purple" },
								{ value: "pink", name: "Pink" },
								{ value: "indigo", name: "Indigo" },
							]}
							selectedValue={watchBar("color")}
						/>
						<AnimatePresence>
							{errorsBar.color?.message && (
								<motion.p
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									className="mt-1 text-xs text-red-500"
								>
									{errorsBar.color.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				</form>
			</Modal>
			<Modal
				title={"Add a button"}
				description={"Create a button with a link"}
				isOpen={buttonModal}
				onToggle={() => setButtonModal(!buttonModal)}
				onAction={handleSubmitButton(addButton)}
				type={"info"}
				action={"Add"}
				icon={
					<>
						<path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" />
						<path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5" />
						<path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" />
						<path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" />
						<path d="M5 3l-1 -1" />
						<path d="M4 7h-1" />
						<path d="M14 3l1 -1" />
						<path d="M15 6h1" />
					</>
				}
			>
				<form
					onSubmit={handleSubmitButton(addButton)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void handleSubmitUrl(addUrl)();
						}
					}}
					className="grid gap-6 sm:grid-cols-2"
				>
					<div className={"sm:col-span-2"}>
						<label htmlFor={"percentage"} className="block text-sm font-medium text-neutral-700">
							Link
						</label>
						<div className="mt-1 flex rounded-md shadow-sm">
							<span className="inline-flex items-center rounded-l border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
								https://
							</span>
							<input
								type="text"
								autoComplete={"off"}
								className={
									"block w-full rounded-r border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
								}
								placeholder="www.example.com"
								{...registerButton("link")}
							/>
						</div>
						<AnimatePresence>
							{errorsButton.link?.message && (
								<motion.p
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									className="mt-1 text-xs text-red-500"
								>
									{errorsButton.link.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>

					<div className={"sm:col-span-2"}>
						<label htmlFor={"style"} className="flex items-center text-sm font-medium text-neutral-700">
							Color
						</label>
						<Dropdown
							inModal={true}
							onChange={(t) => setValueButton("color", t as colors)}
							values={[
								{ value: "blue", name: "Blue" },
								{ value: "red", name: "Red" },
								{ value: "green", name: "Green" },
								{ value: "yellow", name: "Yellow" },
								{ value: "orange", name: "Orange" },
								{ value: "purple", name: "Purple" },
								{ value: "pink", name: "Pink" },
								{ value: "indigo", name: "Indigo" },
								{ value: "black", name: "Black" },
							]}
							selectedValue={watchButton("color")}
						/>
						<AnimatePresence>
							{errorsButton.color?.message && (
								<motion.p
									initial={{ height: 0 }}
									animate={{ height: "auto" }}
									exit={{ height: 0 }}
									className="mt-1 text-xs text-red-500"
								>
									{errorsButton.color.message}
								</motion.p>
							)}
						</AnimatePresence>
					</div>
				</form>
			</Modal>
			<div>
				<>
					{mode === "PLUNK" ? (
						<>
							<div
								onClick={() => {
									editor.chain().focus().run();
								}}
							>
								<label className="block text-sm font-medium text-neutral-700">Email Body</label>
								<div className="mt-1 h-full">
									<div
										className={
											"flex h-full max-h-[600px] flex-col items-center overflow-y-auto overflow-x-hidden rounded border border-neutral-300 px-3 py-1"
										}
									>
										<div
											className={
												"sticky top-3 z-10 mt-3 flex flex-col justify-center gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-sm"
											}
										>
											<div className={"flex gap-3"}>
												<div className={"flex"}>
													<button
														title={"Align Left"}
														className={
															"flex items-center justify-center rounded-l-md border border-neutral-300 bg-white px-3 py-1 text-neutral-800 transition ease-in-out hover:bg-neutral-50"
														}
														onClick={(e) => {
															e.preventDefault();
															editor.chain().focus().setTextAlign("left").run();
														}}
													>
														<AlignLeft
															size={24}
															strokeWidth={
																editor.isActive("textAlign", {
																	textAlign: "left",
																})
																	? "2.5"
																	: "1.5"
															}
														/>
													</button>
													<button
														title={"Align Center"}
														className={
															"flex items-center justify-center border border-neutral-300 bg-white px-3 py-1 text-neutral-800 transition ease-in-out hover:bg-neutral-50"
														}
														onClick={(e) => {
															e.preventDefault();
															editor.chain().focus().setTextAlign("center").run();
														}}
													>
														<AlignCenter
															size={24}
															strokeWidth={
																editor.isActive("textAlign", {
																	textAlign: "center",
																})
																	? "2.5"
																	: "1.5"
															}
														/>
													</button>
													<button
														title={"Align Right"}
														className={
															"flex items-center justify-center rounded-r-md border border-neutral-300 bg-white px-3 py-1 text-neutral-800 transition ease-in-out hover:bg-neutral-50"
														}
														onClick={(e) => {
															e.preventDefault();
															editor.chain().focus().setTextAlign("right").run();
														}}
													>
														<AlignRight
															size={24}
															strokeWidth={
																editor.isActive("textAlign", {
																	textAlign: "right",
																})
																	? "2.5"
																	: "1.5"
															}
														/>
													</button>
												</div>

												<div className={"flex"}>
													<button
														title={"Image"}
														className={
															"flex items-center justify-center rounded-l-md border border-neutral-300 bg-white px-3 py-1 text-neutral-800 transition ease-in-out hover:bg-neutral-50"
														}
														onClick={(e) => {
															e.preventDefault();
															setImageModal(true);
														}}
													>
														<ImageIcon size={24} strokeWidth={"1.5"} />
													</button>

													<button
														title={"Button"}
														className={
															"flex items-center justify-center rounded-r-md border border-neutral-300 bg-white px-3 py-1 text-neutral-800 transition ease-in-out hover:bg-neutral-50"
														}
														onClick={(e) => {
															e.preventDefault();
															setButtonModal(true);
														}}
													>
														<Inspect size={24} strokeWidth={"1.5"} />
													</button>
												</div>
											</div>
										</div>
										<>
											<div className={"prose prose-sm prose-neutral space-y-4 break-words p-4 w-full"}>
												<div className={"w-full lg:w-[600px]"}>
													<EditorContent editor={editor} />
													<EditorBubbleMenu
														editor={editor}
														items={[
															{
																name: "Link",
																icon: LinkIcon,
																command: () => {
																	setUrlModal(true);
																	setTimeout(() => {
																		setFocusUrl("url", { shouldSelect: true });
																	}, 100);
																},
																isActive: () => false,
															},
														]}
													/>
												</div>
											</div>
										</>
									</div>
								</div>
							</div>
						</>
					) : (
						<>
							<div className={"mb-3 sm:grid sm:gap-3 md:grid-cols-1"}>
								<div>
									<label className="block text-sm font-medium text-neutral-700">Email Body</label>
									<div className="mt-1 h-full">
										<HTMLEditor
											height={400}
											className={"rounded border border-neutral-300"}
											language="html"
											theme="vs-light"
											value={value}
											onChange={(e) => onChange(e as string, "HTML")}
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

								<div>
									<label className="block text-sm font-medium text-neutral-700">Preview</label>

									<div className={"mt-1 h-full rounded border border-neutral-300 p-3"}>
										{/* injects value into iframe with script to dynamically adjust height based on content */}
										<iframe
											className="mb-0 overflow-hidden w-full"
											srcDoc={`
												${value}
												<script>
													window.addEventListener('load', function() {
														const height = document.documentElement.offsetHeight;
														window.parent.postMessage({ type: 'resize-iframe', height: height }, '*');
													});
												</script>
											`}
											onLoad={(e) => {
												const handleMessage = (event: MessageEvent) => {
													if (event.data?.type === 'resize-iframe') {
														(e.target as HTMLIFrameElement).style.height = `${event.data.height}px`;
													}
												};
												window.addEventListener('message', handleMessage);
												return () => window.removeEventListener('message', handleMessage);
											}}
										/>
									</div>
								</div>
							</div>
						</>
					)}
				</>
			</div>
		</>
	);
}

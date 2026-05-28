"use client";

import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import {
	FaBold,
	FaCode,
	FaEye,
	FaGripLines,
	FaHeading,
	FaImage,
	FaItalic,
	FaLink,
	FaListOl,
	FaListUl,
	FaPenNib,
	FaQuoteLeft,
	FaTableColumns,
} from "react-icons/fa6";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import { useI18n } from "@/components/LocaleProvider";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/image-upload";
import {
	createMarkdownComponents,
	MARKDOWN_ARTICLE_CLASS,
	markdownRehypePlugins,
	markdownRemarkPlugins,
} from "@/lib/markdown";
import { getReadingTimeMinutes, stripMarkdown } from "@/lib/post-shared";

type UploadedImage = {
	name: string;
	url: string;
};

type FeedbackState = {
	tone: "error" | "success";
	message: string;
};

type MarkdownEditorProps = {
	value: string;
	onChange: (value: string) => void;
	maxLength: number;
	disabled?: boolean;
	onInsertImages: (files: File[]) => Promise<UploadedImage[]> | UploadedImage[];
	resolveImageSrc?: (src: string) => string;
	toolbarPortal?: HTMLElement | null;
};

type EditorMode = "write" | "preview" | "split";

type ToolbarAction = {
	label: string;
	icon: IconType;
	action: () => void;
};

const MIN_EDITOR_HEIGHT = 512;
const MAX_EDITOR_HEIGHT = 720;

function fileNameToAlt(name: string) {
	return name
		.replace(/\.[^.]+$/, "")
		.replace(/[-_]+/g, " ")
		.trim();
}

function clampEditorHeight(height: number) {
	return Math.min(Math.max(height, MIN_EDITOR_HEIGHT), MAX_EDITOR_HEIGHT);
}

function syncScrollPosition(source: HTMLElement, target: HTMLElement) {
	const sourceScrollable = source.scrollHeight - source.clientHeight;
	const targetScrollable = target.scrollHeight - target.clientHeight;
	const progress =
		sourceScrollable > 0 ? source.scrollTop / sourceScrollable : 0;

	target.scrollTop = targetScrollable * progress;
}

type ScrollSnapshot = {
	textareaScrollTop: number | null;
	previewScrollTop: number | null;
};

type TextSelection = {
	start: number;
	end: number;
};

export default function MarkdownEditor({
	value,
	onChange,
	maxLength,
	disabled = false,
	onInsertImages,
	resolveImageSrc,
	toolbarPortal,
}: MarkdownEditorProps) {
	const { messages } = useI18n();
	const [mode, setMode] = useState<EditorMode>("split");
	const [feedback, setFeedback] = useState<FeedbackState | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const syncingScrollRef = useRef(false);
	const lastSelectionRef = useRef<TextSelection | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: height must be remeasured when editor content or mode changes.
	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		setEditorHeight(clampEditorHeight(textarea.scrollHeight));
	}, [mode, value]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: split preview scroll must resync after editor height or content changes.
	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		const preview = previewRef.current;
		if (!textarea || !preview || mode !== "split") {
			return;
		}

		syncScrollPosition(textarea, preview);
	}, [editorHeight, mode, value]);

	function syncEditorScroll(source: "markdown" | "preview") {
		if (mode !== "split" || syncingScrollRef.current) {
			return;
		}

		const textarea = textareaRef.current;
		const preview = previewRef.current;
		if (!textarea || !preview) {
			return;
		}

		syncingScrollRef.current = true;
		if (source === "markdown") {
			syncScrollPosition(textarea, preview);
		} else {
			syncScrollPosition(preview, textarea);
		}

		requestAnimationFrame(() => {
			syncingScrollRef.current = false;
		});
	}

	function updateSelection(nextValue: string, cursorPosition: number) {
		const scrollSnapshot: ScrollSnapshot = {
			textareaScrollTop: textareaRef.current?.scrollTop ?? null,
			previewScrollTop: previewRef.current?.scrollTop ?? null,
		};

		onChange(nextValue);
		requestAnimationFrame(() => {
			const textarea = textareaRef.current;
			if (!textarea) {
				return;
			}

			textarea.focus();
			textarea.setSelectionRange(cursorPosition, cursorPosition);
			restoreScroll(scrollSnapshot);

			requestAnimationFrame(() => restoreScroll(scrollSnapshot));
		});
	}

	function restoreScroll(snapshot: ScrollSnapshot) {
		const textarea = textareaRef.current;
		const preview = previewRef.current;

		syncingScrollRef.current = true;
		if (textarea && snapshot.textareaScrollTop !== null) {
			textarea.scrollTop = snapshot.textareaScrollTop;
		}

		if (preview && snapshot.previewScrollTop !== null) {
			preview.scrollTop = snapshot.previewScrollTop;
		}

		requestAnimationFrame(() => {
			syncingScrollRef.current = false;
		});
	}

	function insertAtSelection(snippet: string, moveCursorBy = 0) {
		const textarea = textareaRef.current;
		if (!textarea) {
			onChange(`${value}${snippet}`);
			return;
		}

		const start = textarea.selectionStart ?? value.length;
		const end = textarea.selectionEnd ?? value.length;
		const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
		updateSelection(nextValue, start + snippet.length + moveCursorBy);
	}

	function wrapSelection(prefix: string, suffix = "") {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		const start = textarea.selectionStart ?? 0;
		const end = textarea.selectionEnd ?? 0;
		const selectedText = value.slice(start, end) || "text";
		const nextValue = `${value.slice(0, start)}${prefix}${selectedText}${suffix}${value.slice(end)}`;
		updateSelection(
			nextValue,
			start + prefix.length + selectedText.length + suffix.length,
		);
	}

	function getCurrentSelection(): TextSelection {
		const textarea = textareaRef.current;
		if (!textarea) {
			return {
				start: value.length,
				end: value.length,
			};
		}

		return {
			start: textarea.selectionStart ?? value.length,
			end: textarea.selectionEnd ?? value.length,
		};
	}

	function recordCurrentSelection() {
		lastSelectionRef.current = getCurrentSelection();
	}

	function insertImageMarkdown(
		imageMarkdown: string,
		selection = getCurrentSelection(),
	) {
		const textarea = textareaRef.current;
		if (!textarea) {
			const separator = value && !value.endsWith("\n") ? "\n" : "";
			onChange(`${value}${separator}${imageMarkdown}`);
			return;
		}

		const { start, end } = selection;

		if (start !== end) {
			const nextValue = `${value.slice(0, start)}${imageMarkdown}${value.slice(end)}`;
			updateSelection(nextValue, start + imageMarkdown.length);
			return;
		}

		const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
		const nextLineBreak = value.indexOf("\n", start);
		const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
		const lineText = value.slice(lineStart, lineEnd);

		if (!lineText.trim()) {
			const nextValue = `${value.slice(0, lineStart)}${imageMarkdown}${value.slice(lineEnd)}`;
			updateSelection(nextValue, lineStart + imageMarkdown.length);
			return;
		}

		const needsLineBreakBefore = start > 0 && value[start - 1] !== "\n";
		const needsLineBreakAfter = start < value.length && value[start] !== "\n";
		const snippet = `${needsLineBreakBefore ? "\n" : ""}${imageMarkdown}${needsLineBreakAfter ? "\n" : ""}`;
		const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
		updateSelection(nextValue, start + snippet.length);
	}

	async function handleFilesSelected(
		event: React.ChangeEvent<HTMLInputElement>,
	) {
		const files = Array.from(event.target.files || []);
		if (!files.length) {
			return;
		}

		setIsUploading(true);
		setFeedback(null);

		try {
			const selection = lastSelectionRef.current ?? getCurrentSelection();
			const uploads = await onInsertImages(files);
			const markdownBlock = uploads
				.map(
					(upload) =>
						`![${fileNameToAlt(upload.name) || messages.newPost.imageDefaultAlt}](${upload.url})`,
				)
				.join("\n");

			insertImageMarkdown(markdownBlock, selection);
			setFeedback({
				tone: "success",
				message: messages.newPost.imagesInserted(uploads.length),
			});
		} catch (error) {
			setFeedback({
				tone: "error",
				message:
					error instanceof Error
						? error.message
						: messages.newPost.imageUploadError,
			});
		} finally {
			setIsUploading(false);
			event.target.value = "";
		}
	}

	const plainText = stripMarkdown(value);
	const wordCount = plainText ? plainText.split(" ").filter(Boolean).length : 0;
	const readingTime = getReadingTimeMinutes(value);
	const remaining = maxLength - value.length;
	const modeOptions: Array<{
		value: EditorMode;
		label: string;
		description: string;
		icon: IconType;
	}> = [
		{
			value: "write",
			label: messages.newPost.modeWrite,
			description: messages.newPost.modeWriteDescription,
			icon: FaPenNib,
		},
		{
			value: "preview",
			label: messages.newPost.modePreview,
			description: messages.newPost.modePreviewDescription,
			icon: FaEye,
		},
		{
			value: "split",
			label: messages.newPost.modeSplit,
			description: messages.newPost.modeSplitDescription,
			icon: FaTableColumns,
		},
	];
	const toolbarSections: Array<{
		title: string;
		actions: ToolbarAction[];
	}> = [
		{
			title: messages.newPost.toolbarInline,
			actions: [
				{
					label: messages.newPost.toolbarBold,
					icon: FaBold,
					action: () => wrapSelection("**", "**"),
				},
				{
					label: messages.newPost.toolbarItalic,
					icon: FaItalic,
					action: () => wrapSelection("_", "_"),
				},
				{
					label: messages.newPost.toolbarCode,
					icon: FaCode,
					action: () => wrapSelection("`", "`"),
				},
				{
					label: messages.newPost.toolbarLink,
					icon: FaLink,
					action: () => wrapSelection("[", "](https://example.com)"),
				},
			],
		},
		{
			title: messages.newPost.toolbarBlocks,
			actions: [
				{
					label: messages.newPost.toolbarCodeBlock,
					icon: FaCode,
					action: () => insertAtSelection("\n```ts\n\n```\n", -5),
				},
				{
					label: messages.newPost.toolbarHeading,
					icon: FaHeading,
					action: () => insertAtSelection("\n\n## Heading\n\n"),
				},
				{
					label: messages.newPost.toolbarQuote,
					icon: FaQuoteLeft,
					action: () => insertAtSelection("\n\n> Pull quote\n\n"),
				},
				{
					label: messages.newPost.toolbarList,
					icon: FaListUl,
					action: () =>
						insertAtSelection("\n\n- First item\n- Second item\n\n"),
				},
				{
					label: messages.newPost.toolbarNumbered,
					icon: FaListOl,
					action: () =>
						insertAtSelection("\n\n1. First step\n2. Second step\n\n"),
				},
				{
					label: messages.newPost.toolbarDivider,
					icon: FaGripLines,
					action: () => insertAtSelection("\n\n---\n\n"),
				},
			],
		},
	];
	const editorGridClass =
		mode === "split"
			? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
			: "grid gap-4 grid-cols-1";

	function allowPreviewImageUrls(url: string) {
		if (url.startsWith("pending-upload://") || url.startsWith("blob:")) {
			return url;
		}

		return defaultUrlTransform(url);
	}

	const toolbarControls = (
		<div className="grid gap-4">
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				onFocus={recordCurrentSelection}
				onMouseDown={recordCurrentSelection}
				disabled={disabled || isUploading}
				className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-purpleContrast/35 bg-purpleContrast/18 px-4 py-2 text-sm font-semibold text-wheat transition-colors hover:bg-purpleContrast/26 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<FaImage className="text-sm" />
				<span>
					{isUploading
						? messages.newPost.uploading
						: messages.newPost.insertImage}
				</span>
			</button>
			{toolbarSections.map((section) => (
				<div key={section.title}>
					<p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
						{section.title}
					</p>
					<div className="flex flex-wrap gap-2">
						{section.actions.map((item) => {
							const Icon = item.icon;
							return (
								<button
									key={item.label}
									type="button"
									onClick={item.action}
									disabled={disabled || isUploading}
									className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-darkBg/65 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500/70 hover:text-wheat disabled:cursor-not-allowed disabled:opacity-50"
								>
									<Icon className="text-xs" />
									<span>{item.label}</span>
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);

	return (
		<div className="grid gap-4">
			<div className="rounded-[26px] border border-zinc-700/50 bg-greyBg/65 p-4 sm:p-5">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/55 text-wheat">
								<FaPenNib />
							</div>
							<div className="min-w-0">
								<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
									{messages.newPost.editorControlsEyebrow}
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									{messages.newPost.editorControlsTitle}
								</h3>
							</div>
						</div>
						<p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
							{messages.newPost.editorControlsDescription}
						</p>
					</div>

					<div className="grid gap-2 sm:grid-cols-3 xl:w-[26rem]">
						{modeOptions.map((option) => {
							const Icon = option.icon;
							const active = mode === option.value;
							return (
								<button
									key={option.value}
									type="button"
									onClick={() => setMode(option.value)}
									className={`rounded-[20px] border px-4 py-3 text-left transition-colors ${
										active
											? "border-purpleContrast/45 bg-purpleContrast/16"
											: "border-zinc-700/60 bg-darkBg/50 hover:border-zinc-500/70"
									}`}
								>
									<div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
										<Icon className={active ? "text-wheat" : "text-zinc-400"} />
										<span>{option.label}</span>
									</div>
									<p className="mt-1 text-xs leading-5 text-zinc-500">
										{option.description}
									</p>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<div className={editorGridClass}>
				{mode !== "preview" ? (
					<div className="overflow-hidden rounded-[26px] border border-zinc-700/50 bg-darkBg/55">
						<div className="flex flex-col gap-2 border-b border-zinc-700/50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
									<FaPenNib />
									<span>{messages.newPost.markdownEyebrow}</span>
								</div>
								<p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
									{messages.newPost.markdownDescription}
								</p>
							</div>
							<div className="rounded-full border border-zinc-700/60 bg-greyBg/40 px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
								{messages.newPost.editableSource}
							</div>
						</div>
						<textarea
							ref={textareaRef}
							value={value}
							onChange={(event) => {
								lastSelectionRef.current = {
									start: event.currentTarget.selectionStart ?? value.length,
									end: event.currentTarget.selectionEnd ?? value.length,
								};
								onChange(event.target.value);
							}}
							onClick={recordCurrentSelection}
							onKeyUp={recordCurrentSelection}
							onSelect={recordCurrentSelection}
							onScroll={() => syncEditorScroll("markdown")}
							disabled={disabled}
							rows={1}
							style={{ height: editorHeight }}
							className="w-full resize-none overflow-y-auto bg-transparent px-4 py-4 text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
							placeholder={messages.newPost.markdownPlaceholder}
						/>
					</div>
				) : null}

				{mode !== "write" ? (
					<div className="overflow-hidden rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90">
						<div className="flex flex-col gap-2 border-b border-zinc-700/50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
									<FaEye />
									<span>{messages.newPost.previewEyebrow}</span>
								</div>
								<p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
									{messages.newPost.previewDescription}
								</p>
							</div>
							<div className="rounded-full border border-zinc-700/60 bg-greyBg/40 px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
								{messages.newPost.finalRendering}
							</div>
						</div>
						<div
							ref={previewRef}
							onScroll={() => syncEditorScroll("preview")}
							style={{ height: editorHeight }}
							className="overflow-y-auto px-5 py-4"
						>
							{value.trim() ? (
								<div className={MARKDOWN_ARTICLE_CLASS}>
									<ReactMarkdown
										remarkPlugins={markdownRemarkPlugins}
										rehypePlugins={markdownRehypePlugins}
										urlTransform={allowPreviewImageUrls}
										components={createMarkdownComponents({ resolveImageSrc })}
									>
										{value}
									</ReactMarkdown>
								</div>
							) : (
								<div className="flex h-full min-h-[28rem] items-center justify-center rounded-[22px] border border-dashed border-zinc-700/60 bg-darkBg/30 px-6 text-center text-zinc-500">
									{messages.newPost.emptyPreview}
								</div>
							)}
						</div>
					</div>
				) : null}
			</div>

			<div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-zinc-700/50 bg-darkBg/35 px-4 py-3 text-sm text-zinc-500">
				<div className="inline-flex items-center gap-2">
					<FaPenNib className="text-xs" />
					<span>{messages.newPost.editorWordCount(wordCount)}</span>
				</div>
				<div className="inline-flex items-center gap-2">
					<FaEye className="text-xs" />
					<span>{messages.newPost.editorReadTime(readingTime)}</span>
				</div>
				<div
					className={`inline-flex items-center gap-2 ${remaining < 0 ? "text-red-400" : ""}`}
				>
					<FaTableColumns className="text-xs" />
					<span>
						{messages.newPost.editorCharacters(value.length, maxLength)}
					</span>
				</div>
				{feedback ? (
					<span
						className={`inline-flex items-center gap-2 ${
							feedback.tone === "error" ? "text-red-400" : "text-emerald-400"
						}`}
					>
						<FaImage className="text-xs" />
						<span>{feedback.message}</span>
					</span>
				) : null}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES.join(",")}
				multiple
				className="hidden"
				onChange={handleFilesSelected}
			/>
			{toolbarPortal ? createPortal(toolbarControls, toolbarPortal) : null}
		</div>
	);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "./LocaleProvider";

type SuggestModalProps = {
	isOpen: boolean;
	onClose: () => void;
	authorId?: string;
};

const MAX_TITLE = 80;
const MAX_DETAILS = 600;
const MIN_TITLE = 5;

type StoredSuggestion = {
	id: string;
	title: string;
	details: string;
	authorId: string;
	createdAt: string;
	status: "pending";
};

export default function SuggestModal({
	isOpen,
	onClose,
	authorId = "me",
}: SuggestModalProps) {
	if (!isOpen) return null;

	return <SuggestModalBody authorId={authorId} onClose={onClose} />;
}

function SuggestModalBody({
	onClose,
	authorId,
}: {
	onClose: () => void;
	authorId: string;
}) {
	const { messages } = useI18n();
	const [title, setTitle] = useState("");
	const [details, setDetails] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	const dirty = useMemo(
		() => title.trim().length > 0 || details.trim().length > 0,
		[title, details],
	);

	function validate() {
		const e: Record<string, string> = {};
		if (title.trim().length < MIN_TITLE)
			e.title = messages.suggestModal.titleTooShort(MIN_TITLE);
		if (title.trim().length > MAX_TITLE)
			e.title = messages.suggestModal.maxChars(MAX_TITLE);
		if (details.trim().length > MAX_DETAILS)
			e.details = messages.suggestModal.maxChars(MAX_DETAILS);
		setErrors(e);
		return Object.keys(e).length === 0;
	}

	function saveSuggestion() {
		const suggestion = {
			id: `${Date.now()}`,
			title: title.trim(),
			details: details.trim(),
			authorId,
			createdAt: new Date().toISOString(),
			status: "pending" as const,
		};
		try {
			const raw = localStorage.getItem("postSuggestions");
			const arr: StoredSuggestion[] = raw ? JSON.parse(raw) : [];
			arr.unshift(suggestion);
			localStorage.setItem("postSuggestions", JSON.stringify(arr));
		} catch {
			// todo
		}
	}

	async function handleSubmit() {
		if (!validate()) return;
		setSaving(true);
		saveSuggestion();
		setSaving(false);
		setSubmitted(true);
		setTimeout(() => {
			onClose();
		}, 900);
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto p-4">
			<button
				type="button"
				className="fixed inset-0 bg-black/60 backdrop-blur-sm"
				aria-label={messages.suggestModal.close}
				onClick={onClose}
			/>
			<div className="relative flex min-h-full items-start justify-center sm:items-center">
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="suggest-post-title-heading"
					className="relative flex w-full max-w-xl flex-col rounded-2xl border border-zinc-700/50 bg-greyBg shadow-2xl max-h-[calc(100dvh-2rem)]"
				>
				<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
					<h3
						id="suggest-post-title-heading"
						className="text-lg font-semibold text-zinc-100"
					>
						{messages.suggestModal.title}
					</h3>
					<button
						type="button"
						className="text-zinc-300 hover:text-white"
						onClick={onClose}
						aria-label={messages.common.close}
					>
						✕
					</button>
				</div>

				<div className="space-y-4 overflow-y-auto px-5 py-5">
					<div>
						<label
							htmlFor="suggest-post-title"
							className="block text-sm text-zinc-300 mb-1"
						>
							{messages.suggestModal.fieldTitle}
						</label>
						<input
							id="suggest-post-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={MAX_TITLE}
							placeholder={messages.suggestModal.titlePlaceholder}
							className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
						/>
						<div className="flex justify-between">
							{errors.title && (
								<p className="text-xs text-red-400 mt-1">{errors.title}</p>
							)}
							<span className="text-xs text-zinc-400 mt-1 ml-auto">
								{title.length}/{MAX_TITLE}
							</span>
						</div>
					</div>

					<div>
						<label
							htmlFor="suggest-post-details"
							className="block text-sm text-zinc-300 mb-1"
						>
							{messages.suggestModal.fieldIdea}
						</label>
						<textarea
							id="suggest-post-details"
							value={details}
							onChange={(e) => setDetails(e.target.value)}
							maxLength={MAX_DETAILS}
							rows={5}
							placeholder={messages.suggestModal.ideaPlaceholder}
							className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
						/>
						<div className="flex justify-between">
							{errors.details && (
								<p className="text-xs text-red-400 mt-1">{errors.details}</p>
							)}
							<span className="text-xs text-zinc-400 mt-1 ml-auto">
								{details.length}/{MAX_DETAILS}
							</span>
						</div>
					</div>

					<p className="text-xs text-zinc-400">
						{messages.suggestModal.reviewNote}
					</p>
				</div>

				<div className="flex items-center justify-end gap-3 px-5 pb-5">
					<button
						type="button"
						className="px-4 py-2 rounded-md bg-zinc-700/60 text-zinc-100 hover:bg-zinc-700/80 border border-zinc-600/50"
						onClick={onClose}
						disabled={saving}
					>
						{messages.common.cancel}
					</button>
					<button
						type="button"
						className="px-4 py-2 rounded-md bg-purpleContrast hover:bg-purple-500 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={handleSubmit}
						disabled={saving || !dirty}
					>
						{submitted
							? messages.suggestModal.submitted
							: saving
								? messages.suggestModal.submitting
								: messages.suggestModal.submit}
					</button>
				</div>
				</div>
			</div>
		</div>
	);
}

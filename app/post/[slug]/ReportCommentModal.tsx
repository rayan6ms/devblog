"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";

type ReportPayload = {
	commentId: number;
	reason: string;
	details?: string;
	dateISO: string;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	comment?: { id: number; author: string; text: string };
	onSubmit: (payload: ReportPayload) => void;
};

const REASONS = [
	"Spam",
	"Harassment or hate",
	"Sexual / explicit",
	"Violence / threat",
	"Misinformation",
	"Other",
] as const;

const MAX_DETAILS = 300;
const MIN_DETAILS_IF_OTHER = 10;

export default function ReportCommentModal({
	isOpen,
	onClose,
	comment,
	onSubmit,
}: Props) {
	const { messages } = useI18n();

	if (!isOpen || !comment) return null;

	return (
		<ReportCommentModalBody
			comment={comment}
			messages={messages}
			onClose={onClose}
			onSubmit={onSubmit}
		/>
	);
}

function ReportCommentModalBody({
	onClose,
	comment,
	onSubmit,
	messages,
}: Omit<Props, "isOpen"> & {
	comment: NonNullable<Props["comment"]>;
	messages: ReturnType<typeof useI18n>["messages"];
}) {
	const [reason, setReason] = useState<string>("");
	const [details, setDetails] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const valid = useMemo(() => {
		if (!reason) return false;
		if (reason === "Other") {
			const len = details.trim().length;
			if (len < MIN_DETAILS_IF_OTHER || len > MAX_DETAILS) return false;
		} else if (details.trim().length > MAX_DETAILS) {
			return false;
		}
		return true;
	}, [reason, details]);

	function handleSubmit() {
		if (!comment) return;
		if (!valid) {
			setError(messages.post.reportValidation);
			return;
		}
		setSaving(true);
		onSubmit({
			commentId: comment.id,
			reason,
			details: details.trim() || undefined,
			dateISO: new Date().toISOString(),
		});
		setSaving(false);
		onClose();
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto p-4">
			<button
				type="button"
				className="fixed inset-0 bg-black/60 backdrop-blur-sm"
				aria-label={messages.common.close}
				onClick={onClose}
			/>
			<div className="relative flex min-h-full items-start justify-center sm:items-center">
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="report-comment-title"
					className="relative flex w-full max-w-lg flex-col rounded-2xl border border-zinc-700/50 bg-greyBg shadow-2xl max-h-[calc(100dvh-2rem)]"
				>
					<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
						<h3
							id="report-comment-title"
							className="text-lg font-semibold text-zinc-100"
						>
							{messages.post.reportCommentTitle}
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

					<div className="space-y-4 overflow-y-auto px-5 py-4">
						<div className="bg-zinc-800/60 border border-zinc-600/40 rounded-md p-3">
							<p className="text-sm text-zinc-300">
								{messages.post.reportingCommentBy(comment.author)}
							</p>
							<p className="mt-2 text-sm text-zinc-400 line-clamp-3">
								{comment.text}
							</p>
						</div>

						<div>
							<label
								htmlFor="report-comment-reason"
								className="block text-sm text-zinc-300 mb-1"
							>
								{messages.post.reason}
							</label>
							<select
								id="report-comment-reason"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
							>
								<option value="" disabled>
									{messages.post.chooseReason}
								</option>
								{REASONS.map((r) => (
									<option key={r} value={r}>
										{r}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="report-comment-details"
								className="block text-sm text-zinc-300 mb-1"
							>
								{reason === "Other"
									? messages.post.detailsMin(MIN_DETAILS_IF_OTHER)
									: messages.post.detailsOptional}
							</label>
							<textarea
								id="report-comment-details"
								value={details}
								onChange={(e) => setDetails(e.target.value)}
								maxLength={MAX_DETAILS}
								rows={4}
								className="w-full rounded-md bg-zinc-800/70 border border-zinc-600/60 px-3 py-2 text-zinc-100 outline-none focus:border-purple-500"
								placeholder={
									reason === "Other"
										? messages.post.describeIssue
										: messages.post.addContext
								}
							/>
							<div className="flex justify-end">
								<span className="text-xs text-zinc-400">
									{details.length}/{MAX_DETAILS}
								</span>
							</div>
							{error && <p className="text-xs text-red-400 mt-1">{error}</p>}
						</div>
					</div>

					<div className="flex justify-end gap-3 px-5 pb-5">
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
							disabled={saving || !valid}
						>
							{saving ? messages.post.submitting : messages.post.submitReport}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

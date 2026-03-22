"use client";

import { useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { useClientAuth } from "@/components/useClientAuth";
import type { PostComment } from "@/lib/comments";
import Comment from "./Comment";
import LoginModal from "./LoginModal";

export default function CommentSection({
	postId,
	initialComments,
}: {
	postId: string;
	initialComments: PostComment[];
}) {
	const { messages } = useI18n();
	const { isAuthed, profile } = useClientAuth({ includeProfile: true });
	const [isLoginOpen, setIsLoginOpen] = useState(false);
	const [comments, setComments] = useState<PostComment[]>(initialComments);
	const [draft, setDraft] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");
	const currentUser = profile?.name || "Guest";
	const avatarLetter = currentUser.charAt(0).toUpperCase() || "G";
	const avatarSrc = profile?.profilePicture || "";

	const handleComment = async () => {
		if (!isAuthed) {
			setIsLoginOpen(true);
			return;
		}

		const text = draft.trim();
		if (!text || isSubmitting) {
			return;
		}

		setIsSubmitting(true);
		setSubmitError("");

		try {
			const response = await fetch("/api/comments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					postId,
					text,
				}),
			});

			if (response.status === 401) {
				setIsLoginOpen(true);
				return;
			}

			if (!response.ok) {
				setSubmitError(messages.profile.loadError);
				return;
			}

			const comment = (await response.json()) as PostComment;
			setComments((current) => [comment, ...current]);
			setDraft("");
		} catch {
			setSubmitError(messages.profile.loadError);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<section className="mt-10">
			<h2 className="text-2xl font-somerton uppercase text-wheat">
				{messages.post.commentSection}
			</h2>

			<div className="mb-12 mt-5 flex items-start gap-4">
				{avatarSrc ? (
					<img
						src={avatarSrc}
						alt={currentUser}
						className="h-12 w-12 shrink-0 rounded-full border border-zinc-700/60 object-cover"
					/>
				) : (
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700/60 bg-greyBg/75 text-sm font-semibold text-wheat">
						{avatarLetter}
					</div>
				)}
				<div className="flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-zinc-700/50 bg-greyBg/90 shadow-md shadow-zinc-900">
					<textarea
						value={draft}
						className="border-b border-zinc-700/50 bg-greyBg/90 p-5 text-zinc-300 outline-none placeholder:text-zinc-500"
						name="Comment input area"
						cols={5}
						rows={2}
						placeholder={messages.post.commentPlaceholder}
						onChange={(event) => setDraft(event.target.value)}
						onClick={() => {
							if (!isAuthed) setIsLoginOpen(true);
						}}
					/>
					<div className="flex items-center justify-between px-4 py-3">
						<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
							{isAuthed
								? messages.post.commentAs(currentUser)
								: messages.post.loginRequiredToComment}
						</p>
						<button
							type="button"
							onClick={handleComment}
							disabled={isSubmitting || !draft.trim()}
							className="rounded-full bg-purpleContrast/80 px-4 py-2 text-sm font-semibold text-gray-100 transition-colors hover:bg-purpleContrast"
						>
							{messages.post.comment}
						</button>
					</div>
				</div>
			</div>

			{submitError ? (
				<p className="mb-4 text-sm text-rose-300">{submitError}</p>
			) : null}

			{comments.map((comment) => (
				<Comment key={comment.id} {...comment} />
			))}
			{comments.length === 0 ? (
				<div className="rounded-[24px] border border-dashed border-zinc-700/60 bg-greyBg/40 px-5 py-6 text-sm text-zinc-400">
					{messages.profile.noCommentsYet}
				</div>
			) : null}

			<LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
		</section>
	);
}

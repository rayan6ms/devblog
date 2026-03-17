"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { useClientAuth } from "@/components/useClientAuth";
import Comment from "./Comment";
import LoginModal from "./LoginModal";
import ReportCommentModal from "./ReportCommentModal";

const comments = [
	{
		id: 1,
		author: "Johann Gottfried",
		date: "2023-11-20",
		commentText:
			"This is a really informative article. Thanks for sharing! Lorem ipsum dolor sit amet consectetur adipisicing elit. Ducimus atque aliquid quam nostrum reiciendis! Tempora ab magnam, non expedita minus ducimus pariatur itaque corrupti minima ipsam amet dignissimos natus veniam.",
		upvotes: 50,
		downvotes: 2,
		avatar:
			"https://imageio.forbes.com/specials-images/imageserve/5db83d5a38073500062a7fc0/-Joker-/0x0.jpg?format=jpg&crop=902,507,x370,y188,safe&width=960",
	},
	{
		id: 2,
		author: "Sarah Connor",
		date: "2023-11-18",
		commentText:
			"I found this post really helpful. Looking forward to more content!",
		upvotes: 25,
		downvotes: 26,
		avatar:
			"https://imageio.forbes.com/specials-images/imageserve/5db83d5a38073500062a7fc0/-Joker-/0x0.jpg?format=jpg&crop=902,507,x370,y188,safe&width=960",
	},
];

type CommentReportPayload = {
	commentId: number;
	reason: string;
	details?: string;
	dateISO: string;
};

export default function CommentSection() {
	const { messages } = useI18n();
	const { isAuthed, profile } = useClientAuth();
	const [isLoginOpen, setIsLoginOpen] = useState(false);

	const [isReportOpen, setIsReportOpen] = useState(false);
	const [reportTargetId, setReportTargetId] = useState<number | null>(null);
	const reportTarget = useMemo(
		() => comments.find((c) => c.id === reportTargetId) || undefined,
		[reportTargetId],
	);

	const [votes, setVotes] = useState<Record<number, number>>(() =>
		comments.reduce(
			(acc, c) => {
				acc[c.id] = c.upvotes - c.downvotes;
				return acc;
			},
			{} as Record<number, number>,
		),
	);

	const [userVotes, setUserVotes] = useState<
		Record<number, "up" | "down" | null>
	>(() =>
		comments.reduce(
			(acc, c) => {
				acc[c.id] = null;
				return acc;
			},
			{} as Record<number, "up" | "down" | null>,
		),
	);
	const currentUser = profile?.name || "Guest";
	const avatarLetter = currentUser.charAt(0).toUpperCase() || "G";

	const handleComment = () => {
		if (!isAuthed) {
			setIsLoginOpen(true);
			return;
		}
		// TODO: add real submit when you have a backend
	};

	const handleVote = (id: number, action: "up" | "down") => {
		if (!isAuthed) {
			setIsLoginOpen(true);
			return;
		}
		const currentVote = userVotes[id] || null;
		let delta = 0;

		if (currentVote === action) {
			delta = action === "up" ? -1 : 1;
			setUserVotes((prev) => ({ ...prev, [id]: null }));
		} else if (currentVote === null) {
			delta = action === "up" ? 1 : -1;
			setUserVotes((prev) => ({ ...prev, [id]: action }));
		} else {
			delta = action === "up" ? 2 : -2;
			setUserVotes((prev) => ({ ...prev, [id]: action }));
		}

		setVotes((prev) => ({ ...prev, [id]: prev[id] + delta }));
	};

	const handleFlag = (id: number) => {
		if (!isAuthed) {
			setIsLoginOpen(true);
			return;
		}
		setReportTargetId(id);
		setIsReportOpen(true);
	};

	const handleSubmitReport = (payload: CommentReportPayload) => {
		const key = "reportedCommentIds";
		const keyData = localStorage.getItem(key);
		const reportedSet = new Set<number>(keyData ? JSON.parse(keyData) : []);
		if (reportedSet.has(payload.commentId)) return;

		const reportsKey = "commentReports";
		const existing = localStorage.getItem(reportsKey);
		const list: CommentReportPayload[] = existing ? JSON.parse(existing) : [];
		list.push(payload);
		localStorage.setItem(reportsKey, JSON.stringify(list));

		reportedSet.add(payload.commentId);
		localStorage.setItem(key, JSON.stringify(Array.from(reportedSet)));
	};

	return (
		<section className="mt-10">
			<h2 className="text-2xl font-somerton uppercase text-wheat">
				{messages.post.commentSection}
			</h2>

			<div className="mb-12 mt-5 flex items-start gap-4">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700/60 bg-greyBg/75 text-sm font-semibold text-wheat">
					{avatarLetter}
				</div>
				<div className="flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-zinc-700/50 bg-greyBg/90 shadow-md shadow-zinc-900">
					<textarea
						className="border-b border-zinc-700/50 bg-greyBg/90 p-5 text-zinc-300 outline-none placeholder:text-zinc-500"
						name="Comment input area"
						cols={5}
						rows={2}
						placeholder={messages.post.commentPlaceholder}
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
							className="rounded-full bg-purpleContrast/80 px-4 py-2 text-sm font-semibold text-gray-100 transition-colors hover:bg-purpleContrast"
						>
							{messages.post.comment}
						</button>
					</div>
				</div>
			</div>

			{comments.map((comment) => (
				<Comment
					key={comment.id}
					{...comment}
					votes={votes}
					userVotes={userVotes}
					onVote={handleVote}
					onFlag={handleFlag}
				/>
			))}

			<LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

			<ReportCommentModal
				isOpen={isReportOpen}
				onClose={() => setIsReportOpen(false)}
				comment={
					reportTarget
						? {
							id: reportTarget.id,
							author: reportTarget.author,
							text: reportTarget.commentText,
						}
						: undefined
				}
				onSubmit={handleSubmitReport}
			/>
		</section>
	);
}

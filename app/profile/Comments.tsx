import Link from "next/link";
import { FaComment } from "react-icons/fa6";
import type { ProfileComment } from "@/profile/types";

type CommentsProps = {
	comments: ProfileComment[];
};

function formatActivityDate(value: string) {
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function CommentItem({ comment }: { comment: ProfileComment }) {
	return (
		<Link
			href={`/post/${comment.postSlug}`}
			className="group flex min-h-[220px] flex-col justify-between rounded-[24px] border border-zinc-700/50 bg-greyBg/65 p-4 shadow-lg shadow-zinc-950/10 transition-transform hover:-translate-y-1"
		>
			<div>
				<p className="line-clamp-6 text-sm leading-7 text-zinc-200">
					{comment.content}
				</p>
			</div>
			<div className="mt-5 border-t border-zinc-700/50 pt-4">
				<div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-3">
					<p className="line-clamp-2 text-sm font-semibold text-zinc-100">
						{comment.postTitle}
					</p>
					<p className="mt-1 text-xs text-zinc-400">
						{comment.edited
							? `Edited ${formatActivityDate(comment.editedAt || comment.postedAt)}`
							: formatActivityDate(comment.postedAt)}
					</p>
				</div>
			</div>
		</Link>
	);
}

export default function Comments({ comments }: CommentsProps) {
	return (
		<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20 sm:p-6">
			<div className="mb-5 flex items-center gap-3 text-wheat">
				<div className="rounded-full border border-zinc-600/50 bg-greyBg/80 p-2">
					<FaComment />
				</div>
				<div>
					<h3 className="font-somerton text-2xl uppercase">Comments</h3>
					<p className="text-sm text-zinc-400">
						Recent activity across the blog
					</p>
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{comments.map((comment) => (
					<CommentItem key={comment.id} comment={comment} />
				))}
				{comments.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-zinc-700/60 bg-greyBg/45 px-4 py-6 text-sm text-zinc-400">
						No comments to show yet.
					</div>
				) : null}
			</div>
		</section>
	);
}

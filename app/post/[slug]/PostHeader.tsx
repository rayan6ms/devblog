import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { FaBookmark, FaClock, FaEye } from "react-icons/fa6";
import {
	getReadingTimeMinutes,
	slugifyPostValue,
	type PostPageData,
} from "@/lib/post-shared";

function formatViews(value: number) {
	return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export default function PostHeader({
	post,
	editAction,
}: {
	post: PostPageData;
	editAction?: ReactNode;
}) {
	const formattedDate = format(parseISO(post.postedAt), "dd MMM yyyy", {
		locale: ptBR,
	}).replace(/ (\w)/, (_match, letter) => ` ${letter.toUpperCase()}`);
	const statusLabel =
		post.status === "published"
			? "Published"
			: post.status === "pending_review"
				? "Pending review"
				: "Draft";
	const readTime = getReadingTimeMinutes(post.content);
	const dateLabel = post.status === "published" ? "Published" : "Last saved";

	return (
		<section className="overflow-hidden rounded-[28px] border border-zinc-700/50 bg-greyBg/80 shadow-lg shadow-zinc-950/10">
			<div className="grid gap-6 border-b border-zinc-700/50 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
				<div>
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="flex flex-wrap gap-2">
							<Link
								href={`/tag?selected=${slugifyPostValue(post.mainTag)}`}
								className="rounded-full border border-purpleContrast/40 bg-purpleContrast/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-wheat transition-colors hover:bg-purpleContrast/25"
							>
								{post.mainTag}
							</Link>
							{post.tags.map((tag) => (
								<Link
									key={tag}
									href={`/tag?selected=${slugifyPostValue(tag)}`}
									className="rounded-full border border-zinc-700/60 bg-darkBg/65 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-zinc-300 transition-colors hover:border-zinc-500/70 hover:text-wheat"
								>
									{tag}
								</Link>
							))}
							<span className="rounded-full border border-zinc-700/60 bg-darkBg/65 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
								{statusLabel}
							</span>
						</div>

						{editAction ? <div className="shrink-0">{editAction}</div> : null}
					</div>

					<h1 className="mt-5 text-4xl font-somerton uppercase leading-tight text-wheat sm:text-5xl">
						{post.title}
					</h1>
					<p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">
						{post.description}
					</p>
				</div>

				<div className="rounded-[24px] border border-zinc-700/50 bg-darkBg/50 p-5">
					<div className="flex items-center gap-4">
						{post.author.profilePicture ? (
							<img
								src={post.author.profilePicture}
								alt={post.author.name}
								className="h-14 w-14 rounded-full border border-zinc-600/60 object-cover"
							/>
						) : (
							<div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-600/60 bg-greyBg/80 text-sm font-semibold text-wheat">
								{getInitials(post.author.name)}
							</div>
						)}
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
								Written by
							</p>
							<Link
								href={`/profile/${post.author.slug}`}
								className="mt-1 block text-lg font-semibold text-zinc-100 transition-colors hover:text-wheat"
							>
								{post.author.name}
							</Link>
						</div>
					</div>

					<div className="mt-5 grid gap-3 text-sm text-zinc-400">
						<div className="flex items-center justify-between">
							<span>{dateLabel}</span>
							<time dateTime={post.postedAt}>{formattedDate}</time>
						</div>
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2">
								<FaClock />
								Read time
							</span>
							<span>{readTime} min</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2">
								<FaEye />
								Views
							</span>
							<span>{formatViews(post.views)}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2">
								<FaBookmark />
								Bookmarks
							</span>
							<span>{formatViews(post.bookmarks)}</span>
						</div>
						{post.edited && post.lastEditedAt ? (
							<div className="flex items-center justify-between">
								<span>Edited</span>
								<time dateTime={post.lastEditedAt}>
									{format(parseISO(post.lastEditedAt), "dd MMM yyyy", {
										locale: ptBR,
									})}
								</time>
							</div>
						) : null}
					</div>
				</div>
			</div>

			<div className="relative h-56 overflow-hidden bg-darkBg sm:h-72 lg:h-[20rem]">
				{post.thumbnail ? (
					<img
						src={post.thumbnail}
						alt={post.thumbnailAlt}
						className="h-full w-full object-cover"
					/>
				) : null}
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(20,23,26,0.08),rgba(20,23,26,0.52)_72%,rgba(20,23,26,0.72))]" />
			</div>
		</section>
	);
}

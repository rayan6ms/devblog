import type { ReactNode } from "react";
import { FaBookmark, FaClock, FaEye } from "react-icons/fa6";
import LocalizedLink from "@/components/LocalizedLink";
import { getIntlLocale, getMessages, getLocaleLabel } from "@/lib/i18n";
import {
	getReadingTimeMinutes,
	type PostPageData,
	slugifyPostValue,
} from "@/lib/post-shared";
import { getRequestLocale } from "@/lib/request-locale";

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

export default async function PostHeader({
	post,
	editAction,
}: {
	post: PostPageData;
	editAction?: ReactNode;
}) {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const formattedDate = new Date(post.postedAt).toLocaleDateString(
		getIntlLocale(locale),
		{
			day: "2-digit",
			month: "short",
			year: "numeric",
		},
	);
	const statusLabel =
		post.status === "published"
			? messages.post.statusPublished
			: post.status === "pending_review"
				? messages.post.statusPendingReview
				: messages.post.statusDraft;
	const readTime = getReadingTimeMinutes(post.content);
	const dateLabel =
		post.status === "published"
			? messages.common.published
			: messages.common.lastSaved;

	return (
		<section className="overflow-hidden rounded-[28px] border border-zinc-700/50 bg-greyBg/80 shadow-lg shadow-zinc-950/10">
			<div className="grid gap-6 border-b border-zinc-700/50 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
				<div>
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="flex flex-wrap gap-2">
							<LocalizedLink
								href={`/tag?selected=${slugifyPostValue(post.mainTag)}`}
								className="rounded-full border border-purpleContrast/40 bg-purpleContrast/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-wheat transition-colors hover:bg-purpleContrast/25"
							>
								{post.mainTag}
							</LocalizedLink>
							{post.tags.map((tag) => (
								<LocalizedLink
									key={tag}
									href={`/tag?selected=${slugifyPostValue(tag)}`}
									className="rounded-full border border-zinc-700/60 bg-darkBg/65 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-zinc-300 transition-colors hover:border-zinc-500/70 hover:text-wheat"
								>
									{tag}
								</LocalizedLink>
							))}
							<span className="rounded-full border border-zinc-700/60 bg-darkBg/65 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
								{statusLabel}
							</span>
							{post.isTranslated ? (
								<span
									className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-emerald-200"
									title={messages.post.translationFromLanguage(
										getLocaleLabel(post.originalLocale),
									)}
								>
									{messages.post.translatedToCurrentLanguage}
								</span>
							) : null}
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
								{messages.post.writtenBy}
							</p>
							<LocalizedLink
								href={`/profile/${post.author.slug}`}
								className="mt-1 block text-lg font-semibold text-zinc-100 transition-colors hover:text-wheat"
							>
								{post.author.name}
							</LocalizedLink>
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
								{messages.common.readTime}
							</span>
							<span>
								{readTime} {messages.common.minutesShort}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2">
								<FaEye />
								{messages.common.views}
							</span>
							<span>{formatViews(post.views)}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2">
								<FaBookmark />
								{messages.common.bookmarks}
							</span>
							<span>{formatViews(post.bookmarks)}</span>
						</div>
						{post.edited && post.lastEditedAt ? (
							<div className="flex items-center justify-between">
								<span>{messages.common.edited}</span>
								<time dateTime={post.lastEditedAt}>
									{new Date(post.lastEditedAt).toLocaleDateString(
										getIntlLocale(locale),
										{
											day: "2-digit",
											month: "short",
											year: "numeric",
										},
									)}
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

import type { ReactNode } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { getIntlLocale, getMessages, getLocaleLabel } from "@/lib/i18n";
import {
	getReadingTimeMinutes,
	type PostPageData,
	slugifyPostValue,
} from "@/lib/post-shared";
import { getRequestLocale } from "@/lib/request-locale";
export default async function PostHeader({
	post,
	editAction,
}: {
	post: PostPageData;
	editAction?: ReactNode;
}) {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const formatDate = (value: string) =>
		new Intl.DateTimeFormat(getIntlLocale(locale), {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(new Date(value));
	return (
		<header className="article-heading">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="filter-bar mb-0">
					{[...new Set([post.mainTag, ...post.tags])].map((tag) => (
						<LocalizedLink
							key={tag}
							href={`/tag?selected=${slugifyPostValue(tag)}`}
							className="filter-chip"
						>
							{tag}
						</LocalizedLink>
					))}
				</div>
				{editAction}
			</div>
			{post.status !== "published" && (
				<p className="mt-5 text-sm text-[var(--accent)]">
					{post.status === "pending_review"
						? messages.post.statusPendingReview
						: messages.post.statusDraft}
				</p>
			)}
			<h1>{post.title}</h1>
			<p className="article-heading__description">{post.description}</p>
			<div className="article-meta">
				<LocalizedLink href={`/profile/${post.author.slug}`} rel="author">
					{post.author.name}
				</LocalizedLink>
				<time dateTime={post.postedAt}>{formatDate(post.postedAt)}</time>
				<span>
					{getReadingTimeMinutes(post.content)} {messages.common.minutesShort}
				</span>
				<span>
					{post.views} {messages.common.views}
				</span>
				{post.edited && post.lastEditedAt && (
					<span>
						{messages.common.edited}:{" "}
						<time dateTime={post.lastEditedAt}>
							{formatDate(post.lastEditedAt)}
						</time>
					</span>
				)}
			</div>
			{post.isTranslated && (
				<p className="mt-3 text-sm text-zinc-400">
					{messages.post.translationFromLanguage(
						getLocaleLabel(post.originalLocale),
					)}
				</p>
			)}
			{post.thumbnail && (
				<img
					src={post.thumbnail}
					alt={post.thumbnailAlt}
					className="article-cover"
				/>
			)}
		</header>
	);
}

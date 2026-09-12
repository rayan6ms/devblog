"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import slugify from "slugify";
import { getIntlLocale } from "@/lib/i18n-shared";
import { getAuthorHref, getPostHref, type IPost } from "@/lib/posts-client";
import { useI18n } from "./LocaleProvider";
import LocalizedLink from "./LocalizedLink";
import Popover from "./Popover";

function highlight(text: string, term?: string): ReactNode {
	const words = term?.trim().split(/\s+/).filter(Boolean);
	if (!words?.length) return text;
	const pattern = new RegExp(
		`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
		"gi",
	);
	return text
		.split(pattern)
		.map((part, index) =>
			index % 2 ? <mark key={`${index}-${part}`}>{part}</mark> : part,
		);
}

export default function PostCard({
	post,
	variant = "card",
	preload = false,
	highlightTerm,
	onSelectTag,
}: {
	post: IPost;
	variant?: "card" | "featured" | "row" | "compact";
	preload?: boolean;
	highlightTerm?: string;
	onSelectTag?: (tag: string) => void;
}) {
	const { locale, messages } = useI18n();
	const date = new Intl.DateTimeFormat(getIntlLocale(locale), {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(post.date));
	const compact = variant === "row" || variant === "compact";
	return (
		<article className={`post-card post-card--${variant}`}>
			<LocalizedLink
				href={getPostHref(post)}
				className="post-card__image"
				aria-label={post.title}
			>
				<Image
					src={post.image}
					alt={post.imageAlt}
					fill
					preload={preload}
					sizes={
						compact
							? "(max-width: 600px) 88px, 140px"
							: variant === "featured"
								? "(max-width: 900px) 100vw, 720px"
								: "(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 400px"
					}
				/>
			</LocalizedLink>
			<div className="post-card__body">
				<div className="post-card__top">
					{onSelectTag ? (
						<button
							type="button"
							className="post-tag"
							onClick={() => onSelectTag(post.mainTag)}
						>
							{post.mainTag}
						</button>
					) : (
						<LocalizedLink
							href={`/tag?selected=${slugify(post.mainTag, { lower: true, strict: true })}`}
							className="post-tag"
						>
							{post.mainTag}
						</LocalizedLink>
					)}
					<Popover post={post} />
				</div>
				<h3 className="post-card__title">
					<LocalizedLink href={getPostHref(post)}>
						{highlight(post.title, highlightTerm)}
					</LocalizedLink>
				</h3>
				{!compact && (
					<p className="post-card__description">
						{highlight(post.description, highlightTerm)}
					</p>
				)}
				<div className="post-card__meta">
					<LocalizedLink href={getAuthorHref(post)}>
						{post.author}
					</LocalizedLink>
					<time dateTime={post.date}>{date}</time>
				</div>
				{post.hasStartedReading && (
					<div
						className="post-card__progress"
						role="progressbar"
						aria-label={messages.common.percentComplete(post.percentRead)}
						aria-valuenow={post.percentRead}
						aria-valuemin={0}
						aria-valuemax={100}
					>
						<span style={{ width: `${post.percentRead}%` }} />
					</div>
				)}
			</div>
		</article>
	);
}

"use client";

import Image from "next/image";
import React from "react";
import { FaEye } from "react-icons/fa6";
import slugify from "slugify";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getIntlLocale } from "@/lib/i18n";
import { getAuthorHref, getPostHref, type IPost } from "@/lib/posts-client";

type Props = {
	posts: IPost[];
	heading: string;
	highlightTerm?: string;
};

function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, term?: string) {
	const q = term?.trim();
	if (!q) return text;

	// split by words, e.g., "jo ann" -> /(?:jo|ann)/i
	const tokens = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
	if (tokens.length === 0) return text;
	const re = new RegExp(`(${tokens.join("|")})`, "ig");

	const parts = text.split(re);
	let offset = 0;

	return parts.map((part) => {
		const key = `${offset}-${part}`;
		offset += part.length;

		return re.test(part) ? (
			<mark
				key={key}
				className="bg-purple-600/40 text-inherit rounded-sm px-0.5"
			>
				{part}
			</mark>
		) : (
			<React.Fragment key={key}>{part}</React.Fragment>
		);
	});
}

export default function PostsGrid({ posts, heading, highlightTerm }: Props) {
	const { locale } = useI18n();
	const { push } = useLocaleNavigation();

	const formattedDate = (date: string) =>
		new Date(date).toLocaleDateString(getIntlLocale(locale), {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

	const fullFormattedDate = (date: string) =>
		new Date(date).toLocaleDateString(getIntlLocale(locale), {
			weekday: "long",
			day: "2-digit",
			month: "long",
			year: "numeric",
		});

	const pushTo = (
		type: "author" | "tag",
		value: string,
		e: React.MouseEvent,
		post?: IPost,
	) => {
		e.preventDefault();
		const url =
			type === "author"
				? getAuthorHref(post || { author: value, authorSlug: "" })
				: `/tag?selected=${slugify(value, { lower: true, strict: true })}`;
		push(url);
	};

	return (
		<>
			<h2 className="ml-2 my-1.5 col-start-1 row-start-1 text-2xl font-somerton uppercase text-wheat">
				{heading}
			</h2>

			<div className="col-start-1 row-start-2 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-1">
				{posts.map((post) => (
					<LocalizedLink
						key={post.id}
						className="bg-greyBg border border-t-0 border-zinc-700/30 rounded-lg overflow-hidden shadow-lg group"
						href={getPostHref(post)}
					>
						<div className="w-full h-[200px] relative overflow-hidden rounded-t-lg">
							<Image
								src={post.image}
								alt={post.imageAlt}
								fill
								className="object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-lg"
								sizes="(max-width: 1024px) 100vw, 25vw"
							/>
						</div>

						<div className="flex flex-col p-4 h-52">
							<h3 className="text-wheat text-xl font-somerton line-clamp-2 uppercase">
								{highlight(post.title, highlightTerm)}
							</h3>

							<p className="text-zinc-400 text-sm font-europa mt-2 line-clamp-3">
								{highlight(post.description, highlightTerm)}
							</p>

							<div className="flex items-center justify-between my-2">
								<button
									type="button"
									onClick={(e) => pushTo("tag", post.mainTag, e)}
									className="hover:text-purpleContrast transition-colors uppercase font-bold text-sm text-zinc-300"
								>
									{highlight(post.mainTag, highlightTerm)}
								</button>
								<span className="flex items-center gap-1 text-sm text-zinc-400">
									<FaEye /> <span>{post.views.toLocaleString()}</span>
								</span>
							</div>

							<div className="flex items-center justify-between text-zinc-400 text-sm">
								<button
									type="button"
									onClick={(e) => pushTo("author", post.author, e, post)}
									className="hover:text-purpleContrast transition-colors"
								>
									{highlight(post.author, highlightTerm)}
								</button>
								<time
									className="capitalize"
									title={fullFormattedDate(post.date)}
									dateTime={post.date}
								>
									{formattedDate(post.date)}
								</time>
							</div>
						</div>
					</LocalizedLink>
				))}
			</div>
		</>
	);
}

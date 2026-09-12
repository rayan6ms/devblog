"use client";

import slugify from "slugify";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import type { ProfilePost } from "@/profile/types";

type SliderProps = {
	title: string;
	iconKey: "bookmarks" | "viewedPosts" | "drafts" | "pendingReview";
	items?: ProfilePost[] | null;
};

export default function Slider({ title, items = [] }: SliderProps) {
	const list = Array.isArray(items) ? items : [];
	const { messages } = useI18n();
	return (
		<section className="surface-panel min-w-0 p-5 sm:p-6">
			<div className="section-heading">
				<h2 className="section-title">{title}</h2>
				<span className="text-sm text-zinc-400">{list.length}</span>
			</div>
			{list.length ? <div className="divide-y divide-[var(--line)]">
				{list.map(item => <article key={item.id} className="py-4 first:pt-0 last:pb-0">
					<LocalizedLink className="post-tag" href={`/tag?selected=${slugify(item.mainTag, { lower: true, strict: true })}`}>{item.mainTag}</LocalizedLink>
					<h3 className="post-card__title"><LocalizedLink href={`/post/${item.slug}`}>{item.title}</LocalizedLink></h3>
					{item.description && <p className="post-card__description">{item.description}</p>}
					{item.authorName && <p className="mt-3 text-xs text-zinc-400">{item.authorName}</p>}
				</article>)}
			</div> : <p className="text-sm text-zinc-400">{messages.common.noItemsYet}</p>}
		</section>
	);
}

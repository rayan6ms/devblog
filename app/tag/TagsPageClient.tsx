"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { FaXmark } from "react-icons/fa6";
import slugify from "slugify";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import PageIntro from "@/components/PageIntro";
import PostCard from "@/components/PostCard";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import type { IPost, TagCatalog } from "@/lib/posts-client";

export default function TagsPageClient({
	posts,
	selectedTags,
	tagCatalog,
}: {
	posts: IPost[];
	selectedTags: string[];
	tagCatalog: TagCatalog;
}) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();
	const [query, setQuery] = useState("");
	const deferred = useDeferredValue(query).trim().toLowerCase();
	const tags = useMemo(
		() =>
			[
				...new Map(
					[...tagCatalog.mainTags, ...tagCatalog.otherTags].map((tag) => [
						tag.slug,
						tag,
					]),
				).values(),
			].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
		[tagCatalog],
	);
	const update = (next: string[]) =>
		push(next.length ? `/tag?selected=${next.join(",")}` : "/tag");
	const toggle = (slug: string) =>
		update(
			selectedTags.includes(slug)
				? selectedTags.filter((tag) => tag !== slug)
				: [...selectedTags, slug].slice(-5),
		);
	const visibleTags = tags.filter(
		(tag) =>
			!deferred ||
			tag.name.toLowerCase().includes(deferred) ||
			tag.slug.includes(deferred),
	);
	return (
		<>
			<main className="site-container page-content">
				<PageIntro
					title={messages.tag.title}
					description={messages.tag.description}
				/>
				<section className="mb-8" aria-label={messages.tag.mainTopics}>
					<div className="filter-bar">
						<input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							aria-label={messages.tag.searchTags}
							placeholder={messages.tag.searchTags}
						/>
						{selectedTags.length > 0 && (
							<button
								type="button"
								className="ui-button"
								onClick={() => update([])}
							>
								{messages.tag.resetAll}
							</button>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						{visibleTags.map((tag) => (
							<button
								key={tag.slug}
								type="button"
								className="filter-chip"
								aria-pressed={selectedTags.includes(tag.slug)}
								onClick={() => toggle(tag.slug)}
							>
								{tag.name}
								<span>{tag.count}</span>
								{selectedTags.includes(tag.slug) && (
									<FaXmark aria-hidden="true" />
								)}
							</button>
						))}
					</div>
				</section>
				<div className="section-heading">
					<h2 className="section-title">
						{selectedTags.length
							? messages.tag.resultsSummary(posts.length, selectedTags.length)
							: messages.tag.showingAll(posts.length)}
					</h2>
				</div>
				{posts.length ? (
					<div className="post-grid">
						{posts.map((post) => (
							<PostCard
								key={post.id}
								post={post}
								onSelectTag={(tag) =>
									toggle(slugify(tag, { lower: true, strict: true }))
								}
							/>
						))}
					</div>
				) : (
					<p className="empty-state">{messages.tag.noPostsFitDescription}</p>
				)}
			</main>
			<Footer />
		</>
	);
}

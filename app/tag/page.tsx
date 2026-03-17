"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import slugify from "slugify";
import Footer from "@/components/Footer";
import LocalizedLink from "@/components/LocalizedLink";
import { useI18n } from "@/components/LocaleProvider";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getIntlLocale } from "@/lib/i18n";
import {
	getAllPosts,
	getAuthorHref,
	getFilteredPosts,
	getPostTagCatalog,
	getPostHref,
	type TagCatalog,
	type IPost,
} from "@/lib/posts-client";
import InfiniteScroller from "./InfiniteScroller";
import SelectedTags from "./SelectedTags";
import Sidebar, { type TagOption } from "./Sidebar";

const MAX_SELECTED_TAGS = 5;
function normalizeTagValue(value: string) {
	return slugify(value, { lower: true, strict: true });
}

function isValidTag(tag: string, allTags: string[]) {
	const normalizedTag = normalizeTagValue(tag);
	return allTags.some((validTag) => normalizeTagValue(validTag) === normalizedTag);
}

function formatViews(views: number) {
	return views >= 1000 ? `${(views / 1000).toFixed(1)}k` : `${views}`;
}

function matchesTagSearch(tag: TagOption, query: string) {
	if (!query) {
		return true;
	}

	return (
		tag.slug.includes(query) || tag.name.toLowerCase().includes(query.toLowerCase())
	);
}

function TagPostCard({
	post,
	onSelectTag,
}: {
	post: IPost;
	onSelectTag: (tag: string) => void;
}) {
	const { locale, messages } = useI18n();
	const postHref = getPostHref(post);
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(getIntlLocale(locale), {
				month: "short",
				day: "numeric",
				year: "numeric",
			}),
		[locale],
	);

	return (
		<article className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-zinc-700/50 bg-greyBg/90 shadow-lg shadow-zinc-950/20 transition-colors hover:border-zinc-500/70">
			<LocalizedLink
				href={postHref}
				className="relative block aspect-[16/10] overflow-hidden"
			>
				<Image
					fill
					src={post.image}
					alt={post.imageAlt}
					className="object-cover transition-transform duration-700 group-hover:scale-105"
					sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
				/>
			</LocalizedLink>

			<div className="flex flex-1 flex-col p-5">
				<div className="flex items-start justify-between gap-3">
					<button
						type="button"
						className="rounded-full border border-zinc-700/60 bg-darkBg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
						onClick={() => onSelectTag(post.mainTag)}
					>
						{post.mainTag}
					</button>
					<span className="pt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
						{messages.tag.viewsSuffix(formatViews(post.views))}
					</span>
				</div>

				<LocalizedLink href={postHref} className="mt-4 block">
					<h3 className="text-xl font-semibold leading-8 text-wheat transition-colors group-hover:text-zinc-100">
						{post.title}
					</h3>
				</LocalizedLink>

				<p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
					{post.description}
				</p>

				<div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
					<LocalizedLink
						href={getAuthorHref(post)}
						className="transition-colors hover:text-wheat"
					>
						{post.author}
					</LocalizedLink>
					<span className="h-1 w-1 rounded-full bg-zinc-700" />
					<time dateTime={post.date}>{dateFormatter.format(new Date(post.date))}</time>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{post.tags.slice(0, 4).map((tag) => (
						<button
							key={tag}
							type="button"
							className="capitalize rounded-full border border-zinc-700/60 bg-darkBg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-wheat"
							onClick={() => onSelectTag(tag)}
						>
							{tag}
						</button>
					))}
				</div>
			</div>
		</article>
	);
}

function TagsPageContent() {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();
	const searchParams = useSearchParams();
	const [tagCatalog, setTagCatalog] = useState<TagCatalog>({
		mainTags: [],
		otherTags: [],
	});
	const [posts, setPosts] = useState<IPost[]>([]);
	const [tagQuery, setTagQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const deferredTagQuery = useDeferredValue(tagQuery);
	const mainTags = tagCatalog.mainTags;
	const otherTags = tagCatalog.otherTags;
	const allTags = useMemo(
		() =>
			Array.from(
				new Set(
					[...mainTags, ...otherTags].map((tag) => tag.name),
				),
			),
		[mainTags, otherTags],
	);
	const selectedTags = useMemo(() => {
		const selectedParam = searchParams.get("selected");

		if (!selectedParam) {
			return [];
		}

		const uniqueTags = new Set<string>();

		return selectedParam
			.split(",")
			.map((tag) => normalizeTagValue(tag))
			.filter((tag) => {
				if (!isValidTag(tag, allTags) || uniqueTags.has(tag)) {
					return false;
				}

				uniqueTags.add(tag);
				return true;
			})
			.slice(0, MAX_SELECTED_TAGS);
	}, [allTags, searchParams]);
	const selectedTagsKey = selectedTags.join(",");

	const updateSelectedTags = (nextTags: string[]) => {
		push(
			nextTags.length > 0 ? `/tag?selected=${nextTags.join(",")}` : "/tag",
		);
	};

	const handleSelectTag = (tag: string) => {
		const nextTag = normalizeTagValue(tag);

		if (!isValidTag(nextTag, allTags) || selectedTags.includes(nextTag)) {
			return;
		}

		const nextSelectedTags = [...selectedTags, nextTag];

		if (nextSelectedTags.length > MAX_SELECTED_TAGS) {
			nextSelectedTags.shift();
		}

		updateSelectedTags(nextSelectedTags);
	};

	const handleRemoveTag = (tagToRemove: string) => {
		updateSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
	};

	useEffect(() => {
		let active = true;

		async function loadPosts() {
			setIsLoading(true);
			const activeTags = selectedTagsKey ? selectedTagsKey.split(",") : [];

			const [catalog, visiblePosts] = await Promise.all([
				getPostTagCatalog(),
				activeTags.length > 0 ? getFilteredPosts(activeTags) : getAllPosts(),
			]);

			if (!active) {
				return;
			}

			setTagCatalog(catalog);
			setPosts(visiblePosts);
			setIsLoading(false);
		}

		void loadPosts();

		return () => {
			active = false;
		};
	}, [selectedTagsKey]);

	const allMainTagOptions = mainTags;
	const allOtherTagOptions = otherTags;
	const normalizedTagQuery = normalizeTagValue(deferredTagQuery);
	const mainTagOptions = useMemo(
		() => allMainTagOptions.filter((tag) => matchesTagSearch(tag, normalizedTagQuery)),
		[allMainTagOptions, normalizedTagQuery],
	);
	const otherTagOptions = useMemo(
		() => allOtherTagOptions.filter((tag) => matchesTagSearch(tag, normalizedTagQuery)),
		[allOtherTagOptions, normalizedTagQuery],
	);
	const featuredTags = useMemo(
		() =>
			[...allMainTagOptions, ...allOtherTagOptions]
				.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
				.slice(0, 8),
		[allMainTagOptions, allOtherTagOptions],
	);
	const tagLabelMap = useMemo(
		() =>
			new Map(
				[...allMainTagOptions, ...allOtherTagOptions].map((tag) => [
					tag.slug,
					tag.name,
				]),
			),
		[allMainTagOptions, allOtherTagOptions],
	);
	const selectedTagDetails = useMemo(
		() =>
			selectedTags.map((tag) => ({
				label: tagLabelMap.get(tag) ?? tag.replaceAll("-", " "),
				slug: tag,
			})),
		[selectedTags, tagLabelMap],
	);
	const marqueeMainTags =
		allMainTagOptions.length > 0
			? allMainTagOptions.slice(0, 10).map((tag) => tag.name)
			: mainTags.map((tag) => tag.name);
	const marqueeOtherTags =
		allOtherTagOptions.length > 0
			? allOtherTagOptions.slice(0, 14).map((tag) => tag.name)
			: otherTags.map((tag) => tag.name);
	const hasCatalogData = mainTags.length > 0 || otherTags.length > 0;

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										{messages.tag.eyebrow}
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										{messages.tag.title}
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										{messages.tag.description}
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.tag.totalTags}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{allTags.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.tag.selected}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{selectedTags.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.tag.visiblePosts}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{posts.length}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-4 px-4 py-5 sm:px-6">
							<InfiniteScroller
								tags={marqueeMainTags}
								direction="left"
								label={messages.tag.mainTopics}
								description={messages.tag.mainTopicsDescription}
								selectedTags={selectedTags}
								onSelectTag={handleSelectTag}
							/>
							<InfiniteScroller
								tags={marqueeOtherTags}
								direction="right"
								label={messages.tag.supportingTags}
								description={messages.tag.supportingTagsDescription}
								selectedTags={selectedTags}
								onSelectTag={handleSelectTag}
							/>
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<Sidebar
							tagQuery={tagQuery}
							selectedTags={selectedTags}
							featuredTags={featuredTags}
							mainTags={mainTagOptions}
							otherTags={otherTagOptions}
							maxSelectedTags={MAX_SELECTED_TAGS}
							onSelectTag={handleSelectTag}
							onReset={() => updateSelectedTags([])}
							onTagQueryChange={setTagQuery}
						/>

						<div className="space-y-6">
							<SelectedTags
								tags={selectedTagDetails}
								resultsCount={posts.length}
								onRemoveTag={handleRemoveTag}
								onReset={() => updateSelectedTags([])}
							/>

							{isLoading ? (
								<div className="grid gap-4 md:grid-cols-2 xxl:grid-cols-3">
									{Array.from({ length: 6 }, (_, index) => (
										<div
											key={`tag-skeleton-${index}`}
											className="h-[430px] animate-pulse rounded-[26px] border border-zinc-700/50 bg-greyBg/80"
										/>
									))}
								</div>
							) : !hasCatalogData ? (
								<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-lessDarkBg/80 px-6 py-10 text-center shadow-lg shadow-zinc-950/10">
									<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
										{messages.tag.noPostsYet}
									</p>
									<h2 className="mt-3 text-3xl font-somerton uppercase text-wheat">
										{messages.tag.unlockAfterFirstPost}
									</h2>
									<p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
										{messages.tag.tagBrowsingDescription}
									</p>
								</div>
							) : posts.length > 0 ? (
								<div className="grid gap-4 md:grid-cols-2 xxl:grid-cols-3">
									{posts.map((post) => (
										<TagPostCard
											key={post.id}
											post={post}
											onSelectTag={handleSelectTag}
										/>
									))}
								</div>
							) : (
								<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-lessDarkBg/80 px-6 py-10 text-center shadow-lg shadow-zinc-950/10">
									<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
										{messages.tag.noMatches}
									</p>
									<h2 className="mt-3 text-3xl font-somerton uppercase text-wheat">
										{messages.tag.noPostsFit}
									</h2>
									<p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
										{messages.tag.noPostsFitDescription}
									</p>
								</div>
							)}
						</div>
					</div>
				</section>
			</div>
			<Footer />
		</>
	);
}

export default function TagsPage() {
	return (
		<Suspense
			fallback={
				<>
					<div className="min-h-screen bg-darkBg" />
					<Footer />
				</>
			}
		>
			<TagsPageContent />
		</Suspense>
	);
}

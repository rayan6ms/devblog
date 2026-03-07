"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import slugify from "slugify";
import Footer from "@/components/Footer";
import {
	getAllMainTags,
	getAllOtherTags,
	getAllPosts,
	getFilteredPosts,
	type IPost,
} from "../data/posts";
import InfiniteScroller from "./InfiniteScroller";
import SelectedTags from "./SelectedTags";
import Sidebar, { type TagOption } from "./Sidebar";

const MAX_SELECTED_TAGS = 5;
const mainTags = getAllMainTags().sort((a, b) => a.localeCompare(b));
const otherTags = getAllOtherTags().sort((a, b) => a.localeCompare(b));
const allTags = Array.from(new Set([...mainTags, ...otherTags])).sort((a, b) =>
	a.localeCompare(b),
);
const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

function normalizeTagValue(value: string) {
	return slugify(value, { lower: true, strict: true });
}

function isValidTag(tag: string) {
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

function buildTagOptions(tags: string[], tagCounts: Map<string, number>) {
	return tags
		.map((tag) => ({
			count: tagCounts.get(normalizeTagValue(tag)) ?? 0,
			name: tag,
			slug: normalizeTagValue(tag),
		}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function TagPostCard({
	post,
	onSelectTag,
}: {
	post: IPost;
	onSelectTag: (tag: string) => void;
}) {
	const postHref = `/post/${slugify(post.title, { lower: true, strict: true })}`;

	return (
		<article className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-zinc-700/50 bg-greyBg/90 shadow-lg shadow-zinc-950/20 transition-colors hover:border-zinc-500/70">
			<Link href={postHref} className="relative block aspect-[16/10] overflow-hidden">
				<Image
					fill
					src={post.image}
					alt={post.title}
					className="object-cover transition-transform duration-700 group-hover:scale-105"
					sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
				/>
			</Link>

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
						{formatViews(post.views)} views
					</span>
				</div>

				<Link href={postHref} className="mt-4 block">
					<h3 className="text-xl font-semibold leading-8 text-wheat transition-colors group-hover:text-zinc-100">
						{post.title}
					</h3>
				</Link>

				<p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
					{post.description}
				</p>

				<div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
					<span>{post.author}</span>
					<span className="h-1 w-1 rounded-full bg-zinc-700" />
					<time dateTime={post.date}>{dateFormatter.format(new Date(post.date))}</time>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{post.tags.slice(0, 4).map((tag) => (
						<button
							key={tag}
							type="button"
							className="rounded-full border border-zinc-700/60 bg-darkBg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-wheat"
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
	const router = useRouter();
	const searchParams = useSearchParams();
	const [allPostsData, setAllPostsData] = useState<IPost[]>([]);
	const [posts, setPosts] = useState<IPost[]>([]);
	const [tagQuery, setTagQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const deferredTagQuery = useDeferredValue(tagQuery);
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
				if (!isValidTag(tag) || uniqueTags.has(tag)) {
					return false;
				}

				uniqueTags.add(tag);
				return true;
			})
			.slice(0, MAX_SELECTED_TAGS);
	}, [searchParams]);
	const selectedTagsKey = selectedTags.join(",");

	const updateSelectedTags = (nextTags: string[]) => {
		router.push(
			nextTags.length > 0 ? `/tag?selected=${nextTags.join(",")}` : "/tag",
			{ scroll: false },
		);
	};

	const handleSelectTag = (tag: string) => {
		const nextTag = normalizeTagValue(tag);

		if (!isValidTag(nextTag) || selectedTags.includes(nextTag)) {
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

			const [allPosts, visiblePosts] = await Promise.all([
				getAllPosts(),
				selectedTags.length > 0 ? getFilteredPosts(selectedTags) : getAllPosts(),
			]);

			if (!active) {
				return;
			}

			setAllPostsData(allPosts);
			setPosts(visiblePosts);
			setIsLoading(false);
		}

		void loadPosts();

		return () => {
			active = false;
		};
	}, [selectedTags, selectedTagsKey]);

	const tagCounts = useMemo(() => {
		const counts = new Map<string, number>();

		allPostsData.forEach((post) => {
			const uniquePostTags = new Set(
				[post.mainTag, ...post.tags].map((tag) => normalizeTagValue(tag)),
			);

			uniquePostTags.forEach((tag) => {
				counts.set(tag, (counts.get(tag) ?? 0) + 1);
			});
		});

		return counts;
	}, [allPostsData]);

	const allMainTagOptions = useMemo(
		() => buildTagOptions(mainTags, tagCounts),
		[tagCounts],
	);
	const allOtherTagOptions = useMemo(
		() => buildTagOptions(otherTags, tagCounts),
		[tagCounts],
	);
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
			: mainTags;
	const marqueeOtherTags =
		allOtherTagOptions.length > 0
			? allOtherTagOptions.slice(0, 14).map((tag) => tag.name)
			: otherTags;

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										Browse by tag
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										Discover posts by topic
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										The tag page should help you narrow down the archive fast.
										Pick a main topic, layer a few supporting tags, and keep the
										results grid in view while you refine.
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Total tags
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{allTags.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Selected
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{selectedTags.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Visible posts
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
								label="Main topics"
								description="The broad categories that shape each post."
								selectedTags={selectedTags}
								onSelectTag={handleSelectTag}
							/>
							<InfiniteScroller
								tags={marqueeOtherTags}
								direction="right"
								label="Supporting tags"
								description="Use these to narrow the grid without losing context."
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
							) : posts.length > 0 ? (
								<div className="grid gap-4 md:grid-cols-2 xxl:grid-cols-3">
									{posts.map((post) => (
										<TagPostCard
											key={post.title}
											post={post}
											onSelectTag={handleSelectTag}
										/>
									))}
								</div>
							) : (
								<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-lessDarkBg/80 px-6 py-10 text-center shadow-lg shadow-zinc-950/10">
									<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
										No matches
									</p>
									<h2 className="mt-3 text-3xl font-somerton uppercase text-wheat">
										No posts fit this combination
									</h2>
									<p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
										Try removing one of the active tags or switch to a broader
										main topic. The quick picks in the filter panel are a good
										reset point.
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

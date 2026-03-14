"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaEye } from "react-icons/fa6";
import slugify from "slugify";
import Footer from "@/components/Footer";
import { getAllPosts, type IPost } from "@/data/posts";
import Skeleton from "./Skeleton";

const Accordion = dynamic(() => import("@/trending/Accordion"), { ssr: false });

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

function formatViews(views: number) {
	return views >= 1000 ? `${(views / 1000).toFixed(1)}k` : `${views}`;
}

function normalizeTag(tag: string) {
	return slugify(tag, { lower: true, strict: true });
}

function sortByTrending(posts: IPost[]) {
	return [...posts].sort((a, b) => b.views - a.views || b.date.localeCompare(a.date));
}

function TopicPill({
	label,
	count,
}: {
	label: string;
	count: number;
}) {
	return (
		<Link
			href={`/tag?selected=${normalizeTag(label)}`}
			className="flex items-center justify-between rounded-2xl border border-zinc-700/50 bg-greyBg/80 px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
		>
			<span>{label}</span>
			<span className="rounded-full bg-darkBg px-2 py-1 text-xs text-zinc-500">
				{count}
			</span>
		</Link>
	);
}

function RankedPostRow({
	post,
	index,
}: {
	post: IPost;
	index: number;
}) {
	const postHref = `/post/${normalizeTag(post.title)}`;

	return (
		<article className="grid gap-4 rounded-[24px] border border-zinc-700/50 bg-greyBg/85 p-4 shadow-lg shadow-zinc-950/10 sm:grid-cols-[auto_112px_1fr] sm:items-center">
			<div className="flex items-center gap-3">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purpleContrast/40 bg-purpleContrast/15 text-sm font-semibold text-wheat">
					{index + 1}
				</span>
				<div className="sm:hidden">
					<Link
						href={`/tag?selected=${normalizeTag(post.mainTag)}`}
						className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
					>
						{post.mainTag}
					</Link>
				</div>
			</div>

			<Link
				href={postHref}
				className="relative block aspect-[7/5] overflow-hidden rounded-2xl"
			>
				<Image
					fill
					src={post.image}
					alt={post.title}
					className="object-cover transition-transform duration-700 hover:scale-105"
					sizes="112px"
				/>
			</Link>

			<div className="min-w-0">
				<div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3">
					<Link
						href={`/tag?selected=${normalizeTag(post.mainTag)}`}
						className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
					>
						{post.mainTag}
					</Link>
					<span className="flex items-center gap-1 text-sm text-zinc-400">
						<FaEye />
						{formatViews(post.views)}
					</span>
				</div>

				<Link href={postHref} className="mt-2 block">
					<h3 className="line-clamp-2 text-lg font-semibold text-wheat transition-colors hover:text-zinc-100">
						{post.title}
					</h3>
				</Link>

				<p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
					{post.description}
				</p>

				<div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
					<Link
						href={`/profile/${normalizeTag(post.author)}`}
						className="transition-colors hover:text-wheat"
					>
						{post.author}
					</Link>
					<span className="h-1 w-1 rounded-full bg-zinc-700" />
					<time dateTime={post.date}>{dateFormatter.format(new Date(post.date))}</time>
					<span className="flex items-center gap-1 sm:hidden">
						<FaEye />
						{formatViews(post.views)}
					</span>
				</div>
			</div>
		</article>
	);
}

function SpotlightPostCard({ post }: { post: IPost }) {
	const postHref = `/post/${normalizeTag(post.title)}`;

	return (
		<article className="overflow-hidden rounded-[26px] border border-zinc-700/50 bg-greyBg/90 shadow-lg shadow-zinc-950/20">
			<Link href={postHref} className="relative block aspect-[16/10] overflow-hidden">
				<Image
					fill
					src={post.image}
					alt={post.title}
					className="object-cover transition-transform duration-700 hover:scale-105"
					sizes="(max-width: 1024px) 100vw, 50vw"
				/>
			</Link>
			<div className="p-5">
				<div className="flex items-center justify-between gap-3">
					<Link
						href={`/tag?selected=${normalizeTag(post.mainTag)}`}
						className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
					>
						{post.mainTag}
					</Link>
					<span className="flex items-center gap-1 text-sm text-zinc-400">
						<FaEye />
						{formatViews(post.views)}
					</span>
				</div>
				<Link href={postHref} className="mt-3 block">
					<h3 className="line-clamp-2 text-xl font-semibold text-wheat transition-colors hover:text-zinc-100">
						{post.title}
					</h3>
				</Link>
				<p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
					{post.description}
				</p>
				<div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
					<Link
						href={`/profile/${normalizeTag(post.author)}`}
						className="transition-colors hover:text-wheat"
					>
						{post.author}
					</Link>
					<span className="h-1 w-1 rounded-full bg-zinc-700" />
					<time dateTime={post.date}>{dateFormatter.format(new Date(post.date))}</time>
				</div>
			</div>
		</article>
	);
}

export default function TrendingPage() {
	const [loading, setLoading] = useState(true);
	const [posts, setPosts] = useState<IPost[]>([]);

	useEffect(() => {
		let active = true;

		async function loadPosts() {
			const allPosts = await getAllPosts();

			if (!active) {
				return;
			}

			setPosts(sortByTrending(allPosts));
			setLoading(false);
		}

		void loadPosts();

		return () => {
			active = false;
		};
	}, []);

	const accordionPosts = useMemo(() => posts.slice(0, 8), [posts]);
	const rankedPosts = useMemo(() => posts.slice(0, 12), [posts]);
	const spotlightPosts = useMemo(() => posts.slice(12, 18), [posts]);
	const totalViews = useMemo(
		() => posts.reduce((sum, post) => sum + post.views, 0),
		[posts],
	);
	const topTopics = useMemo(() => {
		const counts = new Map<string, number>();

		posts.forEach((post) => {
			counts.set(post.mainTag, (counts.get(post.mainTag) ?? 0) + 1);
		});

		return [...counts.entries()]
			.map(([label, count]) => ({ count, label }))
			.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
			.slice(0, 8);
	}, [posts]);
	const leadingPost = posts[0];

	return loading ? (
		<Skeleton />
	) : (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										Trending now
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										What readers are paying attention to
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										The accordion stays as the page signature, but the rest of
										the page now supports it: ranked posts, visible topic signals,
										and clearer reasons for why a post is near the top.
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Tracked posts
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{posts.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Top post
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{leadingPost ? formatViews(leadingPost.views) : "0"}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Total views
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{formatViews(totalViews)}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="px-4 py-5 sm:px-6">
							<Accordion posts={accordionPosts} />
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<aside className="self-start rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20 xl:sticky xl:top-24">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								Trend signals
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								Topic radar
							</h2>
							<p className="mt-2 text-sm leading-6 text-zinc-400">
								Main topics with the strongest presence in the current trending
								stack. Use them to branch into related posts without losing the
								context of what is hot right now.
							</p>

							<div className="mt-6 space-y-3">
								{topTopics.map((topic) => (
									<TopicPill
										key={topic.label}
										label={topic.label}
										count={topic.count}
									/>
								))}
							</div>

							{leadingPost && (
								<div className="mt-6 rounded-2xl border border-zinc-700/50 bg-greyBg/75 p-4">
									<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
										Leading post
									</p>
									<Link
										href={`/post/${normalizeTag(leadingPost.title)}`}
										className="mt-3 block text-lg font-semibold text-wheat transition-colors hover:text-zinc-100"
									>
										{leadingPost.title}
									</Link>
									<div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
										<span>{leadingPost.author}</span>
										<span className="h-1 w-1 rounded-full bg-zinc-700" />
										<span>{formatViews(leadingPost.views)} views</span>
									</div>
								</div>
							)}
						</aside>

						<div className="space-y-6">
							<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
									<div>
										<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
											Ranking
										</p>
										<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
											Top posts by momentum
										</h2>
										<p className="mt-2 text-sm leading-6 text-zinc-400">
											The most-read posts right now, ordered by views so the list
											actually reflects a trend instead of a random sample.
										</p>
									</div>
								</div>

								<div className="mt-6 grid gap-4">
									{rankedPosts.map((post, index) => (
										<RankedPostRow
											key={`${post.title}-${post.author}-${index}`}
											post={post}
											index={index}
										/>
									))}
								</div>
							</section>

							<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
								<div>
									<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
										More to watch
									</p>
									<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
										Rising posts
									</h2>
									<p className="mt-2 text-sm leading-6 text-zinc-400">
										Posts just below the top tier that still deserve a clear,
										readable presentation instead of another dense list.
									</p>
								</div>

								<div className="mt-6 grid gap-4 lg:grid-cols-2">
									{spotlightPosts.map((post) => (
										<SpotlightPostCard
											key={`${post.title}-${post.author}-spotlight`}
											post={post}
										/>
									))}
								</div>
							</section>
						</div>
					</div>
				</section>
			</div>
			<Footer />
		</>
	);
}

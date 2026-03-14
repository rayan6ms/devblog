"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaEye } from "react-icons/fa6";
import slugify from "slugify";
import Footer from "@/components/Footer";
import { getAllPosts, type IPost } from "@/data/posts";
import Skeleton from "./Skeleton";

const ITEMS_PER_PAGE = 12;
const MAX_PAGE_BUTTONS = 5;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

function normalizeValue(value: string) {
	return slugify(value, { lower: true, strict: true });
}

function formatViews(views: number) {
	return views >= 1000 ? `${(views / 1000).toFixed(1)}k` : `${views}`;
}

function sortByRecency(posts: IPost[]) {
	return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

function getPaginationRange(currentPage: number, totalPages: number) {
	const half = Math.floor(MAX_PAGE_BUTTONS / 2);
	const start = Math.max(
		1,
		Math.min(currentPage - half, totalPages - MAX_PAGE_BUTTONS + 1),
	);
	const end = Math.min(totalPages, start + MAX_PAGE_BUTTONS - 1);

	return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function PaginationControls({
	currentPage,
	totalPages,
	onPageChange,
}: {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}) {
	if (totalPages <= 1) {
		return null;
	}

	const pages = getPaginationRange(currentPage, totalPages);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage === 1}
				className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat disabled:cursor-not-allowed disabled:opacity-45"
			>
				<FaArrowLeft className="text-xs" />
				Previous
			</button>

			<div className="flex flex-wrap gap-2">
				{pages.map((page) => (
					<button
						key={page}
						type="button"
						onClick={() => onPageChange(page)}
						className={`h-10 min-w-10 rounded-full border px-3 text-sm font-semibold transition-colors ${
							page === currentPage
								? "border-purpleContrast/50 bg-purpleContrast/15 text-wheat"
								: "border-zinc-700/60 bg-greyBg text-zinc-300 hover:border-zinc-500 hover:text-wheat"
						}`}
					>
						{page}
					</button>
				))}
			</div>

			<button
				type="button"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage === totalPages}
				className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat disabled:cursor-not-allowed disabled:opacity-45"
			>
				Next
				<FaArrowRight className="text-xs" />
			</button>
		</div>
	);
}

function RecentPostCard({ post }: { post: IPost }) {
	const postHref = `/post/${normalizeValue(post.title)}`;

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
					<div>
						<time
							dateTime={post.date}
							className="text-xs uppercase tracking-[0.18em] text-zinc-500"
						>
							{dateFormatter.format(new Date(post.date))}
						</time>
						<Link
							href={`/tag?selected=${normalizeValue(post.mainTag)}`}
							className="mt-2 block text-xs uppercase tracking-[0.16em] text-zinc-400 transition-colors hover:text-wheat"
						>
							{post.mainTag}
						</Link>
					</div>
					<span className="flex items-center gap-1 text-sm text-zinc-400">
						<FaEye />
						{formatViews(post.views)}
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
					<Link
						href={`/profile/${normalizeValue(post.author)}`}
						className="transition-colors hover:text-wheat"
					>
						{post.author}
					</Link>
					<span className="h-1 w-1 rounded-full bg-zinc-700" />
					<span>{post.tags.length} related tags</span>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{post.tags.slice(0, 4).map((tag) => (
						<Link
							key={tag}
							href={`/tag?selected=${normalizeValue(tag)}`}
							className="rounded-full border border-zinc-700/60 bg-darkBg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-wheat"
						>
							{tag}
						</Link>
					))}
				</div>
			</div>
		</article>
	);
}

function RecentPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [posts, setPosts] = useState<IPost[]>([]);
	const [loading, setLoading] = useState(true);
	const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
	const currentPage = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);

	useEffect(() => {
		let active = true;

		async function loadPosts() {
			const allPosts = await getAllPosts();

			if (!active) {
				return;
			}

			setPosts(sortByRecency(allPosts));
			setLoading(false);
		}

		void loadPosts();

		return () => {
			active = false;
		};
	}, []);

	const totalPages = Math.max(1, Math.ceil(posts.length / ITEMS_PER_PAGE));
	const safeCurrentPage = Math.min(currentPage, totalPages);
	const pageStart = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
	const pageEnd = Math.min(pageStart + ITEMS_PER_PAGE, posts.length);
	const visiblePosts = posts.slice(pageStart, pageEnd);
	const newestPost = posts[0];
	const totalViews = useMemo(
		() => posts.reduce((sum, post) => sum + post.views, 0),
		[posts],
	);
	const recentTopics = useMemo(() => {
		const counts = new Map<string, number>();

		posts.slice(0, 18).forEach((post) => {
			counts.set(post.mainTag, (counts.get(post.mainTag) ?? 0) + 1);
		});

		return [...counts.entries()]
			.map(([label, count]) => ({ count, label }))
			.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
			.slice(0, 6);
	}, [posts]);

	useEffect(() => {
		if (currentPage === safeCurrentPage) {
			return;
		}

		const params = new URLSearchParams(searchParams.toString());
		params.set("page", String(safeCurrentPage));
		router.replace(`?${params.toString()}`, { scroll: false });
	}, [currentPage, router, safeCurrentPage, searchParams]);

	const handlePageChange = (page: number) => {
		if (page < 1 || page > totalPages || page === safeCurrentPage) {
			return;
		}

		const params = new URLSearchParams(searchParams.toString());
		params.set("page", String(page));
		router.push(`?${params.toString()}`);
	};

	if (loading) {
		return <Skeleton />;
	}

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										Latest posts
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										The newest posts, in order
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										This page is the clearest view of the blog in publishing
										order. It keeps the newest writing front and center, with
										pagination and topic cues close by when you want to keep
										browsing.
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Post count
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{posts.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Current page
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{safeCurrentPage}/{totalPages}
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

						{newestPost && (
							<div className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
								<Link
									href={`/post/${normalizeValue(newestPost.title)}`}
									className="relative block aspect-[16/10] overflow-hidden rounded-[26px]"
								>
									<Image
										fill
										src={newestPost.image}
										alt={newestPost.title}
										className="object-cover transition-transform duration-700 hover:scale-105"
										sizes="(max-width: 1024px) 100vw, 60vw"
									/>
								</Link>

								<div className="rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-5">
									<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
										Latest arrival
									</p>
									<Link
										href={`/tag?selected=${normalizeValue(newestPost.mainTag)}`}
										className="mt-3 inline-flex rounded-full border border-zinc-700/60 bg-darkBg px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
									>
										{newestPost.mainTag}
									</Link>
									<Link
										href={`/post/${normalizeValue(newestPost.title)}`}
										className="mt-4 block text-2xl font-semibold text-wheat transition-colors hover:text-zinc-100"
									>
										{newestPost.title}
									</Link>
									<p className="mt-3 line-clamp-4 text-sm leading-7 text-zinc-400">
										{newestPost.description}
									</p>
									<div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
										<Link
											href={`/profile/${normalizeValue(newestPost.author)}`}
											className="transition-colors hover:text-wheat"
										>
											{newestPost.author}
										</Link>
										<span className="h-1 w-1 rounded-full bg-zinc-700" />
										<time dateTime={newestPost.date}>
											{dateFormatter.format(new Date(newestPost.date))}
										</time>
										<span className="h-1 w-1 rounded-full bg-zinc-700" />
										<span className="flex items-center gap-1">
											<FaEye />
											{formatViews(newestPost.views)}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<aside className="self-start rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20 xl:sticky xl:top-24">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								Reading guide
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								Stay oriented
							</h2>
							<p className="mt-2 text-sm leading-6 text-zinc-400">
								Move through the blog page by page, keep an eye on the newest
								entry, and jump into the topics showing up most often in the
								latest batch of posts.
							</p>

							<div className="mt-6 rounded-2xl border border-zinc-700/50 bg-greyBg/75 p-4">
								<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
									Showing now
								</p>
								<p className="mt-2 text-lg font-semibold text-wheat">
									Posts {pageStart + 1}-{pageEnd} of {posts.length}
								</p>
								<p className="mt-2 text-sm text-zinc-500">
									Page {safeCurrentPage} of {totalPages}
								</p>
							</div>

							<div className="mt-6">
								<p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">
									Page controls
								</p>
								<div className="mt-3">
									<PaginationControls
										currentPage={safeCurrentPage}
										totalPages={totalPages}
										onPageChange={handlePageChange}
									/>
								</div>
							</div>

							<div className="mt-6">
								<p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">
									Fresh topics
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									{recentTopics.map((topic) => (
										<Link
											key={topic.label}
											href={`/tag?selected=${normalizeValue(topic.label)}`}
											className="rounded-full border border-zinc-700/60 bg-greyBg px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
										>
											{topic.label}
											<span className="ml-2 text-zinc-500">{topic.count}</span>
										</Link>
									))}
								</div>
							</div>
						</aside>

						<div className="space-y-6">
							<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
								<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
									<div>
										<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
											Recent posts
										</p>
										<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
											Newest entries on devblog
										</h2>
										<p className="mt-2 text-sm leading-6 text-zinc-400">
											Ordered strictly by publish date so the page behaves like a
											true recent-post feed, not a mixed grab bag.
										</p>
									</div>

									<PaginationControls
										currentPage={safeCurrentPage}
										totalPages={totalPages}
										onPageChange={handlePageChange}
									/>
								</div>

								<div className="mt-6 grid gap-4 md:grid-cols-2 xxl:grid-cols-3">
									{visiblePosts.map((post) => (
										<RecentPostCard
											key={`${post.title}-${post.author}-${post.date}`}
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

export default function RecentPage() {
	return (
		<Suspense
			fallback={
				<Skeleton />
			}
		>
			<RecentPageContent />
		</Suspense>
	);
}

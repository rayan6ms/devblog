"use client";

import Image from "next/image";
import { useMemo } from "react";
import { FaArrowLeft, FaArrowRight, FaEye } from "react-icons/fa6";
import slugify from "slugify";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getIntlLocale } from "@/lib/i18n";
import { getAuthorHref, getPostHref, type IPost } from "@/lib/posts-client";

const MAX_PAGE_BUTTONS = 5;

function normalizeValue(value: string) {
	return slugify(value, { lower: true, strict: true });
}

function formatViews(views: number) {
	return views >= 1000 ? `${(views / 1000).toFixed(1)}k` : `${views}`;
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
	const { messages } = useI18n();
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
				{messages.common.previous}
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
				{messages.common.next}
				<FaArrowRight className="text-xs" />
			</button>
		</div>
	);
}

function RecentPostCard({ post }: { post: IPost }) {
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
					<div>
						<time
							dateTime={post.date}
							className="text-xs uppercase tracking-[0.18em] text-zinc-500"
						>
							{dateFormatter.format(new Date(post.date))}
						</time>
						<LocalizedLink
							href={`/tag?selected=${normalizeValue(post.mainTag)}`}
							className="mt-2 block text-xs uppercase tracking-[0.16em] text-zinc-400 transition-colors hover:text-wheat"
						>
							{post.mainTag}
						</LocalizedLink>
					</div>
					<span className="flex items-center gap-1 text-sm text-zinc-400">
						<FaEye />
						{formatViews(post.views)}
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
					<span>{messages.recent.relatedTags(post.tags.length)}</span>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{post.tags.slice(0, 4).map((tag) => (
						<LocalizedLink
							key={tag}
							href={`/tag?selected=${normalizeValue(tag)}`}
							className="capitalize rounded-full border border-zinc-700/60 bg-darkBg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-wheat"
						>
							{tag}
						</LocalizedLink>
					))}
				</div>
			</div>
		</article>
	);
}

export default function RecentPageClient({
	currentPage,
	newestPost,
	posts,
	recentTopics,
	startIndex,
	totalPages,
	totalPosts,
	totalViews,
}: {
	currentPage: number;
	newestPost: IPost | null;
	posts: IPost[];
	recentTopics: Array<{ count: number; label: string }>;
	startIndex: number;
	totalPages: number;
	totalPosts: number;
	totalViews: number;
}) {
	const { locale, messages } = useI18n();
	const { push } = useLocaleNavigation();
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(getIntlLocale(locale), {
				month: "short",
				day: "numeric",
				year: "numeric",
			}),
		[locale],
	);
	const pageStart = totalPosts > 0 ? startIndex + 1 : 0;
	const pageEnd = startIndex + posts.length;
	const visibleRangeLabel =
		totalPosts > 0
			? messages.recent.visibleRange(pageStart, pageEnd, totalPosts)
			: messages.recent.noPublishedShort;

	const handlePageChange = (page: number) => {
		if (page < 1 || page > totalPages || page === currentPage) {
			return;
		}

		push(`/recent?page=${page}`);
	};

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										{messages.recent.eyebrow}
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										{messages.recent.title}
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										{messages.recent.description}
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.recent.postCount}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{totalPosts}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.recent.currentPage}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{currentPage}/{totalPages}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.recent.totalViews}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{formatViews(totalViews)}
										</p>
									</div>
								</div>
							</div>
						</div>

						{newestPost ? (
							<div className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
								<LocalizedLink
									href={getPostHref(newestPost)}
									className="relative block aspect-[16/10] overflow-hidden rounded-[26px]"
								>
									<Image
										fill
										src={newestPost.image}
										alt={newestPost.imageAlt}
										className="object-cover transition-transform duration-700 hover:scale-105"
										sizes="(max-width: 1024px) 100vw, 60vw"
									/>
								</LocalizedLink>

								<div className="rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-5">
									<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
										{messages.recent.latestArrival}
									</p>
									<LocalizedLink
										href={`/tag?selected=${normalizeValue(newestPost.mainTag)}`}
										className="mt-3 inline-flex rounded-full border border-zinc-700/60 bg-darkBg px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
									>
										{newestPost.mainTag}
									</LocalizedLink>
									<LocalizedLink
										href={getPostHref(newestPost)}
										className="mt-4 block text-2xl font-semibold text-wheat transition-colors hover:text-zinc-100"
									>
										{newestPost.title}
									</LocalizedLink>
									<p className="mt-3 line-clamp-4 text-sm leading-7 text-zinc-400">
										{newestPost.description}
									</p>
									<div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
										<LocalizedLink
											href={getAuthorHref(newestPost)}
											className="transition-colors hover:text-wheat"
										>
											{newestPost.author}
										</LocalizedLink>
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
						) : (
							<div className="px-4 py-5 sm:px-6">
								<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-greyBg/60 px-6 py-10 text-center text-sm leading-7 text-zinc-400">
									{messages.recent.noPublished}
								</div>
							</div>
						)}
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<aside className="self-start rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20 xl:sticky xl:top-24">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								{messages.recent.readingGuide}
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								{messages.recent.stayOriented}
							</h2>
							<p className="mt-2 text-sm leading-6 text-zinc-400">
								{messages.recent.stayOrientedDescription}
							</p>

							<div className="mt-6 rounded-2xl border border-zinc-700/50 bg-greyBg/75 p-4">
								<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
									{messages.recent.showingNow}
								</p>
								<p className="mt-2 text-lg font-semibold text-wheat">
									{visibleRangeLabel}
								</p>
								<p className="mt-2 text-sm text-zinc-500">
									{messages.recent.pageOf(currentPage, totalPages)}
								</p>
							</div>

							<div className="mt-6">
								<p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">
									{messages.recent.pageControls}
								</p>
								<div className="mt-3">
									<PaginationControls
										currentPage={currentPage}
										totalPages={totalPages}
										onPageChange={handlePageChange}
									/>
								</div>
							</div>

							<div className="mt-6">
								<p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">
									{messages.recent.freshTopics}
								</p>
								{recentTopics.length > 0 ? (
									<div className="mt-3 flex flex-wrap gap-2">
										{recentTopics.map((topic) => (
											<LocalizedLink
												key={topic.label}
												href={`/tag?selected=${normalizeValue(topic.label)}`}
												className="capitalize rounded-full border border-zinc-700/60 bg-greyBg px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
											>
												{topic.label}
												<span className="ml-2 text-zinc-500">
													{topic.count}
												</span>
											</LocalizedLink>
										))}
									</div>
								) : (
									<p className="mt-3 text-sm text-zinc-500">
										{messages.recent.topicCountsLater}
									</p>
								)}
							</div>
						</aside>

						<div className="space-y-6">
							<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
								<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
									<div>
										<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
											{messages.recent.recentPosts}
										</p>
										<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
											{messages.recent.recentPostsTitle}
										</h2>
										<p className="mt-2 text-sm leading-6 text-zinc-400">
											{messages.recent.recentPostsDescription}
										</p>
									</div>

									<PaginationControls
										currentPage={currentPage}
										totalPages={totalPages}
										onPageChange={handlePageChange}
									/>
								</div>

								{posts.length > 0 ? (
									<div className="mt-6 grid gap-4 md:grid-cols-2 xxl:grid-cols-3">
										{posts.map((post) => (
											<RecentPostCard key={post.id} post={post} />
										))}
									</div>
								) : (
									<div className="mt-6 rounded-[24px] border border-dashed border-zinc-700/60 bg-greyBg/55 px-6 py-10 text-center text-sm leading-7 text-zinc-400">
										{messages.recent.noPosts}
									</div>
								)}
							</section>
						</div>
					</div>
				</section>
			</div>
			<Footer />
		</>
	);
}

"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FaEye } from "react-icons/fa6";
import slugify from "slugify";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { getIntlLocale } from "@/lib/i18n";
import {
	getAuthorHref,
	getPostHref,
	getTrendingPosts,
	type IPost,
} from "@/lib/posts-client";
import Skeleton from "./Skeleton";

const Accordion = dynamic(() => import("@/trending/Accordion"), { ssr: false });

function formatViews(views: number) {
	return views >= 1000 ? `${(views / 1000).toFixed(1)}k` : `${views}`;
}

function normalizeTag(tag: string) {
	return slugify(tag, { lower: true, strict: true });
}

function formatTagLabel(tag: string) {
	if (!tag) {
		return tag;
	}

	return `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`;
}

function TopicPill({ label, count }: { label: string; count: number }) {
	const { messages } = useI18n();
	return (
		<LocalizedLink
			href={`/tag?selected=${normalizeTag(label)}`}
			className="flex items-center justify-between rounded-2xl border border-zinc-700/50 bg-greyBg/80 px-4 py-3 text-sm text-zinc-300 font-semibold transition-colors hover:border-zinc-500 hover:text-wheat"
		>
			<span>{formatTagLabel(label)}</span>
			<span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-darkBg/70 px-2.5 text-xs text-zinc-400">
				{count}
			</span>
		</LocalizedLink>
	);
}

function RankedPostRow({ post, index }: { post: IPost; index: number }) {
	const { locale } = useI18n();
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
		<article className="grid gap-4 rounded-[24px] border border-zinc-700/50 bg-greyBg/85 p-4 shadow-lg shadow-zinc-950/10 sm:grid-cols-[auto_112px_1fr] sm:items-center">
			<div className="flex items-center gap-3">
				<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-purpleContrast/30 bg-purpleContrast/15 px-2 text-sm font-semibold text-zinc-100 shadow-lg shadow-zinc-950/20">
					{index + 1}
				</span>
				<div className="sm:hidden">
					<LocalizedLink
						href={`/tag?selected=${normalizeTag(post.mainTag)}`}
						className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
					>
						{post.mainTag}
					</LocalizedLink>
				</div>
			</div>

			<LocalizedLink
				href={postHref}
				className="relative block aspect-[7/5] overflow-hidden rounded-2xl"
			>
				<Image
					fill
					src={post.image}
					alt={post.imageAlt}
					className="object-cover transition-transform duration-700 hover:scale-105"
					sizes="112px"
				/>
			</LocalizedLink>

			<div className="min-w-0">
				<div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-3">
					<LocalizedLink
						href={`/tag?selected=${normalizeTag(post.mainTag)}`}
						className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
					>
						{post.mainTag}
					</LocalizedLink>
					<span className="flex items-center gap-1 text-sm text-zinc-400">
						<FaEye />
						{formatViews(post.views)}
					</span>
				</div>

				<LocalizedLink href={postHref} className="mt-2 block">
					<h3 className="line-clamp-2 text-lg font-semibold text-wheat transition-colors hover:text-zinc-100">
						{post.title}
					</h3>
				</LocalizedLink>

				<p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
					{post.description}
				</p>

				<div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
					<LocalizedLink
						href={getAuthorHref(post)}
						className="transition-colors hover:text-wheat"
					>
						{post.author}
					</LocalizedLink>
					<span className="h-1 w-1 rounded-full bg-zinc-700" />
					<time dateTime={post.date}>
						{dateFormatter.format(new Date(post.date))}
					</time>
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
	const { locale } = useI18n();
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
		<article className="overflow-hidden rounded-[26px] border border-zinc-700/50 bg-greyBg/90 shadow-lg shadow-zinc-950/20">
			<LocalizedLink
				href={postHref}
				className="relative block aspect-[16/10] overflow-hidden"
			>
				<Image
					fill
					src={post.image}
					alt={post.imageAlt}
					className="object-cover transition-transform duration-700 hover:scale-105"
					sizes="(max-width: 1024px) 100vw, 50vw"
				/>
			</LocalizedLink>
			<div className="p-5">
				<div className="flex items-center justify-between gap-3">
					<LocalizedLink
						href={`/tag?selected=${normalizeTag(post.mainTag)}`}
						className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
					>
						{post.mainTag}
					</LocalizedLink>
					<span className="flex items-center gap-1 text-sm text-zinc-400">
						<FaEye />
						{formatViews(post.views)}
					</span>
				</div>
				<LocalizedLink href={postHref} className="mt-3 block">
					<h3 className="line-clamp-2 text-xl font-semibold text-wheat transition-colors hover:text-zinc-100">
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
					<time dateTime={post.date}>
						{dateFormatter.format(new Date(post.date))}
					</time>
				</div>
			</div>
		</article>
	);
}

export default function TrendingPage() {
	const { messages } = useI18n();
	const [loading, setLoading] = useState(true);
	const [posts, setPosts] = useState<IPost[]>([]);

	useEffect(() => {
		let active = true;

		async function loadPosts() {
			const allPosts = await getTrendingPosts();

			if (!active) {
				return;
			}

			setPosts(allPosts);
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
										{messages.trending.eyebrow}
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										{messages.trending.title}
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										{messages.trending.description}
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.trending.trackedPosts}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{posts.length}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.trending.topPost}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{leadingPost ? formatViews(leadingPost.views) : "0"}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.trending.totalViews}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{formatViews(totalViews)}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="px-4 py-5 sm:px-6">
							{accordionPosts.length > 0 ? (
								<Accordion posts={accordionPosts} />
							) : (
								<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-greyBg/60 px-6 py-10 text-center text-sm leading-7 text-zinc-400">
									{messages.trending.noTrending}
								</div>
							)}
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<aside className="self-start rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20 xl:sticky xl:top-24">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								{messages.trending.trendSignals}
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								{messages.trending.topicRadar}
							</h2>
							<p className="mt-2 text-sm leading-6 text-zinc-400">
								{messages.trending.topicRadarDescription}
							</p>

							{topTopics.length > 0 ? (
								<div className="mt-6 space-y-3">
									{topTopics.map((topic) => (
										<TopicPill
											key={topic.label}
											label={topic.label}
											count={topic.count}
										/>
									))}
								</div>
							) : (
								<p className="mt-6 text-sm text-zinc-500">
									{messages.trending.topicSignalsLater}
								</p>
							)}

							{leadingPost ? (
								<div className="mt-6 rounded-2xl border border-zinc-700/50 bg-greyBg/75 p-4">
									<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
										{messages.trending.leadingPost}
									</p>
									<LocalizedLink
										href={getPostHref(leadingPost)}
										className="mt-3 block text-lg font-semibold text-wheat transition-colors hover:text-zinc-100"
									>
										{leadingPost.title}
									</LocalizedLink>
									<div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
										<span>{leadingPost.author}</span>
										<span className="h-1 w-1 rounded-full bg-zinc-700" />
										<span>
											{messages.trending.viewsSuffix(
												formatViews(leadingPost.views),
											)}
										</span>
									</div>
								</div>
							) : (
								<div className="mt-6 rounded-2xl border border-dashed border-zinc-700/60 bg-greyBg/55 p-4 text-sm leading-7 text-zinc-400">
									{messages.trending.leadingPostEmpty}
								</div>
							)}
						</aside>

						<div className="space-y-6">
							<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
									<div>
										<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
											{messages.trending.ranking}
										</p>
										<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
											{messages.trending.topMomentum}
										</h2>
										<p className="mt-2 text-sm leading-6 text-zinc-400">
											{messages.trending.topMomentumDescription}
										</p>
									</div>
								</div>

								{rankedPosts.length > 0 ? (
									<div className="mt-6 grid gap-4">
										{rankedPosts.map((post, index) => (
											<RankedPostRow key={post.id} post={post} index={index} />
										))}
									</div>
								) : (
									<div className="mt-6 rounded-[24px] border border-dashed border-zinc-700/60 bg-greyBg/55 px-6 py-10 text-center text-sm leading-7 text-zinc-400">
										{messages.trending.noTrending}
									</div>
								)}
							</section>

							<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
								<div>
									<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
										{messages.trending.moreToWatch}
									</p>
									<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
										{messages.trending.risingPosts}
									</h2>
									<p className="mt-2 text-sm leading-6 text-zinc-400">
										{messages.trending.risingPostsDescription}
									</p>
								</div>

								{spotlightPosts.length > 0 ? (
									<div className="mt-6 grid gap-4 lg:grid-cols-2">
										{spotlightPosts.map((post) => (
											<SpotlightPostCard key={post.id} post={post} />
										))}
									</div>
								) : (
									<div className="mt-6 rounded-[24px] border border-dashed border-zinc-700/60 bg-greyBg/55 px-6 py-10 text-center text-sm leading-7 text-zinc-400">
										{messages.trending.notEnoughPosts}
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

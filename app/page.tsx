"use client";

import { useEffect, useState } from "react";
import FirstSection from "@/components/FirstSection";
import Footer from "@/components/Footer";
import Main from "@/components/Main";
import SecondSection from "@/components/SecondSection";
import SkeletonFirstSection from "./components/SkeletonFirstSection";
import SkeletonMain from "./components/SkeletonMain";
import SkeletonSecondSection from "./components/SkeletonSecondSection";
import { getRandomPosts, type IPost } from "./data/posts";

export default function Home() {
	const [recentPosts, setRecentPosts] = useState<IPost[]>([]);
	const [trendingPosts, setTrendingPosts] = useState<IPost[]>([]);
	const [recommendedPosts, setRecommendedPosts] = useState<IPost[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		let active = true;

		async function loadPosts() {
			const storedRecentPosts = localStorage.getItem("recentPosts");
			const storedTrendingPosts = localStorage.getItem("trendingPosts");
			const storedRecommendedPosts = localStorage.getItem("recommendedPosts");

			if (storedRecentPosts && storedTrendingPosts && storedRecommendedPosts) {
				await Promise.resolve();
				if (!active) return;
				setRecentPosts(JSON.parse(storedRecentPosts));
				setTrendingPosts(JSON.parse(storedTrendingPosts));
				setRecommendedPosts(JSON.parse(storedRecommendedPosts));
				setLoading(false);
			}

			const [recent, trending, recommended] = await Promise.all([
				getRandomPosts(),
				getRandomPosts(),
				getRandomPosts(),
			]);

			if (!active) return;

			setRecentPosts(recent);
			setTrendingPosts(trending);
			setRecommendedPosts(recommended);

			// Atualiza os posts no local storage
			localStorage.setItem("recentPosts", JSON.stringify(recent));
			localStorage.setItem("trendingPosts", JSON.stringify(trending));
			localStorage.setItem("recommendedPosts", JSON.stringify(recommended));

			setLoading(false);
		}

		void loadPosts();

		return () => {
			active = false;
		};
	}, []);

	return loading ? (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl space-y-3">
									<div className="h-3 w-24 animate-pulse rounded-full bg-zinc-700/80" />
									<div className="h-12 w-full max-w-xl animate-pulse rounded-2xl bg-zinc-700/80" />
									<div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-zinc-700/70" />
									<div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-zinc-700/60" />
								</div>
								<div className="grid gap-3 sm:grid-cols-3">
									{Array.from({ length: 3 }, (_, index) => (
										<div
											key={`home-stat-skeleton-${index}`}
											className="h-28 w-full min-w-[160px] animate-pulse rounded-2xl bg-zinc-700/70"
										/>
									))}
								</div>
							</div>
						</div>
						<div className="px-4 py-5 sm:px-6">
							<SkeletonMain />
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<div className="mb-6 space-y-3">
							<div className="h-3 w-28 animate-pulse rounded-full bg-zinc-700/80" />
							<div className="h-10 w-full max-w-md animate-pulse rounded-2xl bg-zinc-700/80" />
							<div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-zinc-700/60" />
						</div>
						<SkeletonFirstSection />
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<div className="mb-6 space-y-3">
							<div className="h-3 w-24 animate-pulse rounded-full bg-zinc-700/80" />
							<div className="h-10 w-full max-w-md animate-pulse rounded-2xl bg-zinc-700/80" />
							<div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-zinc-700/60" />
						</div>
						<SkeletonSecondSection />
					</div>
				</section>
			</div>
			<Footer />
		</>
	) : (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										Start here
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										A personal dev blog with room to explore
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										DevBlog is where I publish development writing, opinions,
										tutorials, and experiments. The front page highlights featured
										reading, what is trending now, and quick ways to branch into
										the rest of the blog.
									</p>
								</div>
								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Featured posts
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{Math.min(recentPosts.length, 3)}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Trending picks
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{Math.min(trendingPosts.length, 4)}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Recommended
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{Math.min(recommendedPosts.length, 5)}
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="px-4 py-5 sm:px-6">
							<Main posts={{ recent: recentPosts, recommended: recommendedPosts }} />
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<div className="mb-6 max-w-3xl">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								Trending snapshot
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								What is getting attention now
							</h2>
							<p className="mt-3 text-sm leading-7 text-zinc-400">
								A fast scan of the posts currently pulling readers in, kept in the
								same place as before but with stronger section framing.
							</p>
						</div>
						<FirstSection posts={trendingPosts} />
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<div className="mb-6 max-w-3xl">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								Explore further
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								More ways into the blog
							</h2>
							<p className="mt-3 text-sm leading-7 text-zinc-400">
								Use these sections to move between what is new, what is getting
								attention, and the posts worth revisiting.
							</p>
						</div>
						<SecondSection
							posts={{ recent: recentPosts, recommended: recommendedPosts }}
						/>
					</div>
				</section>
			</div>
			<Footer />
		</>
	);
}

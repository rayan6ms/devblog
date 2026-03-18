"use client";

import FirstSection from "@/components/FirstSection";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import Main from "@/components/Main";
import SecondSection from "@/components/SecondSection";
import type { IPost } from "@/lib/posts-client";

export default function HomePageClient({
	recentPosts,
	recommendedPosts,
	trendingPosts,
}: {
	recentPosts: IPost[];
	recommendedPosts: IPost[];
	trendingPosts: IPost[];
}) {
	const { messages } = useI18n();
	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										{messages.home.startHere}
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										{messages.home.title}
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										{messages.home.description}
									</p>
								</div>
								<div className="grid gap-3 sm:grid-cols-3">
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.home.featuredPosts}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{Math.min(recentPosts.length, 3)}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.home.trendingPicks}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{Math.min(trendingPosts.length, 4)}
										</p>
									</div>
									<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.home.recommended}
										</p>
										<p className="mt-2 text-3xl font-semibold text-wheat">
											{Math.min(recommendedPosts.length, 5)}
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="px-4 py-5 sm:px-6">
							<Main
								posts={{ recent: recentPosts, recommended: recommendedPosts }}
							/>
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<div className="mb-6 max-w-3xl">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								{messages.home.trendingSnapshot}
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								{messages.home.trendingTitle}
							</h2>
							<p className="mt-3 text-sm leading-7 text-zinc-400">
								{messages.home.trendingDescription}
							</p>
						</div>
						<FirstSection posts={trendingPosts} />
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<div className="mb-6 max-w-3xl">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								{messages.home.exploreFurther}
							</p>
							<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
								{messages.home.exploreTitle}
							</h2>
							<p className="mt-3 text-sm leading-7 text-zinc-400">
								{messages.home.exploreDescription}
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

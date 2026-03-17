"use client";

import { FaArrowRight } from "react-icons/fa6";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import type { IPost } from "@/lib/posts-client";
import { useI18n } from "./LocaleProvider";
import RecentItem from "./RecentItem";
import TrendingItem from "./TrendingItem";

interface SecondSectionProps {
	posts: {
		recent: IPost[];
		recommended: IPost[];
	};
}

export default function SecondSection({ posts }: SecondSectionProps) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();

	function handleRouteButtonClick(
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
		path: string,
	) {
		e.preventDefault();
		e.stopPropagation();
		push(path);
	}

	const sections = [
		{
			title: messages.home.trendingPosts,
			path: "/trending",
			description: messages.home.trendingPostsDescription,
		},
		{
			title: messages.home.recentPosts,
			path: "/recent",
			description: messages.home.recentPostsDescription,
		},
		{
			title: messages.home.browseByTag,
			path: "/tag",
			description: messages.home.browseByTagDescription,
		},
	];

	return (
		<section className="grid w-full gap-8 xl:grid-cols-3">
			{sections.map((section, index) => {
				const featuredPost =
					posts.recent[index] ||
					posts.recent[0] ||
					posts.recommended[index] ||
					posts.recommended[0];

				return (
					<div
						key={section.path}
						className="mx-auto flex h-full w-full max-w-[380px] flex-col items-stretch gap-5 rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-5 shadow-lg shadow-zinc-950/10 lg:p-8 xl:max-w-none"
					>
						<div className="w-full">
							<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
								{messages.home.explore}
							</p>
							<h2 className="mt-2 text-2xl font-somerton uppercase text-wheat">
								{section.title}
							</h2>
							<p className="mt-2 text-sm leading-6 text-zinc-400">
								{section.description}
							</p>
						</div>
						{featuredPost ? (
							<RecentItem post={featuredPost} fluid compact />
						) : (
							<div className="rounded-[22px] border border-dashed border-zinc-700/60 bg-darkBg/35 px-4 py-6 text-sm leading-7 text-zinc-400">
								{messages.home.noSectionPost}
							</div>
						)}
						{posts.recommended.length > 0 ? (
							<div className="flex flex-col gap-5">
								{posts.recommended
									.slice(0, 2)
									.map((post: IPost, postIndex: number) => (
										<TrendingItem
											key={`${section.path}-${post.id}`}
											post={post}
											section
											addSeparation={postIndex > 0}
										/>
									))}
							</div>
						) : (
							<div className="rounded-[22px] border border-dashed border-zinc-700/60 bg-darkBg/35 px-4 py-6 text-sm leading-7 text-zinc-400">
								{messages.home.noRecommendedCallouts}
							</div>
						)}
						<button
							type="button"
							onClick={(e) => handleRouteButtonClick(e, section.path)}
							className="group mt-auto flex w-full items-center gap-2 self-start rounded-full border border-zinc-700/60 bg-lessDarkBg px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
						>
							{messages.home.viewSection}
							<FaArrowRight className="transition-transform delay-200 ease-in-out transform group-hover:translate-x-2" />
						</button>
					</div>
				);
			})}
		</section>
	);
}

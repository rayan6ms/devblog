"use client";

import { useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa6";
import type { IPost } from "@/data/posts";
import RecentItem from "./RecentItem";
import TrendingItem from "./TrendingItem";

interface SecondSectionProps {
	posts: {
		recent: IPost[];
		recommended: IPost[];
	};
}

export default function SecondSection({ posts }: SecondSectionProps) {
	const router = useRouter();

	function handleRouteButtonClick(
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
		path: string,
	) {
		e.preventDefault();
		e.stopPropagation();
		router.push(path);
	}

	const sections = [
		{
			title: "Trending Posts",
			path: "/trending",
			description: "See what is pulling the most attention right now.",
		},
		{
			title: "Recent Posts",
			path: "/recent",
			description: "Start with the newest writing and work backward from there.",
		},
		{
			title: "Recommended Posts",
			path: "/recommended",
			description: "Browse a smaller set of posts worth keeping in view.",
		},
	];

	return (
		<section className="grid w-full gap-8 xl:grid-cols-3">
			{sections.map((section, index) => (
				<div
					key={section.path}
					className="mx-auto flex h-full w-full max-w-[380px] flex-col items-stretch gap-5 rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-5 shadow-lg shadow-zinc-950/10 lg:p-8 xl:max-w-none"
				>
					<div className="w-full">
						<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
							Explore
						</p>
						<h2 className="mt-2 text-2xl font-somerton uppercase text-wheat">
							{section.title}
						</h2>
						<p className="mt-2 text-sm leading-6 text-zinc-400">
							{section.description}
						</p>
					</div>
					<RecentItem post={posts.recent[index]} fluid compact />
					<div className="flex flex-col gap-5">
						{posts.recommended.slice(0, 2).map((post: IPost, postIndex: number) => (
							<TrendingItem
								key={post.title}
								post={post}
								section
								addSeparation={postIndex > 0}
							/>
						))}
					</div>
					<button
						type="button"
						onClick={(e) => handleRouteButtonClick(e, section.path)}
						className="group mt-auto flex w-full items-center gap-2 self-start rounded-full border border-zinc-700/60 bg-darkBg px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-wheat"
					>
						View section
						<FaArrowRight className="transition-transform delay-200 ease-in-out transform group-hover:translate-x-2" />
					</button>
				</div>
			))}
		</section>
	);
}

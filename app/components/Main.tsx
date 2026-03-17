import { FaAnglesDown } from "react-icons/fa6";
import type { IPost } from "@/lib/posts-client";
import RecentItem from "./RecentItem";
import RecommendedItem from "./RecommendedItem";

interface MainProps {
	posts: {
		recent: IPost[];
		recommended: IPost[];
	};
}

export default function Main({ posts }: MainProps) {
	const recentHighlights = posts.recent.slice(0, 2);
	const featuredRecent = posts.recent[2];
	const recommendedPosts = posts.recommended.slice(0, 4);

	function handleScrollDown() {
		const section = document.getElementById("home-trending");
		if (!section) return;

		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		section.scrollIntoView({
			behavior: reducedMotion ? "auto" : "smooth",
			block: "start",
		});
	}

	return (
		<>
			<main className="mx-auto grid w-full max-w-[1280px] items-start gap-8 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xxl:grid-cols-[minmax(280px,320px)_minmax(520px,600px)_minmax(320px,360px)]">
				{recentHighlights.length > 0 ? (
					<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
						{recentHighlights.map((post: IPost) => (
							<div key={post.id} className="mx-auto w-full max-w-[420px]">
								<RecentItem post={post} fluid compact />
							</div>
						))}
					</div>
				) : null}
				{featuredRecent ? (
					<div className="mx-auto w-full max-w-[600px] xl:col-start-2">
						<RecentItem post={featuredRecent} isBig={true} fluid />
					</div>
				) : null}
				<div className="xl:col-start-2 xxl:col-start-3">
					<div className="h-fit rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-4 shadow-lg shadow-zinc-950/10 lg:p-5">
						<div className="mb-6">
							<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
								Recommended
							</p>
							<h2 className="mt-2 text-2xl font-somerton uppercase text-wheat">
								Editor picks
							</h2>
						</div>
						{recommendedPosts.length > 0 ? (
							<div className="flex flex-col divide-y divide-zinc-700/60 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
								{recommendedPosts.map((post: IPost) => (
									<RecommendedItem key={post.id} post={post} />
								))}
							</div>
						) : (
							<div className="rounded-[22px] border border-dashed border-zinc-700/60 bg-darkBg/40 px-4 py-6 text-sm leading-7 text-zinc-400">
								No recommended posts yet. Publish a few entries and this section
								will fill itself from the live database.
							</div>
						)}
					</div>
				</div>
				{recentHighlights.length === 0 && !featuredRecent && recommendedPosts.length === 0 ? (
					<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-greyBg/60 px-6 py-10 text-center text-sm leading-7 text-zinc-400 xl:col-span-2 xxl:col-span-3">
						No posts are published yet. The homepage is connected to Prisma now, so
						sections will populate as soon as real posts exist.
					</div>
				) : null}
			</main>
			<div className="mt-7 hidden w-full items-center justify-center xxl:flex">
				<div className="bg-zinc-500/60 w-44 h-0.5 mr-2 rounded-lg" />
				<button
					type="button"
					onClick={handleScrollDown}
					aria-label="Scroll to trending posts"
				>
					<FaAnglesDown className="animate-bounce w-6 h-6 mx-4 text-zinc-300/80" />
				</button>
				<div className="bg-zinc-500/60 w-44 h-0.5 ml-2 rounded-lg" />
			</div>
		</>
	);
}

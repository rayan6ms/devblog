import type { IPost } from "@/lib/posts-client";
import TrendingItem from "./TrendingItem";

interface FirstSectionProps {
	posts: IPost[];
}

export default function FirstSection({ posts }: FirstSectionProps) {
	return (
		<section id="home-trending">
			{posts.length > 0 ? (
				<div className="grid w-full justify-items-center gap-6 py-2 md:grid-cols-2 xl:gap-8 xxl:grid-cols-4 xxl:gap-6">
					{posts.slice(0, 4).map((post: IPost) => (
						<TrendingItem key={post.id} post={post} />
					))}
				</div>
			) : (
				<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-greyBg/60 px-6 py-10 text-center text-sm leading-7 text-zinc-400">
					No trending posts yet. Once published posts start collecting views, they
					will appear here automatically.
				</div>
			)}
		</section>
	);
}

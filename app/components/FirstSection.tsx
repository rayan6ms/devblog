import type { IPost } from "@/data/posts";
import TrendingItem from "./TrendingItem";

interface FirstSectionProps {
	posts: IPost[];
}

export default function FirstSection({ posts }: FirstSectionProps) {
	return (
		<section id="home-trending">
			<div className="grid w-full justify-items-center gap-6 py-2 md:grid-cols-2 xl:gap-8 xxl:grid-cols-4 xxl:gap-6">
				{posts.slice(0, 4).map((post: IPost) => (
					<TrendingItem key={post.title} post={post} />
				))}
			</div>
		</section>
	);
}

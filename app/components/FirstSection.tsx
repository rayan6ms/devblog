"use client";
import type { IPost } from "@/lib/posts-client";
import { useI18n } from "./LocaleProvider";
import PostCard from "./PostCard";
export default function FirstSection({ posts }: { posts: IPost[] }) {
	const { messages } = useI18n();
	return posts.length ? (
		<div className="post-grid">
			{posts.slice(0, 3).map((post) => (
				<PostCard key={post.id} post={post} />
			))}
		</div>
	) : (
		<p className="empty-state">{messages.home.noTrending}</p>
	);
}

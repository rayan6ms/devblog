"use client";

import type { IPost } from "@/lib/posts-client";
import { useI18n } from "./LocaleProvider";
import PostCard from "./PostCard";

export default function Main({
	posts,
}: {
	posts: { recent: IPost[]; recommended: IPost[] };
}) {
	const { messages } = useI18n();
	return (
		<div className="home-feed">
			<div className="home-feed__feature">
				{posts.recent[0] ? (
					<PostCard post={posts.recent[0]} variant="featured" preload />
				) : (
					<p className="empty-state">{messages.home.noPosts}</p>
				)}
			</div>
			<div className="home-feed__side">
				{posts.recent.slice(1, 3).map((post) => (
					<PostCard key={post.id} post={post} variant="row" />
				))}
				<aside
					className="recommendations"
					aria-labelledby="recommended-heading"
				>
					<h2 id="recommended-heading" className="section-title">
						{messages.home.recommended}
					</h2>
					<div className="recommendations__list">
						{posts.recommended.slice(0, 3).map((post) => (
							<PostCard key={post.id} post={post} variant="compact" />
						))}
					</div>
				</aside>
			</div>
		</div>
	);
}

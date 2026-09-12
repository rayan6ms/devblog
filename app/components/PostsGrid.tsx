"use client";
import type { IPost } from "@/lib/posts-client";
import PostCard from "./PostCard";
export default function PostsGrid({
	posts,
	heading,
	highlightTerm,
}: {
	posts: IPost[];
	heading?: string;
	highlightTerm?: string;
}) {
	return (
		<>
			{heading && <h2 className="section-title mb-6">{heading}</h2>}
			<div className="post-grid">
				{posts.map((post) => (
					<PostCard key={post.id} post={post} highlightTerm={highlightTerm} />
				))}
			</div>
		</>
	);
}

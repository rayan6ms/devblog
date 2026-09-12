"use client";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import PageIntro from "@/components/PageIntro";
import PostCard from "@/components/PostCard";
import type { IPost } from "@/lib/posts-client";
export default function TrendingPageClient({ posts }: { posts: IPost[] }) {
	const { messages } = useI18n();
	return (
		<>
			<main className="site-container page-content">
				<PageIntro
					title={messages.trending.title}
					description={messages.trending.description}
				/>
				{posts.length ? (
					<ol className="post-grid">
						{posts.map((post, index) => (
							<li key={post.id} className="min-w-0">
								<div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
									<span className="font-mono text-[var(--accent)]">
										{String(index + 1).padStart(2, "0")}
									</span>
									<span>
										{messages.trending.viewsSuffix(String(post.views))}
									</span>
								</div>
								<PostCard post={post} />
							</li>
						))}
					</ol>
				) : (
					<p className="empty-state">{messages.trending.noTrending}</p>
				)}
			</main>
			<Footer />
		</>
	);
}

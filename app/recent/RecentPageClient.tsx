"use client";
import slugify from "slugify";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import PageIntro from "@/components/PageIntro";
import Pagination from "@/components/Pagination";
import PostsGrid from "@/components/PostsGrid";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import type { IPost } from "@/lib/posts-client";

export default function RecentPageClient({
	currentPage,
	posts,
	recentTopics,
	startIndex,
	totalPages,
	totalPosts,
}: {
	currentPage: number;
	newestPost: IPost | null;
	posts: IPost[];
	recentTopics: Array<{ count: number; label: string }>;
	startIndex: number;
	totalPages: number;
	totalPosts: number;
	totalViews: number;
}) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();
	return (
		<>
			<main className="site-container page-content">
				<PageIntro
					title={messages.recent.title}
					description={messages.recent.description}
				/>
				<div className="filter-bar">
					{recentTopics.slice(0, 8).map((topic) => (
						<LocalizedLink
							className="filter-chip"
							key={topic.label}
							href={`/tag?selected=${slugify(topic.label, { lower: true, strict: true })}`}
						>
							{topic.label}
							<span>{topic.count}</span>
						</LocalizedLink>
					))}
				</div>
				<p className="mb-6 text-sm text-zinc-400">
					{totalPosts
						? messages.recent.visibleRange(
								startIndex + 1,
								startIndex + posts.length,
								totalPosts,
							)
						: messages.recent.noPublishedShort}
				</p>
				{posts.length ? (
					<PostsGrid posts={posts} />
				) : (
					<p className="empty-state">{messages.recent.noPosts}</p>
				)}
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={(page) => push(`/recent?page=${page}`)}
				/>
			</main>
			<Footer />
		</>
	);
}

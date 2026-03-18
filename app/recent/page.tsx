import { redirect } from "next/navigation";
import { withLocaleQuery } from "@/lib/i18n";
import { getPublishedPostList } from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import RecentPageClient from "./RecentPageClient";

const ITEMS_PER_PAGE = 12;

type RecentPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readFirst(value?: string | string[]) {
	return Array.isArray(value) ? value[0] : value;
}

function parsePage(value?: string) {
	const parsed = Number.parseInt(value || "1", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function RecentPage({ searchParams }: RecentPageProps) {
	const params = await searchParams;
	const locale = await getRequestLocale();
	const posts = await getPublishedPostList(locale);
	const totalPages = Math.max(1, Math.ceil(posts.length / ITEMS_PER_PAGE));
	const currentPage = parsePage(readFirst(params.page));
	const safeCurrentPage = Math.min(currentPage, totalPages);

	if (currentPage !== safeCurrentPage) {
		redirect(withLocaleQuery(`/recent?page=${safeCurrentPage}`, locale));
	}

	const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
	const visiblePosts = posts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
	const topicCounts = new Map<string, number>();

	for (const post of posts.slice(0, 18)) {
		topicCounts.set(post.mainTag, (topicCounts.get(post.mainTag) ?? 0) + 1);
	}

	const recentTopics = [...topicCounts.entries()]
		.map(([label, count]) => ({ count, label }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
		.slice(0, 6);

	return (
		<RecentPageClient
			currentPage={safeCurrentPage}
			newestPost={posts[0] ?? null}
			posts={visiblePosts}
			recentTopics={recentTopics}
			startIndex={startIndex}
			totalPages={totalPages}
			totalPosts={posts.length}
			totalViews={totalViews}
		/>
	);
}

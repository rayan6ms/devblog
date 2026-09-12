"use client";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import PageIntro from "@/components/PageIntro";
import Pagination from "@/components/Pagination";
import PostsGrid from "@/components/PostsGrid";
import SearchBar from "@/components/SearchBar";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import type { IPost } from "@/lib/posts-client";

export default function SearchPageClient({
	currentPage,
	posts,
	q,
	totalPages,
	totalResults,
}: {
	currentPage: number;
	posts: IPost[];
	q: string;
	totalPages: number;
	totalResults: number;
}) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();
	return (
		<>
			<main className="site-container page-content">
				<PageIntro title={messages.search.resultsFor(q)}>
					<div className="w-full max-w-sm">
						<SearchBar forceExpanded />
					</div>
				</PageIntro>
				<p className="mb-6 text-sm text-zinc-400">
					{totalResults} {messages.search.matches}
				</p>
				{posts.length ? (
					<PostsGrid posts={posts} highlightTerm={q} />
				) : (
					<div className="empty-state">
						<h2 className="section-title">{messages.search.nothingFound(q)}</h2>
						<p>{messages.search.noMatchDescription}</p>
						<LocalizedLink href="/recent" className="text-link">
							{messages.search.seeRecentPosts}
						</LocalizedLink>
					</div>
				)}
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPageChange={(page) =>
						push(`/search?q=${encodeURIComponent(q)}&page=${page}`)
					}
				/>
			</main>
			<Footer />
		</>
	);
}

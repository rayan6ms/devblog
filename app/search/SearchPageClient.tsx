"use client";

import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import PostsGrid from "@/components/PostsGrid";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import type { IPost } from "@/lib/posts-client";

const MAX_PAGE_BUTTONS = 5;

function getPaginationRange(currentPage: number, totalPages: number) {
	const half = Math.floor(MAX_PAGE_BUTTONS / 2);
	const start = Math.max(
		1,
		Math.min(currentPage - half, totalPages - MAX_PAGE_BUTTONS + 1),
	);
	const end = Math.min(totalPages, start + MAX_PAGE_BUTTONS - 1);

	return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

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
	const heading = messages.search.resultsFor(q);
	const pages = getPaginationRange(currentPage, totalPages);

	const handlePageChange = (page: number) => {
		if (page < 1 || page > totalPages || page === currentPage) {
			return;
		}

		const params = new URLSearchParams();
		params.set("q", q);
		params.set("page", String(page));
		push(`/search?${params.toString()}`);
	};

	return (
		<>
			<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
				<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_auto] lg:items-end">
							<div>
								<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
									{messages.search.eyebrow}
								</p>
								<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
									{heading}
								</h1>
								<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
									{messages.search.description}
								</p>
							</div>

							<div className="flex flex-wrap gap-3 lg:justify-end">
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										{messages.search.matches}
									</p>
									<p className="mt-1 text-lg font-semibold text-zinc-100">
										{totalResults}
									</p>
								</div>
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										{messages.common.page}
									</p>
									<p className="mt-1 text-lg font-semibold text-zinc-100">
										{currentPage} / {Math.max(totalPages, 1)}
									</p>
								</div>
							</div>
						</div>
					</section>

					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-4 py-5 shadow-xl shadow-zinc-950/20 sm:px-6 sm:py-6">
						{posts.length === 0 ? (
							<div className="rounded-[24px] border border-dashed border-zinc-700/60 bg-greyBg/55 px-6 py-12 text-center">
								<p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
									{messages.search.noMatch}
								</p>
								<h2 className="mt-3 text-3xl font-somerton text-wheat">
									{messages.search.nothingFound(q)}
								</h2>
								<p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
									{messages.search.noMatchDescription}
								</p>
								<button
									type="button"
									className="mt-6 inline-flex items-center justify-center rounded-full border border-zinc-600/60 bg-greyBg/80 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/80 hover:text-wheat"
									onClick={() => push("/recent")}
								>
									{messages.search.seeRecentPosts}
								</button>
							</div>
						) : (
							<PostsGrid posts={posts} heading={heading} highlightTerm={q} />
						)}

						{posts.length > 0 && totalPages > 1 ? (
							<div className="mt-8 flex flex-wrap items-center justify-center gap-2">
								<button
									type="button"
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/70 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat disabled:cursor-not-allowed disabled:opacity-45"
								>
									<FaArrowLeft className="text-xs" />
									{messages.common.previous}
								</button>

								{pages.map((page) => {
									const active = page === currentPage;

									return (
										<button
											key={page}
											type="button"
											onClick={() => handlePageChange(page)}
											className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
												active
													? "border-purpleContrast/45 bg-purpleContrast/18 text-wheat"
													: "border-zinc-700/60 bg-greyBg/70 text-zinc-100 hover:border-zinc-500/70 hover:text-wheat"
											}`}
										>
											{page}
										</button>
									);
								})}

								<button
									type="button"
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
									className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/70 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat disabled:cursor-not-allowed disabled:opacity-45"
								>
									{messages.common.next}
									<FaArrowRight className="text-xs" />
								</button>
							</div>
						) : null}
					</section>
				</div>
			</main>
			<Footer />
		</>
	);
}

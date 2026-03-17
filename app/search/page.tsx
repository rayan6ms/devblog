"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import PostsGrid from "@/components/PostsGrid";
import type { IPost } from "@/lib/posts-client";
import { getPostsByQueryPaginated } from "@/lib/posts-client";
import Skeleton from "../components/PostGridSkeleton";

function SearchPageContent() {
	const { messages } = useI18n();
	const [posts, setPosts] = useState<IPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalPages, setTotalPages] = useState(0);
	const [totalResults, setTotalResults] = useState(0);
	const [startPage, setStartPage] = useState(1);

	const itemsPerPage = 24;
	const maxPageButtons = 5;

	const { push, replace } = useLocaleNavigation();
	const searchParams = useSearchParams();
	const q = (searchParams.get("q") || "").trim();
	const currentPage = parseInt(searchParams.get("page") || "1", 10);

	useEffect(() => {
		if (!q) replace("/recent");
	}, [q, replace]);

	useEffect(() => {
		if (!q) return;

		async function fetchData() {
			setLoading(true);
			const { posts, total } = await getPostsByQueryPaginated(
				q,
				currentPage,
				itemsPerPage,
			);
			setPosts(posts);
			setTotalResults(total);
			setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
			setStartPage(1);
			setLoading(false);
		}

		fetchData();
	}, [q, currentPage]);

	const handlePageChange = (page: number) => {
		if (page > 0 && page <= totalPages) {
			const params = new URLSearchParams();
			params.set("q", q);
			params.set("page", String(page));
			push(`?${params.toString()}`);
		}
	};

	const calculatePageRange = (page: number) => {
		let newStartPage = startPage;
		if (page === startPage && page > 1) newStartPage = startPage - 2;
		else if (page === startPage + maxPageButtons - 1 && page < totalPages)
			newStartPage = startPage + 2;

		if (page === 1) newStartPage = 1;
		else if (page === totalPages)
			newStartPage = Math.max(totalPages - maxPageButtons + 1, 1);

		setStartPage(Math.max(newStartPage, 1));
	};

	const handleRealignPageChange = (page: number) => {
		calculatePageRange(page);
		handlePageChange(page);
	};

	const endPage = Math.min(startPage + maxPageButtons - 1, totalPages);
	const heading = q ? messages.search.resultsFor(q) : messages.common.search;

	if (loading) {
		return (
			<>
				<Skeleton />
				<Footer />
			</>
		);
	}

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
						{q && posts.length === 0 ? (
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
									onClick={() => handleRealignPageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/70 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat disabled:cursor-not-allowed disabled:opacity-45"
								>
									<FaArrowLeft className="text-xs" />
									{messages.common.previous}
								</button>

								{[...Array(endPage - startPage + 1)].map((_, index) => {
									const page = startPage + index;
									const active = page === currentPage;

									return (
										<button
											key={page}
											type="button"
											onClick={() => handleRealignPageChange(page)}
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
									onClick={() => handleRealignPageChange(currentPage + 1)}
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

export default function SearchPage() {
	return (
		<Suspense
			fallback={
				<>
					<Skeleton />
					<Footer />
				</>
			}
		>
			<SearchPageContent />
		</Suspense>
	);
}

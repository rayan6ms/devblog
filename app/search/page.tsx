import { redirect } from "next/navigation";
import { withLocaleQuery } from "@/lib/i18n";
import { getPostCatalog } from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import SearchPageClient from "./SearchPageClient";

const ITEMS_PER_PAGE = 24;

type SearchPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readFirst(value?: string | string[]) {
	return Array.isArray(value) ? value[0] : value;
}

function parsePage(value?: string) {
	const parsed = Number.parseInt(value || "1", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
	const params = await searchParams;
	const locale = await getRequestLocale();
	const q = readFirst(params.q)?.trim() || "";

	if (!q) {
		redirect(withLocaleQuery("/recent", locale));
	}

	const currentPage = parsePage(readFirst(params.page));
	const { posts, total } = await getPostCatalog({
		page: currentPage,
		limit: ITEMS_PER_PAGE,
		query: q,
		locale,
	});
	const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
	const safeCurrentPage = Math.min(currentPage, totalPages);

	if (safeCurrentPage !== currentPage) {
		redirect(
			withLocaleQuery(
				`/search?q=${encodeURIComponent(q)}&page=${safeCurrentPage}`,
				locale,
			),
		);
	}

	return (
		<SearchPageClient
			currentPage={safeCurrentPage}
			posts={posts}
			q={q}
			totalPages={totalPages}
			totalResults={total}
		/>
	);
}

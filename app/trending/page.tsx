import { getPostCatalog } from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import TrendingPageClient from "./TrendingPageClient";

export default async function TrendingPage() {
	const locale = await getRequestLocale();
	const { posts } = await getPostCatalog({ sort: "trending", locale });

	return <TrendingPageClient posts={posts} />;
}

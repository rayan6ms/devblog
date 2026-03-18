import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getMessages } from "@/lib/i18n";
import { getPostCatalog, getRecommendedPostCatalog } from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";
import HomePageClient from "./HomePageClient";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);

	return buildPageMetadata({
		title: messages.home.title,
		description: messages.home.description,
		path: "/",
		locale,
	});
}

export default async function HomePage() {
	const [locale, session] = await Promise.all([getRequestLocale(), auth()]);
	const userId = session?.user?.id ?? null;
	const [recent, trending, recommended] = await Promise.all([
		getPostCatalog({ page: 1, limit: 3, sort: "recent", userId, locale }),
		getPostCatalog({ limit: 4, sort: "trending", locale }),
		getRecommendedPostCatalog({ limit: 5, userId, locale }),
	]);

	return (
		<HomePageClient
			recentPosts={recent.posts}
			recommendedPosts={recommended.posts}
			trendingPosts={trending.posts}
		/>
	);
}

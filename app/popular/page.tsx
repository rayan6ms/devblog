import Footer from "@/components/Footer";
import PageIntro from "@/components/PageIntro";
import PostsGrid from "@/components/PostsGrid";
import { getMessages } from "@/lib/i18n";
import { getPostCatalog } from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
export default async function PopularPage() {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const { posts } = await getPostCatalog({ sort: "popular", locale });
	return (
		<>
			<main className="site-container page-content">
				<PageIntro
					title={messages.home.browseByTag}
					description={messages.home.browseByTagDescription}
				/>
				<PostsGrid posts={posts} />
			</main>
			<Footer />
		</>
	);
}

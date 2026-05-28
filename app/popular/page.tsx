import Footer from "@/components/Footer";
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
			<main className="min-h-screen bg-darkBg px-4 py-10 text-gray sm:px-6 lg:px-8">
				<section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 grid-rows-[auto_1fr] gap-5">
					<PostsGrid posts={posts} heading={messages.home.browseByTag} />
				</section>
			</main>
			<Footer />
		</>
	);
}

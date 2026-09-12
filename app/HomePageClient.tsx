"use client";
import { FaArrowRight } from "react-icons/fa6";
import FirstSection from "@/components/FirstSection";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import Main from "@/components/Main";
import PageIntro from "@/components/PageIntro";
import SecondSection from "@/components/SecondSection";
import type { IPost } from "@/lib/posts-client";

export default function HomePageClient({
	recentPosts,
	recommendedPosts,
	trendingPosts,
}: {
	popularPosts: IPost[];
	recentPosts: IPost[];
	recommendedPosts: IPost[];
	trendingPosts: IPost[];
}) {
	const { messages } = useI18n();
	return (
		<>
			<main className="site-container page-content">
				<PageIntro
					title={messages.home.title}
					description={messages.header.description}
				/>
				<section className="content-section" aria-labelledby="recent-heading">
					<div className="section-heading">
						<h2 className="section-title" id="recent-heading">
							{messages.home.recentPosts}
						</h2>
						<LocalizedLink className="text-link" href="/recent">
							{messages.home.viewSection}
							<FaArrowRight aria-hidden="true" />
						</LocalizedLink>
					</div>
					<Main
						posts={{ recent: recentPosts, recommended: recommendedPosts }}
					/>
				</section>
				<section
					className="content-section"
					id="home-trending"
					aria-labelledby="trending-heading"
				>
					<div className="section-heading">
						<h2 className="section-title" id="trending-heading">
							{messages.home.trendingPosts}
						</h2>
						<LocalizedLink className="text-link" href="/trending">
							{messages.home.viewSection}
							<FaArrowRight aria-hidden="true" />
						</LocalizedLink>
					</div>
					<FirstSection posts={trendingPosts} />
				</section>
				<section className="content-section" aria-labelledby="browse-heading">
					<div className="section-heading">
						<h2 className="section-title" id="browse-heading">
							{messages.home.exploreTitle}
						</h2>
					</div>
					<SecondSection />
				</section>
			</main>
			<Footer />
		</>
	);
}

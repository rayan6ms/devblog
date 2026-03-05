"use client";

import { useEffect, useState } from "react";
import FirstSection from "@/components/FirstSection";
import Footer from "@/components/Footer";
import Main from "@/components/Main";
import SecondSection from "@/components/SecondSection";
import SkeletonFirstSection from "./components/SkeletonFirstSection";
import SkeletonMain from "./components/SkeletonMain";
import SkeletonSecondSection from "./components/SkeletonSecondSection";
import { getRandomPosts, type IPost } from "./data/posts";

export default function Home() {
	const [recentPosts, setRecentPosts] = useState<IPost[]>([]);
	const [trendingPosts, setTrendingPosts] = useState<IPost[]>([]);
	const [recommendedPosts, setRecommendedPosts] = useState<IPost[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		let active = true;

		async function loadPosts() {
			const storedRecentPosts = localStorage.getItem("recentPosts");
			const storedTrendingPosts = localStorage.getItem("trendingPosts");
			const storedRecommendedPosts = localStorage.getItem("recommendedPosts");

			if (storedRecentPosts && storedTrendingPosts && storedRecommendedPosts) {
				await Promise.resolve();
				if (!active) return;
				setRecentPosts(JSON.parse(storedRecentPosts));
				setTrendingPosts(JSON.parse(storedTrendingPosts));
				setRecommendedPosts(JSON.parse(storedRecommendedPosts));
				setLoading(false);
			}

			const [recent, trending, recommended] = await Promise.all([
				getRandomPosts(),
				getRandomPosts(),
				getRandomPosts(),
			]);

			if (!active) return;

			setRecentPosts(recent);
			setTrendingPosts(trending);
			setRecommendedPosts(recommended);

			// Atualiza os posts no local storage
			localStorage.setItem("recentPosts", JSON.stringify(recent));
			localStorage.setItem("trendingPosts", JSON.stringify(trending));
			localStorage.setItem("recommendedPosts", JSON.stringify(recommended));

			setLoading(false);
		}

		void loadPosts();

		return () => {
			active = false;
		};
	}, []);

	return loading ? (
		<>
			<SkeletonMain />
			<SkeletonFirstSection />
			<SkeletonSecondSection />
			<Footer />
		</>
	) : (
		<>
			<Main posts={{ recent: recentPosts, recommended: recommendedPosts }} />
			<FirstSection posts={trendingPosts} />
			<SecondSection
				posts={{ recent: recentPosts, recommended: recommendedPosts }}
			/>
			<Footer />
		</>
	);
}

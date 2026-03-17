// @ts-nocheck
import type { Post } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import {
	getRecentPosts,
	getRecommendationsBasedOnFeedback,
	getRecommendationsFromSimilarUsers,
	getRecommendationsFromTags,
	getTrendingPosts,
} from "@/api/utils";
import { auth } from "@/lib/auth";

export async function GET(_request: NextRequest) {
	const session = await auth();
	const userId = session?.user?.id ?? null;

	let mixedRecommendations: Post[] = [];

	if (userId) {
		// Get posts from each category of recommendation for logged-in users
		const feedbackRecommendations =
			await getRecommendationsBasedOnFeedback(userId);
		const tagRecommendations = await getRecommendationsFromTags(userId);
		const userSimilarityRecommendations =
			await getRecommendationsFromSimilarUsers(userId);

		// Select subsets of posts from each category
		const selectedFeedbackPosts = getRandomSubarray(feedbackRecommendations, 4);
		const selectedTagPosts = getRandomSubarray(tagRecommendations, 4);
		const selectedUserSimilarityPosts = getRandomSubarray(
			userSimilarityRecommendations,
			2,
		);

		// Mix all selected posts
		mixedRecommendations = shuffleArray([
			...selectedFeedbackPosts,
			...selectedTagPosts,
			...selectedUserSimilarityPosts,
		]);
	} else {
		// For non-logged-in users, show trending or recent posts
		const trendingPosts = await getTrendingPosts();
		const recentPosts = await getRecentPosts();

		// Mix trending and recent posts
		mixedRecommendations = shuffleArray([...trendingPosts, ...recentPosts]);
	}

	return NextResponse.json(mixedRecommendations);
}

function getRandomSubarray(arr: Post[], size: number): Post[] {
	const shuffled = arr.slice(0);
	let i = arr.length;
	let temp: Post;
	let index = 0;

	while (i--) {
		index = Math.floor((i + 1) * Math.random());
		temp = shuffled[index];
		shuffled[index] = shuffled[i];
		shuffled[i] = temp;
	}
	return shuffled.slice(0, size);
}

function shuffleArray(array: Post[]): Post[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

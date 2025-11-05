import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import {
  getRecentPosts,
  getTrendingPosts,
  getRecommendationsBasedOnFeedback,
  getRecommendationsFromTags,
  getRecommendationsFromSimilarUsers
} from '@/api/utils';

export async function GET(request: NextRequest) {
  // Use a middleware to attach the userId to the request object if the user is logged in
  const userId: mongoose.Types.ObjectId | null = (request as any).userId || null;

  let mixedRecommendations: mongoose.Document[] = [];

  if (userId) {
    // Get posts from each category of recommendation for logged-in users
    const feedbackRecommendations = await getRecommendationsBasedOnFeedback(userId);
    const tagRecommendations = await getRecommendationsFromTags(userId);
    const userSimilarityRecommendations = await getRecommendationsFromSimilarUsers(userId);

    // Select subsets of posts from each category
    const selectedFeedbackPosts = getRandomSubarray(feedbackRecommendations, 4);
    const selectedTagPosts = getRandomSubarray(tagRecommendations, 4);
    const selectedUserSimilarityPosts = getRandomSubarray(userSimilarityRecommendations, 2);

    // Mix all selected posts
    mixedRecommendations = shuffleArray([...selectedFeedbackPosts, ...selectedTagPosts, ...selectedUserSimilarityPosts]);
  } else {
    // For non-logged-in users, show trending or recent posts
    const trendingPosts = await getTrendingPosts();
    const recentPosts = await getRecentPosts();

    // Mix trending and recent posts
    mixedRecommendations = shuffleArray([...trendingPosts, ...recentPosts]);
  }

  return NextResponse.json(mixedRecommendations);
}

function getRandomSubarray(arr: mongoose.Document[], size: number): mongoose.Document[] {
  const shuffled = arr.slice(0);
  let i = arr.length, temp, index;
  while (i--) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(0, size);
}

function shuffleArray(array: mongoose.Document[]): mongoose.Document[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
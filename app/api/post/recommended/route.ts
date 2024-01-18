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
  // Usa um middleware que anexe o userId ao objeto de request se o usuário estiver logado
  const userId: mongoose.Types.ObjectId | null = (request as any).userId || null;

  let mixedRecommendations: mongoose.Document[] = [];

  if (userId) {
    // Obter posts de cada categoria de recomendação para usuários logados
    const feedbackRecommendations = await getRecommendationsBasedOnFeedback(userId);
    const tagRecommendations = await getRecommendationsFromTags(userId);
    const userSimilarityRecommendations = await getRecommendationsFromSimilarUsers(userId);

    // Selecionar subconjuntos de posts de cada categoria
    const selectedFeedbackPosts = getRandomSubarray(feedbackRecommendations, 4);
    const selectedTagPosts = getRandomSubarray(tagRecommendations, 4);
    const selectedUserSimilarityPosts = getRandomSubarray(userSimilarityRecommendations, 2);

    // Misturar todos os posts selecionados
    mixedRecommendations = shuffleArray([...selectedFeedbackPosts, ...selectedTagPosts, ...selectedUserSimilarityPosts]);
  } else {
    // Para usuários não logados, mostrar posts em tendência ou recentes
    const trendingPosts = await getTrendingPosts();
    const recentPosts = await getRecentPosts();

    // Misturar posts em tendência e recentes
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
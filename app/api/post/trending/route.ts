import { NextRequest, NextResponse } from 'next/server';
import { getTrendingPosts } from '@/api/utils';

export async function GET(request: NextRequest) {
  const trendingPosts = await getTrendingPosts();
  return NextResponse.json(trendingPosts);
}
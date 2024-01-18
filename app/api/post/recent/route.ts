import { NextRequest, NextResponse } from 'next/server';
import { getRecentPosts } from '@/api/utils';

export async function GET(request: NextRequest) {
  const recentPosts = await getRecentPosts();
  return NextResponse.json(recentPosts);
}
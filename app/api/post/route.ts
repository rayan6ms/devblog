import { NextRequest, NextResponse } from 'next/server';
import { createPost } from '@/api/utils';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const data = await req.json();
  const post = await createPost(data);
  return NextResponse.json(post);
}
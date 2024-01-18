import { NextRequest, NextResponse } from 'next/server';
import { getPostBySlug } from '@/api/utils';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const { slug } = params;
  
  try {
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error: any) {
    return NextResponse.json({ error: { message: 'Unable to connect'} }, { status: 500 });
  }
}
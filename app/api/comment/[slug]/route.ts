import { NextRequest, NextResponse } from 'next/server';
import { getCommentsByPostSlug } from '@/api/utils';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const { slug } = params;
  try {
    const comments = await getCommentsByPostSlug(slug);
    if (!comments) {
      return NextResponse.json({ error: { message: 'Comments not found'} }, { status: 404 });
    }
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: { message: 'Unable to connect'} }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getProgress, createProgress } from '@/api/utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId, postId } = await request.json();
  
  try {
    const progress = await getProgress(userId, postId);
    if (!progress) {
      return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
    }
    return NextResponse.json(progress);
  } catch (error) {
    return NextResponse.json({ error: { message: 'Unable to connect'} }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const data = await req.json();
  const progress = await createProgress(data);
  return NextResponse.json(progress);
}
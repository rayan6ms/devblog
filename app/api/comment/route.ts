import { NextRequest, NextResponse } from 'next/server';
import { createComment } from '@/api/utils';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const data = await req.json();
  const comment = await createComment(data);
  return NextResponse.json(comment);
}
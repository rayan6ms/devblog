import { NextRequest, NextResponse } from 'next/server';
import { createFeedback } from '@/api/utils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await request.json();
  
  try {
    const feedback = await createFeedback(data);
    return NextResponse.json(feedback);
  } catch (error) {
    return NextResponse.json({ error: { message: 'Unable to connect'} }, { status: 500 });
  }
}
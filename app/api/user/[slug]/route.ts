import { NextRequest, NextResponse } from 'next/server';
import { getUserBySlug } from '@/api/utils';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const { slug } = params;
  
  try {
    const user = await getUserBySlug(slug);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: { message: 'Unable to connect'} }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/api/utils';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const data = await req.json();
  const user = await createUser(data);
  return NextResponse.json(user);
}
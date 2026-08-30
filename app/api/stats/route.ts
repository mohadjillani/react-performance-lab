import { NextResponse } from 'next/server';
import { getCategoryStats } from '@/lib/data/store';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await getCategoryStats());
}

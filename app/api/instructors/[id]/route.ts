import { NextResponse } from 'next/server';
import { getInstructor } from '@/lib/data/store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const instructor = await getInstructor(Number(id));
  if (!instructor) {
    return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
  }
  return NextResponse.json(instructor);
}

import { NextResponse } from 'next/server';
import { getCourse, listReviews } from '@/lib/data/store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }
  return NextResponse.json(await listReviews(course.id));
}

import { NextResponse } from 'next/server';
import { listCourses, listFeaturedCourses } from '@/lib/data/store';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const courses =
    searchParams.get('featured') === '1' ? await listFeaturedCourses() : await listCourses();
  return NextResponse.json(courses);
}

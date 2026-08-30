import fixturesJson from './fixtures.json';
import type { Category, Course, Fixtures, Instructor, Review } from './types';

/**
 * In-process datastore over the committed fixtures. Every read waits LATENCY_MS
 * (default 150 ms) so the app behaves like it is talking to a database or an
 * upstream API rather than an in-memory array. The route handlers and, on the
 * branches that render on the server, the pages themselves all pay it; what
 * differs between branches is how many round trips they make and when.
 */
const fixtures = fixturesJson as Fixtures;

export const LATENCY_MS = Number(process.env.LATENCY_MS ?? '150');

const coursesBySlug = new Map(fixtures.courses.map((course) => [course.slug, course]));
const instructorsById = new Map(fixtures.instructors.map((i) => [i.id, i]));
const reviewsByCourse = new Map<number, Review[]>();
for (const review of fixtures.reviews) {
  const list = reviewsByCourse.get(review.courseId) ?? [];
  list.push(review);
  reviewsByCourse.set(review.courseId, list);
}
for (const list of reviewsByCourse.values()) {
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

function simulateLatency(): Promise<void> {
  if (LATENCY_MS <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

/** What a list needs; the full record is only fetched on the detail page. */
export interface CourseSummary {
  id: number;
  slug: string;
  title: string;
  category: Category;
  level: Course['level'];
  instructorName: string;
  priceCents: number;
  rating: number;
  reviewCount: number;
  enrolments: number;
  updatedAt: string;
  thumbnail: string;
}

export interface CategoryStat {
  category: Category;
  courses: number;
  enrolments: number;
}

function toSummary(course: Course): CourseSummary {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: course.category,
    level: course.level,
    instructorName: instructorsById.get(course.instructorId)?.name ?? 'Unknown',
    priceCents: course.priceCents,
    rating: course.rating,
    reviewCount: course.reviewCount,
    enrolments: course.enrolments,
    updatedAt: course.updatedAt,
    thumbnail: course.thumbnail,
  };
}

const allSummaries: CourseSummary[] = fixtures.courses.map(toSummary);

const featuredSummaries: CourseSummary[] = [...allSummaries]
  .sort((a, b) => b.enrolments - a.enrolments || a.id - b.id)
  .slice(0, 6);

const categoryStats: CategoryStat[] = (() => {
  const byCategory = new Map<Category, CategoryStat>();
  for (const course of fixtures.courses) {
    const stat = byCategory.get(course.category) ?? {
      category: course.category,
      courses: 0,
      enrolments: 0,
    };
    stat.courses += 1;
    stat.enrolments += course.enrolments;
    byCategory.set(course.category, stat);
  }
  return [...byCategory.values()].sort((a, b) => b.courses - a.courses);
})();

export async function listCourses(): Promise<CourseSummary[]> {
  await simulateLatency();
  return allSummaries;
}

export async function listFeaturedCourses(): Promise<CourseSummary[]> {
  await simulateLatency();
  return featuredSummaries;
}

export async function getCategoryStats(): Promise<CategoryStat[]> {
  await simulateLatency();
  return categoryStats;
}

export async function getCourse(slug: string): Promise<Course | undefined> {
  await simulateLatency();
  return coursesBySlug.get(slug);
}

export async function getInstructor(id: number): Promise<Instructor | undefined> {
  await simulateLatency();
  return instructorsById.get(id);
}

export async function listReviews(courseId: number): Promise<Review[]> {
  await simulateLatency();
  return reviewsByCourse.get(courseId) ?? [];
}

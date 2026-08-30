import { notFound } from 'next/navigation';
import { Reviews } from '@/components/Reviews';
import { StarRating } from '@/components/StarRating';
import { getCourse, getInstructor, listFeaturedCourses } from '@/lib/data/store';
import { formatDate, formatPrice, humanizeHours } from '@/lib/format';

// The course and its instructor are rendered on the server and cached for a
// minute per slug. The six most popular courses are built ahead of time; the
// rest render on first request and are cached from then on.
export const revalidate = 60;

export async function generateStaticParams() {
  const featured = await listFeaturedCourses();
  return featured.map((course) => ({ slug: course.slug }));
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();
  const instructor = await getInstructor(course.instructorId);

  return (
    <article className="detail">
      <p className="eyebrow">
        {course.category} &middot; {course.level}
      </p>
      <h1>{course.title}</h1>
      <p className="lede">{course.summary}</p>
      <dl className="facts">
        <dt>Rating</dt>
        <dd>
          <StarRating rating={course.rating} count={course.reviewCount} />
        </dd>
        <dt>Duration</dt>
        <dd>{humanizeHours(course.durationHours)}</dd>
        <dt>Price</dt>
        <dd>{formatPrice(course.priceCents)}</dd>
        <dt>Enrolled</dt>
        <dd>{course.enrolments.toLocaleString('en-GB')}</dd>
        <dt>Published</dt>
        <dd>{formatDate(course.publishedAt)}</dd>
      </dl>

      <section data-testid="instructor">
        <h2>Instructor</h2>
        {instructor ? (
          <div className="card">
            <h3>{instructor.name}</h3>
            <p className="muted">{instructor.title}</p>
            <p>{instructor.bio}</p>
          </div>
        ) : (
          <p className="muted">Instructor unavailable</p>
        )}
      </section>

      <Reviews slug={slug} />
    </article>
  );
}

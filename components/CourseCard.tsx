import Link from 'next/link';
import type { CourseSummary } from '@/lib/data/store';
import { StarRating } from './StarRating';

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <article className="card">
      <p className="eyebrow">{course.category}</p>
      <h3>
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
      </h3>
      <p className="muted">
        {course.level} &middot; {course.instructorName}
      </p>
      <p>
        <StarRating rating={course.rating} count={course.reviewCount} />
      </p>
      <p className="price">
        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
          course.priceCents / 100,
        )}
      </p>
    </article>
  );
}

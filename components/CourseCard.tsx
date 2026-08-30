import Link from 'next/link';
import type { CourseSummary } from '@/lib/data/store';
import { formatDate, formatPrice } from '@/lib/format';
import { StarRating } from './StarRating';

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <article className="card">
      {/* eslint-disable-next-line @next/next/no-img-element -- baseline: dimensionless <img>, see docs/fixes/05-render-work.md */}
      <img src={course.thumbnail} alt="" className="thumb" />
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
      <p className="muted">Updated {formatDate(course.updatedAt)}</p>
      <p className="price">{formatPrice(course.priceCents)}</p>
    </article>
  );
}

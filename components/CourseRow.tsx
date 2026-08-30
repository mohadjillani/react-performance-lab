import Link from 'next/link';
import type { CourseSummary } from '@/lib/data/store';
import { formatDate } from '@/lib/heavy/dates';
import { StarRating } from './StarRating';

export function CourseRow({ course }: { course: CourseSummary }) {
  const enrolled = new Intl.NumberFormat('en-GB').format(course.enrolments);
  const price = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    course.priceCents / 100,
  );
  return (
    <li className="row">
      {/* eslint-disable-next-line @next/next/no-img-element -- baseline: dimensionless <img>, see docs/fixes/05-render-work.md */}
      <img src={course.thumbnail} alt="" className="thumb thumb-row" />
      <div className="row-main">
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
        <p className="muted">
          {course.category} &middot; {course.level} &middot; {course.instructorName}
        </p>
        <p className="muted">
          {enrolled} enrolled &middot; updated {formatDate(course.updatedAt)}
        </p>
      </div>
      <div className="row-meta">
        <StarRating rating={course.rating} count={course.reviewCount} />
        <span className="price">{price}</span>
      </div>
    </li>
  );
}

import Link from 'next/link';
import type { CourseSummary } from '@/lib/data/store';
import { StarRating } from './StarRating';

export function CourseRow({ course }: { course: CourseSummary }) {
  return (
    <li className="row">
      <div className="row-main">
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
        <p className="muted">
          {course.category} &middot; {course.level} &middot; {course.instructorName}
        </p>
      </div>
      <div className="row-meta">
        <StarRating rating={course.rating} count={course.reviewCount} />
        <span className="price">
          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
            course.priceCents / 100,
          )}
        </span>
      </div>
    </li>
  );
}

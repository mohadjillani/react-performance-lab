'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { CourseSummary } from '@/lib/data/store';
import { formatDate, formatInteger, formatPrice } from '@/lib/format';
import { reviewsQuery } from '@/lib/queries';
import { StarRating } from './StarRating';

export function CourseRow({ course }: { course: CourseSummary }) {
  const queryClient = useQueryClient();
  const enrolled = formatInteger(course.enrolments);
  const price = formatPrice(course.priceCents);

  // Intent-based prefetch: pointer or keyboard focus on a row starts loading
  // the reviews the detail page will need. By the time the click lands, the
  // cache is usually warm and the reviews island renders without a request.
  // Errors are ignored on purpose; the detail page will fetch again if needed.
  const warmReviews = () => {
    queryClient.query(reviewsQuery(course.slug)).catch(() => undefined);
  };

  return (
    <li className="row" onMouseEnter={warmReviews} onFocus={warmReviews}>
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

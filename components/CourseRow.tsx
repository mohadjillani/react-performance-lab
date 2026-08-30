'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import type { CourseSummary } from '@/lib/data/store';
import { formatDate, formatInteger, formatPrice } from '@/lib/format';
import { reviewsQuery } from '@/lib/queries';
import { StarRating } from './StarRating';

interface CourseRowProps {
  course: CourseSummary;
  index: number;
  offset: number;
  measure: (element: HTMLElement | null) => void;
}

/**
 * Memoised: a row only re-renders when its own course or position changes,
 * not because the search box's state did. Positioned by the virtualiser and
 * measured after mount so estimateSize only has to be roughly right.
 */
export const CourseRow = memo(function CourseRow({
  course,
  index,
  offset,
  measure,
}: CourseRowProps) {
  const queryClient = useQueryClient();
  const enrolled = formatInteger(course.enrolments);
  const price = formatPrice(course.priceCents);

  // Intent-based prefetch: pointer or keyboard focus on a row starts loading
  // the reviews the detail page will need. Errors are ignored on purpose; the
  // detail page will fetch again if needed.
  const warmReviews = () => {
    queryClient.query(reviewsQuery(course.slug)).catch(() => undefined);
  };

  return (
    <li
      ref={measure}
      data-index={index}
      className="row"
      style={{ transform: `translateY(${String(offset)}px)` }}
      onMouseEnter={warmReviews}
      onFocus={warmReviews}
    >
      <Image src={course.thumbnail} alt="" width={96} height={60} className="thumb thumb-row" />
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
});

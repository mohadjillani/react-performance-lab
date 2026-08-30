'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { getJson } from '@/lib/client-fetch';
import type { Course } from '@/lib/data/types';

export default function CourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<Course>(`/api/courses/${params.slug}`)
      .then((data) => {
        if (!cancelled) setCourse(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  if (error) return <p role="alert">{error}</p>;
  if (!course) return <p className="muted">Loading&hellip;</p>;

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
        <dd>{course.durationHours} hours</dd>
        <dt>Price</dt>
        <dd>
          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
            course.priceCents / 100,
          )}
        </dd>
        <dt>Enrolled</dt>
        <dd>{course.enrolments.toLocaleString('en-GB')}</dd>
      </dl>
    </article>
  );
}

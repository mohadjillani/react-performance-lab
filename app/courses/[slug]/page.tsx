'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChartPlaceholder } from '@/components/ChartPlaceholder';
import { StarRating } from '@/components/StarRating';
import { getJson } from '@/lib/client-fetch';
import type { Course, Instructor, Review } from '@/lib/data/types';
import { formatDate, humanizeHours } from '@/lib/heavy/dates';

const RatingChart = dynamic(() => import('@/components/RatingChart').then((m) => m.RatingChart), {
  ssr: false,
  loading: () => <ChartPlaceholder small />,
});

export default function CourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const loadedCourse = await getJson<Course>(`/api/courses/${params.slug}`);
      if (cancelled) return;
      setCourse(loadedCourse);

      const loadedInstructor = await getJson<Instructor>(
        `/api/instructors/${String(loadedCourse.instructorId)}`,
      );
      if (cancelled) return;
      setInstructor(loadedInstructor);

      const loadedReviews = await getJson<Review[]>(`/api/courses/${params.slug}/reviews`);
      if (cancelled) return;
      setReviews(loadedReviews);
    };
    load().catch((err: unknown) => {
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
        <dd>{humanizeHours(course.durationHours)}</dd>
        <dt>Price</dt>
        <dd>
          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
            course.priceCents / 100,
          )}
        </dd>
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
          <p className="muted">Loading instructor&hellip;</p>
        )}
      </section>

      <section data-testid="reviews">
        <h2>
          Reviews{' '}
          {reviews && (
            <span className="muted" data-testid="review-count">
              ({reviews.length})
            </span>
          )}
        </h2>
        {reviews ? (
          <>
            <RatingChart reviews={reviews} />
            <ul className="review-list">
              {reviews.map((review) => (
                <li key={review.id} className="review">
                  <p className="review-head">
                    <strong>{review.author}</strong>{' '}
                    <span aria-label={`${String(review.rating)} out of 5`}>
                      {'★'.repeat(review.rating)}
                      <span className="muted">{'★'.repeat(5 - review.rating)}</span>
                    </span>{' '}
                    <span className="muted">{formatDate(review.createdAt)}</span>
                  </p>
                  <p>{review.body}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">Loading reviews&hellip;</p>
        )}
      </section>
    </article>
  );
}

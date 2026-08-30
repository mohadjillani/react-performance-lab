'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { getJson } from '@/lib/client-fetch';
import type { Review } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { ChartPlaceholder } from './ChartPlaceholder';

const RatingChart = dynamic(() => import('@/components/RatingChart').then((m) => m.RatingChart), {
  ssr: false,
  loading: () => <ChartPlaceholder small />,
});

/**
 * Reviews change more often than the course they belong to, so they are not
 * part of the ISR-cached page: they are fetched live on the client. One
 * request, not three, and it starts as soon as this component mounts.
 */
export function Reviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<Review[]>(`/api/courses/${slug}/reviews`)
      .then((list) => {
        if (!cancelled) setReviews(list);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
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
  );
}

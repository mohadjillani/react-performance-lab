'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { formatDate } from '@/lib/format';
import { reviewsQuery } from '@/lib/queries';
import { ChartPlaceholder } from './ChartPlaceholder';

const RatingChart = dynamic(() => import('@/components/RatingChart').then((m) => m.RatingChart), {
  ssr: false,
  loading: () => <ChartPlaceholder small />,
});

/**
 * Reads reviews from the query cache. On a fresh page load the cache was
 * hydrated by the server, so this renders with data on the first pass; on a
 * client navigation from the catalogue the hover prefetch usually got there
 * first. The fetch in lib/queries only runs when neither did.
 */
export function Reviews({ slug }: { slug: string }) {
  const { data: reviews } = useQuery(reviewsQuery(slug));

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

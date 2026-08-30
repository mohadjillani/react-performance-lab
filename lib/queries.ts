import { getJson } from './client-fetch';
import type { Review } from './data/types';

/** Query definitions shared by the server prefetch, the hover prefetch and the component. */
export const reviewsQuery = (slug: string) => ({
  queryKey: ['reviews', slug] as const,
  queryFn: () => getJson<Review[]>(`/api/courses/${slug}/reviews`),
});

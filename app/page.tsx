'use client';

import { useEffect, useState } from 'react';
import { CategoryChart } from '@/components/CategoryChart';
import { CourseCard } from '@/components/CourseCard';
import { getJson } from '@/lib/client-fetch';
import type { CategoryStat, CourseSummary } from '@/lib/data/store';
import { meanBy, sortByDesc, sumBy } from '@/lib/heavy/collections';

interface LandingData {
  stats: CategoryStat[];
  featured: CourseSummary[];
}

export default function LandingPage() {
  const [data, setData] = useState<LandingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getJson<CategoryStat[]>('/api/stats'),
      getJson<CourseSummary[]>('/api/courses?featured=1'),
    ])
      .then(([stats, featured]) => {
        if (!cancelled) setData({ stats, featured });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCourses = data ? sumBy(data.stats, 'courses') : 0;
  const totalEnrolments = data ? sumBy(data.stats, 'enrolments') : 0;
  const featuredRating = data ? meanBy(data.featured, 'rating') : 0;

  return (
    <>
      <h1>Learn something this week</h1>
      <p className="muted">2,000 courses across twelve categories, taught by practitioners.</p>

      {error && <p role="alert">{error}</p>}
      {!data && !error && <p className="muted">Loading&hellip;</p>}

      {data && (
        <>
          <section>
            <h2>Courses by category</h2>
            <p className="muted" data-testid="landing-totals">
              {totalCourses.toLocaleString('en-GB')} courses &middot;{' '}
              {totalEnrolments.toLocaleString('en-GB')} enrolments &middot; featured courses average{' '}
              {featuredRating.toFixed(1)} stars
            </p>
            <CategoryChart stats={sortByDesc(data.stats, 'courses')} />
          </section>

          <section>
            <h2>Most popular</h2>
            <div className="card-grid" data-testid="featured-courses">
              {data.featured.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}

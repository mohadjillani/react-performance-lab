'use client';

import { useEffect, useState } from 'react';
import { CourseCard } from '@/components/CourseCard';
import { getJson } from '@/lib/client-fetch';
import type { CategoryStat, CourseSummary } from '@/lib/data/store';

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
            <ul className="stat-list" data-testid="category-stats">
              {data.stats.map((stat) => (
                <li key={stat.category}>
                  {stat.category}: {stat.courses} courses
                </li>
              ))}
            </ul>
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

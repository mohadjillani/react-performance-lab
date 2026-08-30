'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { countBy } from '@/lib/heavy/collections';
import type { Review } from '@/lib/data/types';

export function RatingChart({ reviews }: { reviews: Review[] }) {
  const counts = countBy(reviews, 'rating');
  const data = [5, 4, 3, 2, 1].map((stars) => ({
    stars: `${String(stars)}★`,
    reviews: counts[String(stars)] ?? 0,
  }));
  return (
    <div className="chart chart-small" data-testid="rating-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="stars" width={36} tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }} />
          <Bar
            dataKey="reviews"
            name="Reviews"
            fill="#0f766e"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

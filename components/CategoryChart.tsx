'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CategoryStat } from '@/lib/data/store';

export function CategoryChart({ stats }: { stats: CategoryStat[] }) {
  return (
    <div className="chart" data-testid="category-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stats} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="category" width={170} tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }} />
          <Bar
            dataKey="courses"
            name="Courses"
            fill="#0f766e"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
